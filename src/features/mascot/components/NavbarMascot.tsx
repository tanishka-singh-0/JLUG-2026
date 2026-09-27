"use client";

/**
 * The client boundary for the navbar mascot, and nothing more: it wires the hook
 * to the view. Markup lives in `NavbarMascotView`, decisions live in
 * `useNavbarMascot`, and this file exists so a Server Component can render the
 * mascot without either of them leaking upward.
 */

import { useNavbarMascot } from "../hooks/useNavbarMascot";
import NavbarMascotView from "./NavbarMascotView";

export default function NavbarMascot() {
  return <NavbarMascotView {...useNavbarMascot()} />;
}
