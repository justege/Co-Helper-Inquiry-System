import { query, queryOne, execute } from "../db.js";
import { logActivity } from "./workspace.js";
import {
  listLists,
  listCards,
  getCard,
  getBoard,
  urgencyFromLabels,
  statusFromListName,
} from "./trello.js";

function cardDescription(card) {
  const desc = (card.desc || "").trim();
  if (desc.length >= 10) return desc;
  const fallback = [card.name, desc, card.url].filter(Boolean).join("\n\n");
  return fallback.length >= 10 ? fallback : `${card.name}\n\nImported from Trello.`;
}

function cardTitle(card) {
  const title = (card.name || "Untitled card").trim();
  return title.slice(0, 255);
}

async function defaultCategoryId() {
  const row = await queryOne(
    `SELECT id FROM categories WHERE type = 'service' ORDER BY name LIMIT 1`
  );
  if (!row) throw new Error("No service category is seeded — run npm run db:setup");
  return row.id;
}

async function upsertProject({ workspaceId, list, boardId }) {
  const existing = await queryOne(
    `SELECT * FROM projects WHERE workspace_id = $1 AND trello_list_id = $2`,
    [workspaceId, list.id]
  );
  if (existing) {
    return queryOne(
      `UPDATE projects SET name = $1, sort_order = $2, trello_board_id = $3
       WHERE id = $4 RETURNING *`,
      [list.name, Math.round(list.pos || 0), boardId, existing.id]
    );
  }
  return queryOne(
    `INSERT INTO projects (workspace_id, name, sort_order, trello_list_id, trello_board_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [workspaceId, list.name, Math.round(list.pos || 0), list.id, boardId]
  );
}

function todosFromCard(card) {
  const items = [];
  for (const list of card.checklists ?? []) {
    for (const item of list.checkItems ?? []) {
      items.push({
        id: item.id,
        title: (item.name || "To-do").slice(0, 300),
        status: item.state === "complete" ? "done" : "open",
        body: list.name ? `Checklist: ${list.name}` : null,
      });
    }
  }

  for (const action of card.actions ?? []) {
    if (action.type !== "commentCard") continue;
    const text = (action.data?.text || "").trim();
    if (!text) continue;
    const firstLine = text.split("\n")[0].slice(0, 300);
    items.push({
      id: `comment:${action.id}`,
      title: firstLine,
      status: "open",
      body: text.length > firstLine.length ? text : "Trello comment",
    });
  }

  if (items.length === 0) {
    const bullets = (card.desc || "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^[-*•]|\[[ xX]\]/.test(line));
    bullets.forEach((line, idx) => {
      const cleaned = line.replace(/^[-*•]\s*/, "").replace(/^\[[ xX]\]\s*/, "");
      if (!cleaned) return;
      items.push({
        id: `desc:${card.id}:${idx}`,
        title: cleaned.slice(0, 300),
        status: /^\[[xX]\]/.test(line) ? "done" : "open",
        body: "From card description",
      });
    });
  }

  return items;
}

async function upsertTodos(inquiryId, createdBy, card) {
  const items = todosFromCard(card);

  for (const [i, item] of items.entries()) {
    const existing = await queryOne(
      `SELECT id FROM inquiry_todos WHERE trello_checkitem_id = $1`,
      [item.id]
    );
    if (existing) {
      await execute(
        `UPDATE inquiry_todos
         SET title = $1, status = $2, body = $3, sort_order = $4, updated_at = NOW()
         WHERE id = $5`,
        [item.title, item.status, item.body, i, existing.id]
      );
    } else {
      await execute(
        `INSERT INTO inquiry_todos
           (inquiry_id, title, body, status, sort_order, created_by, trello_checkitem_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [inquiryId, item.title, item.body, item.status, i, createdBy, item.id]
      );
    }
  }
}

export async function importBoard({ token, workspace, ownerId, clientId, boardId, listIds }) {
  const board = await getBoard(token, boardId);
  const lists = await listLists(token, boardId);
  const selected = listIds?.length
    ? lists.filter((l) => listIds.includes(l.id))
    : lists;
  const cards = await listCards(token, boardId);
  const categoryId = await defaultCategoryId();

  const projectByList = new Map();
  for (const list of selected) {
    const project = await upsertProject({ workspaceId: workspace.id, list, boardId });
    projectByList.set(list.id, { project, list });
  }

  let created = 0;
  let updated = 0;
  let todos = 0;

  for (const card of cards) {
    const mapped = projectByList.get(card.idList);
    if (!mapped) continue;

    const title = cardTitle(card);
    const description = cardDescription(card);
    const urgency = urgencyFromLabels(card.labels);
    const status = statusFromListName(mapped.list.name, card.closed);
    const due = card.due ? String(card.due).slice(0, 10) : null;

    const existing = await queryOne(
      `SELECT id FROM inquiries WHERE trello_card_id = $1`,
      [card.id]
    );

    let inquiryId;
    if (existing) {
      await execute(
        `UPDATE inquiries SET
           title = $1, description = $2, urgency = $3, status = $4,
           target_end_date = $5, project_id = $6, workspace_id = $7, updated_at = NOW()
         WHERE id = $8`,
        [title, description, urgency, status, due, mapped.project.id, workspace.id, existing.id]
      );
      inquiryId = existing.id;
      updated += 1;
    } else {
      const row = await queryOne(
        `INSERT INTO inquiries (
           client_id, workspace_id, project_id, category_id, assigned_expert_id,
           trello_card_id, title, description, type, urgency, target_end_date, status
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'service',$9,$10,$11)
         RETURNING id`,
        [
          clientId, workspace.id, mapped.project.id, categoryId, ownerId,
          card.id, title, description, urgency, due, status,
        ]
      );
      inquiryId = row.id;
      created += 1;
      await logActivity({
        workspaceId: workspace.id,
        inquiryId,
        actorId: ownerId,
        type: "trello.imported",
        payload: { cardId: card.id, list: mapped.list.name },
      }).catch(() => null);
    }

    const before = await queryOne(
      `SELECT COUNT(*)::int AS n FROM inquiry_todos WHERE inquiry_id = $1`,
      [inquiryId]
    );
    await upsertTodos(inquiryId, ownerId, card);
    const after = await queryOne(
      `SELECT COUNT(*)::int AS n FROM inquiry_todos WHERE inquiry_id = $1`,
      [inquiryId]
    );
    todos += Math.max(0, (after?.n ?? 0) - (before?.n ?? 0));
  }

  await execute(
    `UPDATE trello_connections
     SET board_id = $1, board_name = $2, updated_at = NOW()
     WHERE workspace_id = $3`,
    [boardId, board.name, workspace.id]
  );

  return {
    board: { id: board.id, name: board.name },
    lists: selected.length,
    created,
    updated,
    todos,
  };
}

export async function syncCardFromWebhook({ token, workspace, ownerId, clientId, cardId }) {
  const card = await getCard(token, cardId);
  if (!card) return;
  const connection = await queryOne(
    "SELECT * FROM trello_connections WHERE workspace_id = $1",
    [workspace.id]
  );
  if (!connection?.board_id) return;
  await importBoard({
    token,
    workspace,
    ownerId,
    clientId,
    boardId: connection.board_id,
    listIds: [card.idList],
  });
}
