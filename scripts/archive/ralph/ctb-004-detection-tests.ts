/**
 * CTB-004: Content Type Detection Test Suite
 *
 * Comprehensive tests verifying that content type detection works correctly
 * for known examples across all categories.
 *
 * Run: npx tsx scripts/ralph/ctb-004-detection-tests.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  detectContentType,
  detectRoomThemes,
  detectContentTypeWithConfidence,
  detectRoomThemesWithConfidence,
  ConfidenceLevel,
} from '../../lib/services/contentTypeDetector';

// ============================================
// TEST FRAMEWORK
// ============================================

interface TestCase {
  title: string;
  description?: string;
  expectedContentType: string | undefined;
  expectedRoomThemes?: string[];
  category: string;
}

interface TestResult {
  testCase: TestCase;
  actualContentType: string | undefined;
  actualRoomThemes: string[];
  contentTypePass: boolean;
  roomThemesPass: boolean;
  confidence: ConfidenceLevel;
  matchedKeywords: string[];
}

let passCount = 0;
let failCount = 0;
const results: TestResult[] = [];
const outputLines: string[] = [];

function log(message: string) {
  console.log(message);
  outputLines.push(message);
}

function runTest(testCase: TestCase): TestResult {
  const contentResult = detectContentTypeWithConfidence(testCase.title, testCase.description);
  const actualContentType = contentResult.confidence !== 'low' ? contentResult.contentType : undefined;
  const roomResult = detectRoomThemesWithConfidence(testCase.title, testCase.description);

  const contentTypePass = actualContentType === testCase.expectedContentType;

  // Room themes pass if all expected themes are present (actual may have more)
  const roomThemesPass = !testCase.expectedRoomThemes ||
    testCase.expectedRoomThemes.every(theme => roomResult.themes.includes(theme));

  const result: TestResult = {
    testCase,
    actualContentType,
    actualRoomThemes: roomResult.themes,
    contentTypePass,
    roomThemesPass,
    confidence: contentResult.confidence,
    matchedKeywords: contentResult.matchedKeywords,
  };

  if (contentTypePass && roomThemesPass) {
    passCount++;
  } else {
    failCount++;
  }

  results.push(result);
  return result;
}

// ============================================
// TEST CASES
// ============================================

const testCases: TestCase[] = [
  // ============================================
  // HAIR VARIATIONS
  // ============================================
  {
    title: 'Elegant Ponytail Hair',
    expectedContentType: 'hair',
    category: 'Hair Variations',
  },
  {
    title: 'Box Braids Hair',
    description: 'Beautiful long box braids for all occasions',
    expectedContentType: 'hair',
    category: 'Hair Variations',
  },
  {
    title: 'Messy Updo Hairstyle',
    expectedContentType: 'hair',
    category: 'Hair Variations',
  },
  {
    title: 'Wispy Bangs Hair',
    expectedContentType: 'hair',
    category: 'Hair Variations',
  },
  {
    title: 'Short Bob Cut',
    description: 'Chic bob cut hairstyle',
    expectedContentType: 'hair',
    category: 'Hair Variations',
  },
  {
    title: 'Pixie Hair',
    expectedContentType: 'hair',
    category: 'Hair Variations',
  },
  {
    title: 'Natural Afro Hair',
    expectedContentType: 'hair',
    category: 'Hair Variations',
  },
  {
    title: 'Long Waves Hairstyle',
    expectedContentType: 'hair',
    category: 'Hair Variations',
  },
  {
    title: 'Curly Locs Hair',
    expectedContentType: 'hair',
    category: 'Hair Variations',
  },
  {
    title: 'Sleek Bun Hair',
    description: 'High sleek bun with baby hairs',
    expectedContentType: 'hair',
    category: 'Hair Variations',
  },

  // ============================================
  // FACE - EYEBROWS
  // ============================================
  {
    title: 'Natural Eyebrows N45',
    expectedContentType: 'eyebrows',
    category: 'Face - Eyebrows',
  },
  {
    title: 'Bushy Brows',
    expectedContentType: 'eyebrows',
    category: 'Face - Eyebrows',
  },
  {
    title: 'Thin Arched Eyebrow',
    expectedContentType: 'eyebrows',
    category: 'Face - Eyebrows',
  },
  {
    title: 'Fluffy Brow Set',
    expectedContentType: 'eyebrows',
    category: 'Face - Eyebrows',
  },

  // ============================================
  // FACE - LASHES/EYELASHES
  // ============================================
  {
    title: 'Dramatic 3D Lashes',
    expectedContentType: 'lashes',
    category: 'Face - Lashes',
  },
  {
    title: 'Natural Eyelashes',
    expectedContentType: 'lashes',
    category: 'Face - Lashes',
  },
  {
    title: 'Wispy Lash Set',
    expectedContentType: 'lashes',
    category: 'Face - Lashes',
  },
  {
    title: '3D Eyelash Collection',
    expectedContentType: 'lashes',
    category: 'Face - Lashes',
  },

  // ============================================
  // FACE - EYELINER
  // ============================================
  {
    title: 'Cat Eye Eyeliner',
    expectedContentType: 'eyeliner',
    category: 'Face - Eyeliner',
  },
  {
    title: 'Graphic Liner Look',
    expectedContentType: 'eyeliner',
    category: 'Face - Eyeliner',
  },
  {
    title: 'Smudged Eye Liner',
    expectedContentType: 'eyeliner',
    category: 'Face - Eyeliner',
  },

  // ============================================
  // FACE - LIPSTICK
  // ============================================
  {
    title: 'Matte Lipstick N12',
    expectedContentType: 'lipstick',
    category: 'Face - Lipstick',
  },
  {
    title: 'Glossy Lip Gloss',
    expectedContentType: 'lipstick',
    category: 'Face - Lipstick',
  },
  {
    title: 'Butter Gloss Collection',
    expectedContentType: 'lipstick',
    category: 'Face - Lipstick',
  },
  {
    title: 'Cerise Lips',
    expectedContentType: 'lipstick',
    category: 'Face - Lipstick',
  },
  {
    title: 'Lip Color Set',
    expectedContentType: 'lipstick',
    category: 'Face - Lipstick',
  },

  // ============================================
  // FACE - BLUSH
  // ============================================
  {
    title: 'Natural Blush N05',
    expectedContentType: 'blush',
    category: 'Face - Blush',
  },
  {
    title: 'Soft Blusher Set',
    expectedContentType: 'blush',
    category: 'Face - Blush',
  },
  {
    title: 'Rosy Cheek Color',
    expectedContentType: 'blush',
    category: 'Face - Blush',
  },

  // ============================================
  // FACE - BEARD/FACIAL HAIR
  // ============================================
  {
    title: 'Full Beard',
    expectedContentType: 'beard',
    category: 'Face - Beard',
  },
  {
    title: 'Stubble Beard Look',
    expectedContentType: 'beard',
    category: 'Face - Beard',
  },
  {
    title: 'Goatee',
    expectedContentType: 'beard',
    category: 'Face - Beard',
  },
  {
    title: 'Handlebar Mustache',
    expectedContentType: 'facial-hair',
    category: 'Face - Mustache',
  },
  {
    title: 'Facial Hair Pack',
    expectedContentType: 'facial-hair',
    category: 'Face - Mustache',
  },
  {
    title: 'Thick Sideburns',
    expectedContentType: 'facial-hair',
    category: 'Face - Mustache',
  },

  // ============================================
  // CLOTHING - TOPS
  // ============================================
  {
    title: 'Cropped Hoodie',
    expectedContentType: 'tops',
    category: 'Clothing - Tops',
  },
  {
    title: 'Casual T-Shirt',
    expectedContentType: 'tops',
    category: 'Clothing - Tops',
  },
  {
    title: 'Winter Sweater',
    expectedContentType: 'tops',
    category: 'Clothing - Tops',
  },
  {
    title: 'Leather Jacket',
    expectedContentType: 'tops',
    category: 'Clothing - Tops',
  },
  {
    title: 'Silk Blouse',
    expectedContentType: 'tops',
    category: 'Clothing - Tops',
  },
  {
    title: 'Oversized Cardigan',
    expectedContentType: 'tops',
    category: 'Clothing - Tops',
  },
  {
    title: 'Tank Top',
    expectedContentType: 'tops',
    category: 'Clothing - Tops',
  },
  {
    title: 'Crop Top',
    expectedContentType: 'tops',
    category: 'Clothing - Tops',
  },

  // ============================================
  // CLOTHING - BOTTOMS
  // ============================================
  {
    title: 'High Waisted Jeans',
    expectedContentType: 'bottoms',
    category: 'Clothing - Bottoms',
  },
  {
    title: 'Pleated Mini Skirt',
    expectedContentType: 'bottoms',
    category: 'Clothing - Bottoms',
  },
  {
    title: 'Denim Shorts',
    expectedContentType: 'bottoms',
    category: 'Clothing - Bottoms',
  },
  {
    title: 'Cozy Sweatpants',
    expectedContentType: 'bottoms',
    category: 'Clothing - Bottoms',
  },
  {
    title: 'Leather Leggings',
    expectedContentType: 'bottoms',
    category: 'Clothing - Bottoms',
  },
  {
    title: 'Wide Leg Trousers',
    expectedContentType: 'bottoms',
    category: 'Clothing - Bottoms',
  },

  // ============================================
  // CLOTHING - DRESSES
  // ============================================
  {
    title: 'Summer Maxi Dress',
    expectedContentType: 'dresses',
    category: 'Clothing - Dresses',
  },
  {
    title: 'Elegant Evening Gown',
    expectedContentType: 'dresses',
    category: 'Clothing - Dresses',
  },
  {
    title: 'Cocktail Dress',
    expectedContentType: 'dresses',
    category: 'Clothing - Dresses',
  },
  {
    title: 'Wedding Ball Gown',
    expectedContentType: 'dresses',
    category: 'Clothing - Dresses',
  },

  // ============================================
  // CLOTHING - FULL BODY
  // ============================================
  {
    title: 'Casual Outfit Set',
    expectedContentType: 'full-body',
    category: 'Clothing - Full Body',
  },
  {
    title: 'Denim Jumpsuit',
    expectedContentType: 'full-body',
    category: 'Clothing - Full Body',
  },
  {
    title: 'Cozy Pajamas',
    expectedContentType: 'full-body',
    category: 'Clothing - Full Body',
  },
  {
    title: 'Beach Bikini Set',
    expectedContentType: 'full-body',
    category: 'Clothing - Full Body',
  },
  {
    title: 'Halloween Costume',
    expectedContentType: 'full-body',
    category: 'Clothing - Full Body',
  },
  {
    title: 'Nurse Uniform',
    expectedContentType: 'full-body',
    category: 'Clothing - Full Body',
  },
  {
    title: 'Floral Romper',
    expectedContentType: 'full-body',
    category: 'Clothing - Full Body',
  },

  // ============================================
  // CLOTHING - SHOES
  // ============================================
  {
    title: 'Platform Sneakers',
    expectedContentType: 'shoes',
    category: 'Clothing - Shoes',
  },
  {
    title: 'Ankle Boots',
    expectedContentType: 'shoes',
    category: 'Clothing - Shoes',
  },
  {
    title: 'Strappy Heels',
    expectedContentType: 'shoes',
    category: 'Clothing - Shoes',
  },
  {
    title: 'Summer Sandals',
    expectedContentType: 'shoes',
    category: 'Clothing - Shoes',
  },
  {
    title: 'Loafers',
    expectedContentType: 'shoes',
    category: 'Clothing - Shoes',
  },
  {
    title: 'Stilettos',
    expectedContentType: 'shoes',
    category: 'Clothing - Shoes',
  },

  // ============================================
  // ACCESSORIES
  // ============================================
  {
    title: 'Leather Backpack',
    expectedContentType: 'accessories',
    category: 'Accessories',
  },
  {
    title: 'Silk Scarf',
    expectedContentType: 'accessories',
    category: 'Accessories',
  },
  {
    title: 'Designer Belt',
    expectedContentType: 'accessories',
    category: 'Accessories',
  },
  {
    title: 'Designer Bag',
    expectedContentType: 'accessories',
    category: 'Accessories',
  },

  // ============================================
  // JEWELRY
  // ============================================
  {
    title: 'Gold Hoop Earrings',
    expectedContentType: 'jewelry',
    category: 'Jewelry',
  },
  {
    title: 'Layered Necklace Set',
    expectedContentType: 'jewelry',
    category: 'Jewelry',
  },
  {
    title: 'Diamond Ring',
    expectedContentType: 'jewelry',
    category: 'Jewelry',
  },
  {
    title: 'Nose Piercing Pack',
    expectedContentType: 'jewelry',
    category: 'Jewelry',
  },
  {
    title: 'Pearl Choker',
    expectedContentType: 'jewelry',
    category: 'Jewelry',
  },

  // ============================================
  // GLASSES
  // ============================================
  {
    title: 'Round Glasses',
    expectedContentType: 'glasses',
    category: 'Glasses',
  },
  {
    title: 'Aviator Sunglasses',
    expectedContentType: 'glasses',
    category: 'Glasses',
  },
  {
    title: 'Retro Shades',
    expectedContentType: 'glasses',
    category: 'Glasses',
  },

  // ============================================
  // HATS
  // ============================================
  {
    title: 'Baseball Cap',
    expectedContentType: 'hats',
    category: 'Hats',
  },
  {
    title: 'Winter Beanie',
    expectedContentType: 'hats',
    category: 'Hats',
  },
  {
    title: 'Tiara Crown',
    expectedContentType: 'hats',
    category: 'Hats',
  },
  {
    title: 'Silk Headscarf',
    expectedContentType: 'hats',
    category: 'Hats',
  },

  // ============================================
  // FURNITURE WITH ROOM CONTEXT
  // ============================================
  {
    title: 'Bathroom Sink',
    expectedContentType: 'furniture',
    expectedRoomThemes: ['bathroom'],
    category: 'Furniture + Room',
  },
  {
    title: 'Kitchen Island Counter',
    expectedContentType: 'furniture',
    expectedRoomThemes: ['kitchen'],
    category: 'Furniture + Room',
  },
  {
    title: 'Bedroom Vanity Mirror',
    expectedContentType: 'furniture',
    expectedRoomThemes: ['bedroom'],
    category: 'Furniture + Room',
  },
  {
    title: 'Living Room Sofa',
    expectedContentType: 'furniture',
    expectedRoomThemes: ['living-room'],
    category: 'Furniture + Room',
  },
  {
    title: 'Office Desk',
    expectedContentType: 'furniture',
    expectedRoomThemes: ['office'],
    category: 'Furniture + Room',
  },
  {
    title: 'Modern Toilet',
    expectedContentType: 'furniture',
    expectedRoomThemes: ['bathroom'],
    category: 'Furniture + Room',
  },
  {
    title: 'Walk-in Shower',
    expectedContentType: 'furniture',
    expectedRoomThemes: ['bathroom'],
    category: 'Furniture + Room',
  },
  {
    title: 'Dining Table Set',
    description: 'Beautiful dining table for your dining room',
    expectedContentType: 'furniture',
    expectedRoomThemes: ['dining-room'],
    category: 'Furniture + Room',
  },

  // ============================================
  // ROOM PACKS
  // ============================================
  {
    title: 'Kitchen CC Pack',
    expectedContentType: 'furniture',
    expectedRoomThemes: ['kitchen'],
    category: 'Room Packs',
  },
  {
    title: 'Bathroom Decor Set',
    expectedContentType: 'decor',
    expectedRoomThemes: ['bathroom'],
    category: 'Room Packs',
  },
  {
    title: 'Nursery Furniture Bundle',
    expectedContentType: 'furniture',
    expectedRoomThemes: ['nursery'],
    category: 'Room Packs',
  },
  {
    title: 'Kids Room Decor',
    expectedContentType: 'decor',
    expectedRoomThemes: ['kids-room'],
    category: 'Room Packs',
  },
  {
    title: 'Outdoor Patio Set',
    expectedContentType: 'furniture',
    expectedRoomThemes: ['outdoor'],
    category: 'Room Packs',
  },

  // ============================================
  // DECOR & CLUTTER
  // ============================================
  {
    title: 'Wall Art Collection',
    expectedContentType: 'wall-art',
    category: 'Decor',
  },
  {
    title: 'Abstract Paintings',
    expectedContentType: 'wall-art',
    category: 'Decor',
  },
  {
    title: 'Vintage Posters',
    expectedContentType: 'wall-art',
    category: 'Decor',
  },
  {
    title: 'Persian Rug',
    expectedContentType: 'rugs',
    category: 'Decor',
  },
  {
    title: 'Sheer Curtains',
    expectedContentType: 'curtains',
    category: 'Decor',
  },
  {
    title: 'Indoor Plants Pack',
    expectedContentType: 'plants',
    category: 'Decor',
  },
  {
    title: 'Succulents Collection',
    expectedContentType: 'plants',
    category: 'Decor',
  },
  {
    title: 'Floor Lamp',
    expectedContentType: 'lighting',
    category: 'Decor',
  },
  {
    title: 'Crystal Chandelier',
    expectedContentType: 'lighting',
    category: 'Decor',
  },
  {
    title: 'Decorative Clutter',
    expectedContentType: 'clutter',
    category: 'Decor',
  },
  {
    title: 'Throw Pillows Set',
    expectedContentType: 'clutter',
    category: 'Decor',
  },
  {
    title: 'Shelf Decorations',
    expectedContentType: 'decor',
    category: 'Decor',
  },

  // ============================================
  // CAS SPECIAL ITEMS
  // ============================================
  {
    title: 'CAS Background Replacement',
    expectedContentType: 'cas-background',
    category: 'CAS Special',
  },
  {
    title: 'Create a Sim Background',
    expectedContentType: 'cas-background',
    category: 'CAS Special',
  },
  {
    title: 'Custom Loading Screen',
    expectedContentType: 'loading-screen',
    category: 'CAS Special',
  },
  {
    title: 'Body Preset Pack',
    expectedContentType: 'preset',
    category: 'CAS Special',
  },
  {
    title: 'Face Presets Collection',
    expectedContentType: 'preset',
    category: 'CAS Special',
  },

  // ============================================
  // PET ITEMS
  // ============================================
  {
    title: 'Cat Bed',
    expectedContentType: 'pet-furniture',
    category: 'Pet Items',
  },
  {
    title: 'Dog House',
    expectedContentType: 'pet-furniture',
    category: 'Pet Items',
  },
  {
    title: 'Pet Food Bowl',
    expectedContentType: 'pet-furniture',
    category: 'Pet Items',
  },
  {
    title: 'Cat Scratching Post',
    expectedContentType: 'pet-furniture',
    category: 'Pet Items',
  },
  {
    title: 'Dog Sweater',
    expectedContentType: 'pet-clothing',
    category: 'Pet Items',
  },
  {
    title: 'Cat Costume',
    expectedContentType: 'pet-clothing',
    category: 'Pet Items',
  },
  {
    title: 'Dog Collar',
    expectedContentType: 'pet-accessories',
    category: 'Pet Items',
  },
  {
    title: 'Pet Bandana',
    expectedContentType: 'pet-accessories',
    category: 'Pet Items',
  },

  // ============================================
  // SKIN & TATTOOS
  // ============================================
  {
    title: 'Realistic Skin Blend',
    expectedContentType: 'skin',
    category: 'Skin',
  },
  {
    title: 'Freckles Overlay',
    expectedContentType: 'skin',
    category: 'Skin',
  },
  {
    title: 'Body Hair Pack',
    expectedContentType: 'skin',
    category: 'Skin',
  },
  {
    title: 'Full Body Tattoo',
    expectedContentType: 'tattoos',
    category: 'Tattoos',
  },
  {
    title: 'Sleeve Tattoo Pack',
    expectedContentType: 'tattoos',
    category: 'Tattoos',
  },
  {
    title: 'Face Tattoo Set',
    expectedContentType: 'tattoos',
    category: 'Tattoos',
  },

  // ============================================
  // EYES & NAILS
  // ============================================
  {
    title: 'Heterochromia Eyes',
    expectedContentType: 'eyes',
    category: 'Eyes',
  },
  {
    title: 'Contact Lenses Pack',
    expectedContentType: 'eyes',
    category: 'Eyes',
  },
  {
    title: 'Acrylic Nails Set',
    expectedContentType: 'nails',
    category: 'Nails',
  },
  {
    title: 'Nail Polish Collection',
    expectedContentType: 'nails',
    category: 'Nails',
  },

  // ============================================
  // MAKEUP (Generic)
  // ============================================
  {
    title: 'Eyeshadow Palette',
    expectedContentType: 'makeup',
    category: 'Makeup',
  },
  {
    title: 'Full Face Makeup',
    expectedContentType: 'makeup',
    category: 'Makeup',
  },
  {
    title: 'Contour Kit',
    expectedContentType: 'makeup',
    category: 'Makeup',
  },
  {
    title: 'Highlighter',
    expectedContentType: 'makeup',
    category: 'Makeup',
  },

  // ============================================
  // MODS
  // ============================================
  {
    title: 'Slice of Life Mod',
    expectedContentType: 'gameplay-mod',
    category: 'Mods',
  },
  {
    title: 'MC Command Center',
    expectedContentType: 'script-mod',
    category: 'Mods',
  },
  {
    title: 'Pose Pack Volume 5',
    expectedContentType: 'poses',
    category: 'Mods',
  },
  {
    title: 'Victorian Mansion Lot',
    expectedContentType: 'lot',
    category: 'Mods',
  },

  // ============================================
  // AMBIGUOUS CASES (Should return undefined)
  // ============================================
  {
    title: 'CC Pack Vol 3',
    expectedContentType: undefined,
    category: 'Ambiguous',
  },
  {
    title: 'New Release 2024',
    expectedContentType: undefined,
    category: 'Ambiguous',
  },
  {
    title: 'Random Stuff',
    expectedContentType: undefined,
    category: 'Ambiguous',
  },
  {
    title: 'My First Creation',
    expectedContentType: undefined,
    category: 'Ambiguous',
  },
  {
    title: 'Sims 4 Custom Content',
    expectedContentType: undefined,
    category: 'Ambiguous',
  },
  {
    title: 'Download',
    expectedContentType: undefined,
    category: 'Ambiguous',
  },

  // ============================================
  // EDGE CASES
  // ============================================
  {
    title: 'Eyeshadow Palette Set',
    description: 'A beautiful eyeshadow collection',
    expectedContentType: 'makeup',
    category: 'Edge Cases',
  },
  {
    title: 'Full Body Tattoo Set',
    description: 'Complete body coverage tattoo collection',
    expectedContentType: 'tattoos',
    category: 'Edge Cases',
  },
  {
    title: 'Lip Liner Pencil',
    description: 'Lip liner not to be confused with eye liner',
    expectedContentType: 'lipstick',
    category: 'Edge Cases',
  },
  {
    title: 'Christmas Lights Decoration',
    expectedContentType: 'decor',
    category: 'Edge Cases',
  },
  {
    title: 'Fairy Light String',
    expectedContentType: 'decor',
    category: 'Edge Cases',
  },
];

// ============================================
// RUN TESTS
// ============================================

function main() {
  log('==========================================');
  log('CTB-004: CONTENT TYPE DETECTION TEST SUITE');
  log('==========================================');
  log(`Test Cases: ${testCases.length}`);
  log(`Date: ${new Date().toISOString()}`);
  log('');

  // Group tests by category
  const categories = new Map<string, TestCase[]>();
  for (const tc of testCases) {
    if (!categories.has(tc.category)) {
      categories.set(tc.category, []);
    }
    categories.get(tc.category)!.push(tc);
  }

  // Run tests by category
  for (const [category, tests] of Array.from(categories.entries())) {
    log('------------------------------------------');
    log(`CATEGORY: ${category}`);
    log('------------------------------------------');

    for (const tc of tests) {
      const result = runTest(tc);
      const ctStatus = result.contentTypePass ? 'PASS' : 'FAIL';
      const rtStatus = tc.expectedRoomThemes
        ? (result.roomThemesPass ? 'PASS' : 'FAIL')
        : 'N/A';

      const ctDisplay = `[CT: ${ctStatus}]`;
      const rtDisplay = tc.expectedRoomThemes ? ` [RT: ${rtStatus}]` : '';

      if (result.contentTypePass && result.roomThemesPass) {
        log(`  ${ctDisplay}${rtDisplay} "${tc.title}"`);
        log(`         Expected: ${tc.expectedContentType ?? 'undefined'} | Got: ${result.actualContentType ?? 'undefined'} (${result.confidence})`);
        if (tc.expectedRoomThemes) {
          log(`         Themes: ${tc.expectedRoomThemes.join(', ')} | Got: ${result.actualRoomThemes.join(', ')}`);
        }
      } else {
        log(`  ${ctDisplay}${rtDisplay} "${tc.title}" **FAILED**`);
        log(`         Expected CT: ${tc.expectedContentType ?? 'undefined'} | Got: ${result.actualContentType ?? 'undefined'} (${result.confidence})`);
        if (tc.expectedRoomThemes) {
          log(`         Expected RT: ${tc.expectedRoomThemes.join(', ')} | Got: ${result.actualRoomThemes.join(', ')}`);
        }
        log(`         Matched Keywords: ${result.matchedKeywords.join(', ') || 'none'}`);
      }
    }
    log('');
  }

  // Summary
  const total = passCount + failCount;
  const accuracy = ((passCount / total) * 100).toFixed(2);

  log('==========================================');
  log('SUMMARY');
  log('==========================================');
  log(`Total Tests: ${total}`);
  log(`Passed: ${passCount}`);
  log(`Failed: ${failCount}`);
  log(`Accuracy: ${accuracy}%`);
  log('');

  // Target check
  const targetAccuracy = 90;
  if (parseFloat(accuracy) >= targetAccuracy) {
    log(`[SUCCESS] Accuracy ${accuracy}% meets or exceeds target of ${targetAccuracy}%`);
  } else {
    log(`[FAILURE] Accuracy ${accuracy}% does NOT meet target of ${targetAccuracy}%`);
  }

  log('');

  // List failed tests for review
  const failedTests = results.filter(r => !r.contentTypePass || !r.roomThemesPass);
  if (failedTests.length > 0) {
    log('==========================================');
    log('FAILED TESTS FOR REVIEW');
    log('==========================================');
    for (const r of failedTests) {
      log(`Title: "${r.testCase.title}"`);
      if (r.testCase.description) {
        log(`Description: "${r.testCase.description}"`);
      }
      log(`  Category: ${r.testCase.category}`);
      log(`  Expected CT: ${r.testCase.expectedContentType ?? 'undefined'}`);
      log(`  Got CT: ${r.actualContentType ?? 'undefined'} (${r.confidence})`);
      if (r.testCase.expectedRoomThemes) {
        log(`  Expected RT: ${r.testCase.expectedRoomThemes.join(', ')}`);
        log(`  Got RT: ${r.actualRoomThemes.join(', ')}`);
      }
      log(`  Matched: ${r.matchedKeywords.join(', ') || 'none'}`);
      log('');
    }
  }

  // Write output to file
  const outputPath = path.join(__dirname, 'ctb-detection-test-results.txt');
  fs.writeFileSync(outputPath, outputLines.join('\n'));
  console.log(`\nResults written to: ${outputPath}`);

  // Exit with appropriate code
  process.exit(parseFloat(accuracy) >= targetAccuracy ? 0 : 1);
}

main();
