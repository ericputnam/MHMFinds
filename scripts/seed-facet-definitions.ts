/**
 * Seed FacetDefinition table with all facet values and display metadata
 *
 * Usage:
 *   npx ts-node scripts/seed-facet-definitions.ts
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

interface FacetSeed {
  facetType: string;
  value: string;
  displayName: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder: number;
}

const FACET_SEEDS: FacetSeed[] = [
  // ==========================================
  // CONTENT TYPE - What IS this mod?
  // ==========================================

  // CAS - Hair & Face
  { facetType: 'contentType', value: 'hair', displayName: 'Hair', icon: '💇', color: '#F472B6', sortOrder: 1 },
  { facetType: 'contentType', value: 'makeup', displayName: 'Makeup', icon: '💄', color: '#FB7185', sortOrder: 2 },
  { facetType: 'contentType', value: 'skin', displayName: 'Skin', icon: '✨', color: '#FBBF24', sortOrder: 3 },
  { facetType: 'contentType', value: 'eyes', displayName: 'Eyes', icon: '👁️', color: '#60A5FA', sortOrder: 4 },
  { facetType: 'contentType', value: 'tattoos', displayName: 'Tattoos', icon: '🖋️', color: '#6B7280', sortOrder: 5 },
  { facetType: 'contentType', value: 'nails', displayName: 'Nails', icon: '💅', color: '#EC4899', sortOrder: 6 },

  // CAS - Clothing
  { facetType: 'contentType', value: 'tops', displayName: 'Tops', icon: '👕', color: '#8B5CF6', sortOrder: 10 },
  { facetType: 'contentType', value: 'bottoms', displayName: 'Bottoms', icon: '👖', color: '#3B82F6', sortOrder: 11 },
  { facetType: 'contentType', value: 'dresses', displayName: 'Dresses', icon: '👗', color: '#EC4899', sortOrder: 12 },
  { facetType: 'contentType', value: 'full-body', displayName: 'Full Body', icon: '🎽', color: '#10B981', sortOrder: 13 },
  { facetType: 'contentType', value: 'shoes', displayName: 'Shoes', icon: '👟', color: '#F97316', sortOrder: 14 },

  // CAS - Accessories
  { facetType: 'contentType', value: 'accessories', displayName: 'Accessories', icon: '👜', color: '#A855F7', sortOrder: 20 },
  { facetType: 'contentType', value: 'jewelry', displayName: 'Jewelry', icon: '💎', color: '#06B6D4', sortOrder: 21 },
  { facetType: 'contentType', value: 'glasses', displayName: 'Glasses', icon: '👓', color: '#64748B', sortOrder: 22 },
  { facetType: 'contentType', value: 'hats', displayName: 'Hats', icon: '🎩', color: '#78716C', sortOrder: 23 },

  // Build/Buy - Furniture
  { facetType: 'contentType', value: 'furniture', displayName: 'Furniture', icon: '🛋️', color: '#92400E', sortOrder: 30 },
  { facetType: 'contentType', value: 'lighting', displayName: 'Lighting', icon: '💡', color: '#FCD34D', sortOrder: 31 },
  { facetType: 'contentType', value: 'decor', displayName: 'Decor', icon: '🖼️', color: '#F87171', sortOrder: 32 },
  { facetType: 'contentType', value: 'clutter', displayName: 'Clutter', icon: '📚', color: '#A78BFA', sortOrder: 33 },
  { facetType: 'contentType', value: 'kitchen', displayName: 'Kitchen', icon: '🍳', color: '#34D399', sortOrder: 34 },
  { facetType: 'contentType', value: 'bathroom', displayName: 'Bathroom', icon: '🛁', color: '#60A5FA', sortOrder: 35 },
  { facetType: 'contentType', value: 'bedroom', displayName: 'Bedroom', icon: '🛏️', color: '#C084FC', sortOrder: 36 },
  { facetType: 'contentType', value: 'outdoor', displayName: 'Outdoor', icon: '🌳', color: '#22C55E', sortOrder: 37 },
  { facetType: 'contentType', value: 'plants', displayName: 'Plants', icon: '🪴', color: '#4ADE80', sortOrder: 38 },
  { facetType: 'contentType', value: 'rugs', displayName: 'Rugs', icon: '🧶', color: '#F472B6', sortOrder: 39 },
  { facetType: 'contentType', value: 'curtains', displayName: 'Curtains', icon: '🪟', color: '#818CF8', sortOrder: 40 },
  { facetType: 'contentType', value: 'electronics', displayName: 'Electronics', icon: '📺', color: '#475569', sortOrder: 41 },

  // Other Types
  { facetType: 'contentType', value: 'poses', displayName: 'Poses', icon: '🤸', color: '#F97316', sortOrder: 50 },
  { facetType: 'contentType', value: 'animations', displayName: 'Animations', icon: '🎬', color: '#EF4444', sortOrder: 51 },
  { facetType: 'contentType', value: 'gameplay-mod', displayName: 'Gameplay Mod', icon: '🎮', color: '#6366F1', sortOrder: 52 },
  { facetType: 'contentType', value: 'script-mod', displayName: 'Script Mod', icon: '📜', color: '#8B5CF6', sortOrder: 53 },
  { facetType: 'contentType', value: 'trait', displayName: 'Trait', icon: '🏷️', color: '#14B8A6', sortOrder: 54 },
  { facetType: 'contentType', value: 'career', displayName: 'Career', icon: '💼', color: '#0EA5E9', sortOrder: 55 },
  { facetType: 'contentType', value: 'food', displayName: 'Food & Recipes', icon: '🍕', color: '#F59E0B', sortOrder: 56 },
  { facetType: 'contentType', value: 'lot', displayName: 'Lot', icon: '🏠', color: '#84CC16', sortOrder: 57 },
  { facetType: 'contentType', value: 'ui-preset', displayName: 'UI / Preset', icon: '🎨', color: '#D946EF', sortOrder: 58 },
  { facetType: 'contentType', value: 'cas-background', displayName: 'CAS Background', icon: '🖥️', color: '#7C3AED', sortOrder: 59 },
  { facetType: 'contentType', value: 'loading-screen', displayName: 'Loading Screen', icon: '⏳', color: '#F43F5E', sortOrder: 60 },

  // Pregnancy / maternity — Revenue Pivot Initiative 1 (added 2026-04-09).
  // Populated by scripts/backfill-pregnancy-facet.ts which re-tags mods
  // matching the pregnancy/maternity keyword set in contentTypeDetector.
  { facetType: 'contentType', value: 'pregnancy', displayName: 'Pregnancy & Maternity', icon: '🤰', color: '#F472B6', sortOrder: 61 },

  // ==========================================
  // VISUAL STYLE - Art style
  // ==========================================
  { facetType: 'visualStyle', value: 'alpha', displayName: 'Alpha CC', description: 'Realistic, high-detail textures', icon: '✨', color: '#EC4899', sortOrder: 1 },
  { facetType: 'visualStyle', value: 'maxis-match', displayName: 'Maxis Match', description: 'Matches EA\'s art style', icon: '🎨', color: '#8B5CF6', sortOrder: 2 },
  { facetType: 'visualStyle', value: 'semi-maxis', displayName: 'Semi-Maxis', description: 'Blend of alpha and MM', icon: '🎭', color: '#6366F1', sortOrder: 3 },
  { facetType: 'visualStyle', value: 'clayified', displayName: 'Clayified', description: 'Clay-like textures', icon: '🏺', color: '#F97316', sortOrder: 4 },
  { facetType: 'visualStyle', value: 'realistic', displayName: 'Realistic', description: 'Photo-realistic style', icon: '📷', color: '#64748B', sortOrder: 5 },

  // ==========================================
  // THEMES - Aesthetic vibes
  // ==========================================

  // Seasonal
  { facetType: 'themes', value: 'christmas', displayName: 'Christmas', icon: '🎄', color: '#DC2626', sortOrder: 1 },
  { facetType: 'themes', value: 'halloween', displayName: 'Halloween', icon: '🎃', color: '#F97316', sortOrder: 2 },
  { facetType: 'themes', value: 'valentines', displayName: 'Valentine\'s', icon: '💕', color: '#EC4899', sortOrder: 3 },
  { facetType: 'themes', value: 'easter', displayName: 'Easter', icon: '🐰', color: '#A78BFA', sortOrder: 4 },
  { facetType: 'themes', value: 'summer', displayName: 'Summer', icon: '☀️', color: '#FBBF24', sortOrder: 5 },
  { facetType: 'themes', value: 'fall', displayName: 'Fall', icon: '🍂', color: '#D97706', sortOrder: 6 },
  { facetType: 'themes', value: 'winter', displayName: 'Winter', icon: '❄️', color: '#60A5FA', sortOrder: 7 },
  { facetType: 'themes', value: 'spring', displayName: 'Spring', icon: '🌸', color: '#F472B6', sortOrder: 8 },

  // Aesthetics
  { facetType: 'themes', value: 'cottagecore', displayName: 'Cottagecore', icon: '🌾', color: '#A3E635', sortOrder: 10 },
  { facetType: 'themes', value: 'y2k', displayName: 'Y2K', icon: '💿', color: '#E879F9', sortOrder: 11 },
  { facetType: 'themes', value: 'goth', displayName: 'Goth', icon: '🖤', color: '#1F2937', sortOrder: 12 },
  { facetType: 'themes', value: 'boho', displayName: 'Boho', icon: '🪶', color: '#92400E', sortOrder: 13 },
  { facetType: 'themes', value: 'modern', displayName: 'Modern', icon: '🏢', color: '#6B7280', sortOrder: 14 },
  { facetType: 'themes', value: 'vintage', displayName: 'Vintage', icon: '📻', color: '#D4A574', sortOrder: 15 },
  { facetType: 'themes', value: 'fantasy', displayName: 'Fantasy', icon: '🧙', color: '#7C3AED', sortOrder: 16 },
  { facetType: 'themes', value: 'sci-fi', displayName: 'Sci-Fi', icon: '🚀', color: '#06B6D4', sortOrder: 17 },
  { facetType: 'themes', value: 'romantic', displayName: 'Romantic', icon: '🌹', color: '#F43F5E', sortOrder: 18 },
  { facetType: 'themes', value: 'minimalist', displayName: 'Minimalist', icon: '⬜', color: '#E5E7EB', sortOrder: 19 },
  { facetType: 'themes', value: 'preppy', displayName: 'Preppy', icon: '🎀', color: '#EC4899', sortOrder: 20 },
  { facetType: 'themes', value: 'grunge', displayName: 'Grunge', icon: '🎸', color: '#4B5563', sortOrder: 21 },
  { facetType: 'themes', value: 'dark-academia', displayName: 'Dark Academia', icon: '📖', color: '#78350F', sortOrder: 22 },
  { facetType: 'themes', value: 'kawaii', displayName: 'Kawaii', icon: '🌈', color: '#F9A8D4', sortOrder: 23 },
  { facetType: 'themes', value: 'streetwear', displayName: 'Streetwear', icon: '🛹', color: '#1F2937', sortOrder: 24 },
  { facetType: 'themes', value: 'luxury', displayName: 'Luxury', icon: '👑', color: '#B45309', sortOrder: 25 },
  { facetType: 'themes', value: 'cozy', displayName: 'Cozy', icon: '🧸', color: '#FDE68A', sortOrder: 26 },
  { facetType: 'themes', value: 'beach', displayName: 'Beach', icon: '🏖️', color: '#38BDF8', sortOrder: 27 },
  { facetType: 'themes', value: 'tropical', displayName: 'Tropical', icon: '🌴', color: '#22C55E', sortOrder: 28 },
  { facetType: 'themes', value: 'rustic', displayName: 'Rustic', icon: '🪵', color: '#78350F', sortOrder: 29 },
  { facetType: 'themes', value: 'witchy', displayName: 'Witchy', icon: '🔮', color: '#7C3AED', sortOrder: 30 },
  { facetType: 'themes', value: 'fairycore', displayName: 'Fairycore', icon: '🧚', color: '#C4B5FD', sortOrder: 31 },

  // ==========================================
  // AGE GROUPS
  // ==========================================
  { facetType: 'ageGroups', value: 'infant', displayName: 'Infant', icon: '👶', color: '#FDE68A', sortOrder: 1 },
  { facetType: 'ageGroups', value: 'toddler', displayName: 'Toddler', icon: '🧒', color: '#FBBF24', sortOrder: 2 },
  { facetType: 'ageGroups', value: 'child', displayName: 'Child', icon: '👧', color: '#F97316', sortOrder: 3 },
  { facetType: 'ageGroups', value: 'teen', displayName: 'Teen', icon: '🧑', color: '#EF4444', sortOrder: 4 },
  { facetType: 'ageGroups', value: 'young-adult', displayName: 'Young Adult', icon: '👩', color: '#EC4899', sortOrder: 5 },
  { facetType: 'ageGroups', value: 'adult', displayName: 'Adult', icon: '🧑‍💼', color: '#8B5CF6', sortOrder: 6 },
  { facetType: 'ageGroups', value: 'elder', displayName: 'Elder', icon: '👵', color: '#6B7280', sortOrder: 7 },
  { facetType: 'ageGroups', value: 'all-ages', displayName: 'All Ages', icon: '👨‍👩‍👧‍👦', color: '#10B981', sortOrder: 8 },

  // ==========================================
  // GENDER OPTIONS
  // ==========================================
  { facetType: 'genderOptions', value: 'masculine', displayName: 'Masculine', icon: '♂️', color: '#3B82F6', sortOrder: 1 },
  { facetType: 'genderOptions', value: 'feminine', displayName: 'Feminine', icon: '♀️', color: '#EC4899', sortOrder: 2 },
  { facetType: 'genderOptions', value: 'unisex', displayName: 'Unisex', icon: '⚧️', color: '#8B5CF6', sortOrder: 3 },

  // ==========================================
  // OCCULT TYPES
  // ==========================================
  { facetType: 'occultTypes', value: 'human', displayName: 'Human', icon: '🧑', color: '#F59E0B', sortOrder: 1 },
  { facetType: 'occultTypes', value: 'vampire', displayName: 'Vampire', icon: '🧛', color: '#DC2626', sortOrder: 2 },
  { facetType: 'occultTypes', value: 'werewolf', displayName: 'Werewolf', icon: '🐺', color: '#78350F', sortOrder: 3 },
  { facetType: 'occultTypes', value: 'mermaid', displayName: 'Mermaid', icon: '🧜', color: '#06B6D4', sortOrder: 4 },
  { facetType: 'occultTypes', value: 'spellcaster', displayName: 'Spellcaster', icon: '🧙', color: '#7C3AED', sortOrder: 5 },
  { facetType: 'occultTypes', value: 'alien', displayName: 'Alien', icon: '👽', color: '#22C55E', sortOrder: 6 },
  { facetType: 'occultTypes', value: 'ghost', displayName: 'Ghost', icon: '👻', color: '#E5E7EB', sortOrder: 7 },

  // ==========================================
  // PACK REQUIREMENTS
  // ==========================================
  { facetType: 'packRequirements', value: 'base-game', displayName: 'Base Game Only', icon: '🎮', color: '#22C55E', sortOrder: 1 },
  { facetType: 'packRequirements', value: 'get-to-work', displayName: 'Get to Work', icon: '💼', color: '#3B82F6', sortOrder: 2 },
  { facetType: 'packRequirements', value: 'get-together', displayName: 'Get Together', icon: '🎉', color: '#EC4899', sortOrder: 3 },
  { facetType: 'packRequirements', value: 'city-living', displayName: 'City Living', icon: '🏙️', color: '#6366F1', sortOrder: 4 },
  { facetType: 'packRequirements', value: 'cats-and-dogs', displayName: 'Cats & Dogs', icon: '🐕', color: '#F97316', sortOrder: 5 },
  { facetType: 'packRequirements', value: 'seasons', displayName: 'Seasons', icon: '🌦️', color: '#14B8A6', sortOrder: 6 },
  { facetType: 'packRequirements', value: 'get-famous', displayName: 'Get Famous', icon: '⭐', color: '#FBBF24', sortOrder: 7 },
  { facetType: 'packRequirements', value: 'island-living', displayName: 'Island Living', icon: '🏝️', color: '#06B6D4', sortOrder: 8 },
  { facetType: 'packRequirements', value: 'discover-university', displayName: 'Discover University', icon: '🎓', color: '#8B5CF6', sortOrder: 9 },
  { facetType: 'packRequirements', value: 'eco-lifestyle', displayName: 'Eco Lifestyle', icon: '♻️', color: '#22C55E', sortOrder: 10 },
  { facetType: 'packRequirements', value: 'snowy-escape', displayName: 'Snowy Escape', icon: '🏔️', color: '#94A3B8', sortOrder: 11 },
  { facetType: 'packRequirements', value: 'cottage-living', displayName: 'Cottage Living', icon: '🏡', color: '#A3E635', sortOrder: 12 },
  { facetType: 'packRequirements', value: 'high-school-years', displayName: 'High School Years', icon: '📚', color: '#F43F5E', sortOrder: 13 },
  { facetType: 'packRequirements', value: 'growing-together', displayName: 'Growing Together', icon: '👨‍👩‍👧', color: '#A855F7', sortOrder: 14 },
  { facetType: 'packRequirements', value: 'horse-ranch', displayName: 'Horse Ranch', icon: '🐴', color: '#92400E', sortOrder: 15 },
  { facetType: 'packRequirements', value: 'for-rent', displayName: 'For Rent', icon: '🔑', color: '#0EA5E9', sortOrder: 16 },
  { facetType: 'packRequirements', value: 'lovestruck', displayName: 'Lovestruck', icon: '💘', color: '#F472B6', sortOrder: 17 },
  { facetType: 'packRequirements', value: 'life-and-death', displayName: 'Life & Death', icon: '💀', color: '#6B7280', sortOrder: 18 },
];

async function seedFacetDefinitions() {
  console.log('\n========================================');
  console.log('  SEEDING FACET DEFINITIONS');
  console.log('========================================\n');

  let created = 0;
  let updated = 0;

  for (const seed of FACET_SEEDS) {
    const existing = await prisma.facetDefinition.findUnique({
      where: {
        facetType_value: {
          facetType: seed.facetType,
          value: seed.value,
        },
      },
    });

    if (existing) {
      // Update existing
      await prisma.facetDefinition.update({
        where: { id: existing.id },
        data: {
          displayName: seed.displayName,
          description: seed.description,
          icon: seed.icon,
          color: seed.color,
          sortOrder: seed.sortOrder,
        },
      });
      updated++;
    } else {
      // Create new
      await prisma.facetDefinition.create({
        data: seed,
      });
      created++;
    }
  }

  console.log(`Created: ${created} facet definitions`);
  console.log(`Updated: ${updated} facet definitions`);
  console.log(`Total:   ${FACET_SEEDS.length} facet definitions\n`);

  // Print summary
  const facetTypes = Array.from(new Set(FACET_SEEDS.map(s => s.facetType)));
  console.log('Facet Types:');
  for (const type of facetTypes) {
    const count = FACET_SEEDS.filter(s => s.facetType === type).length;
    console.log(`  ${type.padEnd(15)} ${count} values`);
  }

  console.log('\n✅ Facet definitions seeded successfully!');

  await prisma.$disconnect();
}

seedFacetDefinitions().catch(console.error);
