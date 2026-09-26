import type { Metadata } from "next";
import JecScRoster from "@/features/jec-sc/components/JecScRoster";
import { JEC_SC_MEMBERS, JEC_SC_COUNCIL_CONFIG } from "@/data/jecScMembers";

export const metadata: Metadata = {
  title: "JEC SC | Student Council — Jabalpur Engineering College",
  description:
    "Meet the official representatives and leaders of the JEC Student Council (JEC SC). Driving campus culture, student welfare, technical wings, and university leadership.",
};

export default function JecScPage() {
  return <JecScRoster initialMembers={JEC_SC_MEMBERS} />;
}
