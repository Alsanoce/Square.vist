export const DONATION_PACKAGES = [
  { quantity: 1, total: 10 },
  { quantity: 3, total: 30 },
  { quantity: 5, total: 50 },
  { quantity: 10, total: 100 },
  { quantity: 20, total: 180 },
  { quantity: 40, total: 320 },
];

export function getDonationPackage(quantity) {
  return DONATION_PACKAGES.find((item) => item.quantity === Number(quantity)) || DONATION_PACKAGES[0];
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
