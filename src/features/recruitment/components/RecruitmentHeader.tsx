"use client";

interface RecruitmentHeaderProps {
  completedCount: number;
  totalCount: number;
}

export default function RecruitmentHeader({
  completedCount,
  totalCount,
}: RecruitmentHeaderProps) {
  const percent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="border-b border-jlug-line bg-jlug-ink px-6 py-10 md:px-12 md:py-14">
      <div className="mx-auto max-w-4xl">
        {/* Terminal Status Tag */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 font-mono text-xs uppercase tracking-widest">
          <div className="flex items-center gap-2 text-jlug-accent">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-jlug-accent" />
            <span>PORTAL_ACTIVE // BATCH_INDUCTION</span>
          </div>
          <div className="flex items-center gap-2 text-jlug-gray-2">
            <span>[ SYSTEM: JLUG_SYS_2026 ]</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-extrabold uppercase tracking-tight text-jlug-white md:text-5xl lg:text-6xl">
          JOIN TEAM <span className="text-jlug-accent">JLUG</span>.
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-jlug-gray-1 md:text-base">
          Step into Jabalpur Linux User Group. We are a collective of developers, system architects,
          designers, and tinkerers building open-source tech. Fill out the application form below
          to register your candidacy.
        </p>

        {/* Progress bar */}
        <div className="mt-8 border border-jlug-line bg-jlug-black p-3">
          <div className="mb-2 flex items-center justify-between font-mono text-[0.7rem] uppercase tracking-wider">
            <span className="text-jlug-gray-1">
              FIELDS COMPLETED: <span className="text-jlug-accent font-bold">{completedCount}</span> / {totalCount}
            </span>
            <span className="text-jlug-gray-2">{percent}% READY</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden bg-jlug-surface">
            <div
              className="h-full bg-jlug-accent transition-all duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
