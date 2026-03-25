type RivalryDefinition = {
  teams: [string, string];
  label: string;
};

const RIVALRIES: RivalryDefinition[] = [
  { teams: ["Alabama", "Auburn"], label: "Iron Bowl" },
  { teams: ["Alabama", "LSU"], label: "First Saturday in November" },
  { teams: ["Appalachian State", "Georgia Southern"], label: "Deeper Than Hate" },
  { teams: ["Army", "Navy"], label: "Army-Navy Game" },
  { teams: ["Arizona", "Arizona State"], label: "Territorial Cup" },
  { teams: ["Baylor", "TCU"], label: "Revivalry" },
  { teams: ["California", "Stanford"], label: "Big Game" },
  { teams: ["Central Arkansas", "McNeese"], label: "Cowboy Bear Battle" },
  { teams: ["Clemson", "South Carolina"], label: "Palmetto Bowl" },
  { teams: ["Colorado", "Colorado State"], label: "Rocky Mountain Showdown" },
  { teams: ["Duke", "North Carolina"], label: "Victory Bell" },
  { teams: ["Eastern Washington", "Montana"], label: "Big Sky Power Clash" },
  { teams: ["Florida", "Georgia"], label: "World's Largest Outdoor Cocktail Party" },
  { teams: ["Florida", "Florida State"], label: "Sunshine Showdown" },
  { teams: ["Furman", "The Citadel"], label: "Military Classic of the South" },
  { teams: ["Georgia", "Georgia Tech"], label: "Clean, Old-Fashioned Hate" },
  { teams: ["Harvard", "Yale"], label: "The Game" },
  { teams: ["Holy Cross", "Lehigh"], label: "Patriot Rivalry" },
  { teams: ["Kansas", "Kansas State"], label: "Sunflower Showdown" },
  { teams: ["Kentucky", "Louisville"], label: "Governor's Cup" },
  { teams: ["Lehigh", "Lafayette"], label: "The Rivalry" },
  { teams: ["Maine", "New Hampshire"], label: "Battle for the Brice-Cowell Musket" },
  { teams: ["Michigan", "Ohio State"], label: "The Game" },
  { teams: ["Michigan", "Michigan State"], label: "Paul Bunyan Trophy" },
  { teams: ["Minnesota", "Wisconsin"], label: "Paul Bunyan's Axe" },
  { teams: ["Mississippi State", "Ole Miss"], label: "Egg Bowl" },
  { teams: ["Montana", "Montana State"], label: "Brawl of the Wild" },
  { teams: ["New Mexico", "New Mexico State"], label: "Rio Grande Rivalry" },
  { teams: ["NC State", "North Carolina"], label: "North Carolina Rivalry" },
  { teams: ["North Carolina Central", "North Carolina A&T"], label: "Aggie-Eagle Classic" },
  { teams: ["North Dakota", "North Dakota State"], label: "Dakota Marker" },
  { teams: ["Notre Dame", "USC"], label: "Jeweled Shillelagh" },
  { teams: ["Notre Dame", "Navy"], label: "Irish-Navy Series" },
  { teams: ["Oklahoma", "Oklahoma State"], label: "Bedlam" },
  { teams: ["Oklahoma", "Texas"], label: "Red River Rivalry" },
  { teams: ["Oregon", "Oregon State"], label: "Civil War" },
  { teams: ["Penn State", "Pittsburgh"], label: "Keystone Classic" },
  { teams: ["Pittsburgh", "West Virginia"], label: "Backyard Brawl" },
  { teams: ["Purdue", "Indiana"], label: "Old Oaken Bucket" },
  { teams: ["Sam Houston", "Stephen F. Austin"], label: "Battle of the Piney Woods" },
  { teams: ["South Carolina State", "North Carolina Central"], label: "MEAC Showdown" },
  { teams: ["South Dakota", "South Dakota State"], label: "South Dakota Showdown" },
  { teams: ["Southern", "Grambling"], label: "Bayou Classic" },
  { teams: ["Tennessee", "Florida"], label: "SEC East Rivalry" },
  { teams: ["Tennessee", "Vanderbilt"], label: "In-State Rivalry" },
  { teams: ["Texas", "Arkansas"], label: "Southwest Classic" },
  { teams: ["Texas", "Texas A&M"], label: "Lone Star Showdown" },
  { teams: ["UC Davis", "Sacramento State"], label: "Causeway Classic" },
  { teams: ["UCLA", "USC"], label: "Crosstown Showdown" },
  { teams: ["Utah", "BYU"], label: "Holy War" },
  { teams: ["Villanova", "Delaware"], label: "Battle of the Blue" },
  { teams: ["Virginia", "Virginia Tech"], label: "Commonwealth Clash" },
  { teams: ["Weber State", "Idaho State"], label: "Old Train Bell" },
  { teams: ["Washington", "Washington State"], label: "Apple Cup" },
  { teams: ["West Virginia", "Virginia Tech"], label: "Black Diamond Trophy" },
  { teams: ["William & Mary", "Richmond"], label: "Capital Cup" },
  { teams: ["Wofford", "Furman"], label: "I-85 Rivalry" },
];

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

const rivalryIndex = new Map<string, string>(
  RIVALRIES.map((entry) => {
    const [a, b] = entry.teams.map(normalizeName).sort();
    return [`${a}:${b}`, entry.label] as const;
  }),
);

export function findRivalryLabel(teamA?: string | null, teamB?: string | null) {
  const a = normalizeName(String(teamA ?? ""));
  const b = normalizeName(String(teamB ?? ""));
  if (!a || !b) return null;
  return rivalryIndex.get([a, b].sort().join(":")) ?? null;
}
