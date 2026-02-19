import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { User } from "@/models/User";

export async function GET() {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  await connectDB();
  const list = await User.find({
    shopId,
    role: { $in: ["VAT_STAFF", "NON_VAT_STAFF"] },
    isActive: true,
  })
    .select("name email role")
    .lean();
  return Response.json(list);
}
