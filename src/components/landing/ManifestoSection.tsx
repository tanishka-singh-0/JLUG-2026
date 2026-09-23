export default function ManifestoSection() {
  return (
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
          <p className="text-2xl md:text-4xl font-medium leading-[1.4] tracking-[-0.02em] mb-6">
            We learn things, build things, break things, and teach each other what we figured out.
          </p>
          <p className="text-lg md:text-xl text-jlug-gray-1 leading-[1.6]">
            Founded on 7th September 2019, JLUG is the official techno-cultural club of Jabalpur Engineering College. Originally rooted in Linux and FOSS, we&apos;ve evolved into a vibrant community where technology, creativity, and culture intersect. From hands-on tech workshops to cultural fests, we empower students to explore, build, and express.
          </p>
          <div className="mt-12 pt-6 border-t border-jlug-line flex justify-between font-mono text-xs text-jlug-gray-1">
            <span>FILE: MANIFESTO.TXT</span>
            <span>CHMOD 777</span>
          </div>
        </div>
      </div>
    </section>
  );
}
