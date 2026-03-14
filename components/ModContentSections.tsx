'use client';

import { useState } from 'react';
import { ChevronDown, Monitor, Smartphone, HardDrive, AlertTriangle, HelpCircle, Wrench } from 'lucide-react';

interface ModContentSectionsProps {
  gameVersion: string | null;
  category: string;
  title: string;
  author: string | null;
  isFree: boolean;
  source: string;
}

/**
 * Expanded content sections for mod detail pages.
 * Adds installation guide, compatibility info, and FAQ — each with H2 headings
 * that Mediavine Script Wrapper uses as ad insertion points.
 * More scroll depth = more in-content ad slots = higher RPM.
 */
export function ModContentSections({
  gameVersion,
  category,
  title,
  author,
  isFree,
  source,
}: ModContentSectionsProps) {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const game = gameVersion || 'Sims 4';
  const isMinecraft = game.toLowerCase().includes('minecraft');
  const isStardew = game.toLowerCase().includes('stardew');
  const isSims = !isMinecraft && !isStardew;

  const getInstallSteps = () => {
    if (isMinecraft) {
      return [
        { step: 'Download the mod file from the link above. Most Minecraft mods come as .jar files.' },
        { step: 'Make sure you have the correct mod loader installed — either Forge or Fabric, depending on the mod requirements.' },
        { step: 'Open your Minecraft installation folder. On Windows, press Win+R and type %appdata%\\.minecraft to find it.' },
        { step: 'Place the downloaded .jar file into the "mods" folder. If the folder doesn\'t exist, create it.' },
        { step: 'Launch Minecraft using the correct mod loader profile and verify the mod appears in the mod list.' },
      ];
    }
    if (isStardew) {
      return [
        { step: 'Download and install SMAPI (Stardew Modding API) if you haven\'t already — it\'s required for most Stardew Valley mods.' },
        { step: 'Download the mod file from the link above. It will typically be a .zip file.' },
        { step: 'Extract the .zip file into your Stardew Valley "Mods" folder, usually located at: Steam/steamapps/common/Stardew Valley/Mods' },
        { step: 'Launch Stardew Valley through SMAPI instead of the normal launcher to activate mods.' },
        { step: 'Check the SMAPI console window when the game loads — it will confirm if the mod loaded successfully.' },
      ];
    }
    // Sims 4 default
    return [
      { step: 'Download the mod file from the link above. Sims 4 mods typically come as .package or .ts4script files.' },
      { step: 'Open your Sims 4 Mods folder. The default location is: Documents/Electronic Arts/The Sims 4/Mods' },
      { step: 'Place the downloaded file directly into the Mods folder. You can organize mods into subfolders up to one level deep.' },
      { step: 'Launch The Sims 4 and go to Game Options > Other. Make sure "Enable Custom Content and Mods" is checked.' },
      { step: 'Restart the game if it was already running. The mod should now appear in your game.' },
    ];
  };

  const getCompatibilityNotes = () => {
    if (isMinecraft) {
      return {
        platform: 'Minecraft: Java Edition',
        requirements: [
          'Requires either Forge or Fabric mod loader (check the mod description for which one)',
          'May require specific Minecraft version — verify before downloading',
          'Some mods have dependencies on library mods like Architectury or Cloth Config',
        ],
        tips: 'Always back up your world saves before installing new mods. Mod conflicts can occasionally cause world corruption.',
      };
    }
    if (isStardew) {
      return {
        platform: 'Stardew Valley (PC/Mac/Linux)',
        requirements: [
          'Requires SMAPI (Stardew Modding API) — the standard mod loader for Stardew Valley',
          'Check if the mod requires Content Patcher or other framework mods',
          'Verify compatibility with your Stardew Valley version',
        ],
        tips: 'Some visual mods may conflict with each other. If you notice graphical issues, try disabling recently added mods one at a time.',
      };
    }
    return {
      platform: 'The Sims 4 (PC/Mac)',
      requirements: [
        'Custom Content and Mods must be enabled in Game Options > Other',
        'Script mods (.ts4script files) require "Script Mods Allowed" to be enabled separately',
        'After each Sims 4 game update, some mods may need to be updated by the creator',
      ],
      tips: 'If a mod stops working after a game update, check the creator\'s page for an updated version. Broken mods can cause the game to behave unexpectedly.',
    };
  };

  const getFaqItems = () => {
    const baseFaq = [
      {
        question: `Is this ${category.toLowerCase()} mod safe to download?`,
        answer: `This mod was sourced from ${source}, a well-known modding platform. We recommend scanning any downloaded files with your antivirus software as a standard precaution. Always download mods from trusted sources.`,
      },
      {
        question: isFree
          ? 'Is this mod really free?'
          : 'What do I get with this paid mod?',
        answer: isFree
          ? `Yes, this mod is completely free to download and use. The creator has made it available at no cost. If you enjoy the mod, consider supporting the creator through their profile page.`
          : `This is a premium mod that supports the creator directly. Paid mods often include higher quality assets, regular updates, and sometimes priority support from the creator.`,
      },
      {
        question: 'What should I do if this mod doesn\'t work?',
        answer: `First, make sure you have the latest version of ${game} installed. Then verify the mod file is in the correct folder and that mods are enabled in your game settings. If the issue persists, check the creator's page for troubleshooting tips or known issues.`,
      },
      {
        question: `Can I use this mod with other ${game} mods?`,
        answer: `Most mods are designed to work alongside other mods. However, mods that modify the same game files may conflict with each other. If you experience issues, try removing recently added mods to identify conflicts. The mod description above may list any known incompatibilities.`,
      },
    ];

    if (isSims) {
      baseFaq.push({
        question: 'Do I need any expansion packs for this mod?',
        answer: 'Check the mod description for any expansion pack or game pack requirements. Many CC items work with the base game, but some mods reference assets from specific packs. The creator usually lists requirements on their download page.',
      });
    }

    if (isMinecraft) {
      baseFaq.push({
        question: 'Does this mod work on Minecraft servers?',
        answer: 'It depends on the mod type. Client-side mods (texture packs, shaders, HUD mods) typically work on any server. Server-side mods require the server owner to also install the mod. Check the mod description for server compatibility details.',
      });
    }

    return baseFaq;
  };

  const installSteps = getInstallSteps();
  const compatibility = getCompatibilityNotes();
  const faqItems = getFaqItems();

  return (
    <>
      {/* Installation Guide */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Wrench size={20} className="text-indigo-600" />
          How to Install
        </h2>
        <div className="border-t border-gray-200 mb-6" />

        <p className="text-gray-600 mb-4">
          Follow these steps to install <strong>{title}</strong> on your {game} game:
        </p>

        <ol className="space-y-4">
          {installSteps.map((item, index) => (
            <li key={index} className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center">
                {index + 1}
              </span>
              <p className="text-gray-700 leading-relaxed pt-0.5">{item.step}</p>
            </li>
          ))}
        </ol>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex gap-2">
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <strong>Important:</strong> Always back up your save files before installing new mods.
              {isSims && ' After Sims 4 updates, mods may need to be re-downloaded or updated by the creator.'}
              {isMinecraft && ' Make sure your mod loader version matches the Minecraft version required by this mod.'}
              {isStardew && ' Keep SMAPI updated to the latest version for the best mod compatibility.'}
            </p>
          </div>
        </div>
      </div>

      {/* Compatibility Info */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Monitor size={20} className="text-indigo-600" />
          Compatibility
        </h2>
        <div className="border-t border-gray-200 mb-6" />

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <HardDrive size={18} className="text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Platform</p>
              <p className="font-semibold text-gray-900">{compatibility.platform}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Requirements</h3>
            <ul className="space-y-2">
              {compatibility.requirements.map((req, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700">
                  <span className="text-indigo-500 mt-1.5">•</span>
                  <span className="leading-relaxed">{req}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-800">
              <strong>Pro tip:</strong> {compatibility.tips}
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <HelpCircle size={20} className="text-indigo-600" />
          Frequently Asked Questions
        </h2>
        <div className="border-t border-gray-200 mb-6" />

        <div className="space-y-3">
          {faqItems.map((item, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-800 pr-4">{item.question}</span>
                <ChevronDown
                  size={18}
                  className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                    expandedFaq === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedFaq === index && (
                <div className="px-4 pb-4">
                  <p className="text-gray-600 leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
