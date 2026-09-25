import type { Metadata } from "next";

import AnimatedEventList from "@/components/events/AnimatedEventList";
import ScrollReveal from "@/components/events/ScrollReveal";
import { EVENTS } from "@/data/events";
import { NAV_ITEMS } from "@/lib/navigation";

const item = NAV_ITEMS.find((entry) => entry.href === "/events")!;

export const metadata: Metadata = {
  title: "Events | JLUG",
  description: "Past JLUG events — talks, hackathons, workshops and install fests.",
};

export default function EventsPage() {
  return (
    <div className="relative z-10 mx-auto w-full max-w-[1440px] overflow-x-hidden border-jlug-line bg-jlug-black/80 backdrop-blur-sm md:border-l md:border-r">
      <div className="flex items-center justify-between border-b border-jlug-line px-6 py-4 font-mono text-[0.65rem] uppercase tracking-widest text-jlug-gray-2 md:px-12">
        <span>/ROOT /EVENTS</span>
        <span className="text-jlug-gray-3">{item.meta}</span>
      </div>
      <header className="border-b border-jlug-line px-6 py-20 md:px-24 md:py-32">
        <ScrollReveal direction="up" delay={100}>
          <p className="mb-6 font-mono text-xs uppercase tracking-widest text-jlug-accent">
            {item.index} {"//"} {item.label}
          </p>
        </ScrollReveal>
        <ScrollReveal direction="left" delay={300}>
          <h1 className="text-5xl font-semibold uppercase tracking-tight md:text-8xl">
            {item.title}
          </h1>
        </ScrollReveal>
        <ScrollReveal direction="right" delay={500}>
          <p className="mt-8 max-w-2xl text-lg text-jlug-gray-1 md:text-xl">
            {item.blurb}
          </p>
        </ScrollReveal>
      </header>
      <main className="flex flex-col gap-12 px-6 py-20 md:px-24">
        <AnimatedEventList events={EVENTS} />
      </main>
    </div>
  );
}
