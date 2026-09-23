import Link from "next/link";

export default function PersonnelSection() {
  return (
    <section className="relative py-32 border-b border-jlug-line bg-jlug-ink">
      <div className="px-6 md:px-24 mb-24">
        <div className="font-mono text-xs text-jlug-accent mb-4 uppercase tracking-widest">
          04 // PERSONNEL
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
        
        {/* Jump to the full member directory */}
        <Link
          href="/members"
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2 font-mono text-xs border border-jlug-line px-4 py-2 hover:bg-jlug-white hover:text-jlug-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jlug-accent"
        >
          LOAD_ALL_RECORDS.SH
        </Link>
      </div>
    </section>
  );
}
