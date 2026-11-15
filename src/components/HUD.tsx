import React from 'react';
import { AppLanguage, PlayerStats, DetectedGesture, WorldRealm, SpellDefinition, GoalDefinition } from '../types/game';
import { SPELL_CATALOG, GOALS_CATALOG, ARMOR_CATALOG } from '../data/spellsAndRealms';
import { AppThemeConfig, getTranslation } from '../data/i18nAndThemes';
import {
  Flame,
  Droplets,
  Zap,
  Shield,
  Sparkles,
  Snowflake,
  Lock,
  Compass,
  Home,
  Target,
  ArrowRight,
  Skull,
  ShieldCheck,
  PawPrint,
  Key,
  Hand
} from 'lucide-react';

interface HUDProps {
  stats: PlayerStats;
  currentRealm: WorldRealm;
  gesture: DetectedGesture | null;
  onCastSpell: (spell: SpellDefinition) => void;
  portalActive: boolean;
  onTriggerWarp: () => void;
  cameraActive: boolean;
  onReturnToHome: () => void;
  onOpenRPG: () => void;
  onOpenArmory: () => void;
  onOpenHandCustomizer: () => void;
  onOpenTrainingDojo?: () => void;
  unlockedPowerBanner: { goal: GoalDefinition; spell: SpellDefinition } | null;
  onGoToHomeWithNewPower: (goal: GoalDefinition, spell: SpellDefinition) => void;
  language?: AppLanguage;
  appTheme?: AppThemeConfig;
}

const ICONS_MAP: Record<string, React.ReactNode> = {
  Flame: <Flame className="w-4 h-4 text-orange-400" />,
  Droplets: <Droplets className="w-4 h-4 text-sky-400" />,
  Zap: <Zap className="w-4 h-4 text-purple-400" />,
  Shield: <Shield className="w-4 h-4 text-yellow-400" />,
  Snowflake: <Snowflake className="w-4 h-4 text-cyan-400" />,
  Sparkles: <Sparkles className="w-4 h-4 text-pink-400" />,
  FlameKindling: <Flame className="w-4 h-4 text-red-500" />,
  Skull: <Skull className="w-4 h-4 text-red-600" />,
  PawPrint: <PawPrint className="w-4 h-4 text-emerald-400" />
};

export const HUD: React.FC<HUDProps> = ({
  stats,
  currentRealm,
  gesture,
  onCastSpell,
  portalActive,
  onTriggerWarp,
  cameraActive,
  onReturnToHome,
  onOpenRPG,
  onOpenArmory,
  onOpenHandCustomizer,
  onOpenTrainingDojo,
  unlockedPowerBanner,
  onGoToHomeWithNewPower,
  language = 'en',
  appTheme
}) => {
  const t = getTranslation(language);
  const panelBorder = appTheme?.borderAccentClass || 'border-slate-800';
  const accuracy =
    stats.spellsCast > 0 ? Math.round((stats.spellsHit / stats.spellsCast) * 1000) / 10 : 100;

  const currentArmor = ARMOR_CATALOG.find((a) => a.id === stats.upgrades.armorTier) || ARMOR_CATALOG[0];
  const nextGoal = GOALS_CATALOG.find((g) => !stats.unlockedSpellIds?.includes(g.unlockedSpellId));
  const nextSpellToUnlock = nextGoal ? SPELL_CATALOG.find((s) => s.id === nextGoal.unlockedSpellId) : null;
  const portalKeys = stats.portalKeys || 0;

  const heroName = (stats.playerName || 'Aria').trim() || 'Aria';

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 z-10">
      {/* Top Header Grid */}
      <div className="flex items-start justify-between gap-4">
        {/* Left: Player Status Bar + Armor */}
        <div className={`bg-slate-950/90 backdrop-blur-md border ${panelBorder} rounded-xl p-3.5 w-64 md:w-76 shadow-xl pointer-events-auto`}>
          <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2 mb-2">
            <span className={`font-cinzel font-bold truncate ${appTheme?.accentTextClass || 'text-amber-300'}`}>
              ✦ {heroName}
            </span>
            <span className="font-mono-num text-[11px] text-slate-400">Lv. {stats.level}</span>
          </div>
          <div className="mb-2">
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-red-400">{t.health}</span>
              <span className="font-mono-num text-slate-300">
                {Math.round(stats.hp)} / {stats.maxHp}
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-red-500 h-full transition-all duration-200"
                style={{ width: `${Math.max(0, (stats.hp / stats.maxHp) * 100)}%` }}
              />
            </div>
          </div>

          <div className="mb-2">
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-sky-400">{t.mana}</span>
              <span className="font-mono-num text-slate-300">
                {Math.round(stats.mana)} / {stats.maxMana}
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-sky-500 h-full transition-all duration-200"
                style={{ width: `${Math.max(0, (stats.mana / stats.maxMana) * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-2 text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-200 font-medium truncate max-w-[110px]">{currentArmor.name}</span>
              <span className="text-emerald-400">-{Math.round(currentArmor.damageReduction * 100)}%</span>
            </div>
            <button
              onClick={onOpenArmory}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-mono hover:underline cursor-pointer"
            >
              {stats.upgrades.arcanePoints} AP · Upgrade
            </button>
          </div>
        </div>

        {/* Center: Realm, Wave & Quick Mode Navigation */}
        <div className="text-center pointer-events-auto flex flex-col items-center gap-2 max-w-2xl">
          <div className={`bg-slate-950/90 backdrop-blur-md border ${panelBorder} rounded-xl px-4 py-2 shadow-xl flex flex-wrap items-center justify-center gap-2.5`}>
            <div className={`flex items-center gap-2 text-xs font-semibold tracking-wider ${appTheme?.accentTextClass || 'text-amber-400'} uppercase`}>
              <Compass className="w-3.5 h-3.5" />
              <span>Wave {stats.wave}</span>
              <span>·</span>
              <span className="truncate max-w-[150px]">{currentRealm.name}</span>
            </div>

            <div className="h-4 w-px bg-slate-800" />

            {onOpenTrainingDojo && (
              <button
                onClick={onOpenTrainingDojo}
                className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.dojo}</span>
              </button>
            )}

            <button
              onClick={onOpenHandCustomizer}
              className="px-2.5 py-1 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              title={t.customizeHands}
            >
              <Hand className="w-3.5 h-3.5 text-sky-400" />
              <span>{t.customizeHands}</span>
            </button>

            <button
              onClick={onOpenRPG}
              className="px-2.5 py-1 bg-red-950/70 hover:bg-red-900/80 border border-red-500/40 text-red-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Skull className="w-3.5 h-3.5 text-red-400" />
              <span>{t.roleplayWorld}</span>
            </button>

            <button
              onClick={onOpenArmory}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{t.armory}</span>
            </button>

            <button
              onClick={onReturnToHome}
              className="p-1 hover:text-white text-slate-400 transition-colors rounded cursor-pointer"
              title="Return to Home Menu"
            >
              <Home className="w-3.5 h-3.5" />
            </button>
          </div>

          {unlockedPowerBanner && (
            <div className="bg-gradient-to-r from-amber-950/90 via-slate-950/95 to-amber-950/90 border border-amber-500/60 rounded-xl p-2.5 shadow-2xl flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-amber-300">
                  {heroName}, New Power Unlocked: {unlockedPowerBanner.spell.name}!
                </div>
                <div className="text-[11px] text-slate-300">Active now! View tutorial in Home Sanctum.</div>
              </div>
              <button
                onClick={() => onGoToHomeWithNewPower(unlockedPowerBanner.goal, unlockedPowerBanner.spell)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1"
              >
                <span>Sanctum</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {nextGoal && nextSpellToUnlock && !unlockedPowerBanner && (
            <div className="bg-slate-950/80 backdrop-blur-md border border-amber-500/30 rounded-lg px-3.5 py-1.5 shadow-lg flex items-center gap-2 text-xs">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-300">
                Goal: <strong className="text-amber-300">{nextGoal.title}</strong>
              </span>
              <span className="text-slate-500">→</span>
              <span className="text-emerald-400 font-medium">{nextSpellToUnlock.name}</span>
            </div>
          )}

          {/* Key-Gated Dimensional Portal CTA */}
          {portalActive && (
            <button
              onClick={onTriggerWarp}
              className={`mt-1 px-6 py-2.5 font-cinzel font-bold text-sm rounded-lg shadow-lg transition-all cursor-pointer pointer-events-auto flex items-center gap-2 ${
                portalKeys > 0
                  ? 'bg-gradient-to-r from-sky-500 to-purple-600 text-white shadow-sky-500/25 hover:brightness-110 active:scale-95'
                  : 'bg-rose-950/90 border border-rose-500/60 text-rose-200 hover:bg-rose-900'
              }`}
            >
              <Key className="w-4 h-4 text-amber-300" />
              <span>
                {portalKeys > 0
                  ? `Use 1 Portal Key & Enter Next Realm [K] (${portalKeys} Left)`
                  : 'Portal Locked · Need 1 Key (Check Armory / RPG World)'}
              </span>
            </button>
          )}
        </div>

        {/* Right: Performance Metrics & Keys */}
        <div className={`bg-slate-950/90 backdrop-blur-md border ${panelBorder} rounded-xl p-3.5 w-56 md:w-64 shadow-xl pointer-events-auto text-right`}>
          <div className="text-xs text-slate-400 font-medium">{t.totalScore}</div>
          <div className={`font-mono-num text-2xl font-bold ${appTheme?.accentTextClass || 'text-amber-400'} mb-2`}>
            {stats.score.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-2 text-slate-400">
            <span>{t.accuracy}</span>
            <span className={`font-mono-num font-semibold ${accuracy >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {accuracy}%
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 text-slate-400">
            <span>{t.portalKeys}</span>
            <span className="font-mono-num text-amber-300 font-bold flex items-center gap-1">
              <Key className="w-3 h-3" /> {portalKeys}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 text-xs pt-1.5 border-t border-slate-800/80 mt-1.5">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <PawPrint className="w-3.5 h-3.5 inline" />
                <span>{t.skyBalloon}</span>
              </span>
              <span
                className={`font-mono-num font-bold ${
                  (stats.arenaPowersCount || 0) >= 20 && (stats.hiddenPowersFound?.length || 0) >= 20
                    ? 'text-emerald-300'
                    : 'text-slate-300'
                }`}
              >
                {(stats.arenaPowersCount || 0) >= 20 && (stats.hiddenPowersFound?.length || 0) >= 20
                  ? t.ready
                  : `${Math.min(20, stats.arenaPowersCount || 0) + Math.min(20, stats.hiddenPowersFound?.length || 0)}/40`}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono-num text-slate-400">
              <span className={(stats.arenaPowersCount || 0) >= 20 ? 'text-emerald-400' : ''}>
                Arena: {stats.arenaPowersCount || 0}/20
              </span>
              <span className={(stats.hiddenPowersFound?.length || 0) >= 20 ? 'text-emerald-400' : ''}>
                Hidden: {stats.hiddenPowersFound?.length || 0}/20
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Center Live Gesture Status Banner */}
      <div className="self-center pointer-events-auto">
        {gesture && gesture.handFound ? (
          <div className="flex flex-col items-center gap-1.5">
            {gesture.matchedSpell ? (
              gesture.isUnlocked ? (
                <div
                  className="bg-slate-950/90 backdrop-blur-md border rounded-xl px-5 py-2 shadow-2xl flex items-center gap-3"
                  style={{ borderColor: gesture.matchedSpell.color }}
                >
                  <span className="font-semibold text-sm text-slate-100">{gesture.matchedSpell.name}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-xs text-amber-300 font-medium">
                    {gesture.isDualBoosted
                      ? 'Dual-Hand Boosted (+45% Power)!'
                      : gesture.matchedSpell.requiresTwoHands
                      ? 'Special 2-Hand Art Active!'
                      : '1-Hand Casting Active'}
                  </span>
                </div>
              ) : (
                <div className="bg-slate-950/90 backdrop-blur-md border border-amber-500/50 rounded-xl px-5 py-2 shadow-2xl flex items-center gap-2.5 text-amber-300 text-sm">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Locked: {gesture.matchedSpell.name}</span>
                </div>
              )
            ) : (
              <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-xl px-4 py-1.5 text-xs text-slate-300">
                1-Hand: Open Palm = Fire · 3-Finger = Water · Index = Lightning · Fist = Shield · V = Ice · Thumb = Meteor
              </div>
            )}
          </div>
        ) : !cameraActive ? (
          <div className="bg-slate-950/70 backdrop-blur-md border border-slate-800 rounded-xl px-4 py-1.5 text-xs text-amber-400">
            Camera standby · Click spells below or enable webcam in Calibration
          </div>
        ) : null}
      </div>

      {/* Bottom Spell Quick-Cast Bar */}
      <div className="self-center bg-slate-950/90 backdrop-blur-md border border-slate-800/80 rounded-xl p-2 shadow-2xl pointer-events-auto flex items-center gap-2 overflow-x-auto max-w-[95vw]">
        {SPELL_CATALOG.map((spell) => {
          const isUnlocked = stats.unlockedSpellIds?.includes(spell.id) ?? stats.level >= spell.requiredLevel;
          return (
            <button
              key={spell.id}
              disabled={!isUnlocked}
              onClick={() => onCastSpell(spell)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all shrink-0 ${
                isUnlocked
                  ? spell.isForbidden
                    ? 'bg-red-950/80 border border-red-600 text-red-200 hover:bg-red-900 cursor-pointer active:scale-95'
                    : 'bg-slate-900 border border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-200 cursor-pointer active:scale-95'
                  : 'bg-slate-950/60 border border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
              }`}
              title={`${spell.name} (${spell.gestureName}): ${spell.fingerDescription}`}
            >
              {isUnlocked ? ICONS_MAP[spell.iconName] : <Lock className="w-3.5 h-3.5 text-slate-600" />}
              <span className="hidden sm:inline">{spell.name}</span>
              <span className="font-mono-num text-[10px] text-amber-400">
                {spell.requiresTwoHands ? '2H' : '1H/2H'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
