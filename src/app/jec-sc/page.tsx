import type { Metadata } from "next";
import JecScRoster from "@/features/jec-sc/components/JecScRoster";
import { JEC_STUDENT_COUNCIL_MEMBERS } from "@/data/jecStudentCouncil";

export const metadata: Metadata = {
  title: "JEC Student Council | JLUG",
  description:
    "Official representatives and members of the JEC Student Council, Jabalpur Engineering College.",
};

export default function JecStudentCouncilPage() {
  return <JecScRoster initialMembers={JEC_STUDENT_COUNCIL_MEMBERS} />;
}
