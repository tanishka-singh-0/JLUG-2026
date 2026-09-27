"use client";

import { TeamMember } from "../types";
import IDCard from "@/components/IDCard";

interface MembersRosterProps {
  initialMembers: TeamMember[];
}

export default function MembersRoster({ initialMembers }: MembersRosterProps) {
  return (
    <div className="relative min-h-screen">
      {/* Header */}
      <header className="site-header max-w-4xl mx-auto px-6 pt-16 pb-8">
        <div className="flex items-center justify-between font-mono text-xs uppercase tracking-widest text-jlug-gray-1 mb-4 animate-float-in-1">
          <span>JLUG // ROSTER</span>
          <span className="site-header__badge bg-jlug-black text-jlug-white border border-jlug-line px-3 py-1 rounded-full font-semibold">
            {initialMembers.length} ACTIVE MEMBERS
          </span>
        </div>

        <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-jlug-white animate-float-in-2">
          The people building it
        </h1>

        <p className="mt-4 max-w-xl font-sans text-base text-jlug-gray-2 leading-relaxed animate-float-in-3">
          A community of engineers, designers, and maintainers driving open-source culture at Jabalpur Engineering College.
        </p>
      </header>

      {/* Main Roster Section */}
      <main className="max-w-6xl mx-auto px-6 pb-24">
        {/* Member Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {initialMembers.map((member) => (
            <IDCard
              key={member.id}
              member={member}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
