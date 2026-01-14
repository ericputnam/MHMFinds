/**
 * SEARCH-003: Verify search relevance improvements
 *
 * Tests that search ranking fixes are working correctly by
 * querying various search terms and checking the results.
 */

import { prisma } from '../../lib/prisma';

interface ScoredMod {
  id: string;
  title: string;
  contentType: string | null;
  description: string | null;
  tags: string[];
  downloadCount: number;
  _relevanceScore?: number;
}

function calculateRelevanceScore(mod: ScoredMod, searchTerm: string): number {
  let score = 0;
  const titleLower = (mod.title || '').toLowerCase();
  const descLower = (mod.description || '').toLowerCase();
  const contentTypeLower = (mod.contentType || '').toLowerCase();
  const tagsLower = (mod.tags || []).map(t => t.toLowerCase());

  // Create word boundary regex for exact word matching
  const wordBoundaryRegex = new RegExp(`\\b${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');

  // Highest priority: exact contentType match
  if (contentTypeLower === searchTerm) {
    score += 100;
  }

  // High priority: exact word match in title
  if (wordBoundaryRegex.test(titleLower)) {
    score += 80;
  } else if (titleLower.includes(searchTerm)) {
    score += 30;
  }

  // Medium priority: exact tag match
  if (tagsLower.includes(searchTerm)) {
    score += 50;
  }

  // Lower priority: title starts with search term
  if (titleLower.startsWith(searchTerm)) {
    score += 20;
  }

  // Lowest priority: description match
  if (wordBoundaryRegex.test(descLower)) {
    score += 15;
  } else if (descLower.includes(searchTerm)) {
    score += 5;
  }

  // Small boost for popularity
  const popularityBoost = Math.log10((mod.downloadCount || 0) + 10) * 2;
  score += popularityBoost;

  return score;
}

async function testSearch(searchTerm: string): Promise<{
  term: string;
  results: Array<{
    rank: number;
    title: string;
    contentType: string | null;
    score: number;
    hasExactTitleMatch: boolean;
    hasContentTypeMatch: boolean;
  }>;
}> {
  const searchLower = searchTerm.toLowerCase().trim();

  // Query mods matching the search term
  const mods = await prisma.mod.findMany({
    where: {
      isVerified: true,
      isNSFW: false,
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { tags: { hasSome: [searchTerm] } },
        { contentType: { equals: searchLower, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      title: true,
      contentType: true,
      description: true,
      tags: true,
      downloadCount: true,
    },
    take: 100,
  });

  // Score and sort
  const scoredMods = mods.map(mod => ({
    ...mod,
    _relevanceScore: calculateRelevanceScore(mod, searchLower),
  }));

  scoredMods.sort((a, b) => b._relevanceScore - a._relevanceScore);

  // Return top 10 results
  const wordBoundaryRegex = new RegExp(`\\b${searchLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');

  return {
    term: searchTerm,
    results: scoredMods.slice(0, 10).map((mod, i) => ({
      rank: i + 1,
      title: mod.title,
      contentType: mod.contentType,
      score: mod._relevanceScore,
      hasExactTitleMatch: wordBoundaryRegex.test(mod.title.toLowerCase()),
      hasContentTypeMatch: (mod.contentType || '').toLowerCase() === searchLower,
    })),
  };
}

async function main() {
  console.log('='.repeat(80));
  console.log('SEARCH-003: Search Relevance Verification');
  console.log('='.repeat(80));
  console.log('');

  const searchTerms = ['glasses', 'hair', 'makeup', 'furniture', 'dress'];
  const results: string[] = [];

  for (const term of searchTerms) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Testing search: "${term}"`);
    console.log('─'.repeat(60));

    const searchResult = await testSearch(term);
    results.push(`\n## Search: "${term}"\n`);

    if (searchResult.results.length === 0) {
      console.log('  No results found');
      results.push('No results found\n');
      continue;
    }

    console.log(`\n  Top 10 Results:`);
    console.log(`  ${'─'.repeat(56)}`);

    results.push('| Rank | Title | ContentType | Score | Exact Match | Type Match |');
    results.push('|------|-------|-------------|-------|-------------|------------|');

    for (const result of searchResult.results) {
      const titleShort = result.title.length > 35
        ? result.title.substring(0, 35) + '...'
        : result.title;

      const exactIcon = result.hasExactTitleMatch ? '✓' : '';
      const typeIcon = result.hasContentTypeMatch ? '✓' : '';

      console.log(`  ${result.rank.toString().padStart(2)}. [${result.score.toFixed(1).padStart(6)}] ${titleShort.padEnd(40)} ${result.contentType?.padEnd(12) || '(null)'.padEnd(12)} ${exactIcon.padEnd(2)} ${typeIcon}`);

      results.push(`| ${result.rank} | ${result.title.substring(0, 40)} | ${result.contentType || '(null)'} | ${result.score.toFixed(1)} | ${exactIcon} | ${typeIcon} |`);
    }

    // Check if top results are good
    const top3ContentTypeMatches = searchResult.results.slice(0, 3).filter(r => r.hasContentTypeMatch).length;
    const top3TitleMatches = searchResult.results.slice(0, 3).filter(r => r.hasExactTitleMatch).length;

    console.log(`\n  Analysis:`);
    console.log(`    Top 3 with contentType match: ${top3ContentTypeMatches}/3`);
    console.log(`    Top 3 with exact title match: ${top3TitleMatches}/3`);

    if (top3ContentTypeMatches >= 2 || top3TitleMatches >= 2) {
      console.log(`    ✓ Search relevance looks good!`);
    } else {
      console.log(`    ⚠ Search relevance may need tuning`);
    }
  }

  // Write results to file
  const output = [
    '# Search Relevance Test Results',
    `\nGenerated: ${new Date().toISOString()}`,
    '\nThis test verifies that search relevance scoring is working correctly.',
    '\n## Scoring System:',
    '- contentType exact match: +100 points',
    '- Title exact word match: +80 points',
    '- Title partial match: +30 points',
    '- Tag exact match: +50 points',
    '- Title starts with term: +20 points',
    '- Description exact word: +15 points',
    '- Description partial: +5 points',
    '- Popularity bonus: log10(downloads + 10) * 2',
    ...results,
  ].join('\n');

  const fs = await import('fs');
  fs.writeFileSync('scripts/ralph/search-relevance-test.txt', output);
  console.log('\n\nResults saved to: scripts/ralph/search-relevance-test.txt');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
