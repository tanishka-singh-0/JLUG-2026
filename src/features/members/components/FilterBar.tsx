"use client";

import { FilterCategory } from "../types";

interface FilterBarProps {
  activeFilter: FilterCategory;
  counts: Record<FilterCategory, number>;
  onFilterChange: (category: FilterCategory) => void;
}

const FILTERS: { id: FilterCategory; label: string }[] = [
  { id: "all", label: "All Members" },
  { id: "leadership", label: "Leadership" },
  { id: "engineering", label: "Engineering" },
  { id: "design-events", label: "Design & Events" },
];

export default function FilterBar({
  activeFilter,
  counts,
  onFilterChange,
}: FilterBarProps) {
  return (
    <nav
      className="filter-bar flex flex-wrap gap-2 mb-8"
      aria-label="Filter team members by domain"
    >
      {FILTERS.map((f) => {
        const isActive = activeFilter === f.id;
        const count = counts[f.id] || 0;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onFilterChange(f.id)}
            aria-pressed={isActive}
            className={`filter-btn font-mono text-xs px-4 py-2 rounded-full border transition-all duration-200 cursor-pointer ${
              isActive
                ? "bg-[var(--frost)] text-[var(--void)] border-[var(--frost)] font-semibold"
                : "bg-[var(--navy)] text-[var(--mist)] border-[var(--steel)] hover:bg-[var(--steel)] hover:text-[var(--frost)]"
            }`}
          >
            {f.label} ({count})
          </button>
        );
      })}
    </nav>
  );
}
