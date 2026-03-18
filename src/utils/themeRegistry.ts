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

/**
 * Fallback Emoji Matrix (8 Categories x 8 Items)
 */
export const FALLBACK_THEME: string[][] = [
  // 0: Faces
  ['😀', '😎', '🧐', '🤓', '🤠', '🤡', '😏', '😇'],
  // 1: Houses
  ['🏠', '🏡', '🏰', '🏯', '🏢', '🏚', '⛺', '🛖'],
  // 2: Pets
  ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐹', '🐭'],
  // 3: Tech
  ['💻', '📱', '⌨️', '🖥️', '🖱️', '🔋', '🔌', '🖨️'],
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
