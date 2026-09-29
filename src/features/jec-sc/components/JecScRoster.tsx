"use client";

import {
  StudentCommitteeMember,
  JEC_STUDENT_COMMITTEE_CONFIG,
} from "@/data/jecStudentCommittee";
import JecScCard from "./JecScCard";

interface JecScRosterProps {
  initialMembers: StudentCommitteeMember[];
}

export default function JecScRoster({ initialMembers }: JecScRosterProps) {
  return (
    <div className="relative min-h-screen">
      {/* ── Page Header ── */}
      <header className="mx-auto max-w-6xl px-6 pt-14 pb-8 md:pt-20">
        {/* Top metadata strip */}
        <div className="mb-4 flex items-center justify-between border-b border-jlug-line pb-3 font-mono text-[0.7rem] uppercase tracking-widest text-jlug-gray-1 animate-float-in-1">
          <div className="flex items-center gap-2">
            <span className="text-jlug-accent font-bold">JLUG // CO-OP</span>
            <span className="text-jlug-gray-3">/</span>
            <span>{JEC_STUDENT_COMMITTEE_CONFIG.institution}</span>
          </div>
          <div>
            <span className="border border-jlug-line bg-jlug-black px-2.5 py-0.5 text-jlug-accent font-semibold">
              {initialMembers.length} REPRESENTATIVES
            </span>
          </div>
        </div>

        {/* Title */}
        <h1 className="font-display text-4xl font-bold tracking-tight text-jlug-white sm:text-6xl lg:text-7xl uppercase animate-float-in-2">
          {JEC_STUDENT_COMMITTEE_CONFIG.title}
        </h1>
      </header>

      {/* ── Main Content: Member Cards Grid ── */}
      <main className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {initialMembers.map((member) => (
            <JecScCard
              key={member.id}
              member={member}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
