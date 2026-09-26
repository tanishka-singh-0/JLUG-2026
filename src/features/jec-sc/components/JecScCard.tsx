"use client";

import { useState } from "react";
import Image from "next/image";
import { JecScMember } from "@/data/jecScMembers";

interface JecScCardProps {
  member: JecScMember;
  onSelect: (member: JecScMember) => void;
}

export default function JecScCard({ member, onSelect }: JecScCardProps) {
  const [imageError, setImageError] = useState(false);

  // Fallback initials if photo missing/broken
  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  return (
    <article
      onClick={() => onSelect(member)}
      className="group relative flex h-full flex-col justify-between border border-jlug-line bg-jlug-surface p-1 text-left transition-all duration-300 hover:border-jlug-accent cursor-pointer"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(member);
        }
      }}
      aria-label={`View profile of ${member.name}, ${member.role}`}
    >
      <div className="flex h-full flex-col justify-between border border-jlug-line/70 p-4 transition-colors group-hover:border-jlug-accent/40">
        <div>
          {/* Top metadata strip */}
          <div className="mb-3 flex items-center justify-between border-b border-jlug-line pb-2 font-mono text-[0.65rem] uppercase tracking-wider text-jlug-gray-1">
            <span className="text-jlug-gray-2">{member.id.toUpperCase()}</span>
            <span className="font-semibold text-jlug-accent">
              {member.badge || "ACTIVE"}
            </span>
          </div>

          {/* Photo frame */}
          <div className="relative mb-4 aspect-[4/5] w-full overflow-hidden border border-jlug-line/80 bg-jlug-black">
            {!imageError && member.photo ? (
              <Image
                src={member.photo}
                alt={member.name}
                fill
                unoptimized
                onError={() => setImageError(true)}
                className="object-cover object-top grayscale transition-all duration-500 ease-out group-hover:scale-105 group-hover:grayscale-0"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-jlug-surface-raised to-jlug-black font-mono text-jlug-gray-2">
                <span className="font-display text-4xl font-bold tracking-wider text-jlug-white/80 group-hover:text-jlug-accent transition-colors">
                  {initials}
                </span>
                <span className="mt-2 text-[0.65rem] tracking-widest text-jlug-gray-3 uppercase">
                  JEC SC // 26-27
                </span>
              </div>
            )}

            {/* Subtle corner reticle accents */}
            <div className="absolute top-1 left-1 h-1.5 w-1.5 border-t border-l border-jlug-accent/60 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-1 right-1 h-1.5 w-1.5 border-t border-r border-jlug-accent/60 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-1 left-1 h-1.5 w-1.5 border-b border-l border-jlug-accent/60 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-1 right-1 h-1.5 w-1.5 border-b border-r border-jlug-accent/60 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Member Name */}
          <h3 className="font-display text-lg font-bold uppercase tracking-tight text-jlug-white transition-colors duration-200 group-hover:text-jlug-accent sm:text-xl">
            {member.name}
          </h3>

          {/* Role & Wing */}
          <div className="mt-1 flex flex-col gap-0.5">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-jlug-white-soft">
              {member.role}
            </span>
            <span className="font-mono text-[0.7rem] uppercase tracking-widest text-jlug-gray-2">
              {member.wing}
            </span>
          </div>

          {/* Branch & Academic Year */}
          <div className="mt-2 font-mono text-[0.68rem] text-jlug-gray-1 border-t border-jlug-line/50 pt-2">
            {member.branchYear}
          </div>
        </div>

        {/* Bio preview & inspect CTA */}
        <div className="mt-4 pt-3 border-t border-jlug-line/60">
          <p className="line-clamp-2 font-mono text-[0.72rem] leading-relaxed text-jlug-gray-2">
            {member.bio}
          </p>

          <div className="mt-3 flex items-center justify-between font-mono text-[0.68rem] uppercase tracking-widest text-jlug-gray-3 group-hover:text-jlug-accent transition-colors">
            <span>INSPECT DOSSIER</span>
            <span className="transition-transform duration-200 group-hover:translate-x-1">
              [→]
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
