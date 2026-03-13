export type CostCodeMap = Record<string, string | undefined>;

function toDigits(value: number): string {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value);
  return Math.abs(rounded).toString();
}

export function encodeCostWithFalseCode(options: {
  costPrice: number;
  sellPrice: number;
  costCodeMap?: CostCodeMap | null;
  falseCode?: string | null;
}): string | null {
  const { costPrice, sellPrice, costCodeMap, falseCode } = options;
  if (!costCodeMap) return null;
  const falseChar = (falseCode ?? "").trim();
  if (!falseChar) return null;

  const costDigits = toDigits(costPrice);
  const sellDigits = toDigits(sellPrice);
  if (!costDigits || !sellDigits) return null;

  let encoded = "";
  for (const d of costDigits) {
    if (!/^[0-9]$/.test(d)) return null;
    const mapped = (costCodeMap[d] ?? "").trim();
    if (!mapped) return null;
    encoded += mapped[0];
  }

  const diff = sellDigits.length - costDigits.length;
  if (diff > 0) {
    encoded = falseChar[0].repeat(diff) + encoded;
  }

  return encoded || null;
}

