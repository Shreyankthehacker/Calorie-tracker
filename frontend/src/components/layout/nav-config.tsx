import type { ReactNode } from 'react';

function Icon({ path }: { path: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d={path} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const trackNav: Array<{ to: string; label: string; icon: ReactNode; end?: boolean }> = [
  {
    to: '/dashboard',
    label: 'Today',
    end: true,
    icon: <Icon path="M2 6.5 8 2l6 4.5V14a1 1 0 0 1-1 1h-3v-4H6v4H3a1 1 0 0 1-1-1z" />,
  },
  {
    to: '/log-meal',
    label: 'Log meal',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/meals',
    label: 'Entries log',
    icon: <Icon path="M3 3h10M3 8h10M3 13h6" />,
  },
  {
    to: '/reports',
    label: 'Reports & trends',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 13V7M7.3 13V3M11.7 13V9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/goals',
    label: 'Goals & target',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="5.2" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="8" cy="8" r="1.4" fill="currentColor" />
      </svg>
    ),
  },
];

export const toolsNav: Array<{ to: string; label: string; icon: ReactNode; sub: string }> = [
  {
    to: '/chat',
    label: 'Chat with Sage',
    sub: 'Ask about meals, swaps or your numbers',
    icon: <Icon path="M2.5 4.5h11v7h-6L4.5 14v-2.5h-2z" />,
  },
  {
    to: '/family',
    label: 'My family',
    sub: 'Track shared meals across your household',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="5.5" cy="5" r="2" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="11" cy="5.5" r="1.6" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M2 14c0-2.2 1.6-3.8 3.5-3.8S9 11.8 9 14M9.2 14c0-1.9 1.3-3.2 2.9-3.2S14.8 12.1 14.8 14"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    to: '/water',
    label: 'Water intake',
    sub: 'Log glasses and keep hydration on pace',
    icon: <Icon path="M8 2s4.2 4.8 4.2 8a4.2 4.2 0 1 1-8.4 0C3.8 6.8 8 2 8 2Z" />,
  },
  {
    to: '/bmi',
    label: 'BMI info centre',
    sub: 'Check your BMI and what it means for you',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2.5" y="2.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
        <path d="M5.5 9.5 7 11l3.5-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: '/scan',
    label: 'Barcode & label scan',
    sub: 'Scan packaging for instant nutrition facts',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2.5 3v10M5 3v10M6.6 3v10M9 3v10M10.6 3v10M13.5 3v10" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    to: '/portions',
    label: 'Portion calculator',
    sub: 'Auto-size portions to fit your remaining kcal',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M8 8V2.5M8 8l4 2.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
];

export const crumbs: Record<string, string> = {
  '/dashboard': 'Today',
  '/log-meal': 'Log meal',
  '/meals': 'Entries log',
  '/reports': 'Reports & trends',
  '/goals': 'Goals & target',
  '/chat': 'Chat with Sage',
  '/family': 'My family',
  '/water': 'Water intake',
  '/bmi': 'BMI info centre',
  '/scan': 'Barcode & label scan',
  '/portions': 'Portion calculator',
  '/import': 'Import',
};
