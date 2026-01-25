#!/usr/bin/env npx tsx
/**
 * CTB-002: Create Missing FacetDefinitions
 *
 * Auto-creates FacetDefinition entries for content types that exist in mods
 * but lack definitions, plus new granular types and room themes.
 *
 * Acceptance Criteria:
 * 1. Create scripts/ralph/ctb-002-create-facets.ts script
 * 2. Create FacetDefinitions for: pet-furniture, cas-background, loading-screen, preset
 * 3. Create FacetDefinitions for new granular types: eyebrows, lashes, eyeliner, blush, lipstick, beard, facial-hair
 * 4. Create FacetDefinitions for room themes: bathroom, kitchen, bedroom, living-room, dining-room, outdoor, office, kids-room, nursery
 * 5. Use upsert to avoid duplicates
 * 6. Set sensible displayName, sortOrder, and isActive=true
 * 7. Log created definitions
 * 8. npm run type-check passes
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface FacetDefinitionInput {
  facetType: string;
  value: string;
  displayName: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
}

// Content Types that exist in mods but lack FacetDefinitions (from CTB-001 audit)
const orphanedContentTypes: FacetDefinitionInput[] = [
  {
    facetType: 'contentType',
    value: 'preset',
    displayName: 'Preset',
    description: 'CAS presets including body presets, face presets, and sim presets',
    icon: '👤',
    color: '#8B5CF6', // purple
    sortOrder: 100,
    isActive: true,
  },
  {
    facetType: 'contentType',
    value: 'loading-screen',
    displayName: 'Loading Screen',
    description: 'Custom loading screens and main menu overrides',
    icon: '🖼️',
    color: '#06B6D4', // cyan
    sortOrder: 101,
    isActive: true,
  },
  {
    facetType: 'contentType',
    value: 'cas-background',
    displayName: 'CAS Background',
    description: 'Custom Create-A-Sim background rooms and environments',
    icon: '🎨',
    color: '#EC4899', // pink
    sortOrder: 102,
    isActive: true,
  },
  {
    facetType: 'contentType',
    value: 'pet-furniture',
    displayName: 'Pet Furniture',
    description: 'Furniture and items for pets including beds, bowls, and scratch posts',
    icon: '🐾',
    color: '#F59E0B', // amber
    sortOrder: 103,
    isActive: true,
  },
];

// New granular face/makeup content types for better categorization
const granularFaceTypes: FacetDefinitionInput[] = [
  {
    facetType: 'contentType',
    value: 'eyebrows',
    displayName: 'Eyebrows',
    description: 'Eyebrow styles and shapes',
    icon: '👁️',
    color: '#78716C', // stone
    sortOrder: 200,
    isActive: true,
  },
  {
    facetType: 'contentType',
    value: 'lashes',
    displayName: 'Lashes',
    description: 'Eyelashes and lash accessories',
    icon: '👁️',
    color: '#292524', // stone-900
    sortOrder: 201,
    isActive: true,
  },
  {
    facetType: 'contentType',
    value: 'eyeliner',
    displayName: 'Eyeliner',
    description: 'Eyeliner styles and looks',
    icon: '✏️',
    color: '#1C1917', // stone-950
    sortOrder: 202,
    isActive: true,
  },
  {
    facetType: 'contentType',
    value: 'blush',
    displayName: 'Blush',
    description: 'Blush and cheek color',
    icon: '🌸',
    color: '#FDA4AF', // rose-300
    sortOrder: 203,
    isActive: true,
  },
  {
    facetType: 'contentType',
    value: 'lipstick',
    displayName: 'Lipstick',
    description: 'Lipstick, lip gloss, and lip color',
    icon: '💄',
    color: '#E11D48', // rose-600
    sortOrder: 204,
    isActive: true,
  },
  {
    facetType: 'contentType',
    value: 'beard',
    displayName: 'Beard',
    description: 'Beards and goatees',
    icon: '🧔',
    color: '#57534E', // stone-600
    sortOrder: 205,
    isActive: true,
  },
  {
    facetType: 'contentType',
    value: 'facial-hair',
    displayName: 'Facial Hair',
    description: 'Mustaches, sideburns, and other facial hair',
    icon: '🥸',
    color: '#44403C', // stone-700
    sortOrder: 206,
    isActive: true,
  },
];

// Room themes (facetType = 'themes', NOT 'contentType')
// These are used alongside contentType to tag mods by room
const roomThemes: FacetDefinitionInput[] = [
  {
    facetType: 'themes',
    value: 'bathroom',
    displayName: 'Bathroom',
    description: 'Items suited for bathroom spaces',
    icon: '🚿',
    color: '#38BDF8', // sky-400
    sortOrder: 300,
    isActive: true,
  },
  {
    facetType: 'themes',
    value: 'kitchen',
    displayName: 'Kitchen',
    description: 'Items suited for kitchen spaces',
    icon: '🍳',
    color: '#FB923C', // orange-400
    sortOrder: 301,
    isActive: true,
  },
  {
    facetType: 'themes',
    value: 'bedroom',
    displayName: 'Bedroom',
    description: 'Items suited for bedroom spaces',
    icon: '🛏️',
    color: '#A78BFA', // violet-400
    sortOrder: 302,
    isActive: true,
  },
  {
    facetType: 'themes',
    value: 'living-room',
    displayName: 'Living Room',
    description: 'Items suited for living room spaces',
    icon: '🛋️',
    color: '#4ADE80', // green-400
    sortOrder: 303,
    isActive: true,
  },
  {
    facetType: 'themes',
    value: 'dining-room',
    displayName: 'Dining Room',
    description: 'Items suited for dining room spaces',
    icon: '🍽️',
    color: '#F472B6', // pink-400
    sortOrder: 304,
    isActive: true,
  },
  {
    facetType: 'themes',
    value: 'outdoor',
    displayName: 'Outdoor',
    description: 'Items suited for outdoor and garden spaces',
    icon: '🌳',
    color: '#22C55E', // green-500
    sortOrder: 305,
    isActive: true,
  },
  {
    facetType: 'themes',
    value: 'office',
    displayName: 'Office',
    description: 'Items suited for office and study spaces',
    icon: '💼',
    color: '#64748B', // slate-500
    sortOrder: 306,
    isActive: true,
  },
  {
    facetType: 'themes',
    value: 'kids-room',
    displayName: 'Kids Room',
    description: 'Items suited for children\'s bedrooms and play areas',
    icon: '🧸',
    color: '#FBBF24', // amber-400
    sortOrder: 307,
    isActive: true,
  },
  {
    facetType: 'themes',
    value: 'nursery',
    displayName: 'Nursery',
    description: 'Items suited for baby and infant rooms',
    icon: '👶',
    color: '#FDE68A', // amber-200
    sortOrder: 308,
    isActive: true,
  },
];

async function createFacetDefinitions(): Promise<void> {
  console.log('Starting CTB-002: Create Missing FacetDefinitions...\n');

  const allDefinitions = [
    ...orphanedContentTypes,
    ...granularFaceTypes,
    ...roomThemes,
  ];

  console.log(`Preparing to upsert ${allDefinitions.length} FacetDefinitions:\n`);
  console.log('Orphaned Content Types (from CTB-001 audit):');
  for (const def of orphanedContentTypes) {
    console.log(`  - ${def.value}: "${def.displayName}"`);
  }

  console.log('\nNew Granular Face/Makeup Types:');
  for (const def of granularFaceTypes) {
    console.log(`  - ${def.value}: "${def.displayName}"`);
  }

  console.log('\nRoom Themes (facetType="themes"):');
  for (const def of roomThemes) {
    console.log(`  - ${def.value}: "${def.displayName}"`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Processing upserts...\n');

  let created = 0;
  let updated = 0;

  for (const def of allDefinitions) {
    const result = await prisma.facetDefinition.upsert({
      where: {
        facetType_value: {
          facetType: def.facetType,
          value: def.value,
        },
      },
      update: {
        displayName: def.displayName,
        description: def.description,
        icon: def.icon,
        color: def.color,
        sortOrder: def.sortOrder,
        isActive: def.isActive,
      },
      create: {
        facetType: def.facetType,
        value: def.value,
        displayName: def.displayName,
        description: def.description,
        icon: def.icon,
        color: def.color,
        sortOrder: def.sortOrder,
        isActive: def.isActive,
      },
    });

    // Check if it was created (new) or updated (existing)
    // We can infer by comparing timestamps, but simpler to just log the operation
    const existingCheck = await prisma.facetDefinition.findUnique({
      where: {
        facetType_value: {
          facetType: def.facetType,
          value: def.value,
        },
      },
      select: { createdAt: true, updatedAt: true },
    });

    if (existingCheck) {
      const isNew = existingCheck.createdAt.getTime() === existingCheck.updatedAt.getTime();
      if (isNew) {
        created++;
        console.log(`[CREATED] ${def.facetType}/${def.value} -> "${def.displayName}"`);
      } else {
        updated++;
        console.log(`[UPDATED] ${def.facetType}/${def.value} -> "${def.displayName}"`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total FacetDefinitions processed: ${allDefinitions.length}`);
  console.log(`  - Created: ${created}`);
  console.log(`  - Updated: ${updated}`);

  // Verify the results
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION');
  console.log('='.repeat(60));

  const contentTypeFacets = await prisma.facetDefinition.findMany({
    where: { facetType: 'contentType' },
    orderBy: { sortOrder: 'asc' },
    select: { value: true, displayName: true, isActive: true },
  });

  const themeFacets = await prisma.facetDefinition.findMany({
    where: { facetType: 'themes' },
    orderBy: { sortOrder: 'asc' },
    select: { value: true, displayName: true, isActive: true },
  });

  console.log(`\nTotal contentType FacetDefinitions: ${contentTypeFacets.length}`);
  console.log(`Total themes FacetDefinitions: ${themeFacets.length}`);

  // Check for the specifically required orphaned types
  const requiredOrphanedTypes = ['pet-furniture', 'cas-background', 'loading-screen', 'preset'];
  console.log('\nOrphaned content types verification:');
  for (const type of requiredOrphanedTypes) {
    const exists = contentTypeFacets.some((f) => f.value === type);
    console.log(`  ${exists ? '[OK]' : '[MISSING]'} ${type}`);
  }

  // Check for the required granular face types
  const requiredGranularTypes = ['eyebrows', 'lashes', 'eyeliner', 'blush', 'lipstick', 'beard', 'facial-hair'];
  console.log('\nGranular face types verification:');
  for (const type of requiredGranularTypes) {
    const exists = contentTypeFacets.some((f) => f.value === type);
    console.log(`  ${exists ? '[OK]' : '[MISSING]'} ${type}`);
  }

  // Check for the required room themes
  const requiredRoomThemes = ['bathroom', 'kitchen', 'bedroom', 'living-room', 'dining-room', 'outdoor', 'office', 'kids-room', 'nursery'];
  console.log('\nRoom themes verification:');
  for (const theme of requiredRoomThemes) {
    const exists = themeFacets.some((f) => f.value === theme);
    console.log(`  ${exists ? '[OK]' : '[MISSING]'} ${theme}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('CTB-002 Complete!');
  console.log('='.repeat(60) + '\n');

  await prisma.$disconnect();
}

createFacetDefinitions().catch(async (e) => {
  console.error('CTB-002 failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
