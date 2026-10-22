"use client";

import { BRANCH_OPTIONS } from "../data/recruitmentOptions";

interface BranchSelectorProps {
  selectedBranch: string;
  error?: string;
  touched?: boolean;
  onSelect: (branchCode: string) => void;
}

export default function BranchSelector({
  selectedBranch,
  error,
  touched,
  onSelect,
}: BranchSelectorProps) {
  const hasError = Boolean(touched && error);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-jlug-white">
          <span className="text-jlug-accent">[02]</span>
          <span>BRANCH / DEPARTMENT</span>
          <span className="text-jlug-accent">*</span>
        </label>
        {selectedBranch && (
          <span className="font-mono text-[0.65rem] uppercase tracking-wider text-jlug-accent">
            SELECTED: {selectedBranch}
          </span>
        )}
      </div>

      <p className="font-mono text-[0.65rem] text-jlug-gray-2">
        Choose your engineering branch or department at JEC:
      </p>

      {/* Grid of branch option buttons */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {BRANCH_OPTIONS.map((item) => {
          const isSelected = selectedBranch === item.code;
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => onSelect(item.code)}
              className={`group flex flex-col items-start justify-between border p-3 text-left transition-all cursor-pointer ${
                isSelected
                  ? "border-jlug-accent bg-jlug-accent/10 shadow-[0_0_15px_rgba(183,243,74,0.15)]"
                  : "border-jlug-line bg-jlug-surface hover:border-jlug-gray-2 hover:bg-jlug-surface-raised"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span
                  className={`font-mono text-xs font-bold uppercase tracking-wider ${
                    isSelected ? "text-jlug-accent" : "text-jlug-white"
                  }`}
                >
                  {item.code}
                </span>
                <span
                  className={`h-2 w-2 rounded-full border transition-all ${
                    isSelected
                      ? "border-jlug-accent bg-jlug-accent"
                      : "border-jlug-line bg-transparent group-hover:border-jlug-gray-2"
                  }`}
                />
              </div>
              <span
                className={`mt-2 font-mono text-[0.65rem] leading-tight line-clamp-2 ${
                  isSelected ? "text-jlug-white" : "text-jlug-gray-1"
                }`}
              >
                {item.name}
              </span>
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
