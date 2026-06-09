/** Official university domain for club/committee login accounts */
export const OFFICIAL_EMAIL_DOMAIN = '@dau.ac.in';

export function isOfficialCommitteeEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith(OFFICIAL_EMAIL_DOMAIN) && normalized.length > OFFICIAL_EMAIL_DOMAIN.length;
}
