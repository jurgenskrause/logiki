/**
 * Theme Registry Utility
 * Bridges engine numeric indices to visual assets.
 */

/**
 * Constructs the path for a theme asset.
 * Format: /theme/${themeName}/${catIndex}-${itemIndex}.webp
 */
export function getAsset(themeName: string, catIndex: number, itemIndex: number): string {
  return `/theme/${themeName}/${catIndex}-${itemIndex}.webp`;
}

export const CATEGORY_COLORS = [
  'bg-red-200 dark:bg-red-900/60',
  'bg-blue-200 dark:bg-blue-900/60',
  'bg-emerald-200 dark:bg-emerald-900/60',
  'bg-amber-200 dark:bg-amber-900/60',
  'bg-purple-200 dark:bg-purple-900/60',
  'bg-pink-200 dark:bg-pink-900/60',
  'bg-orange-200 dark:bg-orange-900/60',
  'bg-cyan-200 dark:bg-cyan-900/60',
];

/**
 * Fallback Emoji Matrix (8 Categories x 8 Items)
 */
export const FALLBACK_THEME: string[][] = [
  // 0: Characters / Occupations
  ['🧔🏾‍♂️', '👷🏼‍♀️', '🥷', '🧑🏽‍🎓', '👮🏾', '👵🏻', '🧑🏼‍🎨', '👩🏿‍⚕️'],
  // 1: Houses
  ['🏠', '🏛️', '🏰', '🏯', '🏢', '🏚', '⛺', '🛖'],
  // 2: Pets
  ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐹', '🐭'],
  // 3: Vehicles
  ['🚗', '🚲', '🚅', '🚁', '🚢', '🚀', '🚜', '🛵'],
  // 4: Accessories
  ['⌚️', '🕶', '🎒', '💍', '🧣', '🧤', '👜', '🌂'],
  // 5: Numbers
  ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'],
  // 6: Flags
  ['🇮🇪', '🇬🇧', '🇺🇸', '🇯🇵', '🇫🇷', '🇩🇪', '🇰🇷', '🇧🇷'],
  // 7: Weather
  ['☀️', '🌧', '⚡️', '❄️', '☁️', '🌤️', '🌈', '🌪️']
];

/**
 * Retrieves a fallback emoji for a given category and item index.
 */
export function getFallbackEmoji(catIndex: number, itemIndex: number): string {
  const category = FALLBACK_THEME[catIndex];
  if (!category) return '❓';
  return category[itemIndex] || '❓';
}
