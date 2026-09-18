const APP_URL = process.env.PUBLIC_APP_URL || process.env.TRELLO_RETURN_URL || "http://localhost:5173";
const FROM = process.env.EMAIL_FROM || "Co-Helper <hello@co-helper.com>";

export function appUrl(path = "") {
  return `${APP_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function sendEmail({ to, subject, html, text }) {
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
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text: text || undefined }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[email] Resend error", res.status, body);
    return { error: `Resend ${res.status}` };
  }
  return { ok: true };
}

export function inviteEmail({ workspaceName, freelancerName, inviteUrl, email }) {
  const who = freelancerName || "A solo business";
  const space = workspaceName || "their workspace";
  return {
    to: email,
    subject: `${who} invited you to ${space} on Co-Helper`,
    html: `
      <div style="font-family:Inter,system-ui,sans-serif;color:#0E1B17;line-height:1.6">
        <p>${who} invited you to collaborate in <strong>${space}</strong>.</p>
        <p>Co-Helper is a private workspace for jobs, files, hours, and payments — no marketplace, no middleman.</p>
        <p><a href="${inviteUrl}" style="display:inline-block;background:#0F6E56;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Accept invite</a></p>
        <p style="color:#6B7280;font-size:13px">If the button doesn’t work, copy this link:<br>${inviteUrl}</p>
      </div>
    `,
    text: `${who} invited you to ${space}. Accept: ${inviteUrl}`,
  };
}
