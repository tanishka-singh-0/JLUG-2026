import type { Metadata } from "next";

import PlaceholderPage from "@/components/PlaceholderPage";
import { NAV_ITEMS } from "@/lib/navigation";

const item = NAV_ITEMS.find((entry) => entry.href === "/members")!;

export const metadata: Metadata = {
  title: "Members | JLUG",
  description: "Every JLUG member, across all years.",
};

// TODO: replace the placeholder with the member directory.
export default function MembersPage() {
  return <PlaceholderPage item={item} />;
}
