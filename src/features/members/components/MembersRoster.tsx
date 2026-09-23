"use client";

import { useMemo, useState } from "react";
import { FilterCategory, TeamMember } from "../types";
import FilterBar from "./FilterBar";
import IDCard from "@/components/IDCard";
import SpotlightModal from "./SpotlightModal";

interface MembersRosterProps {
  initialMembers: TeamMember[];
}

export default function MembersRoster({ initialMembers }: MembersRosterProps) {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const filterCounts = useMemo(() => {
    const counts: Record<FilterCategory, number> = {
      all: initialMembers.length,
      leadership: 0,
      engineering: 0,
      "design-events": 0,
    };

    initialMembers.forEach((m) => {
      const cat = (m.category || "engineering") as FilterCategory;
      if (counts[cat] !== undefined) {
        counts[cat]++;
      }
    });

    return counts;
  }, [initialMembers]);

  const filteredMembers = useMemo(() => {
    if (activeFilter === "all") return initialMembers;
    return initialMembers.filter(
      (m) => (m.category || "engineering") === activeFilter
    );
  }, [initialMembers, activeFilter]);

  return (
    <div className="relative min-h-screen">
      {/* Header */}
      <header className="site-header max-w-4xl mx-auto px-6 pt-16 pb-8">
        <div className="flex items-center justify-between font-mono text-xs uppercase tracking-widest text-[var(--slate)] mb-4">
          <span>JLUG // ROSTER</span>
          <span className="site-header__badge bg-[var(--navy)] text-[var(--frost)] border border-[var(--steel)] px-3 py-1 rounded-full font-semibold">
            {initialMembers.length} ACTIVE MEMBERS
          </span>
        </div>

        <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-[var(--frost)]">
          The people building it
        </h1>

        <p className="mt-4 max-w-xl font-sans text-base text-[var(--mist)] leading-relaxed">
          A community of engineers, designers, and maintainers driving open-source culture at Jabalpur Engineering College. Tap or hover a card to explore.
        </p>
      </header>

      {/* Main Roster Section */}
      <main className="max-w-6xl mx-auto px-6 pb-24">
        {/* Domain Filter Bar */}
        <FilterBar
          activeFilter={activeFilter}
          counts={filterCounts}
          onFilterChange={setActiveFilter}
        />

        {/* Member Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMembers.map((member) => (
            <IDCard
              key={member.id}
              member={member}
              onClick={() => {
                if (selectedMember?.id === member.id) {
                  setSelectedMember(null);
                } else {
                  setSelectedMember(member);
                }
              }}
            />
          ))}
        </div>
      </main>

      {/* Spotlight Overlay Modal */}
      <SpotlightModal
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
      />
    </div>
  );
}
