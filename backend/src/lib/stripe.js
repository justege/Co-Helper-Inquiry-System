import { queryOne, execute } from "../db.js";

const INTRO_UNTIL = new Date("2026-12-31T23:59:59Z");

function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return import("stripe").then(({ default: Stripe }) => new Stripe(key));
}

export function introStillActive() {
  return Date.now() < INTRO_UNTIL.getTime();
}

export function defaultPlan() {
  return introStillActive() ? "intro" : "standard";
}

export async function getSubscription(workspaceId) {
  return queryOne("SELECT * FROM subscriptions WHERE workspace_id = $1", [workspaceId]);
}

export function isPaid(sub) {
  return sub && ["active", "trialing"].includes(sub.status);
}

export async function clientLimitForWorkspace(workspaceId) {
  const sub = await getSubscription(workspaceId);
  if (isPaid(sub)) return Infinity;
  return 8;
}

export async function ensureSubscriptionRow(workspaceId) {
  const existing = await getSubscription(workspaceId);
  if (existing) return existing;
  return queryOne(
    `INSERT INTO subscriptions (workspace_id, plan, status)
     VALUES ($1, $2, 'none')
     RETURNING *`,
    [workspaceId, defaultPlan()]
  );
}

export async function upsertFromStripe(workspaceId, data) {
  await execute(
    `INSERT INTO subscriptions (
       workspace_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (workspace_id) DO UPDATE SET
       stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, subscriptions.stripe_customer_id),
       stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, subscriptions.stripe_subscription_id),
       plan = EXCLUDED.plan,
       status = EXCLUDED.status,
       current_period_end = EXCLUDED.current_period_end,
       updated_at = NOW()`,
    [
      workspaceId,
      data.stripeCustomerId ?? null,
      data.stripeSubscriptionId ?? null,
      data.plan ?? defaultPlan(),
      data.status ?? "active",
      data.currentPeriodEnd ?? null,
    ]
  );
}

export async function getStripe() {
  return stripe();
}

export function mapSubscription(row) {
  if (!row) {
    return {
      plan: defaultPlan(),
      status: "none",
      currentPeriodEnd: null,
      stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
      introUntil: INTRO_UNTIL.toISOString(),
    };
  }
  return {
    plan: row.plan,
    status: row.status,
    currentPeriodEnd: row.current_period_end,
    stripeCustomerId: row.stripe_customer_id,
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    introUntil: INTRO_UNTIL.toISOString(),
  };
}
