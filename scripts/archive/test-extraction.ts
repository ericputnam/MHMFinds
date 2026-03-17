#!/usr/bin/env npx tsx
import { VisionFacetExtractor } from '../lib/services/visionFacetExtractor.js';

const extractor = new VisionFacetExtractor();

const tests = [
  'Christmas Loading Screen Set',
  'Loading Screen Collection',
  'Cozy Christmas Loading Screen',
  'Santa Sweaters',
  'Christmas Throw Pillow',
  'Advent Calendar',
  'Christmas Pet Beds',
  'Christmas Scratch Post',
  'Festive Appetizers',
  'Refreshed Main Menu: Homey Christmas',
  'Winter Loading Screen Pack',
  'Family Christmas Sweater',
  'Christmas Lingerie Set',
  'Xmas Jammies',
  'Snowy December',
  'Modern Couple House',
  'Kayla Brows',
  'Cerise Lips',
  'AM & PM Traditions',
  'Holly Set',
];

console.log('Testing improved extraction:');
console.log('='.repeat(80));

async function run() {
  for (const title of tests) {
    const result = await extractor.extractFacets(null, title, null, [], null);
    const themes = result.themes.length > 0 ? result.themes.join(', ') : '-';
    console.log(`${title.padEnd(45)} → ${(result.contentType || '-').padEnd(15)} | ${themes}`);
  }
}

run();
