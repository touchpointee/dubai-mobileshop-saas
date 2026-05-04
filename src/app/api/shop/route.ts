import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Shop } from "@/models/Shop";

const DEFAULT_SHORTCUTS = [
  { label: "POS", href: "/vat/pos", enabled: true, order: 1 },
  { label: "Products", href: "/vat/products", enabled: true, order: 2 },
  { label: "Purchases", href: "/vat/purchases", enabled: true, order: 3 },
  { label: "Stock Report", href: "/vat/reports/stock", enabled: true, order: 4 },
  { label: "VAT Report", href: "/vat/reports/vat", enabled: true, order: 5 },
];

type LeanShopSettings = {
  adminShortcuts?: unknown[];
  printSettings?: unknown;
};

function sanitizeShortcutHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const href = value.trim();
  if (!href.startsWith("/")) return null;
  if (href.startsWith("//")) return null;
  if (href.includes("\\") || href.includes("://")) return null;
  return href;
}

function sanitizeAdminShortcuts(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value
    .slice(0, 12)
    .map((row, index) => {
      const item = row as Record<string, unknown>;
      const label = typeof item.label === "string" ? item.label.trim().slice(0, 32) : "";
      const href = sanitizeShortcutHref(item.href);
      if (!label || !href) return null;
      return {
        label,
        href,
        enabled: item.enabled !== false,
        order: Number.isFinite(Number(item.order)) ? Number(item.order) : index + 1,
      };
    })
    .filter(Boolean);
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function sanitizePrintSettings(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  return {
    thermalPaperWidthMm: clampNumber(raw.thermalPaperWidthMm, 80, 48, 110),
    thermalMarginMm: clampNumber(raw.thermalMarginMm, 2, 0, 10),
    thermalFontSizePx: clampNumber(raw.thermalFontSizePx, 12, 9, 18),
    receiptFooter: typeof raw.receiptFooter === "string" ? raw.receiptFooter.trim().slice(0, 120) : "Thank you",
    showTrnOnReceipt: raw.showTrnOnReceipt !== false,
    defaultInvoiceLanguage: raw.defaultInvoiceLanguage === "ar" ? "ar" : "en",
    a4PaperSize: raw.a4PaperSize === "A5" ? "A5" : "A4",
  };
}

export async function GET() {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  await connectDB();
  const shop = await Shop.findById(shopId).select("name nameAr vatRate currency trnNumber costCodeMap costFalseCode adminShortcuts printSettings").lean() as (LeanShopSettings & Record<string, unknown>) | null;
  if (!shop) return Response.json({ error: "Shop not found" }, { status: 404 });
  return Response.json({
    ...shop,
    adminShortcuts: Array.isArray(shop.adminShortcuts) && shop.adminShortcuts.length > 0 ? shop.adminShortcuts : DEFAULT_SHORTCUTS,
    printSettings: shop.printSettings ?? {},
  });
}

export async function PUT(request: Request) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const { name, costCodeMap, costFalseCode, adminShortcuts, printSettings } = body ?? {};

  await connectDB();
  const shop = await Shop.findById(shopId);
  if (!shop) return Response.json({ error: "Shop not found" }, { status: 404 });

  if (typeof name === "string" && name.trim()) {
    shop.name = name.trim();
  }

  if (costCodeMap && typeof costCodeMap === "object") {
    const next: Record<string, string> = {};
    for (const digit of ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]) {
      const raw = typeof costCodeMap[digit] === "string" ? String(costCodeMap[digit]) : "";
      const trimmed = raw.trim();
      if (trimmed) next[digit] = trimmed[0];
    }
    shop.costCodeMap = Object.keys(next).length > 0 ? next : undefined;
  }

  if (typeof costFalseCode === "string") {
    const trimmed = costFalseCode.trim();
    shop.costFalseCode = trimmed ? trimmed[0] : undefined;
  }

  const nextShortcuts = sanitizeAdminShortcuts(adminShortcuts);
  if (nextShortcuts) {
    shop.adminShortcuts = nextShortcuts.length > 0 ? nextShortcuts : DEFAULT_SHORTCUTS;
  }

  const nextPrintSettings = sanitizePrintSettings(printSettings);
  if (nextPrintSettings) {
    shop.printSettings = nextPrintSettings;
  }

  await shop.save();
  return Response.json({
    _id: shop._id,
    name: shop.name,
    nameAr: shop.nameAr,
    vatRate: shop.vatRate,
    currency: shop.currency,
    trnNumber: shop.trnNumber,
    costCodeMap: shop.costCodeMap,
    costFalseCode: shop.costFalseCode,
    adminShortcuts: shop.adminShortcuts,
    printSettings: shop.printSettings,
  });
}
