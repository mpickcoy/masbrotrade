const VALID_CURRENCIES = new Set(["USD", "IDR", "EUR", "GBP", "JPY", "SGD", "AUD", "MYR", "USDT"]);
export const fmtMoney = (n: number, currency = "USD") => {
  const safeCurrency = VALID_CURRENCIES.has(currency?.toUpperCase()) ? currency.toUpperCase() : "USD";
  // USDT is not an ISO 4217 code — show as USD with label
  if (safeCurrency === "USDT") {
    return `USDT ${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)}`;
  }
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: safeCurrency, maximumFractionDigits: 2 }).format(n || 0);
  } catch {
    return `${safeCurrency} ${(n || 0).toFixed(2)}`;
  }
};

export const fmtNum = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n || 0);
