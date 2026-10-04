"use client";
import { useLanguage } from "./cinematic/Language";

import React, { useEffect, useMemo, useState } from "react";

type Category = { id: string; name: string; parentId?: string | null };

type CategoryNode = Category & { children: CategoryNode[] };

function buildCategoryTree(categories: Category[]) {
  const byParent = new Map<string | null, CategoryNode[]>();
  const byId = new Map<string, CategoryNode>();

  categories.forEach((c) => {
    const node: CategoryNode = { ...c, children: [] };
    byId.set(c.id, node);
  });

  byId.forEach((node) => {
    const pid = node.parentId ?? null;
    const list = byParent.get(pid) ?? [];
    list.push(node);
    byParent.set(pid, list);
  });

  byId.forEach((node) => {
    const pid = node.parentId ?? null;
    if (!pid) return;
    const parent = byId.get(pid);
    if (parent) parent.children.push(node);
  });

  const roots = byParent.get(null) ?? [];
  // Keep stable order based on original list
  const order = new Map(categories.map((c, i) => [c.id, i]));
  const sortNodes = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);

  return { roots, byId };
}

function getAncestors(selectedId: string, byId: Map<string, CategoryNode>) {
  const out: string[] = [];
  let cur = byId.get(selectedId);
  while (cur?.parentId) {
    out.push(cur.parentId);
    cur = byId.get(cur.parentId);
  }
  return out;
}

export function CategorySidebar({
  categories,
  selectedId,
  onSelect,
}: {
  categories: Category[];
  selectedId?: string;
  onSelect: (id?: string) => void;
}) {
  const ar = useLanguage().language === "ar";
  const { roots, byId } = useMemo(() => buildCategoryTree(categories), [categories]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!selectedId) return;
    const parents = getAncestors(selectedId, byId);
    setExpanded((prev) => {
      const next = new Set(prev);
      parents.forEach((id) => next.add(id));
      return next;
    });
  }, [selectedId, byId]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderNode = (node: CategoryNode, depth: number) => {
    const hasChildren = node.children.length > 0;
    const isOpen = expanded.has(node.id);
    const isActive = node.id === selectedId;
    const depthClass = depth === 0 ? "cat-depth-0" : depth === 1 ? "cat-depth-1" : "cat-depth-2";
    return (
      <div key={node.id} className="space-y-1">
        <div className={`category-node ${depthClass} ${isActive ? "category-node-active" : ""}`}>
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggle(node.id)}
              className="h-6 w-6 rounded-md border border-white/10 bg-white/5 text-[var(--text)] flex items-center justify-center"
              aria-label={isOpen ? "Collapse" : "Expand"}
            >
              <svg
                className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          ) : (
            <span className="h-6 w-6" />
          )}
          <button
            type="button"
            onClick={() => onSelect(node.id)}
            className="flex-1 text-right text-sm font-semibold"
            style={{ paddingRight: `${depth * 8}px` }}
          >
            {node.name}
          </button>
        </div>
        {hasChildren && isOpen ? (
          <div className="category-children mr-2 pr-2 space-y-1">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">{ar ? "التصنيفات" : "Categories"}</h3>
        {selectedId ? (
          <button
            type="button"
            className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
            onClick={() => onSelect(undefined)}
          >
            {ar ? "الكل" : "All"}
          </button>
        ) : null}
      </div>
      <div className="space-y-1">
        {roots.map((node) => renderNode(node, 0))}
      </div>
    </div>
  );
}
