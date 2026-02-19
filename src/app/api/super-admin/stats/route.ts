import connectDB from "@/lib/mongodb";
import { requireSuperAdmin } from "@/lib/api-auth";
import { Shop } from "@/models/Shop";
import { User } from "@/models/User";

export async function GET() {
  const { error } = await requireSuperAdmin();
  if (error) return error;
  await connectDB();
  const [shopsCount, usersCount] = await Promise.all([
    Shop.countDocuments({ isActive: true }),
    User.countDocuments({ isActive: true }),
  ]);
  return Response.json({ shopsCount, usersCount });
}
