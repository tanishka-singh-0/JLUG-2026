import Link from "next/link";

export default function EventsSection() {
  return (
    <section className="relative py-32 border-b border-jlug-line overflow-hidden">
      <div className="px-6 md:px-24 mb-16 flex flex-col md:flex-row md:items-end justify-between">
        <div>
          <div className="font-mono text-xs text-jlug-accent mb-4 uppercase tracking-widest">
            05 // ARCHIVE
          </div>
          <h2 className="text-5xl md:text-8xl font-semibold tracking-tight">EVENT LOG</h2>
        </div>
        <Link
          href="/events"
          className="font-mono text-xs text-jlug-gray-1 uppercase mt-8 md:mt-0 border border-jlug-line px-4 py-2 hover:bg-jlug-white hover:text-jlug-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jlug-accent"
        >
          VIEW ALL EVENTS {"-->"}
        </Link>
      </div>

      <div className="px-6 md:px-24">
        <div className="border border-jlug-line bg-jlug-ink relative group">
          {/* Massive bleed typography */}
          <div className="absolute -top-12 -right-4 text-[15vw] font-bold text-jlug-surface-raised opacity-20 pointer-events-none z-0 overflow-hidden truncate w-full text-right">
            2026
          </div>
          
          <div className="relative z-10 p-6 md:p-12 flex flex-col lg:flex-row gap-12">
            <div className="flex-1">
              <div className="font-mono text-xs text-jlug-gray-1 border border-jlug-line px-2 py-1 inline-block mb-8">
                TAG: HACKATHON
              </div>
              <h3 className="text-6xl md:text-8xl font-bold tracking-tighter uppercase leading-[0.85] mb-6">
                CODE<br/>KUMBH
              </h3>
              <p className="text-xl text-jlug-gray-1 mb-8 max-w-md">
                24-hour hackathon bringing together builders from across the state.
              </p>
              <table className="font-mono text-sm w-full max-w-xs text-jlug-gray-2">
                <tbody>
                  <tr className="border-b border-jlug-line/50">
                    <td className="py-2">PARTICIPANTS</td>
                    <td className="text-right text-jlug-white">200+</td>
                  </tr>
                  <tr className="border-b border-jlug-line/50">
                    <td className="py-2">TEAMS</td>
                    <td className="text-right text-jlug-white">45+</td>
                  </tr>
                  <tr>
                    <td className="py-2">STATUS</td>
                    <td className="text-right text-jlug-accent">SUCCESS</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="w-full lg:w-1/2 bg-jlug-black border border-jlug-line p-2 aspect-video group-hover:border-jlug-gray-2 transition-colors">
              <div className="w-full h-full bg-jlug-surface flex items-center justify-center font-mono text-xs text-jlug-gray-2">
                [ IMG_CODEKUMBH.JPG ]
              </div>
            </div>
          </div>
        </div>

        <div className="border border-jlug-line bg-jlug-ink relative group mt-12">
          <div className="relative z-10 p-6 md:p-12 flex flex-col lg:flex-row gap-12">
            <div className="flex-1">
              <div className="font-mono text-xs text-jlug-gray-1 border border-jlug-line px-2 py-1 inline-block mb-8">
                TAG: WORKSHOP
              </div>
              <h3 className="text-6xl md:text-8xl font-bold tracking-tighter uppercase leading-[0.85] mb-6">
                LINUX<br/>WORKSHOP
              </h3>
              <p className="text-xl text-jlug-gray-1 mb-8 max-w-md">
                Master the Command Line. Learn shell scripting, file management, and system administration through hands-on sessions.
              </p>
              <table className="font-mono text-sm w-full max-w-xs text-jlug-gray-2">
                <tbody>
                  <tr className="border-b border-jlug-line/50">
                    <td className="py-2">LEVEL</td>
                    <td className="text-right text-jlug-white">ALL LEVELS</td>
                  </tr>
                  <tr>
                    <td className="py-2">STATUS</td>
                    <td className="text-right text-jlug-accent">RECURRING</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="w-full lg:w-1/2 bg-jlug-black border border-jlug-line p-2 aspect-video group-hover:border-jlug-gray-2 transition-colors">
              <div className="w-full h-full bg-jlug-surface flex items-center justify-center font-mono text-xs text-jlug-gray-2">
                [ IMG_LINUX_WORKSHOP.JPG ]
              </div>
            </div>
          </div>
        </div>

        <div className="border border-jlug-line bg-jlug-ink relative group mt-12">
          <div className="relative z-10 p-6 md:p-12 flex flex-col lg:flex-row gap-12">
            <div className="flex-1">
              <div className="font-mono text-xs text-jlug-gray-1 border border-jlug-line px-2 py-1 inline-block mb-8">
                TAG: NEWSLETTER
              </div>
              <h3 className="text-6xl md:text-8xl font-bold tracking-tighter uppercase leading-[0.85] mb-6">
                THE JECX<br/>TIMES
              </h3>
              <p className="text-xl text-jlug-gray-1 mb-8 max-w-md">
                JEC&apos;s very own virtual newsletter. Launched on 31st July 2023. Aimed at updating all with upcoming events and nourishing the history of JEC.
              </p>
              <table className="font-mono text-sm w-full max-w-xs text-jlug-gray-2">
                <tbody>
                  <tr className="border-b border-jlug-line/50">
                    <td className="py-2">LAUNCHED</td>
                    <td className="text-right text-jlug-white">JULY 2023</td>
                  </tr>
                  <tr>
                    <td className="py-2">STATUS</td>
                    <td className="text-right text-jlug-accent">ACTIVE</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="w-full lg:w-1/2 bg-jlug-black border border-jlug-line p-2 aspect-video group-hover:border-jlug-gray-2 transition-colors">
              <div className="w-full h-full bg-jlug-surface flex items-center justify-center font-mono text-xs text-jlug-gray-2">
                [ IMG_JECX_TIMES.JPG ]
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
