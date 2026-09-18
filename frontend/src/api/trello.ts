import { api } from "../lib/api";

export interface TrelloStatus {
  configured: boolean;
  connected: boolean;
  boardId: string | null;
  boardName: string | null;
  autoSync: boolean;
  connectedAt: string | null;
}

export interface TrelloBoard {
  id: string;
  name: string;
  url: string;
}

export interface TrelloList {
  id: string;
  name: string;
  pos: number;
}

export interface TrelloImportSummary {
  board: { id: string; name: string };
  lists: number;
  created: number;
  updated: number;
  todos: number;
  autoSync?: boolean;
  autoSyncError?: string;
}

export const getTrelloAuthorizeUrl = () =>
  api.get<{ url: string; key: string }>("/api/trello/authorize-url");

export const getTrelloStatus = () => api.get<TrelloStatus>("/api/trello/status");

export const connectTrello = (token: string) =>
  api.post<{ connected: boolean; member: { id: string; name: string; username: string } }>(
    "/api/trello/connect",
    { token }
  );

export const disconnectTrello = () => api.delete<void>("/api/trello/connect");

export const listTrelloBoards = () => api.get<TrelloBoard[]>("/api/trello/boards");

export const listTrelloLists = (boardId: string) =>
  api.get<TrelloList[]>(`/api/trello/boards/${boardId}/lists`);

export const importTrelloBoard = (body: {
  boardId: string;
  listIds?: string[];
  clientId?: string | null;
  autoSync?: boolean;
}) => api.post<TrelloImportSummary>("/api/trello/import", body);
