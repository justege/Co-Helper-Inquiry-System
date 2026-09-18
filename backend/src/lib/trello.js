const TRELLO_API = "https://api.trello.com/1";

export function trelloApiKey() {
  return process.env.TRELLO_API_KEY || "";
}

export function trelloConfigured() {
  return Boolean(trelloApiKey());
}

export function authorizeUrl(returnUrl) {
  const url = new URL("https://trello.com/1/authorize");
  url.searchParams.set("expiration", "never");
  url.searchParams.set("name", "Co-Helper");
  url.searchParams.set("scope", "read");
  url.searchParams.set("response_type", "token");
  url.searchParams.set("key", trelloApiKey());
  url.searchParams.set("return_url", returnUrl);
  url.searchParams.set("callback_method", "fragment");
  return url.toString();
}

async function trelloFetch(path, token, { method = "GET", params = {}, body } = {}) {
  const url = new URL(`${TRELLO_API}${path}`);
  url.searchParams.set("key", trelloApiKey());
  url.searchParams.set("token", token);
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `Trello ${res.status}`);
  }
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function listBoards(token) {
  return trelloFetch("/members/me/boards", token, {
    params: { fields: "id,name,url,closed,prefs", filter: "open" },
  });
}

export function getBoard(token, boardId) {
  return trelloFetch(`/boards/${boardId}`, token, {
    params: { fields: "id,name,url" },
  });
}

export function listLists(token, boardId) {
  return trelloFetch(`/boards/${boardId}/lists`, token, {
    params: { fields: "id,name,pos,closed", filter: "open" },
  });
}

export function listCards(token, boardId) {
  return trelloFetch(`/boards/${boardId}/cards`, token, {
    params: {
      fields: "id,name,desc,due,dueComplete,closed,idList,labels,url,pos",
      checklists: "all",
      actions: "commentCard",
      actions_limit: "50",
      filter: "visible",
    },
  });
}

export function getCard(token, cardId) {
  return trelloFetch(`/cards/${cardId}`, token, {
    params: {
      fields: "id,name,desc,due,dueComplete,closed,idList,labels,url,pos",
      checklists: "all",
      actions: "commentCard",
      actions_limit: "50",
    },
  });
}

export function getMe(token) {
  return trelloFetch("/members/me", token, { params: { fields: "id,fullName,username" } });
}

export function createWebhook(token, { callbackURL, idModel, description }) {
  return trelloFetch("/webhooks", token, {
    method: "POST",
    params: { callbackURL, idModel, description: description || "Co-Helper board sync" },
  });
}

export function deleteWebhook(token, webhookId) {
  return trelloFetch(`/webhooks/${webhookId}`, token, { method: "DELETE" });
}

export function urgencyFromLabels(labels = []) {
  const colors = new Set((labels ?? []).map((l) => l.color));
  if (colors.has("red") || colors.has("pink")) return "critical";
  if (colors.has("orange")) return "high";
  if (colors.has("yellow")) return "medium";
  return "low";
}

export function statusFromListName(name = "", closed = false) {
  if (closed) return "delivered";
  const n = name.toLowerCase();
  if (/\b(done|complete|shipped|delivered|closed)\b/.test(n)) return "delivered";
  if (/\b(wait|waiting|blocked|hold|parked)\b/.test(n)) return "waiting";
  if (/\b(progress|doing|wip|active|working)\b/.test(n)) return "in_progress";
  if (/\b(review|qa|testing)\b/.test(n)) return "accepted";
  return "pending";
}
