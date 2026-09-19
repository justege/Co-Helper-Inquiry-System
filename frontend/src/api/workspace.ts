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
  createdAt: string;
  client: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
  } | null;
  collaboratorCount: number;
}

export const getWorkspaceProjects = () =>
  api.get<{ projects: WorkspaceProject[] }>("/api/workspace/projects");

export const getWorkspaceProject = (id: string) =>
  api.get<{
    project: WorkspaceProject;
    client: WorkspaceClient;
    collaborators: (WorkspaceUserBrief & { memberSince: string })[];
    pendingInvites: WorkspaceInvitation[];
    role: "owner" | "client" | "collaborator" | "admin";
  }>(`/api/workspace/projects/${id}`);

export const createWorkspaceProject = (name: string, clientId: string, description?: string) =>
  api.post<WorkspaceProject>("/api/workspace/projects", { name, clientId, description });

export const updateWorkspaceProject = (
  id: string,
  data: { name: string; description?: string; clientId?: string }
) => api.patch<WorkspaceProject>(`/api/workspace/projects/${id}`, data);

export const deleteWorkspaceProject = (id: string) =>
  api.delete<void>(`/api/workspace/projects/${id}`);

export const inviteProjectCollaborator = (projectId: string, email: string) =>
  api.post<WorkspaceInvitation>(`/api/workspace/projects/${projectId}/collaborators`, { email });

export const removeProjectCollaborator = (projectId: string, userId: string) =>
  api.delete<void>(`/api/workspace/projects/${projectId}/collaborators/${userId}`);

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
}

export const searchWorkspace = (q: string) =>
  api.get<WorkspaceSearchResult>(`/api/workspace/search?q=${encodeURIComponent(q)}`);
