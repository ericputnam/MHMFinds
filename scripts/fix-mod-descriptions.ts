/**
 * Fix Mod Descriptions Script
 *
 * This script finds mods with bad descriptions (metadata/breadcrumbs)
 * and regenerates them with original content.
 *
 * Usage:
 *   npx tsx scripts/fix-mod-descriptions.ts           # Dry run - preview changes
 *   npx tsx scripts/fix-mod-descriptions.ts --fix     # Apply fixes
 *   npx tsx scripts/fix-mod-descriptions.ts --fix --limit=100  # Fix first 100 only
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env.production', override: false });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Patterns that indicate a description is just metadata/breadcrumbs (at START of text)
const breadcrumbPatterns = [
  /^the sims resource\s*-/i,
  /^tsr\s*-/i,
  /^patreon\s*-/i,
  /^tumblr\s*-/i,
  /^mod\s*collective\s*-/i,
  /^curseforge\s*-/i,
  /^sims\s*dom\s*-/i,
  /^mod\s*the\s*sims\s*-/i,
  // Matches "Sims 4 - Hair - Category" pattern
  /^sims\s*4\s*-\s*(hair|clothing|makeup|skin|furniture|accessories|build|buy)/i,
  // Matches "[Site] - Sims 4 - Category" pattern
  /^[^-]+\s*-\s*sims\s*4\s*-\s*/i,
];

function isMetadataDescription(text: string): boolean {
  if (!text || text.length < 10) return true;

  // Check for breadcrumb patterns at the START
  if (breadcrumbPatterns.some(pattern => pattern.test(text))) {
    return true;
  }

  // Check for breadcrumb-style structure: multiple dashes at the start
  // Only flag if the FIRST 100 chars have 4+ dash separators
  const firstPart = text.substring(0, 100);
  const dashSeparators = (firstPart.match(/\s+-\s+/g) || []).length;
  if (dashSeparators >= 4) {
    return true;
  }

  // Check for "Download from [site]" style descriptions
  if (/^download\s+(from|at|on)\s+/i.test(text)) {
    return true;
  }

  // If description is ONLY the title repeated (very short, no punctuation)
  if (text.length < 50 && !text.includes('.') && !text.includes(',')) {
    return true;
  }

  return false;
}

function detectContentType(title: string): string | undefined {
  const text = title.toLowerCase();

  if (text.includes('hair') || text.includes('hairstyle') || text.includes('ponytail')) return 'hair';
  if (text.includes('top ') || text.includes(' tops') || text.includes('shirt') || text.includes('blouse')) return 'tops';
  if (text.includes('bottom') || text.includes('pants') || text.includes('skirt') || text.includes('jeans')) return 'bottoms';
  if (text.includes('dress') || text.includes('gown')) return 'dresses';
  if (text.includes('shoes') || text.includes('boots') || text.includes('heels') || text.includes('sneakers')) return 'shoes';
  if (text.includes('accessory') || text.includes('accessories')) return 'accessories';
  if (text.includes('jewelry') || text.includes('necklace') || text.includes('earring') || text.includes('ring ')) return 'jewelry';
  if (text.includes('makeup') || text.includes('lipstick') || text.includes('eyeshadow')) return 'makeup';
  if (text.includes('skin') || text.includes('skinblend') || text.includes('overlay')) return 'skin';
  if (text.includes('eye ') || text.includes('eyes') || text.includes('contacts')) return 'eyes';
  if (text.includes('furniture') || text.includes('chair') || text.includes('sofa') || text.includes('table')) return 'furniture';
  if (text.includes('decor') || text.includes('clutter')) return 'decor';
  if (text.includes('pose') || text.includes('animation')) return 'poses';
  if (text.includes('gameplay') || text.includes('mod ')) return 'gameplay-mod';
  if (text.includes('script')) return 'script-mod';

  return undefined;
}

function detectVisualStyle(title: string): string | undefined {
  const text = title.toLowerCase();

  if (text.includes('maxis match') || text.includes('maxis-match') || text.includes('mm ')) return 'maxis-match';
  if (text.includes('alpha') || text.includes('realistic')) return 'alpha';
  if (text.includes('semi-maxis') || text.includes('semi maxis')) return 'semi-maxis';
  if (text.includes('clayified')) return 'clayified';

  return undefined;
}

function categorizeMod(title: string): string {
  const text = title.toLowerCase();

  if (text.match(/\bhair(style)?s?\b/) || text.includes('hairstyle') || text.includes('ponytail') || text.includes('bun ')) {
    return 'Hair';
  }
  if (text.match(/\bpose[sd]?\b/) || text.includes('animation') || text.includes('posing')) {
    return 'Poses';
  }
  if (text.includes('makeup') || text.includes('blush') || text.includes('lipstick') || text.includes('eyeshadow') || text.includes('eyeliner')) {
    return 'CAS - Makeup';
  }
  if (text.includes('accessory') || text.includes('accessories') || text.includes('jewelry') || text.includes('necklace') || text.includes('earring')) {
    return 'CAS - Accessories';
  }
  if (text.includes('clothing') || text.includes('dress') || text.includes('outfit') || text.includes('shirt') || text.includes('pants') ||
      text.includes('shoes') || text.includes('sweater') || text.includes('jacket') || text.includes('top ') || text.includes(' tops')) {
    return 'CAS - Clothing';
  }
  if (text.includes('clutter') || text.includes('decor object')) {
    return 'Build/Buy - Clutter';
  }
  if (text.includes('build') || text.includes('furniture') || text.includes('chair') || text.includes('table') ||
      text.includes('sofa') || text.includes('bed ') || text.includes('kitchen') || text.includes('bathroom')) {
    return 'Build/Buy';
  }
  if (text.includes('gameplay') || text.includes('career') || text.includes('skill') || text.includes('aspiration')) {
    return 'Gameplay';
  }
  if (text.includes('script') || text.includes('trait') || text.match(/\bmods?\b/)) {
    return 'Scripts';
  }
  if (text.includes('cas') || text.includes('create-a-sim')) {
    return 'CAS';
  }

  return 'Other';
}

function generateDescription(
  title: string,
  author: string,
  contentType?: string,
  visualStyle?: string,
  category?: string
): { shortDescription: string; description: string } {
  const cleanTitle = title
    .replace(/^(download|get|free)\s+/i, '')
    .replace(/\s+(download|cc|custom content)$/i, '')
    .trim();

  const lowerTitle = cleanTitle.toLowerCase();

  // Detect hairstyle attributes
  const hairAttributes: string[] = [];
  if (lowerTitle.includes('ponytail')) hairAttributes.push('ponytail');
  if (lowerTitle.includes('updo')) hairAttributes.push('updo');
  if (lowerTitle.includes('braid') || lowerTitle.includes('braided')) hairAttributes.push('braided');
  if (lowerTitle.includes('bun')) hairAttributes.push('bun');
  if (lowerTitle.includes('curly') || lowerTitle.includes('curls')) hairAttributes.push('curly');
  if (lowerTitle.includes('wavy')) hairAttributes.push('wavy');
  if (lowerTitle.includes('straight')) hairAttributes.push('straight');
  if (lowerTitle.includes('long')) hairAttributes.push('long');
  if (lowerTitle.includes('short')) hairAttributes.push('short');
  if (lowerTitle.includes('medium')) hairAttributes.push('medium-length');
  if (lowerTitle.includes('bangs') || lowerTitle.includes('fringe')) hairAttributes.push('with bangs');
  if (lowerTitle.includes('bob')) hairAttributes.push('bob');
  if (lowerTitle.includes('pixie')) hairAttributes.push('pixie cut');
  if (lowerTitle.includes('afro')) hairAttributes.push('afro');

  // Detect clothing attributes
  const clothingAttributes: string[] = [];
  if (lowerTitle.includes('casual')) clothingAttributes.push('casual');
  if (lowerTitle.includes('formal')) clothingAttributes.push('formal');
  if (lowerTitle.includes('vintage')) clothingAttributes.push('vintage-inspired');
  if (lowerTitle.includes('modern')) clothingAttributes.push('modern');
  if (lowerTitle.includes('elegant')) clothingAttributes.push('elegant');
  if (lowerTitle.includes('cozy')) clothingAttributes.push('cozy');
  if (lowerTitle.includes('summer')) clothingAttributes.push('summer');
  if (lowerTitle.includes('winter')) clothingAttributes.push('winter');
  if (lowerTitle.includes('party')) clothingAttributes.push('party');
  if (lowerTitle.includes('everyday')) clothingAttributes.push('everyday');
  if (lowerTitle.includes('athletic') || lowerTitle.includes('sport')) clothingAttributes.push('athletic');

  // Detect makeup attributes
  const makeupAttributes: string[] = [];
  if (lowerTitle.includes('natural')) makeupAttributes.push('natural');
  if (lowerTitle.includes('glam') || lowerTitle.includes('glamorous')) makeupAttributes.push('glamorous');
  if (lowerTitle.includes('bold')) makeupAttributes.push('bold');
  if (lowerTitle.includes('subtle')) makeupAttributes.push('subtle');
  if (lowerTitle.includes('smoky') || lowerTitle.includes('smokey')) makeupAttributes.push('smoky');
  if (lowerTitle.includes('glitter') || lowerTitle.includes('sparkle')) makeupAttributes.push('sparkly');

  // Format visual style for description
  let styleDescription = '';
  if (visualStyle === 'maxis-match') {
    styleDescription = 'This Maxis Match content seamlessly blends with the base game aesthetic. ';
  } else if (visualStyle === 'alpha') {
    styleDescription = 'This alpha CC features a realistic, high-detail style. ';
  } else if (visualStyle === 'semi-maxis') {
    styleDescription = 'This semi-maxis content offers a balanced blend of realistic and Maxis Match styles. ';
  }

  let shortDesc = '';
  let longDesc = '';

  const detectedType = contentType || detectContentType(title);
  const detectedCategory = category || categorizeMod(title);

  switch (detectedType) {
    case 'hair':
      const hairDesc = hairAttributes.length > 0
        ? `A beautiful ${hairAttributes.join(', ')} hairstyle`
        : 'A stunning hairstyle';
      shortDesc = `${hairDesc} for your Sims by ${author}.`;
      longDesc = `${hairDesc} created by ${author}. ${styleDescription}Perfect for adding variety to your Sims' look. This custom content hairstyle is compatible with The Sims 4 and offers a fresh option for your Create-A-Sim wardrobe.`;
      break;

    case 'tops':
    case 'bottoms':
    case 'dresses':
      const clothingDesc = clothingAttributes.length > 0
        ? `A ${clothingAttributes.join(', ')} ${detectedType === 'tops' ? 'top' : detectedType === 'bottoms' ? 'bottom' : 'dress'}`
        : `A stylish ${detectedType === 'tops' ? 'top' : detectedType === 'bottoms' ? 'bottom' : 'dress'}`;
      shortDesc = `${clothingDesc} for your Sims by ${author}.`;
      longDesc = `${clothingDesc} created by ${author}. ${styleDescription}This custom content clothing item adds a fresh fashion option to your Sims' closet. Perfect for everyday wear or special occasions.`;
      break;

    case 'shoes':
      shortDesc = `Stylish footwear for your Sims by ${author}.`;
      longDesc = `Fashionable shoes created by ${author}. ${styleDescription}Complete your Sims' outfits with this custom footwear option. Designed to complement a variety of styles.`;
      break;

    case 'accessories':
    case 'jewelry':
      shortDesc = `Beautiful ${detectedType} for your Sims by ${author}.`;
      longDesc = `Stunning ${detectedType} created by ${author}. ${styleDescription}Add the perfect finishing touch to your Sims' look with these custom accessories.`;
      break;

    case 'makeup':
      const makeupDesc = makeupAttributes.length > 0
        ? `A ${makeupAttributes.join(', ')} makeup look`
        : 'A beautiful makeup look';
      shortDesc = `${makeupDesc} for your Sims by ${author}.`;
      longDesc = `${makeupDesc} created by ${author}. ${styleDescription}Enhance your Sims' appearance with this custom makeup. Perfect for creating diverse and unique looks in Create-A-Sim.`;
      break;

    case 'skin':
      shortDesc = `Custom skin overlay for your Sims by ${author}.`;
      longDesc = `High-quality skin content created by ${author}. ${styleDescription}Enhance your Sims' appearance with this custom skin option. Designed to work seamlessly with your existing CC.`;
      break;

    case 'eyes':
      shortDesc = `Custom eye contacts/colors for your Sims by ${author}.`;
      longDesc = `Beautiful eye content created by ${author}. ${styleDescription}Give your Sims stunning new eye options with this custom content.`;
      break;

    case 'furniture':
    case 'decor':
      shortDesc = `Custom ${detectedType} for your Sims' homes by ${author}.`;
      longDesc = `${detectedType.charAt(0).toUpperCase() + detectedType.slice(1)} created by ${author}. ${styleDescription}Add personality to your Sims' living spaces with this custom build/buy content.`;
      break;

    case 'poses':
      shortDesc = `Custom poses for your Sims by ${author}.`;
      longDesc = `Expressive pose pack created by ${author}. Perfect for storytelling, screenshots, and creating memorable moments with your Sims. Compatible with pose player mods.`;
      break;

    case 'gameplay-mod':
    case 'script-mod':
      shortDesc = `A gameplay mod for The Sims 4 by ${author}.`;
      longDesc = `Gameplay modification created by ${author}. This mod enhances or changes gameplay mechanics in The Sims 4. Always read the creator's documentation for installation and compatibility information.`;
      break;

    default:
      if (detectedCategory === 'Hair') {
        shortDesc = `Custom hairstyle for your Sims by ${author}.`;
        longDesc = `A beautiful custom hairstyle created by ${author}. ${styleDescription}Perfect for adding variety to your Sims' Create-A-Sim options.`;
      } else if (detectedCategory.startsWith('CAS')) {
        shortDesc = `Custom content for Create-A-Sim by ${author}.`;
        longDesc = `Create-A-Sim custom content created by ${author}. ${styleDescription}Enhance your Sims' appearance with this custom content.`;
      } else if (detectedCategory.startsWith('Build')) {
        shortDesc = `Custom build/buy content by ${author}.`;
        longDesc = `Build and buy mode content created by ${author}. ${styleDescription}Add new options to your Sims' homes with this custom content.`;
      } else if (detectedCategory === 'Poses') {
        shortDesc = `Custom poses for your Sims by ${author}.`;
        longDesc = `Pose pack created by ${author}. Perfect for screenshots and storytelling with your Sims.`;
      } else {
        shortDesc = `Custom content for The Sims 4 by ${author}.`;
        longDesc = `Custom content created by ${author}. ${styleDescription}Enhance your Sims 4 experience with this community-created content.`;
      }
  }

  return {
    shortDescription: shortDesc.substring(0, 200),
    description: longDesc.substring(0, 1000),
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log('FIX MOD DESCRIPTIONS');
  console.log('='.repeat(60));
  console.log('');

  const args = process.argv.slice(2);
  const fix = args.includes('--fix');
  let limit: number | undefined;

  for (const arg of args) {
    if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.split('=')[1], 10);
    }
  }

  console.log(`Mode: ${fix ? 'FIX' : 'DRY RUN (preview only)'}`);
  if (limit) console.log(`Limit: ${limit} mods`);
  console.log('');

  // Find all mods
  const mods = await prisma.mod.findMany({
    select: {
      id: true,
      title: true,
      author: true,
      description: true,
      shortDescription: true,
      contentType: true,
      visualStyle: true,
      category: true,
    },
    take: limit,
  });

  console.log(`Found ${mods.length} mods to check`);
  console.log('');

  let badDescriptionCount = 0;
  let fixedCount = 0;

  for (const mod of mods) {
    const hasBadDescription = isMetadataDescription(mod.description || '') ||
                              isMetadataDescription(mod.shortDescription || '');

    if (hasBadDescription) {
      badDescriptionCount++;

      const { shortDescription, description } = generateDescription(
        mod.title,
        mod.author || 'Unknown Creator',
        mod.contentType || undefined,
        mod.visualStyle || undefined,
        mod.category || undefined
      );

      console.log(`${badDescriptionCount}. ${mod.title}`);
      console.log(`   OLD short: ${(mod.shortDescription || '').substring(0, 80)}...`);
      console.log(`   NEW short: ${shortDescription.substring(0, 80)}...`);

      if (fix) {
        await prisma.mod.update({
          where: { id: mod.id },
          data: {
            description,
            shortDescription,
          },
        });
        fixedCount++;
        console.log(`   FIXED`);
      }
      console.log('');
    }
  }

  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Mods checked: ${mods.length}`);
  console.log(`Mods with bad descriptions: ${badDescriptionCount}`);
  if (fix) {
    console.log(`Mods fixed: ${fixedCount}`);
  } else {
    console.log('');
    console.log('Run with --fix to apply changes');
  }
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
