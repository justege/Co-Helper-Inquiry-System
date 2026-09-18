import { api, publicGet } from "../lib/api";

export interface WorkspaceUserBrief {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  companyName: string | null;
}

export interface WorkspaceClient extends WorkspaceUserBrief {
  memberSince: string;
}

export interface FreelancerWorkspaceMe {
  role: "owner";
  workspace: {
    id: string;
    name: string;
    currency?: string;
    timezone?: string;
    logoUrl?: string | null;
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

/** Start (or return) the signed-in user's own one-person-business workspace. */
export const createMyWorkspace = (name?: string) =>
  api.post<FreelancerWorkspaceMe>("/api/workspace", name ? { name } : {});

export interface WorkspaceInvitation {
  id: string;
  email: string;
  token?: string;
  status: string;
  createdAt: string;
}

export interface WorkspaceProject {
  id: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  trelloListId: string | null;
  trelloBoardId: string | null;
  inquiryCount: number;
  createdAt: string;
}

export const getWorkspaceProjects = () =>
  api.get<{ projects: WorkspaceProject[] }>("/api/workspace/projects");

export const getWorkspaceProject = (id: string) =>
  api.get<{
    project: WorkspaceProject;
    jobs: { id: string; title: string; status: string; urgency: string; createdAt: string }[];
  }>(`/api/workspace/projects/${id}`);

export const createWorkspaceProject = (name: string, description?: string) =>
  api.post<WorkspaceProject>("/api/workspace/projects", { name, description });

export const updateWorkspaceProject = (id: string, name: string, description?: string) =>
  api.patch<WorkspaceProject>(`/api/workspace/projects/${id}`, { name, description });

export const deleteWorkspaceProject = (id: string) =>
  api.delete<void>(`/api/workspace/projects/${id}`);

export interface WorkspaceFinanceJob {
  inquiryId: string;
  title: string;
  status: string;
  billingType: "hourly" | "project" | null;
  currency: string;
  billableHours: number;
  agreedValue: number;
  paid: number;
  outstanding: number;
  remaining: number;
}

export interface WorkspaceFinance {
  jobs: WorkspaceFinanceJob[];
  totals: {
    agreedValue: number;
    paid: number;
    outstanding: number;
    remaining: number;
    billableHours: number;
  };
}

export const getWorkspaceFinance = () =>
  api.get<WorkspaceFinance>("/api/workspace/finance");

export const getMyFinance = () =>
  api.get<WorkspaceFinance>("/api/workspace/finance/mine");

export const getWorkspaceInvitations = () =>
  api.get<WorkspaceInvitation[]>("/api/workspace/invitations");

export const inviteClient = (email: string) =>
  api.post<WorkspaceInvitation>("/api/workspace/invitations", { email });

export const revokeInvitation = (id: string) =>
  api.delete<void>(`/api/workspace/invitations/${id}`);

export interface InvitePreview {
  email: string;
  workspaceName: string | null;
  freelancer: WorkspaceUserBrief | null;
}

export const getInvitePreview = (token: string) =>
  publicGet<InvitePreview>(`/api/workspace/invitations/token/${token}`);

export const acceptInvite = (token: string) =>
  api.post<{ workspaceId: string }>(`/api/workspace/invitations/token/${token}/accept`, {})

export const updateWorkspaceSettings = (data: { name?: string; currency?: string; timezone?: string }) =>
  api.patch<{ id: string; name: string; currency: string; timezone: string }>("/api/workspace/settings", data)

export interface WorkspaceSearchResult {
  jobs: { id: string; title: string; status: string }[]
  projects: { id: string; name: string }[]
  clients: { id: string; email: string; firstName: string | null; lastName: string | null; companyName: string | null }[]
  messages: { id: string; body: string; inquiryId: string; title: string }[]
}

export const searchWorkspace = (q: string) =>
  api.get<WorkspaceSearchResult>(`/api/workspace/search?q=${encodeURIComponent(q)}`)

export const getWorkspaceActivity = () =>
  api.get<{
    id: string
    type: string
    payload: Record<string, unknown>
    createdAt: string
    inquiryId: string | null
    actor: WorkspaceUserBrief | null
  }[]>("/api/workspace/activity");
