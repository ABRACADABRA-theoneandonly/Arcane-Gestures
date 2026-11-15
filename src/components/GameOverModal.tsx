import React, { useState } from 'react';
import { PlayerStats, CountryInfo } from '../types/game';
import { SPELL_CATALOG } from '../data/spellsAndRealms';
import { leaderboardService, REAL_COUNTRIES } from '../services/leaderboardService';
import { Trophy, RotateCcw, Check, Sparkles, Home, Flame, Droplets, Zap, Shield, Snowflake, Award, Skull, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GameOverModalProps {
  stats: PlayerStats;
  playerCountry: CountryInfo;
  onRestart: () => void;
  onReturnToHome: () => void;
  onViewLeaderboard: () => void;
}

const ICONS_MAP: Record<string, React.ReactNode> = {
  Flame: <Flame className="w-5 h-5 text-orange-400" />,
  Droplets: <Droplets className="w-5 h-5 text-sky-400" />,
  Zap: <Zap className="w-5 h-5 text-purple-400" />,
  Shield: <Shield className="w-5 h-5 text-yellow-400" />,
  Snowflake: <Snowflake className="w-5 h-5 text-cyan-400" />,
  Sparkles: <Sparkles className="w-5 h-5 text-pink-400" />,
  FlameKindling: <Flame className="w-5 h-5 text-red-500" />,
  Skull: <Skull className="w-5 h-5 text-red-500" />
};

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  playerCountry,
  onRestart,
  onReturnToHome,
  onViewLeaderboard
}) => {
  const [playerName, setPlayerName] = useState(
    () => stats.playerName?.trim() || leaderboardService.getSavedProfile().name || 'Aria'
  );
  const [countryCode, setCountryCode] = useState(playerCountry.code);
  const [submitted, setSubmitted] = useState(false);

  const accuracy = stats.spellsCast > 0 
    ? Math.round((stats.spellsHit / stats.spellsCast) * 1000) / 10 
    : 0;

  // Find spells earned during this run
  const earnedSpells = SPELL_CATALOG.filter(s => 
    stats.unlockedInThisSession?.includes(s.id) || (stats.unlockedSpellIds?.includes(s.id) && s.id !== 'fireball')
  );

  const handleSubmitScore = () => {
    if (submitted) return;
    leaderboardService.saveProfile(playerName, countryCode);
    leaderboardService.recordPlayerScore(
      stats,
      playerName,
      countryCode,
      stats.unlockedSpellIds?.includes('celestial_beam') 
        ? 'Celestial Nova Beam' 
        : stats.unlockedSpellIds?.includes('lightning') 
        ? 'Lightning Lance' 
        : 'Infernal Fireball'
    );
    setSubmitted(true);
    confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl text-center my-auto">
        {/* Title Lockup */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mb-2">
          <span>⚔️ DEFEAT DEBRIEF</span>
          <span>·</span>
          <span>WAVE {stats.wave}</span>
        </div>
        <h2 className="font-cinzel text-2xl sm:text-3xl font-bold text-slate-100 mb-1">
          Well Fought, {playerName.trim() || 'Hero'}
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          Review your combat rewards, newly earned powers, and verified metrics
        </p>

        {/* SECTION: What You've Earned in this Run */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-amber-500/40 text-left mb-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
              <Award className="w-4 h-4" />
              <span>What You've Earned This Run</span>
            </div>
            <span className="text-xs text-slate-400 font-mono-num">
              Level {stats.level} (+{stats.currentXp} XP)
            </span>
          </div>

          {/* Newly Unlocked Powers Showcase */}
          {earnedSpells.length > 0 ? (
            <div className="space-y-2 mb-3">
              <div className="text-[11px] font-medium text-slate-400">Newly Unlocked Spellcraft:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {earnedSpells.map((spell) => (
                  <div
                    key={spell.id}
                    className="p-2.5 rounded-lg bg-slate-900 border flex items-center gap-2.5 shadow-sm"
                    style={{ borderColor: spell.color + '66' }}
                  >
                    <div className="p-1.5 rounded-md bg-slate-950 shrink-0">
                      {ICONS_MAP[spell.iconName] || <Sparkles className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-semibold text-slate-100 truncate">{spell.name}</div>
                      <div className="text-[10px] text-amber-400 truncate">{spell.gestureName}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 mb-3">
              Starter Power Mastered: <strong className="text-amber-400">Infernal Fireball</strong>. Complete more combat milestones to unlock Hydro Torrent and Lightning Lance!
            </div>
          )}

          {/* Combat Milestones Acquired */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">Score Earned</div>
              <div className="font-mono-num font-bold text-amber-400 text-sm">
                +{stats.score.toLocaleString()}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">Arcane Points</div>
              <div className="font-mono-num font-bold text-sky-400 text-sm">
                {stats.upgrades?.arcanePoints || 0} AP
              </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">Accuracy</div>
              <div className="font-mono-num font-bold text-emerald-400 text-sm">
                {accuracy}%
              </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">Undead Slayed</div>
              <div className="font-mono-num font-bold text-slate-200 text-sm">
                {stats.zombiesKilled}
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard Submission Form */}
        <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 text-left mb-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Publish to World & National Rankings</span>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Spellcaster Callsign:</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                placeholder="Enter player name"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-1/2 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {REAL_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>

              <button
                onClick={handleSubmitScore}
                disabled={submitted}
                className={`flex-1 py-1 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  submitted
                    ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 cursor-default'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                }`}
              >
                {submitted ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Score Recorded!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Submit Score</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons: Clean exit to Home Menu without forcing replay */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <button
            onClick={onReturnToHome}
            className="w-full sm:flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home Menu</span>
          </button>
          <button
            onClick={onRestart}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Play Again</span>
          </button>
          <button
            onClick={onViewLeaderboard}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
};
