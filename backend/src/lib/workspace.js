import { query, queryOne, execute } from "../db.js";

export async function ensureWorkspaceForOwner(ownerId, name) {
  let workspace = await queryOne("SELECT * FROM workspaces WHERE owner_id = $1", [ownerId]);

  if (!workspace) {
    workspace = await queryOne(
      `INSERT INTO workspaces (owner_id, name)
       VALUES ($1, $2)
       RETURNING *`,
      [ownerId, name?.trim() || "My workspace"]
    );
  }

  await execute(
    `INSERT INTO workspace_members (workspace_id, user_id, role)
     VALUES ($1, $2, 'owner')
     ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'owner'`,
    [workspace.id, ownerId]
  );

  return workspace;
}

export async function startWorkspaceForUser(user, name) {
  if (!user?.id) {
    const err = new Error("User profile not found");
    err.status = 403;
    throw err;
  }
  if (["admin", "superadmin"].includes(user.role)) {
    const err = new Error("Platform operators do not own a client workspace");
    err.status = 403;
    throw err;
  }

  if (user.role !== "expert") {
    await execute("UPDATE users SET role = 'expert' WHERE id = $1", [user.id]);
  }

  return ensureWorkspaceForOwner(
    user.id,
    name?.trim() || user.company_name || user.username || "My workspace"
  );
}

export async function getWorkspaceByOwner(ownerId) {
  return queryOne("SELECT * FROM workspaces WHERE owner_id = $1", [ownerId]);
}

export async function getWorkspaceById(workspaceId) {
  return queryOne("SELECT * FROM workspaces WHERE id = $1", [workspaceId]);
}

export async function getMembershipsForUser(userId) {
  const rows = await query(
    `SELECT wm.role,
            json_build_object(
              'id', w.id,
              'name', w.name,
              'owner_id', w.owner_id,
              'owner', json_build_object(
                'id', u.id,
                'email', u.email,
                'first_name', u.first_name,
                'last_name', u.last_name,
                'username', u.username,
                'company_name', u.company_name
              )
            ) AS workspace
     FROM workspace_members wm
     JOIN workspaces w ON w.id = wm.workspace_id
     JOIN users u ON u.id = w.owner_id
     WHERE wm.user_id = $1`,
    [userId]
  );
  return rows;
}

export function mapUserBrief(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    firstName: u.first_name ?? u.firstName ?? null,
    lastName: u.last_name ?? u.lastName ?? null,
    username: u.username ?? null,
    companyName: u.company_name ?? u.companyName ?? null,
  };
}

export function mapClient(row) {
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id ?? null,
    email: row.email,
    firstName: row.first_name ?? null,
    lastName: row.last_name ?? null,
    companyName: row.company_name ?? null,
    phone: row.phone ?? null,
    notes: row.notes ?? null,
    projectCount: row.project_count ?? 0,
    createdAt: row.created_at,
  };
}

export function mapProject(row) {
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    name: row.name,
    description: row.description ?? null,
    createdAt: row.created_at,
    client: row.client ? mapClient(row.client) : row.client_email
      ? {
          id: row.client_id,
          email: row.client_email,
          firstName: row.client_first_name ?? null,
          lastName: row.client_last_name ?? null,
          companyName: row.client_company_name ?? null,
        }
      : null,
    collaboratorCount: row.collaborator_count ?? 0,
  };
}

const PROJECT_ACCESS_SQL = `
  SELECT p.*,
         w.owner_id,
         c.user_id AS client_user_id,
         c.email AS client_email,
         c.first_name AS client_first_name,
         c.last_name AS client_last_name,
         c.company_name AS client_company_name
  FROM projects p
  JOIN workspaces w ON w.id = p.workspace_id
  JOIN clients c ON c.id = p.client_id
  WHERE p.id = $1
`;

export async function getProjectAccess(projectId, user) {
  const project = await queryOne(PROJECT_ACCESS_SQL, [projectId]);
  if (!project) return null;
  if (project.owner_id === user.id) return { project, role: "owner" };
  if (["admin", "superadmin"].includes(user.role)) return { project, role: "admin" };
  if (project.client_user_id === user.id) return { project, role: "client" };
  const member = await queryOne(
    `SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [projectId, user.id]
  );
  if (member) return { project, role: "collaborator" };
  return null;
}

export async function listProjectsForUser(user) {
  if (user.role === "expert") {
    const ws = await getWorkspaceByOwner(user.id);
    if (!ws) return [];
    return query(
      `SELECT p.*,
              c.email AS client_email,
              c.first_name AS client_first_name,
              c.last_name AS client_last_name,
              c.company_name AS client_company_name,
              (SELECT COUNT(*)::int FROM project_members pm WHERE pm.project_id = p.id) AS collaborator_count
       FROM projects p
       JOIN clients c ON c.id = p.client_id
       WHERE p.workspace_id = $1
       ORDER BY p.created_at DESC`,
      [ws.id]
    );
  }

  return query(
    `SELECT p.*,
            c.email AS client_email,
            c.first_name AS client_first_name,
            c.last_name AS client_last_name,
            c.company_name AS client_company_name,
            (SELECT COUNT(*)::int FROM project_members pm WHERE pm.project_id = p.id) AS collaborator_count
     FROM projects p
     JOIN clients c ON c.id = p.client_id
     WHERE c.user_id = $1
        OR EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = $1
        )
     ORDER BY p.created_at DESC`,
    [user.id]
  );
}

export async function upsertWorkspaceMember(workspaceId, userId, role) {
  await execute(
    `INSERT INTO workspace_members (workspace_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (workspace_id, user_id) DO UPDATE SET
       role = CASE
         WHEN workspace_members.role = 'owner' THEN 'owner'
         WHEN workspace_members.role = 'client' OR EXCLUDED.role = 'client' THEN 'client'
         ELSE EXCLUDED.role
       END`,
    [workspaceId, userId, role]
  );
}
