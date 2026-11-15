import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SpellId, GestureVerificationReport, HandPoint } from '../types/game';
import { SPELL_CATALOG } from '../data/spellsAndRealms';
import { gestureDetector } from '../services/gestureDetector';
import { handSimulator } from '../services/handSimulator';
import { audioEngine } from '../services/audioEngine';
import confetti from 'canvas-confetti';
import {
  X,
  Sparkles,
  Camera,
  AlertTriangle,
  CheckCircle2,
  Flame,
  Droplets,
  Zap,
  Shield,
  Snowflake,
  Skull,
  PawPrint,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface SpellTrainingDojoProps {
  unlockedSpellIds: string[];
  initialSpellId?: SpellId;
  cameraActive: boolean;
  onRestartCamera: () => void;
  onClose: () => void;
  dualLandmarks?: { left: HandPoint[] | null; right: HandPoint[] | null };
}

interface DojoParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
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

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17]
];

const FINGERTIP_INDICES = [4, 8, 12, 16, 20];

export const SpellTrainingDojo: React.FC<SpellTrainingDojoProps> = ({
  initialSpellId = 'fireball',
  cameraActive,
  onRestartCamera,
  onClose,
  dualLandmarks
}) => {
  const [selectedSpellId, setSelectedSpellId] = useState<SpellId>(initialSpellId);
  const [masteredSpells, setMasteredSpells] = useState<Set<string>>(new Set());
  const [holdTimerMs, setHoldTimerMs] = useState<number>(0);
  const [isSimulatingHands, setIsSimulatingHands] = useState<boolean>(false);
  const [showGhostGuide, setShowGhostGuide] = useState<boolean>(true);

  const holdStartTimeRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevWrongSpellAlertRef = useRef<string | null>(null);
  const particlesRef = useRef<DojoParticle[]>([]);

  const selectedSpell = SPELL_CATALOG.find((s) => s.id === selectedSpellId) || SPELL_CATALOG[0];

  const currentDualLandmarks = useMemo(() => {
    if (isSimulatingHands) {
      return handSimulator.generateDualSimulatedLandmarks(
        selectedSpell.gesture,
        0.5,
        0.58,
        !selectedSpell.requiresTwoHands
      );
    }
    return dualLandmarks || { left: null, right: null };
  }, [isSimulatingHands, selectedSpell.gesture, selectedSpell.requiresTwoHands, dualLandmarks]);

  const verification: GestureVerificationReport = useMemo(
    () =>
      gestureDetector.verifyGestureForSpell(
        selectedSpell.id,
        currentDualLandmarks,
        800,
        600
      ),
    [selectedSpell.id, currentDualLandmarks]
  );

  // Refs synced for the smooth 60fps canvas animation loop
  const latestRenderStateRef = useRef({
    dualLandmarks: currentDualLandmarks,
    verification,
    selectedSpell,
    holdTimerMs: 0,
    showGhostGuide
  });

  useEffect(() => {
    latestRenderStateRef.current = {
      dualLandmarks: currentDualLandmarks,
      verification,
      selectedSpell,
      holdTimerMs,
      showGhostGuide
    };
  }, [currentDualLandmarks, verification, selectedSpell, holdTimerMs, showGhostGuide]);

  useEffect(() => {
    if (verification.isPerformingOtherSpell && verification.otherSpellName) {
      if (prevWrongSpellAlertRef.current !== verification.otherSpellName) {
        audioEngine.playGestureBlocked();
        prevWrongSpellAlertRef.current = verification.otherSpellName;
      }
    } else {
      prevWrongSpellAlertRef.current = null;
    }
  }, [verification.isPerformingOtherSpell, verification.otherSpellName]);

  // Hold mastery check loop
  useEffect(() => {
    let animId: number;
    const requiredHoldMs = 2000;

    const checkHold = () => {
      if (verification.isMatch) {
        if (!holdStartTimeRef.current) {
          holdStartTimeRef.current = Date.now();
        }
        const elapsed = Date.now() - holdStartTimeRef.current;
        setHoldTimerMs(Math.min(requiredHoldMs, elapsed));

        if (elapsed >= requiredHoldMs && !masteredSpells.has(selectedSpell.id)) {
          audioEngine.playGestureSuccess();
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
          setMasteredSpells((prev) => new Set(prev).add(selectedSpell.id));

          for (let i = 0; i < 45; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 2.2 + Math.random() * 6;
            const life = 40 + Math.random() * 35;
            particlesRef.current.push({
              x: 400,
              y: 300,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd,
              color: i % 3 === 0 ? '#fde68a' : selectedSpell.color,
              size: 3 + Math.random() * 4,
              life,
              maxLife: life
            });
          }
        }
      } else {
        holdStartTimeRef.current = null;
        setHoldTimerMs(0);
      }
      animId = requestAnimationFrame(checkHold);
    };

    animId = requestAnimationFrame(checkHold);
    return () => cancelAnimationFrame(animId);
  }, [verification.isMatch, selectedSpell.id, selectedSpell.color, masteredSpells]);

  // Smooth 60fps Dojo Canvas Renderer (Mandala Circles + Ghost Pose Guide + Live Glowing Skeleton + Continuous VFX)
  useEffect(() => {
    let animId: number;

    const renderLoop = (nowMs: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(renderLoop);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const {
        dualLandmarks: landmarks,
        verification: verif,
        selectedSpell: spell,
        holdTimerMs: holdMs,
        showGhostGuide: drawGhost
      } = latestRenderStateRef.current;

      const t = nowMs * 0.001;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const holdProgress = Math.min(1, holdMs / 2000);

      // 1. Deep Arcane Radial Backdrop
      const bgGrad = ctx.createRadialGradient(cx, cy, 40, cx, cy, w * 0.65);
      bgGrad.addColorStop(0, verif.isMatch ? `${spell.color}28` : '#111827');
      bgGrad.addColorStop(0.55, '#090d16');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. Subtle Perspective Blueprint Grid
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.22)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // 3. Rotating Arcane Runic Mandala Rings
      const mandalaColor = verif.isPerformingOtherSpell
        ? '#ef4444'
        : verif.isMatch
        ? spell.color
        : '#f59e0b';
      const spinSpeed = 0.25 + holdProgress * 1.4;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * spinSpeed);
      ctx.strokeStyle = mandalaColor;
      ctx.globalAlpha = verif.isMatch ? 0.48 + Math.sin(t * 6) * 0.12 : 0.18;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 175, 0, Math.PI * 2);
      ctx.stroke();

      // Runic ticks around outer ring
      for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * 165, Math.sin(ang) * 165);
        ctx.lineTo(Math.cos(ang) * 184, Math.sin(ang) * 184);
        ctx.stroke();
      }

      // Counter-rotating inner geometric polygon
      ctx.rotate(-t * spinSpeed * 2.1);
      ctx.globalAlpha = verif.isMatch ? 0.55 : 0.16;
      ctx.beginPath();
      const sides = spell.requiresTwoHands ? 6 : 5;
      for (let i = 0; i <= sides; i++) {
        const ang = (i / sides) * Math.PI * 2;
        const r = 128;
        if (i === 0) ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
        else ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
      }
      ctx.stroke();
      ctx.restore();

      // Hold Progress Radial Arc around Mandala
      if (holdProgress > 0) {
        ctx.save();
        ctx.strokeStyle = spell.color;
        ctx.lineWidth = 6;
        ctx.shadowColor = spell.color;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(cx, cy, 195, -Math.PI / 2, -Math.PI / 2 + holdProgress * Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 4. Ghost Blueprint Target Hand Guide (shows exact finger alignment target)
      if (drawGhost) {
        const ghostHands = handSimulator.generateDualSimulatedLandmarks(
          spell.gesture,
          0.5,
          0.56 + Math.sin(t * 2.2) * 0.012,
          !spell.requiresTwoHands
        );

        const drawGhostHand = (glm: HandPoint[] | null, label: string) => {
          if (!glm || glm.length < 21) return;
          ctx.save();
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.32)';
          ctx.lineWidth = 6;
          ctx.setLineDash([7, 6]);
          ctx.lineCap = 'round';
          HAND_CONNECTIONS.forEach(([i1, i2]) => {
            ctx.beginPath();
            ctx.moveTo((1 - glm[i1].x) * w, glm[i1].y * h);
            ctx.lineTo((1 - glm[i2].x) * w, glm[i2].y * h);
            ctx.stroke();
          });
          ctx.setLineDash([]);

          FINGERTIP_INDICES.forEach((tipIdx) => {
            const pt = glm[tipIdx];
            const gx = (1 - pt.x) * w;
            const gy = pt.y * h;
            ctx.beginPath();
            ctx.arc(gx, gy, 7 + Math.sin(t * 4) * 2, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(125, 211, 252, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          });

          const wrist = glm[0];
          ctx.fillStyle = 'rgba(125, 211, 252, 0.5)';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`GUIDE (${label})`, (1 - wrist.x) * w - 34, Math.min(h - 16, wrist.y * h + 40));
          ctx.restore();
        };

        drawGhostHand(ghostHands.left, 'L');
        drawGhostHand(ghostHands.right, 'R');
      }

      // 5. Continuous Elemental Emission from Aligned Hands
      const emitFromHand = (lm: HandPoint[] | null) => {
        if (!lm || lm.length < 21) return;
        const palm = lm[9];
        const px = (1 - palm.x) * w;
        const py = palm.y * h;

        if (verif.isMatch && Math.random() < 0.65) {
          const tip = lm[FINGERTIP_INDICES[Math.floor(Math.random() * FINGERTIP_INDICES.length)]];
          const tx = (1 - tip.x) * w;
          const ty = tip.y * h;
          const life = 22 + Math.random() * 18;
          particlesRef.current.push({
            x: tx + (Math.random() - 0.5) * 8,
            y: ty + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 2.2,
            vy: -1.5 - Math.random() * 2.6,
            color: Math.random() > 0.35 ? spell.color : '#fef08a',
            size: 2.5 + Math.random() * 3.5,
            life,
            maxLife: life
          });
        }

        // Glowing elemental spell orb hovering over palm center when aligned
        if (verif.isMatch) {
          ctx.save();
          const orbRadius = 14 + Math.sin(t * 9) * 3 + holdProgress * 12;
          const orbGrad = ctx.createRadialGradient(px, py, 2, px, py, orbRadius * 2);
          orbGrad.addColorStop(0, '#ffffff');
          orbGrad.addColorStop(0.35, spell.color);
          orbGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = orbGrad;
          ctx.beginPath();
          ctx.arc(px, py, orbRadius * 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      };

      emitFromHand(landmarks.left);
      emitFromHand(landmarks.right);

      // 6. Live Glowing Energy Hand Skeletons
      const drawLiveHand = (lm: HandPoint[] | null, isLeftHand: boolean, isValid: boolean) => {
        if (!lm || lm.length < 21) return;

        const strokeColor = isValid
          ? '#10b981'
          : verif.isPerformingOtherSpell
          ? '#ef4444'
          : '#f59e0b';

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Outer neon conduit aura
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = isValid ? 18 : 10;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 7;
        HAND_CONNECTIONS.forEach(([i1, i2]) => {
          const p1 = lm[i1];
          const p2 = lm[i2];
          ctx.beginPath();
          ctx.moveTo((1 - p1.x) * w, p1.y * h);
          ctx.lineTo((1 - p2.x) * w, p2.y * h);
          ctx.stroke();
        });

        // Inner bright core line
        ctx.shadowBlur = 0;
        ctx.strokeStyle = isValid ? '#d1fae5' : '#fef3c7';
        ctx.lineWidth = 2.2;
        HAND_CONNECTIONS.forEach(([i1, i2]) => {
          const p1 = lm[i1];
          const p2 = lm[i2];
          ctx.beginPath();
          ctx.moveTo((1 - p1.x) * w, p1.y * h);
          ctx.lineTo((1 - p2.x) * w, p2.y * h);
          ctx.stroke();
        });

        // Joints & Fingertip Energy Nodes
        lm.forEach((pt, idx) => {
          const x = (1 - pt.x) * w;
          const y = pt.y * h;
          const isTip = FINGERTIP_INDICES.includes(idx);

          if (isTip) {
            ctx.beginPath();
            ctx.arc(x, y, 10 + Math.sin(t * 7 + idx) * 2, 0, Math.PI * 2);
            ctx.strokeStyle = isValid ? spell.color : strokeColor;
            ctx.lineWidth = 1.6;
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.arc(x, y, isTip ? 6.5 : 4, 0, Math.PI * 2);
          ctx.fillStyle = isTip ? (isValid ? '#34d399' : '#fbbf24') : '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });

        const wrist = lm[0];
        ctx.fillStyle = isValid ? '#6ee7b7' : '#fde68a';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(
          isLeftHand ? 'LEFT HAND' : 'RIGHT HAND',
          (1 - wrist.x) * w - 34,
          Math.min(h - 14, wrist.y * h + 24)
        );
        ctx.restore();
      };

      drawLiveHand(landmarks.left, true, verif.leftHand.isMatch);
      drawLiveHand(landmarks.right, false, verif.rightHand.isMatch);

      // 7. Update & Render Particles (pure ref simulation — zero React state churn)
      if (particlesRef.current.length > 0) {
        const surviving: DojoParticle[] = [];
        for (const pt of particlesRef.current) {
          pt.x += pt.vx;
          pt.y += pt.vy;
          pt.vy -= 0.03;
          pt.life -= 1;
          if (pt.life > 0) {
            surviving.push(pt);
            const alpha = Math.max(0, pt.life / pt.maxLife);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = pt.color;
            ctx.shadowColor = pt.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size * (0.5 + 0.5 * alpha), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
        particlesRef.current = surviving.slice(-140);
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleSelectSpell = (spellId: SpellId) => {
    setSelectedSpellId(spellId);
    setHoldTimerMs(0);
    holdStartTimeRef.current = null;
    particlesRef.current = [];
    audioEngine.playAncientRune();
  };

  const progressPercent = Math.min(100, Math.round((holdTimerMs / 2000) * 100));
  const isMastered = masteredSpells.has(selectedSpell.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-cinzel text-lg sm:text-xl font-bold text-slate-100">
                Arcane Spell Training Dojo
              </h2>
              <p className="text-xs text-slate-400">
                Standard powers work with 1 Hand (2 Hands boost power) · Special & Forbidden powers require 2 Hands
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowGhostGuide(!showGhostGuide)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                showGhostGuide
                  ? 'bg-sky-500/15 border-sky-500/50 text-sky-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Toggle Ghost Blueprint Target Pose"
            >
              {showGhostGuide ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Pose Guide</span>
            </button>

            <button
              onClick={() => setIsSimulatingHands(!isSimulatingHands)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                isSimulatingHands
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {isSimulatingHands ? 'Synthetic Hands Active' : 'Test With Synthetic Hands'}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Spell Practice Tab Bar */}
        <div className="border-b border-slate-800/80 pb-3 mb-4">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Select Power to Practice ({SPELL_CATALOG.length}):
            </span>
            <span className="text-xs font-mono text-emerald-400 font-semibold">
              {masteredSpells.size} / {SPELL_CATALOG.length} Mastered
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {SPELL_CATALOG.map((spell) => {
              const isSelected = spell.id === selectedSpellId;
              const hasMastered = masteredSpells.has(spell.id);

              return (
                <button
                  key={spell.id}
                  onClick={() => handleSelectSpell(spell.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 text-slate-100 shadow-lg'
                      : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
                  }`}
                  style={{ borderColor: isSelected ? spell.color : undefined }}
                >
                  <div className="shrink-0">{ICONS_MAP[spell.iconName] || <Sparkles className="w-4 h-4" />}</div>
                  <span>{spell.name.split(' ')[0]}</span>
                  <span className="text-[10px] text-slate-400">({spell.requiresTwoHands ? '2H' : '1H'})</span>
                  {hasMastered && <span className="text-emerald-400 text-[10px]">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 overflow-y-auto pr-1">
          <div className="lg:col-span-5 space-y-3.5">
            <div className="p-4 rounded-xl bg-slate-950/70 border" style={{ borderColor: `${selectedSpell.color}40` }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                    {selectedSpell.element.toUpperCase()} · {selectedSpell.requiresTwoHands ? '2 HANDS REQUIRED' : '1 HAND WORKS'}
                  </div>
                  <h3 className="font-cinzel text-lg font-bold text-slate-100 mt-0.5">{selectedSpell.name}</h3>
                </div>
                <div className="p-2 rounded-xl" style={{ backgroundColor: `${selectedSpell.color}20` }}>
                  {ICONS_MAP[selectedSpell.iconName]}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1">
                <div className="text-amber-300 font-semibold">{selectedSpell.gestureName}</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">{selectedSpell.fingerDescription}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <h4 className="text-xs font-semibold text-slate-300">Finger Geometry Checklist</h4>
              {[
                { label: 'Left Hand', data: verification.leftHand },
                { label: 'Right Hand', data: verification.rightHand }
              ].map((h) => (
                <div key={h.label} className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                    <span className="text-slate-300 font-semibold">
                      {h.label}: {h.data.expectedPose}
                    </span>
                    <span className={`text-[11px] font-semibold ${h.data.isMatch ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {h.data.handFound ? (h.data.isMatch ? '✓ Aligned' : 'Adjusting') : 'Optional / Out of frame'}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 text-[10px]">
                    {h.data.fingerChecks.map((check) => (
                      <div
                        key={`${h.label}_${check.finger}`}
                        className={`p-1 rounded text-center font-mono border ${
                          check.isMatch
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        <div className="uppercase font-sans font-bold text-[9px]">{check.finger.slice(0, 3)}</div>
                        <div>{check.isMatch ? '✓' : '✗'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col space-y-3">
            <div className="relative aspect-[4/3] w-full bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center">
              <canvas ref={canvasRef} width={800} height={600} className="w-full h-full object-contain" />

              {!cameraActive && !isSimulatingHands && (
                <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                  <Camera className="w-10 h-10 text-amber-400 mb-2" />
                  <h4 className="font-cinzel text-base font-bold text-slate-100">Camera Vision Offline</h4>
                  <p className="text-xs text-slate-400 max-w-sm mt-1 mb-3">
                    Enable your webcam or use synthetic hands mode to practice postures with live elemental effects.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={onRestartCamera}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Start Camera
                    </button>
                    <button
                      onClick={() => setIsSimulatingHands(true)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl cursor-pointer"
                    >
                      Try Synthetic Hands
                    </button>
                  </div>
                </div>
              )}

              <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs flex items-center gap-2">
                <span className="text-slate-400">Alignment:</span>
                <span className={`font-mono font-bold ${verification.accuracyScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {verification.accuracyScore}%
                </span>
              </div>

              <div className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] font-semibold flex items-center gap-1.5">
                <span className="text-sky-300">Guide Overlay:</span>
                <span className="text-slate-200">{showGhostGuide ? 'Visible' : 'Hidden'}</span>
              </div>
            </div>

            {verification.isPerformingOtherSpell && verification.otherSpellName ? (
              <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/70 text-rose-200 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-rose-300 text-sm">Wrong Hand Movement Detected! Action Blocked!</div>
                  <div className="mt-0.5 text-slate-200">
                    You are performing <strong className="text-amber-300">{verification.otherSpellName}</strong>. Switch to{' '}
                    <strong>{selectedSpell.name}</strong>!
                  </div>
                </div>
              </div>
            ) : verification.isMatch ? (
              <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-bold text-emerald-300 text-sm">✓ Correct Hand Movement! Channeling Elemental Aura</div>
                    <div className="text-slate-300 text-[11px]">
                      Hold steady: {(holdTimerMs / 1000).toFixed(1)}s / 2.0s
                    </div>
                  </div>
                </div>
                {isMastered && <span className="text-emerald-300 font-bold text-xs">MASTERED!</span>}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 text-xs flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-amber-300">
                    {selectedSpell.requiresTwoHands && verification.handsPresentCount < 2
                      ? 'Two Hands Required for This Special Spell'
                      : 'Adjusting Hand Posture...'}
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">{verification.blockReason}</div>
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Hold Progress</span>
                <span className="font-mono text-amber-400 font-bold">
                  {(holdTimerMs / 1000).toFixed(1)}s / 2.0s ({progressPercent}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-75 rounded-full"
                  style={{ width: `${progressPercent}%`, backgroundColor: selectedSpell.color }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
