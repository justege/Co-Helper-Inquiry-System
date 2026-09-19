import { decryptSecret } from "./secret.js";

const APP_URL = process.env.PUBLIC_APP_URL || process.env.TRELLO_RETURN_URL || "http://localhost:5173";
const FROM = process.env.EMAIL_FROM || "Co-Helper <hello@co-helper.com>";

export function appUrl(path = "") {
  return `${APP_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

async function sendViaResend({ to, subject, html, text, from }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[email] RESEND_API_KEY missing — skipped "${subject}" to ${to}`);
    return { skipped: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: from || FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || undefined,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[email] Resend error", res.status, body);
    return { error: `Resend ${res.status}` };
  }
  return { ok: true };
}

async function sendViaSmtp(workspace, { to, subject, html, text }) {
  const host = workspace.smtp_host;
  const user = workspace.smtp_user;
  const pass = decryptSecret(workspace.smtp_password_enc);
  if (!host || !user || !pass) {
    return { error: "SMTP is not fully configured" };
  }
  const { default: nodemailer } = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host,
    port: Number(workspace.smtp_port) || 587,
    secure: Number(workspace.smtp_port) === 465,
    auth: { user, pass },
  });
  await transporter.sendMail({
    from: workspace.smtp_from || user,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    html,
    text: text || undefined,
  });
  return { ok: true };
}

export async function sendEmail({ to, subject, html, text, workspace = null, from }) {
  if (!to) return { skipped: true };
  try {
    if (workspace?.email_mode === "smtp") {
      return await sendViaSmtp(workspace, { to, subject, html, text });
    }
    return await sendViaResend({ to, subject, html, text, from: from || workspace?.smtp_from });
  } catch (err) {
    console.error("[email]", err.message);
    return { error: err.message };
  }
}

export async function sendTestEmail(workspace, to) {
  return sendEmail({
    workspace,
    to,
    subject: "Co-Helper test email",
    html: `<p style="font-family:Inter,system-ui,sans-serif">This is a test from your Co-Helper workspace. Email is working.</p>`,
    text: "This is a test from your Co-Helper workspace. Email is working.",
  });
}

export function inviteEmail({ workspaceName, freelancerName, inviteUrl, email, kind = "client" }) {
  const who = freelancerName || "A solo business";
  const space = workspaceName || "their workspace";
  const asWhat = kind === "collaborator" ? "as a collaborator on a project" : "as a client";
  return {
    to: email,
    subject: `${who} invited you to ${space} on Co-Helper`,
    html: `
      <div style="font-family:Inter,system-ui,sans-serif;color:#0E1B17;line-height:1.6">
        <p>${who} invited you ${asWhat} in <strong>${space}</strong>.</p>
        <p><a href="${inviteUrl}" style="display:inline-block;background:#0F6E56;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Accept invite</a></p>
        <p style="color:#6B7280;font-size:13px">If the button doesn’t work, copy this link:<br>${inviteUrl}</p>
      </div>
    `,
    text: `${who} invited you ${asWhat} in ${space}. Accept: ${inviteUrl}`,
  };
}
