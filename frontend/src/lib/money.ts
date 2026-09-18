export function formatMoney(n: number, currency = "EUR") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n)
  } catch {
    return `${Number(n).toFixed(2)} ${currency}`
  }
}

export function initials(name?: string | null) {
  if (!name) return "?"
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?"
}
