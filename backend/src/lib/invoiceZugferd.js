import {
  embedFacturX,
  DocumentTypeCode,
  UnitCode,
  VatCategoryCode,
  Profile,
  Flavor,
} from "@stackforge-eu/factur-x";
import { invoiceBillingGaps, partyDisplayName } from "./billingProfile.js";

function money(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function vatCategory(code) {
  if (code === "E") return VatCategoryCode.EXEMPT;
  if (code === "AE") return VatCategoryCode.REVERSE_CHARGE;
  if (code === "Z") return VatCategoryCode.ZERO_RATED;
  if (code === "O") return VatCategoryCode.OUTSIDE_SCOPE;
  return VatCategoryCode.STANDARD_RATE;
}

function taxRegistrations(party) {
  const list = [];
  if (party?.vatId) list.push({ id: party.vatId, schemeId: "VA" });
  if (party?.taxNumber) list.push({ id: party.taxNumber, schemeId: "FC" });
  return list;
}

function tradeParty(party, { electronicEmail = true } = {}) {
  const name = partyDisplayName(party, "Unbekannt");
  const out = {
    name,
    address: {
      line1: party.street || "—",
      line2: party.addressExtra || undefined,
      city: party.city || "—",
      postalCode: party.postalCode || "00000",
      country: party.country || "DE",
    },
    taxRegistrations: taxRegistrations(party),
  };
  if (party.tradeName && party.tradeName !== name) {
    out.legalOrganization = { tradingName: party.tradeName };
  }
  if (party.contactName || party.phone || party.email) {
    out.contact = {
      name: party.contactName || undefined,
      phone: party.phone || undefined,
      email: party.email || undefined,
    };
  }
  if (electronicEmail && party.email) {
    out.electronicAddress = { value: party.email, schemeID: "EM" };
  }
  return out;
}

export function toFacturXInput({ invoice, lines, seller, buyer, projectName }) {
  const currency = invoice.currency || "EUR";
  const taxPercent = money(invoice.tax_percent ?? invoice.taxPercent);
  const subtotal = money(invoice.subtotal);
  const total = money(invoice.total);
  const taxAmount = money(total - subtotal);
  const category = vatCategory(invoice.tax_category || invoice.taxCategory || "S");
  const issueDate = String(invoice.issue_date || invoice.issueDate || invoice.created_at || "").slice(0, 10);
  const dueDate = invoice.due_at || invoice.dueAt || undefined;
  const notes = [];
  if (invoice.tax_note || invoice.taxNote) {
    notes.push({ content: invoice.tax_note || invoice.taxNote, subjectCode: "TXD" });
  }
  if (invoice.note) notes.push({ content: invoice.note });
  const legalBits = [
    seller.managingDirectors ? `Geschäftsführer: ${seller.managingDirectors}` : null,
    seller.registerCourt || seller.commercialRegister
      ? ["Registergericht", seller.registerCourt, seller.commercialRegister].filter(Boolean).join(" ")
      : null,
  ].filter(Boolean);
  if (legalBits.length) notes.push({ content: legalBits.join(" · "), subjectCode: "REG" });

  const mappedLines = (lines || []).map((line, index) => {
    const hours = money(line.hours);
    const amount = money(line.amount);
    const hourly = hours > 0;
    const quantity = hourly ? hours : 1;
    const unitPrice = hourly ? money(line.rate) : amount;
    return {
      id: String(index + 1),
      name: String(line.description || "Leistung").slice(0, 100),
      description: line.description || undefined,
      quantity,
      unitCode: hourly ? UnitCode.HOUR : UnitCode.UNIT,
      unitPrice,
      lineTotal: amount,
      vatCategoryCode: category,
      vatRatePercent: taxPercent,
    };
  });

  const vatBreakdown = {
    categoryCode: category,
    ratePercent: taxPercent,
    taxableAmount: subtotal,
    taxAmount,
  };
  if (invoice.tax_note || invoice.taxNote) {
    vatBreakdown.exemptionReason = invoice.tax_note || invoice.taxNote;
  }
  if ((invoice.tax_category || invoice.taxCategory) === "AE") {
    vatBreakdown.exemptionReasonCode = "VATEX-EU-AE";
  }

  const input = {
    document: {
      id: invoice.number,
      issueDate,
      typeCode: DocumentTypeCode.COMMERCIAL_INVOICE,
      dueDate: dueDate || undefined,
      buyerReference: buyer.buyerReference || projectName || invoice.number,
      notes: notes.length ? notes : undefined,
    },
    seller: tradeParty(seller),
    buyer: tradeParty(buyer),
    lines: mappedLines,
    totals: {
      lineTotal: subtotal,
      taxBasisTotal: subtotal,
      taxTotal: taxAmount,
      grandTotal: total,
      duePayableAmount: total,
      currency,
    },
    vatBreakdown: [vatBreakdown],
    payment: {
      meansCode: seller.iban ? "58" : "30",
      iban: seller.iban || undefined,
      bic: seller.bic || undefined,
      accountName: seller.name || undefined,
      dueDate: dueDate || undefined,
      paymentReference: invoice.number,
      termsDescription: seller.paymentTermsDays
        ? `Zahlbar innerhalb von ${seller.paymentTermsDays} Tagen ohne Abzug.`
        : undefined,
    },
  };

  const periodStart = invoice.service_period_start || invoice.servicePeriodStart;
  const periodEnd = invoice.service_period_end || invoice.servicePeriodEnd || invoice.service_date || invoice.serviceDate;
  if (periodStart || periodEnd) {
    input.billingPeriod = {
      startDate: periodStart || periodEnd,
      endDate: periodEnd || periodStart,
    };
  }
  return input;
}

export async function embedZugferdPdf(pdfBuffer, ctx) {
  const gaps = invoiceBillingGaps(ctx);
  if (gaps.length) {
    const err = new Error(`ZUGFeRD invoice is missing: ${gaps.join(", ")}`);
    err.status = 400;
    err.missing = gaps;
    throw err;
  }
  const result = await embedFacturX({
    pdf: pdfBuffer,
    input: toFacturXInput(ctx),
    profile: Profile.EN16931,
    flavor: Flavor.ZUGFERD,
    validateXsd: true,
    meta: {
      title: `Rechnung ${ctx.invoice.number}`,
      author: partyDisplayName(ctx.seller),
      subject: "ZUGFeRD-konforme E-Rechnung (EN 16931)",
      creator: "Co-Helper",
    },
  });
  if (result.xsdValidation && result.xsdValidation.valid === false) {
    const detail = (result.xsdValidation.errors || []).map((e) => e.message || String(e)).join("; ");
    const err = new Error(detail || "ZUGFeRD XML failed XSD validation");
    err.status = 400;
    throw err;
  }
  if (result.validation && result.validation.valid === false) {
    const detail = (result.validation.errors || []).map((e) => e.message || String(e)).join("; ");
    const err = new Error(detail || "ZUGFeRD invoice data is incomplete");
    err.status = 400;
    throw err;
  }
  return {
    pdf: Buffer.from(result.pdf),
    xml: result.xml,
  };
}
