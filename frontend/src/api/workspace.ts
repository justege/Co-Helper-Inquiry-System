import { api, publicGet } from "../lib/api";

export interface WorkspaceUserBrief {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  companyName: string | null;
}

export interface WorkspaceClient {
  id: string;
  workspaceId?: string;
  userId?: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  phone?: string | null;
  notes?: string | null;
  projectCount?: number;
  createdAt: string;
  memberSince?: string;
}

export interface FreelancerWorkspaceMe {
  role: "owner";
  workspace: {
    id: string;
    name: string;
    currency?: string;
    timezone?: string;
    logoUrl?: string | null;
    emailMode?: "platform" | "smtp";
    smtpHost?: string | null;
    smtpPort?: number | null;
    smtpUser?: string | null;
    smtpFrom?: string | null;
    smtpConfigured?: boolean;
    weeklyHours?: number;
    createdAt: string;
  };
  clients: WorkspaceClient[];
}

export interface ClientWorkspaceMembership {
  id: string;
  name: string;
  freelancer: WorkspaceUserBrief | null;
}

export interface ClientWorkspaceMe {
  role: "client";
  workspaces: ClientWorkspaceMembership[];
}

export type WorkspaceMe = FreelancerWorkspaceMe | ClientWorkspaceMe;

export const getMyWorkspace = () => api.get<WorkspaceMe>("/api/workspace/me");

export const createMyWorkspace = (name?: string) =>
  api.post<FreelancerWorkspaceMe>("/api/workspace", name ? { name } : {});

export interface WorkspaceInvitation {
  id: string;
  email: string;
  token?: string;
  kind?: "client" | "collaborator";
  projectId?: string | null;
  clientId?: string | null;
  status: string;
  createdAt: string;
}

export interface WorkspaceProject {
  id: string;
  workspaceId?: string;
  clientId: string;
  name: string;
  description?: string | null;
  status?: "backlog" | "in_progress" | "waiting_on_client" | "done";
  priority?: "low" | "medium" | "high";
  startAt?: string | null;
  dueAt?: string | null;
  currentMilestoneId?: string | null;
  billingType?: "hourly" | "fixed" | "hybrid";
  hourlyRate?: number | null;
  fixedPrice?: number | null;
  estimatedHours?: number | null;
  weeklyHoursTarget?: number | null;
  createdAt: string;
  updatedAt?: string | null;
  client: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
  } | null;
  collaboratorCount: number;
}

export interface ProjectGoal {
  id: string;
  projectId: string;
  title: string;
  done: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface ProjectMilestone {
  id: string
  projectId: string
  title: string
  dueAt: string | null
  done: boolean
  completedAt?: string | null
  late?: boolean
  delayedDays?: number | null
  sortOrder: number
  createdAt: string
  todoCount?: number
  openTodoCount?: number
  openBlockerCount?: number
}

export interface ProjectComment {
  id: string
  projectId: string
  milestoneId?: string | null
  body: string
  createdAt: string
  author: WorkspaceUserBrief | null
}

export type ProjectBlockerKind = "client" | "scope" | "dependency" | "internal" | "other"

export interface ProjectBlocker {
  id: string
  projectId: string
  milestoneId: string | null
  todoId: string | null
  todoTitle?: string | null
  title: string
  body: string | null
  kind: ProjectBlockerKind
  status: "open" | "resolved"
  delayedDays: number | null
  createdAt: string
  resolvedAt: string | null
  author: WorkspaceUserBrief | null
}

export interface MilestoneConversation {
  id: string
  source: "milestone" | "todo"
  commentId: string
  todoId: string | null
  todoTitle: string | null
  body: string
  createdAt: string
  author: WorkspaceUserBrief | null
}

export interface MilestoneDetail {
  milestone: ProjectMilestone
  todos: import("./work").WorkTodo[]
  conversations: MilestoneConversation[]
  blockers: ProjectBlocker[]
}

export interface ProjectAttachment {
  id: string;
  projectId: string;
  fileName: string;
  contentType: string | null;
  byteSize: number | null;
  createdAt: string;
  uploadedBy: string | null;
  downloadUrl: string | null;
}

export interface ProjectTicket {
  project: WorkspaceProject;
  client: WorkspaceClient;
  collaborators: (WorkspaceUserBrief & { memberSince: string })[];
  people?: (WorkspaceUserBrief & { role?: string; memberSince?: string })[];
  pendingInvites: WorkspaceInvitation[];
  role: "owner" | "client" | "collaborator" | "admin";
  meId: string;
  goals: ProjectGoal[];
  milestones: ProjectMilestone[];
  comments: ProjectComment[];
  attachments: ProjectAttachment[];
  blockers: ProjectBlocker[];
}

export const getWorkspaceProjects = () =>
  api.get<{ projects: WorkspaceProject[] }>("/api/workspace/projects");

export const getWorkspaceProject = (id: string) =>
  api.get<ProjectTicket>(`/api/workspace/projects/${id}`);

export const createWorkspaceProject = (
  name: string,
  clientId: string,
  description?: string,
  extra?: {
    billingType?: "hourly" | "fixed" | "hybrid"
    hourlyRate?: number | null
    estimatedHours?: number | null
    weeklyHoursTarget?: number | null
    emails?: string[]
  }
) =>
  api.post<WorkspaceProject>("/api/workspace/projects", { name, clientId, description, ...extra });

export const updateWorkspaceProject = (
  id: string,
  data: {
    name?: string
    description?: string
    clientId?: string
    status?: "backlog" | "in_progress" | "waiting_on_client" | "done"
    priority?: "low" | "medium" | "high"
    startAt?: string | null
    dueAt?: string | null
    currentMilestoneId?: string | null
    billingType?: "hourly" | "fixed" | "hybrid"
    hourlyRate?: number | null
    fixedPrice?: number | null
    estimatedHours?: number | null
    weeklyHoursTarget?: number | null
  }
) => api.patch<WorkspaceProject>(`/api/workspace/projects/${id}`, data);

export const deleteWorkspaceProject = (id: string) =>
  api.delete<void>(`/api/workspace/projects/${id}`);

export const inviteProjectCollaborator = (projectId: string, email: string) =>
  api.post<WorkspaceInvitation>(`/api/workspace/projects/${projectId}/collaborators`, { email });

export const inviteProjectCollaborators = (projectId: string, emails: string[]) =>
  api.post<{ invitations: WorkspaceInvitation[] }>(
    `/api/workspace/projects/${projectId}/collaborators`,
    { emails }
  );

export const removeProjectCollaborator = (projectId: string, userId: string) =>
  api.delete<void>(`/api/workspace/projects/${projectId}/collaborators/${userId}`);

export const addProjectComment = (projectId: string, body: string, milestoneId?: string | null) =>
  api.post<ProjectComment>(`/api/workspace/projects/${projectId}/comments`, { body, milestoneId });

export const deleteProjectComment = (projectId: string, commentId: string) =>
  api.delete<void>(`/api/workspace/projects/${projectId}/comments/${commentId}`);

export const addProjectGoal = (projectId: string, title: string) =>
  api.post<ProjectGoal>(`/api/workspace/projects/${projectId}/goals`, { title });

export const updateProjectGoal = (
  projectId: string,
  goalId: string,
  data: { title?: string; done?: boolean }
) => api.patch<ProjectGoal>(`/api/workspace/projects/${projectId}/goals/${goalId}`, data);

export const deleteProjectGoal = (projectId: string, goalId: string) =>
  api.delete<void>(`/api/workspace/projects/${projectId}/goals/${goalId}`);

export const addProjectMilestone = (projectId: string, data: { title: string; dueAt?: string | null }) =>
  api.post<ProjectMilestone>(`/api/workspace/projects/${projectId}/milestones`, data);

export const updateProjectMilestone = (
  projectId: string,
  milestoneId: string,
  data: { title?: string; dueAt?: string | null; done?: boolean; completedAt?: string | null }
) => api.patch<ProjectMilestone>(`/api/workspace/projects/${projectId}/milestones/${milestoneId}`, data);

export const deleteProjectMilestone = (projectId: string, milestoneId: string) =>
  api.delete<void>(`/api/workspace/projects/${projectId}/milestones/${milestoneId}`);

export const getProjectMilestone = (projectId: string, milestoneId: string) =>
  api.get<MilestoneDetail>(`/api/workspace/projects/${projectId}/milestones/${milestoneId}`);

export const addProjectBlocker = (
  projectId: string,
  data: {
    title: string
    body?: string | null
    kind?: ProjectBlockerKind
    delayedDays?: number | null
    milestoneId?: string | null
    todoId?: string | null
  }
) => api.post<ProjectBlocker>(`/api/workspace/projects/${projectId}/blockers`, data);

export const updateProjectBlocker = (
  projectId: string,
  blockerId: string,
  data: {
    title?: string
    body?: string | null
    kind?: ProjectBlockerKind
    status?: "open" | "resolved"
    delayedDays?: number | null
    milestoneId?: string | null
    todoId?: string | null
  }
) => api.patch<ProjectBlocker>(`/api/workspace/projects/${projectId}/blockers/${blockerId}`, data);

export const deleteProjectBlocker = (projectId: string, blockerId: string) =>
  api.delete<void>(`/api/workspace/projects/${projectId}/blockers/${blockerId}`);

export const deleteProjectAttachment = (projectId: string, attachmentId: string) =>
  api.delete<void>(`/api/workspace/projects/${projectId}/attachments/${attachmentId}`);

export async function uploadProjectAttachment(projectId: string, file: File): Promise<ProjectAttachment> {
  const signed = await api.post<{ uploadUrl: string; filePath: string; fileName: string }>(
    `/api/workspace/projects/${projectId}/attachments/sign`,
    {
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
    }
  );
  const headers: HeadersInit = {};
  if (file.type) headers["Content-Type"] = file.type;
  const put = await fetch(signed.uploadUrl, { method: "PUT", body: file, headers });
  if (!put.ok) throw new Error("Could not upload the file");
  return api.post<ProjectAttachment>(`/api/workspace/projects/${projectId}/attachments`, {
    filePath: signed.filePath,
    fileName: signed.fileName,
    contentType: file.type || "application/octet-stream",
    size: file.size,
  });
}

export const getWorkspaceClients = () =>
  api.get<{ clients: WorkspaceClient[] }>("/api/workspace/clients");

export const getWorkspaceClient = (id: string) =>
  api.get<{ client: WorkspaceClient; projects: WorkspaceProject[] }>(`/api/workspace/clients/${id}`);

export const createWorkspaceClient = (data: {
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  phone?: string;
  invite?: boolean;
}) =>
  api.post<{ client: WorkspaceClient; invitation: WorkspaceInvitation | null }>(
    "/api/workspace/clients",
    data
  );

export const inviteExistingClient = (id: string) =>
  api.post<WorkspaceInvitation>(`/api/workspace/clients/${id}/invite`, {});

export const getWorkspaceInvitations = () =>
  api.get<WorkspaceInvitation[]>("/api/workspace/invitations");

export const inviteClient = (email: string) =>
  api.post<WorkspaceInvitation>("/api/workspace/invitations", { email });

export const revokeInvitation = (id: string) =>
  api.delete<void>(`/api/workspace/invitations/${id}`);

export interface InvitePreview {
  email: string;
  kind?: "client" | "collaborator";
  workspaceName: string | null;
  freelancer: WorkspaceUserBrief | null;
}

export const getInvitePreview = (token: string) =>
  publicGet<InvitePreview>(`/api/workspace/invitations/token/${token}`);

export const acceptInvite = (token: string) =>
  api.post<{ workspaceId: string; projectId?: string | null; kind?: string }>(
    `/api/workspace/invitations/token/${token}/accept`,
    {}
  );

export const updateWorkspaceSettings = (data: {
  name?: string;
  currency?: string;
  timezone?: string;
  emailMode?: "platform" | "smtp";
  smtpHost?: string;
  smtpPort?: number | null;
  smtpUser?: string;
  smtpFrom?: string;
  smtpPassword?: string;
  weeklyHours?: number;
}) =>
  api.patch<{
    id: string;
    name: string;
    currency: string;
    timezone: string;
    emailMode?: string;
    smtpHost?: string | null;
    smtpPort?: number | null;
    smtpUser?: string | null;
    smtpFrom?: string | null;
    smtpConfigured?: boolean;
  }>("/api/workspace/settings", data);

export const sendWorkspaceTestEmail = (to?: string) =>
  api.post<{ ok: boolean }>("/api/workspace/settings/test-email", { to });

export interface WorkspaceSearchResult {
  projects: { id: string; name: string }[];
  clients: WorkspaceClient[];
  todos?: { id: string; title: string; projectName: string }[];
}

export const searchWorkspace = (q: string) =>
  api.get<WorkspaceSearchResult>(`/api/workspace/search?q=${encodeURIComponent(q)}`);
