import { requireShopSession } from "@/lib/api-auth";

export async function PUT(
  _request: Request,
  _context: { params: Promise<{ id: string }> }
) {
  const { error } = await requireShopSession();
  if (error) return error;
  return Response.json({ error: "Branches are managed by the super admin" }, { status: 403 });
}
