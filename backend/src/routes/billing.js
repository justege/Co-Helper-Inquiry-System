import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { attachRole } from "../middleware/requireRole.js";
import { getWorkspaceByOwner } from "../lib/workspace.js";
import {
  ensureSubscriptionRow,
  getStripe,
  mapSubscription,
  defaultPlan,
  upsertFromStripe,
} from "../lib/stripe.js";
import { queryOne } from "../db.js";

const router = Router();

export async function stripeWebhook(req, res) {
  const stripeClient = await getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeClient || !secret) return res.status(503).json({ error: "Stripe is not configured" });

  let event;
  try {
    event = stripeClient.webhooks.constructEvent(req.body, req.headers["stripe-signature"], secret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature: ${err.message}` });
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const obj = event.data.object;
      const workspaceId = obj.metadata?.workspaceId || obj.client_reference_id;
      if (workspaceId) {
        const status =
          event.type === "customer.subscription.deleted"
            ? "canceled"
            : obj.status || "active";
        const periodEnd = obj.current_period_end
          ? new Date(obj.current_period_end * 1000)
          : obj.subscription
            ? null
            : null;
        await upsertFromStripe(workspaceId, {
          stripeCustomerId: obj.customer,
          stripeSubscriptionId: typeof obj.subscription === "string" ? obj.subscription : obj.id,
          plan: obj.metadata?.plan || defaultPlan(),
          status: status === "canceled" ? "canceled" : ["active", "trialing", "past_due", "unpaid"].includes(status) ? status : "active",
          currentPeriodEnd: periodEnd,
        });
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error("[stripe webhook]", err);
    res.status(500).json({ error: err.message });
  }
}

router.get("/me", requireAuth, attachRole, async (req, res) => {
  if (req.userRole !== "expert") {
    return res.status(403).json({ error: "Only workspace owners manage billing" });
  }
  try {
    const ws = await getWorkspaceByOwner(req.dbUser.id);
    if (!ws) return res.status(404).json({ error: "Workspace not found" });
    const row = await ensureSubscriptionRow(ws.id);
    res.json(mapSubscription(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/checkout", requireAuth, attachRole, async (req, res) => {
  if (req.userRole !== "expert") {
    return res.status(403).json({ error: "Only workspace owners can subscribe" });
  }
  const stripeClient = await getStripe();
  if (!stripeClient) return res.status(503).json({ error: "Stripe is not configured" });

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) return res.status(503).json({ error: "STRIPE_PRICE_ID is not set" });

  try {
    const ws = await getWorkspaceByOwner(req.dbUser.id);
    if (!ws) return res.status(404).json({ error: "Workspace not found" });
    const sub = await ensureSubscriptionRow(ws.id);
    const appUrl = (process.env.PUBLIC_APP_URL || "http://localhost:5173").replace(/\/$/, "");

    const session = await stripeClient.checkout.sessions.create({
      mode: "subscription",
      customer: sub.stripe_customer_id || undefined,
      customer_email: sub.stripe_customer_id ? undefined : req.dbUser.email,
      client_reference_id: ws.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/app/settings?billing=success`,
      cancel_url: `${appUrl}/app/settings?billing=cancel`,
      metadata: { workspaceId: ws.id, plan: defaultPlan() },
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("[billing/checkout]", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/portal", requireAuth, attachRole, async (req, res) => {
  if (req.userRole !== "expert") {
    return res.status(403).json({ error: "Only workspace owners manage billing" });
  }
  const stripeClient = await getStripe();
  if (!stripeClient) return res.status(503).json({ error: "Stripe is not configured" });
  try {
    const ws = await getWorkspaceByOwner(req.dbUser.id);
    if (!ws) return res.status(404).json({ error: "Workspace not found" });
    const sub = await queryOne("SELECT * FROM subscriptions WHERE workspace_id = $1", [ws.id]);
    if (!sub?.stripe_customer_id) {
      return res.status(400).json({ error: "No Stripe customer yet — subscribe first" });
    }
    const appUrl = (process.env.PUBLIC_APP_URL || "http://localhost:5173").replace(/\/$/, "");
    const portal = await stripeClient.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${appUrl}/app/settings`,
    });
    res.json({ url: portal.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
