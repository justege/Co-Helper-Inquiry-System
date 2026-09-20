import PDFDocument from "pdfkit";

function money(amount, currency) {
  const n = Number(amount) || 0;
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency || "EUR" }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency || "EUR"}`;
  }
}

function hours(n) {
  return `${(Math.round((Number(n) || 0) * 10) / 10).toFixed(1)}h`;
}

export function buildInvoicePdf({ invoice, workspace, client, project, lines, freelancer }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const currency = invoice.currency || workspace?.currency || "EUR";
    const from =
      freelancer?.company_name ||
      [freelancer?.first_name, freelancer?.last_name].filter(Boolean).join(" ") ||
      freelancer?.email ||
      workspace?.name ||
      "Freelancer";
    const to =
      client?.company_name ||
      [client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
      client?.email ||
      "Client";

    doc.fillColor("#0E1B17").fontSize(22).font("Helvetica-Bold").text(workspace?.name || "Invoice");
    doc.moveDown(0.3);
    doc.fontSize(11).font("Helvetica").fillColor("#6B7280").text(`Invoice ${invoice.number}`);
    doc.text(`Status: ${invoice.status}`);
    if (invoice.created_at) {
      doc.text(`Issued: ${new Date(invoice.created_at).toISOString().slice(0, 10)}`);
    }
    if (invoice.due_at) doc.text(`Due: ${invoice.due_at}`);
    doc.moveDown();

    doc.fillColor("#0E1B17").font("Helvetica-Bold").fontSize(10).text("From");
    doc.font("Helvetica").fontSize(11).text(from);
    if (freelancer?.email) doc.fillColor("#6B7280").text(freelancer.email);
    doc.moveDown(0.8);
    doc.fillColor("#0E1B17").font("Helvetica-Bold").fontSize(10).text("Bill to");
    doc.font("Helvetica").fontSize(11).text(to);
    if (client?.email) doc.fillColor("#6B7280").text(client.email);
    doc.moveDown();
    doc.fillColor("#0E1B17").font("Helvetica-Bold").text(`Project: ${project?.name || ""}`);
    doc.moveDown();

    const startY = doc.y;
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#6B7280");
    const hasHours = lines.some((line) => Number(line.hours) > 0);
    doc.text("Description", 50, startY, { width: hasHours ? 250 : 360 });
    if (hasHours) {
      doc.text("Hours", 300, startY, { width: 70, align: "right" });
      doc.text("Rate", 380, startY, { width: 70, align: "right" });
    }
    doc.text("Amount", 460, startY, { width: 85, align: "right" });
    doc.moveTo(50, startY + 16).lineTo(545, startY + 16).strokeColor("#E5E7EB").stroke();

    let y = startY + 24;
    doc.font("Helvetica").fontSize(10).fillColor("#0E1B17");
    for (const line of lines) {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      doc.text(line.description, 50, y, { width: hasHours ? 250 : 360 });
      if (hasHours) {
        doc.text(Number(line.hours) > 0 ? hours(line.hours) : "—", 300, y, { width: 70, align: "right" });
        doc.text(Number(line.hours) > 0 ? money(line.rate, currency) : "—", 380, y, { width: 70, align: "right" });
      }
      doc.text(money(line.amount, currency), 460, y, { width: 85, align: "right" });
      y += 22;
    }

    doc.moveTo(50, y).lineTo(545, y).strokeColor("#E5E7EB").stroke();
    y += 16;
    doc.font("Helvetica").text("Subtotal", 300, y, { width: 150 });
    doc.text(money(invoice.subtotal, currency), 460, y, { width: 85, align: "right" });
    y += 18;
    if (Number(invoice.tax_percent) > 0) {
      doc.text(`Tax (${invoice.tax_percent}%)`, 300, y, { width: 150 });
      doc.text(money(Number(invoice.total) - Number(invoice.subtotal), currency), 460, y, {
        width: 85,
        align: "right",
      });
      y += 18;
    }
    doc.font("Helvetica-Bold").text("Total", 300, y, { width: 150 });
    doc.text(money(invoice.total, currency), 460, y, { width: 85, align: "right" });

    if (invoice.note) {
      doc.moveDown(3);
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#0E1B17").text("Note");
      doc.font("Helvetica").fontSize(10).fillColor("#6B7280").text(invoice.note, { width: 480 });
    }

    doc.moveDown(2);
    doc.font("Helvetica").fontSize(8).fillColor("#9CA3AF").text(
      "Co-Helper is a shared work record. This invoice does not collect payment — settle as you already do."
    );

    doc.end();
  });
}
