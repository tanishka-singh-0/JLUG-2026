"use client";

import { DOMAIN_OPTIONS } from "../data/recruitmentOptions";

interface DomainMultiSelectProps {
  selectedDomains: string[];
  error?: string;
  touched?: boolean;
  onToggleDomain: (domainId: string) => void;
}

export default function DomainMultiSelect({
  selectedDomains,
  error,
  touched,
  onToggleDomain,
}: DomainMultiSelectProps) {
  const hasError = Boolean(touched && error);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-jlug-white">
          <span className="text-jlug-accent">[06]</span>
          <span>DOMAINS OF INTEREST (SELECT MULTIPLE)</span>
          <span className="text-jlug-accent">*</span>
        </label>
        <span
          className={`font-mono text-[0.65rem] uppercase tracking-wider ${
            selectedDomains.length > 0 ? "text-jlug-accent" : "text-jlug-gray-2"
          }`}
        >
          {selectedDomains.length} SELECTED
        </span>
      </div>

      <p className="font-mono text-[0.65rem] text-jlug-gray-2">
        Select one or more technical or creative domains you want to contribute to:
      </p>

      {/* Grid of multi-selectable domain cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DOMAIN_OPTIONS.map((domain) => {
          const isSelected = selectedDomains.includes(domain.id);
          return (
            <button
              key={domain.id}
              type="button"
              onClick={() => onToggleDomain(domain.id)}
              className={`group flex flex-col justify-between border p-4 text-left transition-all cursor-pointer ${
                isSelected
                  ? "border-jlug-accent bg-jlug-accent/10 shadow-[0_0_15px_rgba(183,243,74,0.12)]"
                  : "border-jlug-line bg-jlug-surface hover:border-jlug-gray-2 hover:bg-jlug-surface-raised"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="border border-jlug-line bg-jlug-black px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-widest text-jlug-gray-2 group-hover:text-jlug-white">
                    {domain.iconTag}
                  </span>
                  <div
                    className={`flex h-4 w-4 items-center justify-center border transition-all ${
                      isSelected
                        ? "border-jlug-accent bg-jlug-accent text-jlug-black"
                        : "border-jlug-gray-3 bg-transparent group-hover:border-jlug-gray-1"
                    }`}
                  >
                    {isSelected && (
                      <svg
                        className="h-3 w-3 stroke-[3]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>

                <h3
                  className={`mt-3 font-mono text-sm font-bold uppercase tracking-tight ${
                    isSelected ? "text-jlug-accent" : "text-jlug-white"
                  }`}
                >
                  {domain.title}
                </h3>

                <p className="mt-1 font-mono text-[0.65rem] leading-relaxed text-jlug-gray-1">
                  {domain.description}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-jlug-line/60 pt-2 font-mono text-[0.6rem] uppercase tracking-wider">
                <span className={isSelected ? "text-jlug-accent" : "text-jlug-gray-3"}>
                  {isSelected ? "STATE: ACTIVE" : "STATE: UNSELECTED"}
                </span>
                <span className="text-jlug-gray-3">TOGGLE [+]</span>
              </div>
            </button>
          );
        })}
      </div>

      {hasError && (
        <span className="font-mono text-[0.7rem] text-red-400">
          ! ERROR: {error}
        </span>
      )}
    </div>
  );
}
