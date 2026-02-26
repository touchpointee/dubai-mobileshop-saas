import mongoose from "mongoose";
import { ProductCategory } from "@/models/ProductCategory";

/**
 * Loads the category and walks parentId up to the root, collecting names.
 * Returns array from root to leaf, e.g. ["Screen Protectors", "iPhone", "clear", "glass", "normal"].
 * Returns [] if categoryId is invalid or category not found.
 */
export async function getCategoryPathNames(
  categoryId: string,
  shopId: string
): Promise<string[]> {
  if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
    return [];
  }
  const shopIdObj = new mongoose.Types.ObjectId(shopId);
  const idObj = new mongoose.Types.ObjectId(categoryId);
  const all = await ProductCategory.find({ shopId: shopIdObj, isActive: true })
    .select("_id name parentId")
    .lean();
  const byId = new Map<string, { name: string; parentId?: mongoose.Types.ObjectId | null }>();
  for (const c of all) {
    const row = c as unknown as { _id?: mongoose.Types.ObjectId; name?: string; parentId?: mongoose.Types.ObjectId | null };
    const id = row._id?.toString?.();
    if (id) {
      byId.set(id, {
        name: row.name ?? "",
        parentId: row.parentId,
      });
    }
  }
  const pathNames: string[] = [];
  let currentId: string | null = idObj.toString();
  const visited = new Set<string>();
  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const node = byId.get(currentId);
    if (!node) break;
    pathNames.unshift(node.name);
    if (!node.parentId) break;
    currentId = node.parentId.toString();
  }
  return pathNames;
}

/**
 * Returns the display string for a category path, e.g. "Screen Protectors > iPhone > clear".
 */
export async function getCategoryPathDisplayString(
  categoryId: string,
  shopId: string
): Promise<string> {
  const names = await getCategoryPathNames(categoryId, shopId);
  return names.join(" > ");
}
