import PDFDocument from "pdfkit";
import {
  addressLines,
  invoiceBillingGaps,
  isoDate,
  legalFooter,
  partyDisplayName,
} from "./billingProfile.js";
import { embedZugferdPdf } from "./invoiceZugferd.js";

function money(amount, currency = "EUR") {
  const n = Number(amount) || 0;
  try {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(n);
  } catch {
    return `${n.toFixed(2).replace(".", ",")} ${currency}`;
  }
}

function hoursLabel(n) {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return `${String(v).replace(".", ",")} h`;
}

function deDate(value) {
  const iso = isoDate(value);
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

function renderVisualPdf({ invoice, lines, seller, buyer, projectName, zugferdNote }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, info: {
      Title: `Rechnung ${invoice.number}`,
      Author: partyDisplayName(seller),
      Subject: "Rechnung",
    } });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const currency = invoice.currency || "EUR";
    const ink = "#0E1B17";
    const muted = "#6B7280";
    const label = "#4B5563";

    doc.fillColor(ink).fontSize(22).font("Helvetica-Bold").text("RECHNUNG");
    doc.moveDown(0.2);
    doc.fontSize(10).font("Helvetica").fillColor(muted).text("ZUGFeRD / Factur-X · EN 16931");
    doc.moveDown(0.8);

    const metaTop = doc.y;
    doc.fillColor(label).font("Helvetica").fontSize(8).text("Rechnungsnummer", 320, metaTop);
    doc.fillColor(ink).font("Helvetica-Bold").fontSize(11).text(invoice.number, 320, metaTop + 12);
    doc.fillColor(label).font("Helvetica").fontSize(8).text("Rechnungsdatum", 320, metaTop + 32);
    doc.fillColor(ink).fontSize(10).text(deDate(invoice.issue_date || invoice.created_at), 320, metaTop + 44);
    doc.fillColor(label).fontSize(8).text("Leistungsdatum", 320, metaTop + 64);
    doc.fillColor(ink).fontSize(10).text(
      deDate(invoice.service_date || invoice.issue_date || invoice.created_at),
      320,
      metaTop + 76
    );
    if (invoice.due_at) {
      doc.fillColor(label).fontSize(8).text("Fällig am", 320, metaTop + 96);
      doc.fillColor(ink).fontSize(10).text(deDate(invoice.due_at), 320, metaTop + 108);
    }

    doc.fillColor(label).font("Helvetica").fontSize(8).text("Rechnungssteller", 50, metaTop);
    let y = metaTop + 12;
    doc.fillColor(ink).font("Helvetica-Bold").fontSize(11).text(partyDisplayName(seller), 50, y, { width: 250 });
    y = doc.y + 2;
    doc.font("Helvetica").fontSize(9).fillColor(ink);
    for (const line of addressLines(seller)) {
      doc.text(line, 50, y, { width: 250 });
      y = doc.y;
    }
    if (seller.vatId) {
      doc.fillColor(muted).text(`USt-IdNr.: ${seller.vatId}`, 50, y, { width: 250 });
      y = doc.y;
    }
    if (seller.taxNumber) {
      doc.fillColor(muted).text(`Steuernummer: ${seller.taxNumber}`, 50, y, { width: 250 });
      y = doc.y;
    }
    if (seller.email) {
      doc.fillColor(muted).text(seller.email, 50, y, { width: 250 });
      y = doc.y;
    }

    y = Math.max(y, metaTop + 130) + 12;
    doc.fillColor(label).fontSize(8).text("Rechnungsempfänger", 50, y);
    y += 12;
    doc.fillColor(ink).font("Helvetica-Bold").fontSize(11).text(partyDisplayName(buyer), 50, y, { width: 320 });
    y = doc.y + 2;
    doc.font("Helvetica").fontSize(9);
    for (const line of addressLines(buyer)) {
      doc.text(line, 50, y, { width: 320 });
      y = doc.y;
    }
    if (buyer.vatId) {
      doc.fillColor(muted).text(`USt-IdNr.: ${buyer.vatId}`, 50, y, { width: 320 });
      y = doc.y;
    }
    if (buyer.contactName) {
      doc.fillColor(muted).text(`Ansprechpartner: ${buyer.contactName}`, 50, y, { width: 320 });
      y = doc.y;
    }

    y += 10;
    if (projectName) {
      doc.fillColor(ink).font("Helvetica").fontSize(9).text(`Projekt: ${projectName}`, 50, y);
      y = doc.y + 4;
    }
    if (invoice.service_period_start || invoice.service_period_end) {
      doc.fillColor(muted).text(
        `Leistungszeitraum: ${deDate(invoice.service_period_start || invoice.service_period_end)} – ${deDate(invoice.service_period_end || invoice.service_period_start)}`,
        50,
        y
      );
      y = doc.y + 8;
    }

    const hasHours = (lines || []).some((line) => Number(line.hours) > 0);
    const startY = y + 6;
    doc.font("Helvetica-Bold").fontSize(8).fillColor(muted);
    doc.text("Pos.", 50, startY, { width: 28 });
    doc.text("Beschreibung", 80, startY, { width: hasHours ? 220 : 330 });
    if (hasHours) {
      doc.text("Menge", 300, startY, { width: 60, align: "right" });
      doc.text("Einzelpreis", 365, startY, { width: 80, align: "right" });
    }
    doc.text("Betrag (netto)", 450, startY, { width: 95, align: "right" });
    doc.moveTo(50, startY + 14).lineTo(545, startY + 14).strokeColor("#E5E7EB").stroke();

    y = startY + 20;
    doc.font("Helvetica").fontSize(9).fillColor(ink);
    (lines || []).forEach((line, index) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      const rowH = Math.max(16, doc.heightOfString(line.description || "", { width: hasHours ? 220 : 330 }));
      doc.text(String(index + 1), 50, y, { width: 28 });
      doc.text(line.description || "Leistung", 80, y, { width: hasHours ? 220 : 330 });
      if (hasHours) {
        doc.text(Number(line.hours) > 0 ? hoursLabel(line.hours) : "1", 300, y, { width: 60, align: "right" });
        doc.text(Number(line.hours) > 0 ? money(line.rate, currency) : money(line.amount, currency), 365, y, {
          width: 80,
          align: "right",
        });
      }
      doc.text(money(line.amount, currency), 450, y, { width: 95, align: "right" });
      y += rowH + 8;
    });

    doc.moveTo(50, y).lineTo(545, y).strokeColor("#E5E7EB").stroke();
    y += 14;
    const taxAmount = Number(invoice.total) - Number(invoice.subtotal);
    doc.font("Helvetica").fontSize(10).fillColor(ink);
    doc.text("Nettobetrag", 300, y, { width: 150 });
    doc.text(money(invoice.subtotal, currency), 450, y, { width: 95, align: "right" });
    y += 16;
    const taxLabel =
      Number(invoice.tax_percent) > 0
        ? `Umsatzsteuer ${String(invoice.tax_percent).replace(".", ",")} %`
        : invoice.tax_category === "AE"
          ? "Umsatzsteuer (Reverse Charge)"
          : invoice.tax_category === "E"
            ? "Umsatzsteuer (§ 19 UStG)"
            : "Umsatzsteuer";
    doc.text(taxLabel, 300, y, { width: 150 });
    doc.text(money(taxAmount, currency), 450, y, { width: 95, align: "right" });
    y += 18;
    doc.font("Helvetica-Bold").text("Rechnungsbetrag", 300, y, { width: 150 });
    doc.text(money(invoice.total, currency), 450, y, { width: 95, align: "right" });

    y += 28;
    if (invoice.tax_note) {
      doc.font("Helvetica").fontSize(9).fillColor(ink).text(invoice.tax_note, 50, y, { width: 495 });
      y = doc.y + 10;
    }
    if (invoice.note) {
      doc.font("Helvetica-Bold").fontSize(9).fillColor(ink).text("Hinweis", 50, y);
      y = doc.y + 2;
      doc.font("Helvetica").fontSize(9).fillColor(muted).text(invoice.note, 50, y, { width: 495 });
      y = doc.y + 10;
    }

    doc.font("Helvetica-Bold").fontSize(9).fillColor(ink).text("Zahlungsinformationen", 50, y);
    y = doc.y + 4;
    doc.font("Helvetica").fontSize(9).fillColor(ink);
    const terms = seller.paymentTermsDays
      ? `Zahlbar innerhalb von ${seller.paymentTermsDays} Tagen ohne Abzug. Bitte geben Sie die Rechnungsnummer als Verwendungszweck an.`
      : "Bitte überweisen Sie den Rechnungsbetrag unter Angabe der Rechnungsnummer.";
    doc.text(terms, 50, y, { width: 495 });
    y = doc.y + 4;
    if (seller.iban) doc.text(`IBAN: ${seller.iban}`, 50, y);
    y = doc.y;
    if (seller.bic) doc.text(`BIC: ${seller.bic}`, 50, y);
    y = doc.y;
    if (seller.bankName) doc.text(`Bank: ${seller.bankName}`, 50, y);
    y = doc.y + 12;

    if (zugferdNote) {
      doc.font("Helvetica").fontSize(8).fillColor("#B45309").text(zugferdNote, 50, y, { width: 495 });
      y = doc.y + 8;
    }

    const footer = legalFooter(seller);
    if (footer) {
      doc.font("Helvetica").fontSize(7).fillColor(muted).text(footer, 50, Math.max(y, 770), { width: 495 });
    }

    doc.end();
  });
}

export async function buildInvoiceDocument(ctx, { requireZugferd = false } = {}) {
  const gaps = invoiceBillingGaps(ctx);
  const zugferdNote = gaps.length
    ? `Elektronischer Datensatz (ZUGFeRD) unvollständig: ${gaps.join(", ")}. Bitte Rechnungs- und Mandantenangaben ergänzen.`
    : null;
  const visual = await renderVisualPdf({ ...ctx, zugferdNote });
  if (gaps.length) {
    if (requireZugferd) {
      const err = new Error(`ZUGFeRD invoice is missing: ${gaps.join(", ")}`);
      err.status = 400;
      err.missing = gaps;
      throw err;
    }
    return { pdf: visual, zugferd: false, missing: gaps };
  }
  try {
    const embedded = await embedZugferdPdf(visual, ctx);
    return { pdf: embedded.pdf, xml: embedded.xml, zugferd: true, missing: [] };
  } catch (err) {
    if (requireZugferd) throw err;
    const fallback = await renderVisualPdf({
      ...ctx,
      zugferdNote: `ZUGFeRD-Datensatz konnte nicht erzeugt werden: ${err.message}`,
    });
    return { pdf: fallback, zugferd: false, missing: [err.message] };
  }
}

export async function buildInvoicePdf(ctx) {
  const built = await buildInvoiceDocument(ctx);
  return built.pdf;
}
