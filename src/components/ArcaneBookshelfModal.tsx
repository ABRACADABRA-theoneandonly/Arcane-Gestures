import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Sparkles,
  Lock,
  CheckCircle2,
  MapPin,
  Hand,
  ChevronLeft,
  ChevronRight,
  X,
  Flame,
  Skull,
  Layers
} from 'lucide-react';
import { SPELL_CATALOG, GOALS_CATALOG } from '../data/spellsAndRealms';
import { GestureId, PlayerStats, RPGQuestState, SpellDefinition } from '../types/game';
import { audioEngine } from '../services/audioEngine';

interface ArcaneBookshelfModalProps {
  stats: PlayerStats;
  questState: RPGQuestState;
  onClose: () => void;
}

interface PowerHintEntry {
  spotId: string;
  zone: string;
  title: string;
  hint: string;
  npcTip?: string;
  bonus?: string;
}

const HIDDEN_POWER_HINTS: PowerHintEntry[] = [
  {
    spotId: 'spot_house_floor',
    zone: 'My House',
    title: 'Loose Oak Floorboard Cache',
    hint: 'Search behind this very Arcane Oak Bookshelf in the top-left corner of your home.',
    bonus: '+1 Portal Key'
  },
  {
    spotId: 'spot_house_chimney',
    zone: 'My House',
    title: 'Hearth Chimney Ember Seal',
    hint: 'Inspect the Slate Mantel Hearth fireplace [E] on the upper-right wall of My House.'
  },
  {
    spotId: 'spot_house_arcade',
    zone: 'My House',
    title: 'Arcade High-Score Cartridge',
    hint: 'Play and beat the Pixel Arcade Cabinet [E] in the bottom-right corner of My House.'
  },
  {
    spotId: 'spot_town_fountain',
    zone: 'Town Square',
    title: 'Fountain Coin Wish Vault',
    hint: 'Inspect the glowing Aether Fountain right in the center of Town Square [E].',
    npcTip: 'Speak with Ancient Sorcerer Aldrin in Town Square for town & house secrets.',
    bonus: '+1 Portal Key'
  },
  {
    spotId: 'spot_town_clock',
    zone: 'Town Square',
    title: 'Clocktower Ledger Hollow',
    hint: 'Check behind the cobblestone bulletin pillar in the upper-left area of Town Square.'
  },
  {
    spotId: 'spot_town_lantern',
    zone: 'Town Square',
    title: 'Cobblestone Lantern Seal',
    hint: 'Examine the flickering golden street torch in the bottom-right corner of Town Square.'
  },
  {
    spotId: 'spot_playground_swing',
    zone: 'Sunbeam Playground',
    title: 'Sycamore Swing Canopy Nest',
    hint: 'Stand beside the yellow swings and press [F] instead of [E] to check the upper canopy!'
  },
  {
    spotId: 'spot_playground_sandbox',
    zone: 'Sunbeam Playground',
    title: 'Buried Sandbox Sun-Relic',
    hint: 'Search the golden sandpit in the lower-left corner of the Playground [E].'
  },
  {
    spotId: 'spot_playground_stars',
    zone: 'Sunbeam Playground',
    title: 'Comet Starlight Ribbon',
    hint: 'Press [F] at the Comet Slide or Merry-Go-Round to play and win the Comet Star Catcher minigame.'
  },
  {
    spotId: 'spot_hospital_curtain',
    zone: 'St. Aether Hospital',
    title: 'Ward B Hydro-Infusion Tonic',
    hint: 'Peek behind the drawn Ward B curtain (top-right) inside the Hospital!',
    npcTip: 'Ancient Sorcerer Aldrin guards lore on Hospital & Superstore caches.',
    bonus: 'Unlocks Tidal Hydro Cannon'
  },
  {
    spotId: 'spot_hospital_cabinet',
    zone: 'St. Aether Hospital',
    title: 'Apothecary Medicine Vault',
    hint: 'Open the locked glass medicine cabinet in the upper-left corner of St. Aether Hospital.'
  },
  {
    spotId: 'spot_hospital_lab',
    zone: 'St. Aether Hospital',
    title: 'Chief Healer Elixir Seal',
    hint: 'Compound all 3 prescriptions at the Alchemy Lab Bench (bottom-left of the Hospital).'
  },
  {
    spotId: 'spot_superstore_crates',
    zone: 'Grand Superstore',
    title: 'Stockroom Arcane Stash',
    hint: 'Slip behind the dusty stockroom crates in the upper-right corner of the Superstore!',
    npcTip: 'Ancient Sorcerer Aldrin knows where the Stockroom Vault hides.',
    bonus: 'Unlocks Thunder Bolt Point & +1 Key'
  },
  {
    spotId: 'spot_superstore_freezer',
    zone: 'Grand Superstore',
    title: 'Frozen Aisle Frost Core',
    hint: 'Inspect the glowing ice-cream freezer in the lower-right aisle of the Superstore.'
  },
  {
    spotId: 'spot_superstore_memory',
    zone: 'Grand Superstore',
    title: 'Master Inventory Crest',
    hint: 'Complete the Enchanted Shelf Memory Rush minigame at the central Superstore counter.'
  },
  {
    spotId: 'spot_hills_hollow',
    zone: 'Emerald Hills',
    title: 'Whispering Oak Hollow',
    hint: 'Explore the mossy ancient oak tree hollow on the eastern ridge of Emerald Hills.',
    npcTip: 'Seek Ancient Sorceress Vespera in Emerald Hills for wilderness & cavern secrets.'
  },
  {
    spotId: 'spot_hills_stones',
    zone: 'Emerald Hills',
    title: 'Standing Rune Circle',
    hint: 'Step inside the ancient stone circle near the upper-left meadow of Emerald Hills.'
  },
  {
    spotId: 'spot_hills_fireflies',
    zone: 'Emerald Hills',
    title: 'Twilight Firefly Gathering',
    hint: 'Catch 10 glowing twilight fireflies in the southeastern meadow minigame of Emerald Hills.'
  },
  {
    spotId: 'spot_underground_geode',
    zone: 'Underground Crystal Cavern',
    title: 'Deep Geode Core',
    hint: 'Equip the Pickaxe at Emerald Hills, crack the boulder, and excavate the Deep Geode Altar underground!'
  },
  {
    spotId: 'spot_underground_relic',
    zone: 'Underground Crystal Cavern',
    title: 'Arcane Crystal Seam Relic',
    hint: 'Mine the glowing yellow Arcane Power Crystal vein inside the Underground Cavern.',
    bonus: '+1 Portal Key'
  },
  {
    spotId: 'spot_mountains_alcove',
    zone: 'Frostpeak Mountains',
    title: 'Glacial Waterfall Alcove',
    hint: 'Search behind the cascading icy waterfall on the western cliffside of Frostpeak Mountains.',
    npcTip: 'Speak with Ancient Sorcerer Malakor on Frostpeak Mountains.'
  },
  {
    spotId: 'spot_mountains_climb',
    zone: 'Frostpeak Mountains',
    title: 'Summit Alpine Beacon Crown',
    hint: 'Equip Hiking Gear at basecamp [E], climb the ice cliff, and win the Summit Trial at the peak!'
  }
];

interface BonusTechniquePage {
  id: string;
  title: string;
  elementLabel: string;
  gesture: GestureId;
  color: string;
  dualSummary: string;
  steps: string[];
  combatTip: string;
}

const BONUS_TECHNIQUE_PAGES: BonusTechniquePage[] = [
  {
    id: 'combo_dual_boost',
    title: 'Dual-Hand Resonance (+45% Boost)',
    elementLabel: '2-Hand Mastery Technique',
    gesture: 'DUAL_PALMS_FORWARD',
    color: '#f97316',
    dualSummary: 'Mirror ANY 1-Hand posture with BOTH hands raised to enter Overcharged Dual-Boost state!',
    steps: [
      'Hold BOTH open palms forward for rapid twin Flame Vortex streams.',
      'Hold Fist + Open Palm together for high-pressure Tidal Hydro Cannons.',
      'Point BOTH Index fingers forward for twin Chain Lightning strikes.',
      'Raise BOTH Peace V-signs to widen Cryo Blizzard freezing radius.'
    ],
    combatTip: 'Great for clearing armored Dreadknight & Golem waves in later realms!'
  },
  {
    id: 'combo_defense_meteor',
    title: 'Aegis Counter & Twin Meteors',
    elementLabel: 'Defensive & Finisher Arts',
    gesture: 'THUMBS_UP_DUAL',
    color: '#eab308',
    dualSummary: 'Switch seamlessly between Titan Aegis defense and Apex Meteor bombardment.',
    steps: [
      'Clench 1 or BOTH Fists upward when zombie projectiles approach to reflect damage.',
      'Immediately switch to Thumb Up (1 or 2 hands) right after blocking to drop Meteors.',
      'Cup BOTH palms together side-by-side at chest center for Celestial Prism Kamehameha!'
    ],
    combatTip: 'Blocking enemy shots with Titan Aegis preserves your Hit Streak for Meteor unlock!'
  }
];

const GestureMiniIllustration: React.FC<{ gesture: GestureId; color: string; dualMirror?: boolean }> = ({
  gesture,
  color,
  dualMirror = false
}) => {
  const renderSingleHand = (tx: number) => (
    <g transform={`translate(${tx},54)`} stroke="#fef3c7" strokeWidth="2.4" strokeLinecap="round" fill="none">
      <rect x="-11" y="-4" width="22" height="20" rx="7" fill="#1e293b" stroke={color} />
      {gesture === 'DUAL_PALMS_FORWARD' && (
        <>
          <line x1="-11" y1="3" x2="-21" y2="-8" />
          <line x1="-7" y1="-4" x2="-10" y2="-26" />
          <line x1="-2" y1="-4" x2="-2" y2="-30" />
          <line x1="4" y1="-4" x2="5" y2="-27" />
          <line x1="9" y1="-2" x2="15" y2="-20" />
        </>
      )}
      {gesture === 'FIST_AND_PALM' && (
        <>
          <line x1="-6" y1="-4" x2="-9" y2="-27" stroke={color} strokeWidth="2.8" />
          <line x1="-1" y1="-4" x2="-1" y2="-31" stroke={color} strokeWidth="2.8" />
          <line x1="5" y1="-4" x2="7" y2="-27" stroke={color} strokeWidth="2.8" />
          <circle cx="9" cy="-1" r="2.8" fill="#94a3b8" stroke="none" />
        </>
      )}
      {gesture === 'CROSS_INDEX_POINT' && (
        <>
          <line x1="-3" y1="-4" x2="-3" y2="-32" stroke={color} strokeWidth="3.2" />
          <circle cx="-3" cy="-34" r="3.5" fill={color} stroke="none" />
        </>
      )}
      {gesture === 'DUAL_RAISED_FISTS' && (
        <>
          <circle cx="-7" cy="-3" r="2.8" fill={color} stroke="none" />
          <circle cx="-2" cy="-4" r="2.8" fill={color} stroke="none" />
          <circle cx="3" cy="-4" r="2.8" fill={color} stroke="none" />
          <circle cx="8" cy="-3" r="2.8" fill={color} stroke="none" />
        </>
      )}
      {gesture === 'DUAL_PEACE_SPREAD' && (
        <>
          <line x1="-4" y1="-4" x2="-12" y2="-30" stroke={color} strokeWidth="3" />
          <line x1="3" y1="-4" x2="11" y2="-30" stroke={color} strokeWidth="3" />
        </>
      )}
      {gesture === 'THUMBS_UP_DUAL' && (
        <line x1="-11" y1="2" x2="-21" y2="-22" stroke={color} strokeWidth="3.8" />
      )}
    </g>
  );

  return (
    <svg viewBox="0 0 124 88" className="w-28 h-20 shrink-0 rounded-lg bg-stone-900/90 border border-amber-900/50 p-1">
      <circle cx="62" cy="44" r="36" fill={color} opacity="0.15" />
      {gesture === 'CUPPED_PALMS_TOUCHING' ? (
        <g transform="translate(62,54)" stroke="#fef3c7" strokeWidth="2.4" strokeLinecap="round" fill="none">
          <path d="M-24 8 Q-12 -14 -3 -12 Q-4 8 -14 14 Z" fill="#1e293b" stroke={color} />
          <path d="M24 8 Q12 -14 3 -12 Q4 8 14 14 Z" fill="#1e293b" stroke={color} />
          <circle cx="0" cy="-6" r="7" fill={color} stroke="none" opacity="0.85" />
        </g>
      ) : gesture === 'DUAL_PUPPETEER_CLAWS' ? (
        <g transform="translate(62,54)" stroke="#fef3c7" strokeWidth="2.4" strokeLinecap="round" fill="none">
          <g transform="translate(-20,0)">
            <rect x="-8" y="-14" width="16" height="14" rx="5" fill="#1e293b" stroke={color} />
            <path d="M-6 0 Q-9 10 -6 17 M-2 0 Q-3 12 -1 19 M3 0 Q3 12 4 19 M7 0 Q10 10 8 16" stroke={color} />
          </g>
          <g transform="translate(20,0)">
            <rect x="-8" y="-14" width="16" height="14" rx="5" fill="#1e293b" stroke={color} />
            <path d="M-6 0 Q-9 10 -6 17 M-2 0 Q-3 12 -1 19 M3 0 Q3 12 4 19 M7 0 Q10 10 8 16" stroke={color} />
          </g>
        </g>
      ) : gesture === 'DUAL_BEAST_TALONS' ? (
        <g transform="translate(62,54)" stroke="#fef3c7" strokeWidth="2.4" strokeLinecap="round" fill="none">
          <g transform="translate(-20,4)">
            <rect x="-8" y="0" width="16" height="14" rx="5" fill="#1e293b" stroke={color} />
            <path d="M-7 0 Q-11 -13 -5 -20 M-2 0 Q-3 -15 0 -22 M3 0 Q5 -15 6 -21 M8 0 Q12 -11 10 -17" stroke={color} />
          </g>
          <g transform="translate(20,4)">
            <rect x="-8" y="0" width="16" height="14" rx="5" fill="#1e293b" stroke={color} />
            <path d="M-7 0 Q-11 -13 -5 -20 M-2 0 Q-3 -15 0 -22 M3 0 Q5 -15 6 -21 M8 0 Q12 -11 10 -17" stroke={color} />
          </g>
        </g>
      ) : dualMirror ? (
        <>
          {renderSingleHand(36)}
          {renderSingleHand(88)}
        </>
      ) : (
        renderSingleHand(62)
      )}
    </svg>
  );
};

export const ArcaneBookshelfModal: React.FC<ArcaneBookshelfModalProps> = ({
  stats,
  questState,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'gestures' | 'hints' | 'forbidden'>('gestures');
  const [spellPage, setSpellPage] = useState(0);
  const [hintPage, setHintPage] = useState(0);
  const [flipFlash, setFlipFlash] = useState<'left' | 'right' | null>(null);

  const heroName = (stats.playerName || 'Aria').trim() || 'Aria';
  const discoveredSet = new Set([...(questState.hiddenSpotsFound || []), ...(stats.hiddenPowersFound || [])]);

  // Pages 0..4 cover the 9 spells (2 per spread), Page 5 covers Bonus Dual-Hand Techniques!
  const totalSpellCatalogPages = Math.ceil(SPELL_CATALOG.length / 2);
  const totalHandMovementSpreads = totalSpellCatalogPages + 1;
  const isBonusTechPage = spellPage >= totalSpellCatalogPages;
  const visibleSpells = isBonusTechPage
    ? []
    : SPELL_CATALOG.slice(spellPage * 2, spellPage * 2 + 2);

  const hintsPerPage = 6;
  const totalHintPages = Math.ceil(HIDDEN_POWER_HINTS.length / hintsPerPage);
  const visibleHints = HIDDEN_POWER_HINTS.slice(hintPage * hintsPerPage, hintPage * hintsPerPage + hintsPerPage);

  const triggerPageFlip = (dir: 'prev' | 'next') => {
    audioEngine.playAncientRune();
    setFlipFlash(dir === 'prev' ? 'left' : 'right');
    setTimeout(() => setFlipFlash(null), 180);

    if (activeTab === 'gestures') {
      if (dir === 'prev') {
        setSpellPage((p) => (p > 0 ? p - 1 : 0));
      } else if (spellPage < totalHandMovementSpreads - 1) {
        setSpellPage((p) => p + 1);
      } else {
        setActiveTab('hints');
        setHintPage(0);
      }
    } else if (activeTab === 'hints') {
      if (dir === 'prev') {
        if (hintPage > 0) setHintPage((p) => p - 1);
        else {
          setActiveTab('gestures');
          setSpellPage(totalHandMovementSpreads - 1);
        }
      } else if (hintPage < totalHintPages - 1) {
        setHintPage((p) => p + 1);
      } else {
        setActiveTab('forbidden');
      }
    } else if (activeTab === 'forbidden' && dir === 'prev') {
      setActiveTab('hints');
      setHintPage(totalHintPages - 1);
    }
  };

  // Keyboard Left/Right Arrow page flipping while reading the book!
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        triggerPageFlip('next');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        triggerPageFlip('prev');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const getUnlockHint = (spell: SpellDefinition): string => {
    if (spell.id === 'fireball') return 'Unlocked by default for all Spellcasters.';
    if (spell.id === 'water_blast') {
      return 'Arena: Banish 3 Shamblers — OR Roleplay Hint: Inspect behind the Ward B curtain in St. Aether Hospital! (Ask Ancient Sorcerer Aldrin!)';
    }
    if (spell.id === 'lightning') {
      return 'Arena: Land 8 accurate strikes — OR Roleplay Hint: Search behind crates in Grand Superstore Stockroom! (Ask Ancient Sorcerer Aldrin!)';
    }
    if (spell.id === 'blood_bender') {
      return 'Roleplay Secret: Break the Emerald Hills boulder with the Pickaxe -> Ancient Catacombs -> Beat all 3 Sanguine Chambers!';
    }
    if (spell.id === 'animal_puppetry') {
      return 'Roleplay Secret: Collect 20 Arena Powers + 20 Hidden Roleplay Powers -> Board the Hot Air Balloon in Frostpeak Mountains -> Beat all 3 Sky Chambers!';
    }
    const goal = GOALS_CATALOG.find((g) => g.id === spell.unlockedByGoalId);
    return goal ? `Arena Milestone: ${goal.description}` : 'Unlocks through Battle Arena wave milestones.';
  };

  const flipTab = (tab: 'gestures' | 'hints' | 'forbidden') => {
    audioEngine.playAncientRune();
    setActiveTab(tab);
  };

  const canGoPrev =
    (activeTab === 'gestures' && spellPage > 0) || activeTab === 'hints' || activeTab === 'forbidden';
  const canGoNext =
    activeTab === 'gestures' || activeTab === 'hints';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/85 backdrop-blur-md">
      {/* Leather-Bound Open Book Outer Frame */}
      <div className="relative max-w-5xl w-full rounded-2xl bg-[#3b1f0e] border-4 border-[#6b3c1b] p-2 sm:p-3 shadow-[0_25px_70px_rgba(0,0,0,0.85)] max-h-[92vh] flex flex-col">
        {/* Book Header Bookmark Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 mb-2 rounded-xl bg-[#261307] border border-amber-700/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-cinzel text-base sm:text-lg font-bold text-amber-100">
                {heroName}&apos;s Tome of Handcraft &amp; Hidden Powers
              </h2>
              <p className="text-[11px] text-amber-300/80">
                Flip pages with ← / → or buttons below · {stats.unlockedSpellIds.length}/{SPELL_CATALOG.length} Spells ·{' '}
                {discoveredSet.size}/20 Hidden Powers Found
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => flipTab('gestures')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'gestures'
                  ? 'bg-amber-400 text-slate-950 shadow'
                  : 'bg-[#3b1f0e] text-amber-200 hover:bg-[#4e2a14] border border-amber-700/40'
              }`}
            >
              <Hand className="w-3.5 h-3.5" />
              <span>Hand Movements ({spellPage + 1}/{totalHandMovementSpreads})</span>
            </button>
            <button
              onClick={() => flipTab('hints')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'hints'
                  ? 'bg-emerald-400 text-slate-950 shadow'
                  : 'bg-[#3b1f0e] text-amber-200 hover:bg-[#4e2a14] border border-amber-700/40'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Power Hints ({discoveredSet.size}/20)</span>
            </button>
            <button
              onClick={() => flipTab('forbidden')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'forbidden'
                  ? 'bg-rose-500 text-white shadow'
                  : 'bg-[#3b1f0e] text-amber-200 hover:bg-[#4e2a14] border border-amber-700/40'
              }`}
            >
              <Skull className="w-3.5 h-3.5" />
              <span>Forbidden &amp; Sky</span>
            </button>
            <button
              onClick={onClose}
              className="ml-1 p-1.5 rounded-lg bg-slate-900/80 text-amber-200 hover:text-white border border-amber-800/40 cursor-pointer"
              title="Close Book [Esc]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Open Two-Page Parchment Spread with Side Page-Flip Controls */}
        <div className="relative flex-1 flex items-stretch gap-1.5 min-h-0">
          {/* Left Page-Flip Strip Button */}
          <button
            onClick={() => triggerPageFlip('prev')}
            disabled={!canGoPrev}
            title="Flip to Previous Page (Left Arrow)"
            className="hidden sm:flex w-10 shrink-0 rounded-l-xl bg-[#e6cf9f] hover:bg-[#dfc185] disabled:opacity-35 text-amber-950 border-2 border-[#b79458] items-center justify-center cursor-pointer transition-colors shadow"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Parchment Pages Canvas */}
          <div
            className={`relative flex-1 overflow-y-auto rounded-xl bg-gradient-to-r from-[#f7ebd2] via-[#eedbb5] to-[#f7ebd2] text-stone-900 border-2 border-[#b79458] shadow-inner p-4 sm:p-6 transition-transform duration-150 ${
              flipFlash === 'left' ? '-translate-x-1' : flipFlash === 'right' ? 'translate-x-1' : ''
            }`}
          >
            {/* Center Spine Shadow on desktop */}
            <div className="hidden md:block pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-6 bg-gradient-to-r from-amber-900/15 via-amber-950/35 to-amber-900/15" />

            {activeTab === 'gestures' && (
              <div className="flex flex-col h-full justify-between gap-4">
                {isBonusTechPage ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                    {BONUS_TECHNIQUE_PAGES.map((tech, idx) => (
                      <div
                        key={tech.id}
                        className="flex flex-col justify-between bg-amber-50/70 border border-amber-800/30 rounded-xl p-4 shadow-sm"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 border-b border-amber-800/20 pb-2.5 mb-3">
                            <div>
                              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-800">
                                Bonus Folio {idx + 1} · {tech.elementLabel}
                              </span>
                              <h3 className="font-cinzel text-base font-bold text-stone-900">{tech.title}</h3>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-amber-700 text-white text-[10px] font-bold flex items-center gap-1 shrink-0">
                              <Layers className="w-3 h-3" /> Combos
                            </span>
                          </div>

                          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#29180c] text-amber-50 mb-3 border border-amber-700/40">
                            <GestureMiniIllustration gesture={tech.gesture} color={tech.color} dualMirror />
                            <p className="text-[11px] text-amber-100/95 leading-relaxed">{tech.dualSummary}</p>
                          </div>

                          <ul className="space-y-1.5 text-xs text-stone-800 list-disc list-inside mb-3">
                            {tech.steps.map((st, sIdx) => (
                              <li key={sIdx} className="leading-relaxed">
                                {st}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-2.5 rounded-lg bg-amber-900/10 border border-amber-900/25 text-xs">
                          <div className="font-bold text-amber-950 flex items-center gap-1 mb-0.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                            <span>Combat Mastery Tip:</span>
                          </div>
                          <p className="text-[11px] text-stone-800">{tech.combatTip}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                    {visibleSpells.map((spell, idx) => {
                      const isUnlocked = stats.unlockedSpellIds.includes(spell.id);
                      const pageNum = spellPage * 2 + idx + 1;
                      return (
                        <div
                          key={spell.id}
                          className="flex flex-col justify-between bg-amber-50/60 border border-amber-800/25 rounded-xl p-4 shadow-sm"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 border-b border-amber-800/20 pb-2.5 mb-3">
                              <div>
                                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-800">
                                  Ch. {pageNum} · {spell.element} Magic
                                </span>
                                <h3 className="font-cinzel text-base font-bold text-stone-900">{spell.name}</h3>
                              </div>
                              {isUnlocked ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 shrink-0">
                                  <CheckCircle2 className="w-3 h-3" /> Unlocked
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-stone-700 text-amber-100 text-[10px] font-bold flex items-center gap-1 shrink-0">
                                  <Lock className="w-3 h-3" /> Locked
                                </span>
                              )}
                            </div>

                            {/* Hand Movement Box */}
                            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#29180c] text-amber-50 mb-3 border border-amber-700/40">
                              <GestureMiniIllustration
                                gesture={spell.gesture}
                                color={spell.color}
                                dualMirror={!spell.requiresTwoHands}
                              />
                              <div className="text-xs leading-relaxed">
                                <div className="text-[10px] uppercase tracking-wider font-bold text-amber-300 mb-0.5">
                                  Required Hand Movement
                                </div>
                                <div className="font-bold text-white mb-1">{spell.gestureName}</div>
                                <p className="text-[11px] text-amber-100/90">{spell.fingerDescription}</p>
                              </div>
                            </div>

                            <p className="text-xs text-stone-800 leading-relaxed mb-3">{spell.description}</p>
                          </div>

                          <div className="p-2.5 rounded-lg bg-amber-900/10 border border-amber-900/25 text-xs">
                            <div className="font-bold text-amber-950 flex items-center gap-1 mb-0.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                              <span>Where / How to Unlock:</span>
                            </div>
                            <p className="text-[11px] text-stone-800">{getUnlockHint(spell)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Quick Chapter / Page Switcher + Flip Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-amber-900/25 text-xs font-semibold text-stone-800">
                  <button
                    onClick={() => triggerPageFlip('prev')}
                    disabled={!canGoPrev}
                    className="px-3 py-1.5 rounded-lg bg-amber-900/15 hover:bg-amber-900/25 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Flip Back</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalHandMovementSpreads }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          audioEngine.playAncientRune();
                          setSpellPage(idx);
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                          spellPage === idx
                            ? 'bg-amber-900 text-amber-50'
                            : 'bg-amber-900/15 text-amber-950 hover:bg-amber-900/30'
                        }`}
                      >
                        {idx < totalSpellCatalogPages ? `P.${idx + 1}` : 'Combos'}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => triggerPageFlip('next')}
                    className="px-3 py-1.5 rounded-lg bg-amber-900/15 hover:bg-amber-900/25 flex items-center gap-1 cursor-pointer"
                  >
                    <span>
                      {spellPage < totalHandMovementSpreads - 1 ? 'Flip Page' : 'Turn to Hints'}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'hints' && (
              <div className="flex flex-col h-full justify-between gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                  {[visibleHints.slice(0, 3), visibleHints.slice(3, 6)].map((colHints, colIdx) => (
                    <div key={colIdx} className="space-y-3">
                      <div className="text-[11px] font-cinzel font-bold uppercase tracking-wider text-amber-900 border-b border-amber-800/25 pb-1">
                        {colIdx === 0 ? `Left Folio · Field Hints` : `Right Folio · Secret Locations`}
                      </div>
                      {colHints.map((entry) => {
                        const found = discoveredSet.has(entry.spotId);
                        return (
                          <div
                            key={entry.spotId}
                            className={`p-3 rounded-xl border transition-colors ${
                              found
                                ? 'bg-emerald-900/10 border-emerald-700/40'
                                : 'bg-amber-50/75 border-amber-800/30 shadow-sm'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-900/15 text-amber-950">
                                {entry.zone}
                              </span>
                              {found ? (
                                <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Discovered
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-800">Unclaimed Hint</span>
                              )}
                            </div>
                            <h4 className="font-cinzel font-bold text-xs text-stone-900">{entry.title}</h4>
                            <p className="text-[11px] text-stone-800 mt-0.5 leading-relaxed">{entry.hint}</p>
                            {entry.npcTip && (
                              <p className="text-[10px] font-semibold text-sky-900 mt-1">💬 People Tip: {entry.npcTip}</p>
                            )}
                            {entry.bonus && (
                              <div className="mt-1 text-[10px] font-bold text-purple-900">✦ Reward: {entry.bonus}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-amber-900/25 text-xs font-semibold text-stone-800">
                  <button
                    onClick={() => triggerPageFlip('prev')}
                    className="px-3 py-1.5 rounded-lg bg-amber-900/15 hover:bg-amber-900/25 flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>{hintPage > 0 ? 'Earlier Hints' : 'Back to Hand Movements'}</span>
                  </button>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalHintPages }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          audioEngine.playAncientRune();
                          setHintPage(idx);
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer ${
                          hintPage === idx
                            ? 'bg-emerald-800 text-white'
                            : 'bg-amber-900/15 text-amber-950 hover:bg-amber-900/30'
                        }`}
                      >
                        H.{idx + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => triggerPageFlip('next')}
                    className="px-3 py-1.5 rounded-lg bg-amber-900/15 hover:bg-amber-900/25 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{hintPage < totalHintPages - 1 ? 'More Hints' : 'Turn to Forbidden'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'forbidden' && (
              <div className="flex flex-col h-full justify-between gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                  {/* Left Page: Blood Bending Path */}
                  <div className="p-4 rounded-xl bg-rose-950/10 border border-rose-900/35 space-y-3">
                    <div className="flex items-center justify-between border-b border-rose-900/25 pb-2">
                      <div className="flex items-center gap-2">
                        <Skull className="w-5 h-5 text-rose-800" />
                        <h3 className="font-cinzel font-bold text-base text-rose-950">Forbidden Blood Bender</h3>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-900 text-rose-50">
                        {questState.bloodBenderUnlocked ? 'AWAKENED' : 'SEALED'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#29180c] text-amber-50">
                      <GestureMiniIllustration gesture="DUAL_PUPPETEER_CLAWS" color="#ef4444" />
                      <div className="text-[11px] leading-relaxed">
                        <div className="font-bold text-rose-300 mb-0.5">Hand Movement: Dual Puppeteer Claws</div>
                        Curve fingers on <strong>BOTH</strong> hands downward like marionette hooks to seize zombies and turn them into allies!
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-stone-800">
                      <div className="font-bold text-rose-950">Secret Route Clue:</div>
                      <ol className="list-decimal list-inside space-y-1 text-[11px]">
                        <li>Travel North from Town Square into <strong>Emerald Hills</strong>.</li>
                        <li>Pick up the <strong>Pickaxe [E]</strong> at the hillside basecamp, then crack the Ancient Mossy Boulder <strong>[E]</strong> twice to reveal the Catacombs entrance.</li>
                        <li>Enter the <strong>Ancient Catacombs</strong> and conquer all 3 Sanguine Chambers: Conduit Pipes, Glyph Memory, and Crimson Laser Crucible.</li>
                        <li>Touch the Inner Sanguine Altar to awaken Blood Bending!</li>
                      </ol>
                    </div>
                  </div>

                  {/* Right Page: Animal Puppetry + Hot Air Balloon */}
                  <div className="p-4 rounded-xl bg-emerald-950/10 border border-emerald-900/35 space-y-3">
                    <div className="flex items-center justify-between border-b border-emerald-900/25 pb-2">
                      <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-emerald-800" />
                        <h3 className="font-cinzel font-bold text-base text-emerald-950">Forbidden Animal Puppetry</h3>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-900 text-emerald-50">
                        {questState.animalPuppetryUnlocked ? 'AWAKENED' : 'SEALED'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#29180c] text-amber-50">
                      <GestureMiniIllustration gesture="DUAL_BEAST_TALONS" color="#10b981" />
                      <div className="text-[11px] leading-relaxed">
                        <div className="font-bold text-emerald-300 mb-0.5">Hand Movement: Dual Beast Talons</div>
                        Arch fingers on <strong>BOTH</strong> hands upward like predatory wolf claws to summon spectral dire wolves!
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-stone-800">
                      <div className="font-bold text-emerald-950">
                        Sky Sanctum Clue ({stats.arenaPowersCount || 0}/20 Arena · {discoveredSet.size}/20 Roleplay):
                      </div>
                      <ol className="list-decimal list-inside space-y-1 text-[11px]">
                        <li>Gather <strong>20 Arena Powers</strong> (or Arcane Tonics in Superstore) AND <strong>20 Hidden Powers</strong> across the Roleplay towns, hills, mines &amp; mountains.</li>
                        <li>Visit <strong>Frostpeak Mountains</strong> (north of Emerald Hills) and board Sky Captain Zephyr&apos;s Celestial Hot Air Balloon!</li>
                        <li>Clear all 3 Sky Chambers (Spirit Chimes, Dire Wolf Constellation, Alpha Wolf Taming) to claim Animal Puppetry!</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-amber-900/25 text-xs font-semibold text-stone-800">
                  <button
                    onClick={() => triggerPageFlip('prev')}
                    className="px-3 py-1.5 rounded-lg bg-amber-900/15 hover:bg-amber-900/25 flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Flip Back to Hints</span>
                  </button>
                  <span className="font-cinzel text-amber-950">End of Codex · Keep Exploring!</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Page-Flip Strip Button */}
          <button
            onClick={() => triggerPageFlip('next')}
            disabled={!canGoNext}
            title="Flip to Next Page (Right Arrow)"
            className="hidden sm:flex w-10 shrink-0 rounded-r-xl bg-[#e6cf9f] hover:bg-[#dfc185] disabled:opacity-35 text-amber-950 border-2 border-[#b79458] items-center justify-center cursor-pointer transition-colors shadow"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
