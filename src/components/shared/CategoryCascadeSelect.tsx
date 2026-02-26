"use client";

import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";

export type ProductCategory = {
  _id: string;
  name: string;
  parentId?: string | null;
};

function getPathFromRoot(
  categoryId: string,
  categories: ProductCategory[]
): string[] {
  const byId = new Map<string, ProductCategory>();
  for (const c of categories) byId.set(String(c._id), c);
  const path: string[] = [];
  let currentId: string | null = categoryId;
  const seen = new Set<string>();
  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    const node = byId.get(currentId);
    if (!node) break;
    path.unshift(currentId);
    currentId = node.parentId ? String(node.parentId) : null;
  }
  return path;
}

function getChildren(parentId: string | null, categories: ProductCategory[]) {
  return categories.filter(
    (c) => String(c.parentId ?? "") === String(parentId ?? "")
  );
}

type CategoryCascadeSelectProps = {
  categories: ProductCategory[];
  value: string;
  onChange: (categoryId: string) => void;
  placeholder?: string;
  noneLabel?: string;
  firstLevelLabel?: string;
  nextLevelLabel?: string;
  addButtonLabel?: string;
  onAddCategory?: () => void;
  className?: string;
};

export function CategoryCascadeSelect({
  categories,
  value,
  onChange,
  placeholder = "Select…",
  noneLabel = "None",
  firstLevelLabel,
  nextLevelLabel,
  addButtonLabel,
  onAddCategory,
  className,
}: CategoryCascadeSelectProps) {
  const list = categories ?? [];
  const topLevel = getChildren(null, list);
  const pathIds = value ? getPathFromRoot(value, list) : [];

  const optionsAt = (parentId: string | null) => {
    const children = getChildren(parentId, list);
    return [
      { value: "", label: noneLabel },
      ...children.map((c) => ({ value: c._id, label: c.name })),
    ];
  };

  const level0Options = [
    { value: "", label: noneLabel },
    ...topLevel.map((c) => ({ value: c._id, label: c.name })),
  ];

  const lastId = pathIds[pathIds.length - 1] ?? null;
  const childrenOfLast = lastId ? getChildren(lastId, list) : [];
  const showNextLevel = childrenOfLast.length > 0;

  return (
    <div className={className}>
      {/* Level 0: top-level categories */}
      {firstLevelLabel ? (
        <Label className="text-slate-600 mb-1.5 block">{firstLevelLabel}</Label>
      ) : null}
      <div className="mt-1.5">
        <SearchableSelect
          options={level0Options}
          value={pathIds[0] ?? ""}
          onChange={(v) => onChange(v)}
          placeholder={placeholder}
          addButtonLabel={addButtonLabel}
          onAdd={onAddCategory}
        />
      </div>
      {/* Level 1, 2, …: one dropdown per path segment after the first */}
      {pathIds.length >= 2 &&
        pathIds.slice(1).map((currentValue, index) => {
          const parentId = pathIds[index];
          const options = optionsAt(parentId);
          return (
            <div key={`${parentId}-${currentValue}`} className="mt-2">
              {nextLevelLabel ? (
                <Label className="text-slate-600 mb-1.5 block">
                  {nextLevelLabel}
                </Label>
              ) : null}
              <div className="mt-1.5">
                <SearchableSelect
                  options={options}
                  value={currentValue}
                  onChange={(v) => {
                    if (v) {
                      const newPath = pathIds.slice(0, index + 1);
                      newPath.push(v);
                      onChange(newPath[newPath.length - 1]);
                    } else {
                      onChange(pathIds[index] ?? "");
                    }
                  }}
                  placeholder={placeholder}
                />
              </div>
            </div>
          );
        })}
      {/* When path has only one segment we still need to show it in level 0; no extra dropdown. When path has 2+ segments we showed them above. Now optional "next level" if current selection has children. */}
      {/* Optional next level when current selection has children */}
      {showNextLevel && (
        <div className="mt-2">
          {nextLevelLabel ? (
            <Label className="text-slate-600 mb-1.5 block">
              {nextLevelLabel}
            </Label>
          ) : null}
          <div className="mt-1.5">
            <SearchableSelect
              options={optionsAt(lastId)}
              value=""
              onChange={(v) => v && onChange(v)}
              placeholder={placeholder}
            />
          </div>
        </div>
      )}
    </div>
  );
}
