/**
 * MHM CAS Camera — Probe A builder
 *
 * Extracts the live Client_CASCameraTuning_Adult SimData from the installed
 * game, sets every camera preset's Pitch to +45° (main cameras and pose
 * overrides), and writes an override package at the identical TGI.
 *
 * Purpose: verify in-game that (a) the override loads, (b) Pitch is
 * respected, (c) nothing crashes — before designing real lookbook angles.
 */
const fs = require("fs");
const path = require("path");
const { Package, SimDataResource, RawResource } = require("@s4tk/models");

const GAME_PKG = "/Applications/EA Games/The Sims 4.app/Contents/Data/Simulation/SimulationPreload.package";
const SIMDATA = 0x545ac67a;
const CAMERA_GROUP = 0x005adec7;
const ADULT_INSTANCE = 0x0a4c00b1fd306181n;
const PROBE_PITCH = "45";

const OUT = path.join(__dirname, "dist", "MHM-CAS-Camera-PROBE-A-pitch45.package");
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const game = Package.from(fs.readFileSync(GAME_PKG));
const entry = game.entries.find(
  (e) => e.key.type === SIMDATA && e.key.group === CAMERA_GROUP && e.key.instance === ADULT_INSTANCE
);
if (!entry) throw new Error("Adult CAS camera SimData not found in game package");

const original = SimDataResource.from(entry.value.getBuffer ? entry.value.getBuffer() : entry.value.buffer);
const xml = original.toXmlDocument().toXml();

// Change ONLY Pitch values (main cameras + pose overrides)
const modified = xml.replace(/(<T name="Pitch">)[^<]+(<\/T>)/g, `$1${PROBE_PITCH}$2`);

const pitchCount = (xml.match(/<T name="Pitch">/g) || []).length;
const changedCount = (modified.match(new RegExp(`<T name="Pitch">${PROBE_PITCH}</T>`, "g")) || []).length;
if (pitchCount !== changedCount) throw new Error(`pitch rewrite mismatch: ${pitchCount} vs ${changedCount}`);

// Everything else must be identical
const strip = (s) => s.replace(/<T name="Pitch">[^<]+<\/T>/g, "");
if (strip(xml) !== strip(modified)) throw new Error("non-Pitch content changed!");

const probe = SimDataResource.fromXml(modified);
const pkg = new Package();
pkg.add({ type: SIMDATA, group: CAMERA_GROUP, instance: ADULT_INSTANCE }, probe);
fs.writeFileSync(OUT, pkg.getBuffer());

console.log(`Pitch values rewritten: ${pitchCount} -> all ${PROBE_PITCH} deg`);
console.log(`Wrote ${OUT} (${fs.statSync(OUT).size} bytes)`);

// ---- read-back validation ----
const back = Package.from(fs.readFileSync(OUT));
const be = back.entries[0];
const bxml = SimDataResource.from(be.value.getBuffer ? be.value.getBuffer() : be.value.buffer)
  .toXmlDocument().toXml();
const okKey =
  be.key.type === SIMDATA && be.key.group === CAMERA_GROUP && be.key.instance === ADULT_INSTANCE;
const okSchema = /schema_hash="0x07A08880"/i.test(bxml);
const okPitch = (bxml.match(new RegExp(`<T name="Pitch">${PROBE_PITCH}</T>`, "g")) || []).length === pitchCount;
const okRest = strip(bxml) === strip(xml);
console.log("read-back: TGI", okKey, "| schema", okSchema, "| pitches", okPitch, "| rest identical", okRest);
if (!(okKey && okSchema && okPitch && okRest)) process.exit(1);
console.log("PROBE VALID");
