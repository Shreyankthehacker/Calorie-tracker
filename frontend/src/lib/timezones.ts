const IANA_ALIASES: Record<string, string> = {
  'Asia/Calcutta': 'Asia/Kolkata',
};

export function displayTimeZone(timeZone: string): string {
  return IANA_ALIASES[timeZone] ?? timeZone;
}
