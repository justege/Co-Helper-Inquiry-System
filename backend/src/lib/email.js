import { decryptSecret } from "./secret.js";

export const PUBLIC_APP_ORIGIN = (
  process.env.PUBLIC_APP_URL ||
  process.env.TRELLO_RETURN_URL ||
  "https://co-helper.com"
).replace(/\/$/, "");

const FROM = process.env.EMAIL_FROM || "Co-Helper <hello@co-helper.com>";
const SITE = "https://co-helper.com";

export function appUrl(path = "") {
  const origin = PUBLIC_APP_ORIGIN;
  if (!path) return origin;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function personLabel(user) {
  if (!user) return "Co-Helper";
  const full = [user.first_name || user.firstName, user.last_name || user.lastName].filter(Boolean).join(" ").trim();
  return (
    String(user.company_name || user.companyName || "").trim() ||
    full ||
    String(user.username || "").trim() ||
    String(user.email || "").trim() ||
    "Co-Helper"
  );
}

export function workspaceDisplayName(workspace, user) {
  const name = String(workspace?.name || "").trim();
  if (name && name !== "My workspace") return name;
  const who = personLabel(user);
  if (who === "Co-Helper") return "Co-Helper";
  return `${who}'s workspace`;
}

function brandedLayout({ preview, heading, bodyHtml, ctaLabel, ctaUrl, footerHtml }) {
  const preheader = escapeHtml(preview || "");
  const safeHeading = escapeHtml(heading);
  const button = ctaLabel && ctaUrl
    ? `<p style="margin:28px 0 8px">
        <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#0F6E56;color:#ffffff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">
          ${escapeHtml(ctaLabel)}
        </a>
      </p>
      <p style="color:#6B7280;font-size:12px;line-height:1.6;margin:0 0 8px">
        Or paste this link into your browser:<br>
        <a href="${escapeHtml(ctaUrl)}" style="color:#0F6E56;word-break:break-all">${escapeHtml(ctaUrl)}</a>
      </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${safeHeading}</title>
</head>
<body style="margin:0;padding:0;background:#F3F6F4">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F6F4;padding:32px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #E5E7EB;border-radius:16px;overflow:hidden">
          <tr>
            <td style="background:#0B1A15;padding:18px 28px">
              <a href="${SITE}" style="color:#ffffff;text-decoration:none;font-family:Inter,Helvetica,Arial,sans-serif;font-weight:700;font-size:16px;letter-spacing:-0.02em">Co-Helper</a>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;font-family:Inter,Helvetica,Arial,sans-serif;color:#0E1B17;font-size:15px;line-height:1.65">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;letter-spacing:-0.03em">${safeHeading}</h1>
              ${bodyHtml}
              ${button}
            </td>
          </tr>
        </table>
        <p style="font-family:Inter,Helvetica,Arial,sans-serif;color:#6B7280;font-size:12px;line-height:1.6;margin:18px 8px 0;max-width:560px">
          ${footerHtml || `Sent by Co-Helper · <a href="${SITE}" style="color:#0F6E56;text-decoration:none">${SITE.replace("https://", "")}</a>`}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendViaResend({ to, subject, html, text, from, attachments, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[email] RESEND_API_KEY missing — skipped "${subject}" to ${to}`);
    return { skipped: true };
  }
  const payload = {
    from: from || FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text: text || undefined,
    attachments: (attachments || []).map((file) => ({
      filename: file.filename,
      content: Buffer.isBuffer(file.content) ? file.content.toString("base64") : file.content,
      content_type: file.contentType || "application/pdf",
    })),
  };
  if (replyTo) payload.reply_to = replyTo;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[email] Resend error", res.status, body);
    return { error: `Resend ${res.status}` };
  }
  return { ok: true };
}

async function sendViaSmtp(workspace, { to, subject, html, text, attachments, replyTo }) {
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
    replyTo: replyTo || undefined,
    subject,
    html,
    text: text || undefined,
    attachments: (attachments || []).map((file) => ({
      filename: file.filename,
      content: file.content,
      contentType: file.contentType || "application/pdf",
    })),
  });
  return { ok: true };
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  workspace = null,
  from,
  attachments,
  replyTo,
}) {
  if (!to) return { skipped: true };
  try {
    if (workspace?.email_mode === "smtp") {
      return await sendViaSmtp(workspace, { to, subject, html, text, attachments, replyTo });
    }
    return await sendViaResend({
      to,
      subject,
      html,
      text,
      from: from || workspace?.smtp_from,
      attachments,
      replyTo,
    });
  } catch (err) {
    console.error("[email]", err.message);
    return { error: err.message };
  }
}

export async function sendTestEmail(workspace, to) {
  const heading = "Your Co-Helper email is working";
  const html = brandedLayout({
    preview: "This is a test from your Co-Helper workspace.",
    heading,
    bodyHtml: `<p style="margin:0 0 12px">This message was sent from your workspace to confirm that outbound email is set up correctly.</p>
      <p style="margin:0">If you received it, clients and collaborators will get invites and invoices the same way.</p>`,
    footerHtml: `Sent by Co-Helper · <a href="${SITE}" style="color:#0F6E56;text-decoration:none">co-helper.com</a>`,
  });
  return sendEmail({
    workspace,
    to,
    subject: heading,
    html,
    text: `${heading}\n\nThis message was sent from your workspace to confirm that outbound email is set up correctly.\n\n${SITE}`,
  });
}

export function inviteEmail({
  workspaceName,
  freelancerName,
  inviteUrl,
  email,
  kind = "client",
  projectName = null,
}) {
  const who = freelancerName || "Someone you work with";
  const space = workspaceName || `${who}'s workspace`;
  const project = projectName?.trim() || "";
  const isCollab = kind === "collaborator";
  const heading = isCollab && project
    ? `${who} invited you to ${project}`
    : `${who} invited you to ${space}`;
  const preview = isCollab && project
    ? `Join ${project} on Co-Helper at co-helper.com.`
    : `Join ${space} on Co-Helper at co-helper.com.`;
  const bodyHtml = isCollab
    ? `<p style="margin:0 0 12px">${escapeHtml(who)} invited you to collaborate${project ? ` on <strong>${escapeHtml(project)}</strong>` : ""} in <strong>${escapeHtml(space)}</strong>.</p>
       <p style="margin:0">Open the invite on Co-Helper to create your account or sign in. You will only see the project you were invited to.</p>`
    : `<p style="margin:0 0 12px">${escapeHtml(who)} invited you to their workspace <strong>${escapeHtml(space)}</strong> on Co-Helper.</p>
       <p style="margin:0">Open the invite to create your account or sign in. You will only see the projects they share with you.</p>`;
  const text = isCollab
    ? `${who} invited you to collaborate${project ? ` on ${project}` : ""} in ${space}.\n\nJoin: ${inviteUrl}\n\nCo-Helper · ${SITE}`
    : `${who} invited you to ${space} on Co-Helper.\n\nJoin: ${inviteUrl}\n\nCo-Helper · ${SITE}`;

  return {
    to: email,
    subject: heading,
    html: brandedLayout({
      preview,
      heading,
      bodyHtml,
      ctaLabel: "Open invite",
      ctaUrl: inviteUrl,
      footerHtml: `This email was sent to ${escapeHtml(email)} because ${escapeHtml(who)} invited you on Co-Helper.
        If you were not expecting it, you can ignore this message.<br>
        <a href="${SITE}" style="color:#0F6E56;text-decoration:none">co-helper.com</a>`,
    }),
    text,
  };
}

export function contactEmail({ name, email, company, subject, message }) {
  const heading = subject || "Workspace question";
  return {
    subject: `[Co-Helper] ${heading}`,
    html: brandedLayout({
      preview: `${name} wrote from ${email}`,
      heading,
      bodyHtml: `<p style="margin:0 0 12px"><strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;${company ? `<br>${escapeHtml(company)}` : ""}</p>
        <p style="margin:0;white-space:pre-wrap">${escapeHtml(message)}</p>`,
      footerHtml: `Contact form on <a href="${SITE}" style="color:#0F6E56;text-decoration:none">co-helper.com</a>`,
    }),
    text: `${name} <${email}>${company ? ` · ${company}` : ""}\n\n${message}\n\nCo-Helper · ${SITE}`,
  };
}

export function invoiceEmail({
  to,
  number,
  workspaceName,
  projectName,
  totalLabel,
  invoiceUrl,
}) {
  const heading = `Rechnung ${number}`;
  const who = workspaceName || "Co-Helper";
  return {
    to,
    subject: `Rechnung ${number} — ${who}`,
    html: brandedLayout({
      preview: `Rechnung ${number} für ${projectName || "Ihr Projekt"} liegt bei.`,
      heading,
      bodyHtml: `<p style="margin:0 0 12px">${escapeHtml(who)} hat Rechnung <strong>${escapeHtml(number)}</strong>${projectName ? ` für <strong>${escapeHtml(projectName)}</strong>` : ""} erstellt.</p>
        <p style="margin:0 0 12px">Betrag: <strong>${escapeHtml(totalLabel)}</strong></p>
        <p style="margin:0">Die E-Rechnung (ZUGFeRD / Factur-X, EN 16931) ist als PDF angehängt. Sie können sie auch in Co-Helper öffnen.</p>`,
      ctaLabel: "Rechnung öffnen",
      ctaUrl: invoiceUrl,
      footerHtml: `Gesendet über Co-Helper · <a href="${SITE}" style="color:#0F6E56;text-decoration:none">co-helper.com</a>`,
    }),
    text: `Rechnung ${number} von ${who}${projectName ? ` für ${projectName}` : ""}.\nBetrag: ${totalLabel}\n\n${invoiceUrl}\n\nCo-Helper · ${SITE}`,
  };
}
