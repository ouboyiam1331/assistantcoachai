// data/teamMeta.ts

export type TeamMeta = {
  slug: string;
  nickname: string;
  city: string;
  state: string;
  stadium: string;
  primaryColor: string;   // hex for future theming
  secondaryColor?: string;
};

// Explicit metadata for key programs (your core teams + a few blue bloods).
// Every other team will get a safe fallback in getTeamMeta().
export const TEAM_META: TeamMeta[] = [
  {
    slug: "alabama",
    nickname: "Crimson Tide",
    city: "Tuscaloosa",
    state: "Alabama",
    stadium: "Bryant–Denny Stadium",
    primaryColor: "#9E1B32",
    secondaryColor: "#FFFFFF",
  },
  {
    slug: "auburn",
    nickname: "Tigers",
    city: "Auburn",
    state: "Alabama",
    stadium: "Jordan–Hare Stadium",
    primaryColor: "#0C2340",
    secondaryColor: "#E87722",
  },
  {
    slug: "troy",
    nickname: "Trojans",
    city: "Troy",
    state: "Alabama",
    stadium: "Veterans Memorial Stadium",
    primaryColor: "#8A2432",
    secondaryColor: "#C0C0C0",
  },
  {
    slug: "uab",
    nickname: "Blazers",
    city: "Birmingham",
    state: "Alabama",
    stadium: "Protective Stadium",
    primaryColor: "#006341",
    secondaryColor: "#B9975B",
  },
  {
    slug: "oklahoma",
    nickname: "Sooners",
    city: "Norman",
    state: "Oklahoma",
    stadium: "Gaylord Family Oklahoma Memorial Stadium",
    primaryColor: "#841617",
    secondaryColor: "#FDF9D8",
  },
  {
    slug: "army",
    nickname: "Black Knights",
    city: "West Point",
    state: "New York",
    stadium: "Michie Stadium",
    primaryColor: "#2D2926",
    secondaryColor: "#C5B783",
  },
  {
    slug: "ohio-state",
    nickname: "Buckeyes",
    city: "Columbus",
    state: "Ohio",
    stadium: "Ohio Stadium",
    primaryColor: "#BB0000",
    secondaryColor: "#666666",
  },
  {
    slug: "michigan",
    nickname: "Wolverines",
    city: "Ann Arbor",
    state: "Michigan",
    stadium: "Michigan Stadium",
    primaryColor: "#00274C",
    secondaryColor: "#FFCB05",
  },
  {
    slug: "notre-dame",
    nickname: "Fighting Irish",
    city: "South Bend",
    state: "Indiana",
    stadium: "Notre Dame Stadium",
    primaryColor: "#0C2340",
    secondaryColor: "#AE9142",
  },
  {
    slug: "florida-state",
    nickname: "Seminoles",
    city: "Tallahassee",
    state: "Florida",
    stadium: "Doak Campbell Stadium",
    primaryColor: "#782F40",
    secondaryColor: "#CEB888",
  },
];

// ✅ Main helper: always returns SOME metadata for ANY team slug
export function getTeamMeta(slug: string): TeamMeta {
  const explicit = TEAM_META.find((t) => t.slug === slug);
  if (explicit) return explicit;

  const displayName = slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");

  return {
    slug,
    nickname: `${displayName} Football`,
    city: "Unknown",
    state: "Unknown",
    stadium: "Home Stadium",
    primaryColor: "#222222",
    secondaryColor: "#AAAAAA",
  };
}
