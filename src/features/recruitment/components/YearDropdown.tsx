"use client";

import { YEAR_OPTIONS } from "../data/recruitmentOptions";

interface YearDropdownProps {
  selectedYear: string;
  error?: string;
  touched?: boolean;
  onSelect: (yearVal: string) => void;
  onBlur: () => void;
}

export default function YearDropdown({
  selectedYear,
  error,
  touched,
  onSelect,
  onBlur,
}: YearDropdownProps) {
  const hasError = Boolean(touched && error);
  const isValid = Boolean(touched && !error && selectedYear);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="recruitment-year-select"
          className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-jlug-white"
        >
          <span className="text-jlug-accent">[03]</span>
          <span>CURRENT ACADEMIC YEAR</span>
          <span className="text-jlug-accent">*</span>
        </label>
        {isValid && (
          <span className="font-mono text-[0.65rem] uppercase tracking-wider text-jlug-accent">
            [VALID ✓]
          </span>
        )}
      </div>

      <div className="relative">
        <select
          id="recruitment-year-select"
          value={selectedYear}
          onChange={(e) => onSelect(e.target.value)}
          onBlur={onBlur}
          className={`w-full appearance-none border bg-jlug-surface px-4 py-3.5 pr-10 font-mono text-sm text-jlug-white transition-all cursor-pointer focus:outline-none ${
            hasError
              ? "border-red-500/80 bg-red-950/10 focus:border-red-500 focus:ring-1 focus:ring-red-500/40"
              : isValid
              ? "border-jlug-accent/40 focus:border-jlug-accent focus:ring-1 focus:ring-jlug-accent/30"
              : "border-jlug-line focus:border-jlug-accent focus:ring-1 focus:ring-jlug-accent/30"
          }`}
        >
          <option value="" disabled className="bg-jlug-black text-jlug-gray-2">
            -- SELECT YOUR ACADEMIC YEAR (DROP DOWN) --
          </option>
          {YEAR_OPTIONS.map((item) => (
            <option
              key={item.value}
              value={item.value}
              className="bg-jlug-surface py-2 text-jlug-white"
            >
              {item.label} — {item.batch}
            </option>
          ))}
        </select>

        {/* Custom Terminal Chevron indicator */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 font-mono text-xs text-jlug-accent">
          ▼
        </div>
      </div>

      {hasError && (
        <span className="font-mono text-[0.7rem] text-red-400">
          ! ERROR: {error}
        </span>
      )}
    </div>
  );
}
