import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  AppLanguage,
  AppThemeId,
  PlayerStats,
  DetectedGesture,
  SpellDefinition,
  CountryInfo,
  GestureId,
  GoalDefinition,
  SpellId,
  HandPoint
} from './types/game';
import {
  WORLD_REALMS,
  SPELL_CATALOG,
  ARMOR_CATALOG,
  DEFAULT_RPG_OUTFIT,
  INITIAL_HOUSE_CONFIG,
  HAND_SKINS_CATALOG
} from './data/spellsAndRealms';
import { APP_THEMES, LANGUAGES, getTranslation } from './data/i18nAndThemes';
import { cameraManager } from './services/cameraManager';
import { gestureDetector } from './services/gestureDetector';
import { audioEngine } from './services/audioEngine';
import { leaderboardService } from './services/leaderboardService';
import { handSimulator } from './services/handSimulator';
import { P5GameEngine } from './game/p5GameCanvas';
import { RPGCatacombsCanvas } from './game/RPGCatacombsCanvas';

import { TopNav } from './components/TopNav';
import { HUD } from './components/HUD';
import { SpellGrimoire } from './components/SpellGrimoire';
import { LeaderboardModal } from './components/LeaderboardModal';
import { HandCalibrationModal } from './components/HandCalibrationModal';
import { RealmsModal } from './components/RealmsModal';
import { GameOverModal } from './components/GameOverModal';
import { ArmoryModal } from './components/ArmoryModal';
import { SpellTrainingDojo } from './components/SpellTrainingDojo';
import { HandCustomizerModal } from './components/RPGCustomizationModals';
import { MultiplayerLobbyModal } from './components/MultiplayerLobbyModal';
import { MultiplayerChatBar } from './components/MultiplayerChatBar';
import { multiplayerClient } from './services/multiplayerClient';

import {
  Play,
  Sparkles,
  VideoOff,
  Maximize2,
  Minimize2,
  Award,
  Flame,
  Droplets,
  Zap,
  Shield,
  Snowflake,
  Skull,
  Swords,
  ShieldCheck,
  PawPrint,
  Hand,
  Palette,
  User,
  Users
} from 'lucide-react';

const INITIAL_PLAYER_STATS: PlayerStats = {
  playerName: 'Aria',
  hp: 100,
  maxHp: 100,
  mana: 100,
  maxMana: 100,
  hunger: 65,
  maxHunger: 100,
  fridgeFood: [],
  level: 1,
  currentXp: 0,
  xpToNextLevel: 100,
  score: 0,
  wave: 1,
  spellsCast: 0,
  spellsHit: 0,
  criticalHits: 0,
  zombiesKilled: 0,
  damageDealt: 0,
  reactionTimes: [],
  currentStreak: 0,
  highestStreak: 0,
  unlockedSpellIds: ['fireball'],
  unlockedInThisSession: [],
  arenaPowersCount: 0,
  portalKeys: 1,
  rpgOutfit: DEFAULT_RPG_OUTFIT,
  houseConfig: INITIAL_HOUSE_CONFIG,
  hiddenPowersFound: [],
  gemsCollected: 0,
  hasPickaxe: false,
  hasHikingGear: false,
  upgrades: {
    armorTier: 'apprentice',
    spellPowerLevel: 0,
    manaCapacityLevel: 0,
    manaRegenLevel: 0,
    castHasteLevel: 0,
    hemomancyLevel: 0,
    beastMasteryLevel: 0,
    arcanePoints: 120,
    handSkin: 'arcane_wireframe'
  }
};

const ICONS_MAP: Record<string, React.ReactNode> = {
  Flame: <Flame className="w-5 h-5 text-orange-400" />,
  Droplets: <Droplets className="w-5 h-5 text-sky-400" />,
  Zap: <Zap className="w-5 h-5 text-purple-400" />,
  Shield: <Shield className="w-5 h-5 text-yellow-400" />,
  Snowflake: <Snowflake className="w-5 h-5 text-cyan-400" />,
  Sparkles: <Sparkles className="w-5 h-5 text-pink-400" />,
  FlameKindling: <Flame className="w-5 h-5 text-red-500" />,
  Skull: <Skull className="w-5 h-5 text-red-600" />,
  PawPrint: <PawPrint className="w-5 h-5 text-emerald-400" />
};

export default function App() {
  const [gameState, setGameState] = useState<'TITLE_MENU' | 'PLAYING' | 'ROLEPLAY_RPG' | 'GAME_OVER'>('TITLE_MENU');
  const [playerStats, setPlayerStats] = useState<PlayerStats>(() => {
    const saved = leaderboardService.getSavedProfile();
    const initialName = saved?.name && saved.name !== 'Player One' ? saved.name : 'Aria';
    return { ...INITIAL_PLAYER_STATS, playerName: initialName };
  });
  const [currentRealmIndex, setCurrentRealmIndex] = useState<number>(0);
  const [latestGesture, setLatestGesture] = useState<DetectedGesture | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [pipMinimized, setPipMinimized] = useState<boolean>(false);
  const [portalActive, setPortalActive] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [language, setLanguage] = useState<AppLanguage>(() => {
    const saved = localStorage.getItem('arcane_language') as AppLanguage | null;
    return saved && LANGUAGES.some((l) => l.code === saved) ? saved : 'en';
  });
  const [appThemeId, setAppThemeId] = useState<AppThemeId>(() => {
    const saved = localStorage.getItem('arcane_theme') as AppThemeId | null;
    return saved && APP_THEMES.some((th) => th.id === saved) ? saved : 'obsidian_gold';
  });

  const activeTheme = APP_THEMES.find((th) => th.id === appThemeId) || APP_THEMES[0];
  const langMeta = LANGUAGES.find((l) => l.code === language);
  const t = getTranslation(language);

  const handleChangeLanguage = (nextLang: AppLanguage) => {
    setLanguage(nextLang);
    localStorage.setItem('arcane_language', nextLang);
  };

  const handleChangeTheme = (nextThemeId: AppThemeId) => {
    setAppThemeId(nextThemeId);
    localStorage.setItem('arcane_theme', nextThemeId);
  };

  const [unlockedPowerBanner, setUnlockedPowerBanner] = useState<{
    goal: GoalDefinition;
    spell: SpellDefinition;
  } | null>(null);

  const [newPowerTutorial, setNewPowerTutorial] = useState<{
    goal: GoalDefinition;
    spell: SpellDefinition;
  } | null>(null);

  const [showGrimoire, setShowGrimoire] = useState<boolean>(false);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [showCalibration, setShowCalibration] = useState<boolean>(false);
  const [showRealms, setShowRealms] = useState<boolean>(false);
  const [showArmory, setShowArmory] = useState<boolean>(false);
  const [showHandCustomizer, setShowHandCustomizer] = useState<boolean>(false);
  const [showTrainingDojo, setShowTrainingDojo] = useState<boolean>(false);
  const [trainingTargetSpellId, setTrainingTargetSpellId] = useState<SpellId>('fireball');
  const [showMultiplayerLobby, setShowMultiplayerLobby] = useState<boolean>(false);
  const [multiplayerEnabled, setMultiplayerEnabled] = useState<boolean>(false);
  const [multiplayerRoomCode, setMultiplayerRoomCode] = useState<string>('PUBLIC');

  const handleOpenTrainingDojo = useCallback((spellId?: SpellId) => {
    if (spellId) setTrainingTargetSpellId(spellId);
    setShowTrainingDojo(true);
  }, []);

  const [playerCountry, setPlayerCountry] = useState<CountryInfo>(() =>
    leaderboardService.detectPlayerCountry()
  );

  const p5ContainerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<P5GameEngine | null>(null);
  const playerStatsRef = useRef(playerStats);
  useEffect(() => {
    playerStatsRef.current = playerStats;
  }, [playerStats]);

  const initWebcam = useCallback(async () => {
    if (!videoRef.current) return;
    const success = await cameraManager.initialize(videoRef.current, (dualHands) => {
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      const detected = gestureDetector.processDualLandmarks(
        dualHands,
        playerStatsRef.current.unlockedSpellIds,
        playerStatsRef.current.level,
        screenW,
        screenH
      );
      setLatestGesture(detected);
      if (engineRef.current) {
        engineRef.current.updateGesture(detected);
      }
    });
    setCameraActive(success);
  }, []);

  // Attach live webcam stream to visible PiP video mirror
  useEffect(() => {
    if (gameState === 'PLAYING' && cameraActive && !pipMinimized && pipVideoRef.current) {
      const stream = cameraManager.getStream();
      if (stream && pipVideoRef.current.srcObject !== stream) {
        pipVideoRef.current.srcObject = stream;
        pipVideoRef.current.play().catch(() => {});
      }
    }
  }, [gameState, cameraActive, pipMinimized]);

  // Draw crisp mirrored hand skeleton inside PiP camera monitor
  useEffect(() => {
    const canvas = pipCanvasRef.current;
    if (!canvas || pipMinimized || gameState !== 'PLAYING') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!latestGesture?.handFound) return;

    const skinId = playerStats.upgrades.handSkin || 'arcane_wireframe';
    const skin = HAND_SKINS_CATALOG.find((s) => s.id === skinId) || HAND_SKINS_CATALOG[0];
    const strokeClr = playerStats.upgrades.handGlowOverride || skin.primaryColor;

    const drawMiniHand = (lm: HandPoint[] | null) => {
      if (!lm || lm.length < 21) return;
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [5, 9], [9, 10], [10, 11], [11, 12],
        [9, 13], [13, 14], [14, 15], [15, 16],
        [13, 17], [17, 18], [18, 19], [19, 20],
        [0, 17]
      ];
      ctx.strokeStyle = strokeClr;
      ctx.lineWidth = 2.5;
      connections.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo((1 - lm[a].x) * canvas.width, lm[a].y * canvas.height);
        ctx.lineTo((1 - lm[b].x) * canvas.width, lm[b].y * canvas.height);
        ctx.stroke();
      });
      lm.forEach((pt, idx) => {
        ctx.fillStyle = [4, 8, 12, 16, 20].includes(idx) ? '#fbbf24' : '#ffffff';
        ctx.beginPath();
        ctx.arc((1 - pt.x) * canvas.width, pt.y * canvas.height, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    drawMiniHand(latestGesture.dualLandmarks?.left || null);
    drawMiniHand(latestGesture.dualLandmarks?.right || null);
  }, [latestGesture, pipMinimized, gameState, playerStats.upgrades.handSkin, playerStats.upgrades.handGlowOverride]);

  // Keyboard shortcut [K] to unlock Portal with Key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'PLAYING' && portalActive && e.key.toLowerCase() === 'k') {
        engineRef.current?.triggerPortalWarp();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, portalActive]);

  // Background Soundtrack Management (Arena Battle Score vs Roleplay/Menu Ambient)
  useEffect(() => {
    if (gameState === 'PLAYING') {
      audioEngine.startBackgroundMusic('arena');
    } else if (gameState === 'ROLEPLAY_RPG' || gameState === 'TITLE_MENU') {
      audioEngine.startBackgroundMusic('ambient');
    } else {
      audioEngine.stopBackgroundMusic();
    }
  }, [gameState]);

  useEffect(() => {
    const unlock = () => audioEngine.unlockAndResumeMusic();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (gameState === 'PLAYING' && p5ContainerRef.current && !engineRef.current) {
      engineRef.current = new P5GameEngine(
        p5ContainerRef.current,
        playerStatsRef.current,
        (updatedStats) => {
          setPlayerStats({ ...updatedStats });
        },
        () => {
          setGameState('GAME_OVER');
        },
        (newRealmIndex) => {
          setCurrentRealmIndex(newRealmIndex);
          setPortalActive(false);
        },
        (goal, unlockedSpell) => {
          setUnlockedPowerBanner({ goal, spell: unlockedSpell });
        },
        (goal, unlockedSpell) => {
          setNewPowerTutorial({ goal, spell: unlockedSpell });
          if (engineRef.current) {
            engineRef.current.destroy();
            engineRef.current = null;
          }
          setGameState('TITLE_MENU');
        },
        (active) => setPortalActive(active),
        activeTheme
      );

      initWebcam();
    }

    return () => {
      if (gameState !== 'PLAYING' && engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [gameState, initWebcam]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setAppTheme(activeTheme);
    }
  }, [activeTheme]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateStats({
        level: playerStats.level,
        unlockedSpellIds: playerStats.unlockedSpellIds,
        upgrades: playerStats.upgrades,
        portalKeys: playerStats.portalKeys,
        arenaPowersCount: playerStats.arenaPowersCount
      });
    }
  }, [
    playerStats.level,
    playerStats.unlockedSpellIds,
    playerStats.upgrades,
    playerStats.portalKeys,
    playerStats.arenaPowersCount
  ]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!engineRef.current || cameraActive || gameState !== 'PLAYING') return;
    const normX = e.clientX / window.innerWidth;
    const normY = e.clientY / window.innerHeight;

    const simulatedGesture: GestureId =
      latestGesture?.gesture && latestGesture.gesture !== 'NONE'
        ? latestGesture.gesture
        : 'DUAL_PALMS_FORWARD';

    const simulated = handSimulator.generateDualSimulatedLandmarks(simulatedGesture, normX, normY, true);
    const detected = gestureDetector.processDualLandmarks(
      simulated,
      playerStats.unlockedSpellIds,
      playerStats.level,
      window.innerWidth,
      window.innerHeight
    );
    setLatestGesture(detected);
    engineRef.current.updateGesture(detected);
  };

  const handlePointerDown = () => {
    if (!engineRef.current || cameraActive || gameState !== 'PLAYING') return;
    engineRef.current.triggerManualCast(SPELL_CATALOG[0]);
  };

  const handleSimulateGesture = (gestureId: string) => {
    const spell = SPELL_CATALOG.find((s) => s.gesture === gestureId);
    const simulated = handSimulator.generateDualSimulatedLandmarks(
      gestureId as GestureId,
      0.5,
      0.5,
      !spell?.requiresTwoHands
    );
    const detected = gestureDetector.processDualLandmarks(
      simulated,
      playerStats.unlockedSpellIds,
      playerStats.level,
      window.innerWidth,
      window.innerHeight
    );
    setLatestGesture(detected);
    if (engineRef.current) {
      engineRef.current.updateGesture(detected);
      if (detected.matchedSpell && detected.isUnlocked) {
        engineRef.current.triggerManualCast(detected.matchedSpell);
      }
    }
  };

  const handleCastSpell = (spell: SpellDefinition) => {
    engineRef.current?.triggerManualCast(spell);
  };

  const handleTriggerPortalWarp = () => {
    engineRef.current?.triggerPortalWarp();
  };

  const handleStartGame = () => {
    audioEngine.playLevelUp();
    setUnlockedPowerBanner(null);
    setNewPowerTutorial(null);
    setGameState('PLAYING');
  };

  const handleEnterRPG = () => {
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
    audioEngine.playRealmWarp();
    setGameState('ROLEPLAY_RPG');
  };

  const handleRestartGame = () => {
    const keptName = playerStats.playerName || 'Aria';
    const nextInitial: PlayerStats = { ...INITIAL_PLAYER_STATS, playerName: keptName };
    setPlayerStats(nextInitial);
    setCurrentRealmIndex(0);
    setPortalActive(false);
    setUnlockedPowerBanner(null);
    setNewPowerTutorial(null);
    if (engineRef.current) {
      engineRef.current.restart(nextInitial);
    }
    setGameState('PLAYING');
  };

  const handleReturnToHome = () => {
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
    if (multiplayerEnabled) {
      multiplayerClient.disconnect();
      setMultiplayerEnabled(false);
    }
    setPortalActive(false);
    setUnlockedPowerBanner(null);
    setGameState('TITLE_MENU');
  };

  const handleJoinMultiplayer = (roomCode: string, mode: 'rpg' | 'arena') => {
    const cleanName = (playerStats.playerName || 'Aria').trim() || 'Aria';
    setMultiplayerRoomCode(roomCode);
    setMultiplayerEnabled(true);
    setShowMultiplayerLobby(false);
    multiplayerClient.connect(roomCode, {
      name: cleanName,
      zone: 'town_square',
      x: 400,
      y: 365,
      facing: 1,
      pose: 'idle',
      outfit: playerStats.rpgOutfit,
      mode
    });
    if (mode === 'rpg') {
      handleEnterRPG();
    } else {
      handleStartGame();
    }
  };

  useEffect(() => {
    if (multiplayerEnabled && gameState === 'PLAYING') {
      multiplayerClient.sendPlayerUpdate({
        name: (playerStats.playerName || 'Aria').trim() || 'Aria',
        mode: 'arena',
        arenaWave: playerStats.wave,
        arenaScore: playerStats.score
      });
    }
  }, [multiplayerEnabled, gameState, playerStats.wave, playerStats.score, playerStats.playerName]);

  const handleGoToHomeWithNewPower = (goal: GoalDefinition, spell: SpellDefinition) => {
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
    setNewPowerTutorial({ goal, spell });
    setUnlockedPowerBanner(null);
    setGameState('TITLE_MENU');
  };

  const handleResumeFromTutorial = () => {
    if (newPowerTutorial) {
      const spellId = newPowerTutorial.spell.id;
      if (!playerStats.unlockedSpellIds.includes(spellId)) {
        setPlayerStats((prev) => ({
          ...prev,
          unlockedSpellIds: [...prev.unlockedSpellIds, spellId]
        }));
      }
    }
    setNewPowerTutorial(null);
    setGameState('PLAYING');
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    audioEngine.setMuted(next);
  };

  const handleUpdatePlayerName = (nextName: string) => {
    const sanitized = nextName.slice(0, 20);
    setPlayerStats((prev) => ({ ...prev, playerName: sanitized }));
    leaderboardService.saveProfile(sanitized.trim() || 'Aria', playerCountry.code);
  };

  const heroDisplayName = (playerStats.playerName || 'Aria').trim() || 'Aria';
  const currentRealm = WORLD_REALMS[currentRealmIndex] || WORLD_REALMS[0];
  const currentArmor = ARMOR_CATALOG.find((a) => a.id === playerStats.upgrades.armorTier) || ARMOR_CATALOG[0];

  return (
    <div
      dir={langMeta?.dir || 'ltr'}
      className="relative w-screen h-screen overflow-hidden bg-slate-950 flex flex-col font-sans select-none"
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
    >
      <video ref={videoRef} playsInline muted className="hidden" />

      <TopNav
        onOpenGrimoire={() => setShowGrimoire(true)}
        onOpenLeaderboard={() => setShowLeaderboard(true)}
        onOpenCalibration={() => setShowCalibration(true)}
        onOpenRealms={() => setShowRealms(true)}
        onOpenTrainingDojo={() => handleOpenTrainingDojo()}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        language={language}
        onChangeLanguage={handleChangeLanguage}
        appTheme={activeTheme}
        onChangeTheme={handleChangeTheme}
      />

      {gameState === 'TITLE_MENU' && (
        <div className="relative flex-1 flex flex-col items-center justify-center p-6 text-center z-20 overflow-y-auto">
          <div className={`absolute inset-0 bg-gradient-to-b ${activeTheme.homeBgClass} -z-10 transition-colors duration-500`} />
          <div className={`absolute w-[620px] h-[620px] rounded-full ${activeTheme.auraBlobClass} blur-3xl pointer-events-none -z-10 transition-colors duration-500`} />

          <div className="max-w-3xl mx-auto my-auto py-4">
            <div className={`flex items-center justify-center gap-2 text-xs font-semibold tracking-widest ${activeTheme.accentTextClass} uppercase mb-3`}>
              <span>{t.tagline}</span>
            </div>

            <h1 className="font-cinzel text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-100 mb-3">
              {t.brand}
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto mb-5 leading-relaxed">
              Welcome, <span className={`font-bold ${activeTheme.accentTextClass}`}>{heroDisplayName}</span>! {t.heroDesc}
            </p>

            {/* Adventurer Name Card */}
            <div className={`mb-5 px-4 py-2.5 rounded-xl border ${activeTheme.cardClass} max-w-md mx-auto flex items-center justify-between gap-3`}>
              <label htmlFor="hero-name-input" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 shrink-0">
                <User className={`w-3.5 h-3.5 ${activeTheme.accentTextClass}`} />
                <span>Your Name:</span>
              </label>
              <input
                id="hero-name-input"
                type="text"
                value={playerStats.playerName ?? ''}
                onChange={(e) => handleUpdatePlayerName(e.target.value)}
                maxLength={20}
                placeholder="Enter your name..."
                className="flex-1 min-w-0 bg-slate-950/90 border border-slate-700 focus:border-amber-400 focus:outline-none rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-100"
              />
            </div>

            {newPowerTutorial ? (
              <div className={`p-5 rounded-2xl bg-slate-900/95 border ${activeTheme.borderAccentClass} shadow-2xl mb-6 text-left`}>
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
                  <div className={`flex items-center gap-2 text-xs font-bold ${activeTheme.accentTextClass} uppercase tracking-wider`}>
                    <Award className="w-4 h-4" />
                    <span>{newPowerTutorial.goal.title}</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-semibold">{t.newPowerUnlocked}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center mb-4">
                  <div className="sm:col-span-8 space-y-3">
                    <div className="flex items-start gap-4">
                      <div
                        className="p-3 rounded-xl bg-slate-950 border shrink-0 shadow-lg"
                        style={{
                          borderColor: newPowerTutorial.spell.color,
                          boxShadow: `0 0 18px ${newPowerTutorial.spell.color}35`
                        }}
                      >
                        {ICONS_MAP[newPowerTutorial.spell.iconName] || <Sparkles className="w-6 h-6 text-amber-400" />}
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-amber-400">
                          {newPowerTutorial.spell.requiresTwoHands ? '2-Hand Special Technique' : '1-Hand / Dual-Boost Technique'}
                        </div>
                        <h3 className="font-bold text-lg text-slate-100">{newPowerTutorial.spell.name}</h3>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">{newPowerTutorial.spell.description}</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <div className="text-amber-400 font-semibold mb-0.5">
                        Hand Posture · {newPowerTutorial.spell.gestureName}
                      </div>
                      <div className="text-slate-200 leading-relaxed">{newPowerTutorial.spell.fingerDescription}</div>
                    </div>
                  </div>

                  {/* Animated Spell Gesture Diagram */}
                  <div className="sm:col-span-4 flex flex-col items-center justify-center p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <svg viewBox="0 0 140 110" className="w-32 h-24">
                      <defs>
                        <radialGradient id="spellTutorialAura" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor={newPowerTutorial.spell.color} stopOpacity="0.6" />
                          <stop offset="100%" stopColor={newPowerTutorial.spell.color} stopOpacity="0" />
                        </radialGradient>
                      </defs>
                      <circle cx="70" cy="55" r="46" fill="url(#spellTutorialAura)" />
                      <circle
                        cx="70"
                        cy="55"
                        r="36"
                        fill="none"
                        stroke={newPowerTutorial.spell.color}
                        strokeWidth="1.5"
                        strokeDasharray="6 4"
                      >
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          from="0 70 55"
                          to="360 70 55"
                          dur="8s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      {/* Palm & Finger Guide Diagram */}
                      <g transform="translate(70,62)" stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round" fill="none">
                        <rect x="-12" y="-6" width="24" height="22" rx="8" fill="#1e293b" stroke={newPowerTutorial.spell.color} />
                        {newPowerTutorial.spell.gesture === 'DUAL_RAISED_FISTS' ? (
                          <>
                            <circle cx="-8" cy="-4" r="3" fill="#fbbf24" />
                            <circle cx="-3" cy="-5" r="3" fill="#fbbf24" />
                            <circle cx="3" cy="-5" r="3" fill="#fbbf24" />
                            <circle cx="8" cy="-4" r="3" fill="#fbbf24" />
                          </>
                        ) : newPowerTutorial.spell.gesture === 'CROSS_INDEX_POINT' ? (
                          <>
                            <line x1="-4" y1="-6" x2="-4" y2="-30" stroke="#38bdf8" strokeWidth="3.5" />
                            <circle cx="-4" cy="-31" r="3.5" fill={newPowerTutorial.spell.color} stroke="none" />
                          </>
                        ) : newPowerTutorial.spell.gesture === 'DUAL_PEACE_SPREAD' ? (
                          <>
                            <line x1="-5" y1="-6" x2="-12" y2="-30" stroke="#38bdf8" strokeWidth="3.2" />
                            <line x1="3" y1="-6" x2="10" y2="-30" stroke="#38bdf8" strokeWidth="3.2" />
                            <circle cx="-12" cy="-31" r="3" fill={newPowerTutorial.spell.color} stroke="none" />
                            <circle cx="10" cy="-31" r="3" fill={newPowerTutorial.spell.color} stroke="none" />
                          </>
                        ) : newPowerTutorial.spell.gesture === 'THUMBS_UP_DUAL' ? (
                          <line x1="-12" y1="2" x2="-22" y2="-22" stroke="#f59e0b" strokeWidth="4" />
                        ) : (
                          <>
                            <line x1="-11" y1="4" x2="-20" y2="-10" />
                            <line x1="-7" y1="-6" x2="-9" y2="-29" />
                            <line x1="-2" y1="-6" x2="-2" y2="-33" />
                            <line x1="4" y1="-6" x2="5" y2="-30" />
                            {newPowerTutorial.spell.gesture !== 'FIST_AND_PALM' && (
                              <line x1="9" y1="-4" x2="14" y2="-23" />
                            )}
                          </>
                        )}
                      </g>
                    </svg>
                    <span className="text-[10px] text-slate-400 font-mono mt-1">
                      {newPowerTutorial.spell.requiresTwoHands ? 'Mirror Both Hands' : 'Hold Steady Posture'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleOpenTrainingDojo(newPowerTutorial.spell.id)}
                    className={`w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 ${activeTheme.accentTextClass} font-cinzel font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{t.practiceInDojo}</span>
                  </button>
                  <button
                    onClick={handleResumeFromTutorial}
                    className={`w-full py-3 bg-gradient-to-r ${activeTheme.primaryBtnClass} font-cinzel font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all`}
                  >
                    <span>{t.equipAndEnterBattle}</span>
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                <button
                  onClick={handleStartGame}
                  className={`px-7 py-3.5 bg-gradient-to-r ${activeTheme.primaryBtnClass} font-cinzel font-extrabold text-sm rounded-xl shadow-xl active:scale-95 transition-all flex items-center gap-2.5 cursor-pointer`}
                >
                  <Swords className="w-5 h-5" />
                  <span>{t.defendWaves}</span>
                </button>

                <button
                  onClick={handleEnterRPG}
                  className="px-6 py-3.5 bg-red-950/80 hover:bg-red-900 border border-red-500/60 text-red-200 font-cinzel font-bold text-sm rounded-xl shadow-xl transition-all flex items-center gap-2.5 cursor-pointer"
                >
                  <Skull className="w-5 h-5 text-red-400" />
                  <span>{t.roleplayWorld}</span>
                </button>

                <button
                  onClick={() => setShowMultiplayerLobby(true)}
                  className="px-6 py-3.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-cinzel font-bold text-sm rounded-xl shadow-xl transition-all flex items-center gap-2.5 cursor-pointer"
                >
                  <Users className="w-5 h-5" />
                  <span>Multiplayer &amp; Co-op</span>
                </button>

                <button
                  onClick={() => handleOpenTrainingDojo('fireball')}
                  className={`px-5 py-3.5 bg-slate-900/80 hover:bg-slate-800 border ${activeTheme.borderAccentClass} ${activeTheme.accentTextClass} font-cinzel font-bold text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer`}
                >
                  <Sparkles className="w-5 h-5" />
                  <span>{t.tutorialDojo}</span>
                </button>

                <button
                  onClick={() => setShowHandCustomizer(true)}
                  className="px-5 py-3.5 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 font-semibold text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Hand className="w-5 h-5 text-sky-400" />
                  <span>{t.customizeHands}</span>
                </button>

                <button
                  onClick={() => setShowArmory(true)}
                  className="px-5 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className={`w-5 h-5 ${activeTheme.accentTextClass}`} />
                  <span>{t.armory} ({playerStats.upgrades.arcanePoints} AP)</span>
                </button>
              </div>
            )}

            {/* Home & Arena Theme Swatch Bar */}
            <div className={`mb-5 p-3 rounded-xl border ${activeTheme.cardClass} max-w-2xl mx-auto flex flex-wrap items-center justify-center gap-2`}>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mr-1">
                <Palette className="w-3.5 h-3.5" style={{ color: activeTheme.accentHex }} />
                {t.homeArenaTheme}:
              </span>
              {APP_THEMES.map((theme) => {
                const selected = theme.id === appThemeId;
                return (
                  <button
                    key={theme.id}
                    onClick={() => handleChangeTheme(theme.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                      selected
                        ? 'bg-slate-800 text-white border-white/50 shadow'
                        : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        background: `linear-gradient(135deg, ${theme.accentHex}, ${theme.secondaryHex})`
                      }}
                    />
                    <span>{theme.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
              <div className={`p-3 rounded-xl border ${activeTheme.cardClass}`}>
                <div className="text-[11px] text-slate-400">{t.archMageRank}</div>
                <div className={`font-mono-num font-bold ${activeTheme.accentTextClass} text-sm mt-0.5`}>Level {playerStats.level}</div>
              </div>
              <div className={`p-3 rounded-xl border ${activeTheme.cardClass}`}>
                <div className="text-[11px] text-slate-400">{t.portalKeys}</div>
                <div className="font-mono-num font-bold text-purple-300 text-sm mt-0.5">{playerStats.portalKeys} Keys</div>
              </div>
              <div className={`p-3 rounded-xl border ${activeTheme.cardClass}`}>
                <div className="text-[11px] text-slate-400">{t.equippedArmor}</div>
                <div className="font-semibold text-slate-200 text-sm mt-0.5 truncate">{currentArmor.name}</div>
              </div>
              <div className={`p-3 rounded-xl border ${activeTheme.cardClass}`}>
                <div className="text-[11px] text-slate-400">{t.powersMastered}</div>
                <div className="font-mono-num font-bold text-emerald-400 text-sm mt-0.5">
                  {playerStats.unlockedSpellIds.length} / {SPELL_CATALOG.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {gameState === 'ROLEPLAY_RPG' && (
        <RPGCatacombsCanvas
          playerStats={playerStats}
          onUpdateStats={(newStats) => {
            if (typeof newStats.playerName === 'string') {
              leaderboardService.saveProfile(newStats.playerName.trim() || 'Aria', playerCountry.code);
            }
            setPlayerStats((prev) => ({ ...prev, ...newStats }));
          }}
          onReturnToBattle={handleStartGame}
          onReturnToHome={handleReturnToHome}
          language={language}
          latestGesture={latestGesture}
          cameraActive={cameraActive}
          onEnsureCamera={initWebcam}
          onSimulateGesture={handleSimulateGesture}
          multiplayerEnabled={multiplayerEnabled}
          multiplayerRoomCode={multiplayerRoomCode}
          onOpenMultiplayerLobby={() => setShowMultiplayerLobby(true)}
        />
      )}

      {gameState === 'PLAYING' && (
        <div className="relative flex-1 w-full h-full overflow-hidden">
          <div ref={p5ContainerRef} className="absolute inset-0 w-full h-full" />

          <HUD
            stats={playerStats}
            currentRealm={currentRealm}
            gesture={latestGesture}
            onCastSpell={handleCastSpell}
            portalActive={portalActive}
            onTriggerWarp={handleTriggerPortalWarp}
            cameraActive={cameraActive}
            onReturnToHome={handleReturnToHome}
            onOpenRPG={handleEnterRPG}
            onOpenArmory={() => setShowArmory(true)}
            onOpenHandCustomizer={() => setShowHandCustomizer(true)}
            onOpenTrainingDojo={() => handleOpenTrainingDojo()}
            unlockedPowerBanner={unlockedPowerBanner}
            onGoToHomeWithNewPower={handleGoToHomeWithNewPower}
            language={language}
            appTheme={activeTheme}
          />

          {/* Live Mirrored Picture-in-Picture Webcam & Hand Skeleton Monitor */}
          <div className="absolute bottom-4 right-4 z-20 pointer-events-auto">
            <div
              className={`bg-slate-950/90 backdrop-blur-md border border-slate-700 rounded-xl overflow-hidden shadow-2xl transition-all ${
                pipMinimized ? 'w-12 h-12' : 'w-48 h-36 md:w-56 md:h-42'
              }`}
            >
              <div className="flex items-center justify-between p-1.5 bg-slate-900/95 border-b border-slate-800 text-[10px] text-slate-300">
                <span className="font-semibold truncate pl-1">
                  {cameraActive ? `Hands: ${latestGesture?.handsCount || 0}/2` : 'Fallback Aim'}
                </span>
                <button
                  onClick={() => setPipMinimized(!pipMinimized)}
                  className="p-1 hover:text-white transition-colors cursor-pointer"
                >
                  {pipMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                </button>
              </div>

              {!pipMinimized && (
                <div className="relative w-full h-[calc(100%-26px)] bg-slate-950 flex items-center justify-center overflow-hidden">
                  {cameraActive ? (
                    <>
                      <video
                        ref={pipVideoRef}
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1] opacity-80"
                      />
                      <canvas
                        ref={pipCanvasRef}
                        width={224}
                        height={160}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                      />
                    </>
                  ) : (
                    <div className="p-2 text-center text-amber-400 text-[10px]">
                      <VideoOff className="w-5 h-5 mx-auto mb-1 text-slate-600" />
                      <div>Pointer Fallback</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {multiplayerEnabled && (
            <MultiplayerChatBar
              mode="arena"
              onOpenRoomSwitcher={() => setShowMultiplayerLobby(true)}
            />
          )}
        </div>
      )}

      {gameState === 'GAME_OVER' && (
        <GameOverModal
          stats={playerStats}
          playerCountry={playerCountry}
          onRestart={handleRestartGame}
          onReturnToHome={handleReturnToHome}
          onViewLeaderboard={() => setShowLeaderboard(true)}
        />
      )}

      {showArmory && (
        <ArmoryModal
          stats={playerStats}
          onUpdateStats={(newStats) => setPlayerStats((prev) => ({ ...prev, ...newStats }))}
          onClose={() => setShowArmory(false)}
        />
      )}

      {showHandCustomizer && (
        <HandCustomizerModal
          stats={playerStats}
          onUpdateStats={(newStats) => setPlayerStats((prev) => ({ ...prev, ...newStats }))}
          onClose={() => setShowHandCustomizer(false)}
        />
      )}

      {showGrimoire && (
        <SpellGrimoire
          unlockedSpellIds={playerStats.unlockedSpellIds}
          playerLevel={playerStats.level}
          onClose={() => setShowGrimoire(false)}
          onOpenTrainingDojo={(spellId) => handleOpenTrainingDojo(spellId)}
          onSelectSpellToCast={(spell) => {
            if (gameState === 'PLAYING') handleCastSpell(spell);
            setShowGrimoire(false);
          }}
        />
      )}

      {showTrainingDojo && (
        <SpellTrainingDojo
          unlockedSpellIds={playerStats.unlockedSpellIds}
          initialSpellId={trainingTargetSpellId}
          cameraActive={cameraActive}
          onRestartCamera={initWebcam}
          onClose={() => setShowTrainingDojo(false)}
          dualLandmarks={latestGesture?.dualLandmarks}
        />
      )}

      {showCalibration && (
        <HandCalibrationModal
          onClose={() => setShowCalibration(false)}
          gesture={latestGesture}
          cameraActive={cameraActive}
          onRestartCamera={initWebcam}
          onSimulateGesture={handleSimulateGesture}
        />
      )}

      {showRealms && (
        <RealmsModal
          currentRealmIndex={currentRealmIndex}
          onClose={() => setShowRealms(false)}
          onWarpToRealm={(idx) => {
            setCurrentRealmIndex(idx);
            if (engineRef.current) {
              engineRef.current.updateStats({ wave: idx + 1 });
            }
          }}
        />
      )}

      {showLeaderboard && (
        <LeaderboardModal
          playerCountry={playerCountry}
          onUpdateCountry={(newCountry) => setPlayerCountry(newCountry)}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {showMultiplayerLobby && (
        <MultiplayerLobbyModal
          playerName={playerStats.playerName || 'Aria'}
          currentRoomCode={multiplayerRoomCode}
          onUpdatePlayerName={handleUpdatePlayerName}
          onJoinMultiplayer={handleJoinMultiplayer}
          onClose={() => setShowMultiplayerLobby(false)}
        />
      )}
    </div>
  );
}
