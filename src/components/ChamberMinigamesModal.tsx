import React, { useEffect, useRef, useState } from 'react';
import {
  ChamberMinigameType,
  DetectedGesture,
  GestureId,
  HandPoint,
  RPGOutfit
} from '../types/game';
import { CoopMinigameSession } from '../types/multiplayer';
import { DEFAULT_RPG_OUTFIT } from '../data/spellsAndRealms';
import { audioEngine } from '../services/audioEngine';
import { cameraManager } from '../services/cameraManager';
import { multiplayerClient } from '../services/multiplayerClient';
import {
  Hand,
  Heart,
  PawPrint,
  RotateCcw,
  Skull,
  Sparkles,
  Users,
  VideoOff,
  X
} from 'lucide-react';

interface ChamberMinigamesModalProps {
  minigame: ChamberMinigameType;
  chamberTitle: string;
  onSuccess: () => void;
  onClose: () => void;
  playerName?: string;
  playerOutfit?: RPGOutfit;
  latestGesture?: DetectedGesture | null;
  cameraActive?: boolean;
  onEnsureCamera?: () => Promise<void> | void;
  onSimulateGesture?: (gestureId: GestureId) => void;
  multiplayerEnabled?: boolean;
  coopSession?: CoopMinigameSession | null;
  onInviteFriends?: () => void;
}

const HAND_MINIGAMES: ChamberMinigameType[] = [
  'beast_birds',
  'rpg_house_arcade',
  'rpg_hospital_potion'
];

// Helper for rotating pipe openings [top, right, bottom, left]
type PipeDirs = [boolean, boolean, boolean, boolean];

function rotateDirs(dirs: PipeDirs, times: number): PipeDirs {
  let res: PipeDirs = [...dirs];
  for (let t = 0; t < times; t++) {
    res = [res[3], res[0], res[1], res[2]];
  }
  return res;
}

// 5x5 Harder Blood Conduit Matrix (verified path from (0,0) Left -> (4,4) Right)
const BLOOD_PIPE_BASE: PipeDirs[][] = [
  [
    [false, true, false, true],   // (0,0) L-R
    [false, false, true, true],   // (0,1) L-B
    [true, true, false, false],   // (0,2)
    [false, true, false, true],   // (0,3)
    [false, false, true, true]    // (0,4)
  ],
  [
    [true, true, true, false],    // (1,0)
    [true, true, true, false],    // (1,1) T-R-B
    [false, true, false, true],   // (1,2) L-R
    [false, false, true, true],   // (1,3) L-B
    [true, false, true, false]    // (1,4)
  ],
  [
    [true, false, true, false],   // (2,0)
    [true, true, false, false],   // (2,1)
    [false, true, true, true],    // (2,2)
    [true, true, false, false],   // (2,3) T-R
    [false, false, true, true]    // (2,4) L-B
  ],
  [
    [true, true, false, false],   // (3,0)
    [false, true, false, true],   // (3,1)
    [true, true, false, true],    // (3,2)
    [false, false, true, true],   // (3,3)
    [true, false, true, false]    // (3,4) T-B
  ],
  [
    [false, true, false, true],   // (4,0)
    [true, true, false, false],   // (4,1)
    [false, true, true, false],   // (4,2)
    [true, true, false, false],   // (4,3)
    [true, true, false, false]    // (4,4) T-R
  ]
];

function drawMiniRPGCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  outfit: RPGOutfit,
  facing: number,
  isMoving: boolean,
  walkPhase: number,
  label: string,
  invuln: number,
  dashActive: boolean,
  ringColor?: string
) {
  if (invuln > 0 && Math.floor(invuln / 4) % 2 === 1) return;

  ctx.save();
  ctx.translate(x, y);

  // Dash / Co-op Ring
  if (dashActive || ringColor) {
    ctx.strokeStyle = dashActive ? '#38bdf8' : ringColor || '#fde047';
    ctx.lineWidth = dashActive ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 12, 13, 5.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const stride = isMoving ? Math.sin(walkPhase) * 4.5 : 0;
  const bob = isMoving ? Math.abs(Math.sin(walkPhase)) * 1.8 : 0;
  ctx.translate(0, -bob);

  // Cloak
  if (outfit.cloakColor && outfit.cloakColor !== 'none') {
    ctx.fillStyle = outfit.cloakColor;
    ctx.beginPath();
    ctx.moveTo(-7, -4);
    ctx.lineTo(7, -4);
    ctx.lineTo(-facing * 9, 9);
    ctx.closePath();
    ctx.fill();
  }

  // Legs
  ctx.strokeStyle = outfit.pantsColor || '#334155';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-3, 4);
  ctx.lineTo(-3 + stride, 11);
  ctx.moveTo(3, 4);
  ctx.lineTo(3 - stride, 11);
  ctx.stroke();

  // Arms
  ctx.strokeStyle = outfit.skinTone || '#ffdbac';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-6, -3);
  ctx.lineTo(-8 - stride * 0.4, 3);
  ctx.moveTo(6, -3);
  ctx.lineTo(8 + stride * 0.4, 3);
  ctx.stroke();

  // Torso
  ctx.fillStyle = outfit.topColor || '#3b82f6';
  ctx.beginPath();
  ctx.roundRect(-6.5, -5.5, 13, 10.5, 3);
  ctx.fill();

  // Head
  ctx.fillStyle = outfit.skinTone || '#ffdbac';
  ctx.beginPath();
  ctx.arc(0, -10.5, 6.2, 0, Math.PI * 2);
  ctx.fill();

  // Hair cap
  ctx.fillStyle = outfit.hairColor || '#451a03';
  ctx.beginPath();
  ctx.arc(0, -12, 6.6, Math.PI, 0);
  ctx.fill();
  if (outfit.hairStyle === 'long_wavy' || outfit.hairStyle === 'twin_braids') {
    ctx.fillRect(-6.5, -12, 2.5, 9);
    ctx.fillRect(4, -12, 2.5, 9);
  }

  // Eyes
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(-2 + facing * 1.1, -10.2, 1.1, 0, Math.PI * 2);
  ctx.arc(2 + facing * 1.1, -10.2, 1.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Nameplate
  if (label) {
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    const w = Math.max(32, ctx.measureText(label).width + 8);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - 28, w, 12, 3);
    ctx.fill();
    ctx.fillStyle = ringColor || '#fde68a';
    ctx.fillText(label, x, y - 19);
  }
}

export const ChamberMinigamesModal: React.FC<ChamberMinigamesModalProps> = ({
  minigame,
  chamberTitle,
  onSuccess,
  onClose,
  playerName = 'Aria',
  playerOutfit = DEFAULT_RPG_OUTFIT,
  latestGesture = null,
  cameraActive = false,
  onEnsureCamera,
  onSimulateGesture,
  multiplayerEnabled = false,
  coopSession = null,
  onInviteFriends
}) => {
  const isHandMinigame = HAND_MINIGAMES.includes(minigame);
  const selfId = multiplayerClient.getSelfId();

  // Refs so real-time loops read fresh values without restarting animations
  const gestureRef = useRef<DetectedGesture | null>(latestGesture);
  useEffect(() => {
    gestureRef.current = latestGesture;
  }, [latestGesture]);

  const coopRef = useRef<CoopMinigameSession | null>(coopSession);
  useEffect(() => {
    coopRef.current = coopSession;
  }, [coopSession]);

  const outfitRef = useRef<RPGOutfit>(playerOutfit);
  useEffect(() => {
    outfitRef.current = playerOutfit;
  }, [playerOutfit]);

  const handPipVideoRef = useRef<HTMLVideoElement | null>(null);
  const handPipCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Start camera automatically when entering a Hand-Tracking minigame
  useEffect(() => {
    if (!isHandMinigame) return;
    onEnsureCamera?.();
  }, [isHandMinigame, onEnsureCamera]);

  // Attach webcam stream + draw hand landmarks inside modal PiP
  useEffect(() => {
    if (!isHandMinigame || !cameraActive || !handPipVideoRef.current) return;
    const stream = cameraManager.getStream();
    if (stream && handPipVideoRef.current.srcObject !== stream) {
      handPipVideoRef.current.srcObject = stream;
      handPipVideoRef.current.play().catch(() => {});
    }
  }, [isHandMinigame, cameraActive]);

  useEffect(() => {
    if (!isHandMinigame || !handPipCanvasRef.current) return;
    const canvas = handPipCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!latestGesture?.handFound) return;

    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [5, 9], [9, 10], [10, 11], [11, 12],
      [9, 13], [13, 14], [14, 15], [15, 16],
      [13, 17], [17, 18], [18, 19], [19, 20],
      [0, 17]
    ];
    const drawLm = (lm: HandPoint[] | null) => {
      if (!lm || lm.length < 21) return;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      connections.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo((1 - lm[a].x) * canvas.width, lm[a].y * canvas.height);
        ctx.lineTo((1 - lm[b].x) * canvas.width, lm[b].y * canvas.height);
        ctx.stroke();
      });
      lm.forEach((pt, idx) => {
        ctx.fillStyle = [4, 8, 12, 16, 20].includes(idx) ? '#facc15' : '#ffffff';
        ctx.beginPath();
        ctx.arc((1 - pt.x) * canvas.width, pt.y * canvas.height, 2.2, 0, Math.PI * 2);
        ctx.fill();
      });
    };
    drawLm(latestGesture.dualLandmarks?.left || null);
    drawLm(latestGesture.dualLandmarks?.right || null);
  }, [isHandMinigame, latestGesture]);

  // ==================== 1. BLOOD PIPES (Harder 5x5 Conduit) ====================
  const [pipeRotations, setPipeRotations] = useState<number[][]>(() =>
    BLOOD_PIPE_BASE.map((row, r) =>
      row.map((_, c) => ((r * 2 + c + 1) % 3) + 1)
    )
  );
  const [poweredCells, setPoweredCells] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (minigame !== 'blood_pipes') return;
    const getDirs = (r: number, c: number): PipeDirs =>
      rotateDirs(BLOOD_PIPE_BASE[r][c], pipeRotations[r][c]);

    const visited = new Set<string>();
    const queue: [number, number][] = [];
    if (getDirs(0, 0)[3]) {
      visited.add('0,0');
      queue.push([0, 0]);
    }

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      const cur = getDirs(r, c);
      const neighbors: [number, number, number, number][] = [
        [r - 1, c, 0, 2],
        [r, c + 1, 1, 3],
        [r + 1, c, 2, 0],
        [r, c - 1, 3, 1]
      ];
      for (const [nr, nc, outIdx, inIdx] of neighbors) {
        if (nr < 0 || nr >= 5 || nc < 0 || nc >= 5) continue;
        const key = `${nr},${nc}`;
        if (visited.has(key)) continue;
        if (cur[outIdx] && getDirs(nr, nc)[inIdx]) {
          visited.add(key);
          queue.push([nr, nc]);
        }
      }
    }

    setPoweredCells(visited);
    if (visited.has('4,4') && getDirs(4, 4)[1]) {
      audioEngine.playGestureSuccess();
      if (coopRef.current) multiplayerClient.completeMinigame(coopRef.current.sessionId);
      const timer = setTimeout(onSuccess, 500);
      return () => clearTimeout(timer);
    }
  }, [pipeRotations, minigame, onSuccess]);

  const handleRotatePipe = (r: number, c: number) => {
    audioEngine.playAncientRune();
    setPipeRotations((prev) =>
      prev.map((row, ri) =>
        row.map((val, ci) => (ri === r && ci === c ? (val + 1) % 4 : val))
      )
    );
  };

  // ==================== 2. BLOOD MEMORY (Harder 4-Phase Echo) ====================
  const GLYPHS = ['Crimson Fang', 'Lunar Vein', 'Abyss Heart', 'Iron Sigil', 'Vortex Eye', 'Bone Crown'];
  const GLYPH_COLORS = ['#ef4444', '#f97316', '#ec4899', '#a855f7', '#38bdf8', '#eab308'];
  const [memRound, setMemRound] = useState<number>(1);
  const [memSequence, setMemSequence] = useState<number[]>([]);
  const [memUserIdx, setMemUserIdx] = useState<number>(0);
  const [memShowingIdx, setMemShowingIdx] = useState<number | null>(null);
  const [memStatus, setMemStatus] = useState<string>('Watch the Sanguine Sigil sequence...');
  const [isPlayingBack, setIsPlayingBack] = useState<boolean>(true);

  const startMemoryRound = (roundNum: number) => {
    const len = roundNum + 3; // 4, 5, 6, 7
    const seq = Array.from({ length: len }, () => Math.floor(Math.random() * 6));
    setMemSequence(seq);
    setMemUserIdx(0);
    setIsPlayingBack(true);
    setMemStatus(`Phase ${roundNum}/4 · Memorize ${len} ancient sigils...`);
  };

  useEffect(() => {
    if (minigame !== 'blood_memory') return;
    startMemoryRound(1);
  }, [minigame]);

  useEffect(() => {
    if (minigame !== 'blood_memory' || !isPlayingBack || memSequence.length === 0) return;
    let step = 0;
    const interval = setInterval(() => {
      if (step < memSequence.length) {
        setMemShowingIdx(memSequence[step]);
        audioEngine.playAncientRune();
        setTimeout(() => setMemShowingIdx(null), 250);
        step++;
      } else {
        clearInterval(interval);
        setIsPlayingBack(false);
        setMemStatus(`Your turn! Repeat all ${memSequence.length} sigils in exact order.`);
      }
    }, 450);
    return () => clearInterval(interval);
  }, [isPlayingBack, memSequence, minigame]);

  const handleGlyphClick = (idx: number) => {
    if (isPlayingBack) return;
    if (memSequence[memUserIdx] === idx) {
      audioEngine.playAncientRune();
      const nextIdx = memUserIdx + 1;
      setMemUserIdx(nextIdx);
      if (nextIdx >= memSequence.length) {
        if (memRound >= 4) {
          audioEngine.playGestureSuccess();
          setMemStatus('All 4 Sanguine Trials Memorized! Seal Broken!');
          if (coopRef.current) multiplayerClient.completeMinigame(coopRef.current.sessionId);
          setTimeout(onSuccess, 450);
        } else {
          const nextRound = memRound + 1;
          setMemRound(nextRound);
          setTimeout(() => startMemoryRound(nextRound), 500);
        }
      }
    } else {
      audioEngine.playGestureBlocked();
      setMemStatus('Wrong Sigil! Replaying phase sequence...');
      setMemUserIdx(0);
      setTimeout(() => setIsPlayingBack(true), 500);
    }
  };

  // ==================== 3. BLOOD CRYSTALS (Character Obstacle Maze + Sawblades + Laser Gate) ====================
  const bloodCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [crystalStatus, setCrystalStatus] = useState<{ destroyed: number; hearts: number; gateOpen: boolean }>({
    destroyed: 0,
    hearts: 3,
    gateOpen: false
  });

  useEffect(() => {
    if (minigame !== 'blood_crystals') return;
    const canvas = bloodCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let px = 44;
    let py = 295;
    let facing = 1;
    let walkPhase = 0;
    let hearts = 3;
    let invuln = 0;
    let dashTimer = 0;
    let dashCooldown = 0;
    let frame = 0;
    let done = false;
    const keys: Record<string, boolean> = {};

    const walls = [
      { x: 115, y: 55, w: 18, h: 175 },
      { x: 345, y: 115, w: 18, h: 175 },
      { x: 185, y: 105, w: 110, h: 18 },
      { x: 185, y: 220, w: 110, h: 18 }
    ];
    // Inner Crimson Vault Gate (blocks upper-center crystal unless pressure plate or timed cycle is open)
    const gate = { x: 295, y: 123, w: 16, h: 97 };
    const plate = { x: 64, y: 66, r: 18 };

    const crystals = [
      { id: 'c0', x: 65, y: 195, broken: false },
      { id: 'c1', x: 158, y: 62, broken: false },
      { id: 'c2', x: 240, y: 170, broken: false }, // Inside gated vault!
      { id: 'c3', x: 425, y: 68, broken: false },
      { id: 'c4', x: 425, y: 285, broken: false },
      { id: 'c5', x: 240, y: 292, broken: false }
    ];

    const collideRect = (nx: number, ny: number, r: number, rect: { x: number; y: number; w: number; h: number }) => {
      const closestX = Math.max(rect.x, Math.min(nx, rect.x + rect.w));
      const closestY = Math.max(rect.y, Math.min(ny, rect.y + rect.h));
      return Math.hypot(nx - closestX, ny - closestY) < r;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys[k] = true;
      if ((k === ' ' || k === 'shift') && dashCooldown === 0) {
        dashTimer = 11;
        dashCooldown = 55;
        audioEngine.playAncientRune();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let animId = 0;
    const loop = () => {
      if (done) return;
      frame++;
      if (invuln > 0) invuln--;
      if (dashTimer > 0) dashTimer--;
      if (dashCooldown > 0) dashCooldown--;

      // Sync shared objectives from Co-op friends
      const sess = coopRef.current;
      if (sess) {
        crystals.forEach((c) => {
          if (sess.completedObjectives.includes(c.id)) c.broken = true;
        });
      }

      const selfOnPlate = Math.hypot(px - plate.x, py - plate.r - plate.y + plate.r) < 26;
      const friendOnPlate = Boolean(sess?.switchActive);
      const timedGateOpen = Math.floor(frame / 160) % 2 === 0; // Cycles open/shut when solo
      const gateOpen = selfOnPlate || friendOnPlate || timedGateOpen;

      const spd = dashTimer > 0 ? 6.4 : 3.2;
      let dx = 0;
      let dy = 0;
      if (keys['arrowup'] || keys['w']) dy -= spd;
      if (keys['arrowdown'] || keys['s']) dy += spd;
      if (keys['arrowleft'] || keys['a']) {
        dx -= spd;
        facing = -1;
      }
      if (keys['arrowright'] || keys['d']) {
        dx += spd;
        facing = 1;
      }
      const moving = dx !== 0 || dy !== 0;
      if (moving) walkPhase += 0.34;

      const nextX = Math.max(16, Math.min(canvas.width - 16, px + dx));
      const blockedX =
        walls.some((w) => collideRect(nextX, py, 10, w)) ||
        (!gateOpen && collideRect(nextX, py, 10, gate));
      if (!blockedX) px = nextX;

      const nextY = Math.max(22, Math.min(canvas.height - 16, py + dy));
      const blockedY =
        walls.some((w) => collideRect(px, nextY, 10, w)) ||
        (!gateOpen && collideRect(px, nextY, 10, gate));
      if (!blockedY) py = nextY;

      if (sess) {
        multiplayerClient.sendMinigameMove(sess.sessionId, {
          x: px,
          y: py,
          facing,
          isMoving: moving,
          holdingSwitch: selfOnPlate
        });
      }

      // Draw Arena
      ctx.fillStyle = '#0d0409';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Walls
      walls.forEach((w) => {
        ctx.fillStyle = '#3f1d2b';
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = '#9f1239';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
      });

      // Pressure Plate Rune
      ctx.fillStyle = selfOnPlate || friendOnPlate ? '#10b981' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(plate.x, plate.y, plate.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#020617';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GATE RUNE', plate.x, plate.y + 3);

      // Crimson Laser Gate
      if (!gateOpen) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.fillRect(gate.x, gate.y, gate.w, gate.h);
      } else {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(gate.x, gate.y, gate.w, gate.h);
        ctx.setLineDash([]);
      }

      // Sweeping Lasers + 2 Moving Sawblades
      const cx = 240;
      const cy = 170;
      const a1 = frame * 0.028;
      const a2 = a1 + Math.PI;
      const checkBeam = (a: number) => {
        const bx = cx + Math.cos(a) * 280;
        const by = cy + Math.sin(a) * 280;
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.72)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(bx, by);
        ctx.stroke();

        const ldx = bx - cx;
        const ldy = by - cy;
        const t = Math.max(0, Math.min(1, ((px - cx) * ldx + (py - cy) * ldy) / (ldx * ldx + ldy * ldy)));
        return Math.hypot(px - (cx + t * ldx), py - (cy + t * ldy)) < 11;
      };

      const saw1 = { x: 156, y: 170 + Math.sin(frame * 0.05) * 95 };
      const saw2 = { x: 398, y: 175 + Math.cos(frame * 0.055) * 110 };
      [saw1, saw2].forEach((s) => {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(frame * 0.25);
        ctx.fillStyle = '#e2e8f0';
        for (let k = 0; k < 6; k++) {
          ctx.rotate(Math.PI / 3);
          ctx.fillRect(-13, -3, 26, 6);
        }
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      const hitSaw = Math.hypot(px - saw1.x, py - saw1.y) < 18 || Math.hypot(px - saw2.x, py - saw2.y) < 18;
      const hitLaser = checkBeam(a1) || checkBeam(a2);

      if ((hitSaw || hitLaser) && invuln === 0 && dashTimer === 0) {
        hearts--;
        invuln = 55;
        audioEngine.playZombieHit();
        if (hearts <= 0) {
          hearts = 3;
          px = 44;
          py = 295;
          if (!sess) crystals.forEach((c) => (c.broken = false));
        }
        setCrystalStatus({
          destroyed: crystals.filter((c) => c.broken).length,
          hearts,
          gateOpen
        });
      }

      // Draw & Shatter Crystals
      for (const c of crystals) {
        if (c.broken) continue;
        if (Math.hypot(px - c.x, py - c.y) < 20) {
          c.broken = true;
          audioEngine.playShieldBreak();
          if (sess) multiplayerClient.claimMinigameObjective(sess.sessionId, c.id);
        }
        ctx.fillStyle = '#fb7185';
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - 13);
        ctx.lineTo(c.x + 10, c.y);
        ctx.lineTo(c.x, c.y + 13);
        ctx.lineTo(c.x - 10, c.y);
        ctx.closePath();
        ctx.fill();
      }

      const brokenCount = crystals.filter((c) => c.broken).length;
      setCrystalStatus({ destroyed: brokenCount, hearts, gateOpen });
      if (brokenCount >= 6) {
        done = true;
        audioEngine.playGestureSuccess();
        if (sess) multiplayerClient.completeMinigame(sess.sessionId);
        setTimeout(onSuccess, 400);
        return;
      }

      // Render Co-op Teammates
      if (sess) {
        sess.participants.forEach((pt) => {
          if (pt.id === selfId) return;
          drawMiniRPGCharacter(
            ctx,
            pt.x,
            pt.y,
            pt.outfit || DEFAULT_RPG_OUTFIT,
            pt.facing,
            pt.isMoving,
            frame * 0.25,
            pt.name,
            0,
            false,
            pt.color
          );
        });
      }

      // Render Local Player Character
      drawMiniRPGCharacter(
        ctx,
        px,
        py,
        outfitRef.current,
        facing,
        moving,
        walkPhase,
        playerName,
        invuln,
        dashTimer > 0
      );

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [minigame, onSuccess, playerName, selfId]);

  // ==================== 4. BEAST BIRDS RHYTHM (HAND-TRACKED LIKE ARENA!) ====================
  const birdsCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rhythmStats, setRhythmStats] = useState<{
    hits: number;
    misses: number;
    activeGesture: string;
    feedback: string;
  }>({
    hits: 0,
    misses: 0,
    activeGesture: 'Raise Hand...',
    feedback: 'Make the matching Hand Gesture as each Spirit Orb enters its ring!'
  });
  const manualLanePulseRef = useRef<number | null>(null);

  useEffect(() => {
    if (minigame !== 'beast_birds') return;
    const canvas = birdsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const LANE_SPECS: { gesture: GestureId; label: string; short: string; color: string }[] = [
      { gesture: 'DUAL_PALMS_FORWARD', label: 'Open Palm', short: '✋ Palm', color: '#f97316' },
      { gesture: 'DUAL_PEACE_SPREAD', label: 'Peace V', short: '✌ Peace', color: '#38bdf8' },
      { gesture: 'CROSS_INDEX_POINT', label: 'Index Point', short: '☝ Point', color: '#a855f7' },
      { gesture: 'DUAL_RAISED_FISTS', label: 'Titan Fist', short: '✊ Fist', color: '#eab308' }
    ];

    let notes: { lane: number; y: number; hit: boolean; crow: boolean }[] = [];
    let frame = 0;
    let hits = 0;
    let misses = 0;
    let done = false;
    let cooldown = 0;
    const targetY = 265;
    const laneXs = [72, 184, 296, 408];

    const onKeyDown = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        manualLanePulseRef.current = Number(e.key) - 1;
      }
    };
    window.addEventListener('keydown', onKeyDown);

    let animId = 0;
    const loop = () => {
      if (done) return;
      frame++;
      if (cooldown > 0) cooldown--;

      if (frame % 36 === 1) {
        notes.push({
          lane: Math.floor(Math.random() * 4),
          y: -14,
          hit: false,
          crow: Math.random() < 0.18
        });
      }

      const g = gestureRef.current;
      let activeLane = LANE_SPECS.findIndex((s) => s.gesture === g?.gesture);
      if (manualLanePulseRef.current !== null) {
        activeLane = manualLanePulseRef.current;
        manualLanePulseRef.current = null;
      }

      const activeLabel =
        activeLane >= 0 ? LANE_SPECS[activeLane].label : g?.handFound ? 'Adjust Hand Pose' : 'No Hand Detected';

      if (activeLane >= 0 && cooldown === 0) {
        const hitNote = notes.find(
          (n) => !n.hit && n.lane === activeLane && Math.abs(n.y - targetY) < 38
        );
        if (hitNote) {
          hitNote.hit = true;
          cooldown = 12;
          if (hitNote.crow) {
            hits = Math.max(0, hits - 1);
            misses++;
            audioEngine.playZombieHit();
            setRhythmStats({
              hits,
              misses,
              activeGesture: activeLabel,
              feedback: 'Hit a Dark Crow! Let dark orbs pass!'
            });
          } else {
            hits++;
            audioEngine.playAncientRune();
            setRhythmStats({
              hits,
              misses,
              activeGesture: activeLabel,
              feedback: `${LANE_SPECS[activeLane].label} Chime! (${hits}/14)`
            });
            if (hits >= 14) {
              done = true;
              audioEngine.playGestureSuccess();
              if (coopRef.current) multiplayerClient.completeMinigame(coopRef.current.sessionId);
              setTimeout(onSuccess, 400);
              return;
            }
          }
        }
      }

      ctx.fillStyle = '#071426';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      laneXs.forEach((lx, i) => {
        const spec = LANE_SPECS[i];
        const isLit = activeLane === i;
        ctx.strokeStyle = isLit ? spec.color : 'rgba(56, 189, 248, 0.22)';
        ctx.lineWidth = isLit ? 4 : 2;
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        ctx.lineTo(lx, canvas.height);
        ctx.stroke();

        ctx.fillStyle = isLit ? spec.color + '44' : 'transparent';
        ctx.strokeStyle = isLit ? '#ffffff' : spec.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(lx, targetY, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(spec.short, lx, targetY + 42);
      });

      for (let i = notes.length - 1; i >= 0; i--) {
        const n = notes[i];
        if (n.hit) {
          notes.splice(i, 1);
          continue;
        }
        n.y += 3.1;
        if (n.y > targetY + 40) {
          notes.splice(i, 1);
          if (!n.crow) {
            misses++;
            if (misses >= 5) {
              hits = 0;
              misses = 0;
              notes = [];
              setRhythmStats({
                hits,
                misses,
                activeGesture: activeLabel,
                feedback: 'Too many missed chimes — Spirits reset!'
              });
            } else {
              setRhythmStats({
                hits,
                misses,
                activeGesture: activeLabel,
                feedback: `Chime slipped past! (${misses}/5 misses)`
              });
            }
          }
          continue;
        }

        const lx = laneXs[n.lane];
        ctx.fillStyle = n.crow ? '#ef4444' : LANE_SPECS[n.lane].color;
        ctx.beginPath();
        ctx.arc(lx, n.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = n.crow ? '#09090b' : '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(n.crow ? '✕' : '✦', lx, n.y + 3.5);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [minigame, onSuccess]);

  // ==================== 5. BEAST CONSTELLATION (Harder 8-Star 13-Edge Eulerian Trail) ====================
  const STAR_NODES = [
    { id: 0, x: 65, y: 170, label: 'Snout (Start)' },
    { id: 1, x: 135, y: 80, label: 'Ear' },
    { id: 2, x: 145, y: 245, label: 'Jaw' },
    { id: 3, x: 235, y: 155, label: 'Heart' },
    { id: 4, x: 325, y: 235, label: 'Chest' },
    { id: 5, x: 335, y: 85, label: 'Spine' },
    { id: 6, x: 425, y: 165, label: 'Haunch' },
    { id: 7, x: 455, y: 255, label: 'Tail (End)' }
  ];
  // Verified 13-edge Eulerian trail from 0 -> 7
  const STAR_EDGES: [number, number][] = [
    [0, 1], [1, 2], [2, 0],
    [0, 3], [3, 4], [4, 5],
    [5, 3], [3, 6], [6, 4],
    [4, 7], [7, 6], [6, 5], [5, 7]
  ];
  const [currentStar, setCurrentStar] = useState<number>(0);
  const [tracedEdges, setTracedEdges] = useState<string[]>([]);
  const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

  const handleStarClick = (nodeId: number) => {
    if (nodeId === currentStar) return;
    const key = edgeKey(currentStar, nodeId);
    const exists = STAR_EDGES.some(([a, b]) => edgeKey(a, b) === key);
    if (!exists || tracedEdges.includes(key)) {
      audioEngine.playGestureBlocked();
      return;
    }
    audioEngine.playAncientRune();
    const next = [...tracedEdges, key];
    setTracedEdges(next);
    setCurrentStar(nodeId);
    if (next.length === STAR_EDGES.length) {
      audioEngine.playGestureSuccess();
      if (coopRef.current) multiplayerClient.completeMinigame(coopRef.current.sessionId);
      setTimeout(onSuccess, 450);
    }
  };

  // ==================== 6. BEAST TAMING (Character Storm Gorge Obstacle Course) ====================
  const tamingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tamedCount, setTamedCount] = useState<number>(0);

  useEffect(() => {
    if (minigame !== 'beast_taming') return;
    const canvas = tamingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let px = 240;
    let py = 305;
    let facing = 1;
    let walkPhase = 0;
    let dashTimer = 0;
    let dashCooldown = 0;
    let invuln = 0;
    let frame = 0;
    let done = false;
    const keys: Record<string, boolean> = {};

    const barriers = [
      { x: 145, y: 110, w: 68, h: 16 },
      { x: 268, y: 110, w: 68, h: 16 },
      { x: 195, y: 215, w: 90, h: 16 }
    ];

    const wolves = [
      { id: 'w0', x: 85, y: 65, vx: 2.3, vy: 1.7, calm: 0, tamed: false },
      { id: 'w1', x: 390, y: 70, vx: -2.1, vy: 1.9, calm: 0, tamed: false },
      { id: 'w2', x: 95, y: 255, vx: 2.2, vy: -1.8, calm: 0, tamed: false },
      { id: 'w3', x: 385, y: 245, vx: -2.3, vy: -1.6, calm: 0, tamed: false },
      { id: 'w4', x: 240, y: 165, vx: 1.9, vy: 2.2, calm: 0, tamed: false }
    ];

    const wisps = [
      { x: 240, y: 165, r: 95, speed: 0.038, phase: 0 },
      { x: 240, y: 165, r: 145, speed: -0.029, phase: 2.1 },
      { x: 240, y: 165, r: 58, speed: 0.045, phase: 4.2 }
    ];

    const collideRect = (nx: number, ny: number, r: number, rect: { x: number; y: number; w: number; h: number }) => {
      const cx = Math.max(rect.x, Math.min(nx, rect.x + rect.w));
      const cy = Math.max(rect.y, Math.min(ny, rect.y + rect.h));
      return Math.hypot(nx - cx, ny - cy) < r;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys[k] = true;
      if ((k === ' ' || k === 'shift') && dashCooldown === 0) {
        dashTimer = 11;
        dashCooldown = 50;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => (keys[e.key.toLowerCase()] = false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let animId = 0;
    const loop = () => {
      if (done) return;
      frame++;
      if (dashTimer > 0) dashTimer--;
      if (dashCooldown > 0) dashCooldown--;
      if (invuln > 0) invuln--;

      const sess = coopRef.current;
      if (sess) {
        wolves.forEach((wl) => {
          if (sess.completedObjectives.includes(wl.id)) {
            wl.tamed = true;
            wl.calm = 100;
          }
        });
      }

      const spd = dashTimer > 0 ? 6.5 : 3.5;
      let dx = 0;
      let dy = 0;
      if (keys['arrowup'] || keys['w']) dy -= spd;
      if (keys['arrowdown'] || keys['s']) dy += spd;
      if (keys['arrowleft'] || keys['a']) {
        dx -= spd;
        facing = -1;
      }
      if (keys['arrowright'] || keys['d']) {
        dx += spd;
        facing = 1;
      }

      // Crosswind Gorge Push (center band)
      if (py > 130 && py < 205 && dashTimer === 0) {
        dx += Math.sin(frame * 0.03) * 1.35;
      }

      const moving = dx !== 0 || dy !== 0;
      if (moving) walkPhase += 0.34;

      const nx = Math.max(16, Math.min(canvas.width - 16, px + dx));
      if (!barriers.some((b) => collideRect(nx, py, 10, b))) px = nx;
      const ny = Math.max(20, Math.min(canvas.height - 16, py + dy));
      if (!barriers.some((b) => collideRect(px, ny, 10, b))) py = ny;

      if (sess) {
        multiplayerClient.sendMinigameMove(sess.sessionId, { x: px, y: py, facing, isMoving: moving });
      }

      ctx.fillStyle = '#061a15';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Wind band indicator
      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.fillRect(0, 130, canvas.width, 75);

      // Briar Barriers
      barriers.forEach((b) => {
        ctx.fillStyle = '#14532d';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(b.x, b.y, b.w, b.h);
      });

      // Player soothing ring
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 36, 0, Math.PI * 2);
      ctx.stroke();

      // Storm Wisps
      for (const w of wisps) {
        const ang = frame * w.speed + w.phase;
        const wx = w.x + Math.cos(ang) * w.r;
        const wy = w.y + Math.sin(ang) * (w.r * 0.72);
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(wx, wy, 11, 0, Math.PI * 2);
        ctx.fill();

        if (Math.hypot(px - wx, py - wy) < 20 && invuln === 0 && dashTimer === 0) {
          audioEngine.playZombieHit();
          invuln = 45;
          wolves.forEach((wl) => {
            if (!wl.tamed) wl.calm = Math.max(0, wl.calm - 20);
          });
          px = 240;
          py = 310;
        }
      }

      // Wolves
      for (const wl of wolves) {
        if (!wl.tamed) {
          wl.x += wl.vx;
          wl.y += wl.vy;
          if (wl.x < 22 || wl.x > canvas.width - 22) wl.vx *= -1;
          if (wl.y < 22 || wl.y > canvas.height - 22) wl.vy *= -1;

          if (Math.hypot(px - wl.x, py - wl.y) < 42) {
            wl.calm += 1.9;
            if (wl.calm >= 100) {
              wl.tamed = true;
              audioEngine.playAncientRune();
              if (sess) multiplayerClient.claimMinigameObjective(sess.sessionId, wl.id);
            }
          }
        }
        ctx.fillStyle = wl.tamed ? '#10b981' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(wl.x, wl.y, 12, 0, Math.PI * 2);
        ctx.fill();
        if (!wl.tamed && wl.calm > 0) {
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(wl.x, wl.y, 18, -Math.PI / 2, -Math.PI / 2 + (wl.calm / 100) * Math.PI * 2);
          ctx.stroke();
        }
      }

      const tamed = wolves.filter((w) => w.tamed).length;
      setTamedCount(tamed);
      if (tamed >= 5) {
        done = true;
        audioEngine.playGestureSuccess();
        if (sess) multiplayerClient.completeMinigame(sess.sessionId);
        setTimeout(onSuccess, 400);
        return;
      }

      if (sess) {
        sess.participants.forEach((pt) => {
          if (pt.id === selfId) return;
          drawMiniRPGCharacter(
            ctx,
            pt.x,
            pt.y,
            pt.outfit || DEFAULT_RPG_OUTFIT,
            pt.facing,
            pt.isMoving,
            frame * 0.25,
            pt.name,
            0,
            false,
            pt.color
          );
        });
      }

      drawMiniRPGCharacter(
        ctx,
        px,
        py,
        outfitRef.current,
        facing,
        moving,
        walkPhase,
        playerName,
        invuln,
        dashTimer > 0
      );

      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [minigame, onSuccess, playerName, selfId]);

  // ==================== 7. RPG HOUSE ARCADE (HAND-AIMED SPELL BLASTER LIKE ARENA!) ====================
  const arcadeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [arcadeStats, setArcadeStats] = useState<{ cleared: number; hearts: number; posture: string }>({
    cleared: 0,
    hearts: 3,
    posture: 'Aim with Hand!'
  });

  useEffect(() => {
    if (minigame !== 'rpg_house_arcade') return;
    const canvas = arcadeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let shipX = 240;
    let hearts = 3;
    let invuln = 0;
    let bullets: { x: number; y: number }[] = [];
    let enemyBolts: { x: number; y: number }[] = [];
    const targets: { x: number; y: number; vx: number; hp: number }[] = [];
    for (let i = 0; i < 18; i++) {
      const row = Math.floor(i / 6);
      targets.push({
        x: 55 + (i % 6) * 72,
        y: 36 + row * 36,
        vx: row % 2 === 0 ? 1.8 : -1.8,
        hp: row === 0 ? 2 : 1
      });
    }
    let frame = 0;
    let cleared = 0;
    let done = false;
    const keys: Record<string, boolean> = {};

    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      if (e.key === ' ') bullets.push({ x: shipX, y: 286 });
    };
    const onKeyUp = (e: KeyboardEvent) => (keys[e.key.toLowerCase()] = false);
    const onMouseMove = (e: MouseEvent) => {
      if (gestureRef.current?.handFound) return;
      const rect = canvas.getBoundingClientRect();
      shipX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    };
    const onClick = () => bullets.push({ x: shipX, y: 286 });

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);

    let animId = 0;
    const loop = () => {
      if (done) return;
      frame++;
      if (invuln > 0) invuln--;

      const g = gestureRef.current;
      let handShield = false;
      let handFire = false;
      let postureLabel = 'Move Mouse / Raise Hand';

      if (g?.handFound) {
        const targetShipX = (g.aimPoint.x / Math.max(1, window.innerWidth)) * canvas.width;
        shipX += (targetShipX - shipX) * 0.35;
        if (g.gesture === 'DUAL_RAISED_FISTS') {
          handShield = true;
          postureLabel = '✊ Aegis Reflector Shield!';
        } else if (
          g.gesture === 'DUAL_PALMS_FORWARD' ||
          g.gesture === 'CROSS_INDEX_POINT' ||
          g.gesture === 'DUAL_PEACE_SPREAD' ||
          g.gesture === 'FIST_AND_PALM'
        ) {
          handFire = true;
          postureLabel = '✋ Hand Firing Mana Bolts!';
        } else {
          postureLabel = 'Open Palm / Point to Fire · Fist = Shield';
        }
      } else {
        if (keys['arrowleft'] || keys['a']) shipX -= 5;
        if (keys['arrowright'] || keys['d']) shipX += 5;
        if (keys['s'] || keys['arrowdown']) handShield = true;
      }

      shipX = Math.max(24, Math.min(canvas.width - 24, shipX));
      if ((handFire || !g?.handFound) && frame % 12 === 0) {
        bullets.push({ x: shipX, y: 286 });
      }

      ctx.fillStyle = '#060918';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      bullets = bullets.filter((b) => {
        b.y -= 7.2;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(b.x - 2.5, b.y - 8, 5, 14);
        return b.y > -12;
      });

      // Invaders bounce & shoot back
      let bounce = false;
      targets.forEach((t) => {
        if (t.hp <= 0) return;
        t.x += t.vx;
        if (t.x < 24 || t.x > canvas.width - 24) bounce = true;
      });
      if (bounce) targets.forEach((t) => (t.vx *= -1));

      if (frame % 42 === 0) {
        const alive = targets.filter((t) => t.hp > 0);
        if (alive.length > 0) {
          const shooter = alive[Math.floor(Math.random() * alive.length)];
          enemyBolts.push({ x: shooter.x, y: shooter.y + 12 });
        }
      }

      enemyBolts = enemyBolts.filter((eb) => {
        eb.y += 3.6;
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        if (Math.hypot(eb.x - shipX, eb.y - 298) < (handShield ? 28 : 16)) {
          if (handShield) {
            audioEngine.playShieldDeflect();
          } else if (invuln === 0) {
            hearts--;
            invuln = 40;
            audioEngine.playZombieHit();
            if (hearts <= 0) {
              hearts = 3;
              cleared = 0;
              enemyBolts = [];
              targets.forEach((t, i) => {
                t.hp = i < 6 ? 2 : 1;
              });
            }
          }
          return false;
        }
        return eb.y < canvas.height + 10;
      });

      targets.forEach((t) => {
        if (t.hp <= 0) return;
        for (let bi = bullets.length - 1; bi >= 0; bi--) {
          if (Math.hypot(bullets[bi].x - t.x, bullets[bi].y - t.y) < 17) {
            bullets.splice(bi, 1);
            t.hp--;
            audioEngine.playAncientRune();
            if (t.hp <= 0) cleared++;
            break;
          }
        }
        if (t.hp > 0) {
          ctx.fillStyle = t.hp > 1 ? '#a855f7' : '#f43f5e';
          ctx.fillRect(t.x - 13, t.y - 9, 26, 17);
          ctx.fillStyle = '#fde047';
          ctx.fillRect(t.x - 7, t.y - 3, 4, 4);
          ctx.fillRect(t.x + 3, t.y - 3, 4, 4);
        }
      });

      setArcadeStats({ cleared, hearts, posture: postureLabel });
      if (cleared >= 18) {
        done = true;
        audioEngine.playGestureSuccess();
        if (coopRef.current) multiplayerClient.completeMinigame(coopRef.current.sessionId);
        setTimeout(onSuccess, 400);
        return;
      }

      // Ship & optional Fist Shield
      if (handShield) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(shipX, 298, 26, Math.PI, 0);
        ctx.stroke();
      }
      ctx.fillStyle = invuln > 0 && frame % 6 < 3 ? '#fca5a5' : '#22d3ee';
      ctx.beginPath();
      ctx.moveTo(shipX, 282);
      ctx.lineTo(shipX - 16, 312);
      ctx.lineTo(shipX + 16, 312);
      ctx.closePath();
      ctx.fill();

      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('click', onClick);
    };
  }, [minigame, onSuccess]);

  // ==================== 8. RPG PLAYGROUND (Character Platformer Star & Obstacle Dash) ====================
  const playgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [starsCaught, setStarsCaught] = useState<number>(0);

  useEffect(() => {
    if (minigame !== 'rpg_playground_catch') return;
    const canvas = playgroundCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let px = 240;
    let py = 278;
    let vy = 0;
    let facing = 1;
    let walkPhase = 0;
    let invuln = 0;
    const keys: Record<string, boolean> = {};
    const stars: { x: number; y: number; vy: number; bad: boolean }[] = [];
    const springPads = [
      { x: 65, y: 282, w: 60 },
      { x: 210, y: 230, w: 60 },
      { x: 355, y: 282, w: 60 }
    ];
    let roller = { x: 40, vx: 3.1 };
    let frame = 0;
    let caught = 0;
    let done = false;

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys[k] = true;
      if ((k === 'arrowup' || k === 'w' || k === ' ') && py >= 276) {
        vy = -9.6;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => (keys[e.key.toLowerCase()] = false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let animId = 0;
    const loop = () => {
      if (done) return;
      frame++;
      if (invuln > 0) invuln--;

      let dx = 0;
      if (keys['arrowleft'] || keys['a']) {
        dx -= 4.4;
        facing = -1;
      }
      if (keys['arrowright'] || keys['d']) {
        dx += 4.4;
        facing = 1;
      }
      px = Math.max(20, Math.min(canvas.width - 20, px + dx));
      if (dx !== 0) walkPhase += 0.36;

      vy += 0.44;
      py += vy;
      if (py > 278) {
        py = 278;
        vy = 0;
      }

      // Spring pads bounce character higher!
      springPads.forEach((sp) => {
        if (vy >= 0 && px > sp.x && px < sp.x + sp.w && py >= sp.y - 8 && py <= sp.y + 8) {
          py = sp.y - 8;
          vy = -12.4;
          audioEngine.playAncientRune();
        }
      });

      if (frame % 26 === 1) {
        stars.push({
          x: 28 + Math.random() * (canvas.width - 56),
          y: -15,
          vy: 2.7 + Math.random() * 1.7,
          bad: Math.random() < 0.28
        });
      }

      // Rolling ground hazard ball
      roller.x += roller.vx;
      if (roller.x < 18 || roller.x > canvas.width - 18) roller.vx *= -1;
      if (Math.hypot(px - roller.x, py - 280) < 18 && invuln === 0) {
        invuln = 45;
        caught = Math.max(0, caught - 2);
        setStarsCaught(caught);
        audioEngine.playZombieHit();
      }

      const sess = coopRef.current;
      if (sess) {
        multiplayerClient.sendMinigameMove(sess.sessionId, { x: px, y: py, facing, isMoving: dx !== 0 });
      }

      ctx.fillStyle = '#0c1b2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Turf floor
      ctx.fillStyle = '#14532d';
      ctx.fillRect(0, 290, canvas.width, 30);

      // Springboards
      springPads.forEach((sp) => {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(sp.x, sp.y, sp.w, 8);
      });

      // Rolling dodgeball hazard
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(roller.x, 281, 10, 0, Math.PI * 2);
      ctx.fill();

      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i];
        s.y += s.vy;
        if (Math.hypot(s.x - px, s.y - py) < 24) {
          stars.splice(i, 1);
          if (s.bad) {
            if (invuln === 0) {
              caught = Math.max(0, caught - 2);
              invuln = 35;
              audioEngine.playZombieHit();
            }
          } else {
            caught++;
            audioEngine.playAncientRune();
            if (sess) multiplayerClient.claimMinigameObjective(sess.sessionId, `star_${frame}_${i}`);
          }
          setStarsCaught(caught);
          if (caught >= 14) {
            done = true;
            audioEngine.playGestureSuccess();
            if (sess) multiplayerClient.completeMinigame(sess.sessionId);
            setTimeout(onSuccess, 400);
            return;
          }
          continue;
        }
        if (s.y > canvas.height + 20) {
          stars.splice(i, 1);
          continue;
        }
        ctx.fillStyle = s.bad ? '#ef4444' : '#facc15';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.bad ? 10 : 11, 0, Math.PI * 2);
        ctx.fill();
      }

      if (sess) {
        sess.participants.forEach((pt) => {
          if (pt.id === selfId) return;
          drawMiniRPGCharacter(
            ctx,
            pt.x,
            pt.y,
            pt.outfit || DEFAULT_RPG_OUTFIT,
            pt.facing,
            pt.isMoving,
            frame * 0.25,
            pt.name,
            0,
            false,
            pt.color
          );
        });
      }

      drawMiniRPGCharacter(
        ctx,
        px,
        py,
        outfitRef.current,
        facing,
        dx !== 0,
        walkPhase,
        playerName,
        invuln,
        vy < -2
      );

      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [minigame, onSuccess, playerName, selfId]);

  // ==================== 9. RPG HOSPITAL (HAND-TRACKED ALCHEMIST BREWING LIKE ARENA!) ====================
  const POTION_RECIPES: {
    patient: string;
    need: { label: string; gesture: GestureId; short: string; color: string }[];
  }[] = [
    {
      patient: 'Fevered Knight',
      need: [
        { label: 'Fire Heat', gesture: 'DUAL_PALMS_FORWARD', short: '✋ Open Palm', color: '#f97316' },
        { label: 'Frost Chill', gesture: 'DUAL_PEACE_SPREAD', short: '✌ Peace V', color: '#38bdf8' },
        { label: 'Crush Herb', gesture: 'DUAL_RAISED_FISTS', short: '✊ Fist', color: '#eab308' },
        { label: 'Spark Catalyst', gesture: 'CROSS_INDEX_POINT', short: '☝ Index Point', color: '#a855f7' }
      ]
    },
    {
      patient: 'Frostbitten Ranger',
      need: [
        { label: 'Hydro Pour', gesture: 'FIST_AND_PALM', short: '🔱 3-Finger / Fist+Palm', color: '#06b6d4' },
        { label: 'Fire Boil', gesture: 'DUAL_PALMS_FORWARD', short: '✋ Open Palm', color: '#f97316' },
        { label: 'Spark Surge', gesture: 'CROSS_INDEX_POINT', short: '☝ Index Point', color: '#a855f7' },
        { label: 'Seal Lid', gesture: 'DUAL_RAISED_FISTS', short: '✊ Fist', color: '#eab308' }
      ]
    },
    {
      patient: 'Curse-Struck Mage',
      need: [
        { label: 'Frost Seal', gesture: 'DUAL_PEACE_SPREAD', short: '✌ Peace V', color: '#38bdf8' },
        { label: 'Spark Ionize', gesture: 'CROSS_INDEX_POINT', short: '☝ Index Point', color: '#a855f7' },
        { label: 'Hydro Wash', gesture: 'FIST_AND_PALM', short: '🔱 3-Finger / Fist+Palm', color: '#06b6d4' },
        { label: 'Fire Purify', gesture: 'DUAL_PALMS_FORWARD', short: '✋ Open Palm', color: '#f97316' }
      ]
    },
    {
      patient: 'Archmage Captain',
      need: [
        { label: 'Crush Root', gesture: 'DUAL_RAISED_FISTS', short: '✊ Fist', color: '#eab308' },
        { label: 'Frost Condense', gesture: 'DUAL_PEACE_SPREAD', short: '✌ Peace V', color: '#38bdf8' },
        { label: 'Fire Boil', gesture: 'DUAL_PALMS_FORWARD', short: '✋ Open Palm', color: '#f97316' },
        { label: 'Spark Finish', gesture: 'CROSS_INDEX_POINT', short: '☝ Index Point', color: '#a855f7' }
      ]
    }
  ];
  const [potionRound, setPotionRound] = useState<number>(0);
  const [potionStep, setPotionStep] = useState<number>(0);
  const [brewHoldProgress, setBrewHoldProgress] = useState<number>(0);
  const [hospitalTimeLeft, setHospitalTimeLeft] = useState<number>(60);

  useEffect(() => {
    if (minigame !== 'rpg_hospital_potion') return;
    const timer = window.setInterval(() => {
      setHospitalTimeLeft((t) => {
        if (t <= 1) {
          audioEngine.playZombieHit();
          setPotionRound(0);
          setPotionStep(0);
          setBrewHoldProgress(0);
          return 60;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [minigame]);

  const advancePotionStep = () => {
    const recipe = POTION_RECIPES[potionRound];
    if (!recipe) return;
    audioEngine.playAncientRune();
    if (potionStep + 1 >= recipe.need.length) {
      if (potionRound + 1 >= POTION_RECIPES.length) {
        audioEngine.playGestureSuccess();
        if (coopRef.current) multiplayerClient.completeMinigame(coopRef.current.sessionId);
        setTimeout(onSuccess, 400);
      } else {
        setPotionRound((r) => r + 1);
        setPotionStep(0);
      }
    } else {
      setPotionStep((s) => s + 1);
    }
    setBrewHoldProgress(0);
  };

  useEffect(() => {
    if (minigame !== 'rpg_hospital_potion') return;
    const recipe = POTION_RECIPES[potionRound];
    const target = recipe?.need[potionStep];
    if (!target) return;

    const tick = window.setInterval(() => {
      const g = gestureRef.current;
      if (g?.handFound && g.gesture === target.gesture) {
        setBrewHoldProgress((prev) => {
          const next = prev + 16;
          if (next >= 100) {
            advancePotionStep();
            return 0;
          }
          return next;
        });
      } else {
        setBrewHoldProgress((prev) => Math.max(0, prev - 10));
      }
    }, 65);
    return () => window.clearInterval(tick);
  });

  // ==================== 10. RPG SUPERSTORE (Character Enchanted Trolley Obstacle Dash!) ====================
  const storeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [storeProgress, setStoreProgress] = useState<{ items: number; timeLeft: number; invulnText: string }>({
    items: 0,
    timeLeft: 55,
    invulnText: 'Collect 8 glowing items down aisles & avoid runaway carts!'
  });

  useEffect(() => {
    if (minigame !== 'rpg_superstore_rush') return;
    const canvas = storeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let px = 42;
    let py = 288;
    let facing = 1;
    let walkPhase = 0;
    let invuln = 0;
    let frame = 0;
    let timeLeft = 55;
    let done = false;
    const keys: Record<string, boolean> = {};

    const aisles = [
      { x: 115, y: 55, w: 32, h: 180 },
      { x: 225, y: 105, w: 32, h: 185 },
      { x: 335, y: 55, w: 32, h: 180 }
    ];
    const spills = [
      { x: 178, y: 270, r: 22 },
      { x: 290, y: 78, r: 22 }
    ];
    const carts = [
      { x: 185, y: 155, vx: 0, vy: 3.1, minY: 42, maxY: 285 },
      { x: 295, y: 180, vx: 0, vy: -3.4, minY: 42, maxY: 285 },
      { x: 420, y: 120, vx: 0, vy: 2.9, minY: 42, maxY: 240 }
    ];
    const loot = [
      { id: 'i0', x: 65, y: 65, picked: false, name: 'Key' },
      { id: 'i1', x: 65, y: 185, picked: false, name: 'Vial' },
      { id: 'i2', x: 185, y: 65, picked: false, name: 'Shield' },
      { id: 'i3', x: 185, y: 205, picked: false, name: 'Crown' },
      { id: 'i4', x: 295, y: 145, picked: false, name: 'Feather' },
      { id: 'i5', x: 295, y: 285, picked: false, name: 'Compass' },
      { id: 'i6', x: 425, y: 65, picked: false, name: 'Orb' },
      { id: 'i7', x: 425, y: 195, picked: false, name: 'Gem' }
    ];
    const checkout = { x: 425, y: 286, r: 24 };

    const collideRect = (nx: number, ny: number, r: number, rect: { x: number; y: number; w: number; h: number }) => {
      const cx = Math.max(rect.x, Math.min(nx, rect.x + rect.w));
      const cy = Math.max(rect.y, Math.min(ny, rect.y + rect.h));
      return Math.hypot(nx - cx, ny - cy) < r;
    };

    const onKeyDown = (e: KeyboardEvent) => (keys[e.key.toLowerCase()] = true);
    const onKeyUp = (e: KeyboardEvent) => (keys[e.key.toLowerCase()] = false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let animId = 0;
    const loop = () => {
      if (done) return;
      frame++;
      if (invuln > 0) invuln--;
      if (frame % 60 === 0) {
        timeLeft--;
        if (timeLeft <= 0) {
          timeLeft = 55;
          px = 42;
          py = 288;
          if (!coopRef.current) loot.forEach((l) => (l.picked = false));
          audioEngine.playZombieHit();
        }
      }

      const sess = coopRef.current;
      if (sess) {
        loot.forEach((l) => {
          if (sess.completedObjectives.includes(l.id)) l.picked = true;
        });
      }

      const onSpill = spills.some((sp) => Math.hypot(px - sp.x, py - sp.y) < sp.r);
      const spd = onSpill ? 1.8 : 3.7;
      let dx = 0;
      let dy = 0;
      if (keys['arrowup'] || keys['w']) dy -= spd;
      if (keys['arrowdown'] || keys['s']) dy += spd;
      if (keys['arrowleft'] || keys['a']) {
        dx -= spd;
        facing = -1;
      }
      if (keys['arrowright'] || keys['d']) {
        dx += spd;
        facing = 1;
      }
      const moving = dx !== 0 || dy !== 0;
      if (moving) walkPhase += 0.34;

      const nx = Math.max(18, Math.min(canvas.width - 18, px + dx));
      if (!aisles.some((a) => collideRect(nx, py, 10, a))) px = nx;
      const ny = Math.max(20, Math.min(canvas.height - 16, py + dy));
      if (!aisles.some((a) => collideRect(px, ny, 10, a))) py = ny;

      if (sess) {
        multiplayerClient.sendMinigameMove(sess.sessionId, { x: px, y: py, facing, isMoving: moving });
      }

      ctx.fillStyle = '#130b24';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Spills
      spills.forEach((sp) => {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Store Shelves
      aisles.forEach((a) => {
        ctx.fillStyle = '#4c1d95';
        ctx.fillRect(a.x, a.y, a.w, a.h);
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(a.x, a.y, a.w, a.h);
      });

      // Runaway Cursed Carts
      carts.forEach((c) => {
        c.y += c.vy;
        if (c.y < c.minY || c.y > c.maxY) c.vy *= -1;
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(c.x - 13, c.y - 10, 26, 20);
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CART', c.x, c.y + 3);

        if (Math.hypot(px - c.x, py - c.y) < 20 && invuln === 0) {
          invuln = 55;
          px = 42;
          py = 288;
          audioEngine.playZombieHit();
        }
      });

      // Loot items
      loot.forEach((l) => {
        if (l.picked) return;
        if (Math.hypot(px - l.x, py - l.y) < 20) {
          l.picked = true;
          audioEngine.playAncientRune();
          if (sess) multiplayerClient.claimMinigameObjective(sess.sessionId, l.id);
        }
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(l.x, l.y, 9, 0, Math.PI * 2);
        ctx.fill();
      });

      const collected = loot.filter((l) => l.picked).length;
      const allPicked = collected >= 8;

      // Checkout Counter
      ctx.fillStyle = allPicked ? '#10b981' : '#334155';
      ctx.beginPath();
      ctx.arc(checkout.x, checkout.y, checkout.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(allPicked ? 'PAY NOW!' : 'CHECKOUT', checkout.x, checkout.y + 3);

      setStoreProgress({
        items: collected,
        timeLeft,
        invulnText: allPicked
          ? 'All 8 Items collected! Sprint to the green Checkout Counter!'
          : 'Collect all 8 items & dodge runaway carts!'
      });

      if (allPicked && Math.hypot(px - checkout.x, py - checkout.y) < 28) {
        done = true;
        audioEngine.playGestureSuccess();
        if (sess) multiplayerClient.completeMinigame(sess.sessionId);
        setTimeout(onSuccess, 350);
        return;
      }

      if (sess) {
        sess.participants.forEach((pt) => {
          if (pt.id === selfId) return;
          drawMiniRPGCharacter(
            ctx,
            pt.x,
            pt.y,
            pt.outfit || DEFAULT_RPG_OUTFIT,
            pt.facing,
            pt.isMoving,
            frame * 0.25,
            pt.name,
            0,
            false,
            pt.color
          );
        });
      }

      drawMiniRPGCharacter(
        ctx,
        px,
        py,
        outfitRef.current,
        facing,
        moving,
        walkPhase,
        playerName,
        invuln,
        false
      );

      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [minigame, onSuccess, playerName, selfId]);

  // ==================== 11. RPG EMERALD HILLS (Character Night Briar Maze + Rolling Boulders) ====================
  const hillsCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hillsState, setHillsState] = useState<{ caught: number; timeLeft: number }>({
    caught: 0,
    timeLeft: 45
  });

  useEffect(() => {
    if (minigame !== 'rpg_hills_fireflies') return;
    const canvas = hillsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let px = 42;
    let py = 286;
    let facing = 1;
    let walkPhase = 0;
    let invuln = 0;
    let dashTimer = 0;
    let dashCooldown = 0;
    let frame = 0;
    let timeLeft = 45;
    let done = false;
    const keys: Record<string, boolean> = {};

    const hedges = [
      { x: 105, y: 70, w: 18, h: 175 },
      { x: 225, y: 125, w: 18, h: 180 },
      { x: 350, y: 55, w: 18, h: 180 }
    ];
    const boulders = [
      { x: 165, y: 55, vy: 2.8 },
      { x: 290, y: 265, vy: -3.1 }
    ];
    const flies = Array.from({ length: 12 }, (_, i) => ({
      id: `f${i}`,
      x: 55 + ((i * 73) % 380),
      y: 45 + ((i * 59) % 235),
      vx: (i % 2 === 0 ? 1 : -1) * 1.9,
      vy: (i % 3 === 0 ? 1 : -1) * 1.6,
      caught: false
    }));

    const collideRect = (nx: number, ny: number, r: number, rect: { x: number; y: number; w: number; h: number }) => {
      const cx = Math.max(rect.x, Math.min(nx, rect.x + rect.w));
      const cy = Math.max(rect.y, Math.min(ny, rect.y + rect.h));
      return Math.hypot(nx - cx, ny - cy) < r;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys[k] = true;
      if ((k === ' ' || k === 'shift') && dashCooldown === 0) {
        dashTimer = 10;
        dashCooldown = 48;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => (keys[e.key.toLowerCase()] = false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let animId = 0;
    const loop = () => {
      if (done) return;
      frame++;
      if (invuln > 0) invuln--;
      if (dashTimer > 0) dashTimer--;
      if (dashCooldown > 0) dashCooldown--;

      if (frame % 60 === 0) {
        timeLeft--;
        if (timeLeft <= 0) {
          timeLeft = 45;
          px = 42;
          py = 286;
          if (!coopRef.current) flies.forEach((fl) => (fl.caught = false));
          audioEngine.playZombieHit();
        }
      }

      const sess = coopRef.current;
      if (sess) {
        flies.forEach((fl) => {
          if (sess.completedObjectives.includes(fl.id)) fl.caught = true;
        });
      }

      const spd = dashTimer > 0 ? 6.2 : 3.6;
      let dx = 0;
      let dy = 0;
      if (keys['arrowup'] || keys['w']) dy -= spd;
      if (keys['arrowdown'] || keys['s']) dy += spd;
      if (keys['arrowleft'] || keys['a']) {
        dx -= spd;
        facing = -1;
      }
      if (keys['arrowright'] || keys['d']) {
        dx += spd;
        facing = 1;
      }
      const moving = dx !== 0 || dy !== 0;
      if (moving) walkPhase += 0.34;

      const nx = Math.max(16, Math.min(canvas.width - 16, px + dx));
      if (!hedges.some((h) => collideRect(nx, py, 10, h))) px = nx;
      const ny = Math.max(20, Math.min(canvas.height - 16, py + dy));
      if (!hedges.some((h) => collideRect(px, ny, 10, h))) py = ny;

      if (sess) {
        multiplayerClient.sendMinigameMove(sess.sessionId, { x: px, y: py, facing, isMoving: moving });
      }

      ctx.fillStyle = '#071c12';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      hedges.forEach((h) => {
        ctx.fillStyle = '#14532d';
        ctx.fillRect(h.x, h.y, h.w, h.h);
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(h.x, h.y, h.w, h.h);
      });

      boulders.forEach((b) => {
        b.y += b.vy;
        if (b.y < 32 || b.y > canvas.height - 32) b.vy *= -1;
        ctx.fillStyle = '#78716c';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 15, 0, Math.PI * 2);
        ctx.fill();
        if (Math.hypot(px - b.x, py - b.y) < 22 && invuln === 0 && dashTimer === 0) {
          invuln = 50;
          px = 42;
          py = 286;
          audioEngine.playZombieHit();
        }
      });

      for (const fl of flies) {
        if (fl.caught) continue;
        fl.x += fl.vx;
        fl.y += fl.vy;
        if (fl.x < 18 || fl.x > canvas.width - 18) fl.vx *= -1;
        if (fl.y < 18 || fl.y > canvas.height - 18) fl.vy *= -1;
        if (Math.hypot(px - fl.x, py - fl.y) < 24) {
          fl.caught = true;
          audioEngine.playAncientRune();
          if (sess) multiplayerClient.claimMinigameObjective(sess.sessionId, fl.id);
        }
        ctx.fillStyle = '#bef264';
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, 6.5, 0, Math.PI * 2);
        ctx.fill();
      }

      const caught = flies.filter((f) => f.caught).length;
      setHillsState({ caught, timeLeft });
      if (caught >= 12) {
        done = true;
        audioEngine.playGestureSuccess();
        if (sess) multiplayerClient.completeMinigame(sess.sessionId);
        setTimeout(onSuccess, 350);
        return;
      }

      if (sess) {
        sess.participants.forEach((pt) => {
          if (pt.id === selfId) return;
          drawMiniRPGCharacter(
            ctx,
            pt.x,
            pt.y,
            pt.outfit || DEFAULT_RPG_OUTFIT,
            pt.facing,
            pt.isMoving,
            frame * 0.25,
            pt.name,
            0,
            false,
            pt.color
          );
        });
      }

      drawMiniRPGCharacter(
        ctx,
        px,
        py,
        outfitRef.current,
        facing,
        moving,
        walkPhase,
        playerName,
        invuln,
        dashTimer > 0
      );

      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [minigame, onSuccess, playerName, selfId]);

  // ==================== 12. RPG MOUNTAINS (Vertical Platformer Ice-Ledge Obstacle Ascent) ====================
  const climbCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [beaconsLit, setBeaconsLit] = useState<number>(0);

  useEffect(() => {
    if (minigame !== 'rpg_mountains_climb') return;
    const canvas = climbCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let px = 240;
    let py = 300;
    let vy = 0;
    let facing = 1;
    let walkPhase = 0;
    let grounded = false;
    let frame = 0;
    let done = false;
    const keys: Record<string, boolean> = {};

    const platforms = [
      { x: 0, y: 312, w: 480, vx: 0 },
      { x: 55, y: 256, w: 120, vx: 1.1 },
      { x: 295, y: 235, w: 120, vx: -1.1 },
      { x: 165, y: 178, w: 130, vx: 1.35 },
      { x: 40, y: 118, w: 125, vx: 0.95 },
      { x: 300, y: 108, w: 125, vx: -1.0 },
      { x: 175, y: 58, w: 130, vx: 0 }
    ];
    const beacons = [
      { id: 'b0', x: 115, y: 242, lit: false },
      { id: 'b1', x: 355, y: 221, lit: false },
      { id: 'b2', x: 230, y: 164, lit: false },
      { id: 'b3', x: 95, y: 104, lit: false },
      { id: 'b4', x: 360, y: 94, lit: false },
      { id: 'b5', x: 240, y: 44, lit: false }
    ];
    const icicles: { x: number; y: number; vy: number }[] = [];

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys[k] = true;
      if ((k === 'arrowup' || k === 'w' || k === ' ') && grounded) {
        vy = -8.9;
        grounded = false;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => (keys[e.key.toLowerCase()] = false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let animId = 0;
    const loop = () => {
      if (done) return;
      frame++;

      const sess = coopRef.current;
      if (sess) {
        beacons.forEach((b) => {
          if (sess.completedObjectives.includes(b.id)) b.lit = true;
        });
      }

      // Move platforms
      platforms.forEach((pl) => {
        if (pl.vx === 0) return;
        pl.x += pl.vx;
        if (pl.x < 12 || pl.x + pl.w > canvas.width - 12) pl.vx *= -1;
      });

      let dx = 0;
      if (keys['arrowleft'] || keys['a']) {
        dx -= 3.8;
        facing = -1;
      }
      if (keys['arrowright'] || keys['d']) {
        dx += 3.8;
        facing = 1;
      }
      // Subtle alpine blizzard gust
      if (py < 180) dx += Math.sin(frame * 0.04) * 0.65;

      px = Math.max(16, Math.min(canvas.width - 16, px + dx));
      if (dx !== 0) walkPhase += 0.34;

      const prevFoot = py + 11;
      vy += 0.38;
      py += vy;
      grounded = false;

      platforms.forEach((pl) => {
        if (vy >= 0 && px >= pl.x - 6 && px <= pl.x + pl.w + 6 && prevFoot <= pl.y + 5 && py + 11 >= pl.y) {
          py = pl.y - 11;
          vy = 0;
          grounded = true;
          px = Math.max(16, Math.min(canvas.width - 16, px + pl.vx));
        }
      });

      if (frame % 24 === 1) {
        icicles.push({ x: 24 + Math.random() * (canvas.width - 48), y: -16, vy: 3.1 + Math.random() * 1.5 });
      }

      if (sess) {
        multiplayerClient.sendMinigameMove(sess.sessionId, { x: px, y: py, facing, isMoving: dx !== 0 });
      }

      ctx.fillStyle = '#09182c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ledges
      platforms.forEach((pl) => {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(pl.x, pl.y, pl.w, 8);
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(pl.x, pl.y, pl.w, 2.5);
      });

      // Icicles
      for (let i = icicles.length - 1; i >= 0; i--) {
        const ic = icicles[i];
        ic.y += ic.vy;
        if (Math.hypot(px - ic.x, py - ic.y) < 16) {
          audioEngine.playZombieHit();
          px = 240;
          py = 300;
          vy = 0;
        }
        if (ic.y > canvas.height + 20) {
          icicles.splice(i, 1);
          continue;
        }
        ctx.fillStyle = '#7dd3fc';
        ctx.beginPath();
        ctx.moveTo(ic.x - 7, ic.y - 10);
        ctx.lineTo(ic.x + 7, ic.y - 10);
        ctx.lineTo(ic.x, ic.y + 12);
        ctx.closePath();
        ctx.fill();
      }

      // Beacons
      for (const b of beacons) {
        if (!b.lit && Math.hypot(px - b.x, py - b.y) < 22) {
          b.lit = true;
          audioEngine.playAncientRune();
          if (sess) multiplayerClient.claimMinigameObjective(sess.sessionId, b.id);
        }
        ctx.fillStyle = b.lit ? '#22c55e' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 11, 0, Math.PI * 2);
        ctx.fill();
      }

      const lit = beacons.filter((b) => b.lit).length;
      setBeaconsLit(lit);
      if (lit >= 6) {
        done = true;
        audioEngine.playGestureSuccess();
        if (sess) multiplayerClient.completeMinigame(sess.sessionId);
        setTimeout(onSuccess, 350);
        return;
      }

      if (sess) {
        sess.participants.forEach((pt) => {
          if (pt.id === selfId) return;
          drawMiniRPGCharacter(
            ctx,
            pt.x,
            pt.y,
            pt.outfit || DEFAULT_RPG_OUTFIT,
            pt.facing,
            pt.isMoving,
            frame * 0.25,
            pt.name,
            0,
            false,
            pt.color
          );
        });
      }

      drawMiniRPGCharacter(
        ctx,
        px,
        py,
        outfitRef.current,
        facing,
        dx !== 0,
        walkPhase,
        playerName,
        0,
        !grounded
      );

      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [minigame, onSuccess, playerName, selfId]);

  // ==================== 13. RPG UNDERGROUND MINE (Animated Crystal Cavern Excavation) ====================
  const mineCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mineClickTargetRef = useRef<number | null>(null);
  const [mineStats, setMineStats] = useState<{
    found: number;
    swings: number;
    timeLeft: number;
    banner: string;
  }>({ found: 0, swings: 10, timeLeft: 45, banner: 'Walk [WASD] + [Space/E] or Click Rocks to Mine!' });

  useEffect(() => {
    if (minigame !== 'rpg_underground_mine') return;
    const canvas = mineCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    type CavernNode = {
      id: string;
      col: number;
      row: number;
      x: number;
      y: number;
      kind: 'gem' | 'power' | 'stone';
      revealed: boolean;
      color: string;
      label: string;
      crackSeed: number;
      pulseOffset: number;
      adjGems: number;
    };
    type DebrisParticle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      rot: number;
      vrot: number;
    };
    type FloatingPopup = { x: number; y: number; text: string; color: string; life: number };
    type DripDrop = { x: number; y: number; vy: number; maxY: number; color: string };

    const buildBoard = (): CavernNode[] => {
      const seedItems: { kind: 'gem' | 'power' | 'stone'; color: string; label: string }[] = [
        { kind: 'gem', color: '#34d399', label: 'Emerald' },
        { kind: 'gem', color: '#f43f5e', label: 'Ruby' },
        { kind: 'gem', color: '#38bdf8', label: 'Sapphire' },
        { kind: 'gem', color: '#c084fc', label: 'Amethyst' },
        { kind: 'power', color: '#facc15', label: 'Power Core' },
        { kind: 'power', color: '#fb923c', label: 'Arcane Geode' },
        ...Array.from({ length: 10 }, () => ({ kind: 'stone' as const, color: '#64748b', label: 'Granite' }))
      ];
      const base = [...seedItems].sort(() => Math.random() - 0.5);

      const grid: CavernNode[] = base.map((item, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        return {
          id: `mine_${i}`,
          col,
          row,
          x: 96 + col * 96,
          y: 86 + row * 64,
          kind: item.kind,
          revealed: false,
          color: item.color,
          label: item.label,
          crackSeed: ((i * 37) % 100) / 100,
          pulseOffset: i * 0.7,
          adjGems: 0
        };
      });

      grid.forEach((n) => {
        n.adjGems = grid.filter(
          (o) => o.kind !== 'stone' && Math.abs(o.col - n.col) <= 1 && Math.abs(o.row - n.row) <= 1
        ).length;
      });
      return grid;
    };

    let nodes = buildBoard();
    let px = 240;
    let py = 304;
    let facing = 1;
    let walkPhase = 0;
    let swingsLeft = 10;
    let foundCount = 0;
    let timerFrames = 45 * 60;
    let frame = 0;
    let done = false;
    let pickSwingFrames = 0;
    let pickTargetX = px;
    let pickTargetY = py;
    let shakeMag = 0;
    let resetDelay = 0;
    let bannerText = 'Walk [WASD] + [Space/E] or Click Rocks to Excavate!';

    const particles: DebrisParticle[] = [];
    const popups: FloatingPopup[] = [];
    const sonarRings: { x: number; y: number; r: number; maxR: number; color: string }[] = [];
    const ambientSpores = Array.from({ length: 26 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -0.15 - Math.random() * 0.35,
      r: 1.2 + Math.random() * 2.2,
      color: Math.random() > 0.45 ? '#38bdf8' : '#34d399',
      phase: Math.random() * Math.PI * 2
    }));
    const drips: DripDrop[] = Array.from({ length: 6 }, (_, i) => ({
      x: 42 + i * 78,
      y: 18 + Math.random() * 30,
      vy: 1.8 + Math.random() * 1.4,
      maxY: 280 + Math.random() * 40,
      color: i % 2 === 0 ? '#7dd3fc' : '#6ee7b7'
    }));

    const spawnBurst = (x: number, y: number, color: string, count: number) => {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 1.4 + Math.random() * 3.8;
        particles.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 1.6,
          size: 2.5 + Math.random() * 4.5,
          color,
          alpha: 1,
          rot: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 0.28
        });
      }
    };

    const resetCavern = (reason: string) => {
      nodes = buildBoard();
      swingsLeft = 10;
      foundCount = 0;
      timerFrames = 45 * 60;
      resetDelay = 0;
      shakeMag = 8;
      bannerText = reason;
      setMineStats({ found: 0, swings: 10, timeLeft: 45, banner: reason });
    };

    const strikeNode = (node: CavernNode) => {
      if (node.revealed || swingsLeft <= 0 || done || resetDelay > 0) return;
      facing = node.x >= px ? 1 : -1;
      pickSwingFrames = 16;
      pickTargetX = node.x;
      pickTargetY = node.y;
      shakeMag = 7;
      node.revealed = true;
      const sess = coopRef.current;

      if (node.kind === 'gem' || node.kind === 'power') {
        audioEngine.playAncientRune();
        spawnBurst(node.x, node.y, node.color, 22);
        spawnBurst(node.x, node.y, '#ffffff', 8);
        sonarRings.push({ x: node.x, y: node.y, r: 8, maxR: 78, color: node.color });
        foundCount = nodes.filter((t) => t.revealed && (t.kind === 'gem' || t.kind === 'power')).length;
        bannerText = `Unearthed ${node.label}! (${foundCount}/6)`;
        popups.push({ x: node.x, y: node.y - 16, text: `✦ ${node.label}!`, color: node.color, life: 54 });
        if (sess) multiplayerClient.claimMinigameObjective(sess.sessionId, node.id);

        if (foundCount >= 6) {
          done = true;
          audioEngine.playGestureSuccess();
          if (sess) multiplayerClient.completeMinigame(sess.sessionId);
          setMineStats({
            found: 6,
            swings: swingsLeft,
            timeLeft: Math.ceil(timerFrames / 60),
            banner: 'All 6 Gems & Power Cores Excavated!'
          });
          setTimeout(onSuccess, 480);
          return;
        }
      } else {
        audioEngine.playZombieHit();
        spawnBurst(node.x, node.y, '#94a3b8', 14);
        spawnBurst(node.x, node.y, '#475569', 8);
        swingsLeft = Math.max(0, swingsLeft - 1);
        const nearTxt = node.adjGems > 0 ? `Sonar: ${node.adjGems} gem${node.adjGems > 1 ? 's' : ''} near` : 'Cold Stone';
        bannerText = `Cracked Granite! ${nearTxt} · ${swingsLeft} swings left`;
        popups.push({
          x: node.x,
          y: node.y - 14,
          text: node.adjGems > 0 ? `${node.adjGems} Near` : 'Empty',
          color: node.adjGems > 0 ? '#38bdf8' : '#94a3b8',
          life: 52
        });
        if (node.adjGems > 0) {
          sonarRings.push({ x: node.x, y: node.y, r: 6, maxR: 66, color: '#38bdf8' });
        }
        if (swingsLeft <= 0) {
          bannerText = 'Pickaxe dulled! Fresh cavern collapsing in...';
          resetDelay = 45;
        }
      }
      setMineStats({
        found: foundCount,
        swings: swingsLeft,
        timeLeft: Math.max(1, Math.ceil(timerFrames / 60)),
        banner: bannerText
      });
    };

    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys[k] = true;
      if (k === ' ' || k === 'e') {
        e.preventDefault();
        let best: CavernNode | null = null;
        let bestDist = 66;
        for (const n of nodes) {
          if (n.revealed) continue;
          const d = Math.hypot(px - n.x, py - n.y);
          if (d < bestDist) {
            bestDist = d;
            best = n;
          }
        }
        if (best) {
          strikeNode(best);
        } else {
          pickSwingFrames = 14;
          pickTargetX = px + facing * 24;
          pickTargetY = py - 4;
          audioEngine.playZombieHit();
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let animId = 0;
    const loop = () => {
      if (done) return;
      frame++;
      if (pickSwingFrames > 0) pickSwingFrames--;
      if (shakeMag > 0.2) shakeMag *= 0.84;
      else shakeMag = 0;

      // Sync co-op claimed gem nodes
      const sess = coopRef.current;
      if (sess) {
        nodes.forEach((n) => {
          if (!n.revealed && sess.completedObjectives.includes(n.id)) {
            n.revealed = true;
            if (n.kind !== 'stone') {
              spawnBurst(n.x, n.y, n.color, 12);
            }
          }
        });
        foundCount = nodes.filter((t) => t.revealed && (t.kind === 'gem' || t.kind === 'power')).length;
      }

      // Click-to-excavate node target handling
      if (mineClickTargetRef.current !== null) {
        const idx = mineClickTargetRef.current;
        mineClickTargetRef.current = null;
        const targetNode = nodes[idx];
        if (targetNode && !targetNode.revealed) {
          const d = Math.hypot(targetNode.x - px, targetNode.y - py);
          if (d > 58) {
            px = px + ((targetNode.x - px) / d) * (d - 34);
            py = Math.min(312, targetNode.y + 22);
          }
          strikeNode(targetNode);
        }
      }

      // Movement
      let dx = 0;
      let dy = 0;
      if (keys['arrowleft'] || keys['a']) { dx -= 3.6; facing = -1; }
      if (keys['arrowright'] || keys['d']) { dx += 3.6; facing = 1; }
      if (keys['arrowup'] || keys['w']) dy -= 3.6;
      if (keys['arrowdown'] || keys['s']) dy += 3.6;
      if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
      }
      if (dx !== 0 || dy !== 0) walkPhase += 0.3;
      px = Math.max(24, Math.min(canvas.width - 24, px + dx));
      py = Math.max(46, Math.min(canvas.height - 18, py + dy));

      if (sess && frame % 3 === 0) {
        multiplayerClient.sendMinigameMove(sess.sessionId, { x: px, y: py, facing, isMoving: dx !== 0 || dy !== 0 });
      }

      // Timer countdown & reset logic
      if (resetDelay > 0) {
        resetDelay--;
        if (resetDelay === 0) {
          resetCavern('Fresh crystal seam exposed! Keep digging!');
        }
      } else {
        timerFrames--;
        if (timerFrames % 30 === 0) {
          setMineStats({
            found: foundCount,
            swings: swingsLeft,
            timeLeft: Math.max(0, Math.ceil(timerFrames / 60)),
            banner: bannerText
          });
        }
        if (timerFrames <= 0) {
          audioEngine.playZombieHit();
          resetCavern('Cave-in tremor shifted the cavern! New gems spawned!');
        }
      }

      // Periodic sonar pulse from unmined hidden gems so cavern feels alive!
      if (frame % 75 === 0) {
        const hiddenGems = nodes.filter((n) => !n.revealed && n.kind !== 'stone');
        if (hiddenGems.length > 0) {
          const pick = hiddenGems[Math.floor((frame / 75) % hiddenGems.length)];
          sonarRings.push({ x: pick.x, y: pick.y, r: 6, maxR: 42, color: pick.kind === 'power' ? '#facc15' : '#34d399' });
        }
      }

      // Cave-in falling dust when timer < 14s
      const lowTime = timerFrames < 14 * 60;
      if (lowTime && frame % 6 === 0) {
        particles.push({
          x: 24 + Math.random() * (canvas.width - 48),
          y: 12,
          vx: (Math.random() - 0.5) * 0.6,
          vy: 1.5 + Math.random() * 1.8,
          size: 2.2 + Math.random() * 2.5,
          color: '#64748b',
          alpha: 0.85,
          rot: 0,
          vrot: 0.1
        });
      }

      ctx.save();
      if (shakeMag > 0.3 || (lowTime && frame % 16 === 0)) {
        const sx = (Math.random() - 0.5) * (shakeMag + (lowTime ? 2.5 : 0));
        const sy = (Math.random() - 0.5) * (shakeMag + (lowTime ? 2.5 : 0));
        ctx.translate(sx, sy);
      }

      // 1. Deep Obsidian Cavern Gradient Backdrop
      const bgGrad = ctx.createRadialGradient(px, py - 10, 18, 240, 165, 310);
      bgGrad.addColorStop(0, '#1e293b');
      bgGrad.addColorStop(0.45, '#0f172a');
      bgGrad.addColorStop(1, '#030712');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle stone cavern floor mosaic tiles
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
      ctx.lineWidth = 1;
      for (let gx = 48; gx < canvas.width; gx += 48) {
        ctx.beginPath();
        ctx.moveTo(gx, 32);
        ctx.lineTo(gx, canvas.height);
        ctx.stroke();
      }
      for (let gy = 54; gy < canvas.height; gy += 32) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(canvas.width, gy);
        ctx.stroke();
      }

      // 2. Decorative Glowing Side Crystal Clusters
      const wallCrystals = [
        { x: 18, y: 120, color: '#38bdf8', h: 24 },
        { x: 24, y: 245, color: '#c084fc', h: 20 },
        { x: 462, y: 112, color: '#34d399', h: 24 },
        { x: 456, y: 250, color: '#facc15', h: 20 }
      ];
      wallCrystals.forEach((wc, wi) => {
        const glow = 0.5 + 0.4 * Math.sin(frame * 0.06 + wi);
        ctx.save();
        ctx.globalAlpha = glow * 0.28;
        ctx.fillStyle = wc.color;
        ctx.beginPath();
        ctx.arc(wc.x, wc.y, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.92;
        ctx.beginPath();
        ctx.moveTo(wc.x - 7, wc.y + 8);
        ctx.lineTo(wc.x, wc.y - wc.h);
        ctx.lineTo(wc.x + 8, wc.y + 8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      // 3. Ceiling Stalactites & Water Drips
      ctx.fillStyle = '#1e293b';
      for (let sx = 12; sx < canvas.width; sx += 34) {
        const sh = 14 + ((sx * 19) % 16);
        ctx.beginPath();
        ctx.moveTo(sx - 12, 0);
        ctx.lineTo(sx + 12, 0);
        ctx.lineTo(sx, sh);
        ctx.closePath();
        ctx.fill();
      }
      drips.forEach((d) => {
        d.y += d.vy;
        if (d.y > d.maxY) d.y = 14;
        ctx.fillStyle = d.color;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // 4. Warm Miner Lantern Halo around Hero
      const flicker = 112 + Math.sin(frame * 0.19) * 8;
      const lantern = ctx.createRadialGradient(px, py - 6, 8, px, py - 6, flicker);
      lantern.addColorStop(0, 'rgba(253, 224, 71, 0.24)');
      lantern.addColorStop(0.5, 'rgba(56, 189, 248, 0.09)');
      lantern.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = lantern;
      ctx.beginPath();
      ctx.arc(px, py - 6, flicker, 0, Math.PI * 2);
      ctx.fill();

      // 5. Expanding Sonar Rings
      for (let i = sonarRings.length - 1; i >= 0; i--) {
        const sr = sonarRings[i];
        sr.r += 1.45;
        const alpha = Math.max(0, 1 - sr.r / sr.maxR);
        if (alpha <= 0) {
          sonarRings.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.strokeStyle = sr.color;
        ctx.globalAlpha = alpha * 0.72;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(sr.x, sr.y, sr.r, sr.r * 0.72, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 6. 16 Interactive Cavern Rock / Crystal Nodes
      let highlightedId: string | null = null;
      let nearestD = 66;
      for (const n of nodes) {
        if (!n.revealed) {
          const d = Math.hypot(px - n.x, py - n.y);
          if (d < nearestD) {
            nearestD = d;
            highlightedId = n.id;
          }
        }
      }

      for (const n of nodes) {
        const isFocused = n.id === highlightedId;
        ctx.save();
        ctx.translate(n.x, n.y);

        if (!n.revealed) {
          // Ground shadow
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.beginPath();
          ctx.ellipse(0, 18, 25, 9, 0, 0, Math.PI * 2);
          ctx.fill();

          // Highlight ring if hero is within pickaxe strike range
          if (isFocused) {
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.ellipse(0, 4, 29, 22, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Multi-faceted Rock Dome
          ctx.fillStyle = isFocused ? '#475569' : '#334155';
          ctx.strokeStyle = isFocused ? '#facc15' : '#1e293b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-22, 12);
          ctx.lineTo(-18, -10);
          ctx.lineTo(-4, -19);
          ctx.lineTo(15, -14);
          ctx.lineTo(23, 6);
          ctx.lineTo(12, 16);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Rock Highlight Ridge & Glowing Vein Glimmer
          ctx.fillStyle = '#64748b';
          ctx.beginPath();
          ctx.moveTo(-14, -7);
          ctx.lineTo(-3, -16);
          ctx.lineTo(8, -10);
          ctx.lineTo(-2, -2);
          ctx.closePath();
          ctx.fill();

          if (n.kind !== 'stone') {
            const sparkle = 0.35 + 0.55 * Math.sin(frame * 0.1 + n.pulseOffset);
            ctx.fillStyle = n.color;
            ctx.globalAlpha = sparkle;
            ctx.beginPath();
            ctx.arc(-6, 3, 2.3, 0, Math.PI * 2);
            ctx.arc(8, -3, 1.9, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        } else if (n.kind === 'stone') {
          // Cracked Stone Rubble + Proximity Sonar Badge
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.ellipse(0, 8, 22, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#475569';
          ctx.fillRect(-13, 3, 9, 6);
          ctx.fillRect(4, 5, 10, 5);
          if (n.adjGems > 0) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
            ctx.beginPath();
            ctx.arc(0, -2, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#7dd3fc';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${n.adjGems} Near`, 0, 2);
          }
        } else {
          // Hovering Sparkling Crystal Gem / Arcane Power Core!
          const bob = Math.sin(frame * 0.09 + n.pulseOffset) * 4;
          ctx.fillStyle = n.color;
          ctx.globalAlpha = 0.26;
          ctx.beginPath();
          ctx.arc(0, bob, 23 + Math.sin(frame * 0.12) * 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;

          // Diamond Crystal Facets
          ctx.fillStyle = n.color;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(0, bob - 16);
          ctx.lineTo(13, bob);
          ctx.lineTo(0, bob + 14);
          ctx.lineTo(-13, bob);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = 'rgba(255,255,255,0.45)';
          ctx.beginPath();
          ctx.moveTo(0, bob - 14);
          ctx.lineTo(7, bob - 2);
          ctx.lineTo(0, bob + 2);
          ctx.lineTo(-7, bob - 2);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 9.5px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(n.label, 0, 26);
        }
        ctx.restore();
      }

      // 7. Ambient Glowing Spores
      ambientSpores.forEach((sp) => {
        sp.x += sp.vx + Math.sin(frame * 0.03 + sp.phase) * 0.2;
        sp.y += sp.vy;
        if (sp.y < 14) {
          sp.y = canvas.height - 16;
          sp.x = Math.random() * canvas.width;
        }
        ctx.fillStyle = sp.color;
        ctx.globalAlpha = 0.45 + 0.35 * Math.sin(frame * 0.08 + sp.phase);
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // 8. Co-op Teammates
      if (sess) {
        sess.participants.forEach((pt) => {
          if (pt.id === selfId) return;
          drawMiniRPGCharacter(
            ctx,
            pt.x,
            pt.y,
            pt.outfit || DEFAULT_RPG_OUTFIT,
            pt.facing,
            pt.isMoving,
            frame * 0.25,
            pt.name,
            0,
            false,
            pt.color
          );
        });
      }

      // 9. Local Miner Hero + Animated Pickaxe Arc Slash
      drawMiniRPGCharacter(
        ctx,
        px,
        py,
        outfitRef.current,
        facing,
        dx !== 0 || dy !== 0,
        walkPhase,
        playerName,
        0,
        false
      );

      if (pickSwingFrames > 0) {
        const prog = 1 - pickSwingFrames / 16;
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.globalAlpha = Math.max(0, 1 - prog * 0.8);
        ctx.beginPath();
        ctx.arc(
          (px + pickTargetX) * 0.5,
          (py + pickTargetY) * 0.5,
          24,
          -Math.PI * 0.75 + prog * 1.4,
          -Math.PI * 0.1 + prog * 1.4
        );
        ctx.stroke();

        // Drawn Glowing Pickaxe Head
        const ang = -1.2 + prog * 2.2;
        ctx.translate(px + facing * 10, py - 4);
        ctx.rotate(ang * facing);
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.lineTo(0, -22);
        ctx.stroke();
        ctx.strokeStyle = '#7dd3fc';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, -20, 10, Math.PI * 0.15, Math.PI * 0.85, true);
        ctx.stroke();
        ctx.restore();
      }

      // 10. Shattering Rock Debris & Sparkles
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.16;
        pt.rot += pt.vrot;
        pt.alpha -= 0.025;
        if (pt.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rot);
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.fillRect(-pt.size / 2, -pt.size / 2, pt.size, pt.size);
        ctx.restore();
      }

      // 11. Floating Outcome Popups
      for (let i = popups.length - 1; i >= 0; i--) {
        const po = popups[i];
        po.y -= 0.65;
        po.life--;
        if (po.life <= 0) {
          popups.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.min(1, po.life / 20);
        ctx.fillStyle = po.color;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(po.text, po.x, po.y);
        ctx.restore();
      }

      ctx.restore();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [minigame, onSuccess, playerName, selfId]);

  const handleMineCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = mineCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const cy = ((e.clientY - rect.top) / rect.height) * canvas.height;
    let bestIdx = -1;
    let bestD = 42;
    for (let i = 0; i < 16; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const nx = 96 + col * 96;
      const ny = 86 + row * 64;
      const d = Math.hypot(cx - nx, cy - ny);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }
    if (bestIdx !== -1) {
      mineClickTargetRef.current = bestIdx;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 shadow-2xl max-h-[94vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-slate-800 text-amber-400 shrink-0">
              {isHandMinigame ? (
                <Hand className="w-5 h-5 text-sky-400" />
              ) : minigame.startsWith('blood') ? (
                <Skull className="w-5 h-5 text-red-400" />
              ) : minigame.startsWith('beast') ? (
                <PawPrint className="w-5 h-5 text-emerald-400" />
              ) : (
                <Sparkles className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-cinzel text-base sm:text-lg font-bold text-slate-100 truncate">
                  {chamberTitle}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    isHandMinigame
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {isHandMinigame ? '✋ Hand-Tracked Mode' : '🏃 Hard Obstacle / Trial'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isHandMinigame
                  ? 'Use your real hands in front of your webcam just like in Battle Arena!'
                  : 'Guide your character through harder hazards & obstacles! Press [WASD/Arrows] + [Space/Shift] to Dash/Jump.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {multiplayerEnabled && onInviteFriends && !coopSession && (
              <button
                onClick={onInviteFriends}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Invite Co-op</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Co-op Party Strip if Active */}
        {coopSession && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-emerald-950/50 border border-emerald-500/40 flex items-center justify-between text-xs">
            <span className="text-emerald-300 font-bold flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              Co-op Party ({coopSession.participants.length}):{' '}
              <span className="text-amber-300">
                {coopSession.participants.map((p) => p.name).join(', ')}
              </span>
            </span>
            <span className="text-[11px] text-slate-300">Objectives shared in real time!</span>
          </div>
        )}

        {/* Live Hand-Tracking Webcam Strip for Hand Minigames */}
        {isHandMinigame && (
          <div className="mb-3 p-2.5 rounded-xl bg-slate-950 border border-sky-500/40 flex items-center justify-between gap-3">
            <div className="relative w-28 h-20 rounded-lg bg-slate-900 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
              {cameraActive ? (
                <>
                  <video
                    ref={handPipVideoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1] opacity-85"
                  />
                  <canvas
                    ref={handPipCanvasRef}
                    width={112}
                    height={80}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  />
                </>
              ) : (
                <div className="text-center p-1">
                  <VideoOff className="w-4 h-4 mx-auto text-slate-500 mb-0.5" />
                  <div className="text-[9px] text-amber-300">Fallback Pad</div>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 text-xs">
              <div className="font-bold text-sky-300">
                {cameraActive
                  ? latestGesture?.handFound
                    ? `Detected: ${latestGesture.matchedSpell?.gestureName || latestGesture.gesture}`
                    : 'Show hand clearly in webcam frame...'
                  : 'Camera unavailable — use Gesture Buttons or Mouse below'}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Supported poses: Open Palm ✋, Peace V ✌, Index Point ☝, Fist ✊, or 3-Finger / Fist+Palm 🔱
              </p>
            </div>
          </div>
        )}

        {/* MINIGAME 1: BLOOD PIPES 5x5 */}
        {minigame === 'blood_pipes' && (
          <div className="space-y-3 text-center">
            <p className="text-xs text-slate-300">
              Click stone conduits to route Sanguine Energy across all <strong>5×5</strong> chambers from{' '}
              <strong>IN (Top-Left)</strong> to <strong>OUT (Bottom-Right)</strong>.
            </p>
            <div className="inline-grid grid-cols-5 gap-1.5 p-3.5 bg-slate-950 rounded-xl border border-red-900/40 relative">
              {pipeRotations.map((row, r) =>
                row.map((_, c) => {
                  const dirs = rotateDirs(BLOOD_PIPE_BASE[r][c], pipeRotations[r][c]);
                  const isPowered = poweredCells.has(`${r},${c}`);
                  return (
                    <button
                      key={`${r}-${c}`}
                      onClick={() => handleRotatePipe(r, c)}
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg border relative cursor-pointer transition-colors ${
                        isPowered
                          ? 'bg-red-950/60 border-red-500/70'
                          : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <svg viewBox="0 0 64 64" className="w-full h-full">
                        <circle cx="32" cy="32" r="7" fill={isPowered ? '#ef4444' : '#64748b'} />
                        {dirs[0] && <rect x="27" y="0" width="10" height="32" fill={isPowered ? '#ef4444' : '#64748b'} />}
                        {dirs[1] && <rect x="32" y="27" width="32" height="10" fill={isPowered ? '#ef4444' : '#64748b'} />}
                        {dirs[2] && <rect x="27" y="32" width="10" height="32" fill={isPowered ? '#ef4444' : '#64748b'} />}
                        {dirs[3] && <rect x="0" y="27" width="32" height="10" fill={isPowered ? '#ef4444' : '#64748b'} />}
                      </svg>
                      {r === 0 && c === 0 && (
                        <span className="absolute -left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold bg-red-600 text-white px-1 rounded">
                          IN
                        </span>
                      )}
                      {r === 4 && c === 4 && (
                        <span className="absolute -right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold bg-amber-500 text-slate-950 px-1 rounded">
                          OUT
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* MINIGAME 2: BLOOD MEMORY (4 PHASES) */}
        {minigame === 'blood_memory' && (
          <div className="space-y-4 text-center">
            <div className="text-xs font-semibold text-amber-300">{memStatus}</div>
            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
              {GLYPHS.map((name, idx) => {
                const isActive = memShowingIdx === idx;
                return (
                  <button
                    key={name}
                    disabled={isPlayingBack}
                    onClick={() => handleGlyphClick(idx)}
                    className={`p-4 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isActive ? 'scale-105 shadow-xl' : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                    }`}
                    style={{
                      borderColor: isActive ? '#ffffff' : GLYPH_COLORS[idx] + '60',
                      backgroundColor: isActive ? GLYPH_COLORS[idx] : undefined,
                      color: isActive ? '#020617' : GLYPH_COLORS[idx]
                    }}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-slate-400">
              Progress: Phase {memRound}/4 · Entered {memUserIdx}/{memSequence.length}
            </div>
          </div>
        )}

        {/* MINIGAME 3: BLOOD CRYSTALS CHARACTER MAZE */}
        {minigame === 'blood_crystals' && (
          <div className="space-y-2.5 text-center">
            <div className="flex items-center justify-between text-xs px-2">
              <span className="text-emerald-400 font-semibold">
                Shatter 6 Crimson Crystals ({crystalStatus.destroyed}/6)
              </span>
              <span className="text-amber-300 font-semibold">
                Gate: {crystalStatus.gateOpen ? 'OPEN' : 'LOCKED (Step on Rune!)'}
              </span>
              <span className="text-rose-400 font-semibold inline-flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 fill-current" /> {crystalStatus.hearts}/3
              </span>
            </div>
            <canvas
              ref={bloodCanvasRef}
              width={480}
              height={330}
              className="w-full rounded-xl border border-red-900/50 bg-slate-950"
            />
            <p className="text-[11px] text-slate-400">
              Walk with WASD / Arrows & press <strong>[Space / Shift]</strong> to Dash through sawblades & lasers!
            </p>
          </div>
        )}

        {/* MINIGAME 4: BEAST BIRDS RHYTHM (HAND-TRACKED) */}
        {minigame === 'beast_birds' && (
          <div className="space-y-2.5 text-center">
            <div className="flex items-center justify-between text-xs px-2">
              <span className="text-emerald-400 font-semibold">Chimes: {rhythmStats.hits} / 14</span>
              <span className="text-amber-300 truncate max-w-[230px]">{rhythmStats.feedback}</span>
              <span className="text-rose-400 font-semibold">Misses: {rhythmStats.misses}/5</span>
            </div>
            <canvas
              ref={birdsCanvasRef}
              width={480}
              height={320}
              className="w-full rounded-xl border border-sky-900/50 bg-slate-950"
            />
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  ['✋ Open Palm [1]', 'DUAL_PALMS_FORWARD'],
                  ['✌ Peace V [2]', 'DUAL_PEACE_SPREAD'],
                  ['☝ Point [3]', 'CROSS_INDEX_POINT'],
                  ['✊ Fist [4]', 'DUAL_RAISED_FISTS']
                ] as [string, GestureId][]
              ).map(([lbl, gId], idx) => (
                <button
                  key={gId}
                  onClick={() => {
                    manualLanePulseRef.current = idx;
                    onSimulateGesture?.(gId);
                  }}
                  className="py-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 text-[11px] font-bold rounded-lg border border-slate-700 cursor-pointer"
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MINIGAME 5: BEAST CONSTELLATION (8 STARS, 13 LINES) */}
        {minigame === 'beast_constellation' && (
          <div className="space-y-3 text-center">
            <div className="flex items-center justify-between text-xs px-2">
              <span className="text-emerald-300 font-semibold">
                Trace all 13 Dire Wolf Star-Lines ({tracedEdges.length}/13)
              </span>
              <button
                onClick={() => {
                  setCurrentStar(0);
                  setTracedEdges([]);
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
            <svg viewBox="0 0 510 310" className="w-full bg-slate-950 rounded-xl border border-emerald-900/40">
              {STAR_EDGES.map(([a, b]) => {
                const n1 = STAR_NODES[a];
                const n2 = STAR_NODES[b];
                const active = tracedEdges.includes(edgeKey(a, b));
                return (
                  <line
                    key={`${a}-${b}`}
                    x1={n1.x}
                    y1={n1.y}
                    x2={n2.x}
                    y2={n2.y}
                    stroke={active ? '#10b981' : '#334155'}
                    strokeWidth={active ? 5 : 2.5}
                    strokeDasharray={active ? undefined : '6 4'}
                  />
                );
              })}
              {STAR_NODES.map((node) => {
                const isCur = node.id === currentStar;
                const isNeighbor =
                  !isCur &&
                  STAR_EDGES.some(
                    ([a, b]) => (a === currentStar && b === node.id) || (b === currentStar && a === node.id)
                  ) &&
                  !tracedEdges.includes(edgeKey(currentStar, node.id));
                return (
                  <g key={node.id} onClick={() => handleStarClick(node.id)} className="cursor-pointer">
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isCur ? 15 : 12}
                      fill={isCur ? '#facc15' : isNeighbor ? '#38bdf8' : '#1e293b'}
                      stroke="#f8fafc"
                      strokeWidth="2"
                    />
                    <text x={node.x} y={node.y - 18} textAnchor="middle" fill="#cbd5e1" fontSize="10.5">
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* MINIGAME 6: BEAST TAMING */}
        {minigame === 'beast_taming' && (
          <div className="space-y-2.5 text-center">
            <div className="flex items-center justify-between text-xs px-2">
              <span className="text-emerald-400 font-semibold">Calm 5 Spirit Wolves ({tamedCount}/5)</span>
              <span className="text-rose-400">Avoid Wisps & Crosswinds! [Space] = Dash</span>
            </div>
            <canvas
              ref={tamingCanvasRef}
              width={480}
              height={330}
              className="w-full rounded-xl border border-emerald-900/50 bg-slate-950"
            />
          </div>
        )}

        {/* MINIGAME 7: HOUSE ARCADE (HAND-AIMED BLASTER) */}
        {minigame === 'rpg_house_arcade' && (
          <div className="space-y-2.5 text-center">
            <div className="flex items-center justify-between text-xs px-2">
              <span className="text-cyan-400 font-semibold">Invaders Defeated: {arcadeStats.cleared} / 18</span>
              <span className="text-amber-300">{arcadeStats.posture}</span>
              <span className="text-rose-400 font-semibold">Shield HP: {arcadeStats.hearts}/3</span>
            </div>
            <canvas
              ref={arcadeCanvasRef}
              width={480}
              height={325}
              className="w-full rounded-xl border border-cyan-900/50 bg-slate-950 cursor-crosshair"
            />
          </div>
        )}

        {/* MINIGAME 8: PLAYGROUND METEOR & SPRINGBOARD DASH */}
        {minigame === 'rpg_playground_catch' && (
          <div className="space-y-2.5 text-center">
            <div className="flex items-center justify-between text-xs px-2">
              <span className="text-amber-400 font-semibold">Comet Stars Caught: {starsCaught} / 14</span>
              <span className="text-rose-400">Jump [W/Space] on Springs & Dodge Meteors!</span>
            </div>
            <canvas
              ref={playgroundCanvasRef}
              width={480}
              height={320}
              className="w-full rounded-xl border border-emerald-900/50 bg-slate-950"
            />
          </div>
        )}

        {/* MINIGAME 9: HOSPITAL HAND-BREWING LAB */}
        {minigame === 'rpg_hospital_potion' && (
          <div className="space-y-3 text-center">
            <div className="flex items-center justify-between text-xs px-2">
              <span className="text-sky-400 font-bold">
                Patient {potionRound + 1}/4: {POTION_RECIPES[potionRound]?.patient}
              </span>
              <span className="text-rose-400 font-mono font-bold">Time Left: {hospitalTimeLeft}s</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-sky-900/50 space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {POTION_RECIPES[potionRound]?.need.map((step, idx) => {
                  const doneStep = idx < potionStep;
                  const activeStep = idx === potionStep;
                  return (
                    <div
                      key={`${step.label}-${idx}`}
                      className={`p-2.5 rounded-xl border text-xs transition-all ${
                        doneStep
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                          : activeStep
                          ? 'bg-slate-900 border-amber-400 text-white scale-105 shadow-lg'
                          : 'bg-slate-900/40 border-slate-800 text-slate-500'
                      }`}
                    >
                      <div className="font-bold">{step.label}</div>
                      <div className="text-[11px] mt-1 font-semibold" style={{ color: step.color }}>
                        {step.short}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-75"
                  style={{ width: `${brewHoldProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-300">
                Hold <strong className="text-amber-300">{POTION_RECIPES[potionRound]?.need[potionStep]?.short}</strong>{' '}
                steadily in your camera to brew!
              </p>
              {!cameraActive && (
                <button
                  onClick={advancePotionStep}
                  className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  Channel Step Manually (Camera Off)
                </button>
              )}
            </div>
          </div>
        )}

        {/* MINIGAME 10: SUPERSTORE TROLLEY OBSTACLE DASH */}
        {minigame === 'rpg_superstore_rush' && (
          <div className="space-y-2.5 text-center">
            <div className="flex items-center justify-between text-xs px-2">
              <span className="text-purple-300 font-semibold">Items Picked: {storeProgress.items} / 8</span>
              <span className="text-amber-300">{storeProgress.invulnText}</span>
              <span className="text-rose-400 font-mono font-bold">{storeProgress.timeLeft}s</span>
            </div>
            <canvas
              ref={storeCanvasRef}
              width={480}
              height={320}
              className="w-full rounded-xl border border-purple-900/50 bg-slate-950"
            />
          </div>
        )}

        {/* MINIGAME 11: HILLS BRIAR MAZE FIREFLIES */}
        {minigame === 'rpg_hills_fireflies' && (
          <div className="space-y-2.5 text-center">
            <div className="flex items-center justify-between text-xs px-2">
              <span className="text-lime-300 font-semibold">Twilight Fireflies: {hillsState.caught} / 12</span>
              <span className="text-rose-400 font-mono font-bold">Time: {hillsState.timeLeft}s</span>
            </div>
            <canvas
              ref={hillsCanvasRef}
              width={480}
              height={320}
              className="w-full rounded-xl border border-lime-900/50 bg-slate-950"
            />
            <p className="text-[11px] text-slate-400">
              Navigate Hedges & Rolling Boulders with WASD/Arrows + <strong>[Space]</strong> Dash!
            </p>
          </div>
        )}

        {/* MINIGAME 12: MOUNTAINS VERTICAL PLATFORMER ASCENT */}
        {minigame === 'rpg_mountains_climb' && (
          <div className="space-y-2.5 text-center">
            <div className="flex items-center justify-between text-xs px-2">
              <span className="text-amber-300 font-semibold">Alpine Beacons Lit: {beaconsLit} / 6</span>
              <span className="text-sky-300">Run [A/D] + Jump [W/Space] onto moving ledges!</span>
            </div>
            <canvas
              ref={climbCanvasRef}
              width={480}
              height={330}
              className="w-full rounded-xl border border-sky-900/50 bg-slate-950"
            />
          </div>
        )}

        {/* MINIGAME 13: ANIMATED UNDERGROUND CRYSTAL CAVERN EXCAVATION */}
        {minigame === 'rpg_underground_mine' && (
          <div className="space-y-2.5 text-center">
            <div className="flex items-center justify-between text-xs px-2">
              <span className="text-emerald-300 font-semibold">Gems & Cores: {mineStats.found} / 6</span>
              <span className="text-amber-300 font-semibold">Swings Left: {mineStats.swings}</span>
              <span
                className={`font-mono font-bold ${
                  mineStats.timeLeft <= 12 ? 'text-rose-400 animate-pulse' : 'text-sky-300'
                }`}
              >
                Cave-In: {mineStats.timeLeft}s
              </span>
            </div>
            <canvas
              ref={mineCanvasRef}
              width={480}
              height={330}
              onClick={handleMineCanvasClick}
              className="w-full rounded-xl border border-cyan-900/60 bg-slate-950 cursor-crosshair shadow-inner"
            />
            <p className="text-[11px] text-cyan-200/90 font-medium">{mineStats.banner}</p>
          </div>
        )}
      </div>
    </div>
  );
};
