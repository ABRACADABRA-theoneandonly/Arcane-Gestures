import React from 'react';
import { WORLD_REALMS } from '../data/spellsAndRealms';
import { WorldRealm } from '../types/game';
import { X, Compass, Sparkles, ShieldCheck } from 'lucide-react';

interface RealmsModalProps {
  currentRealmIndex: number;
  onClose: () => void;
  onWarpToRealm?: (index: number) => void;
}

export const RealmsModal: React.FC<RealmsModalProps> = ({
  currentRealmIndex,
  onClose,
  onWarpToRealm
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-cinzel text-xl font-bold text-slate-100">
                The Eight Fantasy Realms
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Use Portal Keys to unlock dimensional gates and fight unique monsters across 8 distinct realms
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Realms Grid */}
        <div className="space-y-4 overflow-y-auto pr-1">
          {WORLD_REALMS.map((realm, idx) => {
            const isActive = idx === currentRealmIndex;
            return (
              <div
                key={realm.id}
                className={`p-5 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-slate-950/80 border-amber-500/60 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono-num text-xs font-bold text-amber-500">
                        REALM 0{idx + 1}
                      </span>
                      <span className="text-xs text-slate-500">·</span>
                      <h3 className="font-semibold text-slate-100 text-base">{realm.name}</h3>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{realm.subtitle}</div>
                  </div>

                  {isActive && (
                    <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-full flex items-center gap-1.5 shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Current Battlefield</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                  {realm.lore}
                </p>

                <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-3">
                  <div className="flex items-center gap-2 text-slate-400">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Unlocked Magic: <strong className="text-slate-200">{realm.unlockedSpellNotice}</strong></span>
                  </div>

                  {onWarpToRealm && !isActive && (
                    <button
                      onClick={() => {
                        onWarpToRealm(idx);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Warp to Realm
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-3 mt-4 text-center">
          <p className="text-xs text-slate-500">
            Movement calibration is automatically stabilized during portal warp transitions to prevent tracking glitches.
          </p>
        </div>
      </div>
    </div>
  );
};
