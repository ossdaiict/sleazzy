// Set of successfully downloaded/available local logo filenames (without extension)
const AVAILABLE_LOCAL_LOGOS = new Set<string>([
  'academic_committee',
  'ai_club',
  'annual_festival_committee',
  'business_club',
  'cafeteria_management_committee',
  'chess_club',
  'cubing_club',
  'cultural_committee',
  'dadc',
  'debate_club',
  'dtg',
  'ehc',
  'election_commission',
  'film_club',
  'gdg',
  'headrush',
  'heritage_club',
  'hostel_management_committee',
  'ieee_sb',
  'khelaiya_club',
  'microsoft_students_technical_club',
  'muse',
  'music_club',
  'pmmc',
  'press_club',
  'radio_club',
  'readers_society',
  'research_club',
  'sambhav',
  'sports_committee',
  'student_placement_cell',
]);

const cleanNameForFilename = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

/**
 * Returns the path to the local logo of the club/committee.
 * Returns null if no logo is available locally for that name.
 */
export const getClubLogoUrl = (clubName: string): string | null => {
  if (!clubName) return null;

  const cleanName = cleanNameForFilename(clubName);
  if (AVAILABLE_LOCAL_LOGOS.has(cleanName)) {
    return `/logos/${cleanName}.png`;
  }
  
  return null;
};

/**
 * Returns the tailwind background color class for the logo container.
 * White transparent logos get a dark background, others get a white background.
 */
export const getLogoBgClass = (clubName: string): string => {
  if (!clubName) return 'bg-white';
  const cleanName = cleanNameForFilename(clubName);
  const darkLogos = new Set<string>([
    'film_club',
    'radio_club',
  ]);
  return darkLogos.has(cleanName) ? 'bg-slate-900' : 'bg-white';
};
