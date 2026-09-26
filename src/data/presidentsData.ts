/**
 * Hall of Fame — Presidents data
 *
 * ─────────────────────────────────────────────────────────────────────────
 * HOW TO EDIT
 * ─────────────────────────────────────────────────────────────────────────
 * This is the only file you need to touch to add, remove or update presidents.
 *
 * photo   → path relative to /public, e.g. "/assets/presidents/name.jpg"
 *           Leave as "" to show a monochrome placeholder block.
 * note    → One punchy sentence about their term. Keep it short.
 * socials → Optional. Remove any key you don't have a link for.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface President {
  year: string;
  name: string;
  photo: string;
  branch: string;
  note: string;
  socials?: {
    github?: string;
    linkedin?: string;
  };
}

export const PRESIDENTS: President[] = [
  {
    year: "2019–20",
    name: "Ayushman Parchoria",
    photo: "/assets/presidents/ayushman_parchoria.jpg",
    branch: "B.Tech — Information Technology",
    note: "Founded the club from scratch. Ran the first Linux install-fest with 40 attendees and zero budget.",
    socials: {
      github: "https://github.com/",
      linkedin: "https://linkedin.com/",
    },
  },
  {
    year: "2020–21",
    name: "Pranshu Mishra",
    photo: "/assets/presidents/pranshu_mishra.jpg",
    branch: "B.Tech — Computer Science Engineering",
    note: "Led the club through a fully remote year. Launched the first open-source contribution sprint online.",
    socials: {
      github: "https://github.com/",
      linkedin: "https://linkedin.com/",
    },
  },
  {
    year: "2021–22",
    name: "Mohammad Usaid",
    photo: "/assets/presidents/mohammad_usaid.png",
    branch: "B.Tech — Electronics & Communication",
    note: "Doubled membership and ran CodeKumbh 1.0 — the first 24-hour hackathon at JEC.",
    socials: {
      github: "https://github.com/",
      linkedin: "https://linkedin.com/",
    },
  },
  {
    year: "2022–23",
    name: "Samveg Shandilya",
    photo: "/assets/presidents/samveg_shandilya.jpg",
    branch: "B.Tech — Industrial Production",
    note: "Formalised the club's domain structure. Introduced the design and AI/ML tracks.",
    socials: {
      linkedin: "https://linkedin.com/",
    },
  },
  {
    year: "2023–24",
    name: "Mustkeem Arsh",
    photo: "/assets/presidents/mustkeem_arsh.jpg",
    branch: "B.Tech — Electronics and Communication Engineering",
    note: "Shipped the first version of jlug.club and took CodeKumbh national with 200+ participants.",
    socials: {
      github: "https://github.com/",
      linkedin: "https://linkedin.com/",
    },
  },
  {
    year: "2024–25",
    name: "Harshit Solanki",
    photo: "/assets/presidents/harshit_solanki.jpg",
    branch: "B.Tech — Electrical Engineering",
    note: "Grew the community to 120+ active members. Established the robotics and hardware track.",
    socials: {
      github: "https://github.com/",
      linkedin: "https://linkedin.com/",
    },
  },
  {
    year: "2025–26",
    name: "Prince Dwivedi",
    photo: "/assets/presidents/aarav_mehta.png",
    branch: "B.Tech — Electronics and Communication Engineering",
    note: "Current president. Keeps the club's roadmap honest and its late-night build sessions fuelled.",
    socials: {
      github: "https://github.com/",
      linkedin: "https://linkedin.com/",
    },
  },
  {
    year: "2026–27",
    name: "Akshat Tiwari",
    photo: "/assets/presidents/president_2026_27.jpg",
    branch: "B.Tech — Computer Science",
    note: "The baton passes. A new chapter for JLUG begins.",
    socials: {
      github: "https://github.com/",
      linkedin: "https://linkedin.com/",
    },
  },
];
