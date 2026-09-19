import type { Metadata } from "next";

import PlaceholderPage from "@/components/PlaceholderPage";
import { NAV_ITEMS } from "@/lib/navigation";

const item = NAV_ITEMS.find((entry) => entry.href === "/events")!;

export const metadata: Metadata = {
  title: "Events | JLUG",
  description: "Past JLUG events — talks, hackathons, workshops and install fests.",
};

// TODO: replace the placeholder with the real event archive.
export default function EventsPage() {
  return <PlaceholderPage item={item} />;
}
