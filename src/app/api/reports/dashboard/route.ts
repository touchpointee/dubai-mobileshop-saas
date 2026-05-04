import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";
import { requireShopSession } from "@/lib/api-auth";
import { Sale } from "@/models/Sale";
import { Dealer } from "@/models/Dealer";
import { Product } from "@/models/Product";

export async function GET() {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  await connectDB();
  const shopObjectId = new mongoose.Types.ObjectId(String(shopId));

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayVat, monthVat, dealerBalances, lowStock] = await Promise.all([
    Sale.aggregate([
      { $match: { shopId: shopObjectId, channel: "VAT", saleDate: { $gte: startOfToday }, status: "COMPLETED" } },
      { $group: { _id: null, total: { $sum: "$grandTotal" }, vat: { $sum: "$vatAmount" } } },
    ]),
    Sale.aggregate([
      { $match: { shopId: shopObjectId, channel: "VAT", saleDate: { $gte: startOfMonth }, status: "COMPLETED" } },
      { $group: { _id: null, total: { $sum: "$grandTotal" }, vat: { $sum: "$vatAmount" } } },
    ]),
    Dealer.aggregate([
      { $match: { shopId: shopObjectId, isActive: true, balance: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$balance" } } },
    ]),
    Product.countDocuments({ shopId, isActive: true, quantity: { $lte: 2, $gte: 0 } }),
  ]);

  const todayVatTotal = todayVat[0]?.total ?? 0;
  const monthVatTotal = monthVat[0]?.total ?? 0;

  return Response.json({
    todaySales: {
      vat: todayVatTotal,
      nonVat: 0,
      total: todayVatTotal,
    },
    monthSales: {
      vat: monthVatTotal,
      nonVat: 0,
      total: monthVatTotal,
    },
    monthVatCollected: monthVat[0]?.vat ?? 0,
    outstandingDealerBalance: dealerBalances[0]?.total ?? 0,
    lowStockCount: lowStock,
  });
}
