/** Generates the 1000x1500 Pinterest pin graphic from the trait icons. */
const path = require("path");
const Jimp = require("jimp");

const W = 1000, H = 1500;
const CREAM = 0xfdf4eaff;
const INK = 0x2b2320ff;

const ROWS = [
  { file: "MainCharacter.png", name: "Main Character", sub: "+1 Confident. Forever.", tint: 0xf28c44ff },
  { file: "GoldenRetrieverEnergy.png", name: "Golden Retriever Energy", sub: "+1 Playful. No thoughts.", tint: 0xf0b454ff },
  { file: "Delulu.png", name: "Delulu", sub: "+1 Happy. It's the solulu.", tint: 0xc79bf2ff },
  { file: "CottagecoreDreamer.png", name: "Cottagecore Dreamer", sub: "+1 Inspired. Mentally in a meadow.", tint: 0x7eb27aff },
];

function fillRect(img, x, y, w, h, color) {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++)
      img.setPixelColor(color, xx, yy);
}

function fillRoundRect(img, x, y, w, h, r, color) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const nx = Math.max(x + r, Math.min(xx, x + w - r));
      const ny = Math.max(y + r, Math.min(yy, y + h - r));
      if ((xx - nx) ** 2 + (yy - ny) ** 2 <= r * r) img.setPixelColor(color, xx, yy);
    }
  }
}

async function main() {
  const img = new Jimp(W, H, CREAM);
  const f64 = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
  const f32 = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
  const f16w = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
  const f32w = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

  // header
  img.print(f32, 0, 70, { text: "M U S T H A V E M O D S", alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, W);
  img.print(f64, 60, 150, { text: "EA gives you Cheerful.", alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, W - 120);
  img.print(f64, 60, 235, { text: "We made Delulu.", alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, W - 120);
  img.print(f32, 60, 340, { text: "a free Sims 4 trait pack", alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, W - 120);

  // trait cards
  const cardX = 70, cardW = W - 140, cardH = 195, gap = 24;
  let y = 420;
  for (const row of ROWS) {
    fillRoundRect(img, cardX, y, cardW, cardH, 26, 0xffffffff);
    fillRect(img, cardX, y + 26, 10, cardH - 52, row.tint); // accent bar
    const icon = await Jimp.read(path.join(__dirname, "dist", "icons", row.file));
    icon.resize(120, 120, Jimp.RESIZE_BICUBIC);
    img.composite(icon, cardX + 45, y + (cardH - 120) / 2);
    const textW = cardW - 210;
    const nameH = Jimp.measureTextHeight(f64, row.name, textW);
    const blockH = nameH + 8 + 40;
    const textY = y + Math.max(20, (cardH - blockH) / 2);
    img.print(f64, cardX + 200, textY, row.name, textW);
    img.print(f32, cardX + 200, textY + nameH + 8, row.sub, textW);
    y += cardH + gap;
  }

  // base game badge
  img.print(f32, 0, y + 14, { text: "base game only  ·  no script mods  ·  teen to elder", alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, W);

  // footer button
  const btnW = 620, btnH = 92, btnX = (W - btnW) / 2, btnY = H - 130;
  fillRoundRect(img, btnX, btnY, btnW, btnH, 46, INK);
  img.print(f32w, btnX, btnY + 28, { text: "free download  ·  musthavemods.com", alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, btnW);

  const out = path.join(__dirname, "dist", "pin-main-character-energy.png");
  await img.writeAsync(out);
  console.log("wrote", out);
}

main().catch((e) => { console.error(e); process.exit(1); });
