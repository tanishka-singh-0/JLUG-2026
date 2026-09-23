import HeroSection from "@/components/landing/HeroSection";
import ManifestoSection from "@/components/landing/ManifestoSection";
import DirectorySection from "@/components/landing/DirectorySection";
import SiteIndexSection from "@/components/landing/SiteIndexSection";
import PersonnelSection from "@/components/landing/PersonnelSection";
import EventsSection from "@/components/landing/EventsSection";
import CallToActionSection from "@/components/landing/CallToActionSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="relative flex flex-col text-jlug-white selection:bg-jlug-accent selection:text-jlug-black overflow-x-hidden">
      {/* CONTINUOUS ENVIRONMENT WRAPPER */}
      <div className="relative z-10 w-full max-w-[1440px] mx-auto border-l border-r border-jlug-line bg-jlug-black/80 backdrop-blur-sm">
        
        <HeroSection />
        
        <ManifestoSection />
        
        <DirectorySection />
        
        <SiteIndexSection />
        
        <PersonnelSection />
        
        <EventsSection />
        
        <CallToActionSection />

        <Footer />
        
      </div>
    </div>
  );
}
