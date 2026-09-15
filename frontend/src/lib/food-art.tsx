import type { ReactElement, ReactNode } from 'react';

type FoodArtProps = { className?: string };

function Svg({ className, children }: { className?: string | undefined; children: ReactNode }) {
  return (
    <svg className={className} viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
      {children}
    </svg>
  );
}

function Banana({ className }: FoodArtProps) {
  return (
    <Svg className={className}>
      <rect width="40" height="40" rx="12" fill="#F4E7B0" />
      <path d="M10 24c8 10 20 8 22-2 1-6-4-10-10-8-5 2-10 4-12 10Z" fill="#E6C84A" />
      <path d="M12 22c6 8 16 7 18-1" fill="none" stroke="#C9A62A" strokeWidth="1.4" />
    </Svg>
  );
}

function Apple({ className }: FoodArtProps) {
  return (
    <Svg className={className}>
      <rect width="40" height="40" rx="12" fill="#F3D9D0" />
      <circle cx="20" cy="23" r="10" fill="#D36B4A" />
      <path d="M20 10c2 3 1 6 0 7" fill="none" stroke="#3D5640" strokeWidth="1.8" />
      <ellipse cx="24" cy="12" rx="4" ry="2.2" fill="#4E6B51" />
    </Svg>
  );
}

function Egg({ className }: FoodArtProps) {
  return (
    <Svg className={className}>
      <rect width="40" height="40" rx="12" fill="#F3E6C8" />
      <ellipse cx="20" cy="21" rx="9" ry="12" fill="#F7F1DE" />
      <circle cx="20" cy="23" r="4.5" fill="#E6C84A" />
    </Svg>
  );
}

function Bowl({ className }: FoodArtProps) {
  return (
    <Svg className={className}>
      <rect width="40" height="40" rx="12" fill="#E7EEE8" />
      <path d="M8 18h24c-1 10-6 14-12 14S9 28 8 18Z" fill="#C9A15A" />
      <path d="M10 16c3-4 17-4 20 0" fill="none" stroke="#8A6A2E" strokeWidth="1.6" />
    </Svg>
  );
}

function ToastArt({ className }: FoodArtProps) {
  return (
    <Svg className={className}>
      <rect width="40" height="40" rx="12" fill="#F3E6C8" />
      <rect x="10" y="11" width="20" height="18" rx="4" fill="#E2B56A" />
      <rect x="13" y="14" width="14" height="12" rx="3" fill="#F4D9A0" />
    </Svg>
  );
}

function Yogurt({ className }: FoodArtProps) {
  return (
    <Svg className={className}>
      <rect width="40" height="40" rx="12" fill="#E8EEF2" />
      <rect x="12" y="12" width="16" height="18" rx="4" fill="#F7F4EE" />
      <path d="M12 18h16" stroke="#D36B4A" strokeWidth="3" />
    </Svg>
  );
}

function Rice({ className }: FoodArtProps) {
  return (
    <Svg className={className}>
      <rect width="40" height="40" rx="12" fill="#EEE8DC" />
      <ellipse cx="20" cy="24" rx="12" ry="7" fill="#D8C8A4" />
      <circle cx="16" cy="22" r="1.4" fill="#F7F1DE" />
      <circle cx="21" cy="21" r="1.4" fill="#F7F1DE" />
      <circle cx="25" cy="23" r="1.4" fill="#F7F1DE" />
    </Svg>
  );
}

function Flatbread({ className }: FoodArtProps) {
  return (
    <Svg className={className}>
      <rect width="40" height="40" rx="12" fill="#F3E2C8" />
      <ellipse cx="20" cy="21" rx="12" ry="10" fill="#E2B56A" />
      <ellipse cx="20" cy="21" rx="8" ry="6" fill="#F0C980" />
    </Svg>
  );
}

function Chicken({ className }: FoodArtProps) {
  return (
    <Svg className={className}>
      <rect width="40" height="40" rx="12" fill="#F3D9D0" />
      <path d="M11 24c2-8 16-10 18-2 1 6-6 10-12 9-5 0-7-3-6-7Z" fill="#D36B4A" />
    </Svg>
  );
}

function Fish({ className }: FoodArtProps) {
  return (
    <Svg className={className}>
      <rect width="40" height="40" rx="12" fill="#DCE7EF" />
      <path d="M8 21c8-8 16-8 22 0-6 8-14 8-22 0Z" fill="#5D7A94" />
      <circle cx="26" cy="20" r="1.4" fill="#F7F4EE" />
      <path d="M8 21l-3-4v8l3-4Z" fill="#4E6B51" />
    </Svg>
  );
}

function Salad({ className }: FoodArtProps) {
  return (
    <Svg className={className}>
      <rect width="40" height="40" rx="12" fill="#E7EEE8" />
      <ellipse cx="20" cy="25" rx="12" ry="6" fill="#4E6B51" />
      <circle cx="15" cy="20" r="5" fill="#6F8F6E" />
      <circle cx="24" cy="18" r="5" fill="#3D5640" />
      <circle cx="22" cy="23" r="3" fill="#D36B4A" />
    </Svg>
  );
}

function Nut({ className }: FoodArtProps) {
  return (
    <Svg className={className}>
      <rect width="40" height="40" rx="12" fill="#F0E0C8" />
      <ellipse cx="20" cy="22" rx="8" ry="10" fill="#C9A15A" />
      <path d="M20 12v20" stroke="#8A6A2E" strokeWidth="1.4" />
    </Svg>
  );
}

function Milk({ className }: FoodArtProps) {
  return (
    <Svg className={className}>
      <rect width="40" height="40" rx="12" fill="#E8EEF2" />
      <path d="M15 10h10l3 6v16a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3V16l3-6Z" fill="#F7F4EE" />
      <rect x="14" y="16" width="12" height="4" fill="#4E6B51" />
    </Svg>
  );
}

function Idli({ className }: FoodArtProps) {
  return (
    <Svg className={className}>
      <rect width="40" height="40" rx="12" fill="#EEE8DC" />
      <ellipse cx="20" cy="22" rx="11" ry="7" fill="#F7F1DE" />
      <ellipse cx="20" cy="20" rx="8" ry="4" fill="#E8DCC0" />
    </Svg>
  );
}

function Cheese({ className }: FoodArtProps) {
  return (
    <Svg className={className}>
      <rect width="40" height="40" rx="12" fill="#F4E7B0" />
      <path d="M8 26 20 10l12 16H8Z" fill="#E6C84A" />
      <circle cx="18" cy="20" r="1.6" fill="#C9A62A" />
      <circle cx="23" cy="24" r="1.4" fill="#C9A62A" />
    </Svg>
  );
}

function Coffee({ className }: FoodArtProps) {
  return (
    <Svg className={className}>
      <rect width="40" height="40" rx="12" fill="#E8EEF2" />
      <path d="M12 16h14v12a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5V16Z" fill="#F7F4EE" />
      <path d="M26 18h3a4 4 0 0 1 0 8h-3" fill="none" stroke="#5D7A94" strokeWidth="1.6" />
      <path d="M16 11c1 2 1 4 0 5M21 10c1 2 1 4 0 5" fill="none" stroke="#7A756E" strokeWidth="1.4" />
    </Svg>
  );
}

function Chips({ className }: FoodArtProps) {
  return (
    <Svg className={className}>
      <rect width="40" height="40" rx="12" fill="#F4E7B0" />
      <ellipse cx="18" cy="22" rx="8" ry="11" transform="rotate(-18 18 22)" fill="#E6C84A" />
      <ellipse cx="24" cy="20" rx="7" ry="10" transform="rotate(16 24 20)" fill="#C9A15A" />
    </Svg>
  );
}

const KIND_MAP: Array<{ test: RegExp; Art: (props: FoodArtProps) => ReactElement }> = [
  { test: /banana/, Art: Banana },
  { test: /apple/, Art: Apple },
  { test: /egg/, Art: Egg },
  { test: /coffee|latte|espresso|cappuccino/, Art: Coffee },
  { test: /oat|oatmeal|upma|poha/, Art: Bowl },
  { test: /toast|bread/, Art: ToastArt },
  { test: /yogurt|yoghurt/, Art: Yogurt },
  { test: /rice/, Art: Rice },
  { test: /chapati|roti|naan/, Art: Flatbread },
  { test: /chicken/, Art: Chicken },
  { test: /salmon|fish/, Art: Fish },
  { test: /salad/, Art: Salad },
  { test: /almond|nut/, Art: Nut },
  { test: /milk/, Art: Milk },
  { test: /idli|dosa/, Art: Idli },
  { test: /chip|crisp|potato/, Art: Chips },
  { test: /paneer|cheese/, Art: Cheese },
];

export function foodArtForName(name: string): (props: FoodArtProps) => ReactElement {
  const haystack = name.trim().toLowerCase();
  const match = KIND_MAP.find((row) => row.test.test(haystack));
  return match?.Art ?? Bowl;
}

export const FloatingFoods = [Banana, Apple, Egg, Salad, ToastArt, Fish];
