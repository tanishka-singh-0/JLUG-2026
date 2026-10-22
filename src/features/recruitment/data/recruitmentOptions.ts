import { BranchOption, DomainOption, YearOption } from "../types";

export const BRANCH_OPTIONS: BranchOption[] = [
  { code: "CSE", name: "Computer Science & Engineering" },
  { code: "AI & DS", name: "Artificial Intelligence & Data Science" },
  { code: "IT", name: "Information Technology" },
  { code: "ECE", name: "Electronics & Telecommunication" },
  { code: "EE", name: "Electrical Engineering" },
  { code: "MT", name: "Mechatronics Engineering" },
  { code: "ME", name: "Mechanical Engineering" },
  { code: "CE", name: "Civil Engineering" },
  { code: "IPE", name: "Industrial & Production Engineering" },

];

export const YEAR_OPTIONS: YearOption[] = [
  { value: "1st Year", label: "1st Year", batch: "Batch 2026-2030" },
  { value: "2nd Year", label: "2nd Year", batch: "Batch 2025-2029" },

];

export const DOMAIN_OPTIONS: DomainOption[] = [
  {
    id: "technical",
    title: "Technical",
    description: "Software development, open-source contributions, Linux, DevOps, AI/ML & engineering projects",
    iconTag: "TECH_CORE",
  },
  {
    id: "management",
    title: "Management",
    description: "Event planning, team coordination, logistics, sponsorship & club operations management",
    iconTag: "MGMT_OPS",
  },
  {
    id: "graphics",
    title: "Graphics",
    description: "Poster design, branding, Figma/Illustrator, UI mockups & visual identity for JLUG events",
    iconTag: "GRAPH_DESIGN",
  },
  {
    id: "videography-editing",
    title: "Videography & Editing",
    description: "Event videography, after-movies, reels, motion graphics & video post-production",
    iconTag: "VIDEO_EDIT",
  },
  {
    id: "content-social-media",
    title: "Content & Social Media",
    description: "Technical writing, blogs, LinkedIn/Instagram posts, newsletters & community outreach",
    iconTag: "CONTENT_SM",
  },
];

export const INITIAL_FORM_DATA = {
  fullName: "",
  branch: "",
  year: "",
  phone: "",
  email: "",
  domains: [] as string[],
  whyJoin: "",
};
