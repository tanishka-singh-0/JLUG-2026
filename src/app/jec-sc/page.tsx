import type { Metadata } from "next";
import JecScRoster from "@/features/jec-sc/components/JecScRoster";
import { JEC_SECURITY_COUNCIL_MEMBERS } from "@/data/jecSecurityCouncil";

export const metadata: Metadata = {
  title: "JEC Security Council | JLUG",
  description:
    "Official representatives and members of the JEC Security Council, Jabalpur Engineering College.",
};

export default function JecSecurityCouncilPage() {
  return <JecScRoster initialMembers={JEC_SECURITY_COUNCIL_MEMBERS} />;
}
