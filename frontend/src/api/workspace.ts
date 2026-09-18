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
  workspace: { id: string; name: string; createdAt: string };
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
  sortOrder: number;
  trelloListId: string | null;
  trelloBoardId: string | null;
  inquiryCount: number;
  createdAt: string;
}

export const getWorkspaceProjects = () =>
  api.get<{ projects: WorkspaceProject[] }>("/api/workspace/projects");

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
  api.post<{ workspaceId: string }>(`/api/workspace/invitations/token/${token}/accept`, {});
