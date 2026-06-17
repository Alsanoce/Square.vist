export const CARTON_PRICE = 7;
export const MIN_DONATION_QUANTITY = 1;
export const DONATION_PACKAGE_QUANTITIES = [4, 5, 10, 20, 40];

export const DONATION_PACKAGES = DONATION_PACKAGE_QUANTITIES.map((quantity) => ({
  quantity,
  total: quantity * CARTON_PRICE,
}));

export function getDonationPackage(quantity) {
  const parsed = Number(quantity);
  const safeQuantity = Number.isFinite(parsed)
    ? Math.max(MIN_DONATION_QUANTITY, Math.floor(parsed))
    : DONATION_PACKAGES[0].quantity;

  return {
    quantity: safeQuantity,
    total: safeQuantity * CARTON_PRICE,
  };
}

export function createTransactionId() {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const time = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `SANIAH-${date}-${time}-${suffix}`;
}
