"use client";

import { useMemo, useState } from "react";
import {
  JecScMember,
  JecScWing,
  JEC_SC_COUNCIL_CONFIG,
  JEC_SC_CATEGORIES,
} from "@/data/jecScMembers";
import JecScCard from "./JecScCard";
import JecScFilter from "./JecScFilter";
import JecScModal from "./JecScModal";

interface JecScRosterProps {
  initialMembers: JecScMember[];
}

export default function JecScRoster({ initialMembers }: JecScRosterProps) {
  const [activeCategory, setActiveCategory] = useState<JecScWing>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<JecScMember | null>(null);

  // Compute counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: initialMembers.length,
    };

    JEC_SC_CATEGORIES.forEach((cat) => {
      if (cat !== "All") counts[cat] = 0;
    });

    initialMembers.forEach((m) => {
      if (counts[m.wing] !== undefined) {
        counts[m.wing]++;
      }
    });

    return counts;
  }, [initialMembers]);

  // Filter members by selected category & search query
  const filteredMembers = useMemo(() => {
    let result = initialMembers;

    if (activeCategory !== "All") {
      result = result.filter((m) => m.wing === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q) ||
          m.wing.toLowerCase().includes(q) ||
          m.branchYear.toLowerCase().includes(q) ||
          m.bio.toLowerCase().includes(q)
      );
    }

    return result;
  }, [initialMembers, activeCategory, searchQuery]);

  return (
    <div className="relative min-h-screen">
      {/* ── Page Header / Terminal Hero ── */}
      <header className="mx-auto max-w-6xl px-6 pt-14 pb-8 md:pt-20">
        {/* Top metadata strip */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-jlug-line pb-3 font-mono text-[0.7rem] uppercase tracking-widest text-jlug-gray-1">
          <div className="flex items-center gap-2">
            <span className="text-jlug-accent font-bold">JLUG // CO-OP</span>
            <span className="text-jlug-gray-3">/</span>
            <span>{JEC_SC_COUNCIL_CONFIG.institution}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="border border-jlug-line bg-jlug-surface px-2.5 py-0.5 text-jlug-white">
              TENURE {JEC_SC_COUNCIL_CONFIG.tenure}
            </span>
            <span className="border border-jlug-line bg-jlug-black px-2.5 py-0.5 text-jlug-accent font-semibold">
              {initialMembers.length} REPRESENTATIVES
            </span>
          </div>
        </div>

        {/* Headline */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-jlug-white sm:text-6xl lg:text-7xl uppercase">
              {JEC_SC_COUNCIL_CONFIG.title}
            </h1>
            <p className="mt-3 font-mono text-sm tracking-wider text-jlug-accent uppercase">
              // {JEC_SC_COUNCIL_CONFIG.tagline}
            </p>
          </div>

          {/* Quick stats panel */}
          <div className="flex gap-4 border border-jlug-line bg-jlug-surface p-3 font-mono text-xs text-jlug-gray-1">
            <div className="border-r border-jlug-line pr-4">
              <div className="text-[0.65rem] text-jlug-gray-3 uppercase">WINGS</div>
              <div className="text-sm font-bold text-jlug-white">
                {JEC_SC_COUNCIL_CONFIG.stats.activeWings}
              </div>
            </div>
            <div className="border-r border-jlug-line pr-4">
              <div className="text-[0.65rem] text-jlug-gray-3 uppercase">COLLEGE</div>
              <div className="text-sm font-bold text-jlug-white">
                {JEC_SC_COUNCIL_CONFIG.stats.established}
              </div>
            </div>
            <div>
              <div className="text-[0.65rem] text-jlug-gray-3 uppercase">STATUS</div>
              <div className="text-sm font-bold text-jlug-accent">ACTIVE</div>
            </div>
          </div>
        </div>

        {/* Council brief narrative */}
        <p className="mt-6 max-w-3xl font-mono text-xs leading-relaxed text-jlug-gray-2 sm:text-sm">
          {JEC_SC_COUNCIL_CONFIG.description} Click any card to inspect their
          full dossier, portfolio wings, and contact channels.
        </p>
      </header>

      {/* ── Main Content Area ── */}
      <main className="mx-auto max-w-6xl px-6 pb-24">
        {/* Filter and Search Bar */}
        <JecScFilter
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categoryCounts={categoryCounts}
        />

        {/* Member Cards Grid */}
        {filteredMembers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMembers.map((member) => (
              <JecScCard
                key={member.id}
                member={member}
                onSelect={(m) => setSelectedMember(m)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center border border-dashed border-jlug-line bg-jlug-surface p-16 text-center font-mono">
            <div className="text-3xl text-jlug-gray-3 mb-2">[!]</div>
            <h3 className="text-base font-bold uppercase text-jlug-white">
              NO COUNCIL MEMBERS FOUND
            </h3>
            <p className="mt-2 text-xs text-jlug-gray-2 max-w-md">
              No representative matched your current query &ldquo;{searchQuery}&rdquo; in{" "}
              {activeCategory}.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveCategory("All");
                setSearchQuery("");
              }}
              className="mt-6 border border-jlug-accent bg-jlug-accent px-4 py-2 font-mono text-xs font-bold text-jlug-black uppercase hover:bg-jlug-white transition-colors cursor-pointer"
            >
              RESET FILTERS
            </button>
          </div>
        )}

        {/* Easy Updates Guide Callout */}
        <div className="mt-16 border border-jlug-line bg-jlug-black p-5 font-mono text-xs text-jlug-gray-2">
          <div className="flex items-center justify-between border-b border-jlug-line pb-2 mb-3">
            <span className="text-jlug-white font-bold uppercase tracking-wider">
              VARIABLE FILE CONFIGURATION // EASY UPDATES
            </span>
            <span className="text-jlug-accent">SRC/DATA/JECSCMEMBERS.TS</span>
          </div>
          <p className="leading-relaxed">
            All names, roles, wings, branch details, and photo URLs for this page
            are centralized in{" "}
            <code className="text-jlug-white bg-jlug-surface-raised px-1 py-0.5">
              src/data/jecScMembers.ts
            </code>
            . You can add, edit, or remove council members simply by updating
            that single file.
          </p>
        </div>
      </main>

      {/* ── Spotlight Profile Modal ── */}
      <JecScModal
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
      />
    </div>
  );
}
