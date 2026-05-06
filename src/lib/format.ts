export const fmtMoney = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(n || 0);

export const fmtNum = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n || 0);
