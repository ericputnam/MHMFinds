// Shared facet tag colors for visual distinction across components

export const FACET_COLORS: Record<string, { bg: string; text: string }> = {
  // Content types
  'hair': { bg: 'bg-pink-500/20', text: 'text-pink-300' },
  'tops': { bg: 'bg-purple-500/20', text: 'text-purple-300' },
  'bottoms': { bg: 'bg-blue-500/20', text: 'text-blue-300' },
  'dresses': { bg: 'bg-pink-500/20', text: 'text-pink-300' },
  'shoes': { bg: 'bg-orange-500/20', text: 'text-orange-300' },
  'accessories': { bg: 'bg-violet-500/20', text: 'text-violet-300' },
  'jewelry': { bg: 'bg-cyan-500/20', text: 'text-cyan-300' },
  'makeup': { bg: 'bg-rose-500/20', text: 'text-rose-300' },
  'furniture': { bg: 'bg-amber-500/20', text: 'text-amber-300' },
  'lighting': { bg: 'bg-yellow-500/20', text: 'text-yellow-300' },
  'decor': { bg: 'bg-red-500/20', text: 'text-red-300' },
  'poses': { bg: 'bg-orange-500/20', text: 'text-orange-300' },
  'gameplay-mod': { bg: 'bg-indigo-500/20', text: 'text-indigo-300' },
  'script-mod': { bg: 'bg-violet-500/20', text: 'text-violet-300' },
  'lot': { bg: 'bg-lime-500/20', text: 'text-lime-300' },
  // Visual styles
  'alpha': { bg: 'bg-pink-500/20', text: 'text-pink-300' },
  'maxis-match': { bg: 'bg-purple-500/20', text: 'text-purple-300' },
  // Themes
  'christmas': { bg: 'bg-red-500/20', text: 'text-red-300' },
  'halloween': { bg: 'bg-orange-500/20', text: 'text-orange-300' },
  'cottagecore': { bg: 'bg-green-500/20', text: 'text-green-300' },
  'y2k': { bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-300' },
  'goth': { bg: 'bg-slate-500/20', text: 'text-slate-300' },
  'modern': { bg: 'bg-gray-500/20', text: 'text-gray-300' },
  'vintage': { bg: 'bg-amber-500/20', text: 'text-amber-300' },
  'fantasy': { bg: 'bg-violet-500/20', text: 'text-violet-300' },
  // Age groups
  'infant': { bg: 'bg-pink-500/20', text: 'text-pink-300' },
  'toddler': { bg: 'bg-orange-500/20', text: 'text-orange-300' },
  'child': { bg: 'bg-yellow-500/20', text: 'text-yellow-300' },
  'teen': { bg: 'bg-green-500/20', text: 'text-green-300' },
  'young-adult': { bg: 'bg-cyan-500/20', text: 'text-cyan-300' },
  'adult': { bg: 'bg-blue-500/20', text: 'text-blue-300' },
  'elder': { bg: 'bg-purple-500/20', text: 'text-purple-300' },
  'all-ages': { bg: 'bg-indigo-500/20', text: 'text-indigo-300' },
  // Gender
  'feminine': { bg: 'bg-pink-500/20', text: 'text-pink-300' },
  'masculine': { bg: 'bg-blue-500/20', text: 'text-blue-300' },
  'unisex': { bg: 'bg-purple-500/20', text: 'text-purple-300' },
  // Default
  'default': { bg: 'bg-slate-500/20', text: 'text-slate-300' },
};

export function getFacetColor(value: string): { bg: string; text: string } {
  return FACET_COLORS[value.toLowerCase()] || FACET_COLORS['default'];
}

export function formatFacetLabel(value: string): string {
  return value
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
