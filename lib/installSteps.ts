/**
 * The "How to install this mod" steps on /go, per game and per hosted file
 * type. Until 2026-11-11 the box was hard-coded to Sims 4 ("extract the .zip,
 * copy the .package files…"), so a Minecraft .jar showed Sims steps right
 * under a warning that said to use the mods folder.
 *
 * Every list has exactly INSTALL_STEP_COUNT steps. The box sits inside the
 * page's `.mv-ads` wrapper, where element geometry affects ad placement, so
 * switching games changes the words and never the shape.
 *
 * Text wrapped in backticks renders as <code>.
 */
import { hostedGameOf } from '@/lib/modFiles/constants';

export const INSTALL_STEP_COUNT = 4;

const SIMS_MODS = '`Documents/Electronic Arts/The Sims 4/Mods`';

const SIMS_DEFAULT = [
  'Extract the downloaded .zip file',
  `Copy the \`.package\` files to ${SIMS_MODS}`,
  'Enable custom content in Game Options → Other',
  'Restart The Sims 4 and enjoy!',
];

const SIMS_PACKAGE = [
  `Copy the \`.package\` file to ${SIMS_MODS} (no unzipping needed)`,
  'Keep it no more than five folders deep inside Mods',
  'Enable custom content in Game Options → Other',
  'Restart The Sims 4 and enjoy!',
];

const SIMS_SCRIPT = [
  `Copy the \`.ts4script\` file to ${SIMS_MODS} (no unzipping needed)`,
  'Keep it no more than one folder deep inside Mods',
  'Enable custom content and Script Mods in Game Options → Other',
  'Restart The Sims 4 and enjoy!',
];

const MINECRAFT_JAVA_MOD = [
  'Install the mod loader this mod was made for (Fabric, Quilt, Forge or NeoForge) for the right Minecraft version',
  'Put the `.jar` in your `.minecraft/mods` folder without unzipping it, along with any library mods it needs (such as Fabric API)',
  "Start Minecraft with the mod loader's profile in the launcher",
  'Check that the mod shows up in the Mods list',
];

const MINECRAFT_JAVA_PACK = [
  'Keep the `.zip` as it is: do not unzip it',
  'Resource pack: put it in `.minecraft/resourcepacks`, then turn it on under Options → Resource Packs',
  "Data pack: put it in the world's `datapacks` folder, then run `/reload` or reopen the world",
  "Skins: follow the creator's notes in the description above",
];

const MINECRAFT_BEDROCK = [
  'Open the downloaded file on a device with Minecraft Bedrock Edition',
  'Minecraft opens and imports it; wait for "Successfully imported"',
  "Packs and add-ons: turn them on in your world's settings under Resource Packs and Behavior Packs",
  'Worlds appear in your Worlds list; templates appear when you create a new world',
];

const MINECRAFT_LINK = [
  'Check which edition (Java or Bedrock) and which mod loader the mod needs',
  'Java mods (`.jar`) go in your `.minecraft/mods` folder, with the matching mod loader installed',
  'Bedrock add-ons (`.mcpack`, `.mcaddon`) import when you open the file',
  'Restart Minecraft and check that the mod loaded',
];

const STARDEW = [
  'Install SMAPI, the Stardew Valley mod loader, from smapi.io',
  'Unzip the download into your `Stardew Valley/Mods` folder',
  'Install any other mods it lists as requirements',
  'Start the game through SMAPI',
];

const GENERIC = [
  "Read the creator's install instructions on the download page",
  'Back up your save files first',
  'Install any mod loader or tools the mod requires',
  'Restart the game and check that the mod loaded',
];

/**
 * @param gameVersion the mod's `gameVersion` ("Sims 4", "Minecraft", …). Null
 *   means an older catalog row, all of which are Sims 4.
 * @param hostedKind the hosted file's kind when the download is served from
 *   MustHaveMods, or null for an external link.
 */
export function installStepsFor(gameVersion: string | null | undefined, hostedKind: string | null | undefined): string[] {
  const kind = hostedKind ?? null;
  const v = (gameVersion ?? '').trim().toLowerCase();

  // The file's own type wins when it can only be one game.
  if (kind === 'jar') return MINECRAFT_JAVA_MOD;
  if (kind === 'mcpack' || kind === 'mcaddon' || kind === 'mcworld' || kind === 'mctemplate') return MINECRAFT_BEDROCK;
  if (kind === 'package') return SIMS_PACKAGE;
  if (kind === 'ts4script') return SIMS_SCRIPT;

  const game = v === '' ? 'sims4' : hostedGameOf(gameVersion);
  if (game === 'minecraft') return kind === 'zip' ? MINECRAFT_JAVA_PACK : MINECRAFT_LINK;
  if (game === 'sims4') return SIMS_DEFAULT;
  if (v === 'stardew valley') return STARDEW;
  return GENERIC;
}

/** Split a step into plain text and `code` parts, in order. */
export function stepSegments(step: string): { text: string; code: boolean }[] {
  return step
    .split('`')
    .map((text, i) => ({ text, code: i % 2 === 1 }))
    .filter((s) => s.text !== '');
}

/**
 * The one-line "where does the file go" hint shown once a hosted download
 * starts. Same rules as installStepsFor; plain text (no code marks).
 */
export function downloadedHintFor(gameVersion: string | null | undefined, hostedKind: string | null | undefined): string {
  const kind = hostedKind ?? null;
  const v = (gameVersion ?? '').trim().toLowerCase();
  if (kind === 'jar') return 'Move the .jar into your .minecraft/mods folder.';
  if (kind === 'mcpack' || kind === 'mcaddon' || kind === 'mcworld' || kind === 'mctemplate') {
    return 'Open the file to import it into Minecraft.';
  }
  const game = kind === 'package' || kind === 'ts4script' || v === '' ? 'sims4' : hostedGameOf(gameVersion);
  if (game === 'minecraft') return 'Move the .zip, still zipped, into your .minecraft/resourcepacks folder.';
  if (game === 'sims4') return 'Move the file into Documents/Electronic Arts/The Sims 4/Mods.';
  return 'Then follow the install steps below.';
}
