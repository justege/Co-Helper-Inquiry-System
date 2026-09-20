const TAX_REGIMES = new Set(["standard", "kleinunternehmer", "reverse_charge"]);

const KLEINUNTERNEHMER_NOTE =
  "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.";
const REVERSE_CHARGE_NOTE =
  "Steuerschuldnerschaft des Leistungsempfängers gemäß § 13b UStG.";

export function todayIso() {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysIso(iso, days) {
  const raw = String(iso || "").slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return raw || null;
  const dt = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  dt.setUTCDate(dt.getUTCDate() + Number(days || 0));
  return dt.toISOString().slice(0, 10);
}

export function isoDate(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function cleanText(value, max = 200) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.slice(0, max);
}

function cleanCountry(value) {
  const s = cleanText(value, 2);
  return s ? s.toUpperCase() : "DE";
}

function cleanVat(value) {
  const s = cleanText(value, 32);
  return s ? s.replace(/\s+/g, "").toUpperCase() : null;
}

function cleanIban(value) {
  const s = cleanText(value, 34);
  return s ? s.replace(/\s+/g, "").toUpperCase() : null;
}

function cleanBic(value) {
  const s = cleanText(value, 11);
  return s ? s.replace(/\s+/g, "").toUpperCase() : null;
}

export function optionalText(body, key, max = 200) {
  if (!body || body[key] === undefined) return undefined;
  if (body[key] == null) return null;
  return cleanText(body[key], max);
}

export function personName(row) {
  return [row?.first_name ?? row?.firstName, row?.last_name ?? row?.lastName].filter(Boolean).join(" ").trim();
}

export function partyDisplayName(party, fallback = "Unbekannt") {
  if (!party) return fallback;
  return (
    party.legalName ||
    party.legal_name ||
    party.tradeName ||
    party.trade_name ||
    party.companyName ||
    party.company_name ||
    party.name ||
    personName(party) ||
    party.email ||
    fallback
  );
}

export function snapshotSeller(workspace, owner) {
  const legalName =
    cleanText(workspace?.legal_name, 200) ||
    cleanText(workspace?.name, 80) ||
    cleanText(owner?.company_name, 200) ||
    personName(owner) ||
    owner?.email ||
    "Rechnungssteller";
  return {
    name: legalName,
    legalName,
    tradeName: cleanText(workspace?.trade_name, 200),
    legalForm: cleanText(workspace?.legal_form, 80),
    street: cleanText(workspace?.street, 200),
    addressExtra: cleanText(workspace?.address_extra, 200),
    postalCode: cleanText(workspace?.postal_code, 16),
    city: cleanText(workspace?.city, 80),
    country: cleanCountry(workspace?.country),
    email: cleanText(workspace?.billing_email, 200) || cleanText(owner?.email, 200),
    phone: cleanText(workspace?.billing_phone, 40) || cleanText(owner?.phone, 40),
    vatId: cleanVat(workspace?.vat_id),
    taxNumber: cleanText(workspace?.tax_number, 40),
    commercialRegister: cleanText(workspace?.commercial_register, 80),
    registerCourt: cleanText(workspace?.register_court, 80),
    managingDirectors: cleanText(workspace?.managing_directors, 200),
    website: cleanText(workspace?.website, 200),
    iban: cleanIban(workspace?.iban),
    bic: cleanBic(workspace?.bic),
    bankName: cleanText(workspace?.bank_name, 80),
    taxRegime: TAX_REGIMES.has(workspace?.tax_regime) ? workspace.tax_regime : "standard",
    paymentTermsDays: Number.isFinite(Number(workspace?.payment_terms_days))
      ? Number(workspace.payment_terms_days)
      : 14,
  };
}

export function snapshotBuyer(client) {
  const company = cleanText(client?.company_name, 200);
  const legalName = cleanText(client?.legal_name, 200) || company || personName(client) || client?.email || "Kunde";
  return {
    name: legalName,
    legalName,
    tradeName: cleanText(client?.trade_name, 200) || company,
    legalForm: cleanText(client?.legal_form, 80),
    street: cleanText(client?.street, 200),
    addressExtra: cleanText(client?.address_extra, 200),
    postalCode: cleanText(client?.postal_code, 16),
    city: cleanText(client?.city, 80),
    country: cleanCountry(client?.country),
    email: cleanText(client?.email, 200),
    phone: cleanText(client?.phone, 40),
    vatId: cleanVat(client?.vat_id),
    taxNumber: cleanText(client?.tax_number, 40),
    commercialRegister: cleanText(client?.commercial_register, 80),
    registerCourt: cleanText(client?.register_court, 80),
    contactName: cleanText(client?.contact_person, 120) || personName(client) || null,
    buyerReference: cleanText(client?.buyer_reference, 120),
  };
}

export function taxSetupForWorkspace(workspace, requestedPercent) {
  const regime = TAX_REGIMES.has(workspace?.tax_regime) ? workspace.tax_regime : "standard";
  if (regime === "kleinunternehmer") {
    return { taxPercent: 0, taxCategory: "E", taxNote: KLEINUNTERNEHMER_NOTE, taxRegime: regime };
  }
  if (regime === "reverse_charge") {
    return { taxPercent: 0, taxCategory: "AE", taxNote: REVERSE_CHARGE_NOTE, taxRegime: regime };
  }
  const fallback = Number(workspace?.default_tax_percent);
  const raw = requestedPercent != null && requestedPercent !== "" ? Number(requestedPercent) : fallback;
  const taxPercent = Number.isFinite(raw) ? raw : 19;
  if (taxPercent <= 0) {
    return {
      taxPercent: 0,
      taxCategory: "Z",
      taxNote: "Steuerfreier Umsatz (Steuersatz 0 %).",
      taxRegime: regime,
    };
  }
  return { taxPercent, taxCategory: "S", taxNote: null, taxRegime: regime };
}

export function missingInvoicePartyFields(party, role) {
  const missing = [];
  const label = role === "seller" ? "Your business" : "Client";
  if (!partyDisplayName(party, "")) missing.push(`${label} name`);
  if (!party?.street) missing.push(`${label} street`);
  if (!party?.postalCode) missing.push(`${label} postal code`);
  if (!party?.city) missing.push(`${label} city`);
  if (!party?.country) missing.push(`${label} country`);
  if (role === "seller" && !party?.vatId && !party?.taxNumber) {
    missing.push("VAT ID (USt-IdNr.) or tax number (Steuernummer)");
  }
  return missing;
}

export function invoiceBillingGaps({ seller, buyer }) {
  return [...missingInvoicePartyFields(seller, "seller"), ...missingInvoicePartyFields(buyer, "buyer")];
}

export function mapClientBilling(row) {
  if (!row) return null;
  return {
    tradeName: row.trade_name ?? null,
    legalName: row.legal_name ?? null,
    street: row.street ?? null,
    addressExtra: row.address_extra ?? null,
    postalCode: row.postal_code ?? null,
    city: row.city ?? null,
    country: row.country || "DE",
    vatId: row.vat_id ?? null,
    taxNumber: row.tax_number ?? null,
    commercialRegister: row.commercial_register ?? null,
    registerCourt: row.register_court ?? null,
    legalForm: row.legal_form ?? null,
    contactPerson: row.contact_person ?? null,
    buyerReference: row.buyer_reference ?? null,
  };
}

export function mapWorkspaceBilling(ws) {
  if (!ws) return null;
  return {
    legalName: ws.legal_name ?? null,
    tradeName: ws.trade_name ?? null,
    street: ws.street ?? null,
    addressExtra: ws.address_extra ?? null,
    postalCode: ws.postal_code ?? null,
    city: ws.city ?? null,
    country: ws.country || "DE",
    vatId: ws.vat_id ?? null,
    taxNumber: ws.tax_number ?? null,
    commercialRegister: ws.commercial_register ?? null,
    registerCourt: ws.register_court ?? null,
    legalForm: ws.legal_form ?? null,
    managingDirectors: ws.managing_directors ?? null,
    billingPhone: ws.billing_phone ?? null,
    billingEmail: ws.billing_email ?? null,
    website: ws.website ?? null,
    iban: ws.iban ?? null,
    bic: ws.bic ?? null,
    bankName: ws.bank_name ?? null,
    taxRegime: ws.tax_regime || "standard",
    defaultTaxPercent: ws.default_tax_percent != null ? Number(ws.default_tax_percent) : 19,
    paymentTermsDays: ws.payment_terms_days != null ? Number(ws.payment_terms_days) : 14,
  };
}

const WORKSPACE_BILLING_PATCH = [
  ["legalName", "legal_name", 200],
  ["tradeName", "trade_name", 200],
  ["street", "street", 200],
  ["addressExtra", "address_extra", 200],
  ["postalCode", "postal_code", 16],
  ["city", "city", 80],
  ["legalForm", "legal_form", 80],
  ["commercialRegister", "commercial_register", 80],
  ["registerCourt", "register_court", 80],
  ["managingDirectors", "managing_directors", 200],
  ["billingPhone", "billing_phone", 40],
  ["billingEmail", "billing_email", 200],
  ["website", "website", 200],
  ["bankName", "bank_name", 80],
  ["taxNumber", "tax_number", 40],
];

export function workspaceBillingPatch(body) {
  const fields = [];
  const values = [];
  if (!body || typeof body !== "object") return { fields, values };
  for (const [key, column, max] of WORKSPACE_BILLING_PATCH) {
    if (body[key] === undefined) continue;
    fields.push(column);
    values.push(cleanText(body[key], max));
  }
  if (body.country !== undefined) {
    fields.push("country");
    values.push(cleanCountry(body.country));
  }
  if (body.vatId !== undefined) {
    fields.push("vat_id");
    values.push(cleanVat(body.vatId));
  }
  if (body.iban !== undefined) {
    fields.push("iban");
    values.push(cleanIban(body.iban));
  }
  if (body.bic !== undefined) {
    fields.push("bic");
    values.push(cleanBic(body.bic));
  }
  if (body.taxRegime !== undefined) {
    const regime = String(body.taxRegime || "").trim();
    if (!TAX_REGIMES.has(regime)) {
      return { error: "taxRegime must be standard, kleinunternehmer, or reverse_charge" };
    }
    fields.push("tax_regime");
    values.push(regime);
  }
  if (body.defaultTaxPercent !== undefined) {
    const n = Number(body.defaultTaxPercent);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return { error: "defaultTaxPercent must be between 0 and 100" };
    }
    fields.push("default_tax_percent");
    values.push(n);
  }
  if (body.paymentTermsDays !== undefined) {
    const n = Number(body.paymentTermsDays);
    if (!Number.isInteger(n) || n < 0 || n > 365) {
      return { error: "paymentTermsDays must be between 0 and 365" };
    }
    fields.push("payment_terms_days");
    values.push(n);
  }
  return { fields, values };
}

const CLIENT_PATCH = [
  ["firstName", "first_name", 80],
  ["lastName", "last_name", 80],
  ["companyName", "company_name", 120],
  ["phone", "phone", 40],
  ["notes", "notes", 2000],
  ["tradeName", "trade_name", 200],
  ["legalName", "legal_name", 200],
  ["street", "street", 200],
  ["addressExtra", "address_extra", 200],
  ["postalCode", "postal_code", 16],
  ["city", "city", 80],
  ["legalForm", "legal_form", 80],
  ["commercialRegister", "commercial_register", 80],
  ["registerCourt", "register_court", 80],
  ["contactPerson", "contact_person", 120],
  ["buyerReference", "buyer_reference", 120],
  ["taxNumber", "tax_number", 40],
];

export function clientRecordPatch(body) {
  const fields = [];
  const values = [];
  if (!body || typeof body !== "object") return { fields, values };
  for (const [key, column, max] of CLIENT_PATCH) {
    if (body[key] === undefined) continue;
    fields.push(column);
    values.push(cleanText(body[key], max));
  }
  if (body.country !== undefined) {
    fields.push("country");
    values.push(cleanCountry(body.country));
  }
  if (body.vatId !== undefined) {
    fields.push("vat_id");
    values.push(cleanVat(body.vatId));
  }
  return { fields, values };
}

export function clientInsertValues(body) {
  const patch = clientRecordPatch(body);
  const byColumn = Object.fromEntries(patch.fields.map((col, i) => [col, patch.values[i]]));
  return {
    first_name: byColumn.first_name ?? null,
    last_name: byColumn.last_name ?? null,
    company_name: byColumn.company_name ?? null,
    phone: byColumn.phone ?? null,
    notes: byColumn.notes ?? null,
    trade_name: byColumn.trade_name ?? null,
    legal_name: byColumn.legal_name ?? null,
    street: byColumn.street ?? null,
    address_extra: byColumn.address_extra ?? null,
    postal_code: byColumn.postal_code ?? null,
    city: byColumn.city ?? null,
    country: byColumn.country || "DE",
    vat_id: byColumn.vat_id ?? null,
    tax_number: byColumn.tax_number ?? null,
    commercial_register: byColumn.commercial_register ?? null,
    register_court: byColumn.register_court ?? null,
    legal_form: byColumn.legal_form ?? null,
    contact_person: byColumn.contact_person ?? null,
    buyer_reference: byColumn.buyer_reference ?? null,
  };
}

export function addressLines(party) {
  if (!party) return [];
  return [
    party.tradeName && party.tradeName !== party.name ? party.tradeName : null,
    party.street,
    party.addressExtra,
    [party.postalCode, party.city].filter(Boolean).join(" "),
    party.country && party.country !== "DE" ? party.country : null,
  ].filter(Boolean);
}

export function legalFooter(party) {
  if (!party) return "";
  const bits = [];
  const title = [party.name, party.legalForm].filter(Boolean).join(" ");
  if (title) bits.push(title);
  if (party.managingDirectors) bits.push(`Geschäftsführer: ${party.managingDirectors}`);
  if (party.registerCourt || party.commercialRegister) {
    bits.push(["Registergericht", party.registerCourt, party.commercialRegister].filter(Boolean).join(" "));
  }
  if (party.vatId) bits.push(`USt-IdNr.: ${party.vatId}`);
  if (party.taxNumber) bits.push(`Steuernummer: ${party.taxNumber}`);
  return bits.join(" · ");
}
