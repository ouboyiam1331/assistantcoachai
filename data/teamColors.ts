export type TeamColorEntry = {
  primary: string;
  secondary: string | null;
  sourceUrl: string;
};

// Authoritative local team color map.
// Values are estimations provided by TeamColorCodes.com.
export const TEAM_COLOR_MAP: Record<string, TeamColorEntry> = {
  "air-force": {
    primary: "#003087",
    secondary: "#8A8D8F",
    sourceUrl: "https://teamcolorcodes.com/air-force-falcons-color-codes/",
  },
  "akron": {
    primary: "#041E42",
    secondary: "#A89968",
    sourceUrl: "https://teamcolorcodes.com/akron-zips-color-codes/",
  },
  "alabama": {
    primary: "#9E1B32",
    secondary: "#FFFFFF",
    sourceUrl: "https://teamcolorcodes.com/alabama-crimson-tide-color-codes/",
  },
  "app-state": {
    primary: "#222222",
    secondary: "#FFCC00",
    sourceUrl: "https://teamcolorcodes.com/app-state-mountaineers-color-codes/",
  },
  "arizona": {
    primary: "#003366",
    secondary: "#CC0033",
    sourceUrl: "https://teamcolorcodes.com/arizona-wildcats-color-codes/",
  },
  "arizona-state": {
    primary: "#8C1D40",
    secondary: "#FFC627",
    sourceUrl: "https://teamcolorcodes.com/arizona-state-sun-devils-color-codes/",
  },
  "arkansas": {
    primary: "#9D2235",
    secondary: "#FFFFFF",
    sourceUrl: "https://teamcolorcodes.com/arkansas-razorbacks-color-codes/",
  },
  "arkansas-state": {
    primary: "#CC092F",
    secondary: "#000000",
    sourceUrl: "https://teamcolorcodes.com/arkansas-state-red-wolves-color-codes/",
  },
  "army": {
    primary: "#D4BF91",
    secondary: "#222222",
    sourceUrl: "https://teamcolorcodes.com/army-black-knights-color-codes/",
  },
  "auburn": {
    primary: "#0C2340",
    secondary: "#E87722",
    sourceUrl: "https://teamcolorcodes.com/auburn-tigers-color-codes/",
  },
  "ball-state": {
    primary: "#BA0C2F",
    secondary: "#222222",
    sourceUrl: "https://teamcolorcodes.com/ball-state-cardinals-color-codes/",
  },
  "baylor": {
    primary: "#154734",
    secondary: "#FFB81C",
    sourceUrl: "https://teamcolorcodes.com/baylor-bears-color-codes/",
  },
  "boise-state": {
    primary: "#0033A0",
    secondary: "#D64309",
    sourceUrl: "https://teamcolorcodes.com/boise-state-broncos-color-codes/",
  },
  "boston-college": {
    primary: "#98002E",
    secondary: "#BC9B6A",
    sourceUrl: "https://teamcolorcodes.com/boston-college-eagles-color-codes/",
  },
  "bowling-green": {
    primary: "#FE5000",
    secondary: "#4F2C1D",
    sourceUrl: "https://teamcolorcodes.com/bowling-green-falcons-color-codes/",
  },
  "buffalo": {
    primary: "#005BBB",
    secondary: "#FFFFFF",
    sourceUrl: "https://teamcolorcodes.com/buffalo-sabres-color-codes/",
  },
  byu: {
    primary: "#002E5D",
    secondary: "#FFFFFF",
    sourceUrl: "https://teamcolorcodes.com/byu-cougars-color-codes/",
  },
  "cal": {
    primary: "#003262",
    secondary: "#FDB515",
    sourceUrl: "https://teamcolorcodes.com/cal-poly-mustangs-color-codes/",
  },
  charlotte: {
    primary: "#046A38",
    secondary: "#B9975B",
    sourceUrl: "https://teamcolorcodes.com/charlotte-49ers-color-codes/",
  },
  "central-michigan": {
    primary: "#6A0032",
    secondary: "#FFC82E",
    sourceUrl: "https://teamcolorcodes.com/central-michigan-chippewas-color-codes/",
  },
  "cincinnati": {
    primary: "#E00122",
    secondary: "#000000",
    sourceUrl: "https://teamcolorcodes.com/cincinnati-reds-color-codes/",
  },
  clemson: {
    primary: "#F56600",
    secondary: "#522D80",
    sourceUrl: "https://teamcolorcodes.com/clemson-tigers-color-codes/",
  },
  "coastal-carolina": {
    primary: "#006F71",
    secondary: "#A27752",
    sourceUrl: "https://teamcolorcodes.com/carolina-panthers-color-codes/",
  },
  colorado: {
    primary: "#000000",
    secondary: "#CFB87C",
    sourceUrl: "https://teamcolorcodes.com/colorado-buffaloes-color-codes/",
  },
  "colorado-state": {
    primary: "#1E4D2B",
    secondary: "#C8C372",
    sourceUrl: "https://teamcolorcodes.com/colorado-state-rams-color-codes/",
  },
  delaware: {
    primary: "#00539F",
    secondary: "#FFDD31",
    sourceUrl: "https://teamcolorcodes.com/delaware-fightin-blue-hens-color-codes/",
  },
  "duke": {
    primary: "#003087",
    secondary: "#FFFFFF",
    sourceUrl: "https://teamcolorcodes.com/duke-blue-devils-color-codes/",
  },
  "east-carolina": {
    primary: "#592A8A",
    secondary: "#FDC82F",
    sourceUrl: "https://teamcolorcodes.com/east-carolina-pirates-color-codes/",
  },
  "eastern-michigan": {
    primary: "#006633",
    secondary: "#000000",
    sourceUrl: "https://teamcolorcodes.com/eastern-michigan-eagles-color-codes/",
  },
  fiu: {
    primary: "#081E3F",
    secondary: "#B6862C",
    sourceUrl: "https://teamcolorcodes.com/fiu-panthers-color-codes/",
  },
  "florida": {
    primary: "#0021A5",
    secondary: "#FA4616",
    sourceUrl: "https://teamcolorcodes.com/florida-panthers-color-codes/",
  },
  "florida-atlantic": {
    primary: "#003366",
    secondary: "#CC0000",
    sourceUrl: "https://teamcolorcodes.com/florida-atlantic-owls-color-codes/",
  },
  "florida-state": {
    primary: "#782F40",
    secondary: "#CEB888",
    sourceUrl: "https://teamcolorcodes.com/florida-state-seminoles-color-codes/",
  },
  "fresno-state": {
    primary: "#DB0032",
    secondary: "#002E6D",
    sourceUrl: "https://teamcolorcodes.com/fresno-state-bulldogs-color-codes/",
  },
  georgia: {
    primary: "#BA0C2F",
    secondary: "#000000",
    sourceUrl: "https://teamcolorcodes.com/georgia-bulldogs-color-codes/",
  },
  "georgia-southern": {
    primary: "#011E41",
    secondary: "#87714D",
    sourceUrl: "https://teamcolorcodes.com/georgia-southern-eagles-color-codes/",
  },
  "georgia-state": {
    primary: "#0039A6",
    secondary: "#C60C30",
    sourceUrl: "https://teamcolorcodes.com/georgia-southwestern-state-hurricanes-color-codes/",
  },
  "georgia-tech": {
    primary: "#B3A369",
    secondary: "#003057",
    sourceUrl: "https://teamcolorcodes.com/georgia-tech-yellow-jackets-color-codes/",
  },
  "hawaii": {
    primary: "#024731",
    secondary: "#C8C8C8",
    sourceUrl: "https://teamcolorcodes.com/hawaii-warriors-color-codes/",
  },
  "houston": {
    primary: "#C8102E",
    secondary: "#B2B4B2",
    sourceUrl: "https://teamcolorcodes.com/houston-astros-color-codes/",
  },
  illinois: {
    primary: "#13294B",
    secondary: "#E84A27",
    sourceUrl: "https://teamcolorcodes.com/illinois-fighting-illini-color-codes/",
  },
  indiana: {
    primary: "#990000",
    secondary: "#EEEDEB",
    sourceUrl: "https://teamcolorcodes.com/indiana-hoosiers-color-codes/",
  },
  "iowa": {
    primary: "#FFCD00",
    secondary: "#000000",
    sourceUrl: "https://teamcolorcodes.com/iowa-wild-color-codes/",
  },
  "iowa-state": {
    primary: "#C8102E",
    secondary: "#F1BE48",
    sourceUrl: "https://teamcolorcodes.com/iowa-state-cyclones-color-codes/",
  },
  "jacksonville-state": {
    primary: "#CC0000",
    secondary: "#FFFFFF",
    sourceUrl: "https://teamcolorcodes.com/jacksonville-state-gamecocks-color-codes/",
  },
  "james-madison": {
    primary: "#450084",
    secondary: "#CBB677",
    sourceUrl: "https://teamcolorcodes.com/james-madison-dukes-color-codes/",
  },
  "kansas": {
    primary: "#0051BA",
    secondary: "#E8000D",
    sourceUrl: "https://teamcolorcodes.com/kansas-jayhawks-color-codes/",
  },
  "kansas-state": {
    primary: "#512888",
    secondary: "#A7A7A7",
    sourceUrl: "https://teamcolorcodes.com/kansas-state-wildcats-color-codes/",
  },
  "kennesaw-state": {
    primary: "#FDBB30",
    secondary: "#0B1315",
    sourceUrl: "https://teamcolorcodes.com/kennesaw-state-owls-color-codes/",
  },
  "kent-state": {
    primary: "#002664",
    secondary: "#EAAB00",
    sourceUrl: "https://teamcolorcodes.com/kent-state-golden-flashes-color-codes/",
  },
  kentucky: {
    primary: "#0033A0",
    secondary: "#FFFFFF",
    sourceUrl: "https://teamcolorcodes.com/kentucky-wildcats-color-codes/",
  },
  liberty: {
    primary: "#002D62",
    secondary: "#C41230",
    sourceUrl: "https://teamcolorcodes.com/liberty-flames-color-codes/",
  },
  "louisiana": {
    primary: "#CE181E",
    secondary: "#0A0203",
    sourceUrl: "https://teamcolorcodes.com/louisiana-ragin-cajuns-color-codes/",
  },
  "louisiana-monroe": {
    primary: "#840029",
    secondary: "#FDB913",
    sourceUrl: "https://teamcolorcodes.com/louisiana-monroe-warhawks-color-codes/",
  },
  "louisiana-tech": {
    primary: "#002F8B",
    secondary: "#E31B23",
    sourceUrl: "https://teamcolorcodes.com/louisiana-tech-bulldogs-color-codes/",
  },
  "louisville": {
    primary: "#AD0000",
    secondary: "#000000",
    sourceUrl: "https://teamcolorcodes.com/louisville-cardinals-color-codes/",
  },
  lsu: {
    primary: "#461D7C",
    secondary: "#FDD023",
    sourceUrl: "https://teamcolorcodes.com/lsu-tigers-color-codes/",
  },
  marshall: {
    primary: "#00B140",
    secondary: "#A2AAAD",
    sourceUrl: "https://teamcolorcodes.com/marshall-thundering-herd-color-codes/",
  },
  "maryland": {
    primary: "#E03A3E",
    secondary: "#FFD520",
    sourceUrl: "https://teamcolorcodes.com/maryland-terrapins-color-codes/",
  },
  "memphis": {
    primary: "#003087",
    secondary: "#898D8D",
    sourceUrl: "https://teamcolorcodes.com/memphis-tigers-color-codes/",
  },
  "miami-fl": {
    primary: "#F47321",
    secondary: "#005030",
    sourceUrl: "https://teamcolorcodes.com/miami-hurricanes-color-codes/",
  },
  "miami-oh": {
    primary: "#B61E2E",
    secondary: "#000000",
    sourceUrl: "https://teamcolorcodes.com/miami-oh-redhawks-color-codes/",
  },
  "michigan": {
    primary: "#00274C",
    secondary: "#FFCB05",
    sourceUrl: "https://teamcolorcodes.com/michigan-wolverines-color-codes/",
  },
  "michigan-state": {
    primary: "#18453B",
    secondary: "#FFFFFF",
    sourceUrl: "https://teamcolorcodes.com/michigan-state-spartans-color-codes/",
  },
  "middle-tennessee": {
    primary: "#0066CC",
    secondary: "#000000",
    sourceUrl: "https://teamcolorcodes.com/middle-tennessee-color-codes/",
  },
  "minnesota": {
    primary: "#7A0019",
    secondary: "#FFCC33",
    sourceUrl: "https://teamcolorcodes.com/minnesota-wild-color-codes/",
  },
  "mississippi-state": {
    primary: "#660000",
    secondary: "#FFFFFF",
    sourceUrl: "https://teamcolorcodes.com/mississippi-state-bulldogs-color-codes/",
  },
  "missouri": {
    primary: "#000000",
    secondary: "#F1B82D",
    sourceUrl: "https://teamcolorcodes.com/missouri-western-griffons-color-codes/",
  },
  "missouri-state": {
    primary: "#5E0009",
    secondary: "#FFFFFF",
    sourceUrl: "https://teamcolorcodes.com/missouri-state-bears-color-codes/",
  },
  "navy": {
    primary: "#00205B",
    secondary: "#C5B783",
    sourceUrl: "https://teamcolorcodes.com/navy-midshipmen-color-codes/",
  },
  "nc-state": {
    primary: "#CC0000",
    secondary: "#000000",
    sourceUrl: "https://teamcolorcodes.com/nc-state-wolfpack-color-codes/",
  },
  nebraska: {
    primary: "#E41C38",
    secondary: "#FDF2D9",
    sourceUrl: "https://teamcolorcodes.com/nebraska-cornhuskers-color-codes/",
  },
  "nevada": {
    primary: "#003366",
    secondary: "#807F84",
    sourceUrl: "https://teamcolorcodes.com/nevada-wolfpack-color-codes/",
  },
  "new-mexico": {
    primary: "#BA0C2F",
    secondary: "#63666A",
    sourceUrl: "https://teamcolorcodes.com/new-mexico-lobos-color-codes/",
  },
  "new-mexico-state": {
    primary: "#861F41",
    secondary: "#97999B",
    sourceUrl: "https://teamcolorcodes.com/new-mexico-lobos-color-codes/",
  },
  "north-carolina": {
    primary: "#7BAFD4",
    secondary: "#FFFFFF",
    sourceUrl: "https://teamcolorcodes.com/north-carolina-tar-heels-color-codes/",
  },
  "north-texas": {
    primary: "#00853E",
    secondary: "#000000",
    sourceUrl: "https://teamcolorcodes.com/north-texas-mean-green-color-codes/",
  },
  "northern-illinois": {
    primary: "#BA0C2F",
    secondary: "#8A8D8F",
    sourceUrl: "https://teamcolorcodes.com/northern-illinois-huskies-color-codes/",
  },
  "northwestern": {
    primary: "#4E2A84",
    secondary: "#FFFFFF",
    sourceUrl: "https://teamcolorcodes.com/northwestern-wildcats-color-codes/",
  },
  "notre-dame": {
    primary: "#0C2340",
    secondary: "#C99700",
    sourceUrl: "https://teamcolorcodes.com/notre-dame-fighting-irish-color-codes/",
  },
  "ohio": {
    primary: "#00694E",
    secondary: "#CDA077",
    sourceUrl: "https://teamcolorcodes.com/ohio-bobcats-color-codes/",
  },
  "ohio-state": {
    primary: "#BB0000",
    secondary: "#666666",
    sourceUrl: "https://teamcolorcodes.com/ohio-state-buckeyes-color-codes/",
  },
  "oklahoma": {
    primary: "#841617",
    secondary: "#FDF9D8",
    sourceUrl: "https://teamcolorcodes.com/oklahoma-city-thunder-color-codes/",
  },
  "oklahoma-state": {
    primary: "#FF7300",
    secondary: "#000000",
    sourceUrl: "https://teamcolorcodes.com/oklahoma-state-cowboys-color-codes/",
  },
  "old-dominion": {
    primary: "#003057",
    secondary: "#7C878E",
    sourceUrl: "https://teamcolorcodes.com/old-dominion-monarchs-color-codes/",
  },
  "ole-miss": {
    primary: "#006BA6",
    secondary: "#CE1126",
    sourceUrl: "https://teamcolorcodes.com/ole-miss-rebels-color-codes/",
  },
  "oregon": {
    primary: "#154733",
    secondary: "#FEE123",
    sourceUrl: "https://teamcolorcodes.com/oregon-ducks-color-codes/",
  },
  "oregon-state": {
    primary: "#DC4405",
    secondary: "#000000",
    sourceUrl: "https://teamcolorcodes.com/oregon-state-beavers-color-codes/",
  },
  "penn-state": {
    primary: "#041E42",
    secondary: null,
    sourceUrl: "https://teamcolorcodes.com/penn-state-nittany-lions-color-codes/",
  },
  "pitt": {
    primary: "#003594",
    secondary: "#FFB81C",
    sourceUrl: "https://teamcolorcodes.com/pitt-johnstown-mountain-cats-color-codes/",
  },
  purdue: {
    primary: "#CEB888",
    secondary: "#000000",
    sourceUrl: "https://teamcolorcodes.com/purdue-boilermakers-color-codes/",
  },
  "rice": {
    primary: "#00205B",
    secondary: "#C1C6C8",
    sourceUrl: "https://teamcolorcodes.com/rice-owls-color-codes/",
  },
  rutgers: {
    primary: "#CC0033",
    secondary: "#000000",
    sourceUrl: "https://teamcolorcodes.com/rutgers-scarlet-knights-color-codes/",
  },
  "sam-houston": {
    primary: "#FE5100",
    secondary: "#FFFFFF",
    sourceUrl: "https://teamcolorcodes.com/sam-houston-state-bearkats-color-codes/",
  },
  "san-diego-state": {
    primary: "#A6192E",
    secondary: "#000000",
    sourceUrl: "https://teamcolorcodes.com/san-diego-state-aztecs-color-codes/",
  },
  "san-jose-state": {
    primary: "#0055A2",
    secondary: "#E5A823",
    sourceUrl: "https://teamcolorcodes.com/san-jose-state-spartans-color-codes/",
  },
  "smu": {
    primary: "#0033A0",
    secondary: "#C8102E",
    sourceUrl: "https://teamcolorcodes.com/smu-mustangs-color-codes/",
  },
  "south-alabama": {
    primary: "#00205B",
    secondary: "#BF0D3E",
    sourceUrl: "https://teamcolorcodes.com/south-alabama-jaguars-color-codes/",
  },
  "south-carolina": {
    primary: "#73000A",
    secondary: "#000000",
    sourceUrl: "https://teamcolorcodes.com/south-carolina-gamecocks-color-codes/",
  },
  "south-florida": {
    primary: "#006747",
    secondary: "#CFC493",
    sourceUrl: "https://teamcolorcodes.com/south-florida-bulls-color-codes/",
  },
  "southern-miss": {
    primary: "#000000",
    secondary: "#FFAB00",
    sourceUrl: "https://teamcolorcodes.com/southern-miss-golden-eagles-color-codes/",
  },
  stanford: {
    primary: "#8C1515",
    secondary: "#FFFFFF",
    sourceUrl: "https://teamcolorcodes.com/stanford-cardinal-color-codes/",
  },
  "syracuse": {
    primary: "#F76900",
    secondary: "#000E54",
    sourceUrl: "https://teamcolorcodes.com/syracuse-orange-color-codes/",
  },
  tcu: {
    primary: "#4D1979",
    secondary: "#A3A9AC",
    sourceUrl: "https://teamcolorcodes.com/tcu-horned-frogs-color-codes/",
  },
  "temple": {
    primary: "#9D2235",
    secondary: "#FFFFFF",
    sourceUrl: "https://teamcolorcodes.com/temple-owls-color-codes/",
  },
  "tennessee": {
    primary: "#FF8200",
    secondary: "#FFFFFF",
    sourceUrl: "https://teamcolorcodes.com/tennessee-volunteers-color-codes/",
  },
  texas: {
    primary: "#BF5700",
    secondary: "#FFFFFF",
    sourceUrl: "https://teamcolorcodes.com/texas-longhorns-color-codes/",
  },
  "texas-am": {
    primary: "#500000",
    secondary: "#FFFFFF",
    sourceUrl: "https://teamcolorcodes.com/texas-am-aggies-color-codes/",
  },
  "texas-state": {
    primary: "#501214",
    secondary: "#8D734A",
    sourceUrl: "https://teamcolorcodes.com/texas-state-bobcats-color-codes/",
  },
  "texas-tech": {
    primary: "#CC0000",
    secondary: "#000000",
    sourceUrl: "https://teamcolorcodes.com/texas-tech-red-raiders-color-codes/",
  },
  toledo: {
    primary: "#15397F",
    secondary: "#FFDA00",
    sourceUrl: "https://teamcolorcodes.com/toledo-rockets-color-codes/",
  },
  troy: {
    primary: "#8A2432",
    secondary: "#B3B5B8",
    sourceUrl: "https://teamcolorcodes.com/troy-trojans-color-codes/",
  },
  "tulane": {
    primary: "#006747",
    secondary: "#418FDE",
    sourceUrl: "https://teamcolorcodes.com/tulane-green-wave-color-codes/",
  },
  "tulsa": {
    primary: "#002D72",
    secondary: "#C5B783",
    sourceUrl: "https://teamcolorcodes.com/tulsa-golden-hurricane-color-codes/",
  },
  "uab": {
    primary: "#006341",
    secondary: "#CC8A00",
    sourceUrl: "https://teamcolorcodes.com/uab-blazers-color-codes/",
  },
  "ucf": {
    primary: "#000000",
    secondary: "#BA9B37",
    sourceUrl: "https://teamcolorcodes.com/ucf-knights-color-codes/",
  },
  "ucla": {
    primary: "#2D68C4",
    secondary: "#F2A900",
    sourceUrl: "https://teamcolorcodes.com/ucla-bruins-color-codes/",
  },
  uconn: {
    primary: "#000E2F",
    secondary: "#FFFFFF",
    sourceUrl: "https://teamcolorcodes.com/connecticut-huskies-color-codes/",
  },
  "umass": {
    primary: "#572932",
    secondary: "#B1B3B3",
    sourceUrl: "https://teamcolorcodes.com/massachusetts-minutemen-color-codes/",
  },
  "unlv": {
    primary: "#CF0A2C",
    secondary: "#000000",
    sourceUrl: "https://teamcolorcodes.com/unlv-rebels-color-codes/",
  },
  "usc": {
    primary: "#990000",
    secondary: "#FFC72C",
    sourceUrl: "https://teamcolorcodes.com/usc-aiken-pacers-color-codes/",
  },
  utah: {
    primary: "#CC0000",
    secondary: "#808080",
    sourceUrl: "https://teamcolorcodes.com/utah-utes-color-codes/",
  },
  "utah-state": {
    primary: "#00263A",
    secondary: "#8A8D8F",
    sourceUrl: "https://teamcolorcodes.com/utah-state-aggies-color-codes/",
  },
  "utep": {
    primary: "#FF8200",
    secondary: "#041E42",
    sourceUrl: "https://teamcolorcodes.com/utep-miners-color-codes/",
  },
  "utsa": {
    primary: "#F15A22",
    secondary: "#0C2340",
    sourceUrl: "https://teamcolorcodes.com/utsa-roadrunners-color-codes/",
  },
  "vanderbilt": {
    primary: "#000000",
    secondary: "#866D4B",
    sourceUrl: "https://teamcolorcodes.com/vanderbilt-commodores-color-codes/",
  },
  "virginia": {
    primary: "#232D4B",
    secondary: "#F84C1E",
    sourceUrl: "https://teamcolorcodes.com/virginia-cavaliers-color-codes/",
  },
  "virginia-tech": {
    primary: "#630031",
    secondary: "#CF4420",
    sourceUrl: "https://teamcolorcodes.com/virginia-tech-hokies-color-codes/",
  },
  "wake-forest": {
    primary: "#9E7E38",
    secondary: "#000000",
    sourceUrl: "https://teamcolorcodes.com/wake-forest-demon-deacons-color-codes/",
  },
  washington: {
    primary: "#4B2E83",
    secondary: "#B7A57A",
    sourceUrl: "https://teamcolorcodes.com/washington-huskies-color-codes/",
  },
  "washington-state": {
    primary: "#981E32",
    secondary: "#5E6A71",
    sourceUrl: "https://teamcolorcodes.com/washington-state-cougars-color-codes/",
  },
  "west-virginia": {
    primary: "#002855",
    secondary: "#EAAA00",
    sourceUrl: "https://teamcolorcodes.com/west-virginia-mountaineers-color-codes/",
  },
  "western-kentucky": {
    primary: "#C60C30",
    secondary: "#1E1E1E",
    sourceUrl: "https://teamcolorcodes.com/western-kentucky-hilltoppers-color-codes/",
  },
  "western-michigan": {
    primary: "#6C4023",
    secondary: "#B5A167",
    sourceUrl: "https://teamcolorcodes.com/western-michigan-broncos-color-codes/",
  },
  wisconsin: {
    primary: "#C5050C",
    secondary: "#FFFFFF",
    sourceUrl: "https://teamcolorcodes.com/wisconsin-badgers-color-codes/",
  },
  wyoming: {
    primary: "#FFC425",
    secondary: "#492F24",
    sourceUrl: "https://teamcolorcodes.com/wyoming-cowboys-color-codes/",
  },
};

export const TEAM_COLOR_ALIASES: Record<string, string> = {
  floridaatlantic: "florida-atlantic",
  floridainternational: "fiu",
  miami: "miami-fl",
};
