/**
 * ============================================================================
 * JEC SECURITY COUNCIL — MEMBER DATA CONFIGURATION
 * ============================================================================
 * 
 * Modify this file to easily update members of the JEC Security Council.
 * 
 * Each member entry supports:
 * - id: Unique identifier
 * - name: Full Name (displayed in uppercase)
 * - role: Council Role / Designation
 * - image: Path to photo in /public folder (e.g., "/alumni/2026-27, heads/akshat.jpeg")
 * - bio: Short quote or description
 * - imageScale: (optional) Zoom scale factor (default: 1)
 * - objectPosition: (optional) Image alignment, e.g. "center 20%"
 * - email: (optional) Contact email
 * - socials: (optional) LinkedIn, GitHub, etc.
 */

export interface SecurityCouncilMember {
  id: number | string;
  name: string;
  role?: string;
  image: string;
  bio?: string;
  imageScale?: number;
  objectPosition?: string;
  email?: string;
  socials?: Record<string, string>;
}

export const JEC_SECURITY_COUNCIL_CONFIG = {
  title: "JEC SECURITY COUNCIL",
  shortTitle: "JEC SC",
  institution: "JABALPUR ENGINEERING COLLEGE",
};

export const JEC_SECURITY_COUNCIL_MEMBERS: SecurityCouncilMember[] = [
  {
    id: 1,
    name: "AKSHAT TIWARI",

    image: "/alumni/2026-27, heads/akshat.jpeg",
    imageScale: 1,
    objectPosition: "center 5%",

  },
  {
    id: 2,
    name: "CHITRANSH TIWARI",

    image: "/alumni/2026-27, heads/chitransh.jpeg",
    imageScale: 1,
    objectPosition: "center 50%",

  },
  {
    id: 3,
    name: "MUSTKEEM ARSH",

    image: "/assets/presidents/mustkeem_arsh.jpg",
    imageScale: 1,
    objectPosition: "center 60%",

  },
  {
    id: 4,
    name: "MOHAMMAD USAID",

    image: "/assets/presidents/mohammad_usaid.png",
    imageScale: 2.2,
    objectPosition: "center 40%",

  },
  {
    id: 5,
    name: "PRANSHU MISHRA",

    image: "/assets/presidents/pranshu_mishra.jpg",
    imageScale: 2.2,
    objectPosition: "center 30%",
  },

  {
    id: 6,
    name: "SAMVEG SHANDILYA",

    image: "/assets/presidents/samveg_shandilya.jpg",
    imageScale: 1,
    objectPosition: "center 5%",
  },
  {
    id: 7,
    name: "AYUSHMAN PARCHORIA",

    image: "/assets/presidents/ayushman_parchoria.jpg",
    imageScale: 1,
    objectPosition: "center 5%",

  },

];
