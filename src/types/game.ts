export type SpellId = 
  | 'fireball' 
  | 'water_blast' 
  | 'lightning' 
  | 'earth_shield' 
  | 'frost_nova' 
  | 'celestial_beam' 
  | 'meteor_cataclysm'
  | 'blood_bender'
  | 'animal_puppetry';

export type GestureId = 
  | 'NONE'
  | 'DUAL_PALMS_FORWARD'      // Open palm forward (1 or 2 hands) -> Dual Flame Vortex
  | 'FIST_AND_PALM'          // 3-Finger Trident (1 hand) OR Fist + Palm (2 hands) -> Tidal Hydro Cannon
  | 'CROSS_INDEX_POINT'      // Index finger pointing (1 or 2 hands) -> Thunder Cross
  | 'DUAL_RAISED_FISTS'      // Clenched fist (1 or 2 hands) -> Titan Aegis Barrier
  | 'DUAL_PEACE_SPREAD'      // Peace / V-sign (1 or 2 hands) -> Cryo Blizzard Nova
  | 'CUPPED_PALMS_TOUCHING'  // 2 HANDS REQUIRED: Cupped palms touching together -> Celestial Prism Beam
  | 'DUAL_PUPPETEER_CLAWS'   // 2 HANDS REQUIRED: Both hands curved downward -> Blood Bender
  | 'DUAL_BEAST_TALONS'      // 2 HANDS REQUIRED: Both hands arched talons -> Animal Puppetry
  | 'THUMBS_UP_DUAL';        // Thumbs up (1 or 2 hands) -> Meteor Cataclysm

export interface SpellDefinition {
  id: SpellId;
  name: string;
  element: 'fire' | 'water' | 'lightning' | 'earth' | 'ice' | 'celestial' | 'blood' | 'beast';
  requiredLevel: number;
  requiredRealmIndex: number;
  gesture: GestureId;
  gestureName: string;
  fingerDescription: string;
  requiresTwoHands?: boolean; // Only special/forbidden spells require 2 hands!
  damage: number;
  cooldownMs: number;
  manaCost: number;
  color: string;
  glowColor: string;
  iconName: string;
  description: string;
  tacticalAdvantage: string;
  unlockedByGoalId?: string;
  isForbidden?: boolean;
}

export interface HandPoint {
  x: number; // 0 to 1 normalized
  y: number; // 0 to 1 normalized
  z?: number;
}

export interface SingleHandState {
  handFound: boolean;
  isLeft: boolean;
  landmarks: HandPoint[];
  fingerStates: {
    thumb: boolean;
    index: boolean;
    middle: boolean;
    ring: boolean;
    pinky: boolean;
  };
  isClaw: boolean;
  isBeastTalon: boolean;
  isFist: boolean;
  isOpenPalm: boolean;
  isIndexPointing: boolean;
  isPeace: boolean;
  isThreeFingerTrident: boolean;
  isThumbUp: boolean;
  wristPoint: HandPoint;
  palmCenter: HandPoint;
}

export interface DualHandData {
  leftHand: SingleHandState | null;
  rightHand: SingleHandState | null;
  handsCount: number;
}

export interface DetectedGesture {
  gesture: GestureId;
  matchedSpell: SpellDefinition | null;
  isUnlocked: boolean;
  confidence: number;
  aimPoint: { x: number; y: number }; // Screen coords
  handFound: boolean;
  handsCount: number;
  isDualBoosted?: boolean;
  leftHandState: SingleHandState | null;
  rightHandState: SingleHandState | null;
  rawLandmarks?: HandPoint[];
  dualLandmarks?: {
    left: HandPoint[] | null;
    right: HandPoint[] | null;
  };
}

export type ZombieType =
  | 'shambler'
  | 'runner'
  | 'dreadknight'
  | 'abomination'
  | 'wraith'
  | 'golem'
  | 'phantom'
  | 'titan';

export interface ZombieEnemy {
  id: string;
  type: ZombieType;
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
  z: number; // Distance 1.0 (horizon) down to 0.0 (player)
  speed: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  damage: number;
  width: number;
  height: number;
  animFrame: number;
  staggerTimer: number;
  lastAttackTime: number;
  attackCooldown: number;
  frozenTimer?: number;
  walkCyclePhase: number;
  isBloodControlled?: boolean;
  bloodControlTimer?: number;
  targetZombieId?: string;
  isElite?: boolean;
  eliteName?: string;
}

export interface SpectralBeast {
  id: string;
  x: number;
  y: number;
  z: number;
  targetZombieId: string | null;
  speed: number;
  damage: number;
  lifetime: number;
  animPhase: number;
}

export interface Projectile {
  id: string;
  spellId: SpellId;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  currentZ: number; // 0.0 to 1.0
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  color: string;
  size: number;
  trail: { x: number; y: number; alpha: number }[];
  isEnemy?: boolean;
  isBloodTendril?: boolean;
}

export interface VisualParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  gravity?: number;
}

export type WorldThemeType =
  | 'volcanic'
  | 'haunted_forest'
  | 'glacial'
  | 'desert_phantoms'
  | 'celestial'
  | 'mountains'
  | 'superstore_ruins'
  | 'sky_citadel';

export interface WorldRealm {
  id: string;
  name: string;
  subtitle: string;
  theme: WorldThemeType;
  skyColorTop: string;
  skyColorBottom: string;
  groundColor: string;
  accentColor: string;
  ambientParticles: string;
  unlockedSpellNotice: string;
  lore: string;
  moonColor: string;
  coronaColor: string;
}

export type ArmorTier = 'apprentice' | 'runic_hide' | 'silver_plate' | 'dread_iron' | 'celestial_aegis';

export interface ArmorItem {
  id: ArmorTier;
  name: string;
  tier: number;
  damageReduction: number;
  bonusHp: number;
  costAP: number;
  description: string;
  visualColor: string;
  accentBorder: string;
}

export type HandSkinId =
  | 'arcane_wireframe'
  | 'crimson_gauntlet'
  | 'cyber_plasma'
  | 'golden_seraph'
  | 'void_claws';

export interface HandSkinOption {
  id: HandSkinId;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  jointStyle: 'circle' | 'diamond' | 'hex' | 'ring' | 'claw';
  costAP: number;
}

export type AppLanguage = 'en' | 'es' | 'fr' | 'ar' | 'hi' | 'ja' | 'zh';

export type AppThemeId =
  | 'obsidian_gold'
  | 'crimson_ember'
  | 'emerald_forest'
  | 'frost_sapphire'
  | 'celestial_violet'
  | 'midnight_teal';

export type RPGGender = 'female' | 'male' | 'neutral';

export type RPGHairStyle =
  | 'spiky'
  | 'long_wavy'
  | 'bob'
  | 'ponytail'
  | 'twin_braids'
  | 'curly_afro'
  | 'undercut'
  | 'braided_bun';

export type RPGBangsStyle =
  | 'none'
  | 'blunt_bangs'
  | 'side_bangs'
  | 'curtain_bangs'
  | 'wispy_bangs'
  | 'face_framing';

export type RPGRearHairStyle =
  | 'default'
  | 'long_flowing'
  | 'shoulder_layered'
  | 'spiky_nape'
  | 'twin_tails';

export interface RPGOutfit {
  gender: RPGGender;
  hairStyle: RPGHairStyle;
  bangsStyle?: RPGBangsStyle;
  rearHairStyle?: RPGRearHairStyle;
  hairColor: string;
  skinTone: string;
  topStyle:
    | 'mage_robe'
    | 'knight_plate'
    | 'ranger_cloak'
    | 'druid_silk'
    | 'berserker_hide'
    | 'cozy_hoodie'
    | 'doctor_coat';
  topColor: string;
  cloakColor: string;
  pantsColor: string;
  shoulderArmor: 'none' | 'leather_pauldrons' | 'steel_pauldrons' | 'gold_pauldrons';
  weapon: 'none' | 'orb_staff' | 'runic_sword' | 'oak_bow' | 'paladin_halberd' | 'spirit_lantern';
  accessory:
    | 'none'
    | 'wizard_hat'
    | 'plumed_helm'
    | 'crimson_hood'
    | 'flower_crown'
    | 'sunglasses'
    | 'wolf_ears'
    | 'halo';
}

export interface FridgeFoodItem {
  id: string;
  name: string;
  kind: 'box' | 'fish' | 'cheese' | 'bottle' | 'bread' | 'apple' | 'tub';
  color: string;
  accentColor: string;
  hungerRestore: number;
  hpRestore: number;
  quantity: number;
}

export interface HouseFurniturePlacement {
  id: string;
  name: string;
  type:
    | 'sofa'
    | 'bed'
    | 'fireplace'
    | 'bookshelf'
    | 'plant'
    | 'rug'
    | 'table'
    | 'beanbag'
    | 'floor_lamp'
    | 'nightstand'
    | 'trophy'
    | 'arcade'
    | 'fridge';
  x: number;
  y: number;
  color: string;
  placed: boolean;
}

export interface HouseConfig {
  wallColor: string;
  floorTheme: 'herringbone_warm' | 'oak_wood' | 'slate_stone' | 'marble';
  furniture: HouseFurniturePlacement[];
}

export interface PlayerUpgrades {
  armorTier: ArmorTier;
  spellPowerLevel: number;
  manaCapacityLevel: number;
  manaRegenLevel: number;
  castHasteLevel: number;
  hemomancyLevel: number;
  beastMasteryLevel: number;
  arcanePoints: number;
  handSkin: HandSkinId;
  handGlowOverride?: string;
}

export interface PlayerStats {
  playerName?: string;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  hunger?: number;
  maxHunger?: number;
  fridgeFood?: FridgeFoodItem[];
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  score: number;
  wave: number;
  spellsCast: number;
  spellsHit: number;
  criticalHits: number;
  zombiesKilled: number;
  damageDealt: number;
  reactionTimes: number[];
  currentStreak: number;
  highestStreak: number;
  unlockedSpellIds: SpellId[];
  unlockedInThisSession: SpellId[];
  arenaPowersCount: number; // Need 20 acquired powers from the Fighting Arena for Hot Air Balloon
  portalKeys: number; // Keys required to unlock dimensional portals between realms
  rpgOutfit: RPGOutfit;
  houseConfig: HouseConfig;
  hiddenPowersFound: string[]; // Need 20 hidden powers in Roleplay World for Hot Air Balloon
  gemsCollected?: number;
  hasPickaxe?: boolean;
  hasHikingGear?: boolean;
  upgrades: PlayerUpgrades;
}

export interface GoalDefinition {
  id: string;
  title: string;
  description: string;
  targetCount: number;
  unlockedSpellId: SpellId;
  icon: string;
}

export interface LeaderboardEntry {
  id: string;
  rank?: number;
  playerName: string;
  countryCode: string;
  countryName: string;
  score: number;
  accuracy: number;
  waveReached: number;
  zombiesKilled: number;
  preferredSpell: string;
  timestamp: string;
}

export interface CountryInfo {
  code: string;
  name: string;
  flag: string;
  continent: string;
}

export type RPGZone =
  | 'town_square'
  | 'my_house'
  | 'playground'
  | 'hospital'
  | 'superstore'
  | 'hills'
  | 'underground_mine'
  | 'mountains'
  | 'catacombs'
  | 'blood_chamber_1'
  | 'blood_chamber_2'
  | 'blood_chamber_3'
  | 'blood_altar'
  | 'sky_sanctum'
  | 'beast_chamber_1'
  | 'beast_chamber_2'
  | 'beast_chamber_3'
  | 'beast_altar';

export type ChamberMinigameType =
  | 'blood_pipes'
  | 'blood_memory'
  | 'blood_crystals'
  | 'beast_birds'
  | 'beast_constellation'
  | 'beast_taming'
  | 'rpg_house_arcade'
  | 'rpg_playground_catch'
  | 'rpg_hospital_potion'
  | 'rpg_superstore_rush'
  | 'rpg_hills_fireflies'
  | 'rpg_mountains_climb'
  | 'rpg_underground_mine';

export interface RPGQuestState {
  currentZone: RPGZone;
  // Blood Bending 3-Chamber Gauntlet
  bloodChamber1Cleared: boolean;
  bloodChamber2Cleared: boolean;
  bloodChamber3Cleared: boolean;
  bloodBenderUnlocked: boolean;
  // Animal Puppetry 3-Chamber Gauntlet
  hotAirBalloonBoarded: boolean;
  beastChamber1Cleared: boolean;
  beastChamber2Cleared: boolean;
  beastChamber3Cleared: boolean;
  animalPuppetryUnlocked: boolean;
  // Life Roleplay & 20 Hidden Secrets
  hiddenSpotsFound: string[];
  itemsBought: string[];
}

export interface FingerCheck {
  finger: 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';
  isExtended: boolean;
  expectedExtended: boolean;
  isMatch: boolean;
  instruction: string;
}

export interface HandFeedback {
  handFound: boolean;
  poseDetected: string;
  expectedPose: string;
  isMatch: boolean;
  fingerChecks: FingerCheck[];
  missingFingerHints: string[];
}

export interface GestureVerificationReport {
  isMatch: boolean;
  targetSpell: SpellDefinition;
  detectedGesture: GestureId;
  detectedSpell: SpellDefinition | null;
  isPerformingOtherSpell: boolean;
  otherSpellName?: string;
  handsPresentCount: number;
  leftHand: HandFeedback;
  rightHand: HandFeedback;
  blockReason: string | null;
  overallFeedback: string;
  accuracyScore: number;
}
