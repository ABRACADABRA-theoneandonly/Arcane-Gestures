import React, { useEffect, useRef, useState } from 'react';
import p5 from 'p5';
import {
  AppLanguage,
  ChamberMinigameType,
  DetectedGesture,
  FridgeFoodItem,
  GestureId,
  HouseConfig,
  PlayerStats,
  RPGOutfit,
  RPGQuestState,
  RPGZone,
  SpellId
} from '../types/game';
import { CoopMinigameSession } from '../types/multiplayer';
import { audioEngine } from '../services/audioEngine';
import { multiplayerClient, MultiplayerSnapshot } from '../services/multiplayerClient';
import { SUPERSTORE_ITEMS, SuperstoreItem } from '../data/spellsAndRealms';
import { getTranslation } from '../data/i18nAndThemes';
import { ChamberMinigamesModal } from '../components/ChamberMinigamesModal';
import { HouseDecoratorModal, RPGOutfitModal } from '../components/RPGCustomizationModals';
import { ArcaneBookshelfModal } from '../components/ArcaneBookshelfModal';
import { MultiplayerChatBar } from '../components/MultiplayerChatBar';
import {
  ArrowLeft,
  Cloud,
  Compass,
  Gem,
  Home,
  MapPin,
  Mountain,
  PawPrint,
  Pickaxe,
  Shirt,
  ShoppingBag,
  Skull,
  Users,
  Utensils,
  X
} from 'lucide-react';

interface RPGCatacombsCanvasProps {
  playerStats: PlayerStats;
  onUpdateStats: (newStats: Partial<PlayerStats>) => void;
  onReturnToBattle: () => void;
  onReturnToHome: () => void;
  language?: AppLanguage;
  latestGesture?: DetectedGesture | null;
  cameraActive?: boolean;
  onEnsureCamera?: () => Promise<void> | void;
  onSimulateGesture?: (gestureId: GestureId) => void;
  multiplayerEnabled?: boolean;
  multiplayerRoomCode?: string;
  onOpenMultiplayerLobby?: () => void;
}

type PlayerPose =
  | 'idle'
  | 'sitting'
  | 'resting'
  | 'sleeping'
  | 'watering_plant'
  | 'sliding'
  | 'swinging_playground'
  | 'spinning_merry'
  | 'climbing_mountain';

interface MineVein {
  id: string;
  label: string;
  kind: 'emerald' | 'ruby' | 'sapphire' | 'amethyst' | 'diamond' | 'power_crystal';
  x: number;
  y: number;
  color: string;
  hp: number;
  maxHp: number;
  respawnTimer: number;
  apReward: number;
}

interface FloatingParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  text?: string;
}

interface SuperstoreShelfItem {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  accentColor: string;
  kind: 'box' | 'fish' | 'cheese' | 'bottle' | 'bread' | 'apple' | 'tub';
  costAP: number;
  hungerRestore: number;
  hpRestore: number;
  saleTag?: string;
}

const SUPERSTORE_SHELF_ITEMS: SuperstoreShelfItem[] = [
  // Left Red Display Aisle
  { id: 'blue_cookies', name: 'Blue Cookies', x: 196, y: 215, color: '#2563eb', accentColor: '#93c5fd', kind: 'box', costAP: 18, hungerRestore: 18, hpRestore: 8, saleTag: 'SAVE 10%' },
  { id: 'fruity_bites', name: 'Fruity Bites', x: 196, y: 268, color: '#16a34a', accentColor: '#fde047', kind: 'box', costAP: 15, hungerRestore: 16, hpRestore: 8 },
  { id: 'golden_cookies', name: 'Golden Cookies', x: 196, y: 321, color: '#f59e0b', accentColor: '#dc2626', kind: 'box', costAP: 22, hungerRestore: 22, hpRestore: 10, saleTag: 'SAVE 10%' },
  { id: 'choco_crisp', name: 'Choco Crisp', x: 196, y: 374, color: '#7e22ce', accentColor: '#e9d5ff', kind: 'box', costAP: 24, hungerRestore: 24, hpRestore: 10 },
  // Center Red Double-Sided Island Aisle
  { id: 'honey_cereal', name: 'Honey Cereal', x: 372, y: 248, color: '#eab308', accentColor: '#fef08a', kind: 'box', costAP: 20, hungerRestore: 25, hpRestore: 12, saleTag: 'SAVE 10%' },
  { id: 'berry_juice', name: 'Berry Juice', x: 428, y: 248, color: '#db2777', accentColor: '#fbcfe8', kind: 'bottle', costAP: 16, hungerRestore: 15, hpRestore: 14 },
  { id: 'artisan_bread', name: 'Bakery Bread', x: 372, y: 325, color: '#d97706', accentColor: '#fde68a', kind: 'bread', costAP: 18, hungerRestore: 30, hpRestore: 15 },
  { id: 'red_apples', name: 'Crisp Apples', x: 428, y: 325, color: '#ef4444', accentColor: '#86efac', kind: 'apple', costAP: 14, hungerRestore: 20, hpRestore: 18, saleTag: 'SAVE 10%' },
  // Right Red Refrigerated Deli & Produce Wall
  { id: 'salmon_tray', name: 'Fresh Salmon', x: 604, y: 215, color: '#fb923c', accentColor: '#fed7aa', kind: 'fish', costAP: 35, hungerRestore: 40, hpRestore: 25, saleTag: 'SAVE 10%' },
  { id: 'cheddar_cheese', name: 'Cheddar Cheese', x: 604, y: 268, color: '#fde047', accentColor: '#ca8a04', kind: 'cheese', costAP: 28, hungerRestore: 28, hpRestore: 16, saleTag: 'SAVE 10%' },
  { id: 'green_soda', name: 'Orchard Soda', x: 604, y: 321, color: '#22c55e', accentColor: '#bbf7d0', kind: 'bottle', costAP: 15, hungerRestore: 14, hpRestore: 10 },
  { id: 'frost_tub', name: 'Vanilla Cream', x: 604, y: 374, color: '#38bdf8', accentColor: '#e0f2fe', kind: 'tub', costAP: 25, hungerRestore: 24, hpRestore: 14 }
];

const ZONE_LABELS: Record<RPGZone, string> = {
  town_square: 'Aether Town Square',
  my_house: 'My Cozy House',
  playground: 'Sunbeam Playground',
  hospital: 'St. Aether Hospital',
  superstore: 'Grand Superstore',
  hills: 'Emerald Rolling Hills',
  underground_mine: 'Emerald Crystal Cavern (Underground)',
  mountains: 'Frostpeak Mountains',
  catacombs: 'Ancient Mossy Catacombs',
  blood_chamber_1: 'Sanguine Chamber I · Conduit Trial',
  blood_chamber_2: 'Sanguine Chamber II · Memory Trial',
  blood_chamber_3: 'Sanguine Chamber III · Crystal Dodge',
  blood_altar: 'Inner Sanguine Altar',
  sky_sanctum: 'Aetheria Sky Sanctum',
  beast_chamber_1: 'Sky Chamber I · Spirit Chimes',
  beast_chamber_2: 'Sky Chamber II · Wolf Constellation',
  beast_chamber_3: 'Sky Chamber III · Alpha Taming',
  beast_altar: 'Altar of Primal Beasts'
};

export const RPGCatacombsCanvas: React.FC<RPGCatacombsCanvasProps> = ({
  playerStats,
  onUpdateStats,
  onReturnToBattle,
  onReturnToHome,
  language = 'en',
  latestGesture = null,
  cameraActive = false,
  onEnsureCamera,
  onSimulateGesture,
  multiplayerEnabled = false,
  multiplayerRoomCode = 'PUBLIC',
  onOpenMultiplayerLobby
}) => {
  const t = getTranslation(language);
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);

  const [questState, setQuestState] = useState<RPGQuestState>({
    currentZone: 'town_square',
    bloodChamber1Cleared: false,
    bloodChamber2Cleared: false,
    bloodChamber3Cleared: false,
    bloodBenderUnlocked: playerStats.unlockedSpellIds.includes('blood_bender'),
    hotAirBalloonBoarded: false,
    beastChamber1Cleared: false,
    beastChamber2Cleared: false,
    beastChamber3Cleared: false,
    animalPuppetryUnlocked: playerStats.unlockedSpellIds.includes('animal_puppetry'),
    hiddenSpotsFound: playerStats.hiddenPowersFound || [],
    itemsBought: []
  });

  const [activeDialogue, setActiveDialogue] = useState<{
    speaker: string;
    text: string;
    avatarColor: string;
    powerHint?: string;
    extraHint?: string;
    revealedHint?: 'power' | 'gesture';
  } | null>(null);

  const [activeMinigame, setActiveMinigame] = useState<{
    type: ChamberMinigameType;
    title: string;
    sessionId?: string;
    onWin: () => void;
  } | null>(null);

  const [mpSnap, setMpSnap] = useState<MultiplayerSnapshot>(() => multiplayerClient.getSnapshot());
  const mpSnapRef = useRef(mpSnap);
  useEffect(() => {
    mpSnapRef.current = mpSnap;
  }, [mpSnap]);

  useEffect(() => {
    return multiplayerClient.subscribe((next) => {
      setMpSnap(next);
    });
  }, []);

  const [showOutfitModal, setShowOutfitModal] = useState(false);
  const [showHouseModal, setShowHouseModal] = useState(false);
  const [showBookshelfBook, setShowBookshelfBook] = useState(false);
  const [showFridgeModal, setShowFridgeModal] = useState(false);
  const [showSuperstore, setShowSuperstore] = useState(false);
  const [showFastTravel, setShowFastTravel] = useState(false);
  const fridgeEatEventRef = useRef<{ label: string; hunger: number } | null>(null);

  const [promptMessage, setPromptMessage] = useState<string>(
    'Walk with Arrow Keys / WASD · Press [E] to Use/Ride/Interact · [F] Sleep/Water/Minigames · [L] Lights in House'
  );

  const questStateRef = useRef(questState);
  useEffect(() => {
    questStateRef.current = questState;
  }, [questState]);

  const playerStatsRef = useRef(playerStats);
  useEffect(() => {
    playerStatsRef.current = playerStats;
  }, [playerStats]);

  const onUpdateStatsRef = useRef(onUpdateStats);
  useEffect(() => {
    onUpdateStatsRef.current = onUpdateStats;
  }, [onUpdateStats]);

  const warpPositionRef = useRef<{ zone: RPGZone; x: number; y: number } | null>(null);

  const travelToZone = (zone: RPGZone, x: number = 400, y: number = 320, msg?: string) => {
    audioEngine.playRealmWarp();
    warpPositionRef.current = { zone, x, y };
    setQuestState((prev) => ({ ...prev, currentZone: zone }));
    setShowFastTravel(false);
    if (multiplayerClient.getSnapshot().enabled) {
      multiplayerClient.sendPlayerUpdate({ zone, x, y, mode: 'rpg' }, true);
    }
    setPromptMessage(
      msg ||
        `Entered ${ZONE_LABELS[zone]} · Walk near objects for [E] Use & [F] Special Actions!`
    );
  };

  // Reward helper accessible both inside p5 canvas & React co-op handlers
  const grantMinigameReward = (spotId: string, title: string, rewardText: string) => {
    const q = questStateRef.current;
    const stats = playerStatsRef.current;
    const already =
      q.hiddenSpotsFound.includes(spotId) || (stats.hiddenPowersFound || []).includes(spotId);
    audioEngine.playLevelUp();
    if (already) {
      onUpdateStatsRef.current({
        upgrades: { ...stats.upgrades, arcanePoints: stats.upgrades.arcanePoints + 60 }
      });
      setPromptMessage(`${title} Co-op Cleared! +60 Bonus AP!`);
      return;
    }
    const updatedSpots = [
      ...new Set([...q.hiddenSpotsFound, ...(stats.hiddenPowersFound || []), spotId])
    ];
    setQuestState((prev) => ({ ...prev, hiddenSpotsFound: updatedSpots }));
    onUpdateStatsRef.current({
      hiddenPowersFound: updatedSpots,
      upgrades: { ...stats.upgrades, arcanePoints: stats.upgrades.arcanePoints + 160 }
    });
    setPromptMessage(`★ Co-op Trial Cleared (${updatedSpots.length}/20 Hidden Powers) · +160 AP!`);
    setActiveDialogue({
      speaker: `Co-op Victory · ${title}`,
      text: rewardText,
      avatarColor: '#10b981'
    });
  };

  const getMinigameRewardMeta = (type: ChamberMinigameType): { spotId: string; title: string; text: string } => {
    switch (type) {
      case 'rpg_house_arcade':
        return { spotId: 'spot_house_arcade', title: 'Hand-Aimed Arcane Blaster', text: 'You & your allies blasted all 18 armored invaders!' };
      case 'rpg_playground_catch':
        return { spotId: 'spot_playground_stars', title: 'Playground Meteor Dash', text: 'Your party leaped across springboards and caught 14 Comet Stars!' };
      case 'rpg_hospital_potion':
        return { spotId: 'spot_hospital_potions', title: 'Alchemist Hand Brewing', text: 'Channeling hand gestures brewed all 4 critical elixirs in time!' };
      case 'rpg_superstore_rush':
        return { spotId: 'spot_superstore_rush', title: 'Superstore Trolley Dash', text: 'Dodged cursed carts and delivered all 8 Enchanted Items!' };
      case 'rpg_hills_fireflies':
        return { spotId: 'spot_hills_fireflies', title: 'Twilight Briar Maze', text: 'Navigated boulders and netted 12 Twilight Fireflies!' };
      case 'rpg_mountains_climb':
        return { spotId: 'spot_mountains_climb', title: 'Frostpeak Cliff Ascent', text: 'Scaled moving ice ledges and lit all 6 Alpine Summit Beacons!' };
      case 'rpg_underground_mine':
        return { spotId: 'spot_underground_relic', title: 'Timed Crystal Cavern Dig', text: 'Unearthed 6 rare Arcane Gems & Power Cores before cave-in!' };
      default:
        return { spotId: 'spot_house_arcade', title: 'Co-op Arcane Trial', text: 'Conquered the trial together!' };
    }
  };

  const openZoneCoopMinigame = (forcedType?: ChamberMinigameType) => {
    const zone = questStateRef.current.currentZone;
    const zoneMap: Record<RPGZone, { type: ChamberMinigameType; title: string }> = {
      town_square: { type: 'rpg_playground_catch', title: 'Co-op Playground Meteor Dash' },
      my_house: { type: 'rpg_house_arcade', title: 'My House · Hand-Aimed Spell Blaster' },
      playground: { type: 'rpg_playground_catch', title: 'Playground · Meteor & Springboard Dash' },
      hospital: { type: 'rpg_hospital_potion', title: 'Hospital · Alchemist Hand-Brewing Lab' },
      superstore: { type: 'rpg_superstore_rush', title: 'Superstore · Trolley Obstacle Dash' },
      hills: { type: 'rpg_hills_fireflies', title: 'Emerald Hills · Briar Maze Firefly Rush' },
      underground_mine: { type: 'rpg_underground_mine', title: 'Crystal Cavern · Cave-In Sonar Dig' },
      mountains: { type: 'rpg_mountains_climb', title: 'Frostpeak · Cliff Platformer Ascent' },
      catacombs: { type: 'blood_crystals', title: 'Sanguine Chamber III · Gauntlet of Blades' },
      blood_chamber_1: { type: 'blood_pipes', title: 'Blood Chamber I · 5×5 Sanguine Conduit' },
      blood_chamber_2: { type: 'blood_memory', title: 'Blood Chamber II · 4-Phase Glyph Echo' },
      blood_chamber_3: { type: 'blood_crystals', title: 'Blood Chamber III · Gauntlet of Blades' },
      blood_altar: { type: 'blood_crystals', title: 'Blood Chamber III · Gauntlet of Blades' },
      sky_sanctum: { type: 'beast_taming', title: 'Sky Chamber III · Storm Gorge Wolf Herding' },
      beast_chamber_1: { type: 'beast_birds', title: 'Sky Chamber I · Hand-Cast Spirit Chimes' },
      beast_chamber_2: { type: 'beast_constellation', title: 'Sky Chamber II · 8-Star Wolf Trail' },
      beast_chamber_3: { type: 'beast_taming', title: 'Sky Chamber III · Storm Gorge Wolf Herding' },
      beast_altar: { type: 'beast_taming', title: 'Sky Chamber III · Storm Gorge Wolf Herding' }
    };
    const spec = forcedType ? { type: forcedType, title: getMinigameRewardMeta(forcedType).title } : zoneMap[zone];
    const sessionId = multiplayerEnabled
      ? multiplayerClient.inviteToMinigame(spec.type, spec.title, zone)
      : undefined;

    setActiveMinigame({
      type: spec.type,
      title: spec.title,
      sessionId,
      onWin: () => {
        setActiveMinigame(null);
        const meta = getMinigameRewardMeta(spec.type);
        grantMinigameReward(meta.spotId, meta.title, meta.text);
      }
    });
  };

  const handleJoinCoopSession = (sess: CoopMinigameSession) => {
    multiplayerClient.joinMinigame(sess.sessionId);
    if (questStateRef.current.currentZone !== sess.zone) {
      travelToZone(sess.zone, 400, 320, `Joined ${sess.hostName} in Co-op Trial!`);
    }
    setActiveMinigame({
      type: sess.minigame,
      title: sess.title,
      sessionId: sess.sessionId,
      onWin: () => {
        setActiveMinigame(null);
        if (sess.minigame === 'blood_pipes') setQuestState((p) => ({ ...p, bloodChamber1Cleared: true }));
        else if (sess.minigame === 'blood_memory') setQuestState((p) => ({ ...p, bloodChamber2Cleared: true }));
        else if (sess.minigame === 'blood_crystals') setQuestState((p) => ({ ...p, bloodChamber3Cleared: true }));
        else if (sess.minigame === 'beast_birds') setQuestState((p) => ({ ...p, beastChamber1Cleared: true }));
        else if (sess.minigame === 'beast_constellation') setQuestState((p) => ({ ...p, beastChamber2Cleared: true }));
        else if (sess.minigame === 'beast_taming') setQuestState((p) => ({ ...p, beastChamber3Cleared: true }));
        else {
          const meta = getMinigameRewardMeta(sess.minigame);
          grantMinigameReward(meta.spotId, meta.title, meta.text);
        }
      }
    });
  };

  // Complete local minigame automatically if a teammate completes the shared Co-op session!
  useEffect(() => {
    return multiplayerClient.onMinigameCompleted((sess, winnerName) => {
      if (activeMinigame && activeMinigame.sessionId === sess.sessionId) {
        setPromptMessage(`★ ${winnerName} completed "${sess.title}" for the whole Co-op party!`);
        activeMinigame.onWin();
      }
    });
  }, [activeMinigame]);

  useEffect(() => {
    if (!containerRef.current) return;

    let playerX = 400;
    let playerY = 365;
    let isMoving = false;
    let facingDir = 1;
    let stepFrame = 0;
    const speed = 3.9;
    let currentFrameCount = 0;
    const keysDown: Record<string, boolean> = {};

    const getTownNPCPositions = (frame: number) => ({
      bram: { x: 255 + Math.sin(frame * 0.018) * 72, y: 318 },
      lyra: { x: 432, y: 225 + Math.cos(frame * 0.022) * 50 },
      aldrin: { x: 385 + Math.sin(frame * 0.015 + 1.8) * 95, y: 422 }
    });
    const getPlaygroundNPCPositions = (frame: number) => ({
      toby: { x: 345 + Math.sin(frame * 0.024) * 68, y: 358 },
      maya: { x: 505 + Math.sin(frame * 0.02 + 2.1) * 58, y: 325 }
    });
    const getHospitalNPCPositions = (frame: number) => ({
      clara: { x: 400, y: 129 },
      eli: { x: 430 + Math.sin(frame * 0.019) * 95, y: 265 }
    });
    const getSuperstoreNPCPositions = (frame: number) => ({
      nia: { x: 300 + Math.sin(frame * 0.017) * 55, y: 405 }
    });
    const getHillsNPCPositions = (frame: number) => ({
      rowan: { x: 275 + Math.sin(frame * 0.016) * 48, y: 338 },
      vespera: { x: 215 + Math.cos(frame * 0.014) * 32, y: 222 }
    });
    const getMountainsNPCPositions = (frame: number) => ({
      malakor: { x: 315 + Math.sin(frame * 0.013) * 36, y: 268 }
    });

    // Interactive Pose & Environment States
    let playerPose: PlayerPose = 'idle';
    let poseTimer = 0;
    let poseAnchorX = 0;
    let poseAnchorY = 0;
    let poseObjectName = '';

    // House Interactive States
    let roomLightsOn = true;
    let floorLampOn = true;
    let nightstandLampOn = true;
    let hearthLit = true;
    let plantWaterLevel = 0; // 0..3
    let plantHasFruit = false;
    let plantHasFlowers = false;
    let sleepBlackoutUntil = 0;
    let sleepWakeX = 245;
    let sleepWakeY = 315;
    let plantPoseX = 295;
    let plantPoseY = 175;

    // Shopping Cart & Reach-Up Interactive States
    let hasShoppingCart = false;
    let cartItems: SuperstoreShelfItem[] = [];
    let shoppingReachTimer = 0;
    let shoppingReachItem: SuperstoreShelfItem | null = null;
    let shoppingReachTargetX = 0;
    let shoppingReachTargetY = 0;

    // Mining & Climbing Interactive States
    let pickaxeSwingTimer = 0;
    let wateringCanTimer = 0;
    let plantEatUntil = 0;
    let plantSmellUntil = 0;
    let boulderDamage = 0; // 2 hits to break Hills boulder into Underground Mine
    let mineEntranceOpen = false;
    let actionHoldUntil = 0;
    let lastHungerTick = performance.now();
    let pendingAction: { targetX: number; targetY: number; onArrive: () => void } | null = null;

    const particles: FloatingParticle[] = [];

    const mineVeins: MineVein[] = [
      { id: 'v1', label: 'Emerald Vein', kind: 'emerald', x: 185, y: 155, color: '#34d399', hp: 2, maxHp: 2, respawnTimer: 0, apReward: 55 },
      { id: 'v2', label: 'Ruby Cluster', kind: 'ruby', x: 615, y: 165, color: '#f43f5e', hp: 2, maxHp: 2, respawnTimer: 0, apReward: 65 },
      { id: 'v3', label: 'Sapphire Seam', kind: 'sapphire', x: 175, y: 345, color: '#38bdf8', hp: 2, maxHp: 2, respawnTimer: 0, apReward: 60 },
      { id: 'v4', label: 'Amethyst Crystal', kind: 'amethyst', x: 620, y: 340, color: '#c084fc', hp: 2, maxHp: 2, respawnTimer: 0, apReward: 70 },
      { id: 'v5', label: 'Prism Diamond', kind: 'diamond', x: 280, y: 245, color: '#e0f2fe', hp: 3, maxHp: 3, respawnTimer: 0, apReward: 110 },
      { id: 'v6', label: 'Arcane Power Crystal', kind: 'power_crystal', x: 525, y: 245, color: '#facc15', hp: 3, maxHp: 3, respawnTimer: 0, apReward: 130 }
    ];

    const spawnBurst = (
      x: number,
      y: number,
      color: string,
      count: number = 12,
      text?: string,
      gravity: number = 0.08
    ) => {
      if (text) {
        particles.push({
          x,
          y: y - 18,
          vx: 0,
          vy: -0.9,
          color,
          size: 12,
          life: 62,
          text
        });
      }
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 1.2 + Math.random() * 3.2;
        particles.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - gravity * 10,
          color,
          size: 3 + Math.random() * 3.5,
          life: 24 + Math.random() * 20
        });
      }
    };

    const claimHiddenSpot = (
      spotId: string,
      title: string,
      rewardText: string,
      bonusSpellId?: SpellId,
      bonusKeys: number = 0,
      bonusAP: number = 140
    ) => {
      const q = questStateRef.current;
      const stats = playerStatsRef.current;
      const alreadyFound =
        q.hiddenSpotsFound.includes(spotId) || (stats.hiddenPowersFound || []).includes(spotId);

      if (alreadyFound) {
        audioEngine.playAncientRune();
        onUpdateStatsRef.current({
          upgrades: { ...stats.upgrades, arcanePoints: stats.upgrades.arcanePoints + 30 }
        });
        setPromptMessage(`${title} re-inspected! +30 Bonus AP`);
        return;
      }

      audioEngine.playLevelUp();
      const updatedSpots = [
        ...new Set([...q.hiddenSpotsFound, ...(stats.hiddenPowersFound || []), spotId])
      ];
      setQuestState((prev) => ({ ...prev, hiddenSpotsFound: updatedSpots }));

      const nextSpells = [...stats.unlockedSpellIds];
      if (bonusSpellId && !nextSpells.includes(bonusSpellId)) {
        nextSpells.push(bonusSpellId);
      }

      onUpdateStatsRef.current({
        hiddenPowersFound: updatedSpots,
        portalKeys: (stats.portalKeys || 0) + bonusKeys,
        unlockedSpellIds: nextSpells,
        upgrades: {
          ...stats.upgrades,
          arcanePoints: stats.upgrades.arcanePoints + bonusAP
        }
      });

      setActiveDialogue({
        speaker: `HIDDEN POWER (${updatedSpots.length}/20) · ${title}`,
        text: rewardText,
        avatarColor: '#fbbf24'
      });
      setPromptMessage(
        `★ Hidden Power #${updatedSpots.length}/20 Discovered! +${bonusAP} AP${bonusKeys ? ` & +${bonusKeys} Key` : ''}`
      );
    };

    const resetPose = () => {
      playerPose = 'idle';
      poseTimer = 0;
      poseObjectName = '';
      actionHoldUntil = 0;
      plantEatUntil = 0;
      plantSmellUntil = 0;
    };

    const walkAndDo = (targetX: number, targetY: number, onArrive: () => void) => {
      if (Math.hypot(playerX - targetX, playerY - targetY) <= 6) {
        playerX = targetX;
        playerY = targetY;
        pendingAction = null;
        onArrive();
      } else {
        pendingAction = { targetX, targetY, onArrive };
      }
    };

    const handleInteraction = (actionType: 'primary' | 'secondary' | 'lights') => {
      const q = questStateRef.current;
      const stats = playerStatsRef.current;
      const heroName = (stats.playerName || 'Aria').trim() || 'Aria';
      const near = (x: number, y: number, r: number = 60) => Math.hypot(playerX - x, playerY - y) < r;

      // Lock interactions during 2-second blackout sleep
      if (playerPose === 'sleeping' && sleepBlackoutUntil > performance.now()) {
        return;
      }

      // Global House Lights Switch [L]
      if (actionType === 'lights') {
        if (q.currentZone === 'my_house') {
          roomLightsOn = !roomLightsOn;
          audioEngine.playAncientRune();
          spawnBurst(395, 118, roomLightsOn ? '#fde047' : '#64748b', 10, roomLightsOn ? 'Lights ON 💡' : 'Lights OFF 🌙');
          setPromptMessage(
            roomLightsOn
              ? 'Main House Lights turned ON! Press [L] anytime to turn off.'
              : 'House Lights turned OFF — the room is now dark! Press [L] or use the wall switch to turn them back on.'
          );
        }
        return;
      }

      // Enforce minimum 5-second stay for watering, eating fruit, or smelling flowers
      if (
        performance.now() < actionHoldUntil &&
        (playerPose === 'watering_plant' || performance.now() < plantEatUntil || performance.now() < plantSmellUntil)
      ) {
        const secsLeft = Math.ceil((actionHoldUntil - performance.now()) / 1000);
        setPromptMessage(`Finishing action (${secsLeft}s remaining)...`);
        return;
      }

      // If currently resting/sitting/sleeping/swinging/spinning, [E] lets you hop right out after at least 5 seconds!
      if (
        actionType === 'primary' &&
        ['sitting', 'resting', 'sleeping', 'swinging_playground', 'spinning_merry'].includes(playerPose)
      ) {
        if (performance.now() < actionHoldUntil) {
          const secsLeft = Math.ceil((actionHoldUntil - performance.now()) / 1000);
          setPromptMessage(`Staying in ${playerPose} pose (${secsLeft}s remaining)...`);
          return;
        }
        if (playerPose === 'resting') {
          playerY = Math.min(485, playerY + 46);
        }
        resetPose();
        audioEngine.playAncientRune();
        setPromptMessage('Stood up! Walk freely with Arrow Keys / WASD.');
        return;
      }

      // Allow pressing [F] to sleep even when already lying down resting on the bed
      if (actionType === 'secondary' && playerPose === 'resting') {
        resetPose();
      }

      // Check nearby Multiplayer Friends in the same zone for [E] Friendly Interaction!
      const mp = mpSnapRef.current;
      if (mp.enabled && actionType === 'primary') {
        const nearbyFriend = mp.players.find(
          (fp) =>
            fp.id !== mp.selfId &&
            fp.mode === 'rpg' &&
            fp.zone === q.currentZone &&
            near(fp.x, fp.y, 58)
        );
        if (nearbyFriend) {
          audioEngine.playAncientRune();
          multiplayerClient.sendChat(`👋 ${heroName} waved at ${nearbyFriend.name}!`, 'emote');
          setActiveDialogue({
            speaker: `Friend · ${nearbyFriend.name}`,
            text: `You met ${nearbyFriend.name} in ${ZONE_LABELS[q.currentZone]}! Chat in the room bar below or click "Co-op Minigame" to tackle an obstacle trial together.`,
            avatarColor: nearbyFriend.color || '#38bdf8'
          });
          return;
        }
      }

      // ==================== TOWN SQUARE ====================
      if (q.currentZone === 'town_square') {
        const townNpcs = getTownNPCPositions(currentFrameCount);
        if (near(townNpcs.bram.x, townNpcs.bram.y, 58)) {
          audioEngine.playAncientRune();
          setActiveDialogue({
            speaker: 'Merchant Bram · Caravan Trader',
            text: `Hail, ${heroName}! Fresh crates just arrived at the Grand Superstore to the East. Grab a shopping cart from the corral outside the door if you want to browse the aisles!`,
            avatarColor: '#f59e0b'
          });
          return;
        }
        if (near(townNpcs.lyra.x, townNpcs.lyra.y, 58)) {
          audioEngine.playAncientRune();
          setActiveDialogue({
            speaker: 'Lyra · Town Herbalist',
            text: `Lovely day in Town Square, ${heroName}! I’m gathering fresh mint and berries for dinner—have you checked out the SAVE 10% produce section at the Superstore?`,
            avatarColor: '#ec4899'
          });
          return;
        }
        if (near(townNpcs.aldrin.x, townNpcs.aldrin.y, 58)) {
          audioEngine.playAncientRune();
          setActiveDialogue({
            speaker: 'Ancient Sorcerer Aldrin · Elder of Aether (1/3)',
            text: `Greetings, ${heroName}. I am one of only three Ancient Sorcerers who guard the old handcraft and hidden power lore.`,
            avatarColor: '#6366f1',
            powerHint: !q.hiddenSpotsFound.includes('spot_superstore_crates')
              ? 'Sorcerer’s Sight: Check behind the dusty crates in the upper-right stockroom of Grand Superstore [E], behind Ward B’s curtain in St. Aether Hospital, and behind the Arcane Bookshelf inside My House!'
              : 'Sorcerer’s Sight: Inspect the Town Square Fountain, Clock Pillar & Torch, then seek my fellow Ancient Sorcerer in Emerald Hills when you travel North!',
            extraHint: 'Ancient Hand Movement: Spread all 5 fingers on BOTH open palms forward for Dual Flame Vortex, or cup BOTH palms together at chest center for Celestial Prism Kamehameha!'
          });
          return;
        }

        // Outdoor Shopping Cart Corral right outside Superstore entrance (572, 274)
        if (near(572, 274, 48)) {
          if (!hasShoppingCart) {
            hasShoppingCart = true;
            audioEngine.playArmorUpgrade();
            spawnBurst(572, 274, '#ef4444', 12, 'Grabbed Shopping Cart! 🛒');
            setPromptMessage('Pushing a Shopping Cart! Enter [E] SUPERSTORE nearby and press [E] by shelves to reach up & fill it!');
          } else if (actionType === 'secondary' || cartItems.length === 0) {
            hasShoppingCart = false;
            cartItems = [];
            audioEngine.playAncientRune();
            spawnBurst(572, 274, '#94a3b8', 10, 'Parked Cart ✓');
            setPromptMessage('Parked your Shopping Cart back in the outdoor corral.');
          } else {
            audioEngine.playGestureBlocked();
            setPromptMessage(`Cart has ${cartItems.length} item(s)! Check out inside Superstore or press [F] here to empty & park cart.`);
          }
          return;
        }

        if (near(180, 165, 62)) {
          const isMpHouse = mpSnapRef.current.enabled;
          return travelToZone(
            'my_house',
            isMpHouse ? 458 : 400,
            isMpHouse ? 464 : 420,
            isMpHouse
              ? `Welcome to your 2-Person Shared Home, ${heroName}! Explore 2 Bedrooms, 2 Baths, Kitchen Fridge [E], Fireplace & Living Room!`
              : `Welcome home, ${heroName}! [E] Sit Couch / Rest Bed / Open Fridge / Read Bookshelf · [F] Sleep Bed / Water Plant · [L] Room Lights!`
          );
        }
        if (near(620, 165, 62)) {
          return travelToZone(
            'playground',
            400,
            445,
            'Sunbeam Playground · [E] Ride Slide / Swings / Talk to Kids · [F] Play Star Catcher Minigame!'
          );
        }
        if (near(155, 345, 62)) {
          return travelToZone('hospital', 400, 440, 'St. Aether Hospital · Speak to Nurse Clara, Medic Eli, or mix Elixirs!');
        }
        if (near(645, 345, 62)) {
          return travelToZone('superstore', 400, 440, 'Grand Superstore · Talk to Nia, Shop at checkout, or play Shelf Memory Rush!');
        }
        if (near(400, 95, 62)) {
          return travelToZone(
            'hills',
            400,
            460,
            'Emerald Hills · Talk to Ranger Rowan or grab the Pickaxe [E] to crack the hillside boulder!'
          );
        }
        if (near(400, 325, 62)) {
          return claimHiddenSpot(
            'spot_town_fountain',
            'Fountain Coin Wish Vault',
            'Fishing a shimmering rune coin out of Aether Fountain awakened +1 Hidden Roleplay Power & +1 Portal Key!',
            undefined,
            1,
            120
          );
        }
        if (near(255, 108, 56)) {
          return claimHiddenSpot(
            'spot_town_clock',
            'Clocktower Ledger Hollow',
            'Behind the mossy plaza bulletin pillar lay a hidden Timekeeper Rune! (+1 Hidden Power & +120 AP)',
            undefined,
            0,
            120
          );
        }
        if (near(555, 420, 56)) {
          return claimHiddenSpot(
            'spot_town_lantern',
            'Cobblestone Lantern Seal',
            'A secret glyph beneath the southeastern town lantern pulsed with starlight! (+1 Hidden Power & +120 AP)',
            undefined,
            0,
            120
          );
        }
      }

      // ==================== MY HOUSE (SINGLE-PLAYER OR 2-PERSON MULTIPLAYER FLOORPLAN!) ====================
      else if (q.currentZone === 'my_house') {
        const isMpHouse = mpSnapRef.current.enabled;

        if (isMpHouse) {
          // Front Door Exit (458, 498)
          if (near(458, 498, 52)) {
            resetPose();
            return travelToZone('town_square', 180, 210);
          }

          // Wall Light Switch (438, 310)
          if (near(438, 310, 48)) {
            walkAndDo(446, 314, () => {
              roomLightsOn = !roomLightsOn;
              audioEngine.playAncientRune();
              spawnBurst(438, 310, roomLightsOn ? '#fde047' : '#64748b', 10, roomLightsOn ? 'Switch ON 💡' : 'Switch OFF 🌙');
              setPromptMessage(roomLightsOn ? 'Wall Switch: Shared Home Lights ON!' : 'Wall Switch: Shared Home Lights OFF — Lamps glowing!');
            });
            return;
          }

          // Stainless Steel Fridge in U-Shaped Kitchen (552, 148)
          if (near(552, 148, 56)) {
            walkAndDo(544, 174, () => {
              audioEngine.playAncientRune();
              spawnBurst(552, 148, '#38bdf8', 12, 'Opened Kitchen Fridge 🧊');
              setPromptMessage(`Opened the Stainless Fridge — pick food you bought from Superstore to boost Hunger!`);
              setShowFridgeModal(true);
            });
            return;
          }

          // Bedroom 1 Bed (192, 172) & Bedroom 2 Bed (186, 424)
          for (const bedSpec of [
            { x: 192, y: 172, wakeY: 222, name: 'Bedroom 1 Queen Bed' },
            { x: 186, y: 424, wakeY: 472, name: 'Bedroom 2 Guest Bed' }
          ]) {
            if (near(bedSpec.x, bedSpec.y, 58)) {
              walkAndDo(bedSpec.x + 2, bedSpec.y - 2, () => {
                if (actionType === 'secondary') {
                  playerPose = 'sleeping';
                  poseAnchorX = bedSpec.x + 2;
                  poseAnchorY = bedSpec.y - 2;
                  poseObjectName = bedSpec.name;
                  sleepBlackoutUntil = performance.now() + 2000;
                  sleepWakeX = bedSpec.x;
                  sleepWakeY = Math.min(488, bedSpec.wakeY);
                  audioEngine.playGestureSuccess();
                  onUpdateStatsRef.current({ hp: stats.maxHp, mana: stats.maxMana });
                  setPromptMessage('Sleeping...');
                } else {
                  playerPose = 'resting';
                  poseAnchorX = bedSpec.x + 2;
                  poseAnchorY = bedSpec.y - 2;
                  poseObjectName = bedSpec.name;
                  actionHoldUntil = performance.now() + 5000;
                  audioEngine.playAncientRune();
                  onUpdateStatsRef.current({
                    hp: Math.min(stats.maxHp, stats.hp + 40),
                    mana: Math.min(stats.maxMana, stats.mana + 40)
                  });
                  spawnBurst(bedSpec.x, bedSpec.y - 18, '#a3e635', 10, 'Resting (+40 HP/Mana)');
                  setPromptMessage(`Resting on ${bedSpec.name} (for at least 5s). Press [F] to Sleep!`);
                }
              });
              return;
            }
          }

          // Dining Credenza / Bookshelf Tome (626, 102)
          if (near(626, 102, 56)) {
            walkAndDo(626, 134, () => {
              audioEngine.playAncientRune();
              if (!q.hiddenSpotsFound.includes('spot_house_floor')) {
                claimHiddenSpot(
                  'spot_house_floor',
                  'Dining Credenza Rune Compartment',
                  'Inside the carved Dining Room credenza you discovered a hidden Spell Tome & Portal Key! (+1 Hidden Power, +1 Key, +140 AP)',
                  undefined,
                  1,
                  140
                );
              }
              spawnBurst(626, 102, '#fbbf24', 12, 'Opened Spellbook 📖');
              setPromptMessage(`${heroName} opened the Arcane Tome on the credenza — view Hand Movements & Power Hints!`);
              setShowBookshelfBook(true);
            });
            return;
          }

          // Central Living Room Fireplace (558, 228)
          if (near(558, 228, 56)) {
            walkAndDo(558, 256, () => {
              if (actionType === 'primary' && !q.hiddenSpotsFound.includes('spot_house_chimney')) {
                claimHiddenSpot(
                  'spot_house_chimney',
                  'Central Hearth Mantel Relic',
                  'Inside the shared apartment’s white hearth mantel gleamed an ember sigil! (+1 Hidden Power & +140 AP)',
                  undefined,
                  0,
                  140
                );
              }
              hearthLit = !hearthLit;
              audioEngine.playAncientRune();
              spawnBurst(558, 228, hearthLit ? '#f97316' : '#64748b', 12, hearthLit ? 'Fireplace Lit 🔥' : 'Fire Banked');
              setPromptMessage(`Living Room Fireplace ${hearthLit ? 'stoked warmly 🔥' : 'extinguished'}.`);
            });
            return;
          }

          // Computer Desk / Arcade Setup (480, 268)
          if (near(480, 268, 56)) {
            setActiveMinigame({
              type: 'rpg_house_arcade',
              title: 'Shared Apartment · Desk Arcade Blaster',
              onWin: () => {
                setActiveMinigame(null);
                claimHiddenSpot(
                  'spot_house_arcade',
                  'Co-op Desk High-Score Cartridge',
                  'You cleared the Desk Blaster Arcade invaders and unlocked a Hidden Power! (+1 Hidden Power, +140 AP)'
                );
              }
            });
            return;
          }

          // Living Room Sofa (576, 474), Accent Armchair (638, 394), & Dining Table (626, 194)
          for (const seat of [
            { x: 576, y: 474, ax: 576, ay: 470, label: 'Living Room Sofa' },
            { x: 638, y: 394, ax: 638, ay: 392, label: 'Cream Armchair' },
            { x: 626, y: 194, ax: 604, ay: 194, label: 'Dining Room Table' }
          ]) {
            if (near(seat.x, seat.y, 56)) {
              walkAndDo(seat.ax, seat.ay, () => {
                playerPose = 'sitting';
                poseAnchorX = seat.ax;
                poseAnchorY = seat.ay;
                poseObjectName = seat.label;
                actionHoldUntil = performance.now() + 5000;
                audioEngine.playAncientRune();
                onUpdateStatsRef.current({ mana: Math.min(stats.maxMana, stats.mana + 25) });
                spawnBurst(seat.ax, seat.ay - 16, '#38bdf8', 10, `Sitting at ${seat.label} (+25 Mana)`);
                setPromptMessage(`Relaxing at ${seat.label} (for at least 5s)!`);
              });
              return;
            }
          }

          // Sky-Blue Bathtub in Bathroom 2 (408, 444)
          if (near(408, 444, 56)) {
            walkAndDo(376, 444, () => {
              audioEngine.playWaterBlast();
              onUpdateStatsRef.current({
                hp: Math.min(stats.maxHp, stats.hp + 25),
                mana: Math.min(stats.maxMana, stats.mana + 25)
              });
              spawnBurst(408, 444, '#38bdf8', 16, 'Warm Relaxing Bath! 🛁 +25 HP/Mana');
              setPromptMessage('Freshened up by the sky-blue bathtub (+25 HP & +25 Mana)!');
            });
            return;
          }

          // Nightstands & End-Table Lamps
          for (const lmp of [
            { x: 126, y: 472, name: 'Bedroom 2 Left Lamp' },
            { x: 246, y: 472, name: 'Bedroom 2 Right Lamp' },
            { x: 512, y: 476, name: 'Sofa Left End Lamp' },
            { x: 640, y: 476, name: 'Sofa Right End Lamp' }
          ]) {
            if (near(lmp.x, lmp.y, 44)) {
              walkAndDo(lmp.x, lmp.y - 22, () => {
                floorLampOn = !floorLampOn;
                nightstandLampOn = floorLampOn;
                audioEngine.playAncientRune();
                spawnBurst(lmp.x, lmp.y - 12, floorLampOn ? '#fde047' : '#64748b', 10, floorLampOn ? 'Lamps ON 💡' : 'Lamps OFF');
                setPromptMessage(`${lmp.name} & accent lamps turned ${floorLampOn ? 'ON' : 'OFF'}!`);
              });
              return;
            }
          }

          // Potted Plants in Apartment Corners (Bedroom 1, Bedroom 2, Living Room)
          for (const pl of [
            { x: 136, y: 98, name: 'Bedroom 1 Plant' },
            { x: 120, y: 282, name: 'Bedroom 2 Plant' },
            { x: 662, y: 478, name: 'Balcony Corner Plant' }
          ]) {
            if (near(pl.x, pl.y, 50)) {
              walkAndDo(Math.max(106, pl.x - 24), pl.y + 8, () => {
                facingDir = 1;
                if (plantWaterLevel >= 3 && (plantHasFruit || plantHasFlowers)) {
                  if (actionType === 'primary' && plantHasFruit) {
                    plantHasFruit = false;
                    plantEatUntil = performance.now() + 5000;
                    actionHoldUntil = performance.now() + 5000;
                    audioEngine.playGestureSuccess();
                    onUpdateStatsRef.current({
                      hp: Math.min(stats.maxHp, stats.hp + 50),
                      hunger: Math.min(stats.maxHunger ?? 100, (stats.hunger ?? 65) + 15)
                    });
                    spawnBurst(pl.x, pl.y - 14, '#f43f5e', 16, 'Ate Sweet Fruit! 🍓 +50 HP / +15 Hunger');
                    if (!plantHasFruit && !plantHasFlowers) plantWaterLevel = 1;
                    return;
                  }
                  if ((actionType === 'secondary' || !plantHasFruit) && plantHasFlowers) {
                    plantHasFlowers = false;
                    plantSmellUntil = performance.now() + 5000;
                    actionHoldUntil = performance.now() + 5000;
                    audioEngine.playAncientRune();
                    onUpdateStatsRef.current({ mana: Math.min(stats.maxMana, stats.mana + 50) });
                    spawnBurst(pl.x, pl.y - 14, '#f472b6', 16, 'Smelled Blossoms! 🌸 +50 Mana');
                    if (!plantHasFruit && !plantHasFlowers) plantWaterLevel = 1;
                    return;
                  }
                }
                playerPose = 'watering_plant';
                poseAnchorX = Math.max(106, pl.x - 24);
                poseAnchorY = pl.y + 8;
                plantPoseX = pl.x;
                plantPoseY = pl.y;
                wateringCanTimer = 300;
                actionHoldUntil = performance.now() + 5000;
                plantWaterLevel = Math.min(3, plantWaterLevel + 1);
                if (plantWaterLevel >= 3) {
                  plantHasFruit = true;
                  plantHasFlowers = true;
                }
                audioEngine.playWaterBlast();
                spawnBurst(pl.x, pl.y - 12, '#38bdf8', 14, `Watering ${pl.name} (${plantWaterLevel}/3) 💧`);
              });
              return;
            }
          }

          return;
        }

        if (near(400, 480, 58)) {
          resetPose();
          return travelToZone('town_square', 180, 210);
        }

        // Wall Light Switch near top center (395, 118)
        if (near(395, 118, 52)) {
          walkAndDo(395, 134, () => {
            roomLightsOn = !roomLightsOn;
            audioEngine.playAncientRune();
            spawnBurst(395, 118, roomLightsOn ? '#fde047' : '#64748b', 10, roomLightsOn ? 'Switch ON 💡' : 'Switch OFF 🌙');
            setPromptMessage(roomLightsOn ? 'Wall Switch: House Lights ON!' : 'Wall Switch: House Lights OFF — Room dimmed!');
          });
          return;
        }

        // Check placed furniture items first!
        for (const item of stats.houseConfig.furniture) {
          if (!item.placed) continue;
          if (near(item.x, item.y, 64)) {
            if (item.type === 'fridge') {
              walkAndDo(item.x, item.y + 38, () => {
                audioEngine.playAncientRune();
                spawnBurst(item.x, item.y - 12, '#38bdf8', 12, 'Opened Fridge 🧊');
                setPromptMessage(`Opened ${item.name} — eat groceries bought from Superstore to boost Hunger!`);
                setShowFridgeModal(true);
              });
              return;
            }

            if (item.type === 'sofa' || item.type === 'beanbag') {
              walkAndDo(item.x, item.y - 2, () => {
                playerPose = 'sitting';
                poseAnchorX = item.x;
                poseAnchorY = item.y - 2;
                poseObjectName = item.name;
                actionHoldUntil = performance.now() + 5000;
                audioEngine.playAncientRune();
                onUpdateStatsRef.current({ mana: Math.min(stats.maxMana, stats.mana + 25) });
                spawnBurst(item.x, item.y - 16, '#c084fc', 10, `Sitting on ${item.name} (+25 Mana)`);
                setPromptMessage(`Sitting comfortably on ${item.name} (for at least 5s)!`);
              });
              return;
            }

            if (item.type === 'bed') {
              walkAndDo(item.x + 2, item.y - 2, () => {
                if (actionType === 'secondary') {
                  // [F] Deep Sleep in Bed -> 2 second full black screen, then wake up off the bed & announce!
                  playerPose = 'sleeping';
                  poseAnchorX = item.x + 2;
                  poseAnchorY = item.y - 2;
                  poseObjectName = item.name;
                  sleepBlackoutUntil = performance.now() + 2000;
                  sleepWakeX = item.x;
                  sleepWakeY = Math.min(480, item.y + 54);
                  audioEngine.playGestureSuccess();
                  onUpdateStatsRef.current({ hp: stats.maxHp, mana: stats.maxMana });
                  setPromptMessage('Sleeping...');
                } else {
                  // [E] Lie down & Rest on Bed (character stays on bed rotated 90° left for at least 5s!)
                  playerPose = 'resting';
                  poseAnchorX = item.x + 2;
                  poseAnchorY = item.y - 2;
                  poseObjectName = item.name;
                  actionHoldUntil = performance.now() + 5000;
                  audioEngine.playAncientRune();
                  onUpdateStatsRef.current({
                    hp: Math.min(stats.maxHp, stats.hp + 40),
                    mana: Math.min(stats.maxMana, stats.mana + 40)
                  });
                  spawnBurst(item.x, item.y - 18, '#a78bfa', 10, 'Resting (+40 HP/Mana)');
                  setPromptMessage(`Resting on ${item.name} (for at least 5s). Press [F] to Sleep anytime!`);
                }
              });
              return;
            }

            if (item.type === 'floor_lamp') {
              walkAndDo(item.x, item.y + 24, () => {
                floorLampOn = !floorLampOn;
                audioEngine.playAncientRune();
                spawnBurst(item.x, item.y - 14, floorLampOn ? '#fde047' : '#64748b', 10, floorLampOn ? 'Lamp ON 💡' : 'Lamp OFF');
                setPromptMessage(`${item.name} turned ${floorLampOn ? 'ON' : 'OFF'}!`);
              });
              return;
            }

            if (item.type === 'nightstand') {
              walkAndDo(item.x, item.y + 24, () => {
                nightstandLampOn = !nightstandLampOn;
                audioEngine.playAncientRune();
                spawnBurst(item.x, item.y - 14, nightstandLampOn ? '#facc15' : '#64748b', 10, nightstandLampOn ? 'Bedside Lamp ON 💡' : 'Bedside Lamp OFF');
                setPromptMessage(`${item.name} turned ${nightstandLampOn ? 'ON' : 'OFF'}!`);
              });
              return;
            }

            if (item.type === 'fireplace') {
              walkAndDo(item.x, item.y + 34, () => {
                if (actionType === 'primary' && !q.hiddenSpotsFound.includes('spot_house_chimney')) {
                  claimHiddenSpot(
                    'spot_house_chimney',
                    'Mantel Chimney Relic',
                    'Inside the warm stone hearth mantel you uncovered an ember-forged sigil! (+1 Hidden Power & +140 AP)',
                    undefined,
                    0,
                    140
                  );
                }
                hearthLit = !hearthLit;
                audioEngine.playAncientRune();
                spawnBurst(item.x, item.y, hearthLit ? '#f97316' : '#64748b', 12, hearthLit ? 'Hearth Stoked 🔥' : 'Fire Banked');
                setPromptMessage(`${item.name} fire ${hearthLit ? 'stoked warmly 🔥' : 'extinguished'}.`);
              });
              return;
            }

            if (item.type === 'plant') {
              walkAndDo(item.x - 30, item.y + 4, () => {
                facingDir = 1;
                // If fully grown, eat ripe fruit [E] or smell blossoms [F]!
                if (plantWaterLevel >= 3 && (plantHasFruit || plantHasFlowers)) {
                  if (actionType === 'primary' && plantHasFruit) {
                    plantHasFruit = false;
                    plantEatUntil = performance.now() + 5000;
                    actionHoldUntil = performance.now() + 5000;
                    audioEngine.playGestureSuccess();
                    onUpdateStatsRef.current({
                      hp: Math.min(stats.maxHp, stats.hp + 50),
                      hunger: Math.min(stats.maxHunger ?? 100, (stats.hunger ?? 65) + 15),
                      upgrades: { ...stats.upgrades, arcanePoints: stats.upgrades.arcanePoints + 25 }
                    });
                    spawnBurst(item.x, item.y - 14, '#f43f5e', 16, 'Ate Sweet Fruit! 🍓 +50 HP / +15 Hunger');
                    setPromptMessage(
                      plantHasFlowers
                        ? 'She ate the sweet Sunberry fruit! (+50 HP, +15 Hunger, +25 AP) · Press [F] to smell the flowers!'
                        : 'She ate the sweet Sunberry fruit! (+50 HP, +15 Hunger, +25 AP) · Water again to regrow!'
                    );
                    if (!plantHasFruit && !plantHasFlowers) plantWaterLevel = 1;
                    return;
                  }
                  if ((actionType === 'secondary' || !plantHasFruit) && plantHasFlowers) {
                    plantHasFlowers = false;
                    plantSmellUntil = performance.now() + 5000;
                    actionHoldUntil = performance.now() + 5000;
                    audioEngine.playAncientRune();
                    onUpdateStatsRef.current({
                      mana: Math.min(stats.maxMana, stats.mana + 50),
                      upgrades: { ...stats.upgrades, arcanePoints: stats.upgrades.arcanePoints + 25 }
                    });
                    spawnBurst(item.x, item.y - 16, '#f472b6', 16, 'Smelled Blossoms! 🌸 +50 Mana');
                    setPromptMessage(
                      plantHasFruit
                        ? 'She leaned in to smell the fragrant flowers! (+50 Mana, +25 AP) · Press [E] to eat the fruit!'
                        : 'She smelled the fragrant flowers! (+50 Mana, +25 AP) · Water again to regrow!'
                    );
                    if (!plantHasFruit && !plantHasFlowers) plantWaterLevel = 1;
                    return;
                  }
                }

                // Otherwise hold watering can & lean 12° toward plant while pouring falling water for 5 seconds!
                playerPose = 'watering_plant';
                poseAnchorX = item.x - 30;
                poseAnchorY = item.y + 4;
                plantPoseX = item.x;
                plantPoseY = item.y;
                facingDir = 1;
                wateringCanTimer = 300;
                actionHoldUntil = performance.now() + 5000;
                plantWaterLevel = Math.min(3, plantWaterLevel + 1);
                if (plantWaterLevel >= 3) {
                  plantHasFruit = true;
                  plantHasFlowers = true;
                }
                audioEngine.playWaterBlast();
                spawnBurst(
                  item.x,
                  item.y - 12,
                  '#38bdf8',
                  16,
                  plantWaterLevel >= 3 ? 'Fruit & Flowers Grown! 🍓🌸' : `Watering... (${plantWaterLevel}/3) 💧`
                );
                onUpdateStatsRef.current({
                  upgrades: { ...stats.upgrades, arcanePoints: stats.upgrades.arcanePoints + (plantWaterLevel >= 3 ? 30 : 10) }
                });
                setPromptMessage(
                  plantWaterLevel >= 3
                    ? `${item.name} grew ripe Sunberry fruit & fragrant blossoms! Watering 5s...`
                    : `She is watering ${item.name} with the watering can for 5s! 💧 (Growth ${plantWaterLevel}/3)`
                );
              });
              return;
            }

            if (item.type === 'arcade') {
              setActiveMinigame({
                type: 'rpg_house_arcade',
                title: 'My House · Pixel Mana Blaster Arcade',
                onWin: () => {
                  setActiveMinigame(null);
                  claimHiddenSpot(
                    'spot_house_arcade',
                    'Arcade High-Score Cartridge',
                    'You beat all 12 invaders on the Pixel Arcade Cabinet and unlocked the hidden Cartridge Power! (+1 Hidden Power, +140 AP)'
                  );
                }
              });
              return;
            }

            if (item.type === 'bookshelf') {
              walkAndDo(item.x, item.y + 38, () => {
                audioEngine.playAncientRune();
                if (!q.hiddenSpotsFound.includes('spot_house_floor')) {
                  claimHiddenSpot(
                    'spot_house_floor',
                    'Loose Oak Floorboard Cache',
                    'Behind your Arcane Oak Bookshelf you pried up a glowing rune board! (+1 Hidden Power, +1 Key, +140 AP)',
                    undefined,
                    1,
                    140
                  );
                }
                spawnBurst(item.x, item.y - 12, '#fbbf24', 12, 'Opened Spellbook 📖');
                setPromptMessage(`${heroName} opened a book from the Arcane Oak Bookshelf — view Hand Movements & Power Hints!`);
                setShowBookshelfBook(true);
              });
              return;
            }

            if (item.type === 'table') {
              walkAndDo(item.x, item.y + 8, () => {
                playerPose = 'sitting';
                poseAnchorX = item.x;
                poseAnchorY = item.y + 8;
                poseObjectName = item.name;
                actionHoldUntil = performance.now() + 5000;
                audioEngine.playGestureSuccess();
                onUpdateStatsRef.current({
                  hp: Math.min(stats.maxHp, stats.hp + 20),
                  mana: Math.min(stats.maxMana, stats.mana + 20)
                });
                spawnBurst(item.x, item.y - 10, '#facc15', 10, 'Sipped Honey Tea (+20 HP/Mana)');
                setPromptMessage(`Seated at ${item.name} sipping warm honey tea (for at least 5s)!`);
              });
              return;
            }

            if (item.type === 'trophy') {
              audioEngine.playArmorUpgrade();
              spawnBurst(item.x, item.y - 12, '#fde047', 14, 'Polished Trophies ✨');
              setActiveDialogue({
                speaker: `${heroName}'s Trophy Pedestal`,
                text: `${heroName}'s Feats: ${stats.arenaPowersCount || 0}/20 Arena Powers · ${q.hiddenSpotsFound.length}/20 Hidden Roleplay Powers · ${stats.gemsCollected || 0} Cavern Gems Mined!`,
                avatarColor: '#eab308'
              });
              return;
            }

            if (item.type === 'rug') {
              audioEngine.playAncientRune();
              spawnBurst(item.x, item.y, '#4d9b85', 8, 'Cozy Sage Rug');
              setPromptMessage('Standing on your woven Sage Stripe Rug — soft underfoot!');
              return;
            }
          }
        }
      }

      // ==================== PLAYGROUND (ACTUAL SLIDE, SWINGS, MERRY-GO-ROUND + MINIGAME) ====================
      else if (q.currentZone === 'playground') {
        const pgNpcs = getPlaygroundNPCPositions(currentFrameCount);
        if (near(pgNpcs.toby.x, pgNpcs.toby.y, 56)) {
          audioEngine.playAncientRune();
          setActiveDialogue({
            speaker: 'Toby · Playground Kid',
            text: `Hi ${heroName}! Watch how high I can pump on the swings! After that, let’s build the biggest sandcastle in the golden sandbox!`,
            avatarColor: '#38bdf8'
          });
          return;
        }
        if (near(pgNpcs.maya.x, pgNpcs.maya.y, 56)) {
          audioEngine.playAncientRune();
          setActiveDialogue({
            speaker: 'Maya · Playground Kid',
            text: `Wheee, ${heroName}! The Comet Slide makes you tilt way to the side all the way down—it’s my favorite ride in town!`,
            avatarColor: '#f472b6'
          });
          return;
        }
        if (near(400, 495, 58)) {
          resetPose();
          return travelToZone('town_square', 620, 210);
        }

        // Swings (210, 175): [E] Swing! | [F] Secret Nest
        if (near(210, 175, 65)) {
          if (actionType === 'secondary') {
            return claimHiddenSpot(
              'spot_playground_swing',
              'Sycamore Swing Canopy Nest',
              'High atop the golden swing beam sparkled a Wind Fairy Crest! (+1 Hidden Power & +130 AP)',
              undefined,
              0,
              130
            );
          }
          walkAndDo(190, 185, () => {
            playerPose = 'swinging_playground';
            poseAnchorX = 210;
            poseAnchorY = 185;
            actionHoldUntil = performance.now() + 5000;
            audioEngine.playAncientRune();
            spawnBurst(210, 175, '#facc15', 10, 'Swinging! (5s min)');
            setPromptMessage('Swinging high in the breeze (for at least 5s)! Press [F] for canopy nest.');
          });
          return;
        }

        // Golden Sandbox (205, 405)
        if (near(205, 405, 66)) {
          spawnBurst(205, 405, '#fbbf24', 18, 'Dug Sandbox!');
          return claimHiddenSpot(
            'spot_playground_sandbox',
            'Buried Sandbox Relic',
            'Digging beneath the golden sandbox castle uncovered a Spark Relic & Portal Key! (+1 Hidden Power, +1 Key, +150 AP)',
            undefined,
            1,
            150
          );
        }

        // Comet Slide (590, 195): [E] Slide Down! | [F] Play Star Catcher Minigame!
        if (near(590, 195, 72)) {
          if (actionType === 'secondary') {
            setActiveMinigame({
              type: 'rpg_playground_catch',
              title: 'Sunbeam Playground · Comet Star Catcher',
              onWin: () => {
                setActiveMinigame(null);
                claimHiddenSpot(
                  'spot_playground_stars',
                  'Comet Starlight Ribbon',
                  'Caught 10 falling Comet Stars cleanly! (+1 Hidden Power & +140 AP)'
                );
              }
            });
          } else {
            playerPose = 'sliding';
            poseTimer = 50;
            playerX = 562;
            playerY = 152;
            audioEngine.playRealmWarp();
            spawnBurst(570, 160, '#38bdf8', 16, 'Wheee! Sliding Down!');
            setPromptMessage('Sliding down the Comet Slide! Press [F] next to the slide to play Comet Star Catcher!');
          }
          return;
        }

        // Merry-Go-Round (400, 220): [E] Spin! | [F] Play Star Catcher Minigame!
        if (near(400, 220, 66)) {
          if (actionType === 'secondary') {
            setActiveMinigame({
              type: 'rpg_playground_catch',
              title: 'Sunbeam Playground · Comet Star Catcher',
              onWin: () => {
                setActiveMinigame(null);
                claimHiddenSpot(
                  'spot_playground_stars',
                  'Comet Starlight Ribbon',
                  'Caught 10 falling Comet Stars cleanly! (+1 Hidden Power & +140 AP)'
                );
              }
            });
          } else {
            walkAndDo(428, 220, () => {
              playerPose = 'spinning_merry';
              poseAnchorX = 400;
              poseAnchorY = 220;
              actionHoldUntil = performance.now() + 5000;
              audioEngine.playAncientRune();
              spawnBurst(400, 220, '#34d399', 12, 'Spinning! (5s min)');
              setPromptMessage('Spinning on the Merry-Go-Round (for at least 5s)! Press [F] for Star Catcher Minigame.');
            });
          }
          return;
        }
      }

      // ==================== HOSPITAL ====================
      else if (q.currentZone === 'hospital') {
        const hospNpcs = getHospitalNPCPositions(currentFrameCount);
        if (near(400, 495, 58)) return travelToZone('town_square', 190, 350);
        if (near(hospNpcs.eli.x, hospNpcs.eli.y, 56)) {
          audioEngine.playAncientRune();
          setActiveDialogue({
            speaker: 'Medic Eli · Ward Chemist',
            text: `Hey ${heroName}! I’m restocking bandages and herbal tea between Ward A and the Alchemy Lab today.`,
            avatarColor: '#38bdf8'
          });
          return;
        }
        if (near(400, 175, 65)) {
          audioEngine.playGestureSuccess();
          onUpdateStatsRef.current({ hp: stats.maxHp, mana: stats.maxMana });
          setActiveDialogue({
            speaker: 'Nurse Clara · Chief Healer',
            text: `All patched up and rested, ${heroName}! Your HP and Mana are back at 100%. Take good care of yourself out there!`,
            avatarColor: '#38bdf8'
          });
          return;
        }
        if (near(610, 165, 62)) {
          return claimHiddenSpot(
            'spot_hospital_curtain',
            'Secret Elixir Vial (Ward B)',
            'Behind the drawn hospital curtain hummed a Hydro-Infusion Tonic! Unlocked Tidal Hydro Cannon (if locked), +1 Hidden Power, +150 AP!',
            'water_blast',
            0,
            150
          );
        }
        if (near(185, 165, 62)) {
          return claimHiddenSpot(
            'spot_hospital_cabinet',
            'Apothecary Medicine Vault',
            'Inside the locked glass cabinet rested an Aegis Tincture! (+1 Hidden Power & +140 AP)',
            undefined,
            0,
            140
          );
        }
        if (near(220, 345, 68)) {
          setActiveMinigame({
            type: 'rpg_hospital_potion',
            title: 'St. Aether Hospital · Arcane Elixir Mixing Lab',
            onWin: () => {
              setActiveMinigame(null);
              claimHiddenSpot(
                'spot_hospital_lab',
                'Chief Healer Elixir Seal',
                'Compounded all 3 patient prescriptions flawlessly! (+1 Hidden Power & +160 AP)'
              );
            }
          });
          return;
        }
      }

      // ==================== SUPERSTORE ====================
      else if (q.currentZone === 'superstore') {
        const storeNpcs = getSuperstoreNPCPositions(currentFrameCount);
        if (near(storeNpcs.nia.x, storeNpcs.nia.y, 54)) {
          audioEngine.playAncientRune();
          setActiveDialogue({
            speaker: 'Shopper Nia · Regular Customer',
            text: `Hey ${heroName}! Don’t forget to grab a red-handled Shopping Cart outside the store first—those SAVE 10% Blue Cookies and Fresh Salmon trays are selling out fast!`,
            avatarColor: '#c084fc'
          });
          return;
        }
        if (near(400, 495, 58)) return travelToZone('town_square', 610, 350);

        // Red Checkout Counter #1 (240, 148): [E] Checkout Cart (if items in cart) or Open AP Shop | [F] Open AP Shop
        if (near(240, 148, 66)) {
          if (actionType === 'primary' && cartItems.length > 0) {
            const rawCost = cartItems.reduce((sum, it) => sum + it.costAP, 0);
            const discountCost = Math.round(rawCost * 0.9);
            if (stats.upgrades.arcanePoints < discountCost) {
              audioEngine.playGestureBlocked();
              setPromptMessage(`Cart total is ${discountCost} AP (10% OFF), you have ${stats.upgrades.arcanePoints} AP! Earn more AP or keep browsing.`);
              return;
            }
            const purchasedNames = cartItems.map((c) => c.name).join(', ');
            const count = cartItems.length;
            const bonusAPReward = count >= 3 ? 45 : 15;
            const existingFridge: FridgeFoodItem[] = [...(stats.fridgeFood || [])];
            cartItems.forEach((bought) => {
              const foundIdx = existingFridge.findIndex((f) => f.id === bought.id);
              if (foundIdx >= 0) {
                existingFridge[foundIdx] = {
                  ...existingFridge[foundIdx],
                  quantity: existingFridge[foundIdx].quantity + 1
                };
              } else {
                existingFridge.push({
                  id: bought.id,
                  name: bought.name,
                  kind: bought.kind,
                  color: bought.color,
                  accentColor: bought.accentColor,
                  hungerRestore: bought.hungerRestore,
                  hpRestore: bought.hpRestore,
                  quantity: 1
                });
              }
            });
            cartItems = [];
            audioEngine.playLevelUp();
            onUpdateStatsRef.current({
              hp: stats.maxHp,
              mana: stats.maxMana,
              fridgeFood: existingFridge,
              upgrades: {
                ...stats.upgrades,
                arcanePoints: stats.upgrades.arcanePoints - discountCost + bonusAPReward
              }
            });
            spawnBurst(240, 148, '#22c55e', 18, `Stocked ${count} Food Items in Fridge! 🧊`);
            setActiveDialogue({
              speaker: 'Superstore Checkout Receipt (SAVE 10%)',
              text: `${heroName} purchased ${count} item(s): ${purchasedNames}! Paid ${discountCost} AP (10% Store Discount), earned +${bonusAPReward} Loyalty AP, and stocked everything in your Home Fridge — open the Fridge in My House [E] to eat and increase Hunger!`,
              avatarColor: '#22c55e'
            });
            setPromptMessage(`Checked out ${count} food item(s)! Delivered to your Fridge inside My House!`);
            return;
          }
          setShowSuperstore(true);
          return;
        }

        // Red Checkout / Counter #2 (420, 148): [E] Shelf Memory Rush Minigame
        if (near(420, 148, 66)) {
          setActiveMinigame({
            type: 'rpg_superstore_rush',
            title: 'Grand Superstore · Enchanted Shelf Memory Rush',
            onWin: () => {
              setActiveMinigame(null);
              claimHiddenSpot(
                'spot_superstore_memory',
                'Master Inventory Crest',
                'Matched all 6 Superstore artifact shelves! (+1 Hidden Power & +150 AP)'
              );
            }
          });
          return;
        }

        // Stockroom Crates Secret (630, 132)
        if (near(630, 132, 54)) {
          return claimHiddenSpot(
            'spot_superstore_crates',
            'Stockroom Arcane Stash',
            'Behind dusty stockroom crates sparkled an Overcharged Capacitor & Portal Key! Unlocked Thunder Bolt Point (if locked), +1 Hidden Power, +1 Key, +180 AP!',
            'lightning',
            1,
            180
          );
        }

        // Frozen Island Freezer Secret (625, 452)
        if (near(625, 452, 54)) {
          return claimHiddenSpot(
            'spot_superstore_freezer',
            'Frozen Aisle Frost Core',
            'Chilled inside the glowing ice-cream freezer sat a Permafrost Orb! (+1 Hidden Power & +140 AP)',
            undefined,
            0,
            140
          );
        }

        // Interactive Supermarket Shelf Items: Reach up & put into Shopping Cart!
        let pickedShelfItem: SuperstoreShelfItem | null = null;
        let bestDist = 48;
        for (const shelfItem of SUPERSTORE_SHELF_ITEMS) {
          const d = Math.hypot(playerX - shelfItem.x, playerY - shelfItem.y);
          if (d < bestDist) {
            bestDist = d;
            pickedShelfItem = shelfItem;
          }
        }
        if (pickedShelfItem) {
          if (!hasShoppingCart) {
            audioEngine.playGestureBlocked();
            spawnBurst(playerX, playerY - 22, '#f87171', 10, 'Need Shopping Cart Outside! 🛒');
            setPromptMessage('You need a Shopping Cart first! Exit to Town Square and grab one from the Cart Corral outside the door!');
            return;
          }
          if (shoppingReachTimer > 0) {
            return;
          }
          if (cartItems.length >= 12) {
            audioEngine.playGestureBlocked();
            setPromptMessage('Your Shopping Cart is full (12/12)! Head to the Red Checkout Counter [E] at the front!');
            return;
          }
          facingDir = pickedShelfItem.x >= playerX ? 1 : -1;
          shoppingReachItem = pickedShelfItem;
          shoppingReachTargetX = pickedShelfItem.x;
          shoppingReachTargetY = pickedShelfItem.y;
          shoppingReachTimer = 44;
          audioEngine.playAncientRune();
          setPromptMessage(`Reaching up to grab ${pickedShelfItem.name} (${pickedShelfItem.costAP} AP)...`);
          return;
        }
      }

      // ==================== EMERALD HILLS (PICKAXE & UNDERGROUND TUNNEL!) ====================
      else if (q.currentZone === 'hills') {
        const hillsNpcs = getHillsNPCPositions(currentFrameCount);
        if (near(hillsNpcs.rowan.x, hillsNpcs.rowan.y, 56)) {
          audioEngine.playAncientRune();
          setActiveDialogue({
            speaker: 'Ranger Rowan · Hills Warden',
            text: `Safe trails, ${heroName}! The mountain pass North gets icy fast, and there’s a sturdy Runic Pickaxe on the rack if you need to clear fallen boulders.`,
            avatarColor: '#22c55e'
          });
          return;
        }
        if (near(hillsNpcs.vespera.x, hillsNpcs.vespera.y, 56)) {
          audioEngine.playAncientRune();
          setActiveDialogue({
            speaker: 'Ancient Sorceress Vespera · Grove Mystic (2/3)',
            text: `Welcome to the Emerald Ridge, ${heroName}. Only three Ancient Sorcerers remain in Aetheria—listen well to the secrets of stone and vine.`,
            avatarColor: '#10b981',
            powerHint: !q.hiddenSpotsFound.includes('spot_hills_hollow')
              ? 'Sorceress’s Vision: Inspect the mossy Hollow Oak Tree on the eastern ridge for Cryo Blizzard Nova, step into the Standing Rune Stones, and shatter the cracked hillside boulder twice with the Pickaxe to mine crystals underground!'
              : 'Forbidden Path: Walk West from Emerald Hills into the Ancient Mossy Catacombs and clear all three Sanguine Chambers to awaken Blood Bending!',
            extraHint: 'Ancient Hand Movement: Point 1 Index Finger for Thunder Bolt, raise Peace V-Sign (Index + Middle) for Cryo Blizzard, or curve BOTH hands downward like Puppeteer Claws to bend monsters!'
          });
          return;
        }
        if (near(400, 505, 58)) return travelToZone('town_square', 400, 150);
        if (near(400, 95, 58)) {
          return travelToZone(
            'mountains',
            400,
            465,
            'Frostpeak Mountains · Equip Hiking Gear [E] at Basecamp, climb the Ice Cliff, & speak to Captain Zephyr!'
          );
        }
        if (near(135, 290, 62)) {
          return travelToZone('catacombs', 400, 465, 'Entered Ancient Mossy Catacombs · Step into Blood Chamber I to begin!');
        }

        // Miner's Pickaxe Rack (495, 285)
        if (near(495, 285, 60)) {
          if (!stats.hasPickaxe) {
            audioEngine.playArmorUpgrade();
            onUpdateStatsRef.current({ hasPickaxe: true });
            spawnBurst(495, 285, '#38bdf8', 14, 'Equipped Runic Pickaxe! ⛏');
            setPromptMessage('Equipped Runic Pickaxe! Walk right to the Cracked Hillside Boulder [E] to dig underground!');
          } else {
            pickaxeSwingTimer = 18;
            audioEngine.playShieldBreak();
            spawnBurst(495, 285, '#94a3b8', 8, 'Pickaxe Ready ⛏');
          }
          return;
        }

        // Cracked Hillside Boulder Seam -> Underground Cavern Tunnel (620, 315)
        if (near(620, 315, 66)) {
          if (!stats.hasPickaxe) {
            audioEngine.playGestureBlocked();
            setPromptMessage('Solid cracked boulder blocks the underground tunnel! Grab the Runic Pickaxe [E] at the Miner Shed nearby.');
            return;
          }
          if (!mineEntranceOpen) {
            pickaxeSwingTimer = 20;
            boulderDamage++;
            audioEngine.playShieldBreak();
            spawnBurst(620, 315, '#94a3b8', 18, boulderDamage >= 2 ? 'TUNNEL OPENED! ⛏' : 'CRACK! Hit [E] again!');
            if (boulderDamage >= 2) {
              mineEntranceOpen = true;
              setPromptMessage('★ Broke through the hillside! Press [E] to descend into the Underground Crystal Cavern!');
            } else {
              setPromptMessage('Swung Pickaxe at the cracked boulder! Press [E] once more to shatter into the underground!');
            }
            return;
          } else {
            return travelToZone(
              'underground_mine',
              400,
              445,
              'Underground Crystal Cavern · Swing Pickaxe [E] at glowing gem veins, or [E] at the Deep Geode Vault!'
            );
          }
        }

        if (near(620, 195, 62)) {
          return claimHiddenSpot(
            'spot_hills_hollow',
            'Mossy Hollow Tree Stash',
            'Inside an ancient mossy oak hollow shines a Frost Shard! Unlocked Cryo Blizzard Nova (if locked), +1 Hidden Power, +170 AP!',
            'frost_nova',
            0,
            170
          );
        }
        if (near(220, 145, 62)) {
          return claimHiddenSpot(
            'spot_hills_stones',
            'Ancient Standing-Stone Ring',
            'A druidic rune surged beneath the sunlit standing stones! (+1 Hidden Power & +150 AP)',
            undefined,
            0,
            150
          );
        }
        if (near(580, 405, 68)) {
          setActiveMinigame({
            type: 'rpg_hills_fireflies',
            title: 'Emerald Hills · Twilight Firefly Gathering',
            onWin: () => {
              setActiveMinigame(null);
              claimHiddenSpot(
                'spot_hills_fireflies',
                'Luminous Firefly Jar',
                'Gathered 10 glowing twilight fireflies in the meadow! (+1 Hidden Power & +160 AP)'
              );
            }
          });
          return;
        }
      }

      // ==================== UNDERGROUND CRYSTAL CAVERN (PICKAXE GEM MINING + GEODE MINIGAME!) ====================
      else if (q.currentZone === 'underground_mine') {
        if (near(400, 495, 58)) {
          return travelToZone('hills', 585, 315, 'Climbed back up to Emerald Hills!');
        }

        // Deep Geode Vault Altar -> Excavation Minigame (400, 165)
        if (near(400, 165, 70)) {
          setActiveMinigame({
            type: 'rpg_underground_mine',
            title: 'Underground Cavern · Deep Crystal Geode Excavation',
            onWin: () => {
              setActiveMinigame(null);
              const cur = playerStatsRef.current;
              onUpdateStatsRef.current({
                gemsCollected: (cur.gemsCollected || 0) + 3,
                arenaPowersCount: (cur.arenaPowersCount || 0) + 2,
                portalKeys: (cur.portalKeys || 0) + 1
              });
              claimHiddenSpot(
                'spot_underground_geode',
                'Subterranean Geode Sovereign Core',
                'Unearthed all 5 Deep Cavern Gems & Power Cores! Earned +3 Gems, +2 Arena Powers, +1 Portal Key, +1 Hidden Power & +200 AP!',
                undefined,
                0,
                200
              );
            }
          });
          return;
        }

        // Mine any sparkling Crystal / Gem Vein with Pickaxe!
        for (const vein of mineVeins) {
          if (vein.respawnTimer > 0) continue;
          if (near(vein.x, vein.y, 60)) {
            pickaxeSwingTimer = 20;
            vein.hp -= 1;
            audioEngine.playShieldBreak();
            if (vein.hp <= 0) {
              vein.respawnTimer = 950; // ~16 seconds
              const newGems = (stats.gemsCollected || 0) + 1;
              if (vein.kind === 'power_crystal') {
                onUpdateStatsRef.current({
                  gemsCollected: newGems,
                  arenaPowersCount: (stats.arenaPowersCount || 0) + 1,
                  upgrades: { ...stats.upgrades, arcanePoints: stats.upgrades.arcanePoints + vein.apReward }
                });
                spawnBurst(vein.x, vein.y, vein.color, 22, `+1 Gem & +1 Arena Power! 💎⚡`);
                if (!q.hiddenSpotsFound.includes('spot_underground_relic')) {
                  claimHiddenSpot(
                    'spot_underground_relic',
                    'Cavern Power Crystal Vein',
                    'Your Runic Pickaxe cracked open a pulsing Arcane Power Crystal vein! (+1 Hidden Power, +1 Arena Power, +1 Gem & +130 AP)',
                    undefined,
                    0,
                    130
                  );
                } else {
                  setPromptMessage(`Mined ${vein.label}! +1 Gem, +1 Arena Power & +${vein.apReward} AP!`);
                }
              } else {
                onUpdateStatsRef.current({
                  gemsCollected: newGems,
                  upgrades: { ...stats.upgrades, arcanePoints: stats.upgrades.arcanePoints + vein.apReward }
                });
                spawnBurst(vein.x, vein.y, vein.color, 18, `+1 ${vein.label} (+${vein.apReward} AP) 💎`);
                setPromptMessage(`Mined ${vein.label}! Total Gems: ${newGems} · +${vein.apReward} AP!`);
              }
            } else {
              spawnBurst(vein.x, vein.y, vein.color, 10, `Chipped ${vein.label} (${vein.hp} hit left)`);
              setPromptMessage(`Swung Pickaxe at ${vein.label}! Press [E] or [F] again to harvest.`);
            }
            return;
          }
        }

        // Swing Pickaxe in open air if pressing [F]
        if (actionType === 'secondary') {
          pickaxeSwingTimer = 18;
          audioEngine.playZombieHit();
          spawnBurst(playerX + facingDir * 24, playerY, '#94a3b8', 6);
          return;
        }
      }

      // ==================== FROSTPEAK MOUNTAINS (HIKING GEAR + CLIFF CLIMB + MINIGAME!) ====================
      else if (q.currentZone === 'mountains') {
        if (near(400, 505, 58)) {
          resetPose();
          return travelToZone('hills', 400, 140);
        }

        // Waterfall Cave Secret #1
        if (near(165, 175, 62)) {
          return claimHiddenSpot(
            'spot_mountains_alcove',
            'Glacial Cliff Cave Relic',
            'Inside the roaring waterfall cave glinted an Astral Key & Frost Rune! (+1 Hidden Power, +1 Portal Key, +200 AP)',
            undefined,
            1,
            200
          );
        }

        // Mountain Basecamp Hiking Equipment Rack (255, 415)
        if (near(255, 415, 64)) {
          audioEngine.playArmorUpgrade();
          onUpdateStatsRef.current({ hasHikingGear: true });
          spawnBurst(255, 415, '#38bdf8', 16, 'Equipped Hiking Equipment! 🧗⛏');
          setPromptMessage('Equipped Alpine Ice Axes, Crampons & Rope! Walk to the East Ice Cliff [E] to climb to the Summit!');
          return;
        }

        // Base of East Ice Cliff Wall (610, 325) -> Climb up the mountain face!
        if (near(610, 325, 65)) {
          if (!stats.hasHikingGear) {
            audioEngine.playGestureBlocked();
            setPromptMessage('Ice Cliff is too sheer without gear! Equip Hiking Equipment [E] at Basecamp Rack (bottom-left) first!');
            return;
          }
          playerPose = 'climbing_mountain';
          poseTimer = 55;
          playerX = 610;
          playerY = 325;
          audioEngine.playArmorUpgrade();
          spawnBurst(610, 320, '#bae6fd', 14, 'Climbing with Ice Axes! 🧗');
          setPromptMessage('Scaling the Frostpeak Ice Cliff with crampons & ice axes!');
          return;
        }

        // Summit Alpine Trail Beacon (610, 200): [E] / [F] Play Ice Climb Minigame!
        if (near(610, 200, 68)) {
          if (!stats.hasHikingGear) {
            audioEngine.playGestureBlocked();
            setPromptMessage('Equip Hiking Equipment [E] at Basecamp Rack (bottom-left) before tackling the Summit Trial!');
            return;
          }
          setActiveMinigame({
            type: 'rpg_mountains_climb',
            title: 'Frostpeak Mountains · Summit Ice-Ledge Ascent',
            onWin: () => {
              setActiveMinigame(null);
              claimHiddenSpot(
                'spot_mountains_climb',
                'Summit Alpine Beacon Crown',
                'Lit all 5 alpine summit beacons while dodging falling icicles! (+1 Hidden Power & +200 AP)'
              );
            }
          });
          return;
        }

        // Ancient Sorcerer Malakor (Frostpeak Archmage - 3rd of the 3 Hint-Giving Sorcerers)
        const mtNpcs = getMountainsNPCPositions(currentFrameCount);
        if (near(mtNpcs.malakor.x, mtNpcs.malakor.y, 58)) {
          audioEngine.playAncientRune();
          setActiveDialogue({
            speaker: 'Ancient Sorcerer Malakor · Frostpeak Archmage (3/3)',
            text: `Well met atop the frozen peaks, ${heroName}. I am the third and final Ancient Sorcerer watching over Aetheria’s lost arts.`,
            avatarColor: '#f43f5e',
            powerHint: 'Sorcerer’s Prophecy: Search behind the roaring glacial waterfall on the left cliff for a Portal Key, equip Hiking Gear at Basecamp (bottom-left) to scale the East Ice Cliff, and once you gather 20 Arena + 20 Hidden Powers, fly to the Sky Sanctum!',
            extraHint: 'Ancient Hand Movement: Clench Fist UP for Titan Aegis Shield, point Thumb strictly UP for Apex Meteor, or arch BOTH hands into soaring Beast Talons after conquering Sky Sanctum to summon Spectral Dire Wolves!'
          });
          return;
        }

        // Captain Zephyr NPC (Pilot only — no power/hand hints)
        if (near(485, 155, 62)) {
          const arenaPw = stats.arenaPowersCount || 0;
          const hiddenPw = q.hiddenSpotsFound.length;
          audioEngine.playAncientRune();
          setActiveDialogue({
            speaker: 'Sky Captain Zephyr · Frostpeak Pilot',
            text: `Clear skies today, ${heroName}! My Celestial Hot Air Balloon is fueled up and ready once the seal opens—currently reading ${arenaPw}/20 Arena Powers and ${hiddenPw}/20 Hidden Roleplay Powers.`,
            avatarColor: '#38bdf8'
          });
          return;
        }

        // Celestial Hot Air Balloon
        if (near(390, 140, 70)) {
          const arenaPw = stats.arenaPowersCount || 0;
          const hiddenPw = q.hiddenSpotsFound.length;
          if (arenaPw < 20 || hiddenPw < 20) {
            audioEngine.playShieldDeflect();
            setActiveDialogue({
              speaker: 'Celestial Hot Air Balloon · Sealed',
              text: `Hold on, ${heroName}! The Sky Burner requires 20 Acquired Powers from the Fighting Arena (${arenaPw}/20) AND 20 Hidden Powers from the Roleplay Area (${hiddenPw}/20)! Keep battling hordes and uncovering town/hill/underground secrets & minigames.`,
              avatarColor: '#d97706'
            });
          } else {
            audioEngine.playHotAirBalloonBurner();
            setQuestState((prev) => ({ ...prev, hotAirBalloonBoarded: true }));
            travelToZone('sky_sanctum', 400, 440, 'Ascended to Aetheria Sky Sanctum! Step into Sky Chamber I north.');
          }
          return;
        }
      }

      // ==================== CATACOMBS & BLOOD CHAMBERS ====================
      else if (q.currentZone === 'catacombs') {
        if (near(400, 515, 58)) return travelToZone('hills', 180, 290);
        if (near(400, 115, 62)) return travelToZone('blood_chamber_1', 400, 440, 'Sanguine Chamber I · Solve the Sanguine Conduit Puzzle!');
      } else if (q.currentZone === 'blood_chamber_1') {
        if (near(400, 495, 58)) return travelToZone('catacombs', 400, 160);
        if (near(400, 290, 65) && !q.bloodChamber1Cleared) {
          setActiveMinigame({
            type: 'blood_pipes',
            title: 'Blood Chamber I · Sanguine Conduit Puzzle',
            onWin: () => {
              setActiveMinigame(null);
              setQuestState((prev) => ({ ...prev, bloodChamber1Cleared: true }));
              setPromptMessage('✦ Chamber I Seal Shattered! Walk North to Chamber II.');
            }
          });
          return;
        }
        if (near(400, 105, 58)) {
          if (!q.bloodChamber1Cleared) {
            audioEngine.playGestureBlocked();
            setPromptMessage('Locked! Solve the Conduit Puzzle in the center first.');
          } else {
            travelToZone('blood_chamber_2', 400, 440, 'Sanguine Chamber II · Conquer Echoing Glyph Memory!');
          }
          return;
        }
      } else if (q.currentZone === 'blood_chamber_2') {
        if (near(400, 495, 58)) return travelToZone('blood_chamber_1', 400, 155);
        if (near(400, 290, 65) && !q.bloodChamber2Cleared) {
          setActiveMinigame({
            type: 'blood_memory',
            title: 'Blood Chamber II · Echoing Glyph Memory',
            onWin: () => {
              setActiveMinigame(null);
              setQuestState((prev) => ({ ...prev, bloodChamber2Cleared: true }));
              setPromptMessage('✦ Chamber II Seal Shattered! Walk North to Chamber III.');
            }
          });
          return;
        }
        if (near(400, 105, 58)) {
          if (!q.bloodChamber2Cleared) {
            audioEngine.playGestureBlocked();
            setPromptMessage('Locked! Conquer the Crimson Memory Trial in the center first.');
          } else {
            travelToZone('blood_chamber_3', 400, 440, 'Sanguine Chamber III · Survive the Crimson Laser Crucible!');
          }
          return;
        }
      } else if (q.currentZone === 'blood_chamber_3') {
        if (near(400, 495, 58)) return travelToZone('blood_chamber_2', 400, 155);
        if (near(400, 290, 65) && !q.bloodChamber3Cleared) {
          setActiveMinigame({
            type: 'blood_crystals',
            title: 'Blood Chamber III · Crimson Laser Crucible',
            onWin: () => {
              setActiveMinigame(null);
              setQuestState((prev) => ({ ...prev, bloodChamber3Cleared: true }));
              setPromptMessage('✦ ALL 3 SANGUINE CHAMBERS CONQUERED! Walk North to the Inner Blood Altar!');
            }
          });
          return;
        }
        if (near(400, 105, 58)) {
          if (!q.bloodChamber3Cleared) {
            audioEngine.playGestureBlocked();
            setPromptMessage('Locked! Shatter all 5 Crimson Crystals first.');
          } else {
            travelToZone('blood_altar', 400, 430, 'Inner Sanguine Altar · Approach the Blood Well to claim Blood Bending!');
          }
          return;
        }
      } else if (q.currentZone === 'blood_altar') {
        if (near(400, 495, 58)) return travelToZone('blood_chamber_3', 400, 155);
        if (near(400, 230, 75)) {
          audioEngine.playBloodBender();
          audioEngine.playLevelUp();
          setQuestState((prev) => ({ ...prev, bloodBenderUnlocked: true }));
          if (!stats.unlockedSpellIds.includes('blood_bender')) {
            onUpdateStatsRef.current({
              unlockedSpellIds: [...stats.unlockedSpellIds, 'blood_bender'],
              unlockedInThisSession: [...stats.unlockedInThisSession, 'blood_bender']
            });
          }
          setActiveDialogue({
            speaker: 'The Sanguine Altar · Forbidden Awakening',
            text: `★ ${heroName}, FORBIDDEN BLOOD BENDER UNLOCKED! Hold BOTH hands downward in Marionette Puppeteer Claws in combat to seize enemy monsters!`,
            avatarColor: '#ef4444'
          });
          return;
        }
      }

      // ==================== SKY SANCTUM & BEAST CHAMBERS ====================
      else if (q.currentZone === 'sky_sanctum') {
        if (near(400, 490, 62)) return travelToZone('mountains', 400, 210);
        if (near(400, 115, 62)) return travelToZone('beast_chamber_1', 400, 440, 'Sky Chamber I · Master the Spirit Chime Rhythm!');
      } else if (q.currentZone === 'beast_chamber_1') {
        if (near(400, 495, 58)) return travelToZone('sky_sanctum', 400, 160);
        if (near(400, 290, 65) && !q.beastChamber1Cleared) {
          setActiveMinigame({
            type: 'beast_birds',
            title: 'Sky Chamber I · Spirit Chime Rhythm',
            onWin: () => {
              setActiveMinigame(null);
              setQuestState((prev) => ({ ...prev, beastChamber1Cleared: true }));
              setPromptMessage('✦ Sky Chamber I Cleared! Walk North to Sky Chamber II.');
            }
          });
          return;
        }
        if (near(400, 105, 58)) {
          if (!q.beastChamber1Cleared) {
            audioEngine.playGestureBlocked();
            setPromptMessage('Locked! Complete the Spirit Chime Rhythm Trial first.');
          } else {
            travelToZone('beast_chamber_2', 400, 440, 'Sky Chamber II · Trace the Dire Wolf Constellation!');
          }
          return;
        }
      } else if (q.currentZone === 'beast_chamber_2') {
        if (near(400, 495, 58)) return travelToZone('beast_chamber_1', 400, 155);
        if (near(400, 290, 65) && !q.beastChamber2Cleared) {
          setActiveMinigame({
            type: 'beast_constellation',
            title: 'Sky Chamber II · Dire Wolf Constellation',
            onWin: () => {
              setActiveMinigame(null);
              setQuestState((prev) => ({ ...prev, beastChamber2Cleared: true }));
              setPromptMessage('✦ Sky Chamber II Cleared! Walk North to Sky Chamber III.');
            }
          });
          return;
        }
        if (near(400, 105, 58)) {
          if (!q.beastChamber2Cleared) {
            audioEngine.playGestureBlocked();
            setPromptMessage('Locked! Trace the entire Dire Wolf Constellation first.');
          } else {
            travelToZone('beast_chamber_3', 400, 440, 'Sky Chamber III · Tame all 4 Celestial Spirit Wolves!');
          }
          return;
        }
      } else if (q.currentZone === 'beast_chamber_3') {
        if (near(400, 495, 58)) return travelToZone('beast_chamber_2', 400, 155);
        if (near(400, 290, 65) && !q.beastChamber3Cleared) {
          setActiveMinigame({
            type: 'beast_taming',
            title: 'Sky Chamber III · Alpha Wolf Herding & Taming',
            onWin: () => {
              setActiveMinigame(null);
              setQuestState((prev) => ({ ...prev, beastChamber3Cleared: true }));
              setPromptMessage('✦ ALL 3 SKY CHAMBERS CONQUERED! Walk North to the Primal Beast Altar!');
            }
          });
          return;
        }
        if (near(400, 105, 58)) {
          if (!q.beastChamber3Cleared) {
            audioEngine.playGestureBlocked();
            setPromptMessage('Locked! Complete the Alpha Wolf Taming trial first.');
          } else {
            travelToZone('beast_altar', 400, 430, 'Altar of Primal Beasts · Claim Forbidden Animal Puppetry!');
          }
          return;
        }
      } else if (q.currentZone === 'beast_altar') {
        if (near(400, 495, 58)) return travelToZone('beast_chamber_3', 400, 155);
        if (near(400, 230, 75)) {
          audioEngine.playBeastRoar();
          audioEngine.playLevelUp();
          setQuestState((prev) => ({ ...prev, animalPuppetryUnlocked: true }));
          if (!stats.unlockedSpellIds.includes('animal_puppetry')) {
            onUpdateStatsRef.current({
              unlockedSpellIds: [...stats.unlockedSpellIds, 'animal_puppetry'],
              unlockedInThisSession: [...stats.unlockedInThisSession, 'animal_puppetry']
            });
          }
          setActiveDialogue({
            speaker: 'Altar of Primal Beasts · Faunomancy Awakening',
            text: `★ ${heroName}, FORBIDDEN ANIMAL PUPPETRY UNLOCKED! Arch BOTH hands into Dual Beast Talons in combat to unleash spectral dire wolves!`,
            avatarColor: '#10b981'
          });
          return;
        }
      }

      // Secondary key [F] outside special targets swings pickaxe if equipped
      if (actionType === 'secondary' && stats.hasPickaxe) {
        pickaxeSwingTimer = 18;
        audioEngine.playZombieHit();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement | null)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') {
        return;
      }
      if (e.key === 'Escape') {
        setShowBookshelfBook(false);
        setActiveDialogue(null);
        return;
      }
      const k = e.key.toLowerCase();
      keysDown[k] = true;
      keysDown[e.code.toLowerCase()] = true;
      if (k === 'e' || e.key === ' ') {
        handleInteraction('primary');
      } else if (k === 'f') {
        handleInteraction('secondary');
      } else if (k === 'l') {
        handleInteraction('lights');
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown[e.key.toLowerCase()] = false;
      keysDown[e.code.toLowerCase()] = false;
    };
    const handleWindowBlur = () => {
      for (const k in keysDown) keysDown[k] = false;
      isMoving = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    const sketch = (p: p5) => {
      p.setup = () => {
        p.createCanvas(containerRef.current!.clientWidth, containerRef.current!.clientHeight);
        p.frameRate(60);
      };
      p.windowResized = () => {
        if (!containerRef.current) return;
        p.resizeCanvas(containerRef.current.clientWidth, containerRef.current.clientHeight);
      };

      const drawDoor = (x: number, y: number, label: string, color: string) => {
        p.noStroke();
        p.fill(0, 0, 0, 110);
        p.rectMode(p.CENTER);
        p.rect(x, y + 3, 126, 36, 9);
        p.fill(color);
        p.rect(x, y, 124, 34, 8);
        p.fill('#0f172a');
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(9.5);
        p.textStyle(p.BOLD);
        p.text(label, x, y);
      };

      const drawFloatingHint = (x: number, y: number, hint: string, bg: string = '#0f172a') => {
        p.push();
        p.rectMode(p.CENTER);
        p.textSize(9.5);
        const w = Math.max(88, hint.length * 5.8 + 16);
        p.fill(bg);
        p.stroke('#fbbf24');
        p.strokeWeight(1.5);
        p.rect(x, y, w, 22, 6);
        p.noStroke();
        p.fill('#fef3c7');
        p.textAlign(p.CENTER, p.CENTER);
        p.textStyle(p.BOLD);
        p.text(hint, x, y);
        p.pop();
      };

      const drawSecretSparkle = (x: number, y: number, spotId: string) => {
        const found = questStateRef.current.hiddenSpotsFound.includes(spotId);
        if (found) return;
        const pulse = Math.sin(p.frameCount * 0.14) * 3.5;
        p.noStroke();
        p.fill(251, 191, 36, 175);
        p.circle(x, y, 14 + pulse);
        p.fill('#ffffff');
        p.circle(x, y, 5.5);
      };

      const drawButterfly = (cx: number, cy: number, color: string, offset: number) => {
        const bx = cx + Math.sin(p.frameCount * 0.04 + offset) * 28;
        const by = cy + Math.cos(p.frameCount * 0.06 + offset) * 16;
        const wing = Math.abs(Math.sin(p.frameCount * 0.35 + offset)) * 6 + 2;
        p.noStroke();
        p.fill(color);
        p.ellipse(bx - 3, by, wing, 5);
        p.ellipse(bx + 3, by, wing, 5);
      };

      const drawAnimatedTorch = (x: number, y: number, color: string) => {
        const fl = Math.sin(p.frameCount * 0.25 + x) * 3;
        p.noStroke();
        p.fill(color + '44');
        p.circle(x, y, 32 + fl);
        p.fill('#451a03');
        p.rect(x - 3, y, 6, 14);
        p.fill(color);
        p.circle(x, y - 3, 10 + fl * 0.4);
        p.fill('#fef08a');
        p.circle(x, y - 4, 4.5);
      };

      const drawWalkingNPC = (opts: {
        x: number;
        y: number;
        facing?: number;
        isWalking?: boolean;
        walkPhase?: number;
        skinTone: string;
        hairColor: string;
        hairStyle: 'short' | 'wavy' | 'ponytail' | 'bun' | 'spiky' | 'nurse_cap';
        topColor: string;
        pantsColor: string;
        dress?: boolean;
        cloakColor?: string;
        prop?: 'satchel' | 'book' | 'basket' | 'medical' | 'staff';
        isSorcerer?: boolean;
        wizardHatColor?: string;
        beard?: boolean;
        label?: string;
      }) => {
        const {
          x,
          y,
          facing = 1,
          isWalking = true,
          walkPhase = p.frameCount * 0.16,
          skinTone,
          hairColor,
          hairStyle,
          topColor,
          pantsColor,
          dress = false,
          cloakColor,
          prop,
          isSorcerer = false,
          wizardHatColor = '#312e81',
          beard = false,
          label
        } = opts;

        const stride = isWalking ? Math.sin(walkPhase) : 0;
        const liftL = isWalking ? Math.max(0, Math.cos(walkPhase)) * 3.5 : 0;
        const liftR = isWalking ? Math.max(0, -Math.cos(walkPhase)) * 3.5 : 0;
        const bob = isWalking ? Math.abs(Math.sin(walkPhase)) * 2.2 : Math.sin(p.frameCount * 0.05 + x) * 0.6;
        const lean = isWalking ? stride * 0.045 * facing : 0;

        p.push();
        p.translate(x, y);

        // Ancient Sorcerer arcane ground sigil + floating runes
        if (isSorcerer) {
          p.noFill();
          p.stroke(wizardHatColor + 'aa');
          p.strokeWeight(1.5);
          p.ellipse(0, 17, 30 + Math.sin(p.frameCount * 0.08) * 3, 11);
          p.noStroke();
          for (let sp = 0; sp < 3; sp++) {
            const ang = p.frameCount * 0.045 + sp * 2.1;
            p.fill(253, 224, 71, 180);
            p.circle(Math.cos(ang) * 18, -6 + Math.sin(ang * 1.4) * 9, 3.2);
          }
        }

        // Ground shadow
        p.noStroke();
        p.fill(0, 0, 0, 115);
        p.ellipse(0, 18, 22 - bob * 0.6, 8.5);

        p.push();
        p.translate(0, -bob);
        p.rotate(lean);

        // Rear Hair Layer
        p.fill(hairColor);
        if (hairStyle === 'wavy') {
          p.ellipse(-7, -3, 7, 19);
          p.ellipse(7, -3, 7, 19);
          p.rect(-8, -14, 16, 14, 5);
        } else if (hairStyle === 'ponytail') {
          p.ellipse(-facing * 8, -9 + stride * 0.7, 7, 15);
        } else if (hairStyle === 'bun') {
          p.circle(-facing * 3, -22, 8);
        }

        // Optional Flowing Cloak / Grand Sorcerer Robe Mantle
        if (cloakColor) {
          p.fill(cloakColor);
          p.triangle(
            isSorcerer ? -13 : -10,
            -6,
            isSorcerer ? 13 : 10,
            -6,
            -facing * (isSorcerer ? 15 : 12),
            15 + stride * 1.4
          );
        }

        // Articulated Two-Segment Walking Legs & Boots
        const leftFootX = -3.8 + stride * 4.8;
        const leftFootY = 17 - liftL;
        const leftKneeX = (-3.8 + leftFootX) * 0.5 + facing * 1.4;
        const leftKneeY = 11.5 - liftL * 0.6;

        const rightFootX = 3.8 - stride * 4.8;
        const rightFootY = 17 - liftR;
        const rightKneeX = (3.8 + rightFootX) * 0.5 + facing * 1.4;
        const rightKneeY = 11.5 - liftR * 0.6;

        p.stroke(pantsColor);
        p.strokeWeight(3.8);
        p.line(-3.5, 6, leftKneeX, leftKneeY);
        p.line(leftKneeX, leftKneeY, leftFootX, leftFootY);
        p.line(3.5, 6, rightKneeX, rightKneeY);
        p.line(rightKneeX, rightKneeY, rightFootX, rightFootY);

        // Boots
        p.noStroke();
        p.fill('#451a03');
        p.ellipse(leftFootX + facing * 1.2, leftFootY + 0.8, 5.5, 3.6);
        p.ellipse(rightFootX + facing * 1.2, rightFootY + 0.8, 5.5, 3.6);

        // Back Arm
        const armSwingL = -stride * 4.5;
        const armSwingR = stride * 4.5;
        p.stroke(skinTone);
        p.strokeWeight(3.2);
        p.line(-9, -4, -10.5, 1 + armSwingL * 0.45);
        p.line(-10.5, 1 + armSwingL * 0.45, -9.5 + armSwingL * 0.5, 6 + Math.abs(armSwingL) * 0.15);
        p.noStroke();
        p.fill(skinTone);
        p.circle(-9.5 + armSwingL * 0.5, 6.5, 3.5);

        // Torso / Tunic / Dress / Robes
        p.rectMode(p.CENTER);
        p.fill(topColor);
        if (dress || isSorcerer) {
          p.quad(-8.5, -7, 8.5, -7, 12.5, 13, -12.5, 13);
          p.fill(isSorcerer ? '#fde047' : '#fef3c7');
          p.triangle(-3.5, -7, 3.5, -7, 0, -1.5);
          if (isSorcerer) {
            p.fill('#eab308');
            p.rect(0, 3.5, 16, 2.5, 1);
          }
        } else {
          p.quad(-9.5, -7, 9.5, -7, 7.5, 7.5, -7.5, 7.5);
          p.fill('#78350f');
          p.rect(0, 5.5, 15, 3, 1);
          p.fill('#eab308');
          p.rect(0, 5.5, 3.5, 3.5, 1);
        }

        // Front Arm + Optional Prop
        p.stroke(skinTone);
        p.strokeWeight(3.2);
        p.line(9, -4, 10.5, 1 + armSwingR * 0.45);
        p.line(10.5, 1 + armSwingR * 0.45, 9.5 + armSwingR * 0.5, 6 + Math.abs(armSwingR) * 0.15);
        p.noStroke();
        p.fill(skinTone);
        const fHandX = 9.5 + armSwingR * 0.5;
        const fHandY = 6.5;
        p.circle(fHandX, fHandY, 3.5);

        if (prop === 'staff') {
          const staffX = fHandX + facing * 3.5;
          p.stroke('#78350f');
          p.strokeWeight(2.8);
          p.line(staffX, 16, staffX, -20);
          p.noStroke();
          p.fill('#fde047');
          p.circle(staffX, -22, 7.5 + Math.sin(p.frameCount * 0.15) * 1.2);
          p.fill('#38bdf8');
          p.circle(staffX, -22, 4);
        } else if (prop === 'book') {
          p.fill('#38bdf8');
          p.rect(fHandX + facing * 1.5, fHandY - 1, 6, 7.5, 1.5);
          p.fill('#fef08a');
          p.rect(fHandX + facing * 1.5, fHandY - 1, 3, 4.5, 0.5);
        } else if (prop === 'satchel') {
          p.fill('#92400e');
          p.rect(-facing * 7.5, 3, 6, 8, 2);
        } else if (prop === 'basket') {
          p.fill('#d97706');
          p.rect(fHandX, fHandY + 2, 8, 6, 2);
          p.fill('#f43f5e');
          p.circle(fHandX - 1.5, fHandY - 1, 3);
          p.fill('#facc15');
          p.circle(fHandX + 1.5, fHandY - 1, 3);
        } else if (prop === 'medical') {
          p.fill('#f8fafc');
          p.rect(fHandX, fHandY + 1, 7, 6, 1.5);
          p.fill('#ef4444');
          p.rect(fHandX, fHandY + 1, 4, 1.5);
          p.rect(fHandX, fHandY + 1, 1.5, 4);
        }

        // Head, Expressive Blinking Eyes & Optional Elder Sorcerer Beard
        p.fill(skinTone);
        p.ellipse(0, -14, 14.5, 16);

        if (beard) {
          p.fill('#e2e8f0');
          p.triangle(-5.5, -10.5, 5.5, -10.5, 0, -0.5);
        }

        const blinking = (p.frameCount + Math.floor(x)) % 150 > 144;
        if (blinking) {
          p.stroke('#0f172a');
          p.strokeWeight(1.2);
          p.line(-3.6 + facing * 1.1, -13, -1.6 + facing * 1.1, -13);
          p.line(1.6 + facing * 1.1, -13, 3.6 + facing * 1.1, -13);
          p.noStroke();
        } else {
          p.fill('#0f172a');
          p.circle(-2.4 + facing * 1.1, -13, 2);
          p.circle(2.4 + facing * 1.1, -13, 2);
        }
        p.fill('#fda4af');
        p.circle(-4.2 + facing * 0.8, -11.2, 2.5);
        p.circle(4.2 + facing * 0.8, -11.2, 2.5);

        // Hair Top & Bangs + Sorcerer Pointed Hat
        p.fill(hairColor);
        p.arc(0, -16, 16.5, 14.5, p.PI - 0.15, 0.15);
        if (hairStyle === 'spiky') {
          p.triangle(-6, -20, -2, -26, 1, -20);
          p.triangle(0, -20, 4, -26, 7, -19);
        } else if (hairStyle === 'wavy') {
          p.arc(-3.5, -16.5, 9, 7, p.PI, 0);
          p.arc(3.5, -16.5, 9, 7, p.PI, 0);
        } else if (hairStyle === 'nurse_cap') {
          p.fill('#ffffff');
          p.rect(0, -22, 11, 5.5, 2);
          p.fill('#ef4444');
          p.rect(0, -22, 4, 1.4);
          p.rect(0, -22, 1.4, 4);
        }

        if (isSorcerer) {
          p.fill(wizardHatColor);
          p.ellipse(0, -19.5, 22, 5.5); // Wide brim
          p.triangle(-8.5, -20, 8.5, -20, 0, -37); // Tall pointed crown
          p.fill('#fde047');
          p.rect(0, -21, 13, 2); // Gold hatband
        }

        p.pop();

        if (label) {
          p.noStroke();
          p.fill(isSorcerer ? 49 : 15, isSorcerer ? 46 : 23, isSorcerer ? 129 : 42, 195);
          p.rectMode(p.CENTER);
          p.rect(0, isSorcerer ? -41 : -32, label.length * 5.2 + 12, 13, 4);
          p.fill(isSorcerer ? '#fde68a' : '#e2e8f0');
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(8);
          p.textStyle(p.BOLD);
          p.text(label, 0, isSorcerer ? -41 : -32);
        }

        p.pop();
      };

      p.draw = () => {
        if (warpPositionRef.current) {
          playerX = warpPositionRef.current.x;
          playerY = warpPositionRef.current.y;
          warpPositionRef.current = null;
          resetPose();
        }

        const q = questStateRef.current;
        const stats = playerStatsRef.current;
        const heroName = (stats.playerName || 'Aria').trim() || 'Aria';
        currentFrameCount = p.frameCount;

        // Gentle hunger decay every ~15s while exploring so eating from the Home Fridge matters!
        if (performance.now() - lastHungerTick > 15000 && playerPose !== 'sleeping') {
          lastHungerTick = performance.now();
          const curHunger = stats.hunger ?? 65;
          if (curHunger > 10) {
            onUpdateStatsRef.current({ hunger: Math.max(10, curHunger - 1) });
          }
        }

        // Visual burst when player eats food out of their Home Fridge modal
        if (fridgeEatEventRef.current) {
          const ev = fridgeEatEventRef.current;
          fridgeEatEventRef.current = null;
          spawnBurst(playerX, playerY - 20, '#22c55e', 16, `Ate ${ev.label}! +${ev.hunger} Hunger 🍽️`);
        }

        if (pickaxeSwingTimer > 0) pickaxeSwingTimer--;
        if (wateringCanTimer > 0) wateringCanTimer--;
        if (shoppingReachTimer > 0) {
          shoppingReachTimer--;
          if (shoppingReachTimer === 2 && shoppingReachItem) {
            cartItems.push(shoppingReachItem);
            audioEngine.playArmorUpgrade();
            spawnBurst(
              playerX + facingDir * 24,
              playerY - 4,
              shoppingReachItem.color,
              12,
              `+ ${shoppingReachItem.name} 🛒`
            );
            setPromptMessage(
              `Added ${shoppingReachItem.name} to Shopping Cart (${cartItems.length} items)! Head to the Red Checkout [E] at the front!`
            );
          }
          if (shoppingReachTimer === 0) {
            shoppingReachItem = null;
          }
        }

        // 2-Second Pure Black Sleep Screen -> Step off the bed & announce sleep completion!
        if (playerPose === 'sleeping' && sleepBlackoutUntil > 0) {
          if (performance.now() < sleepBlackoutUntil) {
            p.background(0, 0, 0);
            return;
          }
          sleepBlackoutUntil = 0;
          resetPose();
          playerX = sleepWakeX;
          playerY = sleepWakeY;
          audioEngine.playLevelUp();
          spawnBurst(playerX, playerY - 22, '#fde047', 16, `${heroName} has slept! ☀️ Full HP & Mana`);
          setPromptMessage(`${heroName} has slept! HP & Mana 100% restored.`);
          setActiveDialogue({
            speaker: `Well-Rested ${heroName}`,
            text: `${heroName} has slept soundly and stepped out of bed feeling completely refreshed! (HP & Mana 100%)`,
            avatarColor: '#818cf8'
          });
        }

        // Respawn timers for Underground crystal veins
        for (const vein of mineVeins) {
          if (vein.respawnTimer > 0) {
            vein.respawnTimer--;
            if (vein.respawnTimer === 0) vein.hp = vein.maxHp;
          }
        }

        // Check movement inputs
        let dx = 0;
        let dy = 0;
        if (keysDown['arrowup'] || keysDown['w'] || keysDown['keyw']) dy -= speed;
        if (keysDown['arrowdown'] || keysDown['s'] || keysDown['keys']) dy += speed;
        if (keysDown['arrowleft'] || keysDown['a'] || keysDown['keya']) {
          dx -= speed;
          facingDir = -1;
        }
        if (keysDown['arrowright'] || keysDown['d'] || keysDown['keyd']) {
          dx += speed;
          facingDir = 1;
        }

        const wantsMove = dx !== 0 || dy !== 0;

        const isHoldingAction = performance.now() < actionHoldUntil;

        if (wantsMove && !isHoldingAction) {
          pendingAction = null;
        }

        // If seated/resting/sleeping/swinging/spinning and player presses movement key, smoothly hop off once 5s hold is met!
        if (
          wantsMove &&
          !isHoldingAction &&
          ['sitting', 'resting', 'sleeping', 'swinging_playground', 'spinning_merry'].includes(playerPose)
        ) {
          const wasResting = playerPose === 'resting';
          resetPose();
          playerY += wasResting ? 46 : 16;
        }

        // Scripted Interactive Ride Animations & Smooth Auto-Walk to Action Targets
        if (pendingAction) {
          const pdx = pendingAction.targetX - playerX;
          const pdy = pendingAction.targetY - playerY;
          const dist = Math.hypot(pdx, pdy);
          if (dist <= speed + 1) {
            playerX = pendingAction.targetX;
            playerY = pendingAction.targetY;
            isMoving = false;
            const cb = pendingAction.onArrive;
            pendingAction = null;
            cb();
          } else {
            playerX += (pdx / dist) * speed;
            playerY += (pdy / dist) * speed;
            facingDir = pdx >= 0 ? 1 : -1;
            isMoving = true;
            stepFrame += 0.26;
          }
        } else if (shoppingReachTimer > 0) {
          isMoving = false;
        } else if (playerPose === 'watering_plant') {
          playerX = poseAnchorX;
          playerY = poseAnchorY;
          facingDir = 1;
          isMoving = false;
          if (!isHoldingAction) {
            wateringCanTimer = 0;
            resetPose();
          }
        } else if ((performance.now() < plantEatUntil || performance.now() < plantSmellUntil) && isHoldingAction) {
          isMoving = false;
        } else if (playerPose === 'sliding') {
          poseTimer--;
          const prog = 1 - poseTimer / 50;
          playerX = 562 + prog * 68;
          playerY = 152 + Math.pow(prog, 0.85) * 74;
          isMoving = false;
          if (p.frameCount % 3 === 0) {
            particles.push({
              x: playerX,
              y: playerY + 8,
              vx: (Math.random() - 0.5) * 1.8,
              vy: -0.6,
              color: '#38bdf8',
              size: 4,
              life: 16
            });
          }
          if (poseTimer <= 0) {
            resetPose();
            playerY = 236;
          }
        } else if (playerPose === 'climbing_mountain') {
          poseTimer--;
          const prog = 1 - poseTimer / 55;
          playerX = 610 + Math.sin(prog * 14) * 5;
          playerY = 325 - prog * 125;
          isMoving = true;
          stepFrame += 0.35;
          if (poseTimer <= 0) {
            resetPose();
            playerX = 610;
            playerY = 200;
            spawnBurst(610, 200, '#38bdf8', 14, 'Reached Summit! Press [E] for Ascent Game!');
          }
        } else if (playerPose === 'swinging_playground') {
          const swOff = Math.sin(p.frameCount * 0.08) * 18;
          playerX = poseAnchorX - 20 + swOff;
          playerY = poseAnchorY + Math.cos(p.frameCount * 0.08) * 4;
          isMoving = false;
        } else if (playerPose === 'spinning_merry') {
          const ang = p.frameCount * 0.055;
          playerX = poseAnchorX + Math.cos(ang) * 28;
          playerY = poseAnchorY + Math.sin(ang) * 28;
          isMoving = false;
        } else if (['sitting', 'resting', 'sleeping'].includes(playerPose)) {
          playerX = poseAnchorX;
          playerY = poseAnchorY;
          isMoving = false;
          if (playerPose === 'sleeping' && p.frameCount % 26 === 0) {
            particles.push({
              x: playerX + 6,
              y: playerY - 18,
              vx: 0.4,
              vy: -0.7,
              color: '#c4b5fd',
              size: 11,
              life: 44,
              text: 'Zzz'
            });
          }
        } else {
          if (!wantsMove) {
            isMoving = false;
          } else {
            isMoving = true;
            stepFrame += 0.24;
            if (dx !== 0 && dy !== 0) {
              dx *= 0.707;
              dy *= 0.707;
            }
          }
          playerX = Math.max(
            q.currentZone === 'my_house' && mpSnapRef.current.enabled ? 104 : 115,
            Math.min(685, playerX + dx)
          );
          playerY = Math.max(
            q.currentZone === 'my_house' && mpSnapRef.current.enabled ? 82 : 82,
            Math.min(515, playerY + dy)
          );
        }

        p.push();
        if (q.currentZone === 'my_house') {
          // Keep the house room stationary and centered in the viewport — never shift/follow the character
          const roomScale = mpSnapRef.current.enabled
            ? Math.min(1, (p.width - 20) / 630, (p.height - 20) / 465)
            : Math.min(1, (p.width - 24) / 600, (p.height - 24) / 470);
          p.translate(p.width / 2, p.height / 2);
          p.scale(roomScale);
          p.translate(-400, -288);
        } else {
          const camX = p.width / 2 - playerX;
          const camY = p.height / 2 - playerY;
          p.translate(camX, camY);
        }
        p.rectMode(p.CORNER);

        let contextualHint: { x: number; y: number; text: string } | null = null;
        const isNear = (x: number, y: number, r: number = 62) =>
          Math.hypot(playerX - x, playerY - y) < r;

        // ==================== ZONE BACKGROUNDS & LIVELY ANIMATIONS ====================
        if (q.currentZone === 'town_square') {
          p.background(14, 28, 22);
          p.noStroke();
          p.fill('#1b4332');
          p.rect(90, 60, 620, 480, 18);

          p.fill('#2d6a4f');
          for (const [tx, ty] of [[145, 110], [650, 110], [140, 455], [645, 455]]) {
            p.circle(tx, ty, 52 + Math.sin(p.frameCount * 0.04 + tx) * 2);
            p.fill('#f472b6');
            p.circle(tx - 8, ty + 14, 7);
            p.fill('#facc15');
            p.circle(tx + 9, ty + 16, 7);
            p.fill('#2d6a4f');
          }

          p.fill('#334155');
          p.rect(355, 65, 90, 465);
          p.rect(100, 290, 600, 88);
          p.fill('#475569');
          p.circle(400, 330, 155);

          p.fill('#1e293b');
          p.circle(400, 330, 92);
          p.fill('#0284c7');
          p.circle(400, 330, 72);
          p.noFill();
          p.stroke('#bae6fd');
          p.strokeWeight(2);
          const rip = (p.frameCount * 0.9) % 45;
          p.circle(400, 330, 14 + rip);
          p.noStroke();
          p.fill('#e0f2fe');
          p.circle(400, 330, 12 + Math.sin(p.frameCount * 0.16) * 3);

          // Lively Interactive Town Villagers (approach & press [E] to talk / get power hints!)
          const townNpcs = getTownNPCPositions(p.frameCount);
          const npcDir1 = Math.cos(p.frameCount * 0.018) >= 0 ? 1 : -1;
          drawWalkingNPC({
            x: townNpcs.bram.x,
            y: townNpcs.bram.y,
            facing: npcDir1,
            isWalking: true,
            walkPhase: p.frameCount * 0.19,
            skinTone: '#f1c27d',
            hairColor: '#78350f',
            hairStyle: 'short',
            topColor: '#f59e0b',
            pantsColor: '#1e293b',
            prop: 'satchel',
            label: 'Merchant Bram'
          });

          const npcDir2 = -Math.sin(p.frameCount * 0.022) >= 0 ? 1 : -1;
          drawWalkingNPC({
            x: townNpcs.lyra.x,
            y: townNpcs.lyra.y,
            facing: npcDir2,
            isWalking: true,
            walkPhase: p.frameCount * 0.21 + 1.1,
            skinTone: '#ffdbac',
            hairColor: '#9f1239',
            hairStyle: 'wavy',
            topColor: '#ec4899',
            pantsColor: '#4c1d95',
            dress: true,
            prop: 'basket',
            label: 'Lyra'
          });

          const npcDir3 = Math.cos(p.frameCount * 0.015 + 1.8) >= 0 ? 1 : -1;
          drawWalkingNPC({
            x: townNpcs.aldrin.x,
            y: townNpcs.aldrin.y,
            facing: npcDir3,
            isWalking: true,
            walkPhase: p.frameCount * 0.17 + 2.4,
            skinTone: '#e0ac69',
            hairColor: '#e2e8f0',
            hairStyle: 'short',
            topColor: '#312e81',
            pantsColor: '#1e1b4b',
            cloakColor: '#4338ca',
            prop: 'staff',
            isSorcerer: true,
            wizardHatColor: '#312e81',
            beard: true,
            label: 'Sorcerer Aldrin'
          });

          // Outdoor Shopping Cart Corral OUTSIDE Grand Superstore (572, 274)
          p.fill('#475569');
          p.rect(540, 250, 64, 46, 6);
          p.stroke('#94a3b8');
          p.strokeWeight(2);
          p.noFill();
          p.rect(544, 254, 56, 38, 4);
          // Mini stacked wireframe carts in outdoor corral
          for (let ci = 0; ci < 3; ci++) {
            const cx = 553 + ci * 14;
            const cy = 276;
            p.stroke('#cbd5e1');
            p.strokeWeight(1.4);
            p.rect(cx, cy - 6, 13, 10, 2);
            p.stroke('#ef4444');
            p.strokeWeight(2.4);
            p.line(cx - 2, cy - 8, cx - 2, cy + 2);
            p.noStroke();
            p.fill('#0f172a');
            p.circle(cx + 2, cy + 6, 3.5);
            p.circle(cx + 11, cy + 6, 3.5);
            p.noFill();
          }
          p.noStroke();
          p.fill('#fef08a');
          p.textAlign(p.CENTER);
          p.textSize(8.5);
          p.textStyle(p.BOLD);
          p.text(hasShoppingCart ? 'CART TAKEN 🛒' : '[E] GET CART 🛒', 572, 245);

          if (isNear(572, 274, 48)) {
            contextualHint = {
              x: 572,
              y: 226,
              text: hasShoppingCart ? '[E / F] Return Shopping Cart 🛒' : '[E] Take Shopping Cart Outside Store 🛒'
            };
          } else if (isNear(townNpcs.bram.x, townNpcs.bram.y, 58)) {
            contextualHint = { x: townNpcs.bram.x, y: townNpcs.bram.y - 42, text: '[E] Talk to Merchant Bram 💬' };
          } else if (isNear(townNpcs.lyra.x, townNpcs.lyra.y, 58)) {
            contextualHint = { x: townNpcs.lyra.x, y: townNpcs.lyra.y - 42, text: '[E] Talk to Lyra 💬' };
          } else if (isNear(townNpcs.aldrin.x, townNpcs.aldrin.y, 58)) {
            contextualHint = { x: townNpcs.aldrin.x, y: townNpcs.aldrin.y - 48, text: '[E] Ancient Sorcerer Aldrin ✨' };
          }

          p.fill('#475569');
          p.rect(235, 90, 40, 36, 6);
          p.fill('#fde047');
          p.circle(255, 108, 12);
          drawAnimatedTorch(555, 420, '#facc15');

          drawSecretSparkle(400, 330, 'spot_town_fountain');
          drawSecretSparkle(255, 108, 'spot_town_clock');
          drawSecretSparkle(555, 420, 'spot_town_lantern');
          drawButterfly(310, 240, '#f472b6', 0);
          drawButterfly(510, 250, '#38bdf8', 2);

          drawDoor(180, 165, '[E] MY HOUSE', '#f59e0b');
          drawDoor(620, 165, '[E] PLAYGROUND', '#10b981');
          drawDoor(155, 345, '[E] HOSPITAL', '#38bdf8');
          drawDoor(645, 345, '[E] SUPERSTORE', '#a855f7');
          drawDoor(400, 95, '[E] HILLS & MINE', '#4ade80');
        } else if (q.currentZone === 'my_house') {
          if (mpSnapRef.current.enabled) {
            // ==================== 2-PERSON MULTIPLAYER APARTMENT FLOORPLAN (Matches Reference Image) ====================
            p.background(242, 241, 238);
            p.noStroke();

            // Subtle floorplan drop-shadow matching clean 3D architectural view
            p.fill(0, 0, 0, 34);
            p.rect(114, 70, 574, 186, 6);
            p.rect(94, 250, 594, 260, 6);

            // Exterior White Architectural Frame
            p.fill('#f8fafc');
            p.rect(110, 64, 576, 188, 4);
            p.rect(90, 244, 596, 264, 4);

            // Balcony Patio Deck outside Right Wall
            p.fill('#d6d3d1');
            p.rect(686, 148, 26, 330, 3);
            p.stroke('#94a3b8');
            p.strokeWeight(2);
            p.line(711, 148, 711, 478);
            p.noStroke();

            // 1. BEDROOM 1 (Top-Left Carpet #9e938a)
            p.fill('#9e938a');
            p.rect(118, 72, 222, 174);
            // Left Window
            p.fill('#ffffff');
            p.rect(110, 130, 8, 56, 2);
            p.fill('#bae6fd');
            p.rect(112, 134, 4, 48);
            p.fill(254, 249, 195, roomLightsOn ? 30 : 12);
            p.quad(118, 132, 118, 184, 176, 210, 176, 112);

            // Bedroom 1 Corner Plant (136, 98)
            p.fill('#78350f');
            p.circle(136, 98, 16);
            p.fill('#16a34a');
            p.circle(132, 95, 11);
            p.circle(141, 95, 11);
            p.fill('#22c55e');
            p.circle(136, 101, 11);

            // Bedroom 1 Dresser + Wide TV (192, 92)
            p.fill('#6b3f24');
            p.rect(162, 78, 62, 22, 3);
            p.fill('#0f172a');
            p.rect(171, 79, 44, 9, 2);

            // Bedroom 1 Bed with White Sheets, Gray Quilt & Lime-Green Pillows (192, 172)
            p.push();
            p.translate(192, 172);
            p.rectMode(p.CENTER);
            p.fill('#475569');
            p.rect(0, 0, 74, 86, 5);
            p.fill('#f8fafc');
            p.rect(0, 18, 68, 44, 4);
            p.fill('#7c8187');
            p.rect(0, -14, 70, 48, 5);
            p.fill('#ffffff');
            p.rect(-16, 28, 22, 13, 3);
            p.rect(16, 28, 22, 13, 3);
            p.fill('#a3e635');
            p.rect(-4, 16, 18, 11, 3);
            p.fill('#e2e8f0');
            p.rect(14, 17, 14, 10, 3);
            p.pop();

            // Bedroom 1 Angled Walk-in Closet (Top-Center-Left)
            p.fill('#e2e8f0');
            p.rect(264, 72, 74, 82);
            p.fill('#f8fafc');
            p.rect(272, 76, 58, 18, 2);
            p.fill('#475569');
            p.rect(294, 78, 14, 8, 2);
            p.fill('#f1f5f9');
            p.rect(272, 110, 58, 36, 2);

            // 2. EN-SUITE BATHROOM 1 + LAUNDRY ALCOVE (Center-Left)
            p.fill('#cbd5e1');
            p.rect(342, 72, 82, 108);
            p.fill('#f8fafc');
            p.rect(346, 86, 20, 42, 3); // Vanity
            p.fill('#94a3b8');
            p.circle(356, 106, 12); // Sink
            p.fill('#ffffff');
            p.ellipse(398, 106, 16, 22); // Toilet
            p.fill('#e0f2fe');
            p.rect(368, 136, 52, 40, 3); // Glass Shower
            p.stroke('#94a3b8');
            p.strokeWeight(1.5);
            p.noFill();
            p.rect(368, 136, 52, 40, 3);
            p.noStroke();

            // Laundry Machines & Hallway Linen Closets
            p.fill('#e2e8f0');
            p.rect(306, 186, 118, 70);
            p.fill('#ffffff');
            p.rect(314, 218, 30, 32, 3); // Washer
            p.rect(348, 218, 30, 32, 3); // Dryer
            p.fill('#64748b');
            p.circle(329, 234, 14);
            p.circle(363, 234, 14);
            p.fill('#f8fafc');
            p.rect(386, 218, 32, 32, 3); // Linen storage

            // 3. BEDROOM 2 (Bottom-Left Wing Carpet #9e938a)
            p.fill('#9e938a');
            p.rect(98, 252, 186, 250);
            // Left Window
            p.fill('#ffffff');
            p.rect(90, 360, 8, 60, 2);
            p.fill('#bae6fd');
            p.rect(92, 364, 4, 52);
            p.fill(254, 249, 195, roomLightsOn ? 30 : 12);
            p.quad(98, 362, 98, 418, 158, 444, 158, 342);

            // Bedroom 2 Corner Plant (120, 282)
            p.fill('#78350f');
            p.circle(120, 282, 18);
            p.fill('#16a34a');
            p.circle(115, 278, 13);
            p.circle(125, 278, 13);
            p.fill('#22c55e');
            p.circle(120, 286, 12);

            // Bedroom 2 Dresser + TV (186, 282)
            p.fill('#6b3f24');
            p.rect(154, 268, 64, 22, 3);
            p.fill('#0f172a');
            p.rect(164, 269, 44, 9, 2);

            // Bedroom 2 Bed with White Sheet, Gray Foot Quilt & Lime Pillows (186, 424)
            p.push();
            p.translate(186, 424);
            p.rectMode(p.CENTER);
            p.fill('#64748b');
            p.rect(0, 0, 72, 90, 5);
            p.fill('#f8fafc');
            p.rect(0, 12, 68, 58, 4);
            p.fill('#94a3b8');
            p.rect(0, -24, 70, 34, 5);
            p.fill('#ffffff');
            p.rect(-17, 30, 22, 13, 3);
            p.rect(17, 30, 22, 13, 3);
            p.fill('#a3e635');
            p.rect(-10, 16, 18, 11, 3);
            p.rect(12, 16, 18, 11, 3);
            p.pop();
            // Bedroom 2 Twin Round Nightstands & Lamps
            for (const nx of [126, 246]) {
              p.fill('#f8fafc');
              p.circle(nx, 472, 22);
              p.fill(nightstandLampOn ? '#fde047' : '#64748b');
              p.circle(nx, 472, 11);
            }

            // 4. BATHROOM 2 (Bottom-Center Brown Tile #8c6d53 + Sky-Blue Bathtub!)
            p.fill('#8c6d53');
            p.rect(288, 370, 144, 132);
            p.fill('#e2e8f0');
            p.rect(288, 370, 24, 132); // Bathroom closet partition
            p.fill('#f8fafc');
            p.rect(318, 384, 34, 46, 3); // Vanity
            p.fill('#cbd5e1');
            p.circle(336, 406, 18); // Sink
            p.fill('#ffffff');
            p.ellipse(346, 474, 24, 18); // Toilet
            // Signature Sky-Blue Bathtub!
            p.fill('#f8fafc');
            p.rect(384, 396, 44, 102, 6);
            p.fill('#60a5fa');
            p.rect(390, 404, 32, 86, 8);
            p.fill('#93c5fd');
            p.ellipse(406, 447, 20, 62);

            // 5. OPEN LIVING / HALLWAY FLOOR (#a4988e)
            p.fill('#a4988e');
            p.rect(286, 260, 146, 108); // Central Hallway
            p.rect(432, 72, 250, 430); // Right Wing Open Plan

            // 6. U-SHAPED HONEY-OAK KITCHEN + STAINLESS FRIDGE (Top-Center-Right)
            p.fill('#b6987b');
            p.rect(434, 72, 142, 140);
            // Honey-Oak U-Shaped Countertops
            p.fill('#c68b54');
            p.rect(434, 72, 142, 32, 2); // Top counter
            p.rect(434, 72, 30, 140, 2); // Left counter
            p.rect(434, 186, 102, 26, 2); // Bottom bar counter
            // Double Stainless Sink
            p.fill('#64748b');
            p.rect(486, 77, 36, 22, 3);
            p.fill('#94a3b8');
            p.rect(489, 80, 14, 16, 2);
            p.rect(505, 80, 14, 16, 2);
            // 4-Burner Stove
            p.fill('#1e293b');
            p.rect(438, 122, 22, 36, 3);
            p.fill('#475569');
            p.circle(445, 131, 6);
            p.circle(454, 131, 6);
            p.circle(445, 147, 6);
            p.circle(454, 147, 6);

            // Stainless Steel Refrigerator (552, 148)
            p.push();
            p.translate(552, 148);
            p.rectMode(p.CENTER);
            p.fill('#cbd5e1');
            p.stroke('#64748b');
            p.strokeWeight(1.8);
            p.rect(0, 0, 32, 42, 4);
            p.line(-15, -4, 15, -4);
            p.fill('#38bdf8');
            p.noStroke();
            p.rect(-6, 7, 8, 10, 2);
            p.fill('#0f172a');
            p.textAlign(p.CENTER);
            p.textSize(8.5);
            p.textStyle(p.BOLD);
            p.text('[E] FRIDGE 🧊', 0, 30);
            p.pop();
            p.rectMode(p.CORNER);

            // 7. TOP-RIGHT DINING ROOM NOOK + CREDENZA + WALL ART COLLAGE
            // 8 Framed Pictures on top wall
            for (let fi = 0; fi < 4; fi++) {
              p.fill('#475569');
              p.rect(592 + fi * 20, 74, 16, 10, 1);
              p.fill('#e2e8f0');
              p.rect(594 + fi * 20, 76, 12, 6);
            }
            // Brown Wood Credenza / Spellbook Cabinet (626, 102)
            p.fill('#7c4a26');
            p.rect(594, 88, 64, 24, 3);
            p.fill('#fde68a');
            p.rect(618, 94, 14, 10, 1); // Open Spellbook resting on Credenza

            // Dining White Square Rug + Round Dark Wood Table & 4 Chairs (626, 194)
            p.fill('#e7e5e4');
            p.rect(586, 154, 80, 80, 4);
            for (const [cx, cy] of [
              [606, 174],
              [646, 174],
              [606, 214],
              [646, 214]
            ]) {
              p.fill('#5c341d');
              p.circle(cx, cy, 16);
            }
            p.fill('#6b3f24');
            p.circle(626, 194, 42);
            p.fill('#16a34a');
            p.circle(626, 194, 10);

            // 8. CENTRAL WHITE FIREPLACE HEARTH WALL + COMPUTER DESK
            p.fill('#f8fafc');
            p.rect(534, 174, 48, 76, 4);
            p.fill('#334155');
            p.rect(540, 216, 36, 26, 3);
            if (hearthLit) {
              const fFlick = Math.sin(p.frameCount * 0.25) * 3;
              p.fill('#f97316');
              p.ellipse(558, 232, 22 + fFlick, 12);
              p.fill('#fde047');
              p.ellipse(558, 234, 11, 6);
            }

            // Computer Desk & Swivel Chair (480, 268)
            p.fill('#cbd5e1');
            p.rect(456, 250, 48, 22, 3);
            p.fill('#0f172a');
            p.rect(466, 252, 24, 10, 2); // Monitor
            p.fill('#1e293b');
            p.circle(480, 282, 18); // Swivel chair

            // 9. LIVING ROOM AREA RUG, GRAY SOFA, END LAMPS, CREAM ARMCHAIR & CORNER PLANT
            p.fill('#e7e5e4');
            p.rect(524, 344, 106, 94, 4);
            p.fill('#16a34a');
            p.circle(576, 390, 12);
            // Slate-Gray 3-Seat Sofa (576, 474)
            p.fill('#64748b');
            p.rect(530, 456, 92, 38, 6);
            p.fill('#94a3b8');
            p.rect(536, 460, 25, 28, 4);
            p.rect(564, 460, 25, 28, 4);
            p.rect(592, 460, 25, 28, 4);
            // Wood End Tables & Warm Lamps
            for (const ex of [512, 640]) {
              p.fill('#7c4a26');
              p.circle(ex, 476, 22);
              p.fill(floorLampOn ? '#fde047' : '#475569');
              p.circle(ex, 476, 11);
            }
            // Cream Accent Armchair (638, 394)
            p.fill('#d6d3d1');
            p.rect(620, 376, 36, 36, 7);
            p.fill('#e7e5e4');
            p.rect(625, 381, 22, 26, 5);
            // Bottom-Right Potted Plant (662, 478)
            p.fill('#78350f');
            p.circle(662, 478, 18);
            p.fill('#16a34a');
            p.circle(657, 474, 13);
            p.circle(667, 474, 13);
            p.fill('#22c55e');
            p.circle(662, 482, 12);

            // Crisp White Interior Partition Walls matching Architectural Plan
            p.fill('#f8fafc');
            p.rect(110, 64, 576, 8); // Top outer wall
            p.rect(90, 244, 198, 8); // Top-left partition between Bedroom 1 & Bedroom 2
            p.rect(280, 244, 8, 260); // Bedroom 2 right wall
            p.rect(280, 366, 154, 8); // Bath 2 top wall
            p.rect(426, 366, 8, 138); // Bath 2 right wall
            p.rect(426, 64, 8, 188); // Kitchen left wall
            p.rect(338, 64, 6, 186); // Bath 1 left wall
            p.rect(110, 64, 8, 186); // Bedroom 1 left wall
            p.rect(90, 244, 8, 260); // Bedroom 2 left wall
            p.rect(90, 498, 360, 8); // Bottom wall left of front door
            p.rect(488, 498, 198, 8); // Bottom wall right of front door
            p.rect(678, 64, 8, 442); // Right balcony wall

            // Double Sunlit Glass Patio Doors on Right Wall
            p.fill('#bae6fd');
            p.rect(679, 174, 6, 108);
            p.rect(679, 326, 6, 124);
            p.fill(254, 249, 195, roomLightsOn ? 24 : 8);
            p.quad(678, 174, 678, 282, 608, 304, 608, 190);
            p.quad(678, 326, 678, 450, 610, 466, 610, 342);

            // Wall Light Switch Box (438, 310)
            p.fill('#e2e8f0');
            p.rect(433, 302, 10, 16, 2);
            p.fill(roomLightsOn ? '#facc15' : '#475569');
            p.circle(438, 310, 5);

            // Contextual Hints in 2-Person Multiplayer House
            if (isNear(552, 148, 56)) {
              contextualHint = { x: 552, y: 112, text: '[E] Open Fridge · Eat Bought Food 🍽️' };
            } else if (isNear(192, 172, 58)) {
              contextualHint = { x: 192, y: 120, text: '[E] Rest · [F] Sleep (Bedroom 1)' };
            } else if (isNear(186, 424, 58)) {
              contextualHint = { x: 186, y: 372, text: '[E] Rest · [F] Sleep (Bedroom 2)' };
            } else if (isNear(626, 102, 56)) {
              contextualHint = { x: 626, y: 70, text: '[E] Open Spellbook & Power Hints 📖' };
            } else if (isNear(558, 228, 56)) {
              contextualHint = { x: 558, y: 188, text: `[E / F] ${hearthLit ? 'Bank' : 'Light'} Fireplace` };
            } else if (isNear(480, 268, 56)) {
              contextualHint = { x: 480, y: 232, text: '[E] Desk Arcade Minigame' };
            } else if (isNear(576, 474, 56)) {
              contextualHint = { x: 576, y: 438, text: '[E] Sit on Living Room Sofa' };
            } else if (isNear(638, 394, 56)) {
              contextualHint = { x: 638, y: 358, text: '[E] Sit in Armchair' };
            } else if (isNear(626, 194, 56)) {
              contextualHint = { x: 626, y: 152, text: '[E] Sit at Dining Table' };
            } else if (isNear(408, 444, 56)) {
              contextualHint = { x: 408, y: 392, text: '[E] Take Warm Bath (+25 HP/Mana)' };
            } else if (isNear(438, 310, 48)) {
              contextualHint = { x: 438, y: 280, text: `[E / L] Room Lights: ${roomLightsOn ? 'ON' : 'OFF'}` };
            } else if (isNear(662, 478, 50) || isNear(136, 98, 50) || isNear(120, 282, 50)) {
              contextualHint = { x: playerX, y: playerY - 36, text: `[E / F] Water Plant (${plantWaterLevel}/3)` };
            }

            drawSecretSparkle(626, 102, 'spot_house_floor');
            drawSecretSparkle(558, 228, 'spot_house_chimney');
            drawDoor(458, 498, '[E] EXIT TOWN', '#f59e0b');
          } else {
          const hCfg: HouseConfig = stats.houseConfig;
          p.background(10, 14, 24);

          // Outer subtle house shadow
          p.noStroke();
          p.fill(0, 0, 0, 110);
          p.rect(101, 58, 598, 463, 18);

          // Room Walls & Floor
          p.fill(hCfg.wallColor);
          p.rect(105, 60, 590, 455, 16);

          const floorClr =
            hCfg.floorTheme === 'herringbone_warm'
              ? '#cbd5e1'
              : hCfg.floorTheme === 'oak_wood'
              ? '#9a6536'
              : hCfg.floorTheme === 'marble'
              ? '#e2e8f0'
              : '#334155';
          p.fill(floorClr);
          p.rect(128, 115, 544, 378, 8);

          p.stroke('#00000014');
          p.strokeWeight(1.5);
          for (let fx = 138; fx < 660; fx += 34) {
            p.line(fx, 115, fx, 493);
          }

          // Warm overhead room wash when main lights are ON
          p.noStroke();
          if (roomLightsOn) {
            p.fill(254, 243, 199, 26);
            p.rect(128, 115, 544, 378, 8);
          }

          // Twin Windows with Purple Blinds + Daylight vs Night Sky
          for (const wx of [265, 340]) {
            p.fill('#f1f5f9');
            p.rect(wx, 72, 46, 40, 4);
            p.fill('#635ea8');
            p.rect(wx + 4, 76, 38, 22, 2);
            p.fill(roomLightsOn ? '#fef08a' : '#0f172a');
            p.rect(wx + 4, 98, 38, 10);
            if (roomLightsOn) {
              p.fill(254, 240, 138, 28);
              p.quad(wx + 4, 112, wx + 42, 112, wx + 100, 290, wx + 45, 290);
            }
          }

          // Wall Light Switch Box
          p.fill('#e2e8f0');
          p.rect(389, 106, 12, 18, 3);
          p.fill(roomLightsOn ? '#facc15' : '#475569');
          p.circle(395, 115, 6);
          if (isNear(395, 118, 52)) {
            contextualHint = { x: 395, y: 86, text: `[E / L] Room Lights: ${roomLightsOn ? 'ON' : 'OFF'}` };
          }

          // Placed Cozy Furniture with Interactive Graphics
          for (const item of hCfg.furniture) {
            if (!item.placed) continue;
            p.push();
            p.translate(item.x, item.y);
            p.rectMode(p.CENTER);
            if (item.type === 'rug') {
              p.fill('#4d9b85');
              p.ellipse(0, 0, 170, 96);
              p.noFill();
              p.stroke('#c27a52');
              p.strokeWeight(5);
              p.ellipse(0, 0, 134, 72);
            } else if (item.type === 'bed') {
              p.fill('#d99b66');
              p.rect(0, 0, 96, 62, 10);
              p.fill('#f8fafc');
              p.rect(-24, 0, 32, 48, 6);
              p.fill(item.color);
              p.rect(14, 0, 56, 52, 8);
              p.fill('#eab308');
              p.ellipse(10, -2, 18, 14);
            } else if (item.type === 'sofa') {
              // Plush Velvet Reading Sofa with armrests & cushions
              p.fill('#3b0764');
              p.rect(0, -14, 92, 16, 6);
              p.fill(item.color);
              p.rect(0, 4, 88, 34, 8);
              p.fill('#c4b5fd');
              p.rect(-22, 4, 34, 24, 5);
              p.rect(22, 4, 34, 24, 5);
              p.fill('#4c1d95');
              p.rect(-44, 2, 12, 38, 5);
              p.rect(44, 2, 12, 38, 5);
            } else if (item.type === 'fireplace') {
              p.fill('#8b83a8');
              p.rect(0, -4, 92, 54, 6);
              p.fill('#d9a06b');
              p.rect(0, -22, 98, 14, 4);
              p.fill('#1e1b4b');
              p.rect(0, 6, 48, 28, 4);
              if (hearthLit) {
                const fFlicker = Math.sin(p.frameCount * 0.25) * 3;
                p.fill('#f97316');
                p.ellipse(0, 11, 24 + fFlicker, 12);
                p.fill('#fde047');
                p.ellipse(0, 12, 12, 7);
              } else {
                p.fill('#78350f');
                p.rect(0, 12, 24, 6, 2);
              }
            } else if (item.type === 'beanbag') {
              p.fill(item.color);
              p.ellipse(0, 0, 48, 38);
            } else if (item.type === 'floor_lamp') {
              p.fill(floorLampOn ? '#a78bfa' : '#475569');
              p.circle(0, 0, 26);
              if (floorLampOn) {
                p.fill(254, 240, 138, 65);
                p.circle(0, 0, 64 + Math.sin(p.frameCount * 0.1) * 4);
              }
            } else if (item.type === 'nightstand') {
              p.fill('#c0834d');
              p.circle(0, 0, 30);
              p.fill(nightstandLampOn ? '#eab308' : '#475569');
              p.circle(0, -4, 15);
              if (nightstandLampOn) {
                p.fill(250, 204, 21, 55);
                p.circle(0, -4, 40);
              }
            } else if (item.type === 'plant') {
              // Ceramic Pot & Soil
              p.fill('#d97706');
              p.rect(0, 7, 22, 15, 4);
              p.fill('#b45309');
              p.rect(0, -1, 26, 5, 2);
              p.fill('#451a03');
              p.ellipse(0, -2, 20, 6);

              // Leaves grow larger & richer with watering
              p.fill(plantWaterLevel >= 1 ? '#16a34a' : '#22c55e');
              const lush = 1 + plantWaterLevel * 0.16;
              p.ellipse(-9 * lush, -7, 16 * lush, 9 * lush);
              p.ellipse(9 * lush, -7, 16 * lush, 9 * lush);
              p.ellipse(0, -14, 12 * lush, 18 * lush);
              if (plantWaterLevel >= 2) {
                p.fill('#15803d');
                p.ellipse(-6, -15, 11, 13);
                p.ellipse(6, -15, 11, 13);
              }

              // Blooming Fragrant Flowers (Stage 2 buds -> Stage 3 full flowers!)
              if (plantWaterLevel === 2) {
                p.fill('#f9a8d4');
                p.circle(-7, -12, 5);
                p.circle(8, -11, 5);
              }
              if (plantWaterLevel >= 3 && plantHasFlowers) {
                for (const [fx, fy, petalClr] of [
                  [-10, -16, '#f472b6'],
                  [9, -15, '#c084fc'],
                  [0, -23, '#fb7185']
                ] as const) {
                  p.fill(petalClr);
                  p.circle(fx - 3, fy, 5);
                  p.circle(fx + 3, fy, 5);
                  p.circle(fx, fy - 3, 5);
                  p.circle(fx, fy + 3, 5);
                  p.fill('#fde047');
                  p.circle(fx, fy, 4);
                }
              }

              // Ripe Sunberry Fruit Ready to Eat at Stage 3!
              if (plantWaterLevel >= 3 && plantHasFruit) {
                for (const [rx, ry] of [[-7, -7], [8, -6], [1, -12]]) {
                  p.fill('#dc2626');
                  p.circle(rx, ry, 7);
                  p.fill('#fecaca');
                  p.circle(rx - 1.5, ry - 1.5, 2.2);
                }
              }

              // Water splash rings on the plant while watering!
              if (playerPose === 'watering_plant' || wateringCanTimer > 0) {
                const splashR = (p.frameCount * 0.9) % 18;
                p.noFill();
                p.stroke('#7dd3fc');
                p.strokeWeight(1.5);
                p.ellipse(0, -4, 8 + splashR, 4 + splashR * 0.4);
                p.noStroke();
              }
            } else if (item.type === 'bookshelf') {
              // Oak Bookcase with 2 shelves of colorful spellbooks
              p.fill('#78350f');
              p.rect(0, 0, 74, 46, 5);
              p.fill('#451a03');
              p.rect(0, -10, 66, 15, 2);
              p.rect(0, 10, 66, 15, 2);
              const spineColors = ['#ef4444', '#38bdf8', '#eab308', '#a855f7', '#10b981', '#f97316', '#ec4899'];
              for (let b = 0; b < 7; b++) {
                p.fill(spineColors[b]);
                p.rect(-27 + b * 9, -10, 7, 13, 1);
                p.fill(spineColors[(b + 3) % spineColors.length]);
                p.rect(-27 + b * 9, 10, 7, 13, 1);
              }
              p.fill('#fde68a');
              p.rect(-9, -12, 5, 2);
              p.rect(9, 8, 5, 2);
            } else if (item.type === 'fridge') {
              // Sleek Stainless Steel Double-Door Fridge
              p.fill('#cbd5e1');
              p.stroke('#475569');
              p.strokeWeight(1.8);
              p.rect(0, 0, 44, 52, 6);
              p.line(-21, -6, 21, -6);
              p.line(0, -25, 0, -6);
              p.noStroke();
              p.fill('#64748b');
              p.rect(-15, -15, 3, 12, 1);
              p.rect(15, -15, 3, 12, 1);
              p.rect(-15, 10, 3, 20, 1);
              p.fill('#38bdf8');
              p.rect(9, 8, 10, 14, 2);
            } else if (item.type === 'arcade') {
              p.fill('#0f172a');
              p.rect(0, 0, 46, 52, 6);
              p.fill('#06b6d4');
              p.rect(0, -8, 32, 22, 3);
              p.fill('#fde047');
              p.circle(-7, 13, 5);
              p.circle(7, 13, 5);
            } else {
              p.fill(item.color);
              p.rect(0, 0, 68, 40, 7);
            }
            p.noStroke();
            p.fill('#0f172a');
            if (hCfg.floorTheme === 'slate_stone' || !roomLightsOn) p.fill('#f8fafc');
            p.textAlign(p.CENTER);
            p.textSize(9);
            p.textStyle(p.BOLD);
            const plantTag =
              plantWaterLevel >= 3 && (plantHasFruit || plantHasFlowers)
                ? `${plantHasFruit ? '[E] EAT FRUIT' : ''}${plantHasFruit && plantHasFlowers ? ' · ' : ''}${plantHasFlowers ? '[F] SMELL FLOWERS' : ''}`
                : `[E/F] WATER PLANT (${plantWaterLevel}/3)`;
            const tag =
              item.type === 'arcade'
                ? '[E] PLAY ARCADE'
                : item.type === 'fridge'
                ? '[E] OPEN FRIDGE 🧊'
                : item.type === 'bookshelf'
                ? '[E] READ BOOK'
                : item.type === 'bed'
                ? '[E] REST · [F] SLEEP'
                : item.type === 'sofa' || item.type === 'beanbag'
                ? '[E] SIT'
                : item.type === 'floor_lamp' || item.type === 'nightstand'
                ? '[E] LIGHT ON/OFF'
                : item.type === 'plant'
                ? plantTag
                : item.name;
            p.text(tag, 0, 38);
            p.pop();

            if (isNear(item.x, item.y, 64)) {
              const plantPrompt =
                plantWaterLevel >= 3 && (plantHasFruit || plantHasFlowers)
                  ? `${plantHasFruit ? '[E] Eat Ripe Fruit 🍓' : ''}${plantHasFruit && plantHasFlowers ? ' · ' : ''}${plantHasFlowers ? '[F] Smell Flowers 🌸' : ''}`
                  : `[E / F] Water ${item.name} (${plantWaterLevel}/3)`;
              const prompt =
                item.type === 'bed'
                  ? `[E] Lay & Rest · [F] Sleep in ${item.name}`
                  : item.type === 'fridge'
                  ? `[E] Open ${item.name} · Eat Bought Food 🍽️`
                  : item.type === 'bookshelf'
                  ? `[E / F] Open Spellbook & Power Hints 📖`
                  : item.type === 'sofa' || item.type === 'beanbag'
                  ? `[E] Sit on ${item.name}`
                  : item.type === 'floor_lamp' || item.type === 'nightstand'
                  ? `[E / F] Toggle ${item.name}`
                  : item.type === 'plant'
                  ? plantPrompt
                  : item.type === 'fireplace'
                  ? `[E / F] ${hearthLit ? 'Bank' : 'Light'} Hearth Fire`
                  : `[E] Use ${item.name}`;
              contextualHint = { x: item.x, y: item.y - 40, text: prompt };
            }
          }

          p.rectMode(p.CORNER);
          drawSecretSparkle(185, 145, 'spot_house_floor');
          drawSecretSparkle(525, 155, 'spot_house_chimney');
          drawDoor(400, 480, '[E] EXIT TOWN', '#f59e0b');
          }
        } else if (q.currentZone === 'playground') {
          p.background(18, 42, 28);
          p.noStroke();
          p.fill('#15803d');
          p.rect(95, 65, 610, 460, 16);

          // Swings
          const swOff = Math.sin(p.frameCount * 0.08) * 16;
          p.fill('#78350f');
          p.rect(162, 155, 96, 8, 3);
          p.fill('#eab308');
          p.rect(180 + swOff, 178, 22, 14, 3);
          p.rect(222 - swOff, 178, 22, 14, 3);
          p.fill('#fff');
          p.textAlign(p.CENTER);
          p.textSize(9.5);
          p.text('[E] SWING · [F] NEST', 210, 226);

          // Spinning Merry-Go-Round
          p.push();
          p.translate(400, 220);
          p.rotate(p.frameCount * 0.055);
          p.fill('#10b981');
          p.circle(0, 0, 80);
          for (let a = 0; a < 4; a++) {
            p.rotate(p.HALF_PI);
            p.stroke('#fef08a');
            p.strokeWeight(3);
            p.line(0, 0, 38, 0);
          }
          p.pop();
          p.noStroke();
          p.fill('#fff');
          p.text('[E] SPIN · [F] STAR GAME', 400, 276);

          // Comet Slide (with detailed diagonal slide chute!)
          p.fill('#0369a1');
          p.rect(548, 145, 32, 30, 5); // Ladder platform
          p.fill('#38bdf8');
          p.quad(560, 155, 580, 155, 642, 226, 616, 226); // Chute
          p.fill('#bae6fd');
          p.line(570, 158, 629, 225);
          p.fill('#fff');
          p.text('[E] SLIDE DOWN · [F] GAME', 592, 245);

          // Golden Sandbox
          p.fill('#f59e0b');
          p.rect(135, 360, 140, 90, 10);
          p.fill('#fbbf24');
          p.circle(205, 405, 32);
          p.fill('#fff');
          p.text('[E] DIG SANDBOX', 205, 462);

          if (isNear(590, 195, 72)) contextualHint = { x: 592, y: 128, text: '[E] Slide Down! · [F] Comet Star Catcher' };
          else if (isNear(210, 175, 65)) contextualHint = { x: 210, y: 138, text: '[E] Ride Swing · [F] Canopy Secret' };
          else if (isNear(400, 220, 66)) contextualHint = { x: 400, y: 162, text: '[E] Spin Ride · [F] Star Catcher Game' };

          drawButterfly(310, 310, '#facc15', 1);
          drawButterfly(500, 340, '#f472b6', 3);
          const pgNpcs = getPlaygroundNPCPositions(p.frameCount);
          drawWalkingNPC({
            x: pgNpcs.toby.x,
            y: pgNpcs.toby.y,
            facing: Math.cos(p.frameCount * 0.024) >= 0 ? 1 : -1,
            isWalking: true,
            walkPhase: p.frameCount * 0.24,
            skinTone: '#ffdbac',
            hairColor: '#92400e',
            hairStyle: 'spiky',
            topColor: '#38bdf8',
            pantsColor: '#1e3a8a',
            label: 'Toby'
          });
          drawWalkingNPC({
            x: pgNpcs.maya.x,
            y: pgNpcs.maya.y,
            facing: Math.cos(p.frameCount * 0.02 + 2.1) >= 0 ? 1 : -1,
            isWalking: true,
            walkPhase: p.frameCount * 0.22 + 0.9,
            skinTone: '#c68642',
            hairColor: '#1c1917',
            hairStyle: 'ponytail',
            topColor: '#f472b6',
            pantsColor: '#4c1d95',
            dress: true,
            label: 'Maya'
          });
          if (isNear(pgNpcs.toby.x, pgNpcs.toby.y, 56)) {
            contextualHint = { x: pgNpcs.toby.x, y: pgNpcs.toby.y - 42, text: '[E] Talk to Toby 💬' };
          } else if (isNear(pgNpcs.maya.x, pgNpcs.maya.y, 56)) {
            contextualHint = { x: pgNpcs.maya.x, y: pgNpcs.maya.y - 42, text: '[E] Talk to Maya 💬' };
          }
          drawSecretSparkle(210, 175, 'spot_playground_swing');
          drawSecretSparkle(205, 405, 'spot_playground_sandbox');
          drawSecretSparkle(590, 195, 'spot_playground_stars');
          drawDoor(400, 495, '[E] EXIT TOWN', '#f59e0b');
        } else if (q.currentZone === 'hospital') {
          p.background(14, 24, 38);
          p.noStroke();
          p.fill('#0f172a');
          p.rect(100, 65, 600, 460, 14);
          p.fill('#1e293b');
          p.rect(120, 85, 560, 420, 8);

          p.fill('#0284c7');
          p.rect(355, 92, 90, 26, 5);
          p.stroke('#34d399');
          p.strokeWeight(2);
          const pulseX = 362 + ((p.frameCount * 2) % 76);
          p.line(360, 105, pulseX, 105);
          p.noStroke();

          p.fill('#38bdf8');
          p.rect(325, 145, 150, 32, 6);
          drawWalkingNPC({
            x: 400,
            y: 129,
            facing: 1,
            isWalking: false,
            skinTone: '#ffdbac',
            hairColor: '#db2777',
            hairStyle: 'nurse_cap',
            topColor: '#f8fafc',
            pantsColor: '#e2e8f0',
            dress: true,
            prop: 'medical'
          });
          const hospNpcs = getHospitalNPCPositions(p.frameCount);
          drawWalkingNPC({
            x: hospNpcs.eli.x,
            y: hospNpcs.eli.y,
            facing: Math.cos(p.frameCount * 0.019) >= 0 ? 1 : -1,
            isWalking: true,
            walkPhase: p.frameCount * 0.19,
            skinTone: '#f1c27d',
            hairColor: '#334155',
            hairStyle: 'short',
            topColor: '#e0f2fe',
            pantsColor: '#0f172a',
            prop: 'medical',
            label: 'Medic Eli'
          });
          if (isNear(hospNpcs.eli.x, hospNpcs.eli.y, 56)) {
            contextualHint = { x: hospNpcs.eli.x, y: hospNpcs.eli.y - 42, text: '[E] Talk to Medic Eli 💬' };
          } else if (isNear(400, 175, 65)) {
            contextualHint = { x: 400, y: 112, text: '[E] Talk & Heal with Nurse Clara 💬' };
          }
          p.fill('#fff');
          p.textAlign(p.CENTER);
          p.textSize(10);
          p.text('[E] NURSE CLARA (HEAL & TIPS)', 400, 195);

          p.fill('#0369a1');
          p.rect(155, 135, 68, 52, 6);
          p.fill('#e2e8f0');
          p.rect(565, 140, 75, 44, 5);

          p.fill('#065f46');
          p.rect(165, 315, 110, 56, 8);
          p.fill('#34d399');
          p.circle(195, 343, 16);
          p.fill('#38bdf8');
          p.circle(225, 343, 16);
          p.fill('#facc15');
          p.circle(255, 343, 16);
          p.fill('#fff');
          p.text('[E] ELIXIR MIX LAB', 220, 390);

          drawSecretSparkle(610, 165, 'spot_hospital_curtain');
          drawSecretSparkle(185, 165, 'spot_hospital_cabinet');
          drawSecretSparkle(220, 345, 'spot_hospital_lab');
          drawDoor(400, 495, '[E] EXIT TOWN', '#f59e0b');
        } else if (q.currentZone === 'superstore') {
          // Bright Modern Supermarket Interior matching the reference image:
          // Warm light-oak wood plank floor, glass front wall, red-framed display shelves, SAVE 10% tags, packed snacks & chilled foods
          p.background(214, 218, 224);
          p.noStroke();
          // Bright store walls & sunlit glass front
          p.fill('#e2e8f0');
          p.rect(100, 60, 600, 470, 14);
          // Front glass windows along upper wall
          p.fill('#bae6fd');
          p.rect(120, 68, 560, 46, 6);
          p.stroke('#94a3b8');
          p.strokeWeight(2);
          for (let mx = 170; mx <= 630; mx += 75) {
            p.line(mx, 68, mx, 114);
          }
          p.noStroke();

          // Warm Light-Wood Plank Flooring
          p.fill('#d4a373');
          p.rect(112, 118, 576, 396, 8);
          p.stroke('#bc8a5f');
          p.strokeWeight(1);
          for (let py = 132; py < 514; py += 16) {
            p.line(112, py, 688, py);
          }
          for (let px = 148; px < 680; px += 48) {
            p.line(px, 118, px, 514);
          }
          p.noStroke();

          // Architectural Concrete Columns (matching center pillars in reference image)
          p.fill('#cbd5e1');
          p.rect(325, 68, 20, 56, 2);
          p.rect(485, 68, 20, 56, 2);

          // Red-Framed Left Display Rack, Center Island Rack, and Right Chilled Deli Rack
          const drawRedShelfBank = (sx: number, sy: number, sw: number, sh: number, label: string) => {
            p.fill('#b91c1c');
            p.rect(sx - 3, sy - 3, sw + 6, sh + 6, 5);
            p.fill('#f1f5f9');
            p.rect(sx, sy + 5, sw, sh - 10, 3);
            p.fill('#dc2626');
            p.rect(sx - 2, sy - 2, sw + 4, 10, 3);
            p.fill('#ffffff');
            p.textAlign(p.CENTER);
            p.textSize(7.5);
            p.textStyle(p.BOLD);
            p.text(label, sx + sw / 2, sy + 6);
          };

          drawRedShelfBank(128, 192, 92, 206, 'COOKIES & SNACKS');
          drawRedShelfBank(348, 226, 104, 128, 'BAKERY & FRUIT');
          drawRedShelfBank(580, 192, 92, 206, 'DELI & CHILLED');

          // Render Lots of Colorful Food & Grocery Items on Display + SAVE 10% Red Signs!
          let hoveredShelfItem: SuperstoreShelfItem | null = null;
          let hoveredShelfDist = 48;
          for (const item of SUPERSTORE_SHELF_ITEMS) {
            const ix = item.x;
            const iy = item.y;

            // Shelf tier shadow strip
            p.fill('#cbd5e1');
            p.rect(ix - 24, iy + 11, 48, 4, 1);

            if (item.kind === 'box') {
              p.fill(item.color);
              p.rect(ix - 18, iy - 13, 16, 24, 2);
              p.rect(ix + 1, iy - 13, 16, 24, 2);
              p.fill(item.accentColor);
              p.rect(ix - 15, iy - 8, 10, 9, 1);
              p.rect(ix + 4, iy - 8, 10, 9, 1);
            } else if (item.kind === 'fish') {
              p.fill('#f8fafc');
              p.rect(ix - 19, iy - 10, 38, 20, 3);
              p.fill(item.color);
              p.ellipse(ix - 6, iy, 16, 9);
              p.ellipse(ix + 9, iy, 14, 8);
              p.stroke(item.accentColor);
              p.strokeWeight(1);
              p.line(ix - 11, iy - 2, ix - 2, iy + 2);
              p.line(ix + 4, iy - 2, ix + 13, iy + 2);
              p.noStroke();
            } else if (item.kind === 'cheese') {
              p.fill('#f8fafc');
              p.rect(ix - 19, iy - 10, 38, 20, 3);
              p.fill(item.color);
              p.triangle(ix - 15, iy + 7, ix - 3, iy - 7, ix + 2, iy + 7);
              p.triangle(ix + 1, iy + 7, ix + 13, iy - 7, ix + 17, iy + 7);
            } else if (item.kind === 'bottle') {
              for (const bx of [-12, 0, 12]) {
                p.fill(item.color);
                p.rect(ix + bx - 4, iy - 9, 8, 19, 3);
                p.fill(item.accentColor);
                p.rect(ix + bx - 3, iy - 2, 6, 6, 1);
                p.fill('#ffffff');
                p.rect(ix + bx - 2.5, iy - 13, 5, 4, 1);
              }
            } else if (item.kind === 'bread') {
              p.fill('#fef3c7');
              p.rect(ix - 18, iy - 8, 36, 18, 3);
              p.fill(item.color);
              p.ellipse(ix - 7, iy, 14, 9);
              p.ellipse(ix + 8, iy, 14, 9);
            } else if (item.kind === 'apple') {
              p.fill('#92400e');
              p.rect(ix - 18, iy - 9, 36, 19, 3);
              for (const ax of [-10, 0, 10]) {
                p.fill(item.color);
                p.circle(ix + ax, iy - 1, 8.5);
                p.fill(item.accentColor);
                p.ellipse(ix + ax + 2, iy - 6, 4, 2.5);
              }
            } else {
              // Ice cream tubs
              p.fill(item.color);
              p.rect(ix - 16, iy - 10, 14, 19, 3);
              p.rect(ix + 2, iy - 10, 14, 19, 3);
              p.fill('#ffffff');
              p.rect(ix - 17, iy - 12, 16, 4, 2);
              p.rect(ix + 1, iy - 12, 16, 4, 2);
            }

            // Red "SAVE 10%" Hanging Sign matching reference image!
            if (item.saleTag) {
              p.fill('#dc2626');
              p.rect(ix + 14, iy - 17, 25, 13, 2);
              p.fill('#fef08a');
              p.textAlign(p.CENTER);
              p.textSize(5.8);
              p.textStyle(p.BOLD);
              p.text('SAVE 10%', ix + 26.5, iy - 8.5);
            }

            // Tiny Item Nameplate
            p.fill('#1e293b');
            p.textAlign(p.CENTER);
            p.textSize(7);
            p.text(`${item.name} · ${item.costAP}AP`, ix, iy + 22);

            const sd = Math.hypot(playerX - ix, playerY - iy);
            if (sd < hoveredShelfDist) {
              hoveredShelfDist = sd;
              hoveredShelfItem = item;
            }
          }

          // Top Red Checkout Counters (matching reference image rear checkouts)
          p.fill('#dc2626');
          p.rect(195, 128, 92, 30, 5);
          p.fill('#1e293b');
          p.rect(205, 132, 42, 12, 2);
          p.fill('#ffffff');
          p.textAlign(p.CENTER);
          p.textSize(8.5);
          p.textStyle(p.BOLD);
          p.text(
            cartItems.length > 0 ? `[E] CHECKOUT (${cartItems.length}) · [F] AP SHOP` : '[E] AP SHOP · CHECKOUT',
            241,
            170
          );

          p.fill('#dc2626');
          p.rect(374, 128, 92, 30, 5);
          p.fill('#38bdf8');
          p.rect(384, 132, 38, 12, 2);
          p.fill('#0f172a');
          p.text('[E] SHELF MEMORY GAME', 420, 170);

          // Upper-right Stockroom Crates & Bottom-right Chilled Freezer Chest
          p.fill('#78350f');
          p.rect(596, 116, 68, 42, 4);
          p.fill('#92400e');
          p.rect(604, 122, 22, 22, 2);
          p.rect(632, 124, 24, 20, 2);

          p.fill('#0284c7');
          p.rect(584, 434, 82, 36, 6);
          p.fill('#bae6fd');
          p.rect(590, 440, 70, 22, 4);
          p.fill('#0f172a');
          p.textSize(7.5);
          p.text('[E] FROZEN CHEST', 625, 480);

          const storeNpcs = getSuperstoreNPCPositions(p.frameCount);
          drawWalkingNPC({
            x: storeNpcs.nia.x,
            y: storeNpcs.nia.y,
            facing: Math.cos(p.frameCount * 0.017) >= 0 ? 1 : -1,
            isWalking: true,
            walkPhase: p.frameCount * 0.18,
            skinTone: '#ffdbac',
            hairColor: '#b45309',
            hairStyle: 'bun',
            topColor: '#f8fafc',
            pantsColor: '#78350f',
            prop: 'basket',
            label: 'Shopper Nia'
          });

          if (isNear(storeNpcs.nia.x, storeNpcs.nia.y, 54)) {
            contextualHint = { x: storeNpcs.nia.x, y: storeNpcs.nia.y - 42, text: '[E] Talk to Shopper Nia 💬' };
          } else if (isNear(240, 148, 66)) {
            contextualHint = {
              x: 240,
              y: 112,
              text:
                cartItems.length > 0
                  ? `[E] Pay & Checkout ${cartItems.length} Cart Items · [F] AP Gear Shop`
                  : '[E] Open Arcane AP Gear Shop'
            };
          } else if (hoveredShelfItem) {
            contextualHint = {
              x: hoveredShelfItem.x,
              y: hoveredShelfItem.y - 26,
              text: hasShoppingCart
                ? `[E] Reach & Put ${hoveredShelfItem.name} in Cart (${hoveredShelfItem.costAP} AP)`
                : `Grab a Cart Outside Superstore Door First! 🛒`
            };
          }

          drawSecretSparkle(630, 132, 'spot_superstore_crates');
          drawSecretSparkle(625, 452, 'spot_superstore_freezer');
          drawSecretSparkle(420, 148, 'spot_superstore_memory');
          drawDoor(400, 495, '[E] EXIT TOWN', '#f59e0b');
        } else if (q.currentZone === 'hills') {
          p.background(14, 32, 20);
          p.fill('#14532d');
          p.rect(90, 65, 620, 465, 16);
          p.fill('#78350f');
          p.rect(370, 95, 60, 420);
          p.rect(135, 265, 480, 50);

          // Standing Stone Ring
          p.fill('#64748b');
          for (let a = 0; a < 6; a++) {
            const ang = (p.TWO_PI / 6) * a;
            p.circle(220 + Math.cos(ang) * 32, 145 + Math.sin(ang) * 26, 12);
          }
          // Hollow Oak Tree
          p.fill('#451a03');
          p.circle(620, 195, 48);

          // Miner's Pickaxe Rack
          p.fill('#7c2d12');
          p.rect(468, 258, 54, 48, 8);
          p.fill('#94a3b8');
          p.rect(483, 272, 24, 6, 2);
          p.fill('#78350f');
          p.rect(493, 276, 5, 20);
          p.fill('#fff');
          p.textAlign(p.CENTER);
          p.textSize(9.5);
          p.text(stats.hasPickaxe ? 'PICKAXE OWNED ✓' : '[E] GRAB PICKAXE ⛏', 495, 322);

          // Cracked Hillside Boulder -> Underground Crystal Cavern!
          if (!mineEntranceOpen) {
            p.fill('#475569');
            p.ellipse(620, 315, 64, 52);
            p.stroke('#38bdf8');
            p.strokeWeight(2);
            p.line(605, 300, 625, 320);
            p.line(625, 320, 615, 336);
            p.noStroke();
            p.fill('#fde047');
            p.textSize(9.5);
            p.text(stats.hasPickaxe ? '[E / F] MINE TUNNEL ⛏' : 'NEED PICKAXE ⛏', 620, 355);
          } else {
            p.fill('#090d16');
            p.ellipse(620, 315, 60, 50);
            p.noFill();
            p.stroke('#34d399');
            p.strokeWeight(3);
            p.ellipse(620, 315, 62, 52);
            p.noStroke();
            p.fill('#6ee7b7');
            p.textSize(9.5);
            p.text('[E] GO UNDERGROUND 💎', 620, 355);
          }

          // Hills Warden NPC: Ranger Rowan + Ancient Sorceress Vespera (2/3)
          const hillsNpcs = getHillsNPCPositions(p.frameCount);
          drawWalkingNPC({
            x: hillsNpcs.rowan.x,
            y: hillsNpcs.rowan.y,
            facing: Math.cos(p.frameCount * 0.016) >= 0 ? 1 : -1,
            isWalking: true,
            walkPhase: p.frameCount * 0.18,
            skinTone: '#e0ac69',
            hairColor: '#14532d',
            hairStyle: 'short',
            topColor: '#15803d',
            pantsColor: '#3f6212',
            cloakColor: '#166534',
            prop: 'satchel',
            label: 'Ranger Rowan'
          });
          drawWalkingNPC({
            x: hillsNpcs.vespera.x,
            y: hillsNpcs.vespera.y,
            facing: -Math.sin(p.frameCount * 0.014) >= 0 ? 1 : -1,
            isWalking: true,
            walkPhase: p.frameCount * 0.14 + 0.8,
            skinTone: '#f1c27d',
            hairColor: '#cbd5e1',
            hairStyle: 'wavy',
            topColor: '#065f46',
            pantsColor: '#064e3b',
            dress: true,
            cloakColor: '#047857',
            prop: 'staff',
            isSorcerer: true,
            wizardHatColor: '#065f46',
            label: 'Sorceress Vespera'
          });

          if (isNear(hillsNpcs.rowan.x, hillsNpcs.rowan.y, 56)) {
            contextualHint = { x: hillsNpcs.rowan.x, y: hillsNpcs.rowan.y - 42, text: '[E] Talk to Ranger Rowan 💬' };
          } else if (isNear(hillsNpcs.vespera.x, hillsNpcs.vespera.y, 56)) {
            contextualHint = { x: hillsNpcs.vespera.x, y: hillsNpcs.vespera.y - 48, text: '[E] Ancient Sorceress Vespera ✨' };
          } else if (isNear(495, 285, 60)) {
            contextualHint = { x: 495, y: 242, text: stats.hasPickaxe ? 'Pickaxe Equipped ✓' : '[E] Pick Up Runic Pickaxe' };
          } else if (isNear(620, 315, 66)) {
            contextualHint = {
              x: 620,
              y: 272,
              text: mineEntranceOpen
                ? '[E] Enter Underground Cavern'
                : stats.hasPickaxe
                ? `[E / F] Break Rock (${2 - boulderDamage} hits left)`
                : 'Grab Pickaxe [E] from Rack first'
            };
          }

          // Meadow Firefly Altar
          p.fill('#166534');
          p.circle(580, 405, 58);
          p.fill('#bef264');
          for (let f = 0; f < 5; f++) {
            p.circle(
              580 + Math.cos(p.frameCount * 0.06 + f) * 24,
              405 + Math.sin(p.frameCount * 0.08 + f * 2) * 20,
              6
            );
          }
          p.fill('#fff');
          p.textSize(10);
          p.text('[E] CATCH FIREFLIES', 580, 448);

          drawSecretSparkle(620, 195, 'spot_hills_hollow');
          drawSecretSparkle(220, 145, 'spot_hills_stones');
          drawSecretSparkle(580, 405, 'spot_hills_fireflies');
          drawDoor(400, 95, '[E] MOUNTAINS', '#38bdf8');
          drawDoor(140, 290, '[E] CATACOMBS', '#ef4444');
          drawDoor(400, 505, '[E] TOWN SQUARE', '#f59e0b');
        } else if (q.currentZone === 'underground_mine') {
          // Subterranean Emerald Crystal Cavern
          p.background(5, 9, 18);
          p.noStroke();
          p.fill('#0f172a');
          p.rect(100, 65, 600, 460, 22);
          p.fill('#1e293b');
          p.rect(125, 90, 550, 410, 16);

          // Glowing Subterranean Tracks
          p.stroke('#475569');
          p.strokeWeight(4);
          p.line(200, 245, 600, 245);
          p.line(400, 180, 400, 470);
          p.noStroke();

          // Warm Lantern Spotlight around hero
          p.fill(56, 189, 248, 22);
          p.circle(playerX, playerY, 160);

          // Deep Geode Excavation Altar (400, 165)
          p.fill('#312e81');
          p.circle(400, 165, 86);
          p.fill('#a855f7');
          p.circle(400, 165, 54 + Math.sin(p.frameCount * 0.1) * 5);
          p.fill('#fde047');
          p.circle(400, 165, 20);
          p.fill('#fff');
          p.textAlign(p.CENTER);
          p.textSize(10);
          p.text('[E] DEEP GEODE EXCAVATION (MINIGAME)', 400, 220);

          // 6 Mineable Crystal Veins
          for (const vein of mineVeins) {
            if (vein.respawnTimer > 0) {
              p.fill('#334155');
              p.ellipse(vein.x, vein.y, 28, 20);
              p.fill('#64748b');
              p.textSize(8.5);
              p.text('Regenerating...', vein.x, vein.y + 22);
              continue;
            }
            const pulse = Math.sin(p.frameCount * 0.12 + vein.x) * 3;
            p.fill(vein.color + '44');
            p.circle(vein.x, vein.y, 44 + pulse);
            p.fill(vein.color);
            p.quad(vein.x, vein.y - 18, vein.x + 14, vein.y, vein.x, vein.y + 18, vein.x - 14, vein.y);
            p.fill('#ffffffaa');
            p.triangle(vein.x, vein.y - 12, vein.x + 6, vein.y - 2, vein.x - 3, vein.y);
            p.fill('#f8fafc');
            p.textSize(9);
            p.text(`[E/F] ${vein.label} (${vein.hp} HP)`, vein.x, vein.y + 28);

            if (isNear(vein.x, vein.y, 60)) {
              contextualHint = { x: vein.x, y: vein.y - 32, text: `[E / F] Mine ${vein.label} ⛏` };
            }
          }

          drawSecretSparkle(400, 165, 'spot_underground_geode');
          drawSecretSparkle(525, 245, 'spot_underground_relic');
          drawDoor(400, 495, '[E] LADDER TO HILLS', '#4ade80');
        } else if (q.currentZone === 'mountains') {
          p.background(12, 24, 38);
          p.fill('#1e293b');
          p.rect(90, 65, 620, 465, 16);

          // Animated Glacial Waterfall
          p.fill(56, 189, 248, 95);
          p.rect(120, 75, 48, 230);
          const wfY = 85 + ((p.frameCount * 2.5) % 210);
          p.fill('#e0f2fe');
          p.rect(134, wfY, 20, 12, 4);

          // Mountain Basecamp Hiking Gear Rack (255, 415)
          p.fill('#7c2d12');
          p.rect(225, 392, 60, 44, 8);
          p.fill('#f59e0b');
          p.circle(243, 412, 12); // Rope coil
          p.fill('#38bdf8');
          p.rect(258, 400, 12, 22, 3); // Crampons/Ice-axe
          p.fill('#fff');
          p.textAlign(p.CENTER);
          p.textSize(9.5);
          p.text(stats.hasHikingGear ? 'HIKING GEAR EQUIPPED ✓' : '[E] HIKING EQUIPMENT 🧗', 255, 452);

          // Sheer Ice Cliff Wall & Rope Route leading up to Summit Minigame
          p.fill('#0c4a6e');
          p.rect(565, 215, 90, 105, 8);
          p.stroke('#bae6fd');
          p.strokeWeight(3);
          p.line(610, 218, 610, 320); // Climbing rope
          for (let ry = 230; ry < 318; ry += 16) {
            p.line(600, ry, 620, ry);
          }
          p.noStroke();
          p.fill('#0284c7');
          p.triangle(570, 215, 610, 145, 650, 215);
          p.fill('#fff');
          p.textSize(9.5);
          p.text('[E / F] SUMMIT TRIAL', 610, 140);
          p.text(stats.hasHikingGear ? '[E] CLIMB CLIFF 🧗' : 'NEED HIKING GEAR', 610, 336);

          if (isNear(255, 415, 64)) {
            contextualHint = {
              x: 255,
              y: 374,
              text: stats.hasHikingGear ? 'Hiking Gear Ready ✓' : '[E] Equip Ice Axes & Rope'
            };
          } else if (isNear(610, 325, 65)) {
            contextualHint = {
              x: 610,
              y: 285,
              text: stats.hasHikingGear ? '[E] Climb Ice Cliff!' : 'Equip Hiking Gear [E] at Basecamp first!'
            };
          } else if (isNear(610, 200, 68)) {
            contextualHint = { x: 610, y: 122, text: '[E / F] Play Summit Ice Ascent Minigame' };
          }

          // Celestial Hot Air Balloon
          const ready = (stats.arenaPowersCount || 0) >= 20 && q.hiddenSpotsFound.length >= 20;
          const bob = Math.sin(p.frameCount * 0.05) * 4;
          p.fill('#78350f');
          p.rect(372, 148 + bob, 36, 22, 4);
          p.fill(ready ? '#f97316' : '#64748b');
          p.circle(390, 140 + bob, 8);
          p.fill(ready ? '#0284c7' : '#334155');
          p.ellipse(390, 106 + bob, 64, 70);
          drawWalkingNPC({
            x: 485,
            y: 152,
            facing: -1,
            isWalking: false,
            skinTone: '#f1c27d',
            hairColor: '#38bdf8',
            hairStyle: 'spiky',
            topColor: '#0284c7',
            pantsColor: '#1e293b',
            cloakColor: '#0ea5e9'
          });
          p.fill('#f8fafc');
          p.textSize(9);
          p.text('[E] Talk to Zephyr', 485, 178);
          p.text(
            ready
              ? '[E] BOARD SKY BALLOON!'
              : `BALLOON LOCKED (${stats.arenaPowersCount || 0}/20 Arena · ${q.hiddenSpotsFound.length}/20 Hidden)`,
            390,
            190
          );
          // Ancient Sorcerer Malakor (3rd of 3 Ancient Sorcerers)
          const mtNpcs = getMountainsNPCPositions(p.frameCount);
          drawWalkingNPC({
            x: mtNpcs.malakor.x,
            y: mtNpcs.malakor.y,
            facing: Math.cos(p.frameCount * 0.013) >= 0 ? 1 : -1,
            isWalking: true,
            walkPhase: p.frameCount * 0.13 + 1.5,
            skinTone: '#ffdbac',
            hairColor: '#f1f5f9',
            hairStyle: 'short',
            topColor: '#7f1d1d',
            pantsColor: '#450a0a',
            cloakColor: '#991b1b',
            prop: 'staff',
            isSorcerer: true,
            wizardHatColor: '#7f1d1d',
            beard: true,
            label: 'Sorcerer Malakor'
          });
          if (isNear(mtNpcs.malakor.x, mtNpcs.malakor.y, 58)) {
            contextualHint = { x: mtNpcs.malakor.x, y: mtNpcs.malakor.y - 48, text: '[E] Ancient Sorcerer Malakor ✨' };
          } else if (isNear(485, 155, 62)) {
            contextualHint = { x: 485, y: 120, text: '[E] Talk to Sky Captain Zephyr 💬' };
          }

          drawSecretSparkle(165, 175, 'spot_mountains_alcove');
          drawSecretSparkle(610, 200, 'spot_mountains_climb');
          drawDoor(400, 505, '[E] EMERALD HILLS', '#4ade80');
        } else if (q.currentZone === 'catacombs') {
          p.background(8, 12, 10);
          p.fill('#0f172a');
          p.stroke('#15803d');
          p.strokeWeight(3);
          p.rect(110, 75, 580, 450, 10);
          drawAnimatedTorch(160, 140, '#22c55e');
          drawAnimatedTorch(640, 140, '#22c55e');
          drawDoor(400, 115, '[E] BLOOD CHAMBER I', '#ef4444');
          drawDoor(400, 515, '[E] EXIT TO HILLS', '#4ade80');
        } else if (
          q.currentZone === 'blood_chamber_1' ||
          q.currentZone === 'blood_chamber_2' ||
          q.currentZone === 'blood_chamber_3'
        ) {
          const cleared =
            q.currentZone === 'blood_chamber_1'
              ? q.bloodChamber1Cleared
              : q.currentZone === 'blood_chamber_2'
              ? q.bloodChamber2Cleared
              : q.bloodChamber3Cleared;
          p.background(18, 6, 8);
          p.fill('#1c0a0d');
          p.stroke('#991b1b');
          p.strokeWeight(3);
          p.rect(120, 75, 560, 445, 10);
          drawAnimatedTorch(160, 140, '#ef4444');
          drawAnimatedTorch(640, 140, '#ef4444');
          p.noStroke();
          p.fill(cleared ? '#10b981' : '#ef4444');
          p.circle(400, 290, 68);
          p.fill('#fff');
          p.textAlign(p.CENTER);
          p.textSize(10);
          p.text(cleared ? 'TRIAL CLEARED ✓' : '[E] START MINIGAME TRIAL', 400, 338);
          drawDoor(400, 105, cleared ? '[E] NEXT CHAMBER' : 'SEALED DOOR', cleared ? '#22c55e' : '#64748b');
          drawDoor(400, 495, '[E] BACK', '#94a3b8');
        } else if (q.currentZone === 'blood_altar') {
          p.background(28, 4, 8);
          p.fill('#450a0a');
          p.circle(400, 230, 106);
          p.fill('#ef4444');
          p.circle(400, 230, 72 + Math.sin(p.frameCount * 0.08) * 6);
          p.fill('#fff');
          p.textAlign(p.CENTER);
          p.textSize(11);
          p.text('[E] CLAIM BLOOD BENDING', 400, 295);
          drawDoor(400, 495, '[E] BACK', '#94a3b8');
        } else if (q.currentZone === 'sky_sanctum') {
          p.background(10, 24, 48);
          p.fill('#0f172a');
          p.stroke('#38bdf8');
          p.strokeWeight(3);
          p.rect(140, 80, 520, 440, 18);
          drawAnimatedTorch(180, 140, '#38bdf8');
          drawAnimatedTorch(620, 140, '#38bdf8');
          drawDoor(400, 115, '[E] SKY CHAMBER I', '#10b981');
          drawDoor(400, 490, '[E] BALLOON TO HILLS', '#38bdf8');
        } else if (
          q.currentZone === 'beast_chamber_1' ||
          q.currentZone === 'beast_chamber_2' ||
          q.currentZone === 'beast_chamber_3'
        ) {
          const cleared =
            q.currentZone === 'beast_chamber_1'
              ? q.beastChamber1Cleared
              : q.currentZone === 'beast_chamber_2'
              ? q.beastChamber2Cleared
              : q.beastChamber3Cleared;
          p.background(8, 22, 34);
          p.fill('#082f49');
          p.stroke('#10b981');
          p.strokeWeight(3);
          p.rect(120, 75, 560, 445, 12);
          drawAnimatedTorch(160, 140, '#10b981');
          drawAnimatedTorch(640, 140, '#10b981');
          p.noStroke();
          p.fill(cleared ? '#10b981' : '#facc15');
          p.circle(400, 290, 68);
          p.fill('#fff');
          p.textAlign(p.CENTER);
          p.textSize(10);
          p.text(cleared ? 'TRIAL CLEARED ✓' : '[E] START SKY MINIGAME', 400, 338);
          drawDoor(400, 105, cleared ? '[E] NEXT CHAMBER' : 'SEALED GATE', cleared ? '#10b981' : '#64748b');
          drawDoor(400, 495, '[E] BACK', '#94a3b8');
        } else if (q.currentZone === 'beast_altar') {
          p.background(6, 26, 22);
          p.fill('#064e3b');
          p.circle(400, 230, 106);
          p.fill('#10b981');
          p.circle(400, 230, 72 + Math.sin(p.frameCount * 0.08) * 6);
          p.fill('#fff');
          p.textAlign(p.CENTER);
          p.textSize(11);
          p.text('[E] CLAIM ANIMAL PUPPETRY', 400, 295);
          drawDoor(400, 495, '[E] BACK', '#94a3b8');
        }

        // ==================== HEROIC FANTASY CHARACTER SPRITE (Standing / Walking / Sitting / Sleeping / Climbing / Mining) ====================
        const outfit: RPGOutfit = stats.rpgOutfit;
        const walkSwing = isMoving ? Math.sin(stepFrame) : 0;
        const walkCycle = walkSwing * 4.5;
        const walkBob = isMoving ? Math.abs(Math.sin(stepFrame)) * 2.4 : 0;
        const walkLiftL = isMoving ? Math.max(0, Math.cos(stepFrame)) * 4.0 : 0;
        const walkLiftR = isMoving ? Math.max(0, -Math.cos(stepFrame)) * 4.0 : 0;
        const walkTilt = isMoving ? walkSwing * 0.045 * facingDir : 0;

        p.push();
        p.translate(playerX, playerY);

        if (playerPose === 'sleeping') {
          // Horizontal sleeping hero rotated 90° left tucked under the blanket (also visible just before/after blackout)
          p.noStroke();
          p.fill(outfit.skinTone);
          p.circle(-18, -2, 16);
          p.fill(outfit.hairColor);
          if (outfit.hairStyle === 'curly_afro') {
            p.circle(-20, -5, 20);
          } else {
            p.arc(-18, -4, 18, 15, p.PI, 0);
          }
          p.stroke('#1e293b');
          p.strokeWeight(1.5);
          p.line(-22, -2, -17, -2);
          p.noStroke();
          p.fill('#6b63b5');
          p.rectMode(p.CENTER);
          p.rect(8, 1, 42, 24, 9);
        } else {
          if (playerPose === 'resting') {
            // Keep character right on the bed and rotate full body 90 degrees left so they look like they are sleeping!
            const breath = Math.sin(p.frameCount * 0.06) * 0.7;
            p.translate(0, breath * 0.4);
            p.rotate(-p.HALF_PI);
          } else if (playerPose === 'sliding') {
            // Rotate character 45 degrees left while sliding down the Comet Slide!
            p.rotate(-p.PI / 4);
          } else if (playerPose === 'watering_plant') {
            // Lean/tilt body 12 degrees towards the plant while holding the watering can!
            p.rotate(p.radians(12));
          }

          if (playerPose !== 'sitting' && playerPose !== 'resting') {
            p.noStroke();
            p.fill(0, 0, 0, 140);
            p.ellipse(0, outfit.gender === 'female' ? 22 : 18, 30 - walkBob * 1.4, 12);
          } else if (playerPose === 'sitting') {
            // Subtle comfortable cushion drop + gentle breathing bob while seated
            p.translate(0, 4 + Math.sin(p.frameCount * 0.05) * 0.5);
          }

          if (isMoving && playerPose === 'idle') {
            p.translate(0, -walkBob);
            p.rotate(walkTilt);
          }

          // Back / Rear Hair Layer (custom rearHairStyle or base long hairstyles behind head/shoulders)
          const rearHair = outfit.rearHairStyle || 'default';
          p.noStroke();
          p.fill(outfit.hairColor);
          if (rearHair === 'long_flowing') {
            p.ellipse(-9, -2, 9, 25);
            p.ellipse(9, -2, 9, 25);
            p.rect(-11, -15, 22, 20, 7);
          } else if (rearHair === 'shoulder_layered') {
            p.ellipse(-9, -7, 8, 15);
            p.ellipse(9, -7, 8, 15);
            p.rect(-10, -15, 20, 12, 5);
          } else if (rearHair === 'spiky_nape') {
            p.triangle(-11, -12, -13, -1, -6, -6);
            p.triangle(11, -12, 13, -1, 6, -6);
            p.triangle(-7, -7, 0, 1, 7, -7);
            p.rect(-9, -15, 18, 10, 4);
          } else if (rearHair === 'twin_tails') {
            p.ellipse(-12, -3, 7, 20);
            p.ellipse(12, -3, 7, 20);
          } else if (outfit.hairStyle === 'long_wavy') {
            p.ellipse(-9, -4, 8, 22);
            p.ellipse(9, -4, 8, 22);
            p.rect(-10, -14, 20, 16, 6);
          }
          if (outfit.hairStyle === 'twin_braids') {
            p.rect(-12, -10, 5, 19, 3);
            p.rect(7, -10, 5, 19, 3);
          } else if (outfit.hairStyle === 'ponytail') {
            p.ellipse(-facingDir * 9, -8, 8, 18);
          } else if (outfit.hairStyle === 'bob' && rearHair === 'default') {
            p.arc(0, -13, 22, 20, p.PI - 0.3, 0.3);
          }

          // Billowing Cloak Mantle
          if (outfit.cloakColor && outfit.cloakColor !== 'none' && playerPose !== 'resting') {
            p.fill(outfit.cloakColor);
            p.triangle(-13, -6, 13, -6, -facingDir * 14, 15 + walkCycle * 0.35);
          }

          // Seated (Smaller Tucked Legs) vs Resting vs Standing Legs
          p.stroke(outfit.pantsColor);
          p.strokeWeight(outfit.gender === 'male' ? 5.5 : outfit.gender === 'female' ? 4.2 : 5);
          if (playerPose === 'sitting') {
            // Smaller tucked seated legs so they clearly look like they are sitting!
            p.line(-4, 6, -9, 9);
            p.line(-9, 9, -7, 13);
            p.line(4, 6, 9, 9);
            p.line(9, 9, 3, 12.5);
            if (outfit.gender === 'neutral') {
              p.noStroke();
              p.fill('#cbd5e1');
              p.rectMode(p.CENTER);
              p.rect(-9, 9, 3.8, 3.8, 1);
              p.rect(9, 9, 3.8, 3.8, 1);
            }
            p.stroke('#451a03');
            p.strokeWeight(3.2);
            p.point(-7, 13.8);
            p.point(2.5, 13);
          } else if (playerPose === 'resting') {
            // Relaxed legs resting straight under the bed blanket (rotated 90° left)
            p.line(-3.5, 8, -4.5, 19);
            p.line(3.5, 8, 4.5, 19);
            p.stroke('#451a03');
            p.strokeWeight(3.4);
            p.point(-4.5, 20);
            p.point(4.5, 20);
          } else if (outfit.gender === 'male') {
            if (isMoving) {
              const lFootX = -4.5 + walkSwing * 5.5;
              const lFootY = 17.5 - walkLiftL;
              const lKneeX = (-4 + lFootX) * 0.5 + facingDir * 1.5;
              const lKneeY = 12 - walkLiftL * 0.55;
              const rFootX = 4.5 - walkSwing * 5.5;
              const rFootY = 17.5 - walkLiftR;
              const rKneeX = (4 + rFootX) * 0.5 + facingDir * 1.5;
              const rKneeY = 12 - walkLiftR * 0.55;
              p.line(-4, 8, lKneeX, lKneeY);
              p.line(lKneeX, lKneeY, lFootX, lFootY);
              p.line(4, 8, rKneeX, rKneeY);
              p.line(rKneeX, rKneeY, rFootX, rFootY);
              p.noStroke();
              p.fill('#451a03');
              p.ellipse(lFootX + facingDir * 1.3, lFootY + 0.8, 6.5, 4);
              p.ellipse(rFootX + facingDir * 1.3, rFootY + 0.8, 6.5, 4);
            } else {
              p.line(-4, 8, -8, 16);
              p.line(4, 8, 9, 16);
              p.noStroke();
              p.fill('#451a03');
              p.ellipse(-9, 17, 6.2, 3.8);
              p.ellipse(10, 17, 6.2, 3.8);
            }
          } else if (outfit.gender === 'female') {
            if (isMoving) {
              const lFootX = -3.8 + walkSwing * 5.2;
              const lFootY = 22 - walkLiftL;
              const lKneeX = (-3.5 + lFootX) * 0.5 + facingDir * 1.3;
              const lKneeY = 15 - walkLiftL * 0.55;
              const rFootX = 3.8 - walkSwing * 5.2;
              const rFootY = 22 - walkLiftR;
              const rKneeX = (3.5 + rFootX) * 0.5 + facingDir * 1.3;
              const rKneeY = 15 - walkLiftR * 0.55;
              p.line(-3.5, 8, lKneeX, lKneeY);
              p.line(lKneeX, lKneeY, lFootX, lFootY);
              p.line(3.5, 8, rKneeX, rKneeY);
              p.line(rKneeX, rKneeY, rFootX, rFootY);
              p.noStroke();
              p.fill('#451a03');
              p.ellipse(lFootX + facingDir * 1.2, lFootY + 0.8, 5.5, 3.6);
              p.ellipse(rFootX + facingDir * 1.2, rFootY + 0.8, 5.5, 3.6);
            } else {
              p.line(-3.5, 8, -5, 21);
              p.line(3.5, 8, 7, 21);
              p.noStroke();
              p.fill('#451a03');
              p.ellipse(-5, 22, 5.4, 3.4);
              p.ellipse(7.5, 22, 5.4, 3.4);
            }
          } else {
            // Neutral Vanguard Legs with Silver Knee Guards & Sabaton Boots
            const lFootX = isMoving ? -4.2 + walkSwing * 5.2 : -6;
            const lFootY = isMoving ? 17 - walkLiftL : 16;
            const lKneeX = (-4 + lFootX) * 0.5 + (isMoving ? facingDir * 1.4 : 0);
            const lKneeY = isMoving ? 12 - walkLiftL * 0.55 : 12.5;
            const rFootX = isMoving ? 4.2 - walkSwing * 5.2 : 6;
            const rFootY = isMoving ? 17 - walkLiftR : 16;
            const rKneeX = (4 + rFootX) * 0.5 + (isMoving ? facingDir * 1.4 : 0);
            const rKneeY = isMoving ? 12 - walkLiftR * 0.55 : 12.5;
            p.line(-4, 8, lKneeX, lKneeY);
            p.line(lKneeX, lKneeY, lFootX, lFootY);
            p.line(4, 8, rKneeX, rKneeY);
            p.line(rKneeX, rKneeY, rFootX, rFootY);
            p.noStroke();
            p.fill('#cbd5e1');
            p.rectMode(p.CENTER);
            p.rect(lKneeX, lKneeY, 4.5, 4.5, 1);
            p.rect(rKneeX, rKneeY, 4.5, 4.5, 1);
            p.fill('#64748b');
            p.rect(lFootX, lFootY + 0.5, 5.5, 3.5, 1);
            p.rect(rFootX, rFootY + 0.5, 5.5, 3.5, 1);
          }

          // Arms: Sitting Lounge Pose vs Resting vs Watering Can Pose vs Walking Swing / Standing Stance
          if (playerPose === 'sitting') {
            // Relaxed seated arms (left hand resting on knee, right elbow propped casually near chest/chin)
            p.stroke(outfit.skinTone);
            p.strokeWeight(outfit.gender === 'male' ? 4.4 : 3.4);
            p.line(-10, -5, -13, 1);
            p.line(-13, 1, -8, 6.5);
            p.line(10, -5, 13.5, 1);
            p.line(13.5, 1, 7.5, -4);
            p.noStroke();
            p.fill(outfit.skinTone);
            p.circle(-8, 7, 3.8);
            p.circle(7, -4.5, 3.8);
          } else if (playerPose === 'resting') {
            // Curled sleeping arm tucked gently near pillow/cheek + relaxed side arm
            p.stroke(outfit.skinTone);
            p.strokeWeight(3.4);
            p.line(-9, -6, -12, -13);
            p.line(-12, -13, -7, -17);
            p.line(9, -6, 11, 4);
            p.noStroke();
            p.fill(outfit.skinTone);
            p.circle(-6.5, -17, 3.8);
            p.circle(11, 5, 3.8);
          } else if (playerPose === 'watering_plant') {
            // Both arms extended right holding a tilted Watering Can pouring into the plant!
            const pourRock = Math.sin(p.frameCount * 0.2) * 1.5;
            p.stroke(outfit.skinTone);
            p.strokeWeight(3.6);
            p.line(-8, -5, 4, -1);
            p.line(8, -5, 15, -2 + pourRock);
            // Tilted Watering Can held in hands
            p.push();
            p.translate(18, -3 + pourRock);
            p.rotate(0.28);
            p.noStroke();
            p.fill('#38bdf8');
            p.rectMode(p.CENTER);
            p.rect(0, 0, 14, 10, 3);
            // Curved handle
            p.noFill();
            p.stroke('#0284c7');
            p.strokeWeight(2);
            p.arc(-6, -2, 9, 9, p.HALF_PI, -p.HALF_PI);
            // Angled spout pointing at plant
            p.stroke('#38bdf8');
            p.strokeWeight(3);
            p.line(6, -1, 14, -7);
            p.fill('#bae6fd');
            p.noStroke();
            p.circle(15, -7, 4);
            p.pop();
            // Animated falling water drops cascading from spout into the plant!
            p.noStroke();
            for (let d = 0; d < 6; d++) {
              const dropT = (p.frameCount * 0.14 + d * 0.45) % 2.2;
              const dx = 31 + Math.sin(d * 1.7) * 2.5 + dropT * 2.5;
              const dy = -9 + dropT * 9.5;
              p.fill(d % 2 === 0 ? '#7dd3fc' : '#bae6fd');
              p.ellipse(dx, dy, 3, 4.8);
            }
            p.fill(125, 211, 252, 160);
            p.circle(plantPoseX - playerX, plantPoseY - playerY - 4, 6 + Math.sin(p.frameCount * 0.4) * 2);
          } else if (shoppingReachTimer > 0 && shoppingReachItem) {
            // Shopping Reach-Up -> Grab Object -> Put Into Shopping Cart Animation!
            const isReachingUp = shoppingReachTimer > 22;
            let reachHandX = facingDir * 14;
            let reachHandY = -28;
            if (isReachingUp) {
              const tUp = (44 - shoppingReachTimer) / 22; // 0 -> 1
              reachHandX = facingDir * (10 + tUp * 4);
              reachHandY = 4 - tUp * 36; // Arm reaches high UP toward the shelf!
            } else {
              const tDrop = (22 - shoppingReachTimer) / 22; // 0 -> 1
              reachHandX = facingDir * (14 + tDrop * 12);
              reachHandY = -32 + tDrop * 34; // Lowers smoothly down into Shopping Cart basket!
            }
            const elbowX = facingDir * 12;
            const elbowY = isReachingUp ? -14 : -8;

            // Back arm gripping cart handle while front arm reaches up!
            p.stroke(outfit.skinTone);
            p.strokeWeight(3.8);
            p.line(-facingDir * 9, -5, facingDir * 12, 1);
            // Reaching arm (goes UP high to shelf, then arcs DOWN into cart)
            p.line(facingDir * 9, -6, elbowX, elbowY);
            p.line(elbowX, elbowY, reachHandX, reachHandY);
            p.noStroke();
            p.fill(outfit.skinTone);
            p.circle(facingDir * 12, 1, 4.2);
            p.circle(reachHandX, reachHandY, 4.6);

            // Draw the grabbed food/item right in the player's raised hand while moving into the cart!
            if (shoppingReachTimer < 34) {
              p.fill(shoppingReachItem.color);
              p.rectMode(p.CENTER);
              p.rect(reachHandX, reachHandY - 5, 10, 10, 2);
              p.fill(shoppingReachItem.accentColor);
              p.rect(reachHandX, reachHandY - 5, 5, 4, 1);
            }
          } else if (hasShoppingCart && (q.currentZone === 'superstore' || q.currentZone === 'town_square') && playerPose === 'idle') {
            // Both hands forward gripping the Red Shopping Cart Handlebar!
            p.stroke(outfit.skinTone);
            p.strokeWeight(3.8);
            p.line(-9, -5, facingDir * 13, 0);
            p.line(9, -5, facingDir * 13, 2);
            p.noStroke();
            p.fill(outfit.skinTone);
            p.circle(facingDir * 13, 0, 4.2);
            p.circle(facingDir * 13, 2, 4.2);
          } else if (outfit.gender === 'male') {
            if (isMoving) {
              const swingL = -walkSwing * 5.2;
              const swingR = walkSwing * 5.2;
              p.stroke(outfit.skinTone);
              p.strokeWeight(4.8);
              p.line(-12, -6, -15 + swingL * 0.35, 0);
              p.line(-15 + swingL * 0.35, 0, -14 + swingL * 0.85, 6.5 - Math.max(0, -swingL) * 0.25);
              p.line(12, -6, 15 + swingR * 0.35, 0);
              p.line(15 + swingR * 0.35, 0, 14 + swingR * 0.85, 6.5 - Math.max(0, -swingR) * 0.25);
              p.noStroke();
              p.fill(outfit.skinTone);
              p.circle(-14 + swingL * 0.85, 7 - Math.max(0, -swingL) * 0.25, 5.2);
              p.circle(14 + swingR * 0.85, 7 - Math.max(0, -swingR) * 0.25, 5.2);
            } else {
              // Left bent fighting-stance arm + clenched fist
              p.stroke(outfit.skinTone);
              p.strokeWeight(4.8);
              p.line(-12, -6, -15, 0);
              p.line(-15, 0, -20, -1);
              p.noStroke();
              p.fill(outfit.skinTone);
              p.circle(-21, -1, 5.5);

              // Right muscular arm angled out + clenched fist
              p.stroke(outfit.skinTone);
              p.strokeWeight(4.8);
              p.line(12, -6, 17, 2);
              p.line(17, 2, 19, 8);
              p.noStroke();
              p.fill(outfit.skinTone);
              p.circle(19, 9, 5.5);
            }
          } else if (outfit.gender === 'female') {
            const swingL = isMoving ? -walkSwing * 4.8 : 0;
            const swingR = isMoving ? walkSwing * 4.8 : 0;
            // Longer poised graceful arms with smooth natural walk swing
            p.stroke(outfit.skinTone);
            p.strokeWeight(3.2);
            p.line(-9, -6, -11.5 + swingL * 0.35, 3);
            p.line(-11.5 + swingL * 0.35, 3, -13 + swingL * 0.85, 12 - Math.abs(swingL) * 0.2);
            p.line(9, -6, 11.5 + swingR * 0.35, 3);
            p.line(11.5 + swingR * 0.35, 3, 13 + swingR * 0.85, 12 - Math.abs(swingR) * 0.2);
            p.noStroke();
            p.fill(outfit.skinTone);
            p.circle(-13 + swingL * 0.85, 13.5 - Math.abs(swingL) * 0.2, 3.8);
            p.circle(13 + swingR * 0.85, 13.5 - Math.abs(swingR) * 0.2, 3.8);
          } else {
            const swingL = isMoving ? -walkSwing * 4.6 : 0;
            const swingR = isMoving ? walkSwing * 4.6 : 0;
            // Balanced Vanguard Arms with Steel Forearm Vambraces & Walk Swing
            p.stroke(outfit.skinTone);
            p.strokeWeight(4);
            p.line(-11, -6, -13 + swingL * 0.35, 3);
            p.line(11, -6, 13 + swingR * 0.35, 3);
            p.stroke('#94a3b8');
            p.strokeWeight(4.4);
            p.line(-13 + swingL * 0.35, 2, -13.5 + swingL * 0.85, 7 - Math.abs(swingL) * 0.15);
            p.line(13 + swingR * 0.35, 2, 13.5 + swingR * 0.85, 7 - Math.abs(swingR) * 0.15);
            p.noStroke();
            p.fill(outfit.skinTone);
            p.circle(-13.5 + swingL * 0.85, 8.5 - Math.abs(swingL) * 0.15, 4.5);
            p.circle(13.5 + swingR * 0.85, 8.5 - Math.abs(swingR) * 0.15, 4.5);
          }

          // Layered Armor / Tunic (Gender-Tailored Silhouette)
          p.noStroke();
          p.fill(outfit.topColor);
          p.rectMode(p.CENTER);
          if (outfit.gender === 'male') {
            // Broad athletic V-taper chest & trapezius neck
            p.fill(outfit.skinTone);
            p.triangle(-7, -11, 7, -11, 0, -5);
            p.fill(outfit.topColor);
            p.quad(-14, -9, 14, -9, 9, 10, -9, 10);
            // Subtle pectoral contour line
            p.stroke('#0f172a55');
            p.strokeWeight(1.2);
            p.line(-7, -2, 0, -1);
            p.line(7, -2, 0, -1);
            p.noStroke();
            p.fill('#78350f');
            p.rect(0, 6, 19, 4);
          } else if (outfit.gender === 'female') {
            // Slender neck + hourglass athletic bodice & flared hip contour
            p.fill(outfit.skinTone);
            p.triangle(-4.5, -11, 4.5, -11, 0, -6);
            p.fill(outfit.topColor);
            p.quad(-10, -8, 10, -8, 6.5, 5, -6.5, 5);
            p.quad(-6.5, 5, 6.5, 5, 11, 13, -11, 13);
            // Subtle chest contour seam
            p.stroke('#0f172a45');
            p.strokeWeight(1);
            p.line(-6, -2.5, -1, -1);
            p.line(6, -2.5, 1, -1);
            p.noStroke();
            p.fill('#78350f');
            p.rect(0, 5.5, 14.5, 3.5);
          } else {
            // Neutral Vanguard Tunic + Diagonal Baldric + Segmented Hip Tassets + Right Layered Pauldron
            p.fill(outfit.skinTone);
            p.triangle(-5.5, -11, 5.5, -11, 0, -6);
            p.fill(outfit.topColor);
            p.quad(-12, -8, 12, -8, 9, 8, -9, 8);
            // Diagonal leather baldric strap
            p.stroke('#78350f');
            p.strokeWeight(2.5);
            p.line(9, -8, -8, 6);
            p.noStroke();
            // Segmented steel hip tassets
            p.fill('#94a3b8');
            p.quad(-10, 7, -4, 7, -5, 14, -12, 13);
            p.quad(4, 7, 10, 7, 12, 13, 5, 14);
            // Signature asymmetrical layered right-shoulder pauldron
            p.fill('#cbd5e1');
            p.arc(11, -7, 11, 8, p.PI, 0);
            p.fill('#94a3b8');
            p.rect(11.5, -4.5, 9, 3, 1);
            p.fill('#78350f');
            p.rect(0, 6, 18, 4);
          }
          p.fill('#eab308');
          p.rect(0, 6, 5, 5);

          // Alpine Hiking Equipment Overlay when equipped in Hills/Mountains
          if (stats.hasHikingGear && (q.currentZone === 'mountains' || q.currentZone === 'hills')) {
            p.stroke('#f59e0b');
            p.strokeWeight(2.2);
            p.noFill();
            p.circle(-7, 2, 10); // Rope coil
            p.noStroke();
          }

          // Shoulder Pauldrons
          if (outfit.shoulderArmor && outfit.shoulderArmor !== 'none') {
            p.fill(
              outfit.shoulderArmor === 'gold_pauldrons'
                ? '#eab308'
                : outfit.shoulderArmor === 'steel_pauldrons'
                ? '#94a3b8'
                : '#78350f'
            );
            const pX = outfit.gender === 'male' ? 13.5 : outfit.gender === 'female' ? 10 : 10.5;
            p.ellipse(-pX, -7, outfit.gender === 'male' ? 10 : 8.5, 7);
            p.ellipse(pX, -7, outfit.gender === 'male' ? 10 : 8.5, 7);
          }

          // Active Pickaxe Swing Animation (Hills / Underground Mine) or Normal Equipped Weapon
          if (playerPose === 'resting' || playerPose === 'watering_plant') {
            // Keep hands free for sleeping on bed or holding the watering can
          } else if (
            pickaxeSwingTimer > 0 ||
            (stats.hasPickaxe && (q.currentZone === 'underground_mine' || q.currentZone === 'hills'))
          ) {
            p.push();
            const swingAngle =
              pickaxeSwingTimer > 0
                ? Math.sin((pickaxeSwingTimer / 20) * Math.PI) * 1.3 * facingDir
                : 0;
            p.rotate(swingAngle);
            p.stroke('#78350f');
            p.strokeWeight(3.2);
            p.line(facingDir * 10, 6, facingDir * 20, -14);
            p.stroke('#38bdf8');
            p.strokeWeight(3.5);
            p.arc(facingDir * 20, -14, 16, 16, -p.PI * 0.75, p.PI * 0.25);
            p.pop();
          } else if (outfit.weapon === 'orb_staff') {
            p.stroke('#78350f');
            p.strokeWeight(3);
            p.line(facingDir * 14, -18, facingDir * 12, 16);
            p.noStroke();
            p.fill('#38bdf8');
            p.circle(facingDir * 14, -20, 7);
          } else if (outfit.weapon === 'runic_sword') {
            p.stroke('#e2e8f0');
            p.strokeWeight(3);
            p.line(facingDir * 13, 4, facingDir * 19, -14);
          } else if (outfit.weapon === 'oak_bow') {
            p.noFill();
            p.stroke('#92400e');
            p.strokeWeight(2.5);
            p.arc(facingDir * 11, 0, 10, 24, -p.HALF_PI, p.HALF_PI);
          } else if (outfit.weapon === 'paladin_halberd') {
            p.stroke('#94a3b8');
            p.strokeWeight(3);
            p.line(facingDir * 14, -22, facingDir * 12, 16);
            p.noStroke();
            p.fill('#cbd5e1');
            p.triangle(facingDir * 14, -22, facingDir * 23, -15, facingDir * 14, -9);
          } else if (outfit.weapon === 'spirit_lantern') {
            p.noStroke();
            p.fill('#34d399');
            p.circle(facingDir * 15, 2, 8);
          }

          // Head & Gender Facial Cues
          p.noStroke();
          p.fill(outfit.skinTone);
          if (outfit.gender === 'male') {
            // Slightly more sculpted jawline
            p.ellipse(0, -15, 17, 19);
            p.quad(-6, -12, 6, -12, 3.5, -5.5, -3.5, -5.5);
          } else if (outfit.gender === 'female') {
            // Refined oval face tapering gently to chin
            p.ellipse(0, -15, 15.5, 18.5);
            p.triangle(-5, -10, 5, -10, 0, -5.8);
          } else {
            // Neutral sculpted warrior head
            p.ellipse(0, -15, 16.5, 18.5);
            p.quad(-5.5, -11, 5.5, -11, 3, -5.8, -3, -5.8);
          }
          if (playerPose === 'resting') {
            p.stroke('#0f172a');
            p.strokeWeight(1.4);
            p.line(-4.8, -13.5, -1.6, -13.5);
            if (outfit.gender !== 'neutral') {
              p.line(1.6, -13.5, 4.8, -13.5);
            }
            p.noStroke();
          } else {
            p.fill('#0f172a');
            p.circle(-3.2, -13.5, 2.2);
            if (outfit.gender !== 'neutral') {
              p.circle(3.2, -13.5, 2.2);
            }
          }
          if (outfit.gender === 'male') {
            p.stroke('#0f172a');
            p.strokeWeight(1.4);
            p.line(-5.5, -16, -2, -15);
            p.line(5.5, -16, 2, -15);
            p.noStroke();
          } else if (outfit.gender === 'female') {
            p.stroke('#0f172a');
            p.strokeWeight(1.1);
            p.line(-4.5, -15.5, -2, -16.2);
            p.line(4.5, -15.5, 2, -16.2);
            p.line(-4.5, -14, -6, -15);
            p.line(4.5, -14, 6, -15);
            p.noStroke();
          } else {
            // Signature Rogue Vanguard Eyepatch + Strap
            p.stroke('#1e293b');
            p.strokeWeight(1.3);
            p.line(-7, -17, 7, -13.5);
            p.noStroke();
            p.fill('#1e293b');
            p.ellipse(3.3, -13.5, 4.6, 3.6);
          }

          // All 8 Hairstyle Foregrounds (Full Scalp Coverage)
          p.noStroke();
          p.fill(outfit.hairColor);
          if (outfit.hairStyle === 'spiky') {
            p.arc(0, -17, 19.5, 19, p.PI - 0.1, 0.1);
            p.triangle(-8, -21, -4, -30, 0, -22);
            p.triangle(-2, -22, 2, -31, 5, -22);
            p.triangle(3, -21, 8, -29, 9, -20);
          } else if (outfit.hairStyle === 'curly_afro') {
            p.circle(0, -20, 24);
            p.circle(-8, -16, 11);
            p.circle(8, -16, 11);
            p.fill(outfit.skinTone);
            p.circle(0, -13.5, 15);
            p.fill('#0f172a');
            p.circle(-3, -13.5, 2.2);
            p.circle(3, -13.5, 2.2);
          } else if (outfit.hairStyle === 'braided_bun') {
            p.arc(0, -17, 19.5, 19, p.PI - 0.15, 0.15);
            p.circle(0, -27.5, 9.5);
          } else if (outfit.hairStyle === 'undercut') {
            p.arc(2, -17, 18.5, 18.5, p.PI + 0.05, 0.15);
            p.rectMode(p.CENTER);
            p.rect(2, -22.5, 13, 6.5, 3);
          } else if (outfit.hairStyle === 'bob') {
            p.arc(0, -16.5, 21.5, 21, p.PI - 0.3, 0.3);
          } else if (outfit.hairStyle === 'ponytail') {
            p.arc(0, -17, 19.5, 19, p.PI - 0.15, 0.15);
            p.ellipse(-facingDir * 8, -21, 9, 13);
          } else if (outfit.hairStyle === 'twin_braids') {
            p.arc(0, -17, 19.5, 19, p.PI - 0.15, 0.15);
          } else {
            // long_wavy
            p.arc(0, -17, 20.5, 19.5, p.PI - 0.18, 0.18);
          }

          // Front Bangs & Side Fringe Overlay
          const bangs = outfit.bangsStyle || 'side_bangs';
          p.fill(outfit.hairColor);
          p.noStroke();
          if (bangs === 'blunt_bangs') {
            p.push();
            p.rectMode(p.CENTER);
            p.rect(0, -19, 15, 5.5, 2);
            p.pop();
          } else if (bangs === 'side_bangs') {
            p.triangle(-8, -21, 9, -20, 7, -13);
            p.ellipse(6.5, -14, 4, 8);
          } else if (bangs === 'curtain_bangs') {
            p.triangle(-1, -24, -9, -18, -7, -11);
            p.triangle(1, -24, 9, -18, 7, -11);
          } else if (bangs === 'wispy_bangs') {
            p.triangle(-7, -21, -4, -15, -2, -20);
            p.triangle(-2, -21, 0, -14.5, 2, -20);
            p.triangle(2, -21, 5, -15, 7, -20);
          } else if (bangs === 'face_framing') {
            p.ellipse(-7.5, -12, 3.8, 11);
            p.ellipse(7.5, -12, 3.8, 11);
          }

          // Headwear / Helm / Hood
          if (outfit.accessory === 'wizard_hat') {
            p.fill('#6d28d9');
            p.triangle(-13, -20, 13, -20, 0, -37);
          } else if (outfit.accessory === 'crimson_hood') {
            p.fill(outfit.topColor);
            p.arc(0, -15, 21, 21, p.PI - 0.3, 0.3);
          } else if (outfit.accessory === 'plumed_helm') {
            p.fill('#94a3b8');
            p.circle(0, -15, 19);
            p.fill('#ef4444');
            p.ellipse(2, -26, 12, 5);
          } else if (outfit.accessory === 'halo') {
            p.noFill();
            p.stroke('#facc15');
            p.strokeWeight(2.5);
            p.ellipse(0, -27, 18, 6);
          } else if (outfit.accessory === 'wolf_ears') {
            p.fill(outfit.hairColor);
            p.triangle(-9, -20, -4, -30, 0, -21);
            p.triangle(0, -21, 4, -30, 9, -20);
          }

          // Cozy folded blanket over lower torso & legs when resting rotated 90° left on the bed
          if (playerPose === 'resting') {
            p.noStroke();
            p.fill('#6b63b5');
            p.rectMode(p.CENTER);
            p.rect(0, 12, 22, 23, 6);
            p.fill('#e2e8f0');
            p.rect(0, 1.5, 22, 3.5, 1.5);
          }

          // Render Pushed Wireframe Shopping Cart with Red Handle & Loaded Food Items!
          if (hasShoppingCart && (q.currentZone === 'superstore' || q.currentZone === 'town_square') && playerPose === 'idle') {
            p.push();
            p.translate(facingDir * 24, 5);
            p.rectMode(p.CENTER);
            // Cart wire basket body
            p.noFill();
            p.stroke('#cbd5e1');
            p.strokeWeight(1.8);
            p.rect(0, 0, 22, 15, 3);
            p.stroke('#94a3b8');
            p.strokeWeight(1);
            p.line(-6, -7, -6, 7);
            p.line(0, -7, 0, 7);
            p.line(6, -7, 6, 7);
            p.line(-10, 0, 10, 0);

            // Loaded grocery items visibly sitting inside the cart basket!
            for (let ci = 0; ci < Math.min(cartItems.length, 6); ci++) {
              const item = cartItems[ci];
              const ix = -6 + (ci % 3) * 6;
              const iy = ci < 3 ? 1 : -3;
              p.noStroke();
              p.fill(item.color);
              p.rect(ix, iy, 5.5, 6.5, 1);
              p.fill(item.accentColor);
              p.rect(ix, iy - 1, 3, 2);
            }

            // Bright Red Cart Handlebar (matching reference image!)
            p.stroke('#dc2626');
            p.strokeWeight(3.2);
            p.line(-facingDir * 11, -7, -facingDir * 11, 7);
            // Caster Wheels
            p.noStroke();
            p.fill('#0f172a');
            p.circle(-7, 10, 4.2);
            p.circle(7, 10, 4.2);
            p.pop();
          }
        }
        p.pop();

        // Floating Character Nameplate above Hero
        if (playerPose !== 'sleeping') {
          const plateY = playerPose === 'resting' ? playerY - 28 : playerY - 38;
          p.noStroke();
          p.fill(15, 23, 42, 195);
          p.rectMode(p.CENTER);
          p.rect(playerX, plateY, Math.max(46, heroName.length * 6.2 + 12), 14, 4);
          p.fill('#fde68a');
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(8.5);
          p.textStyle(p.BOLD);
          p.text(heroName, playerX, plateY);
        }

        // Eat Fruit / Smell Flower Reaction Icons Above Hero
        if (performance.now() < plantEatUntil) {
          p.noStroke();
          p.fill('#f43f5e');
          p.circle(playerX + 8, playerY - 50 - Math.abs(Math.sin(p.frameCount * 0.14)) * 6, 6);
          p.fill('#fef08a');
          p.textAlign(p.CENTER);
          p.textSize(10);
          p.text('Yum! 🍓', playerX, playerY - 56);
        } else if (performance.now() < plantSmellUntil) {
          p.noStroke();
          p.fill('#f472b6');
          p.textAlign(p.CENTER);
          p.textSize(10);
          p.text('Mmm~ 🌸', playerX, playerY - 56 - Math.sin(p.frameCount * 0.2) * 3);
        }

        // ==================== MULTIPLAYER FRIENDS SYNC & RENDERING ====================
        const mpState = mpSnapRef.current;
        if (mpState.enabled) {
          multiplayerClient.sendPlayerUpdate({
            name: heroName,
            zone: q.currentZone,
            x: playerX,
            y: playerY,
            facing: facingDir,
            isMoving,
            pose: playerPose,
            outfit: stats.rpgOutfit,
            mode: 'rpg'
          });

          const nowMs = Date.now();
          for (const fp of mpState.players) {
            if (fp.id === mpState.selfId || fp.mode !== 'rpg' || fp.zone !== q.currentZone) continue;

            // Friend Aura Ring
            p.noFill();
            p.stroke(fp.color || '#38bdf8');
            p.strokeWeight(2);
            p.ellipse(fp.x, fp.y + 18, 28, 10);
            p.noStroke();

            drawWalkingNPC({
              x: fp.x,
              y: fp.y,
              facing: fp.facing || 1,
              isWalking: fp.isMoving,
              walkPhase: p.frameCount * 0.24,
              skinTone: fp.outfit?.skinTone || '#ffdbac',
              hairColor: fp.outfit?.hairColor || '#451a03',
              hairStyle:
                fp.outfit?.hairStyle === 'spiky'
                  ? 'spiky'
                  : fp.outfit?.hairStyle === 'ponytail'
                  ? 'ponytail'
                  : fp.outfit?.hairStyle === 'braided_bun'
                  ? 'bun'
                  : 'wavy',
              topColor: fp.outfit?.topColor || '#3b82f6',
              pantsColor: fp.outfit?.pantsColor || '#1e293b',
              cloakColor: fp.outfit?.cloakColor !== 'none' ? fp.outfit?.cloakColor : undefined,
              label: fp.name
            });

            if (fp.chatBubble && fp.chatBubble.expiresAt > nowMs) {
              const bubbleTxt = fp.chatBubble.text;
              p.noStroke();
              p.fill(15, 23, 42, 225);
              p.rectMode(p.CENTER);
              const bw = Math.min(180, Math.max(54, bubbleTxt.length * 5.6 + 14));
              p.rect(fp.x, fp.y - 50, bw, 18, 6);
              p.fill('#f8fafc');
              p.textAlign(p.CENTER, p.CENTER);
              p.textSize(8.5);
              p.text(bubbleTxt.slice(0, 28), fp.x, fp.y - 50);
            }

            if (isNear(fp.x, fp.y, 58) && !contextualHint) {
              contextualHint = { x: fp.x, y: fp.y - 44, text: `[E] Wave & Team Up with ${fp.name}` };
            }
          }
        }

        // Room-Scoped Light / Darkness Overlay in My House (darkens the room itself, never follows character)
        if (q.currentZone === 'my_house') {
          const isMpHouse = mpSnapRef.current.enabled;
          const anyLampLit = floorLampOn || nightstandLampOn || hearthLit;
          const lampDimAlpha = (!floorLampOn ? 32 : 0) + (!nightstandLampOn ? 32 : 0) + (!hearthLit ? 18 : 0);
          const darknessAlpha = !roomLightsOn ? (anyLampLit ? 196 : 230) : lampDimAlpha;

          if (darknessAlpha > 0) {
            p.noStroke();
            p.rectMode(p.CORNER);
            p.fill(4, 7, 18, darknessAlpha);
            if (isMpHouse) {
              p.rect(110, 64, 576, 188, 4);
              p.rect(90, 244, 596, 264, 4);
            } else {
              p.rect(105, 60, 590, 455, 16);
            }
          }

          // Fixed warm glow halos at placed lamps & hearth when main room lights are off
          if (!roomLightsOn) {
            p.noStroke();
            if (isMpHouse) {
              if (floorLampOn) {
                p.fill(253, 224, 71, 34);
                p.circle(512, 476, 86);
                p.circle(640, 476, 86);
              }
              if (nightstandLampOn) {
                p.fill(250, 204, 21, 32);
                p.circle(126, 472, 74);
                p.circle(246, 472, 74);
              }
              if (hearthLit) {
                p.fill(249, 115, 22, 38);
                p.circle(558, 228, 96);
              }
            } else {
              for (const item of stats.houseConfig.furniture) {
                if (!item.placed) continue;
                if (item.type === 'floor_lamp' && floorLampOn) {
                  p.fill(253, 224, 71, 34);
                  p.circle(item.x, item.y, 96);
                } else if (item.type === 'nightstand' && nightstandLampOn) {
                  p.fill(250, 204, 21, 30);
                  p.circle(item.x, item.y, 76);
                } else if (item.type === 'fireplace' && hearthLit) {
                  p.fill(249, 115, 22, 34);
                  p.circle(item.x, item.y + 8, 92);
                }
              }
            }
          }
        }

        // Contextual Prompt Floating Above Nearby Interactive Object
        if (contextualHint) {
          drawFloatingHint(contextualHint.x, contextualHint.y, contextualHint.text);
        }

        // Floating Burst Particles & Text Popups
        for (let i = particles.length - 1; i >= 0; i--) {
          const pt = particles[i];
          pt.x += pt.vx;
          pt.y += pt.vy;
          pt.life -= 1;
          if (pt.life <= 0) {
            particles.splice(i, 1);
            continue;
          }
          p.noStroke();
          p.fill(pt.color);
          if (pt.text) {
            p.textAlign(p.CENTER);
            p.textSize(pt.size);
            p.textStyle(p.BOLD);
            p.text(pt.text, pt.x, pt.y);
          } else {
            p.circle(pt.x, pt.y, pt.size);
          }
        }

        p.pop();
      };
    };

    p5InstanceRef.current = new p5(sketch, containerRef.current);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
  }, []);

  const handleBuyStoreItem = (item: SuperstoreItem) => {
    if (playerStats.upgrades.arcanePoints < item.costAP) {
      audioEngine.playGestureBlocked();
      setPromptMessage(`Need ${item.costAP} AP for ${item.name}!`);
      return;
    }
    audioEngine.playArmorUpgrade();
    const updatedStats: Partial<PlayerStats> = {
      upgrades: {
        ...playerStats.upgrades,
        arcanePoints: playerStats.upgrades.arcanePoints - item.costAP
      }
    };
    if (item.id === 'store_portal_key') {
      updatedStats.portalKeys = (playerStats.portalKeys || 0) + 1;
    } else if (item.id === 'store_power_elixir') {
      updatedStats.arenaPowersCount = (playerStats.arenaPowersCount || 0) + 2;
    } else if (item.id === 'store_arcade_unit') {
      updatedStats.houseConfig = {
        ...playerStats.houseConfig,
        furniture: playerStats.houseConfig.furniture.map((f) =>
          f.id === 'f_arcade' ? { ...f, placed: true } : f
        )
      };
    } else if (item.id === 'store_trophy_case') {
      updatedStats.houseConfig = {
        ...playerStats.houseConfig,
        furniture: playerStats.houseConfig.furniture.map((f) =>
          f.id === 'f_trophy' ? { ...f, placed: true } : f
        )
      };
    }
    onUpdateStats(updatedStats);
    setPromptMessage(`Purchased ${item.name}!`);
  };

  const bloodProgress =
    (questState.bloodChamber1Cleared ? 1 : 0) +
    (questState.bloodChamber2Cleared ? 1 : 0) +
    (questState.bloodChamber3Cleared ? 1 : 0);
  const beastProgress =
    (questState.beastChamber1Cleared ? 1 : 0) +
    (questState.beastChamber2Cleared ? 1 : 0) +
    (questState.beastChamber3Cleared ? 1 : 0);

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden font-sans">
      <div className="h-14 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md px-4 flex items-center justify-between z-20 shrink-0 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 shrink-0">
            {questState.currentZone.startsWith('beast') || questState.currentZone === 'sky_sanctum' ? (
              <Cloud className="w-4 h-4 text-sky-400" />
            ) : questState.currentZone === 'underground_mine' ? (
              <Gem className="w-4 h-4 text-cyan-400" />
            ) : questState.currentZone === 'mountains' || questState.currentZone === 'hills' ? (
              <Mountain className="w-4 h-4 text-emerald-400" />
            ) : (
              <Compass className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div className="truncate">
            <h1 className="font-cinzel text-sm font-bold text-slate-100 truncate">
              {ZONE_LABELS[questState.currentZone]}
            </h1>
            <p className="text-[11px] text-slate-400 truncate flex items-center gap-2">
              <span className="text-amber-300 font-semibold">{(playerStats.playerName || 'Aria').trim() || 'Aria'}</span>
              <span>·</span>
              <span
                className={`font-semibold ${
                  (playerStats.hunger ?? 65) >= 60
                    ? 'text-emerald-300'
                    : (playerStats.hunger ?? 65) >= 30
                    ? 'text-amber-300'
                    : 'text-rose-400'
                }`}
              >
                Hunger: {playerStats.hunger ?? 65}/{playerStats.maxHunger ?? 100}
              </span>
              <span>·</span>
              <span>Hidden: {questState.hiddenSpotsFound.length}/20</span>
              <span>·</span>
              <span>Arena: {playerStats.arenaPowersCount || 0}/20</span>
              <span>·</span>
              <span className="text-cyan-300 font-semibold">Gems: {playerStats.gemsCollected || 0}</span>
              {playerStats.hasPickaxe && (
                <span className="text-amber-300 inline-flex items-center gap-0.5">
                  · <Pickaxe className="w-3 h-3" />
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-4 text-xs text-slate-300">
          <span className="flex items-center gap-1.5">
            <Skull className="w-3.5 h-3.5 text-red-400" />
            Blood: <strong className="text-red-300">{questState.bloodBenderUnlocked ? 'UNLOCKED' : `${bloodProgress}/3 Chambers`}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <PawPrint className="w-3.5 h-3.5 text-emerald-400" />
            Beast: <strong className="text-emerald-300">{questState.animalPuppetryUnlocked ? 'UNLOCKED' : `${beastProgress}/3 Chambers`}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenMultiplayerLobby && (
            <button
              onClick={onOpenMultiplayerLobby}
              className={`px-2.5 py-1.5 border text-xs rounded-lg flex items-center gap-1.5 cursor-pointer font-semibold ${
                multiplayerEnabled
                  ? 'bg-sky-500/20 hover:bg-sky-500/30 border-sky-400/60 text-sky-200'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
              title="Open Multiplayer Room Lobby"
            >
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">
                {multiplayerEnabled ? `Room ${multiplayerRoomCode}` : 'Multiplayer'}
              </span>
            </button>
          )}

          <button
            onClick={() => setShowOutfitModal(true)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <Shirt className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{t.wardrobe}</span>
          </button>

          <button
            onClick={() => setShowHouseModal(true)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{t.decorate}</span>
          </button>

          <button
            onClick={() => setShowFastTravel(!showFastTravel)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            <span>{t.map}</span>
          </button>

          <button
            onClick={onReturnToBattle}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
          >
            {t.battleArena}
          </button>

          <button
            onClick={onReturnToHome}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
            title="Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showFastTravel && (
        <div className="absolute top-16 right-4 z-40 bg-slate-900/95 border border-slate-700 rounded-2xl p-4 w-76 shadow-2xl backdrop-blur-xl">
          <div className="text-xs font-cinzel font-bold text-amber-400 mb-2">World Fast Travel</div>
          <div className="grid grid-cols-1 gap-1.5 text-xs">
            {(
              [
                ['town_square', 'Town Square (3 Secrets)'],
                ['my_house', 'My House (Couch/Bed/Lights/Plant)'],
                ['playground', 'Playground (Slide/Swings/Game)'],
                ['hospital', 'Hospital (3 Secrets & Lab)'],
                ['superstore', 'Superstore (3 Secrets & Game)'],
                ['hills', 'Emerald Hills (Pickaxe & Fireflies)'],
                ['underground_mine', 'Underground Crystal Cavern (Gems!)'],
                ['mountains', 'Frostpeak Mountains (Hiking & Balloon)'],
                ['catacombs', 'Ancient Mossy Catacombs']
              ] as [RPGZone, string][]
            ).map(([zone, label]) => (
              <button
                key={zone}
                onClick={() => travelToZone(zone)}
                className={`px-3 py-2 rounded-lg text-left border transition-colors cursor-pointer ${
                  questState.currentZone === zone
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-600 text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div ref={containerRef} className="relative flex-1 w-full h-full overflow-hidden" />

      {promptMessage && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 max-w-3xl w-full px-4 pointer-events-none">
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2 shadow-2xl backdrop-blur-md text-center text-xs text-slate-200">
            {promptMessage}
          </div>
        </div>
      )}

      {activeDialogue && (
        <div className="absolute inset-x-0 bottom-16 z-40 flex justify-center px-4">
          <div className="bg-slate-900/95 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: activeDialogue.avatarColor }} />
                <h3 className="font-cinzel text-sm font-bold text-slate-100">{activeDialogue.speaker}</h3>
              </div>
              <button
                onClick={() => setActiveDialogue(null)}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                Close [Esc]
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{activeDialogue.text}</p>

            {activeDialogue.revealedHint === 'power' && activeDialogue.powerHint && (
              <div className="mt-3 p-3 rounded-xl bg-amber-950/50 border border-amber-500/40 text-xs text-amber-200 leading-relaxed">
                {activeDialogue.powerHint}
              </div>
            )}
            {activeDialogue.revealedHint === 'gesture' && activeDialogue.extraHint && (
              <div className="mt-3 p-3 rounded-xl bg-sky-950/50 border border-sky-500/40 text-xs text-sky-200 leading-relaxed">
                {activeDialogue.extraHint}
              </div>
            )}

            {(activeDialogue.powerHint || activeDialogue.extraHint) && (
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-slate-800">
                {activeDialogue.powerHint && (
                  <button
                    onClick={() => {
                      audioEngine.playAncientRune();
                      setActiveDialogue((prev) => (prev ? { ...prev, revealedHint: 'power' } : null));
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      activeDialogue.revealedHint === 'power'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300'
                    }`}
                  >
                    Ask About Power Hints 💡
                  </button>
                )}
                {activeDialogue.extraHint && (
                  <button
                    onClick={() => {
                      audioEngine.playAncientRune();
                      setActiveDialogue((prev) => (prev ? { ...prev, revealedHint: 'gesture' } : null));
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      activeDialogue.revealedHint === 'gesture'
                        ? 'bg-sky-500 text-slate-950'
                        : 'bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300'
                    }`}
                  >
                    Ask About Hand Movements ✋
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showSuperstore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-purple-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-purple-400" />
                <h2 className="font-cinzel text-lg font-bold text-slate-100">Grand Superstore</h2>
              </div>
              <span className="text-xs font-mono text-amber-400 font-bold">
                {playerStats.upgrades.arcanePoints} AP · {playerStats.portalKeys} Keys
              </span>
            </div>
            <div className="space-y-2.5">
              {SUPERSTORE_ITEMS.map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{item.name}</div>
                    <p className="text-xs text-slate-400">{item.description}</p>
                  </div>
                  <button
                    onClick={() => handleBuyStoreItem(item)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shrink-0 cursor-pointer"
                  >
                    {item.costAP} AP
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowSuperstore(false)}
              className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl cursor-pointer"
            >
              Close Shop
            </button>
          </div>
        </div>
      )}

      {activeMinigame && (
        <ChamberMinigamesModal
          minigame={activeMinigame.type}
          chamberTitle={activeMinigame.title}
          playerName={(playerStats.playerName || 'Aria').trim() || 'Aria'}
          playerOutfit={playerStats.rpgOutfit}
          latestGesture={latestGesture}
          cameraActive={cameraActive}
          onEnsureCamera={onEnsureCamera}
          onSimulateGesture={onSimulateGesture}
          multiplayerEnabled={multiplayerEnabled}
          coopSession={
            activeMinigame.sessionId
              ? mpSnap.coopSessions.find((s) => s.sessionId === activeMinigame.sessionId) || null
              : null
          }
          onInviteFriends={() => {
            if (!multiplayerEnabled) return;
            const sid = multiplayerClient.inviteToMinigame(
              activeMinigame.type,
              activeMinigame.title,
              questState.currentZone
            );
            if (sid) {
              setActiveMinigame((prev) => (prev ? { ...prev, sessionId: sid } : null));
            }
          }}
          onSuccess={activeMinigame.onWin}
          onClose={() => {
            if (activeMinigame.sessionId) {
              multiplayerClient.leaveMinigame(activeMinigame.sessionId);
            }
            setActiveMinigame(null);
          }}
        />
      )}

      {multiplayerEnabled && (
        <MultiplayerChatBar
          mode="rpg"
          currentZone={questState.currentZone}
          onWarpToFriend={(zone, x, y, friendName) =>
            travelToZone(zone, Math.min(670, x + 28), y, `Warped to ${friendName}!`)
          }
          onJoinCoopSession={handleJoinCoopSession}
          onOpenRoomSwitcher={onOpenMultiplayerLobby}
          onQuickInviteCurrentZone={() => openZoneCoopMinigame()}
        />
      )}

      {showOutfitModal && (
        <RPGOutfitModal
          outfit={playerStats.rpgOutfit}
          playerName={playerStats.playerName}
          onSavePlayerName={(nextName) => onUpdateStats({ playerName: nextName.slice(0, 20) })}
          onSaveOutfit={(rpgOutfit) => onUpdateStats({ rpgOutfit })}
          onClose={() => setShowOutfitModal(false)}
          labels={{
            outfitTitle: t.outfitTitle,
            outfitSubtitle: t.outfitSubtitle,
            genderLabel: t.genderLabel,
            female: t.female,
            male: t.male,
            neutral: t.neutral,
            hairstyleLabel: t.hairstyleLabel,
            bangsLabel: t.bangsLabel,
            rearHairLabel: t.rearHairLabel,
            skinToneLabel: t.skinToneLabel,
            wearOutfit: t.wearOutfit
          }}
        />
      )}

      {showHouseModal && (
        <HouseDecoratorModal
          houseConfig={playerStats.houseConfig}
          onUpdateHouse={(houseConfig) => onUpdateStats({ houseConfig })}
          onClose={() => setShowHouseModal(false)}
        />
      )}

      {showBookshelfBook && (
        <ArcaneBookshelfModal
          stats={playerStats}
          questState={questState}
          onClose={() => setShowBookshelfBook(false)}
        />
      )}

      {showFridgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-sky-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-cinzel text-lg font-bold text-slate-100">Home Kitchen Fridge</h2>
                  <p className="text-xs text-slate-400">
                    Eat groceries you bought from Grand Superstore to restore Hunger & HP!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFridgeModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Hunger Meter Bar */}
            <div className="mb-4 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">
                  {(playerStats.playerName || 'Aria').trim() || 'Aria'}'s Hunger
                </span>
                <span className="font-mono font-bold text-emerald-300">
                  {playerStats.hunger ?? 65} / {playerStats.maxHunger ?? 100}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(((playerStats.hunger ?? 65) / (playerStats.maxHunger ?? 100)) * 100)
                    )}%`
                  }}
                />
              </div>
            </div>

            {/* Stocked Grocery List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {(!playerStats.fridgeFood || playerStats.fridgeFood.length === 0) ? (
                <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                  <div className="text-2xl">🧊</div>
                  <div className="text-sm font-semibold text-slate-200">Your Fridge is Empty!</div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Walk outside Grand Superstore to grab a Shopping Cart, press <strong>[E]</strong> at the shelves
                    to reach up and pick groceries, then check out at the red counter!
                  </p>
                </div>
              ) : (
                playerStats.fridgeFood.map((food) => (
                  <div
                    key={food.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-lg border border-white/20 flex items-center justify-center shrink-0 font-bold text-xs shadow"
                        style={{ backgroundColor: food.color, color: '#ffffff' }}
                      >
                        x{food.quantity}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-100 truncate">{food.name}</div>
                        <div className="text-[11px] text-emerald-300 font-medium">
                          +{food.hungerRestore} Hunger · +{food.hpRestore} HP
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const maxH = playerStats.maxHunger ?? 100;
                        const curH = playerStats.hunger ?? 65;
                        const nextHunger = Math.min(maxH, curH + food.hungerRestore);
                        const nextHp = Math.min(playerStats.maxHp, playerStats.hp + food.hpRestore);
                        const updatedFood = (playerStats.fridgeFood || [])
                          .map((f) => (f.id === food.id ? { ...f, quantity: f.quantity - 1 } : f))
                          .filter((f) => f.quantity > 0);

                        audioEngine.playGestureSuccess();
                        onUpdateStats({
                          hunger: nextHunger,
                          hp: nextHp,
                          fridgeFood: updatedFood
                        });
                        fridgeEatEventRef.current = { label: food.name, hunger: food.hungerRestore };
                        setPromptMessage(
                          `Ate ${food.name}! Hunger is now ${nextHunger}/${maxH} (+${food.hpRestore} HP)!`
                        );
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer"
                    >
                      Eat 🍽️
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowFridgeModal(false)}
              className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Close Fridge
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
