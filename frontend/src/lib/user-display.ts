export function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0]?.trim();
  return local && local.length > 0 ? local : email;
}

export function initialsFromEmail(email: string): string {
  const name = displayNameFromEmail(email);
  const parts = name.split(/[._\s-]+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? '';
    const second = parts[1]?.[0] ?? '';
    return `${first}${second}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
