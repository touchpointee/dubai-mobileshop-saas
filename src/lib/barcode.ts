/**
 * Generates a random 8-digit numeric string (10000000–99999999).
 */
export function generateRandom8Digit(): string {
  return String(10000000 + Math.floor(Math.random() * 90000000));
}

/**
 * Generates a unique 8-digit barcode for a shop.
 * @param existsCheck - async function that returns true if the barcode already exists for the shop
 * @returns unique 8-digit barcode string
 */
export async function generateUniqueBarcodeForShop(
  existsCheck: (barcode: string) => Promise<boolean>
): Promise<string> {
  const maxRandomAttempts = 10;
  for (let i = 0; i < maxRandomAttempts; i++) {
    const barcode = generateRandom8Digit();
    const exists = await existsCheck(barcode);
    if (!exists) return barcode;
  }
  // Fallback: timestamp-based 8-digit, then increment if collision
  let fallback = 10000000 + (Date.now() % 90000000);
  for (let j = 0; j < 100; j++) {
    const barcode = String(fallback);
    const exists = await existsCheck(barcode);
    if (!exists) return barcode;
    fallback = fallback >= 99999999 ? 10000000 : fallback + 1;
  }
  throw new Error("Could not generate unique barcode");
}
