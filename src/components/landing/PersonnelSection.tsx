import Link from "next/link";
import Image from "next/image";
import teamData from "../../../team.json";

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
            <Link
              key={member.id}
              href="/members"
              className="group relative bg-jlug-black border border-jlug-line p-1 hover:border-jlug-accent transition-colors"
            >
              <div className="border border-jlug-line p-4 h-full flex flex-col justify-between">
                <div>
                  <div className="flex justify-between font-mono text-[0.65rem] text-jlug-gray-1 border-b border-jlug-line pb-2 mb-4">
                    <span>ID: 026_0{member.id}</span>
                    <span className="text-jlug-accent">ACTIVE</span>
                  </div>
                  <div className="w-full aspect-[3/4] bg-jlug-surface mb-4 relative overflow-hidden">
                    <Image
                      src={member.image}
                      alt={member.name}
                      fill
                      unoptimized
                      className="object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-300"
                    />
                  </div>
                  <h3 className="text-xl font-bold uppercase mb-1 text-jlug-white group-hover:text-jlug-accent transition-colors">
                    {member.name}
                  </h3>
                  <p className="font-mono text-xs text-jlug-gray-1 uppercase tracking-wide">
                    {member.role}
                  </p>
                </div>

                <p className="font-mono text-[0.7rem] text-jlug-gray-2 mt-4 line-clamp-2">
                  {member.bio}
                </p>
              </div>
            </Link>
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
