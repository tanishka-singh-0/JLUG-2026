import type { Metadata } from "next";

import PlaceholderPage from "@/components/PlaceholderPage";
import { NAV_ITEMS } from "@/lib/navigation";

const item = NAV_ITEMS.find((entry) => entry.href === "/join")!;

export const metadata: Metadata = {
  title: "Join | JLUG",
  description: "JLUG recruitment for the incoming 2030 batch.",
};

// TODO: replace the placeholder with the recruitment Google Form
// (embed via iframe, or link out) once the URL is available.
export default function JoinPage() {
  return <PlaceholderPage item={item} />;
}
