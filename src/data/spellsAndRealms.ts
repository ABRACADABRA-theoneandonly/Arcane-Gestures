import {
  SpellDefinition,
  WorldRealm,
  GoalDefinition,
  ArmorItem,
  HandSkinOption,
  RPGOutfit,
  HouseConfig
} from '../types/game';

export const ARMOR_CATALOG: ArmorItem[] = [
  {
    id: 'apprentice',
    name: 'Apprentice Robes',
    tier: 1,
    damageReduction: 0,
    bonusHp: 0,
    costAP: 0,
    description: 'Basic mystical linen robes offering no physical protection against decaying claws.',
    visualColor: '#64748b',
    accentBorder: 'border-slate-700'
  },
  {
    id: 'runic_hide',
    name: 'Runic Hide Jerkin',
    tier: 2,
    damageReduction: 0.15,
    bonusHp: 30,
    costAP: 250,
    description: 'Tough beast hide reinforced with woven warding runes. Absorbs 15% physical damage and boosts max HP by +30.',
    visualColor: '#d97706',
    accentBorder: 'border-amber-600'
  },
  {
    id: 'silver_plate',
    name: 'Silvered Knight Plate',
    tier: 3,
    damageReduction: 0.30,
    bonusHp: 75,
    costAP: 600,
    description: 'Consecrated polished silver armor forged to repel spectral claws. Absorbs 30% physical damage with +75 HP.',
    visualColor: '#0ea5e9',
    accentBorder: 'border-sky-500'
  },
  {
    id: 'dread_iron',
    name: 'Dread-Iron Battleplate',
    tier: 4,
    damageReduction: 0.45,
    bonusHp: 130,
    costAP: 1300,
    description: 'Heavy obsidian-infused plate armor pulled from ancient catacombs. Reduces damage by 45% with +130 HP.',
    visualColor: '#8b5cf6',
    accentBorder: 'border-purple-600'
  },
  {
    id: 'celestial_aegis',
    name: 'Celestial Titan Aegis',
    tier: 5,
    damageReduction: 0.60,
    bonusHp: 220,
    costAP: 2600,
    description: 'Mythic armor forged in the heart of a fallen supernova. Absorbs a colossal 60% of all incoming damage with +220 HP.',
    visualColor: '#ec4899',
    accentBorder: 'border-pink-500'
  }
];

export const HAND_SKINS_CATALOG: HandSkinOption[] = [
  {
    id: 'arcane_wireframe',
    name: 'Arcane Runic Wireframe',
    description: 'Crisp luminous arcane skeleton lines with bright fingertip focus orbs.',
    primaryColor: '#38bdf8',
    secondaryColor: '#f8fafc',
    jointStyle: 'circle',
    costAP: 0
  },
  {
    id: 'crimson_gauntlet',
    name: 'Sanguine Iron Gauntlets',
    description: 'Armored crimson diamond knuckle plates forged for high-contrast combat visibility.',
    primaryColor: '#ef4444',
    secondaryColor: '#fca5a5',
    jointStyle: 'diamond',
    costAP: 120
  },
  {
    id: 'cyber_plasma',
    name: 'Cyber Plasma Conduits',
    description: 'Neon cyan hexagonal cyber-joints with electric motion trails.',
    primaryColor: '#22d3ee',
    secondaryColor: '#a855f7',
    jointStyle: 'hex',
    costAP: 220
  },
  {
    id: 'golden_seraph',
    name: 'Golden Seraph Halos',
    description: 'Radiant gilded rings around every knuckle and angelic gold energy ribbons.',
    primaryColor: '#facc15',
    secondaryColor: '#fef08a',
    jointStyle: 'ring',
    costAP: 360
  },
  {
    id: 'void_claws',
    name: 'Abyssal Void Talons',
    description: 'Shadowy violet razor-tipped claw geometry pulsing with dark starfire.',
    primaryColor: '#c084fc',
    secondaryColor: '#f43f5e',
    jointStyle: 'claw',
    costAP: 500
  }
];

export const DEFAULT_RPG_OUTFIT: RPGOutfit = {
  gender: 'female',
  hairStyle: 'long_wavy',
  bangsStyle: 'side_bangs',
  rearHairStyle: 'default',
  hairColor: '#5b341e',
  skinTone: '#f5cba7',
  topStyle: 'mage_robe',
  topColor: '#991b1b',
  cloakColor: '#450a0a',
  pantsColor: '#292524',
  shoulderArmor: 'leather_pauldrons',
  weapon: 'orb_staff',
  accessory: 'crimson_hood'
};

export const INITIAL_HOUSE_CONFIG: HouseConfig = {
  wallColor: '#b46b2c',
  floorTheme: 'herringbone_warm',
  furniture: [
    { id: 'f_rug', name: 'Sage Stripe Rug', type: 'rug', x: 400, y: 315, color: '#4d9b85', placed: true },
    { id: 'f_bed', name: 'Plum Cozy Bed', type: 'bed', x: 245, y: 265, color: '#6b63b5', placed: true },
    { id: 'f_nightstand', name: 'Amber Lamp Stand', type: 'nightstand', x: 165, y: 315, color: '#d97706', placed: true },
    { id: 'f_beanbag', name: 'Violet Floor Cushion', type: 'beanbag', x: 350, y: 370, color: '#5b569e', placed: true },
    { id: 'f_fireplace', name: 'Slate Mantel Hearth', type: 'fireplace', x: 525, y: 155, color: '#8b83a8', placed: true },
    { id: 'f_fridge', name: 'Stainless Arcane Fridge', type: 'fridge', x: 625, y: 148, color: '#cbd5e1', placed: true },
    { id: 'f_floor_lamp', name: 'Lavender Floor Lamp', type: 'floor_lamp', x: 625, y: 222, color: '#a78bfa', placed: true },
    { id: 'f_plant', name: 'Potted Emerald Plant', type: 'plant', x: 295, y: 175, color: '#22c55e', placed: true },
    { id: 'f_bookshelf', name: 'Arcane Oak Bookshelf', type: 'bookshelf', x: 185, y: 145, color: '#92400e', placed: true },
    { id: 'f_sofa', name: 'Velvet Reading Sofa', type: 'sofa', x: 545, y: 315, color: '#7c3aed', placed: true },
    { id: 'f_table', name: 'Sunbeam Oak Table', type: 'table', x: 435, y: 285, color: '#a16207', placed: false },
    { id: 'f_arcade', name: 'Pixel Arcade Cabinet', type: 'arcade', x: 610, y: 405, color: '#06b6d4', placed: true },
    { id: 'f_trophy', name: 'Champion Trophy Case', type: 'trophy', x: 310, y: 130, color: '#eab308', placed: false }
  ]
};

export interface SuperstoreItem {
  id: string;
  name: string;
  category: 'key' | 'potion' | 'furniture' | 'mastery';
  costAP: number;
  description: string;
}

export const SUPERSTORE_ITEMS: SuperstoreItem[] = [
  {
    id: 'store_portal_key',
    name: 'Dimensional Portal Key',
    category: 'key',
    costAP: 120,
    description: 'Unlocks a sealed Dimensional Portal in the arena to enter new realms & monster waves.'
  },
  {
    id: 'store_power_elixir',
    name: 'Aetheric Arena Tonic (+2 Arena Powers)',
    category: 'mastery',
    costAP: 150,
    description: 'Channels +2 Arena Powers toward the 20 Arena Powers requirement for the Sky Balloon.'
  },
  {
    id: 'store_arcade_unit',
    name: 'Retro Arcade Cabinet (House Decor)',
    category: 'furniture',
    costAP: 140,
    description: 'Places the playable Pixel Arcade Cabinet inside My House.'
  },
  {
    id: 'store_trophy_case',
    name: 'Golden Trophy Pedestal (House Decor)',
    category: 'furniture',
    costAP: 180,
    description: 'Unlocks and places the gleaming Champion Trophy Case inside My House.'
  }
];

export const SPELL_CATALOG: SpellDefinition[] = [
  {
    id: 'fireball',
    name: 'Flame Vortex',
    element: 'fire',
    requiredLevel: 1,
    requiredRealmIndex: 0,
    gesture: 'DUAL_PALMS_FORWARD',
    gestureName: 'Open Palm Forward (1 Hand or Dual)',
    fingerDescription: 'Hold ONE open palm forward with all 5 fingers spread to fire continuous fireballs — raise BOTH open palms for Dual-Boosted (+45%) Vortex fire!',
    requiresTwoHands: false,
    damage: 32,
    cooldownMs: 130,
    manaCost: 2,
    color: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.85)',
    iconName: 'Flame',
    description: 'Channels continuous flame vortexes from your palm that detonate on impact with blistering heat.',
    tacticalAdvantage: 'Works effortlessly with 1 hand; using 2 hands triggers Dual Boosted flame streams!'
  },
  {
    id: 'water_blast',
    name: 'Tidal Hydro Cannon',
    element: 'water',
    requiredLevel: 1,
    requiredRealmIndex: 0,
    gesture: 'FIST_AND_PALM',
    gestureName: '3-Finger Trident (1 Hand) or Fist + Palm (2 Hands)',
    fingerDescription: 'Raise Index + Middle + Ring fingers like a 3-prong trident (1 hand), OR hold Fist + Open Palm (2 hands) for Dual-Boosted Hydro Jets!',
    requiresTwoHands: false,
    damage: 26,
    cooldownMs: 85,
    manaCost: 1.5,
    color: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.85)',
    iconName: 'Droplets',
    description: 'Pumps pressurized high-velocity water jets that push advancing monsters backward.',
    tacticalAdvantage: 'Heavy continuous knock-back against armored Dreadknights and Golems.',
    unlockedByGoalId: 'goal_slay_3'
  },
  {
    id: 'lightning',
    name: 'Thunder Bolt Point',
    element: 'lightning',
    requiredLevel: 1,
    requiredRealmIndex: 0,
    gesture: 'CROSS_INDEX_POINT',
    gestureName: 'Index Finger Point (1 Hand or Dual)',
    fingerDescription: 'Point your Index finger toward the target (1 hand), or point BOTH Index fingers together for twin high-voltage chain lightning!',
    requiresTwoHands: false,
    damage: 54,
    cooldownMs: 165,
    manaCost: 3,
    color: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.9)',
    iconName: 'Zap',
    description: 'Discharges continuous bio-electric lightning arcs that crackle straight through shields.',
    tacticalAdvantage: 'Instantly melts enemy shields and strikes with zero travel delay.',
    unlockedByGoalId: 'goal_hit_8'
  },
  {
    id: 'earth_shield',
    name: 'Titan Aegis Barrier',
    element: 'earth',
    requiredLevel: 1,
    requiredRealmIndex: 0,
    gesture: 'DUAL_RAISED_FISTS',
    gestureName: 'Clenched Fist (1 Hand or Dual)',
    fingerDescription: 'Clench 1 fist defensively to raise a kinetic shield dome — hold BOTH fists up to reinforce the Titan Aegis!',
    requiresTwoHands: false,
    damage: 0,
    cooldownMs: 50,
    manaCost: 0.5,
    color: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.85)',
    iconName: 'Shield',
    description: 'Summons a luminous crystalline dome that absorbs enemy projectiles and repels melee monsters.',
    tacticalAdvantage: 'Completely blocks physical damage and shoves attacking monsters backward.',
    unlockedByGoalId: 'goal_defend'
  },
  {
    id: 'frost_nova',
    name: 'Cryo Blizzard Nova',
    element: 'ice',
    requiredLevel: 1,
    requiredRealmIndex: 1,
    gesture: 'DUAL_PEACE_SPREAD',
    gestureName: 'Peace V-Sign (1 Hand or Dual)',
    fingerDescription: 'Make a Peace / V-sign (Index + Middle extended) with 1 hand to emit permafrost waves — use both hands for Dual-Boosted range!',
    requiresTwoHands: false,
    damage: 42,
    cooldownMs: 360,
    manaCost: 6,
    color: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.85)',
    iconName: 'Snowflake',
    description: 'Channels deep permafrost chill that encases monsters in solid ice blocks, stopping movement.',
    tacticalAdvantage: 'Freezes fast-moving Runners and Phantoms dead in their tracks.',
    unlockedByGoalId: 'goal_runner_kill'
  },
  {
    id: 'celestial_beam',
    name: 'Celestial Prism Kamehameha',
    element: 'celestial',
    requiredLevel: 1,
    requiredRealmIndex: 1,
    gesture: 'CUPPED_PALMS_TOUCHING',
    gestureName: '2 Hands Required · Cupped Palms Together',
    fingerDescription: 'SPECIAL TWO-HAND SPELL: Bring BOTH palms close together at the center of your view to fire a searing prismatic solar beam!',
    requiresTwoHands: true,
    damage: 95,
    cooldownMs: 110,
    manaCost: 2.5,
    color: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.95)',
    iconName: 'Sparkles',
    description: 'Fuses both hands into a concentrated ray of pure solar starfire that slices through all armor.',
    tacticalAdvantage: 'Requires both hands; obliterates high-health Dreadknights, Golems, and Titans.',
    unlockedByGoalId: 'goal_score_2500'
  },
  {
    id: 'meteor_cataclysm',
    name: 'Apex Meteor Cataclysm',
    element: 'fire',
    requiredLevel: 1,
    requiredRealmIndex: 2,
    gesture: 'THUMBS_UP_DUAL',
    gestureName: 'Thumb Up (1 Hand or Dual)',
    fingerDescription: 'Hold your Thumb firmly UP with other fingers curled (1 hand) — raise BOTH thumbs up for twin catastrophic meteors!',
    requiresTwoHands: false,
    damage: 135,
    cooldownMs: 520,
    manaCost: 10,
    color: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.95)',
    iconName: 'FlameKindling',
    description: 'Rips giant burning meteors from the stratosphere that shatter the ground with seismic shockwaves.',
    tacticalAdvantage: 'Annihilates clustered monster waves in a single impact.',
    unlockedByGoalId: 'goal_streak_10'
  },
  {
    id: 'blood_bender',
    name: 'Forbidden Blood Bender',
    element: 'blood',
    requiredLevel: 1,
    requiredRealmIndex: 0,
    gesture: 'DUAL_PUPPETEER_CLAWS',
    gestureName: '2 Hands Required · Dual Puppeteer Claws',
    fingerDescription: 'FORBIDDEN TWO-HAND SPELL: Curve fingers on BOTH hands downward like marionette claws to seize control of monsters and detonate them!',
    requiresTwoHands: true,
    damage: 185,
    cooldownMs: 420,
    manaCost: 14,
    color: '#991b1b',
    glowColor: 'rgba(185, 28, 28, 0.95)',
    iconName: 'Skull',
    description: 'The forbidden art of Hemomancy. Unlocked only by conquering all 3 Sanguine Chamber minigames in the Ancient Catacombs.',
    tacticalAdvantage: 'Turns enemy monsters into raging blood thralls that fight the horde before exploding.',
    isForbidden: true
  },
  {
    id: 'animal_puppetry',
    name: 'Forbidden Animal Puppetry',
    element: 'beast',
    requiredLevel: 1,
    requiredRealmIndex: 0,
    gesture: 'DUAL_BEAST_TALONS',
    gestureName: '2 Hands Required · Dual Beast Talons',
    fingerDescription: 'FORBIDDEN TWO-HAND SPELL: Arch fingers on BOTH hands upright like predatory wolf talons to summon spectral dire wolves!',
    requiresTwoHands: true,
    damage: 195,
    cooldownMs: 460,
    manaCost: 16,
    color: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.95)',
    iconName: 'PawPrint',
    description: 'The forbidden art of Faunomancy. Unlocked high in Aetheria Sky Sanctum after acquiring 20 Arena Powers + 20 Hidden Roleplay Powers to ride the Hot Air Balloon, then beating all 3 Sky Chambers.',
    tacticalAdvantage: 'Unleashes ferocious spectral dire wolves that hunt and tear apart armored Titans.',
    isForbidden: true
  }
];

export const GOALS_CATALOG: GoalDefinition[] = [
  {
    id: 'goal_slay_3',
    title: 'Purge the Shamblers',
    description: 'Banish 3 Rot Walkers to unlock Tidal Hydro Cannon.',
    targetCount: 3,
    unlockedSpellId: 'water_blast',
    icon: 'Droplets'
  },
  {
    id: 'goal_hit_8',
    title: 'Precision Spellcaster',
    description: 'Land 8 accurate spell strikes to unlock Thunder Bolt Point.',
    targetCount: 8,
    unlockedSpellId: 'lightning',
    icon: 'Zap'
  },
  {
    id: 'goal_defend',
    title: 'Titan Aegis Sentinel',
    description: 'Complete Wave 1 or reach 500 score to unlock Titan Aegis Barrier.',
    targetCount: 1,
    unlockedSpellId: 'earth_shield',
    icon: 'Shield'
  },
  {
    id: 'goal_runner_kill',
    title: 'Hunt the Swift Stalker',
    description: 'Reach Wave 2 or 1,200 score to unlock Cryo Blizzard Nova.',
    targetCount: 1,
    unlockedSpellId: 'frost_nova',
    icon: 'Snowflake'
  },
  {
    id: 'goal_score_2500',
    title: 'Celestial Ascendance',
    description: 'Accumulate 2,500 score to unlock Celestial Prism Kamehameha (2-Hand Special).',
    targetCount: 2500,
    unlockedSpellId: 'celestial_beam',
    icon: 'Sparkles'
  },
  {
    id: 'goal_streak_10',
    title: 'Horde Annihilator',
    description: 'Achieve a 10-Hit Streak without missing to unlock Apex Meteor Cataclysm.',
    targetCount: 10,
    unlockedSpellId: 'meteor_cataclysm',
    icon: 'FlameKindling'
  }
];

export const WORLD_REALMS: WorldRealm[] = [
  {
    id: 'obsidian_caldera',
    name: 'Obsidian Caldera',
    subtitle: 'Realm 01 · Scorched Earth & Molten Fissures',
    theme: 'volcanic',
    skyColorTop: '#100504',
    skyColorBottom: '#2a0c06',
    groundColor: '#0c0403',
    accentColor: '#f97316',
    ambientParticles: 'embers',
    unlockedSpellNotice: 'Shamblers & Swift Runners · Flame Vortex',
    lore: 'A desolate volcanic caldera where ancient undead rise from glowing lava fissures. Use a Portal Key after clearing Wave 1 to warp onward.',
    moonColor: '#dc2626',
    coronaColor: 'rgba(249, 115, 22, 0.35)'
  },
  {
    id: 'haunted_forest',
    name: 'Haunted Abyssal Woods',
    subtitle: 'Realm 02 · Cursed Emerald Woods & Ghostly Wisps',
    theme: 'haunted_forest',
    skyColorTop: '#03120e',
    skyColorBottom: '#072b22',
    groundColor: '#020d0a',
    accentColor: '#10b981',
    ambientParticles: 'wisps',
    unlockedSpellNotice: 'Dreadknights & Wraiths · Tidal Hydro Cannon',
    lore: 'A forgotten cursed woodland draped in bioluminescent mist. Twisted weeping trees shelter shielded Dreadknights.',
    moonColor: '#34d399',
    coronaColor: 'rgba(16, 185, 129, 0.3)'
  },
  {
    id: 'frostpeak_mountains',
    name: 'Frostpeak Mossy Mountains',
    subtitle: 'Realm 03 · Cascading Waterfalls & Granite Golems',
    theme: 'mountains',
    skyColorTop: '#091521',
    skyColorBottom: '#16324a',
    groundColor: '#08131d',
    accentColor: '#22d3ee',
    ambientParticles: 'snow',
    unlockedSpellNotice: 'Granite Golems · Thunder Bolt & Titan Aegis',
    lore: 'Towering emerald-moss cliffs streaked with glacial waterfalls. Colossal Granite Golems with heavy shields march down the passes.',
    moonColor: '#67e8f9',
    coronaColor: 'rgba(34, 211, 238, 0.35)'
  },
  {
    id: 'glacial_citadel',
    name: 'Glacial Permafrost Citadel',
    subtitle: 'Realm 04 · Aurora Borealis & Crystalline Spires',
    theme: 'glacial',
    skyColorTop: '#040d1a',
    skyColorBottom: '#09213d',
    groundColor: '#030912',
    accentColor: '#38bdf8',
    ambientParticles: 'snow',
    unlockedSpellNotice: 'Ice Phantoms & Stalkers · Cryo Blizzard Nova',
    lore: 'Sunken catacombs frozen in eternal blizzard ice beneath shimmering polar auroras. Teleporting Phantoms prowl the crystalline spires.',
    moonColor: '#38bdf8',
    coronaColor: 'rgba(56, 189, 248, 0.35)'
  },
  {
    id: 'superstore_ruins',
    name: 'Overgrown Neon Superstore Ruins',
    subtitle: 'Realm 05 · Shattered Skylights & Flickering Neon',
    theme: 'superstore_ruins',
    skyColorTop: '#0d0719',
    skyColorBottom: '#23133d',
    groundColor: '#090512',
    accentColor: '#a855f7',
    ambientParticles: 'sparks',
    unlockedSpellNotice: 'Mutated Abominations · Shield-Breaker Tactics',
    lore: 'An abandoned mega-plaza reclaimed by glowing vines and shattered neon rafters, overrun by armored Abominations.',
    moonColor: '#c084fc',
    coronaColor: 'rgba(168, 85, 247, 0.35)'
  },
  {
    id: 'desert_phantoms',
    name: 'Desert of Eclipsed Phantoms',
    subtitle: 'Realm 06 · Solar Eclipse & Obsidian Obelisks',
    theme: 'desert_phantoms',
    skyColorTop: '#140c02',
    skyColorBottom: '#361e06',
    groundColor: '#100802',
    accentColor: '#f59e0b',
    ambientParticles: 'sand',
    unlockedSpellNotice: 'Sand Phantoms & Titans · Celestial Beam',
    lore: 'Vast golden dunes beneath an ancient solar eclipse. Spectral Phantoms and towering Siege Titans emerge from buried obelisks.',
    moonColor: '#f59e0b',
    coronaColor: 'rgba(245, 158, 11, 0.4)'
  },
  {
    id: 'sky_citadel',
    name: 'Aetheria Cloud Citadel',
    subtitle: 'Realm 07 · Golden Sky Islands & Stratosphere Winds',
    theme: 'sky_citadel',
    skyColorTop: '#081b38',
    skyColorBottom: '#1c4273',
    groundColor: '#0d2240',
    accentColor: '#fbbf24',
    ambientParticles: 'clouds',
    unlockedSpellNotice: 'Sky Titans & Aerial Wraiths · Meteor Cataclysm',
    lore: 'Suspended marble temples drifting above golden cloudbanks. Only sorcerers wielding Portal Keys can reach its high-altitude spires.',
    moonColor: '#fde047',
    coronaColor: 'rgba(251, 191, 36, 0.4)'
  },
  {
    id: 'celestial_void',
    name: 'Celestial Void Rift',
    subtitle: 'Realm 08 · Astral Monoliths & Cosmic Nebula',
    theme: 'celestial',
    skyColorTop: '#090214',
    skyColorBottom: '#1e0538',
    groundColor: '#04010a',
    accentColor: '#ec4899',
    ambientParticles: 'stars',
    unlockedSpellNotice: 'All Apex Monsters & Forbidden Arts Mastery',
    lore: 'The dimensional boundary between reality and oblivion. Elite Titans and Abominations breach reality under swirling nebulas.',
    moonColor: '#e879f9',
    coronaColor: 'rgba(236, 72, 153, 0.4)'
  }
];
