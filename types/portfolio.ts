export type Portfolio = {
  name: string;
  title: string;
  tagline: string;
  location: string;
  photo: string;
  email: string;
  phone?: string;
  links: {
    github?: string;
    linkedin?: string;
    website?: string;
  };
  summary: string;
  spokenIntro: string;
  experience: {
    company: string;
    role: string;
    start: string;
    end: string;
    location?: string;
    highlights: string[];
  }[];
  skills: Record<string, string[]>;
  projects: {
    name: string;
    summary: string;
    stack: string[];
    link?: string;
  }[];
  education: {
    school: string;
    degree: string;
    start: string;
    end: string;
  }[];
};
