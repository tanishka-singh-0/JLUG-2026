'use client';

import SplitFlapText from "@/components/SplitFlapText";

export default function JoinClient() {
  return (
    <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-[1440px] items-center justify-center border-jlug-line bg-jlug-black/80 backdrop-blur-sm md:border-l md:border-r">
      <SplitFlapText
        words={['RECRUITMENT', 'COMING SOON']}
        flipDuration={0.12}
        stagger={0.06}
        cycleDelay={2400}
        charset="alphanumeric"
        flipsPerChar={8}
        tileColor="#111827"
        textColor="#f8fafc"
        tileRadius={8}
        gap={6}
        fontSize={52}
        loop
        padTo={12}
      />
    </div>
  );
}
