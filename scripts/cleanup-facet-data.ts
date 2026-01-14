#!/usr/bin/env npx tsx
/**
 * Cleanup script for fixing facet data quality issues.
 *
 * Usage (must source env first):
 *   source .env.local && npx tsx scripts/cleanup-facet-data.ts        # Report only (dry run)
 *   source .env.local && npx tsx scripts/cleanup-facet-data.ts --fix  # Apply fixes
 */

// Load environment variables first (must be before PrismaClient)
import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================================================
// GOTH DETECTION - Semantic approach using title + description
// Goth is an AESTHETIC/SUBCULTURE, not an emotion or mood
// =============================================================================

// STRONG goth indicators - if present in TITLE, definitely goth
const TITLE_GOTH_KEYWORDS = [
  // Explicit goth terms
  'goth', 'gothic',
  // Dark/spooky title words
  'witch', 'witching', 'witchy', 'vampire', 'vampiric', 'dracula',
  'demon', 'demonic', 'devil', 'satanic', 'occult',
  'skull', 'skeleton', 'coffin', 'cemetery', 'graveyard', 'tombstone',
  'haunted', 'horror', 'creepy', 'spooky', 'sinister', 'nightmare',
  'shadow', 'shadows', 'dark ', 'darkness', 'midnight', 'nocturnal',
  'hollow', 'hollows', 'widow', 'raven', 'crow', 'bat ',
  'undead', 'zombie', 'corpse', 'death', 'dead ', 'dying',
  'macabre', 'morbid', 'evil', 'wicked', 'cursed', 'doom',
  'crypt', 'dungeon', 'abyss', 'void', 'phantom', 'ghost',
  // Goth subculture
  'punk', 'grunge', 'emo', 'edgy', 'alternative'
];

// Keywords that indicate goth in description (weaker signal)
const DESC_GOTH_KEYWORDS = [
  'goth', 'gothic', 'vampire', 'skull', 'skeleton', 'pentagram', 'occult',
  'macabre', 'dark aesthetic', 'dark academia', 'witchcraft'
];

// Words that indicate NOT goth (contextual disqualifiers)
// These describe non-goth aesthetics or contexts
const NOT_GOTH_CONTEXT = [
  // Romantic/soft aesthetics
  'romantic', 'romance', 'love', 'loving', 'sweet', 'cute', 'kawaii',
  'soft', 'gentle', 'tender', 'warm', 'cozy', 'comfy',
  // Happy/positive
  'happy', 'cheerful', 'joyful', 'fun', 'playful', 'silly',
  // Nature/bright
  'sunny', 'bright', 'colorful', 'pastel', 'floral', 'flower',
  'spring', 'summer', 'beach', 'tropical', 'garden',
  // Domestic/rustic
  'farmhouse', 'cottage', 'rustic', 'country', 'barn', 'cozy',
  // Wedding/formal
  'wedding', 'bride', 'bridal', 'bridesmaid',
  // Kids/family
  'kids', 'toddler', 'child', 'baby', 'infant', 'family',
  // Casual everyday
  'casual', 'everyday', 'basic', 'simple', 'minimal',
  // Specific non-goth styles
  'boho', 'bohemian', 'preppy', 'sporty', 'athletic',
  // Poses that are clearly not goth
  'couple pose', 'couples pose', 'family pose', 'portrait pose',
  'selfie pose', 'gallery pose', 'model pose', 'fashion pose',
  'sitting pose', 'standing pose', 'walking pose',
  'pregnancy', 'maternity', 'newborn',
  // Emotional but not goth
  'breakup', 'break up', 'argument', 'crying', 'sad pose', 'emotion',
  'emotional', 'feelings', 'mood', 'moody'
];

// Seasonal themes that conflict with goth (halloween is intentionally excluded - it's goth-adjacent)
const GOTH_CONFLICTING_THEMES = ['christmas', 'easter', 'valentines', 'spring', 'summer'];

// Keywords that suggest age-specific content for objects
const AGE_SPECIFIC_KEYWORDS: Record<string, string[]> = {
  'infant': ['infant', 'baby', 'nursery', 'crib', 'bassinet', 'newborn'],
  'toddler': ['toddler', 'playpen', 'highchair', 'potty', 'sippy'],
  'child': ['child', 'children', 'kids', 'kid', 'playroom', 'toy', 'playground'],
  'teen': ['teen', 'teenager', 'teenage', 'adolescent'],
};

// =============================================================================
// GENDER DETECTION - Semantic approach using title + description + URL
// Values: masculine, feminine, unisex
// Key insight: Generic pronouns (he/she/his/her) in descriptions are often just
// about the Sims engine or general descriptions, not about the content's gender
// =============================================================================

// Strong masculine indicators - only clear indicators of masculine content
// EXCLUDES generic pronouns that appear in all descriptions
const MASCULINE_KEYWORDS = [
  // Explicit terms (whole words only, handled by regex)
  'male', 'masculine', 'guy', 'guys', 'gentleman', 'gentlemen',
  'manly', 'masc frame', 'male frame', 'male body', 'male sim',
  'for men', 'for boys', 'for guys', "men's", 'mens ',
  // Gendered items (these are definitively masculine)
  'beard', 'facial hair', 'stubble', 'mustache', 'moustache',
  'boxers', 'briefs',
];

// URL patterns for masculine (separate because they need different matching)
const MASCULINE_URL_PATTERNS = [
  '/male/', '-male-', '/men/', '-men-', '/guys/', '/masculine/',
  '-male.', '_male_', '/male-', '-male/',
];

// Strong feminine indicators - only clear indicators of feminine content
const FEMININE_KEYWORDS = [
  // Explicit terms (whole words only)
  'female', 'feminine', 'girly', 'fem frame', 'female frame',
  'female body', 'female sim', 'for women', 'for girls', 'for ladies',
  "women's", 'womens ', 'ladies ',
  // Gendered items (definitively feminine)
  'lingerie', 'pregnancy', 'pregnant', 'maternity',
  'lipstick', 'eyeshadow', 'mascara', 'eyeliner',
  // Clothing that's almost always feminine in Sims CC
  'mini skirt', 'miniskirt', 'pencil skirt', 'pleated skirt',
  'bodycon dress', 'cocktail dress', 'evening gown', 'prom dress',
  'high heels', 'stilettos', 'pumps', 'mary janes',
];

// URL patterns for feminine
const FEMININE_URL_PATTERNS = [
  '/female/', '-female-', '/women/', '-women-', '/girls/', '/ladies/', '/feminine/',
  '-female.', '_female_', '/female-', '-female/',
];

// Content types that are typically feminine (in Sims CC context)
// These are weaker signals - only used when other evidence exists
const TYPICALLY_FEMININE_CONTENT = [
  'dress', 'skirt', 'gown', 'bustier', 'corset',
];

// Content types that are typically masculine (in Sims CC context)
const TYPICALLY_MASCULINE_CONTENT = [
  'beard', 'beards', 'facial hair',
];

// Unisex indicators - explicitly mentions both or "unisex"
const UNISEX_KEYWORDS = [
  'unisex', 'both genders', 'both frames', 'all genders', 'any gender',
  'male and female', 'female and male', 'men and women', 'women and men',
  'male/female', 'female/male', 'all sims', 'any sim',
  'masculine and feminine', 'feminine and masculine',
  'both male and female', 'for both',
];

interface Issue {
  modId: string;
  title: string;
  type: 'conflicting_themes' | 'suspicious_age_group' | 'christmas_goth' | 'conflicting_style' | 'incorrect_gender';
  details: string;
  fix?: {
    field: 'themes' | 'ageGroups' | 'genderOptions' | 'visualStyle';
    remove: string[];
    add?: string[]; // For gender corrections where we need to add the correct value
  };
}

/**
 * Semantic goth detection using title + description
 * Returns: { isGoth: boolean, reason: string }
 */
function analyzeGothContent(title: string, description: string): { isGoth: boolean; reason: string } {
  const titleLower = ` ${title.toLowerCase()} `; // Pad with spaces for word boundary matching
  const descLower = (description || '').toLowerCase();

  // RULE 1: If TITLE has goth keyword, it's goth - NO EXCEPTIONS
  // This catches "Witching Hour", "Black Widow", "Shadow Manor", etc.
  const titleGothMatch = TITLE_GOTH_KEYWORDS.find(kw => titleLower.includes(kw));
  if (titleGothMatch) {
    return { isGoth: true, reason: `Title contains "${titleGothMatch}"` };
  }

  // RULE 2: Check description, but be careful about context
  // Phrases like "from natural to goth" or "can be styled goth" mean versatile, NOT goth
  const NON_GOTH_PHRASES = [
    'to goth',           // "from natural to goth"
    'or goth',           // "casual or goth"
    'and goth',          // "preppy and goth"
    'even goth',         // "even goth looks"
    'style goth',        // "style it goth"
    'styled goth',       // "can be styled goth"
    'look goth',         // "can look goth"
    'goes goth',         // "goes with goth"
    'with goth',         // "pair with goth"
    'for goth',          // "perfect for goth"
    'any goth',          // "any goth look"
    'your goth',         // "your goth style"
  ];

  // Check if "goth" appears in a non-definitive context
  const hasNonGothPhrase = NON_GOTH_PHRASES.some(phrase => descLower.includes(phrase));

  // RULE 2a: If description has "goth" but in a versatility context, NOT goth
  if (descLower.includes('goth') && hasNonGothPhrase) {
    return { isGoth: false, reason: `"goth" used in versatility context (e.g., "from X to goth")` };
  }

  // RULE 2b: If description has strong goth indicator (not just "goth"), it's goth
  // These are definitive: "gothic style", "vampire", "skull", etc.
  const strongDescKeywords = ['gothic', 'vampire', 'skull', 'skeleton', 'pentagram', 'occult', 'macabre', 'witchcraft'];
  const strongMatch = strongDescKeywords.find(kw => descLower.includes(kw));
  if (strongMatch) {
    return { isGoth: true, reason: `Description contains strong indicator "${strongMatch}"` };
  }

  // RULE 2c: If "goth" appears definitively (goth style, goth aesthetic, goth look, etc.)
  const DEFINITIVE_GOTH_PHRASES = [
    'goth style', 'goth aesthetic', 'goth look', 'goth fashion', 'goth outfit',
    'goth vibe', 'goth theme', 'goth inspired', 'goth makeup', 'goth clothing',
    'goth dress', 'goth hair', 'goth accessories', 'dark goth', 'is goth'
  ];
  const definitiveMatch = DEFINITIVE_GOTH_PHRASES.find(phrase => descLower.includes(phrase));
  if (definitiveMatch) {
    return { isGoth: true, reason: `Description has definitive "${definitiveMatch}"` };
  }

  // RULE 3: No definitive goth indicators = NOT goth
  return { isGoth: false, reason: `No definitive goth indicators in title or description` };
}

/**
 * Semantic gender detection using title + description + URL
 * Key insight: We need to be CONSERVATIVE - only flag mismatches with high confidence
 * Generic pronouns (he/she/his/her) are ignored as they appear in all descriptions
 * Returns: { gender: 'masculine' | 'feminine' | 'unisex' | null, reason: string }
 */
function analyzeGenderContent(
  title: string,
  description: string,
  sourceUrl: string | null,
  contentType: string | null
): { gender: 'masculine' | 'feminine' | 'unisex' | null; reason: string; confidence: 'high' | 'medium' | 'low' } {
  const titleLower = ` ${title.toLowerCase()} `;
  const descLower = ` ${(description || '').toLowerCase()} `;
  const urlLower = (sourceUrl || '').toLowerCase();

  // RULE 0: Check for explicit unisex first
  for (const kw of UNISEX_KEYWORDS) {
    if (titleLower.includes(kw) || descLower.includes(kw)) {
      return { gender: 'unisex', reason: `Explicit unisex indicator: "${kw}"`, confidence: 'high' };
    }
  }

  // Count masculine and feminine signals
  let masculineScore = 0;
  let feminineScore = 0;
  const masculineMatches: string[] = [];
  const feminineMatches: string[] = [];

  // RULE 1: Check URL patterns first (strong signal - user emphasized this)
  for (const pattern of MASCULINE_URL_PATTERNS) {
    if (urlLower.includes(pattern)) {
      masculineScore += 4; // Strong signal
      masculineMatches.push(`url:"${pattern}"`);
      break; // Only count URL once
    }
  }
  for (const pattern of FEMININE_URL_PATTERNS) {
    if (urlLower.includes(pattern)) {
      feminineScore += 4; // Strong signal
      feminineMatches.push(`url:"${pattern}"`);
      break; // Only count URL once
    }
  }

  // RULE 2: Check TITLE for keywords (strongest text signal)
  for (const kw of MASCULINE_KEYWORDS) {
    // Use word boundary check to avoid partial matches
    const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(title)) {
      masculineScore += 3;
      masculineMatches.push(`title:"${kw}"`);
    }
  }
  for (const kw of FEMININE_KEYWORDS) {
    const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(title)) {
      feminineScore += 3;
      feminineMatches.push(`title:"${kw}"`);
    }
  }

  // RULE 3: Check description for strong keywords only (medium signal)
  for (const kw of MASCULINE_KEYWORDS) {
    const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(description || '') && !masculineMatches.some(m => m.includes(kw))) {
      masculineScore += 2;
      masculineMatches.push(`desc:"${kw}"`);
    }
  }
  for (const kw of FEMININE_KEYWORDS) {
    const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(description || '') && !feminineMatches.some(m => m.includes(kw))) {
      feminineScore += 2;
      feminineMatches.push(`desc:"${kw}"`);
    }
  }

  // RULE 4: Check for typically gendered content in title (weak signal)
  for (const item of TYPICALLY_FEMININE_CONTENT) {
    if (titleLower.includes(item)) {
      feminineScore += 1;
      feminineMatches.push(`titleContent:"${item}"`);
    }
  }
  for (const item of TYPICALLY_MASCULINE_CONTENT) {
    if (titleLower.includes(item)) {
      masculineScore += 1;
      masculineMatches.push(`titleContent:"${item}"`);
    }
  }

  // Determine result based on scores
  // Require higher threshold to avoid false positives
  const scoreDiff = Math.abs(masculineScore - feminineScore);

  // If both have strong signals, it's unisex
  if (masculineScore >= 3 && feminineScore >= 3) {
    return {
      gender: 'unisex',
      reason: `Both genders have strong signals - masc[${masculineMatches.join(',')}] fem[${feminineMatches.join(',')}]`,
      confidence: 'medium'
    };
  }

  // Need score >= 3 to be confident (high threshold to avoid false positives)
  // Clear masculine winner
  if (masculineScore >= 3 && masculineScore > feminineScore + 1) {
    const confidence = scoreDiff >= 4 ? 'high' : 'medium';
    return {
      gender: 'masculine',
      reason: `Masculine indicators: ${masculineMatches.join(', ')}`,
      confidence
    };
  }

  // Clear feminine winner
  if (feminineScore >= 3 && feminineScore > masculineScore + 1) {
    const confidence = scoreDiff >= 4 ? 'high' : 'medium';
    return {
      gender: 'feminine',
      reason: `Feminine indicators: ${feminineMatches.join(', ')}`,
      confidence
    };
  }

  // No clear signal - return null (unknown)
  return {
    gender: null,
    reason: `No clear gender indicators (masc:${masculineScore}, fem:${feminineScore})`,
    confidence: 'low'
  };
}

/**
 * Check if text contains keywords for a specific age group
 */
function hasAgeKeywords(text: string, ageGroup: string): boolean {
  const lower = text.toLowerCase();
  const keywords = AGE_SPECIFIC_KEYWORDS[ageGroup] || [];
  return keywords.some(keyword => lower.includes(keyword));
}

async function findIssues(): Promise<Issue[]> {
  const issues: Issue[] = [];

  // 1. Find ALL mods with "goth" theme and analyze semantically
  const gothMods = await prisma.mod.findMany({
    where: {
      themes: { has: 'goth' },
    },
    select: {
      id: true,
      title: true,
      description: true,
      themes: true,
      contentType: true,
    },
  });

  console.log(`  Found ${gothMods.length} mods with 'goth' theme...`);

  for (const mod of gothMods) {
    const analysis = analyzeGothContent(mod.title, mod.description || '');

    if (!analysis.isGoth) {
      issues.push({
        modId: mod.id,
        title: mod.title,
        type: 'christmas_goth',
        details: analysis.reason,
        fix: {
          field: 'themes',
          remove: ['goth'],
        },
      });
    }
  }

  console.log(`  → ${issues.length} mods will have 'goth' removed`);

  // 3. Find pose packs tagged with restrictive age groups
  const poseMods = await prisma.mod.findMany({
    where: {
      contentType: 'poses',
      ageGroups: { isEmpty: false },
    },
    select: {
      id: true,
      title: true,
      ageGroups: true,
      description: true,
    },
  });

  for (const mod of poseMods) {
    const combinedText = `${mod.title} ${mod.description || ''}`.toLowerCase();

    // Check for "family" poses that are incorrectly tagged as single age
    const isFamilyPose = combinedText.includes('family') ||
                         combinedText.includes('group') ||
                         combinedText.includes('couple') ||
                         combinedText.includes('portrait');

    // Count how many different ages are mentioned
    const mentionedAges = ['infant', 'toddler', 'child', 'teen', 'adult', 'elder'].filter(
      age => combinedText.includes(age)
    );

    // If it's a family/group pose with only 1 age tag but mentions multiple ages
    if (isFamilyPose && mod.ageGroups.length === 1 && mentionedAges.length > 1) {
      issues.push({
        modId: mod.id,
        title: mod.title,
        type: 'suspicious_age_group',
        details: `Pose pack tagged [${mod.ageGroups.join(', ')}] but mentions: ${mentionedAges.join(', ')}.`,
        fix: {
          field: 'ageGroups',
          remove: mod.ageGroups,
        },
      });
    }
  }

  // 4. Find objects (furniture/decor/lots) with ANY age groups - objects generally shouldn't have age restrictions
  const objectMods = await prisma.mod.findMany({
    where: {
      contentType: { in: ['furniture', 'lighting', 'decor', 'lot', 'clutter'] },
      ageGroups: { isEmpty: false },
    },
    select: {
      id: true,
      title: true,
      contentType: true,
      ageGroups: true,
      description: true,
    },
  });

  for (const mod of objectMods) {
    const combinedText = `${mod.title} ${mod.description || ''}`;
    const unsupportedAges = mod.ageGroups.filter(age => !hasAgeKeywords(combinedText, age));

    if (unsupportedAges.length > 0) {
      issues.push({
        modId: mod.id,
        title: mod.title,
        type: 'suspicious_age_group',
        details: `${mod.contentType} has [${unsupportedAges.join(', ')}] - objects shouldn't have age groups unless specifically for kids/nursery.`,
        fix: {
          field: 'ageGroups',
          remove: unsupportedAges,
        },
      });
    }
  }

  // 5. Find CAS items (hair, clothing) with age groups that don't match keywords
  const casItemMods = await prisma.mod.findMany({
    where: {
      contentType: { in: ['hair', 'tops', 'bottoms', 'dresses', 'full-body', 'shoes', 'accessories', 'makeup', 'skin', 'eyes', 'nails'] },
      ageGroups: { isEmpty: false },
    },
    select: {
      id: true,
      title: true,
      contentType: true,
      ageGroups: true,
      description: true,
    },
  });

  for (const mod of casItemMods) {
    const combinedText = `${mod.title} ${mod.description || ''}`;
    const unsupportedAges = mod.ageGroups.filter(age => !hasAgeKeywords(combinedText, age));

    // Only flag if ALL ages are unsupported (stricter for CAS since they legitimately have age variants)
    if (unsupportedAges.length === mod.ageGroups.length && mod.ageGroups.length > 0) {
      issues.push({
        modId: mod.id,
        title: mod.title,
        type: 'suspicious_age_group',
        details: `${mod.contentType} tagged [${mod.ageGroups.join(', ')}] but no age keywords found.`,
        fix: {
          field: 'ageGroups',
          remove: mod.ageGroups,
        },
      });
    }
  }

  // 6. Find NON-CAS items that have gender tags (they shouldn't!)
  // Objects, furniture, loading screens, etc. don't have gender
  // NOTE: We only flag items with KNOWN non-CAS contentType, not null/unknown
  console.log('  Finding non-CAS items with gender tags (should be removed)...');
  const NON_CAS_CONTENT_TYPES = [
    'furniture', 'lighting', 'decor', 'clutter', 'lot', 'build', 'terrain',
    'loading-screen', 'gameplay-mod', 'script-mod', 'trait',
    'career', 'ui-preset', 'poses', 'animation', 'pet-furniture',
    // Don't include null - items with no contentType might be CAS items
  ];

  const nonCasWithGender = await prisma.mod.findMany({
    where: {
      genderOptions: { isEmpty: false },
      contentType: { in: NON_CAS_CONTENT_TYPES },
    },
    select: {
      id: true,
      title: true,
      contentType: true,
      genderOptions: true,
    },
  });

  console.log(`  Found ${nonCasWithGender.length} non-CAS items with gender tags...`);

  for (const mod of nonCasWithGender) {
    issues.push({
      modId: mod.id,
      title: mod.title,
      type: 'incorrect_gender',
      details: `Non-CAS item (${mod.contentType || 'unknown'}) has gender [${mod.genderOptions.join(', ')}] - objects don't have gender`,
      fix: {
        field: 'genderOptions',
        remove: mod.genderOptions,
        // Don't add anything - just remove the gender tags
      },
    });
  }

  console.log(`  → ${nonCasWithGender.length} non-CAS items will have gender removed`);

  // 6b. Find items with NULL contentType but URL suggests non-CAS
  console.log('  Finding items with null contentType that appear to be non-CAS (via URL)...');
  const NON_CAS_URL_PATTERNS = [
    // Gameplay mods and traits
    'gameplay-mods', 'gameplay-mod', 'script-mod',
    'traits', '-trait', 'teen-mods', 'university-mods',
    'aesthetic-mods',
    // Build/buy objects
    'walls-cc', 'wall-cc', 'brick-wall', 'doors-cc',
    'furniture', 'kitchen', 'decor',
    // Other non-CAS
    'pose', 'poses', 'animation',
    'loading-screen', 'loading-screens',
  ];

  const nullContentTypeMods = await prisma.mod.findMany({
    where: {
      genderOptions: { isEmpty: false },
      contentType: null,
    },
    select: {
      id: true,
      title: true,
      sourceUrl: true,
      genderOptions: true,
    },
  });

  let nullContentTypeFixed = 0;
  for (const mod of nullContentTypeMods) {
    const url = (mod.sourceUrl || '').toLowerCase();
    const isNonCas = NON_CAS_URL_PATTERNS.some(pattern => url.includes(pattern));

    if (isNonCas) {
      nullContentTypeFixed++;
      issues.push({
        modId: mod.id,
        title: mod.title,
        type: 'incorrect_gender',
        details: `Item with null contentType has non-CAS URL pattern - removing gender [${mod.genderOptions.join(', ')}]`,
        fix: {
          field: 'genderOptions',
          remove: mod.genderOptions,
        },
      });
    }
  }

  console.log(`  → ${nullContentTypeFixed} null-contentType items with non-CAS URLs will have gender removed`);

  // 7. Find CAS items with incorrect genderOptions based on semantic analysis
  console.log('  Analyzing CAS gender assignments...');
  const modsWithGender = await prisma.mod.findMany({
    where: {
      genderOptions: { isEmpty: false },
      contentType: { in: ['hair', 'tops', 'bottoms', 'dresses', 'full-body', 'shoes', 'accessories', 'jewelry', 'makeup', 'skin', 'eyes', 'nails', 'tattoos'] },
    },
    select: {
      id: true,
      title: true,
      description: true,
      sourceUrl: true,
      contentType: true,
      genderOptions: true,
    },
  });

  console.log(`  Found ${modsWithGender.length} CAS mods with gender assignments...`);
  let genderIssueCount = 0;

  for (const mod of modsWithGender) {
    const analysis = analyzeGenderContent(mod.title, mod.description || '', mod.sourceUrl, mod.contentType);

    // Skip if we can't determine gender confidently
    if (analysis.gender === null || analysis.confidence === 'low') continue;

    const currentGenders = mod.genderOptions;
    const hasOnlyMasculine = currentGenders.length === 1 && currentGenders[0] === 'masculine';
    const hasOnlyFeminine = currentGenders.length === 1 && currentGenders[0] === 'feminine';
    const hasUnisex = currentGenders.includes('unisex') || (currentGenders.includes('masculine') && currentGenders.includes('feminine'));

    // Check for mismatches
    let isMismatch = false;
    let mismatchDetail = '';

    // Currently tagged masculine, but content is feminine
    const conf = analysis.confidence as string;
    if (hasOnlyMasculine && analysis.gender === 'feminine' && conf !== 'low') {
      isMismatch = true;
      mismatchDetail = `Tagged [masculine] but content is feminine: ${analysis.reason}`;
    }
    // Currently tagged feminine, but content is masculine
    else if (hasOnlyFeminine && analysis.gender === 'masculine' && conf !== 'low') {
      isMismatch = true;
      mismatchDetail = `Tagged [feminine] but content is masculine: ${analysis.reason}`;
    }
    // Tagged as unisex but content is clearly gendered (only flag high confidence)
    else if (hasUnisex && (analysis.gender === 'masculine' || analysis.gender === 'feminine') && conf === 'high') {
      // Don't flag unisex -> gendered, that's usually intentional
      // The AI likely knew better
    }
    // Tagged single gender but should be unisex
    else if (!hasUnisex && analysis.gender === 'unisex' && conf !== 'low') {
      isMismatch = true;
      mismatchDetail = `Tagged [${currentGenders.join(', ')}] but appears unisex: ${analysis.reason}`;
    }

    if (isMismatch) {
      genderIssueCount++;
      issues.push({
        modId: mod.id,
        title: mod.title,
        type: 'incorrect_gender',
        details: mismatchDetail,
        fix: {
          field: 'genderOptions',
          remove: currentGenders,
          add: analysis.gender === 'unisex' ? ['masculine', 'feminine'] : [analysis.gender],
        },
      });
    }
  }

  console.log(`  → ${genderIssueCount} CAS mods have incorrect gender assignments`);

  // 8. Find mods with conflicting visual styles
  const conflictingStyleMods = await prisma.mod.findMany({
    where: {
      OR: [
        // Alpha style but has maxis-match keywords
        { visualStyle: 'alpha' },
        { visualStyle: 'maxis-match' },
      ],
    },
    select: {
      id: true,
      title: true,
      visualStyle: true,
      description: true,
    },
  });

  for (const mod of conflictingStyleMods) {
    const combinedText = `${mod.title} ${mod.description || ''}`.toLowerCase();

    if (mod.visualStyle === 'alpha' && (combinedText.includes('maxis match') || combinedText.includes('maxis-match') || combinedText.includes('mm '))) {
      issues.push({
        modId: mod.id,
        title: mod.title,
        type: 'conflicting_style',
        details: `Tagged 'alpha' but description mentions maxis-match.`,
        fix: {
          field: 'visualStyle',
          remove: ['alpha'],
        },
      });
    }
    if (mod.visualStyle === 'maxis-match' && (combinedText.includes('alpha cc') || combinedText.includes('alpha hair') || combinedText.includes('realistic'))) {
      issues.push({
        modId: mod.id,
        title: mod.title,
        type: 'conflicting_style',
        details: `Tagged 'maxis-match' but description mentions alpha/realistic.`,
        fix: {
          field: 'visualStyle',
          remove: ['maxis-match'],
        },
      });
    }
  }

  return issues;
}

async function applyFixes(issues: Issue[]): Promise<number> {
  let fixCount = 0;

  for (const issue of issues) {
    if (!issue.fix) continue;

    const field = issue.fix.field;

    // Handle visualStyle separately (it's a string, not array)
    if (field === 'visualStyle') {
      await prisma.mod.update({
        where: { id: issue.modId },
        data: { visualStyle: null },
      });
      fixCount++;
      continue;
    }

    // Handle array fields (themes, ageGroups, genderOptions)
    const mod = await prisma.mod.findUnique({
      where: { id: issue.modId },
      select: { themes: true, ageGroups: true, genderOptions: true },
    });

    if (!mod) continue;

    const currentValues = mod[field] || [];
    // Remove specified values
    let newValues = currentValues.filter(v => !issue.fix!.remove.includes(v));
    // Add new values if specified (for gender corrections)
    if (issue.fix.add) {
      newValues = Array.from(new Set([...newValues, ...issue.fix.add])); // Use Set to dedupe
    }

    await prisma.mod.update({
      where: { id: issue.modId },
      data: { [field]: newValues },
    });

    fixCount++;
  }

  return fixCount;
}

async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');

  console.log('🔍 Scanning for facet data quality issues...\n');

  const issues = await findIssues();

  if (issues.length === 0) {
    console.log('✅ No issues found! Facet data looks clean.');
    await prisma.$disconnect();
    return;
  }

  // Group by type
  const byType: Record<string, Issue[]> = {};
  for (const issue of issues) {
    if (!byType[issue.type]) byType[issue.type] = [];
    byType[issue.type].push(issue);
  }

  console.log(`Found ${issues.length} potential issues:\n`);

  // Print issues grouped by type
  for (const [type, typeIssues] of Object.entries(byType)) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📋 ${type.toUpperCase().replace(/_/g, ' ')} (${typeIssues.length} issues)`);
    console.log('='.repeat(80));

    for (const issue of typeIssues.slice(0, 20)) { // Show max 20 per type
      console.log(`\n  📦 ${issue.title}`);
      console.log(`     ID: ${issue.modId}`);
      console.log(`     ${issue.details}`);
      if (issue.fix) {
        if (issue.fix.add) {
          console.log(`     🔧 Fix: Change ${issue.fix.field} from [${issue.fix.remove.join(', ')}] to [${issue.fix.add.join(', ')}]`);
        } else {
          console.log(`     🔧 Fix: Remove '${issue.fix.remove.join(', ')}' from ${issue.fix.field}`);
        }
      }
    }

    if (typeIssues.length > 20) {
      console.log(`\n  ... and ${typeIssues.length - 20} more`);
    }
  }

  console.log('\n' + '='.repeat(80));

  if (shouldFix) {
    console.log('\n🔧 Applying fixes...');
    const fixCount = await applyFixes(issues);
    console.log(`✅ Fixed ${fixCount} mods.`);
  } else {
    console.log('\n💡 Run with --fix to apply these fixes:');
    console.log('   npx tsx scripts/cleanup-facet-data.ts --fix');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
