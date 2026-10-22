"use client";

import RecruitmentForm from "@/features/recruitment/components/RecruitmentForm";
import Footer from "@/components/Footer";

export default function JoinClient() {
  return (
    <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-[1440px] flex-col border-jlug-line bg-jlug-black/80 backdrop-blur-sm md:border-l md:border-r">
      {/* Top Breadcrumb Header Bar */}
      <div className="flex items-center justify-between border-b border-jlug-line px-6 py-4 font-mono text-[0.65rem] uppercase tracking-widest text-jlug-gray-2 md:px-12">
        <div className="flex items-center gap-2">
          <span>/ROOT /JOIN</span>
          <span className="text-jlug-gray-3">//</span>
          <span className="text-jlug-white">CADRE_INTAKE</span>
        </div>
        <div className="flex items-center gap-2 text-jlug-accent">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-jlug-accent" />
          <span>RECRUITMENT_OPEN</span>
        </div>
      </div>

      {/* Main interactive Recruitment Application UI */}
      <main className="flex-1">
        <RecruitmentForm />
      </main>

      {/* Footer */}
      <div className="border-t border-jlug-line">
        <Footer />
      </div>
    </div>
  );
}
