"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { JecScMember } from "@/data/jecScMembers";

interface JecScModalProps {
  member: JecScMember | null;
  onClose: () => void;
}

export default function JecScModal({ member, onClose }: JecScModalProps) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [member]);

  // Keyboard navigation: Escape key closes modal
  useEffect(() => {
    if (!member) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [member, onClose]);

  if (!member) return null;

  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-member-name"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-jlug-black/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl border border-jlug-line bg-jlug-surface p-1 shadow-2xl animate-scaleUp"
      >
        <div className="border border-jlug-line/80 p-5 sm:p-7">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-jlug-line pb-3 mb-6 font-mono text-xs uppercase tracking-widest text-jlug-gray-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-jlug-accent animate-ping" />
              <span>JEC SC // DOSSIER: {member.id.toUpperCase()}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="border border-jlug-line px-2.5 py-1 text-jlug-gray-2 hover:border-jlug-accent hover:text-jlug-accent transition-colors font-mono cursor-pointer"
            >
              [ESC] ×
            </button>
          </div>

          {/* Body Content */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
            {/* Photo Column */}
            <div className="md:col-span-2">
              <div className="relative aspect-[3/4] w-full overflow-hidden border border-jlug-line bg-jlug-black">
                {!imageError && member.photo ? (
                  <Image
                    src={member.photo}
                    alt={member.name}
                    fill
                    unoptimized
                    onError={() => setImageError(true)}
                    className="object-cover object-top"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-jlug-surface-raised to-jlug-black font-mono">
                    <span className="font-display text-5xl font-bold text-jlug-accent">
                      {initials}
                    </span>
                    <span className="mt-3 text-xs tracking-widest text-jlug-gray-2 uppercase">
                      JEC STUDENT COUNCIL
                    </span>
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div className="mt-3 border border-jlug-line bg-jlug-black p-2 text-center font-mono text-[0.7rem] text-jlug-accent uppercase tracking-wider">
                ● STATUS: {member.badge || "COUNCIL ACTIVE"}
              </div>
            </div>

            {/* Info Column */}
            <div className="md:col-span-3 flex flex-col justify-between h-full">
              <div>
                <div className="font-mono text-xs uppercase tracking-widest text-jlug-accent mb-1">
                  {member.wing}
                </div>

                <h2
                  id="modal-member-name"
                  className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-jlug-white"
                >
                  {member.name}
                </h2>

                <div className="font-mono text-sm font-semibold text-jlug-white-soft mt-1 uppercase tracking-wide">
                  {member.role}
                </div>

                <div className="font-mono text-xs text-jlug-gray-1 border-b border-jlug-line pb-3 mt-2">
                  {member.branchYear}
                </div>

                {/* Bio & statement */}
                <div className="mt-4">
                  <h4 className="font-mono text-[0.68rem] text-jlug-gray-3 uppercase tracking-widest mb-1.5">
                    PROFILE & STATEMENT //
                  </h4>
                  <p className="font-mono text-xs leading-relaxed text-jlug-gray-1 bg-jlug-black border border-jlug-line/70 p-3.5">
                    &ldquo;{member.bio}&rdquo;
                  </p>
                </div>
              </div>

              {/* Contact & Socials Footer */}
              <div className="mt-6 border-t border-jlug-line pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {member.email ? (
                    <a
                      href={`mailto:${member.email}`}
                      className="inline-flex items-center gap-2 border border-jlug-line bg-jlug-black px-3 py-1.5 font-mono text-xs text-jlug-white hover:border-jlug-accent hover:text-jlug-accent transition-colors"
                    >
                      <span>✉</span>
                      <span>EMAIL</span>
                    </a>
                  ) : null}

                  <div className="flex items-center gap-2">
                    {member.socials?.linkedin && (
                      <a
                        href={member.socials.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="border border-jlug-line bg-jlug-black px-3 py-1.5 font-mono text-xs text-jlug-gray-1 hover:border-jlug-accent hover:text-jlug-accent transition-colors"
                      >
                        LINKEDIN ↗
                      </a>
                    )}
                    {member.socials?.github && (
                      <a
                        href={member.socials.github}
                        target="_blank"
                        rel="noreferrer"
                        className="border border-jlug-line bg-jlug-black px-3 py-1.5 font-mono text-xs text-jlug-gray-1 hover:border-jlug-accent hover:text-jlug-accent transition-colors"
                      >
                        GITHUB ↗
                      </a>
                    )}
                    {member.socials?.instagram && (
                      <a
                        href={member.socials.instagram}
                        target="_blank"
                        rel="noreferrer"
                        className="border border-jlug-line bg-jlug-black px-3 py-1.5 font-mono text-xs text-jlug-gray-1 hover:border-jlug-accent hover:text-jlug-accent transition-colors"
                      >
                        INSTAGRAM ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
