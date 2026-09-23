import Link from "next/link";
import teamData from "../../../team.json";
import IDCard from "@/components/IDCard";

export default function PersonnelSection() {
  return (
    <section className="relative py-32 border-b border-jlug-line bg-jlug-ink">
      <div className="px-6 md:px-24 mb-16">
        <div className="font-mono text-xs text-jlug-accent mb-4 uppercase tracking-widest">
          04 // PERSONNEL
        </div>
        <h2 className="text-5xl md:text-8xl font-semibold tracking-tight">THE BUILDERS</h2>
      </div>

      <div className="relative w-full px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {teamData.slice(0, 3).map((member) => (
            <IDCard key={member.id} member={member} href="/members" />
          ))}
        </div>

        {/* Jump to the full member directory */}
        <div className="text-center">
          <Link
            href="/members"
            className="inline-block font-mono text-xs border border-jlug-line bg-jlug-black px-6 py-3 hover:bg-jlug-white hover:text-jlug-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jlug-accent"
          >
            LOAD_ALL_MEMBERS_ROSTER.SH {"-->"}
          </Link>
        </div>
      </div>
    </section>
  );
}
