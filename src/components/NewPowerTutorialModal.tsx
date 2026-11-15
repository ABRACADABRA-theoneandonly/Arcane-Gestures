import React, { useState } from 'react';
import { SpellDefinition, GoalDefinition, DetectedGesture } from '../types/game';
import { Flame, Droplets, Zap, Shield, Sparkles, Snowflake, CheckCircle, ArrowRight, Camera, Skull, PawPrint } from 'lucide-react';
import confetti from 'canvas-confetti';

interface NewPowerTutorialModalProps {
  spell: SpellDefinition;
  goal: GoalDefinition;
  currentGesture: DetectedGesture | null;
  cameraActive: boolean;
  onResume: () => void;
  onSimulateNewSpell: (gesture: string) => void;
}

const ICONS_MAP: Record<string, React.ReactNode> = {
  Flame: <Flame className="w-8 h-8 text-orange-400" />,
  Droplets: <Droplets className="w-8 h-8 text-sky-400" />,
  Zap: <Zap className="w-8 h-8 text-purple-400" />,
  Shield: <Shield className="w-8 h-8 text-yellow-400" />,
  Snowflake: <Snowflake className="w-8 h-8 text-cyan-400" />,
  Sparkles: <Sparkles className="w-8 h-8 text-pink-400" />,
  FlameKindling: <Flame className="w-8 h-8 text-red-500" />,
  Skull: <Skull className="w-8 h-8 text-red-500" />,
  PawPrint: <PawPrint className="w-8 h-8 text-emerald-400" />
};

export const NewPowerTutorialModal: React.FC<NewPowerTutorialModalProps> = ({
  spell,
  goal,
  currentGesture,
  cameraActive,
  onResume,
  onSimulateNewSpell
}) => {
  const [testSimulated, setTestSimulated] = useState<boolean>(false);

  // Trigger celebration confetti on mount
  React.useEffect(() => {
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } });
  }, []);

  const isMatchingGesture = currentGesture?.gesture === spell.gesture || testSimulated;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-xl w-full p-6 shadow-2xl shadow-amber-500/10 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Banner */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-2">
            <span>✦ GOAL ACCOMPLISHED</span>
            <span>·</span>
            <span>{goal.title}</span>
          </div>
          <h2 className="font-cinzel text-2xl sm:text-3xl font-extrabold text-slate-100">
            New Power Unlocked!
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Master this hand movement to unleash continuous devastation
          </p>
        </div>

        {/* Unlocked Power Showcase Card */}
        <div 
          className="p-4 rounded-xl border mb-4 bg-slate-950/70"
          style={{ borderColor: spell.color + '66' }}
        >
          <div className="flex items-center gap-4">
            <div 
              className="p-3 rounded-xl bg-slate-900 border shadow-inner flex items-center justify-center"
              style={{ borderColor: spell.color }}
            >
              {ICONS_MAP[spell.iconName] || <Sparkles className="w-8 h-8 text-amber-400" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-slate-100">{spell.name}</h3>
                <span className="text-xs text-slate-500">·</span>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: spell.color }}>
                  {spell.element} Magic
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                {spell.description}
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400">Damage</div>
              <div className="font-mono-num font-bold text-slate-200">{spell.damage}</div>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400">Fire Rate</div>
              <div className="font-mono-num font-bold text-emerald-400">Continuous</div>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400">Mana Cost</div>
              <div className="font-mono-num font-bold text-sky-400">{spell.manaCost} / cast</div>
            </div>
          </div>
        </div>

        {/* Tutorial: Finger Posture & Landmark Guide */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🖐️ Tutorial: How to Form Gesture</span>
            </div>
            <div className="text-xs font-medium text-slate-300">
              Gesture: <strong className="text-amber-400">{spell.gestureName}</strong>
            </div>
          </div>

          {/* Detailed instruction box */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-200 leading-relaxed mb-3">
            <p className="font-medium text-amber-300 mb-1">Finger Configuration:</p>
            <p>{spell.fingerDescription}</p>
          </div>

          {/* Live Practice Matcher */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg ${isMatchingGesture ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                {cameraActive ? <Camera className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  {isMatchingGesture ? 'Gesture Mastered! 100% Match' : 'Try the gesture on your camera now!'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {isMatchingGesture 
                    ? 'AI detected correct landmarks. Ready to unleash!' 
                    : `Currently detected: ${currentGesture?.handFound ? currentGesture.gesture : 'Searching hand...'}`}
                </div>
              </div>
            </div>

            {/* Test Simulation Button */}
            <button
              onClick={() => {
                setTestSimulated(true);
                onSimulateNewSpell(spell.gesture);
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Test Gesture
            </button>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onResume}
          className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-cinzel font-bold text-sm rounded-xl shadow-xl shadow-amber-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Resume Battle with {spell.name}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
