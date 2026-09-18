import { query, queryOne, execute } from "../db.js";

/**
 * Get-or-create the single workspace owned by a freelancer (expert) user.
 * Also ensures the owner has a `workspace_members` row with role 'owner'.
 */
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
     ON CONFLICT (workspace_id, user_id) DO NOTHING`,
    [workspace.id, ownerId]
  );

  return workspace;
}

/**
 * Let a signed-in person start their own workspace (one-person business).
 * Invited-company accounts are promoted to expert; platform admins cannot.
 */
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

  await execute(
    `INSERT INTO expert_profiles (user_id, location_city, is_available, updated_at)
     VALUES ($1, 'Remote', TRUE, NOW())
     ON CONFLICT (user_id) DO NOTHING`,
    [user.id]
  );

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

/**
 * All workspaces a user belongs to (as owner or invited client), with the
 * freelancer's brief profile attached.
 */
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

export async function isWorkspaceMember(workspaceId, userId) {
  if (!workspaceId || !userId) return false;
  const row = await queryOne(
    `SELECT role FROM workspace_members
     WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId]
  );
  return Boolean(row);
}

export function canAccessInquiry(inquiry, userId) {
  if (!inquiry) return false;
  if (inquiry.client_id === userId) return true;
  if (inquiry.workspace_owner_id && inquiry.workspace_owner_id === userId) return true;
  return false;
}

export async function logActivity({ workspaceId = null, inquiryId = null, actorId = null, type, payload = {} }) {
  await execute(
    `INSERT INTO activity_events (workspace_id, inquiry_id, actor_id, type, payload)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [workspaceId, inquiryId, actorId, type, JSON.stringify(payload ?? {})]
  );
}

export async function checkInquiryAccess(inquiryId, userId, userRole) {
  const isAdmin = ["admin", "superadmin"].includes(userRole);
  const inq = await queryOne(
    `SELECT i.client_id, i.workspace_id, i.status, w.owner_id AS workspace_owner_id
     FROM inquiries i
     LEFT JOIN workspaces w ON w.id = i.workspace_id
     WHERE i.id = $1`,
    [inquiryId]
  );
  if (!inq) return { ok: false, inquiry: null };
  const isOwner = inq.client_id === userId;
  const isWorkspaceOwner = inq.workspace_owner_id === userId;
  return {
    ok: isOwner || isWorkspaceOwner || isAdmin,
    inquiry: inq,
    isOwner,
    isWorkspaceOwner,
    isAdmin,
  };
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
