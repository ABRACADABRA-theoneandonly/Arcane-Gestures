import React from 'react';
import { SPELL_CATALOG, GOALS_CATALOG } from '../data/spellsAndRealms';
import { SpellDefinition, SpellId } from '../types/game';
import { X, Flame, Droplets, Zap, Shield, Sparkles, Snowflake, Lock, CheckCircle2, Skull, PawPrint } from 'lucide-react';

interface SpellGrimoireProps {
  unlockedSpellIds: string[];
  playerLevel: number;
  onClose: () => void;
  onSelectSpellToCast?: (spell: SpellDefinition) => void;
  onOpenTrainingDojo?: (spellId: SpellId) => void;
}

const ICONS_MAP: Record<string, React.ReactNode> = {
  Flame: <Flame className="w-5 h-5 text-orange-400" />,
  Droplets: <Droplets className="w-5 h-5 text-sky-400" />,
  Zap: <Zap className="w-5 h-5 text-purple-400" />,
  Shield: <Shield className="w-5 h-5 text-yellow-400" />,
  Snowflake: <Snowflake className="w-5 h-5 text-cyan-400" />,
  Sparkles: <Sparkles className="w-5 h-5 text-pink-400" />,
  FlameKindling: <Flame className="w-5 h-5 text-red-500" />,
  Skull: <Skull className="w-5 h-5 text-red-500" />,
  PawPrint: <PawPrint className="w-5 h-5 text-emerald-400" />
};

export const SpellGrimoire: React.FC<SpellGrimoireProps> = ({
  unlockedSpellIds,
  playerLevel,
  onClose,
  onSelectSpellToCast,
  onOpenTrainingDojo
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div>
            <h2 className="font-cinzel text-xl font-bold text-amber-400">Arcane Spell Grimoire</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              1-Hand standard casting (or 2-Hand Dual Boost) & Special 2-Hand Forbidden Arts
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-3.5 pr-1">
          {SPELL_CATALOG.map((spell) => {
            const isUnlocked = unlockedSpellIds?.includes(spell.id) ?? playerLevel >= spell.requiredLevel;
            const goal = GOALS_CATALOG.find((g) => g.unlockedSpellId === spell.id);

            return (
              <div
                key={spell.id}
                className={`p-4 rounded-xl border transition-all ${
                  isUnlocked
                    ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-950/30 border-slate-900 opacity-65'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      {ICONS_MAP[spell.iconName] || <Sparkles className="w-5 h-5 text-amber-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-100 text-sm">{spell.name}</h3>
                        <span className="text-xs text-slate-500">·</span>
                        <span className="text-xs font-semibold capitalize" style={{ color: spell.color }}>
                          {spell.element}
                        </span>
                        <span className="text-xs text-slate-500">·</span>
                        <span className={`text-[11px] font-semibold ${spell.requiresTwoHands ? 'text-rose-400' : 'text-sky-400'}`}>
                          {spell.requiresTwoHands ? '2 Hands Required' : '1 Hand or Dual'}
                        </span>
                      </div>
                      <div className="text-xs text-amber-400 font-medium mt-0.5">
                        Gesture: {spell.gestureName}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {isUnlocked ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Unlocked</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Lock className="w-3.5 h-3.5" />
                        <span>{goal ? goal.title : '3-Chamber RPG Quest'}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900/80 rounded-lg p-2.5 text-xs text-slate-300 border border-slate-800/80 mb-2">
                  <span className="text-slate-400 font-medium">Finger Configuration: </span>
                  {spell.fingerDescription}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-4">
                    <span>
                      Damage: <strong className="font-mono-num text-slate-200">{spell.damage}</strong>
                    </span>
                    <span>
                      Mana: <strong className="font-mono-num text-slate-200">{spell.manaCost}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {onOpenTrainingDojo && (
                      <button
                        onClick={() => {
                          onOpenTrainingDojo(spell.id as SpellId);
                          onClose();
                        }}
                        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs rounded-md transition-colors cursor-pointer border border-amber-500/30 flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>Practice in Dojo</span>
                      </button>
                    )}

                    {isUnlocked && onSelectSpellToCast && (
                      <button
                        onClick={() => {
                          onSelectSpellToCast(spell);
                          onClose();
                        }}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-md transition-colors cursor-pointer"
                      >
                        Cast Spell
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
