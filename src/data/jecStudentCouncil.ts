/**
 * ============================================================================
 * JEC STUDENT COUNCIL — MEMBER DATA CONFIGURATION
 * ============================================================================
 * 
 * Modify this file to easily update members of the JEC Student Council.
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

export interface StudentCouncilMember {
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

export const JEC_STUDENT_COUNCIL_CONFIG = {
  title: "JEC STUDENT COUNCIL",
  shortTitle: "JEC SC",
  institution: "JABALPUR ENGINEERING COLLEGE",
};

export const JEC_STUDENT_COUNCIL_MEMBERS: StudentCouncilMember[] = [
  {
    id: 1,
    name: "AKSHAT TIWARI",

    image: "/assets/presidents/akshat_tiwari.jpeg",
    imageScale: 1.2,
    objectPosition: "center 5%",

  },
  {
    id: 2,
    name: "CHITRANSH TIWARI",

    image: "/alumni/members/chitransh.png",
    imageScale: 1,
    objectPosition: "center 50%",

  },
  {
    id: 3,
    name: "PRINCE DWIVEDI",

    image: "/assets/presidents/prince_dwivedi.png",
    imageScale: 1,
    objectPosition: "center 5%",
    

  },
  {
    id: 4,
    name: "PALAK CHOUDHARY",

    image: "/alumni/members/palak.jpeg",
    imageScale: 1,
    objectPosition: "center 5%",
    

  },
  {
    id: 5,
    name: "HARSHIT SOLANKI",

    image: "/assets/presidents/harshit_solanki.jpg",
    imageScale: 1,
    objectPosition: "center 5%",
    
  },

  {
    id: 6,
    name: "VARSHA GURBANI",

    image: "/alumni/members/varsha.jpeg",
    imageScale: 1,
    objectPosition: "center 5%",
    
  },
  {
    id: 7,
    name: "MUSTKEEM ARSH",

    image: "/assets/presidents/mustkeem_arsh.jpg",
    imageScale: 0.9,
    objectPosition: "center 60%",
    

  },
  {id: 8,
    name: "ISHITA MODI",

    image: "/alumni/members/ishita.jpeg",
    imageScale: 1,
    objectPosition: "center 5%",
    
  },
  {id: 9,
    name: "SAMVEG SHANDILYA",

    image: "/assets/presidents/samveg_shandilya.jpg",
    imageScale: 1.2,
    objectPosition: "center 5%",
    
  },

  {id: 10,
    name: "PREETI PATEL",

    image: "/alumni/members/preeti.jpeg",
    imageScale: 1,
    objectPosition: "center 5%",
  },
  {id: 11,
    name: "ADITI SHRIVASTAVA",

    image: "/alumni/members/aditi.jpeg",
    imageScale: 1,
    objectPosition: "center 5%",
    
  },
   {id: 12,
    name: "AASTHA GAUTAM",

    image: "/alumni/members/aastha.jpeg",
    imageScale: 0.9,
    objectPosition: "center 0%",
    
  },
  {id: 13,
    name: "MOHAMMAD USAID",

    image: "/assets/presidents/mohammad_usaid.png",
    imageScale: 1.3,
    objectPosition: "center 40%",
    
  },
  {id: 14,
    name: "PRANSHU MISHRA",

    image: "/assets/presidents/pranshu_mishra.jpg",
    imageScale: 1.3,
    objectPosition: "center 30%",
    
  },
  {id: 15,
    name: "AYUSHMAN PARCHORIA",

    image: "/assets/presidents/ayushman_parchoria.jpg",
    imageScale: 1.2,
    objectPosition: "center 5%",
    
  },

];
