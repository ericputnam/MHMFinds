/**
 * Shared denylist for "garbage" author values that should never be written to the DB.
 *
 * Historically, the MHM scraper extracted URL path segments (like "Title", "ShRef", "Id")
 * as author names. This module consolidates the denylist so both the cleanup script
 * and the live scraper reject the same bad candidates.
 *
 * See also: scripts/cleanup-author-data.ts and
 * lib/services/scraperExtraction/authorExtractor.ts
 */

/**
 * String tokens that indicate the "author" was actually a URL path segment,
 * placeholder text, or navigation chrome. Matched case-insensitively after trim.
 */
const BAD_AUTHOR_TOKENS = [
  // Original patterns from scripts/cleanup-author-data.ts
  'Title',
  'ShRef',
  'Id',
  'Www',
  'Simsfinds',
  'CurseForge Creator',
  'ModTheSims Community',
  'TSR Creator',
  'Wixsite',
  'Blogspot',
  'Amazon',
  'Amzn',
  'Tistory',
  'Google',
  'Early Access',
  'posts',
  'Creator Terms of Use',
  'Terms of Use',
  'Privacy Policy',
  'Contact',
  'About',
  'Home',
  'Downloads',
  'Categories',
  'Search',
  'Members',

  // Additional hardcoded rejections (Phase 2)
  'Post',
  'Download',
  'Free',
  'CC',
  'Mod',
  'Mods',
  'Unknown',
  'Admin',
  'User',
  'Author',
  'Creator',

  // File-host chrome words that sometimes sneak through og:site_name when the
  // destination page is a generic file viewer rather than a creator profile.
  'Drive',
  'Dropbox',
  'Mediafire',
  'Mega',
  'Simfileshare',
  'Google Drive',
  'Google Docs',

  // Sims content-type words that sometimes appear as the leading slug-segment
  // of a Patreon /posts/{topic-words}-{id} URL when the slug has no creator
  // prefix. The fromPatreonPostSlug strategy uses this denylist to reject
  // candidates like "Crown" or "Butterfly" that are obviously topic-words and
  // not creator handles.
  //
  // Rule of thumb: only add words that are CLEARLY content-type or generic
  // English filler. Do NOT add proper-noun-like words (e.g., "Phaedra",
  // "Vixen", "Flora") because those could be legitimate creator handles.
  // We match the WHOLE candidate (case-insensitive), so legitimate creators
  // like "ButterflySims" or "CrownDesigns" still pass.

  // Anatomy / body parts
  'Tattoo', 'Tattoos', 'Hair', 'Skin', 'Eye', 'Eyes', 'Lash', 'Lashes',
  'Brow', 'Brows', 'Eyebrow', 'Eyebrows', 'Lip', 'Lips', 'Lipstick',
  'Blush', 'Nose', 'Ear', 'Ears', 'Nail', 'Nails', 'Beard', 'Body', 'Face',
  'Neck', 'Hand', 'Foot', 'Feet', 'Arm', 'Leg', 'Sleeve',

  // Accessories
  'Necklace', 'Necklaces', 'Earring', 'Earrings', 'Choker', 'Bracelet',
  'Ring', 'Rings', 'Glasses', 'Pendant', 'Watch',

  // Common visual elements (extremely generic)
  'Crown', 'Heart', 'Star', 'Stars', 'Moon', 'Sun', 'Cloud', 'Rose',
  'Roses', 'Flower', 'Flowers', 'Butterfly', 'Skull', 'Diamond', 'Pearl',

  // Clothing / outfits
  'Outfit', 'Outfits', 'Dress', 'Skirt', 'Shorts', 'Pants', 'Jeans',
  'Top', 'Tops', 'Shirt', 'Sweater', 'Hoodie', 'Jacket', 'Coat', 'Shoes',
  'Boots', 'Hat', 'Cap', 'Mask', 'Bag', 'Corset', 'Tee', 'Tees', 'Blouse',
  'Lingerie', 'Swimsuit',

  // Game features / object types
  'Pose', 'Poses', 'Trait', 'Traits', 'Career', 'Careers', 'Pregnancy',
  'Wallpaper', 'Floor', 'Couch', 'Chair', 'Bed', 'Room', 'Living',
  'Bedroom', 'Kitchen', 'Bathroom', 'Decor', 'Clutter', 'Furniture',
  'Edge', 'Edges', 'Pack', 'Set', 'Sets', 'Bundle', 'Collection',

  // Generic adjectives commonly used as title openers (not creator names)
  'Simple', 'Random', 'Old', 'New', 'Modern', 'Cute', 'Pretty', 'Beautiful',
  'Ugly', 'Bold', 'Soft', 'Hard', 'Big', 'Small', 'Little', 'Tiny', 'Huge',
  'Cyber', 'Sigilism', 'Whimsical', 'Vintage', 'Retro', 'Classic',
  'Sweet', 'Spicy', 'Sour', 'Bitter', 'Plain',
  'Drunken', 'Snatched', 'Stretched', 'Tension', 'Trouble', 'Romantic',
  'Floating', 'Spring', 'Summer', 'Autumn', 'Fall', 'Winter',
  'Halloween', 'Christmas', 'Valentine', 'Valentines', 'Easter',
  'Backyard', 'Garden', 'Outdoor', 'Indoor',
  'Exclusive', 'Premium', 'Standard', 'Basic',
  'Early', 'Late', 'Morning', 'Evening', 'Night',
  'Time', 'Day', 'Year', 'Month', 'Week',

  // Generic English filler that shows up as URL slug starters
  'There', 'Will', 'Be', 'My', 'Our', 'Your',
  'Always', 'Never', 'Sometimes', 'Often',
  'You', 'Me', 'They', 'We', 'They',
  'More', 'Less', 'All', 'Some', 'Any', 'Every',
  'Don', 'Dont', 'Cant', 'Wont', 'Isnt',
  'February', 'January', 'March', 'April', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',

  // Common pose-pack / object-set wrap labels (not creator names)
  'Posepack', 'Pairedselfie', 'Cupidcore', 'Kisscam', 'Kiss', 'Hug',
  'Bood', 'Boo', 'Cored', 'Corned',

  // Generic prefixes / category labels
  'Ts4', 'Sims4', 'Sims', 'Sim', 'Maxis', 'Match', 'Cas', 'Acc',
  'Preview', 'Demo', 'Update', 'Ingame', 'Ver', 'Drop',
  'Adult', 'Toddler', 'Child', 'Children', 'Teen', 'Kids', 'Baby',
  'Male', 'Female', 'Unisex', 'Men', 'Women',
  'Default', 'Functional', 'Aesthetic', 'Enhanced', 'Additional',
  'Hollywood', 'Vanilla', 'Bape', 'Stand', 'Tooth', 'Teeth',
  'Real', 'Print', 'Smile', 'Merry', 'Happy', 'Tanya',
  'Class', 'Presets', 'Business', 'Hobbies', 'Ghibli',

  // Generic English filler that shows up as URL slug starters
  'There', 'Will', 'Be', 'My', 'Our', 'Your',
];

/**
 * Regex patterns that catch structural garbage:
 * - Purely numeric (Patreon post IDs like "143566306")
 * - "Name 123456" pattern (title accidentally combined with post ID)
 */
export const BAD_AUTHOR_PATTERNS: RegExp[] = [
  /^\d+$/, // purely numeric
  /^[A-Za-z\s]+ \d{6,}$/, // "Maia Hair 143566306"
];

/**
 * Returns true if the candidate string is a usable author name.
 * Returns false for null/undefined/empty, denylisted tokens, numeric-only,
 * and strings shorter than 2 characters.
 *
 * This is the FINAL GATE before writing to DB. Never bypass it.
 */
export function isValidAuthor(candidate: string | null | undefined): boolean {
  if (candidate === null || candidate === undefined) return false;

  const trimmed = candidate.trim();

  // Length guard
  if (trimmed.length < 2) return false;

  // Regex patterns (numeric, title+postID)
  for (const pattern of BAD_AUTHOR_PATTERNS) {
    if (pattern.test(trimmed)) return false;
  }

  // Case-insensitive token match
  const lower = trimmed.toLowerCase();
  for (const token of BAD_AUTHOR_TOKENS) {
    if (lower === token.toLowerCase()) return false;
  }

  return true;
}

/**
 * Export the raw token list for tests and external callers that want to
 * iterate (e.g., the cleanup script's DB query building).
 */
export const BAD_AUTHOR_TOKEN_LIST: readonly string[] = BAD_AUTHOR_TOKENS;
