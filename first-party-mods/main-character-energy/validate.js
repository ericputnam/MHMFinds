/**
 * Adversarial validation of the built .package. Reads the file back from raw
 * bytes (no shared state with the builder) and verifies structure, parsing,
 * and cross-references. Exits non-zero on any failure.
 */
const fs = require("fs");
const path = require("path");
const { Package, StringTableResource, SimDataResource } = require("@s4tk/models");
const enums = require("@s4tk/models/enums");
const { fnv64 } = require("@s4tk/hashing");
const { DdsImage } = require("@s4tk/images");

const { TuningResourceType, BinaryResourceType, SimDataGroup, StringTableLocale } = enums;

const FILE = path.join(__dirname, "dist", "MHM-Main-Character-Energy-Trait-Pack-v1.0.package");
const VERIFIED_MOODS = new Set(["14634", "14636", "14640", "14641", "14642"]);

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log(`  PASS  ${msg}`);
  else { console.error(`  FAIL  ${msg}`); failures++; }
};

function attr(xml, name) {
  const m = xml.match(new RegExp(`<I[^>]*\\b${name}="([^"]*)"`));
  return m ? m[1] : null;
}
function tunable(xml, name) {
  const m = xml.match(new RegExp(`<T[^>]*n="${name}"[^>]*>([^<]*)<`));
  return m ? m[1] : null;
}

const buffer = fs.readFileSync(FILE);
const pkg = Package.from(buffer);
console.log(`Loaded ${FILE}`);
console.log(`Total resources: ${pkg.size}\n`);

// Index resources by type
const byType = new Map();
for (const entry of pkg.entries) {
  const t = entry.key.type;
  if (!byType.has(t)) byType.set(t, []);
  byType.get(t).push(entry);
}

const traits = byType.get(TuningResourceType.Trait) ?? [];
const buffs = byType.get(TuningResourceType.Buff) ?? [];
const simdatas = byType.get(BinaryResourceType.SimData) ?? [];
const stbls = byType.get(BinaryResourceType.StringTable) ?? [];
const dsts = byType.get(BinaryResourceType.DstImage) ?? [];
const pngs = byType.get(0x2f7d0004) ?? [];

console.log("== Resource counts ==");
ok(traits.length === 4, `4 trait tunings (got ${traits.length})`);
ok(buffs.length === 4, `4 buff tunings (got ${buffs.length})`);
ok(simdatas.length === 8, `8 SimData resources (got ${simdatas.length})`);
ok(stbls.length === 18, `18 string tables (got ${stbls.length})`);
ok(dsts.length === 4 && pngs.length === 4, `4 DST + 4 PNG icons (got ${dsts.length}/${pngs.length})`);

// Collect every string key present in the English STBL
console.log("\n== String tables ==");
const localeSeen = new Set();
let englishKeys = new Set();
for (const e of stbls) {
  const stbl = StringTableResource.from(e.value.getBuffer ? e.value.getBuffer() : e.value.buffer);
  const locale = StringTableLocale.getLocale(e.key.instance);
  localeSeen.add(locale);
  ok(stbl.size === 16, `${StringTableLocale[locale]} STBL parses with 16 entries (got ${stbl.size})`);
  if (locale === StringTableLocale.English) {
    for (const s of stbl.entries) englishKeys.add(s.key);
  }
  ok(e.key.group === 0x80000000, `${StringTableLocale[locale]} STBL group is 0x80000000`);
}
ok(localeSeen.size === 18, `all 18 locales distinct (got ${localeSeen.size})`);

// SimData index
const simdataByKey = new Map(simdatas.map((e) => [`${e.key.group.toString(16)}:${e.key.instance}`, e]));
const dstInstances = new Set(dsts.map((e) => e.key.instance));
const pngInstances = new Set(pngs.map((e) => e.key.instance));
const buffByInstance = new Map();
for (const e of buffs) buffByInstance.set(BigInt(attr(e.value.content, "s")), e);

console.log("\n== Traits ==");
for (const e of traits) {
  const xml = e.value.content;
  const name = attr(xml, "n");
  const inst = BigInt(attr(xml, "s"));
  console.log(` -- ${name}`);
  ok(attr(xml, "c") === "Trait" && attr(xml, "m") === "traits.traits", "class/module correct");
  ok(inst === e.key.instance, "tuning s= matches resource key instance");
  ok(inst === fnv64(name), "instance is fnv64(name)");
  ok(xml.includes('n="trait_type">PERSONALITY'), "trait_type PERSONALITY");
  ok(xml.includes("<E>TEEN</E>") && xml.includes("<E>ELDER</E>"), "ages include TEEN..ELDER");

  // paired SimData in trait group
  const sd = simdataByKey.get(`${SimDataGroup.Trait.toString(16)}:${e.key.instance}`);
  ok(!!sd, "paired Trait SimData exists (group 0x005FDD0C, same instance)");
  if (sd) {
    const parsed = SimDataResource.from(sd.value.getBuffer ? sd.value.getBuffer() : sd.value.buffer);
    const sdXml = parsed.toXmlDocument().toXml();
    ok(sdXml.includes(`name="${name}"`), "SimData instance name matches tuning name");
    ok(sdXml.includes('schema="Trait"') || sdXml.includes('name="Trait"'), "SimData uses Trait schema");
    ok(sdXml.includes('name="trait_type">0<') || /name="trait_type"[^>]*>0</.test(sdXml), "SimData trait_type=0 (PERSONALITY)");
  }

  // referenced buff exists
  const buffRef = tunable(xml, "buff_type");
  const buffInst = BigInt(buffRef.replace(/<!--.*/, ""));
  ok(buffByInstance.has(buffInst), `always_on_buff ${buffInst} exists in package`);

  // referenced strings exist in English STBL
  for (const sname of ["display_name", "trait_description"]) {
    const key = parseInt(tunable(xml, sname), 16);
    ok(englishKeys.has(key), `${sname} string key ${tunable(xml, sname)} present in STBL`);
  }

  // icon: tuning key instance must exist as PNG and DST resources
  const iconMatch = xml.match(/n="icon"[^>]*>2f7d0004:00000000:([0-9a-f]+)</);
  ok(!!iconMatch, "icon key present with type 2f7d0004");
  if (iconMatch) {
    const iconInst = BigInt("0x" + iconMatch[1]);
    ok(dstInstances.has(iconInst), "icon DST image (00B2D882) shipped");
    ok(pngInstances.has(iconInst), "icon PNG (2F7D0004) shipped");
  }
}

console.log("\n== Buffs ==");
for (const e of buffs) {
  const xml = e.value.content;
  const name = attr(xml, "n");
  const inst = BigInt(attr(xml, "s"));
  console.log(` -- ${name}`);
  ok(attr(xml, "c") === "Buff" && attr(xml, "m") === "buffs.buff", "class/module correct");
  ok(inst === e.key.instance && inst === fnv64(name), "instance matches key and fnv64(name)");
  const mood = tunable(xml, "mood_type").replace(/<!--.*/, "");
  ok(VERIFIED_MOODS.has(mood), `mood_type ${mood} is a verified base-game mood ID`);
  ok(tunable(xml, "mood_weight") === "1", "mood_weight 1");
  ok(tunable(xml, "visible") === "True", "visible moodlet");
  const sd = simdataByKey.get(`${SimDataGroup.Buff.toString(16)}:${e.key.instance}`);
  ok(!!sd, "paired Buff SimData exists (group 0x0017E8F6, same instance)");
  if (sd) {
    const parsed = SimDataResource.from(sd.value.getBuffer ? sd.value.getBuffer() : sd.value.buffer);
    const sdXml = parsed.toXmlDocument().toXml();
    ok(sdXml.includes(`name="${name}"`), "SimData name matches");
    ok(sdXml.includes(`name="mood_type">${mood}<`), "SimData mood_type matches tuning");
  }
  for (const sname of ["buff_name", "buff_description"]) {
    const key = parseInt(tunable(xml, sname), 16);
    ok(englishKeys.has(key), `${sname} string key present in STBL`);
  }
}

console.log("\n== Icon images ==");
for (const e of dsts) {
  const buf = e.value.getBuffer ? e.value.getBuffer() : e.value.buffer;
  try {
    const img = DdsImage.from(buf);
    ok(img.isShuffled, `DST 0x${e.key.instance.toString(16)} parses as shuffled DST (${buf.length} bytes)`);
  } catch (err) {
    ok(false, `DST 0x${e.key.instance.toString(16)} failed to parse: ${err.message}`);
  }
}
for (const e of pngs) {
  const buf = e.value.getBuffer ? e.value.getBuffer() : e.value.buffer;
  ok(buf.slice(1, 4).toString() === "PNG", `PNG 0x${e.key.instance.toString(16)} has PNG signature (${buf.length} bytes)`);
}

// DBPF container sanity from raw bytes
console.log("\n== Container ==");
ok(buffer.slice(0, 4).toString() === "DBPF", "file signature is DBPF");
ok(buffer.readUInt32LE(4) === 2 && buffer.readUInt32LE(8) === 1, "DBPF version 2.1");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
