/**
 * MHM Lookbook Camera — builds the three release variants.
 *
 * Each variant overrides ONLY the Pitch of the full-body camera presets
 * (CameraRegion 64 and 90) in Client_CASCameraTuning_Adult, extracted live
 * from the installed game. Face/detail views stay stock. Verified in-game
 * 2026-07-13: full-body views tilt, face editing unaffected.
 */
const fs = require("fs");
const path = require("path");
const { Package, SimDataResource } = require("@s4tk/models");

const GAME_PKG = "/Applications/EA Games/The Sims 4.app/Contents/Data/Simulation/SimulationPreload.package";
const SIMDATA = 0x545ac67a;
const CAMERA_GROUP = 0x005adec7;
const ADULT_INSTANCE = 0x0a4c00b1fd306181n;
const TARGET_REGIONS = new Set(["64", "90"]);

const VARIANTS = [
  { name: "Top-Down", pitch: "55", file: "MHM-Lookbook-Camera-TOP-DOWN-v1.0.package" },
  { name: "Editorial", pitch: "22", file: "MHM-Lookbook-Camera-EDITORIAL-v1.0.package" },
  { name: "Runway", pitch: "-18", file: "MHM-Lookbook-Camera-RUNWAY-v1.0.package" },
];

const OUT_DIR = path.join(__dirname, "dist", "lookbook-camera");
fs.mkdirSync(OUT_DIR, { recursive: true });

const game = Package.from(fs.readFileSync(GAME_PKG));
const entry = game.entries.find(
  (e) => e.key.type === SIMDATA && e.key.group === CAMERA_GROUP && e.key.instance === ADULT_INSTANCE
);
if (!entry) throw new Error("Adult CAS camera SimData not found");
const xml = SimDataResource.from(entry.value.getBuffer ? entry.value.getBuffer() : entry.value.buffer)
  .toXmlDocument().toXml();
const strip = (s) => s.replace(/<T name="Pitch">[^<]+<\/T>/g, "");

for (const v of VARIANTS) {
  let changed = 0;
  let currentRegion = null;
  const modified = xml.split("\n").map((line) => {
    const rm = line.match(/<T name="CameraRegion">(\d+)<\/T>/);
    if (rm) { currentRegion = rm[1]; return line; }
    if (/<T name="Pitch">/.test(line) && TARGET_REGIONS.has(currentRegion)) {
      changed++;
      return line.replace(/(<T name="Pitch">)[^<]+(<\/T>)/, `$1${v.pitch}$2`);
    }
    return line;
  }).join("\n");
  if (changed !== 2) throw new Error(`${v.name}: expected 2 pitch changes, got ${changed}`);
  if (strip(modified) !== strip(xml)) throw new Error(`${v.name}: non-pitch content changed`);

  const pkg = new Package();
  pkg.add({ type: SIMDATA, group: CAMERA_GROUP, instance: ADULT_INSTANCE }, SimDataResource.fromXml(modified));
  const out = path.join(OUT_DIR, v.file);
  fs.writeFileSync(out, pkg.getBuffer());

  // read-back
  const back = Package.from(fs.readFileSync(out)).entries[0];
  const bxml = SimDataResource.from(back.value.getBuffer ? back.value.getBuffer() : back.value.buffer)
    .toXmlDocument().toXml();
  const ok =
    back.key.instance === ADULT_INSTANCE &&
    /schema_hash="0x07A08880"/i.test(bxml) &&
    (bxml.match(new RegExp(`<T name="Pitch">${v.pitch.replace("-", "\\-")}</T>`, "g")) || []).length === 2 &&
    strip(bxml) === strip(xml);
  console.log(`${v.name} (pitch ${v.pitch}): ${fs.statSync(out).size} bytes — ${ok ? "VALID" : "FAILED"}`);
  if (!ok) process.exit(1);
}
console.log("all variants built");
