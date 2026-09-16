import Image from "next/image";
import InteractiveWordmark from "@/components/InteractiveWordmark";

function Crosshairs() {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 hidden md:block">
      <div className="absolute top-8 left-8 w-4 h-4 border-t border-l border-jlug-gray-2" />
      <div className="absolute top-8 right-8 w-4 h-4 border-t border-r border-jlug-gray-2" />
      <div className="absolute bottom-8 left-8 w-4 h-4 border-b border-l border-jlug-gray-2" />
      <div className="absolute bottom-8 right-8 w-4 h-4 border-b border-r border-jlug-gray-2" />
      <div className="absolute top-0 bottom-0 left-12 w-px bg-jlug-line" />
      <div className="absolute top-0 bottom-0 right-12 w-px bg-jlug-line" />
    </div>
  );
}

function GridBackground() {
  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0 opacity-[0.15]" 
      style={{ 
        backgroundImage: `
          linear-gradient(to right, var(--color-jlug-line) 1px, transparent 1px),
          linear-gradient(to bottom, var(--color-jlug-line) 1px, transparent 1px)
        `, 
        backgroundSize: '48px 48px' 
      }} 
    />
  );
}

export default function Home() {
  return (
    <div className="relative flex flex-col min-h-screen text-jlug-white selection:bg-jlug-accent selection:text-jlug-black overflow-x-hidden">
      <GridBackground />
      <Crosshairs />

      {/* CONTINUOUS ENVIRONMENT WRAPPER */}
      <div className="relative z-10 w-full max-w-[1440px] mx-auto border-l border-r border-jlug-line bg-jlug-black/80 backdrop-blur-sm min-h-screen">
        
        {/* HERO — FALLING BLOCK CONSTRUCTION */}
        <section className="relative min-h-screen flex flex-col border-b border-jlug-line overflow-hidden">

          {/* Top metadata strip */}
          <div className="flex justify-between items-center px-6 md:px-12 py-4 border-b border-jlug-line/50 font-mono text-[0.6rem] md:text-[0.7rem] text-jlug-gray-2 uppercase tracking-widest z-20">
            <span>JLUG / 001</span>
            <span className="hidden md:inline">JEC / JABALPUR / INDIA</span>
            <span>EST. 2019</span>
          </div>

          {/* Canvas — the artwork IS the hero */}
          <div className="flex-1 relative">
            <InteractiveWordmark />
          </div>

          {/* Bottom metadata strip */}
          <div className="flex justify-between items-center px-6 md:px-12 py-4 border-t border-jlug-line/50 font-mono text-[0.6rem] md:text-[0.7rem] text-jlug-gray-2 uppercase tracking-widest z-20">
            <span>JEC LINUX USERS GROUP</span>
            <span className="text-jlug-gray-1">WHERE CULTURE MEETS CODE</span>
          </div>
        </section>

        {/* ABOUT / MANIFESTO */}
        <section className="relative py-32 border-b border-jlug-line overflow-hidden">
          {/* Large structural typography overlapping the grid */}
          <div className="absolute -left-10 top-20 text-[20vw] font-bold text-jlug-surface-raised leading-none select-none pointer-events-none opacity-50 z-0">
            LEARN.
          </div>
          <div className="absolute -right-10 top-60 text-[20vw] font-bold text-jlug-surface-raised leading-none select-none pointer-events-none opacity-50 z-0 text-right">
            BUILD.
          </div>
          
          <div className="relative z-10 px-6 md:px-24">
            <div className="max-w-2xl bg-jlug-ink/90 border border-jlug-line p-8 md:p-12 backdrop-blur-md">
              <div className="font-mono text-xs text-jlug-accent mb-8 uppercase tracking-widest border-b border-jlug-line pb-4 inline-block">
                01 // THE MANIFESTO
              </div>
              <p className="text-2xl md:text-4xl font-medium leading-[1.4] tracking-[-0.02em]">
                We learn things, build things, break things, and teach each other what we figured out.
              </p>
              <div className="mt-12 pt-6 border-t border-jlug-line flex justify-between font-mono text-xs text-jlug-gray-1">
                <span>FILE: MANIFESTO.TXT</span>
                <span>CHMOD 777</span>
              </div>
            </div>
          </div>
        </section>

        {/* WHAT WE DO / THE DIRECTORY */}
        <section className="relative border-b border-jlug-line">
          <div className="sticky top-0 bg-jlug-black border-b border-jlug-line z-20 px-6 py-3 flex justify-between font-mono text-xs text-jlug-gray-1 uppercase tracking-widest">
            <span>02 // DIRECTORY</span>
            <span>LS -LA /DOMAINS</span>
          </div>

          <div className="flex flex-col">
            {[
              "OPEN SOURCE",
              "DEVELOPMENT",
              "ROBOTICS",
              "DESIGN",
              "AI / ML",
              "EVENTS",
              "COMMUNITY"
            ].map((item, i) => (
              <div key={item} className="group relative border-b border-jlug-line flex flex-col md:flex-row md:items-center px-6 md:px-12 py-8 md:py-12 hover:bg-jlug-white hover:text-jlug-black transition-colors cursor-crosshair">
                <div className="font-mono text-sm text-jlug-gray-2 group-hover:text-jlug-black mb-4 md:mb-0 md:w-32">
                  DIR_{String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="text-4xl md:text-6xl font-bold tracking-tight uppercase flex-1">
                  {item}
                </h3>
                {/* Hover reveal ASCII */}
                <div className="absolute right-12 opacity-0 group-hover:opacity-100 transition-opacity font-mono text-xs hidden md:block whitespace-pre">
{`+-------+
|  EXE  |
+-------+`}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PEOPLE / ID CARDS */}
        <section className="relative py-32 border-b border-jlug-line bg-jlug-ink">
          <div className="px-6 md:px-24 mb-24">
            <div className="font-mono text-xs text-jlug-accent mb-4 uppercase tracking-widest">
              03 // PERSONNEL
            </div>
            <h2 className="text-5xl md:text-8xl font-semibold tracking-tight">THE BUILDERS</h2>
          </div>

          <div className="relative w-full px-6 md:px-12 h-[800px]">
            {/* Structural lines connecting cards */}
            <div className="absolute top-1/4 left-0 right-0 h-px bg-jlug-line" />
            <div className="absolute top-3/4 left-0 right-0 h-px bg-jlug-line" />
            
            {/* Asymmetrical placement of ID Cards */}
            <div className="absolute top-[10%] left-[10%] w-64 md:w-80 bg-jlug-black border border-jlug-line p-1">
              <div className="border border-jlug-line p-4 h-full flex flex-col">
                <div className="flex justify-between font-mono text-[0.65rem] text-jlug-gray-1 border-b border-jlug-line pb-2 mb-4">
                  <span>ID: 026_A</span>
                  <span>ACTIVE</span>
                </div>
                <div className="w-full aspect-[3/4] bg-jlug-surface mb-4 relative grayscale flex items-center justify-center font-mono text-xs text-jlug-gray-2">
                  [ PHOTO_01.RAW ]
                </div>
                <h3 className="text-xl font-bold uppercase mb-1">MEMBER NAME</h3>
                <p className="font-mono text-xs text-jlug-gray-1 uppercase tracking-wide">SYSTEMS / 4TH YEAR</p>
              </div>
            </div>

            <div className="absolute top-[40%] right-[10%] md:right-[20%] w-64 md:w-80 bg-jlug-black border border-jlug-line p-1 z-10">
              <div className="border border-jlug-line p-4 h-full flex flex-col">
                <div className="flex justify-between font-mono text-[0.65rem] text-jlug-gray-1 border-b border-jlug-line pb-2 mb-4">
                  <span>ID: 026_B</span>
                  <span>ACTIVE</span>
                </div>
                <div className="w-full aspect-[3/4] bg-jlug-surface mb-4 relative grayscale flex items-center justify-center font-mono text-xs text-jlug-gray-2">
                  [ PHOTO_02.RAW ]
                </div>
                <h3 className="text-xl font-bold uppercase mb-1">MEMBER NAME</h3>
                <p className="font-mono text-xs text-jlug-gray-1 uppercase tracking-wide">AI / 3RD YEAR</p>
              </div>
            </div>
            
            {/* Decorator label */}
            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 font-mono text-xs border border-jlug-line px-4 py-2 hover:bg-jlug-white hover:text-jlug-black transition-colors cursor-pointer">
              LOAD_ALL_RECORDS.SH
            </div>
          </div>
        </section>

        {/* EVENTS / ARCHIVE */}
        <section className="relative py-32 border-b border-jlug-line overflow-hidden">
          <div className="px-6 md:px-24 mb-16 flex flex-col md:flex-row md:items-end justify-between">
            <div>
              <div className="font-mono text-xs text-jlug-accent mb-4 uppercase tracking-widest">
                04 // ARCHIVE
              </div>
              <h2 className="text-5xl md:text-8xl font-semibold tracking-tight">EVENT LOG</h2>
            </div>
            <div className="font-mono text-xs text-jlug-gray-1 uppercase mt-8 md:mt-0">
              FILTER: ALL_YEARS
            </div>
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
          </div>
        </section>

        {/* RECRUITMENT CTA & FOOTER */}
        <section className="relative">
          <div className="px-6 md:px-24 py-40 flex flex-col items-center justify-center text-center border-b border-jlug-line">
            <h2 className="text-[clamp(4rem,12vw,14rem)] font-bold leading-[0.8] tracking-[-0.05em] mb-16 uppercase">
              YOU COULD<br/>BE HERE.
            </h2>
            <div className="relative">
              <a href="#" className="inline-block bg-jlug-accent text-jlug-black font-mono font-bold text-lg md:text-xl px-12 py-6 hover:bg-jlug-white transition-colors">
                EXECUTE /JOIN
              </a>
              {/* ASCII decorative brackets */}
              <div className="absolute -left-8 top-1/2 -translate-y-1/2 text-jlug-gray-2 hidden md:block">
                {`>[`}
              </div>
              <div className="absolute -right-8 top-1/2 -translate-y-1/2 text-jlug-gray-2 hidden md:block">
                {`]<`}
              </div>
            </div>
            <div className="font-mono text-xs mt-8 text-jlug-gray-1 uppercase tracking-widest">
              PORT 8080 IS OPEN
            </div>
          </div>

          <footer className="px-6 md:px-12 py-12 flex flex-col lg:flex-row justify-between items-start gap-16 font-mono text-xs text-jlug-gray-1 tracking-widest uppercase">
            <div className="flex flex-col gap-4">
              <div className="text-2xl font-bold text-jlug-white mb-2">JLUG</div>
              <p>JEC LINUX USERS GROUP</p>
              <p>JABALPUR ENGINEERING COLLEGE</p>
              <p className="mt-8">EOF // 2026</p>
            </div>
            
            <div className="flex flex-wrap gap-16 lg:gap-32">
              <div className="flex flex-col gap-4">
                <div className="text-jlug-white border-b border-jlug-line pb-2 mb-2">PAGES</div>
                <a href="#" className="hover:text-jlug-white transition-colors">/HOME</a>
                <a href="#" className="hover:text-jlug-white transition-colors">/EVENTS</a>
                <a href="#" className="hover:text-jlug-white transition-colors">/HALL_OF_FAME</a>
                <a href="#" className="hover:text-jlug-white transition-colors">/MEMBERS</a>
              </div>
              <div className="flex flex-col gap-4">
                <div className="text-jlug-white border-b border-jlug-line pb-2 mb-2">NETWORK</div>
                <a href="#" className="hover:text-jlug-white transition-colors">GITHUB</a>
                <a href="#" className="hover:text-jlug-white transition-colors">LINKEDIN</a>
                <a href="#" className="hover:text-jlug-white transition-colors">INSTAGRAM</a>
              </div>
            </div>
          </footer>
        </section>

      </div>
    </div>
  );
}

