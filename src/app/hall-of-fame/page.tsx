import type { Metadata } from "next";

import PlaceholderPage from "@/components/PlaceholderPage";
import { NAV_ITEMS } from "@/lib/navigation";

const item = NAV_ITEMS.find((entry) => entry.href === "/hall-of-fame")!;

export const metadata: Metadata = {
  title: "Hall of Fame | JLUG",
  description: "Presidents who have led JLUG since 2019.",
};

// TODO: replace the placeholder with the list of presidents since 2019.
export default function HallOfFamePage() {
  return <PlaceholderPage item={item} />;
}
