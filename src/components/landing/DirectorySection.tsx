export default function DirectorySection() {
  return (
    <section className="relative border-b border-jlug-line">
      <div className="sticky top-14 bg-jlug-black border-b border-jlug-line z-20 px-6 py-3 flex justify-between font-mono text-xs text-jlug-gray-1 uppercase tracking-widest">
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
  );
}
