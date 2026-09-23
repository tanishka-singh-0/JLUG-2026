import Link from "next/link";
import { NAV_ITEMS } from "@/lib/navigation";

export default function Footer() {
  return (
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
          <Link href="/" className="hover:text-jlug-white transition-colors">/HOME</Link>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:text-jlug-white transition-colors"
            >
              {item.href.toUpperCase().replace("-", "_")}
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <div className="text-jlug-white border-b border-jlug-line pb-2 mb-2">NETWORK</div>
          <a href="#" className="hover:text-jlug-white transition-colors">GITHUB</a>
          <a href="#" className="hover:text-jlug-white transition-colors">LINKEDIN</a>
          <a href="#" className="hover:text-jlug-white transition-colors">INSTAGRAM</a>
        </div>
      </div>
    </footer>
  );
}
