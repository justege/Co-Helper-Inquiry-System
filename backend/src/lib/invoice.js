import { query, queryOne } from "../db.js";
import { computeJobFinance } from "./finance.js";

function money(n, currency = "EUR") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  } catch {
    return `${Number(n).toFixed(2)} ${currency}`;
  }
}

export async function buildInvoicePayload(inquiryId) {
  const inquiry = await queryOne(
    `SELECT i.*,
            json_build_object(
              'id', cu.id, 'email', cu.email, 'first_name', cu.first_name,
              'last_name', cu.last_name, 'company_name', cu.company_name
            ) AS client,
            json_build_object(
              'id', w.id, 'name', w.name, 'currency', w.currency,
              'owner', json_build_object(
                'id', ou.id, 'email', ou.email, 'first_name', ou.first_name,
                'last_name', ou.last_name, 'company_name', ou.company_name
              )
            ) AS workspace
     FROM inquiries i
     LEFT JOIN users cu ON cu.id = i.client_id
     LEFT JOIN workspaces w ON w.id = i.workspace_id
     LEFT JOIN users ou ON ou.id = w.owner_id
     WHERE i.id = $1`,
    [inquiryId]
  );
  if (!inquiry) return null;

  const [agreement, timeEntries, payments] = await Promise.all([
    queryOne(
      `SELECT * FROM price_agreements
       WHERE inquiry_id = $1 AND status = 'agreed'
       ORDER BY agreed_at DESC NULLS LAST LIMIT 1`,
      [inquiryId]
    ),
    query(`SELECT * FROM time_entries WHERE inquiry_id = $1 ORDER BY entry_date`, [inquiryId]),
    query(`SELECT * FROM payments WHERE inquiry_id = $1 ORDER BY created_at`, [inquiryId]),
  ]);

  const finance = computeJobFinance({ agreement, timeEntries, payments });
  return { inquiry, agreement, timeEntries, payments, finance };
}

function displayName(u) {
  if (!u) return "—";
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return u.company_name || name || u.email || "—";
}

export async function renderInvoicePdf(inquiryId) {
  const payload = await buildInvoicePayload(inquiryId);
  if (!payload) return null;

  const { default: PDFDocument } = await import("pdfkit");
  const { inquiry, agreement, timeEntries, payments, finance } = payload;
  const currency = finance.currency || inquiry.workspace?.currency || "EUR";

  const doc = new PDFDocument({ size: "A4", margin: 56 });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  doc.fillColor("#0F6E56").fontSize(18).text("Co-Helper");
  doc.moveDown(0.3);
  doc.fillColor("#0E1B17").fontSize(22).text("Invoice");
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor("#6B7280").text(`Job: ${inquiry.title}`);
  doc.text(`Issued: ${new Date().toISOString().slice(0, 10)}`);
  doc.moveDown();

  doc.fillColor("#0E1B17").fontSize(11).text("From", { continued: false });
  doc.fontSize(10).fillColor("#374151").text(displayName(inquiry.workspace?.owner));
  doc.text(inquiry.workspace?.name || "Workspace");
  doc.moveDown(0.6);
  doc.fillColor("#0E1B17").fontSize(11).text("Bill to");
  doc.fontSize(10).fillColor("#374151").text(displayName(inquiry.client));
  doc.text(inquiry.client?.email || "");
  doc.moveDown();

  if (agreement) {
    const line =
      agreement.billing_type === "hourly"
        ? `Hourly — ${money(Number(agreement.hourly_rate), currency)} × ${finance.billableHours}h`
        : `Fixed project`;
    doc.fillColor("#0E1B17").fontSize(11).text("Agreement");
    doc.fontSize(10).fillColor("#374151").text(line);
    doc.text(`Agreed value: ${money(finance.agreedValue, currency)}`);
  }

  if (timeEntries.length) {
    doc.moveDown();
    doc.fillColor("#0E1B17").fontSize(11).text("Hours");
    for (const e of timeEntries) {
      doc.fontSize(9).fillColor("#374151").text(
        `${e.entry_date}  ${Number(e.hours)}h  ${e.note || ""}`.trim()
      );
    }
  }

  if (payments.length) {
    doc.moveDown();
    doc.fillColor("#0E1B17").fontSize(11).text("Payments");
    for (const p of payments) {
      doc.fontSize(9).fillColor("#374151").text(
        `${p.paid_at ? String(p.paid_at).slice(0, 10) : "logged"}  ${money(Number(p.amount), p.currency || currency)}  ${p.status}`
      );
    }
  }

  doc.moveDown();
  doc.fillColor("#0E1B17").fontSize(12).text(`Paid: ${money(finance.paid, currency)}`);
  doc.text(`Outstanding: ${money(finance.outstanding, currency)}`);
  doc.moveDown();
  doc.fontSize(8).fillColor("#6B7280").text(
    "This invoice is a record generated from Co-Helper. Payments are logged by the parties; Co-Helper does not process money."
  );

  doc.end();
  return done;
}
