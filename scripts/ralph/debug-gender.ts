#!/usr/bin/env npx tsx
const FEMININE_KEYWORDS = [
  'female', 'women', 'woman', 'feminine', 'girl', 'girls',
  'ladies', 'lady', 'her', 'she', 'femme',
  'female frame', 'feminine frame', 'f frame',
  'for females', 'for women', 'female only'
];
const MASCULINE_KEYWORDS = [
  'male', 'men', 'man', 'masculine', 'boy', 'boys',
  'guys', 'guy', 'him', 'he', 'masc',
  'male frame', 'masculine frame', 'm frame',
  'for males', 'for men', 'male only'
];

const testTexts = [
  'Sims 4 CC, female',
  'Sims 4 CC, male',
  'female only',
  'for women only'
];

for (const text of testTexts) {
  const lower = text.toLowerCase();
  const hasFem = FEMININE_KEYWORDS.some(kw => lower.includes(kw));
  const hasMasc = MASCULINE_KEYWORDS.some(kw => lower.includes(kw));
  console.log(text + ' -> fem:', hasFem, 'masc:', hasMasc);
}

// The issue: 'female' contains 'male'!
console.log('\n--- Problem: female contains male ---');
console.log('female'.includes('male'));
