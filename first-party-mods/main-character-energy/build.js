/**
 * MHM "Main Character Energy" Trait Pack — package builder
 *
 * Builds a Sims 4 .package containing 4 CAS personality traits, each with a
 * permanent always-on mood buff, custom icons, and string tables for all 18
 * game locales. All game constants verified against extracted game tuning
 * (see VERIFIED-CONSTANTS.md).
 */
const fs = require("fs");
const path = require("path");
const { Package, XmlResource, SimDataResource, StringTableResource, RawResource } = require("@s4tk/models");
const enums = require("@s4tk/models/enums");
const { fnv32, fnv64 } = require("@s4tk/hashing");
const { DdsImage } = require("@s4tk/images");

const { TuningResourceType, BinaryResourceType, SimDataGroup, StringTableLocale } = enums;

const OUT_DIR = path.join(__dirname, "dist");
const ICON_DIR = path.join(OUT_DIR, "icons");
fs.mkdirSync(ICON_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Verified game constants (do not change without re-verifying)
// ---------------------------------------------------------------------------
const MOODS = {
  Confident: 14634n,
  Energized: 14636n,
  Happy: 14640n,
  Inspired: 14641n,
  Playful: 14642n,
};
const AGE = { TEEN: 8n, YOUNGADULT: 16n, ADULT: 32n, ELDER: 64n };
const TRAIT_TYPE_PERSONALITY = 0n; // sims4 TraitType.PERSONALITY

// ---------------------------------------------------------------------------
// Trait pack definition
// ---------------------------------------------------------------------------
const CREATOR = "MHM";
const PACK_NAME = "MainCharacterEnergy";

const TRAITS = [
  {
    key: "MainCharacter",
    displayName: "Main Character",
    traitDesc:
      "This Sim walks into every room like the camera is already rolling. " +
      "The plot bends around them, and they know it. Permanently a little Confident.",
    buffName: "Main Character Energy",
    buffDesc: "Somebody has to be the moment. It might as well be this Sim.",
    mood: "Confident",
    color: [242, 140, 68], // warm amber
    glyph: "star",
  },
  {
    key: "GoldenRetrieverEnergy",
    displayName: "Golden Retriever Energy",
    traitDesc:
      "No thoughts, just enthusiasm. This Sim greets every day, every stranger and " +
      "every reheated leftover with the same full-body excitement. Permanently a little Playful.",
    buffName: "Golden Retriever Energy",
    buffDesc: "Life is a tennis ball and this Sim will absolutely chase it.",
    mood: "Playful",
    color: [240, 180, 84], // golden
    glyph: "paw",
  },
  {
    key: "Delulu",
    displayName: "Delulu",
    traitDesc:
      "This Sim lives in a beautifully renovated version of reality where everything is " +
      "going great, actually. The delulu is, in fact, the solulu. Permanently a little Happy.",
    buffName: "Certified Delulu",
    buffDesc: "Reality is negotiable and this Sim negotiated a better deal.",
    mood: "Happy",
    color: [199, 155, 242], // lilac
    glyph: "heart",
  },
  {
    key: "CottagecoreDreamer",
    displayName: "Cottagecore Dreamer",
    traitDesc:
      "Mentally, this Sim is baking bread in a sunlit meadow surrounded by " +
      "sympathetic woodland creatures. Physically, they are here — but only just. " +
      "Permanently a little Inspired.",
    buffName: "Meadow Mind",
    buffDesc: "The soft life is not a dream. It is a lifestyle choice.",
    mood: "Inspired",
    color: [126, 178, 122], // sage
    glyph: "mushroom",
  },
];

// ---------------------------------------------------------------------------
// String table setup
// ---------------------------------------------------------------------------
const strings = []; // { keyHash, value }
function addString(name, value) {
  const keyHash = fnv32(`${CREATOR}:${PACK_NAME}:${name}`);
  strings.push({ key: keyHash, value });
  return keyHash;
}
const hex32 = (n) => "0x" + n.toString(16).toUpperCase().padStart(8, "0");
const hexInst = (n) => n.toString(16).toLowerCase().padStart(16, "0");

// ---------------------------------------------------------------------------
// Icon drawing (64x64 pixel art, no external assets)
// ---------------------------------------------------------------------------
const SIZE = 64;

function inStar(px, py, cx, cy, rOuter, rInner, points = 5) {
  // point-in-polygon against a real 10-vertex star (straight edges)
  const verts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (Math.PI * i) / points - Math.PI / 2; // first spike points up
    verts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const [xi, yi] = verts[i], [xj, yj] = verts[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inCircle(px, py, cx, cy, r) {
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}
function inEllipse(px, py, cx, cy, rx, ry) {
  return ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1;
}
function inHeart(px, py, cx, cy, scale) {
  const x = (px - cx) / scale, y = -(py - cy) / scale + 0.25;
  const f = (x * x + y * y - 1) ** 3 - x * x * y * y * y;
  return f <= 0;
}
function inRoundRect(px, py, x, y, w, h, r) {
  if (px < x || px > x + w || py < y || py > y + h) return false;
  const nx = Math.max(x + r, Math.min(px, x + w - r));
  const ny = Math.max(y + r, Math.min(py, y + h - r));
  return (px - nx) ** 2 + (py - ny) ** 2 <= r * r || (px >= x + r && px <= x + w - r) || (py >= y + r && py <= y + h - r);
}

function glyphTest(glyph, x, y) {
  const c = SIZE / 2;
  switch (glyph) {
    case "star":
      return inStar(x, y, c, c + 2, 23, 10);
    case "paw": {
      if (inEllipse(x, y, c, c + 10, 13, 11)) return true; // pad
      if (inCircle(x, y, c - 15, c - 6, 6)) return true;
      if (inCircle(x, y, c, c - 12, 6)) return true;
      if (inCircle(x, y, c + 15, c - 6, 6)) return true;
      return false;
    }
    case "heart":
      return inHeart(x, y, c, c + 2, 17);
    case "mushroom": {
      // cap: upper half-ellipse; stem: rounded rect
      const capY = c + 2;
      if (y <= capY && inEllipse(x, y, c, capY, 21, 16)) return true;
      if (inRoundRect(x, y, c - 7, capY, 14, 18, 4)) return true;
      return false;
    }
  }
  return false;
}

// mushroom cap dots + heart shine drawn in badge color on top of glyph
function glyphCutout(glyph, x, y) {
  const c = SIZE / 2;
  if (glyph === "mushroom") {
    return (
      inCircle(x, y, c - 9, c - 7, 3.2) ||
      inCircle(x, y, c + 8, c - 9, 2.6) ||
      inCircle(x, y, c + 1, c - 2, 2.2)
    );
  }
  return false;
}

function drawIconPixels(trait) {
  // RGBA buffer
  const px = Buffer.alloc(SIZE * SIZE * 4);
  const [r, g, b] = trait.color;
  const dark = [Math.round(r * 0.72), Math.round(g * 0.72), Math.round(b * 0.72)];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      // circular badge with vertical gradient + thin white ring
      const c = SIZE / 2 - 0.5;
      const d = Math.hypot(x - c, y - c);
      const R = SIZE / 2 - 1.5;
      if (d <= R) {
        const t = y / SIZE;
        let cr = Math.round(r + (dark[0] - r) * t);
        let cg = Math.round(g + (dark[1] - g) * t);
        let cb = Math.round(b + (dark[2] - b) * t);
        if (d >= R - 1.6) { cr = 255; cg = 255; cb = 255; } // ring
        if (glyphTest(trait.glyph, x, y)) { cr = 255; cg = 255; cb = 255; }
        if (glyphCutout(trait.glyph, x, y)) { cr = trait.color[0]; cg = trait.color[1]; cb = trait.color[2]; }
        px[i] = cr; px[i + 1] = cg; px[i + 2] = cb; px[i + 3] = 255;
      } else {
        px[i + 3] = 0; // transparent
      }
    }
  }
  return px;
}

async function buildIcon(trait) {
  const { PNG } = require("pngjs");
  const png = new PNG({ width: SIZE, height: SIZE });
  drawIconPixels(trait).copy(png.data);
  const pngBuffer = PNG.sync.write(png);
  fs.writeFileSync(path.join(ICON_DIR, `${trait.key}.png`), pngBuffer);
  const dds = await DdsImage.fromImageAsync(pngBuffer);
  const dst = dds.isShuffled ? dds : dds.toShuffled();
  return { pngBuffer, dstBuffer: dst.buffer };
}

// ---------------------------------------------------------------------------
// XML builders (mirroring verified templates from extracted game mods)
// ---------------------------------------------------------------------------
function traitTuningXml(t, ids) {
  return `<?xml version="1.0" encoding="utf-8"?>
<I c="Trait" i="trait" m="traits.traits" n="${ids.traitName}" s="${ids.traitInst}">
  <L n="ages">
    <E>TEEN</E>
    <E>YOUNGADULT</E>
    <E>ADULT</E>
    <E>ELDER</E>
  </L>
  <L n="buffs">
    <U>
      <T n="buff_type">${ids.buffInst}<!--${ids.buffName}--></T>
    </U>
  </L>
  <T n="buffs_add_on_spawn_only">False</T>
  <T n="display_name">${hex32(ids.nameKey)}<!--${t.displayName}--></T>
  <T n="display_name_gender_neutral">${hex32(ids.nameKey)}<!--${t.displayName}--></T>
  <T n="icon" p="${t.key}Icon">2f7d0004:00000000:${hexInst(ids.iconInst)}</T>
  <E n="min_lod_value">MINIMUM</E>
  <T n="trait_description">${hex32(ids.descKey)}<!--trait description--></T>
  <E n="trait_type">PERSONALITY</E>
</I>`;
}

function traitSimDataXml(t, ids) {
  return `<?xml version="1.0" encoding="utf-8"?>
<SimData version="0x00000101" u="0x00000000">
  <Instances>
    <I name="${ids.traitName}" schema="Trait" type="Object">
      <L name="ages">
        <T type="Int64">${AGE.TEEN}</T>
        <T type="Int64">${AGE.YOUNGADULT}</T>
        <T type="Int64">${AGE.ADULT}</T>
        <T type="Int64">${AGE.ELDER}</T>
      </L>
      <T name="cas_idle_asm_key">00000000-00000000-0000000000000000</T>
      <T name="cas_idle_asm_state"></T>
      <T name="cas_selected_icon">00000000-00000000-0000000000000000</T>
      <T name="cas_trait_asm_param">None</T>
      <L name="conflicting_traits" />
      <T name="display_name">${hex32(ids.nameKey)}</T>
      <L name="genders" />
      <T name="icon">00B2D882-00000000-${hexInst(ids.iconInst).toUpperCase()}</T>
      <L name="tags" />
      <T name="trait_description">${hex32(ids.descKey)}</T>
      <T name="trait_origin_description">0x00000000</T>
      <T name="trait_type">${TRAIT_TYPE_PERSONALITY}</T>
    </I>
  </Instances>
  <Schemas>
    <Schema name="Trait" schema_hash="0x992BFA76">
      <Columns>
        <Column name="ages" type="Vector" flags="0x00000000" />
        <Column name="cas_idle_asm_key" type="ResourceKey" flags="0x00000000" />
        <Column name="cas_idle_asm_state" type="String" flags="0x00000000" />
        <Column name="cas_selected_icon" type="ResourceKey" flags="0x00000000" />
        <Column name="cas_trait_asm_param" type="String" flags="0x00000000" />
        <Column name="conflicting_traits" type="Vector" flags="0x00000000" />
        <Column name="display_name" type="LocalizationKey" flags="0x00000000" />
        <Column name="genders" type="Vector" flags="0x00000000" />
        <Column name="icon" type="ResourceKey" flags="0x00000000" />
        <Column name="tags" type="Vector" flags="0x00000000" />
        <Column name="trait_description" type="LocalizationKey" flags="0x00000000" />
        <Column name="trait_origin_description" type="LocalizationKey" flags="0x00000000" />
        <Column name="trait_type" type="Int64" flags="0x00000000" />
      </Columns>
    </Schema>
  </Schemas>
</SimData>`;
}

function buffTuningXml(t, ids) {
  return `<?xml version="1.0" encoding="utf-8"?>
<I c="Buff" i="buff" m="buffs.buff" n="${ids.buffName}" s="${ids.buffInst}">
  <T n="buff_description">${hex32(ids.buffDescKey)}<!--buff description--></T>
  <T n="buff_name">${hex32(ids.buffNameKey)}<!--${t.buffName}--></T>
  <T n="icon" p="${t.key}Icon">2f7d0004:00000000:${hexInst(ids.iconInst)}</T>
  <T n="mood_type">${MOODS[t.mood]}<!--Mood: Mood_${t.mood}--></T>
  <T n="mood_weight">1</T>
  <T n="refresh_on_add">True</T>
  <T n="show_timeout">False</T>
  <T n="ui_sort_order">1</T>
  <T n="visible">True</T>
</I>`;
}

function buffSimDataXml(t, ids) {
  return `<?xml version="1.0" encoding="utf-8"?>
<SimData version="0x00000101" u="0x00000000">
  <Instances>
    <I name="${ids.buffName}" schema="Buff" type="Object">
      <T name="audio_sting_on_add">39B2AA4A-00000000-8AF8B916CF64C646</T>
      <T name="audio_sting_on_remove">39B2AA4A-00000000-3BF33216A25546EA</T>
      <T name="buff_description">${hex32(ids.buffDescKey)}</T>
      <T name="buff_name">${hex32(ids.buffNameKey)}</T>
      <T name="icon">00B2D882-00000000-${hexInst(ids.iconInst).toUpperCase()}</T>
      <T name="mood_type">${MOODS[t.mood]}</T>
      <T name="mood_weight">1</T>
      <T name="timeout_string">0x00000000</T>
      <T name="ui_sort_order">1</T>
    </I>
  </Instances>
  <Schemas>
    <Schema name="Buff" schema_hash="0x71722956">
      <Columns>
        <Column name="audio_sting_on_add" type="ResourceKey" flags="0x00000000" />
        <Column name="audio_sting_on_remove" type="ResourceKey" flags="0x00000000" />
        <Column name="buff_description" type="LocalizationKey" flags="0x00000000" />
        <Column name="buff_name" type="LocalizationKey" flags="0x00000000" />
        <Column name="icon" type="ResourceKey" flags="0x00000000" />
        <Column name="mood_type" type="TableSetReference" flags="0x00000000" />
        <Column name="mood_weight" type="Int32" flags="0x00000000" />
        <Column name="timeout_string" type="LocalizationKey" flags="0x00000000" />
        <Column name="ui_sort_order" type="Int32" flags="0x00000000" />
      </Columns>
    </Schema>
  </Schemas>
</SimData>`;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
async function main() {
  const pkg = new Package();
  const manifest = { traits: [], stbl: [], icons: [] };

  for (const t of TRAITS) {
    const traitName = `${CREATOR}:trait_${PACK_NAME}_${t.key}`;
    const buffName = `${CREATOR}:buff_${PACK_NAME}_${t.key}`;
    const iconName = `${CREATOR}:icon_${PACK_NAME}_${t.key}`;

    const ids = {
      traitName,
      buffName,
      traitInst: fnv64(traitName),
      buffInst: fnv64(buffName),
      iconInst: fnv64(iconName),
      nameKey: addString(`${t.key}_TraitName`, t.displayName),
      descKey: addString(`${t.key}_TraitDesc`, t.traitDesc),
      buffNameKey: addString(`${t.key}_BuffName`, t.buffName),
      buffDescKey: addString(`${t.key}_BuffDesc`, t.buffDesc),
    };

    // Trait tuning
    pkg.add(
      { type: TuningResourceType.Trait, group: 0, instance: ids.traitInst },
      new XmlResource(traitTuningXml(t, ids))
    );
    // Trait SimData
    pkg.add(
      { type: BinaryResourceType.SimData, group: SimDataGroup.Trait, instance: ids.traitInst },
      SimDataResource.fromXml(traitSimDataXml(t, ids))
    );
    // Buff tuning
    pkg.add(
      { type: TuningResourceType.Buff, group: 0, instance: ids.buffInst },
      new XmlResource(buffTuningXml(t, ids))
    );
    // Buff SimData
    pkg.add(
      { type: BinaryResourceType.SimData, group: SimDataGroup.Buff, instance: ids.buffInst },
      SimDataResource.fromXml(buffSimDataXml(t, ids))
    );
    // Icons: PNG (2F7D0004) + shuffled DST (00B2D882), same instance
    const { pngBuffer, dstBuffer } = await buildIcon(t);
    pkg.add(
      { type: 0x2f7d0004, group: 0, instance: ids.iconInst },
      RawResource.from(pngBuffer)
    );
    pkg.add(
      { type: BinaryResourceType.DstImage, group: 0, instance: ids.iconInst },
      RawResource.from(dstBuffer)
    );

    manifest.traits.push({
      trait: traitName,
      traitInstance: "0x" + hexInst(ids.traitInst).toUpperCase(),
      buff: buffName,
      buffInstance: "0x" + hexInst(ids.buffInst).toUpperCase(),
      mood: `Mood_${t.mood} (${MOODS[t.mood]})`,
      strings: [ids.nameKey, ids.descKey, ids.buffNameKey, ids.buffDescKey].map(hex32),
    });
  }

  // String tables — English strings replicated to all 18 locales so no
  // language sees blank text.
  const stblBase = StringTableLocale.getInstanceBase(fnv64(`${CREATOR}:${PACK_NAME}_Strings`));
  for (const locale of StringTableLocale.all()) {
    const stbl = new StringTableResource(strings.map((s) => ({ key: s.key, value: s.value })));
    const inst = StringTableLocale.setHighByte(locale, stblBase);
    pkg.add({ type: BinaryResourceType.StringTable, group: 0x80000000, instance: inst }, stbl);
    manifest.stbl.push({ locale: StringTableLocale[locale], instance: "0x" + hexInst(inst).toUpperCase() });
  }

  const outFile = path.join(OUT_DIR, "MHM-Main-Character-Energy-Trait-Pack-v1.0.package");
  fs.writeFileSync(outFile, pkg.getBuffer());
  fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`Wrote ${outFile} (${fs.statSync(outFile).size} bytes)`);
  console.log(`Resources: ${pkg.size}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
