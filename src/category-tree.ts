export interface CategoryBranch {
  name: string;
  slug: string;
  children?: readonly CategoryBranch[];
}
export interface CategoryChoice { value: string; label: string; depth: number }

/** Flatten a category tree into breadcrumb choices, excluding a complete subtree when editing its parent. */
export function categoryChoices(nodes: readonly CategoryBranch[], excludeSlug?: string): CategoryChoice[] {
  function visit(items: readonly CategoryBranch[], path: string[], seen: ReadonlySet<string>): CategoryChoice[] {
    return items.flatMap(item => {
      if (item.slug === excludeSlug) return [];
      if (seen.has(item.slug) || path.length > 20) throw new Error('Invalid category hierarchy.');
      const branch = [...path, item.name];
      return [{ value: item.slug, label: branch.join(' / '), depth: path.length },
        ...visit(item.children ?? [], branch, new Set([...seen, item.slug]))];
    });
  }
  return visit(nodes, [], new Set());
}

/** Group the public flat projection into a navigation tree; children of missing parents stay unlisted. */
export function categoryNavigation(rows: readonly { name: string; slug: string; parent?: string | null }[]): CategoryBranch[] {
  const nodes = new Map<string, CategoryBranch & { children: CategoryBranch[] }>();
  for (const row of rows) {
    if (nodes.has(row.slug)) throw new Error('Duplicate category slug.');
    nodes.set(row.slug, { name: row.name, slug: row.slug, children: [] });
  }
  const roots: CategoryBranch[] = [];
  for (const row of rows) {
    const node = nodes.get(row.slug);
    if (!node) throw new Error('Category navigation is incomplete.');
    if (row.parent) nodes.get(row.parent)?.children.push(node);
    else roots.push(node);
  }
  return roots;
}
