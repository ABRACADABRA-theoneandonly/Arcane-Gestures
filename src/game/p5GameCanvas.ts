import p5 from 'p5';
import {
  ZombieEnemy,
  ZombieType,
  Projectile,
  VisualParticle,
  DetectedGesture,
  PlayerStats,
  SpellDefinition,
  GoalDefinition,
  HandPoint,
  SpectralBeast
} from '../types/game';
import {
  WORLD_REALMS,
  SPELL_CATALOG,
  GOALS_CATALOG,
  ARMOR_CATALOG,
  HAND_SKINS_CATALOG
} from '../data/spellsAndRealms';
import { APP_THEMES, AppThemeConfig } from '../data/i18nAndThemes';
import { audioEngine } from '../services/audioEngine';

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
  size?: number;
}

interface GroundDecal {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
}

interface LightningBranch {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
}

interface BloodTendril {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  alpha: number;
  phase: number;
}

interface ShockwaveRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  weight?: number;
}

interface CelestialBeamEffect {
  x: number;
  groundY: number;
  alpha: number;
  width: number;
}

interface SlashFlashEffect {
  x: number;
  y: number;
  angle: number;
  color: string;
  alpha: number;
  size: number;
}

interface FrostCrystalEffect {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  rotSpeed: number;
  alpha: number;
}

interface DyingZombieEffect {
  x: number;
  y: number;
  scale: number;
  bodyColor: string;
  alpha: number;
  vy: number;
}

export class P5GameEngine {
  private p: p5 | null = null;
  private container: HTMLElement;
  private currentRealmIndex: number = 0;
  private zombies: ZombieEnemy[] = [];
  private projectiles: Projectile[] = [];
  private particles: VisualParticle[] = [];
  private floatingTexts: FloatingText[] = [];
  private groundDecals: GroundDecal[] = [];
  private lightningBranches: LightningBranch[] = [];
  private bloodTendrils: BloodTendril[] = [];
  private shockwaves: ShockwaveRing[] = [];
  private celestialBeams: CelestialBeamEffect[] = [];
  private slashFlashes: SlashFlashEffect[] = [];
  private frostCrystals: FrostCrystalEffect[] = [];
  private dyingZombies: DyingZombieEffect[] = [];
  private spectralBeasts: SpectralBeast[] = [];
  private ambientParticles: { x: number; y: number; size: number; speed: number; alpha: number; wobble: number }[] = [];
  private leftHandTrail: { x: number; y: number }[] = [];
  private rightHandTrail: { x: number; y: number }[] = [];
  private lastBeastCastTime: number = 0;
  private damageFlashAlpha: number = 0;
  private skyFlashAlpha: number = 0;
  private skyFlashColor: string = '#ffffff';
  private nextGroanTime: number = 0;

  // Warp portal state
  private isWarping: boolean = false;
  private warpProgress: number = 0;
  private portalActive: boolean = false;
  private portalScale: number = 0;

  // Screen shake
  private screenShake: number = 0;

  // Tracking & inputs
  private latestGesture: DetectedGesture | null = null;
  private playerStats: PlayerStats;
  private onStatsUpdate: (stats: PlayerStats) => void;
  private onGameOver: () => void;
  private onRealmWarpComplete: (newRealmIndex: number) => void;
  private onGoalUnlockedWithoutStopping: (goal: GoalDefinition, unlockedSpell: SpellDefinition) => void;
  private onWaveCompletedWithNewPower: (goal: GoalDefinition, unlockedSpell: SpellDefinition) => void;
  private onPortalStateChange?: (active: boolean) => void;

  private isRunning: boolean = true;
  private lastSpellFireTime: number = 0;
  private nextZombieSpawnTime: number = 0;
  private zombiesSpawnedThisWave: number = 0;
  private zombiesRequiredForWave: number = 10;
  private activeTitanShield: boolean = false;
  private completedGoalIds: Set<string> = new Set();
  private pendingTutorialAfterWave: { goal: GoalDefinition; spell: SpellDefinition } | null = null;
  private lastBloodBenderCastTime: number = 0;
  private appTheme: AppThemeConfig = APP_THEMES[0];

  constructor(
    container: HTMLElement,
    initialStats: PlayerStats,
    onStatsUpdate: (stats: PlayerStats) => void,
    onGameOver: () => void,
    onRealmWarpComplete: (newRealmIndex: number) => void,
    onGoalUnlockedWithoutStopping: (goal: GoalDefinition, unlockedSpell: SpellDefinition) => void,
    onWaveCompletedWithNewPower: (goal: GoalDefinition, unlockedSpell: SpellDefinition) => void,
    onPortalStateChange?: (active: boolean) => void,
    initialTheme?: AppThemeConfig
  ) {
    this.container = container;
    this.playerStats = { ...initialStats };
    this.onStatsUpdate = onStatsUpdate;
    this.onGameOver = onGameOver;
    this.onRealmWarpComplete = onRealmWarpComplete;
    this.onGoalUnlockedWithoutStopping = onGoalUnlockedWithoutStopping;
    this.onWaveCompletedWithNewPower = onWaveCompletedWithNewPower;
    this.onPortalStateChange = onPortalStateChange;
    if (initialTheme) {
      this.appTheme = initialTheme;
    }

    this.currentRealmIndex = (this.playerStats.wave - 1) % WORLD_REALMS.length;

    if (this.playerStats.unlockedSpellIds) {
      for (const spellId of this.playerStats.unlockedSpellIds) {
        const goal = GOALS_CATALOG.find((g) => g.unlockedSpellId === spellId);
        if (goal) this.completedGoalIds.add(goal.id);
      }
    }

    this.initP5();
  }

  public setAppTheme(theme: AppThemeConfig) {
    this.appTheme = theme;
  }

  public updateGesture(gesture: DetectedGesture) {
    this.latestGesture = gesture;
  }

  public updateStats(stats: Partial<PlayerStats>) {
    this.playerStats = { ...this.playerStats, ...stats };
    this.currentRealmIndex = (this.playerStats.wave - 1) % WORLD_REALMS.length;
  }

  public triggerManualCast(spell: SpellDefinition) {
    if (!this.p || !this.isRunning) return;
    const aimX = this.latestGesture?.handFound ? this.latestGesture.aimPoint.x : this.p.width / 2;
    const aimY = this.latestGesture?.handFound ? this.latestGesture.aimPoint.y : this.p.height * 0.45;
    this.castSpell(spell, aimX, aimY, false);
  }

  public triggerPortalWarp(): boolean {
    if (!this.portalActive || this.isWarping) return false;
    if ((this.playerStats.portalKeys || 0) <= 0) {
      audioEngine.playGestureBlocked();
      if (this.p) {
        this.floatingTexts.push({
          x: this.p.width / 2,
          y: this.p.height * 0.32,
          text: 'LOCKED! Need 1 Portal Key (Buy in Superstore/Armory or Find in RPG)',
          color: '#f43f5e',
          alpha: 255,
          vy: -0.6,
          size: 16
        });
      }
      return false;
    }

    this.playerStats.portalKeys = Math.max(0, (this.playerStats.portalKeys || 0) - 1);
    this.onStatsUpdate({ ...this.playerStats });
    this.isWarping = true;
    this.warpProgress = 0;
    audioEngine.playRealmWarp();
    return true;
  }

  private initP5() {
    const sketch = (p: p5) => {
      this.p = p;

      p.setup = () => {
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;
        p.createCanvas(width, height);
        p.frameRate(60);

        for (let i = 0; i < 100; i++) {
          this.ambientParticles.push({
            x: p.random(width),
            y: p.random(height),
            size: p.random(1.5, 4.8),
            speed: p.random(0.4, 2.2),
            alpha: p.random(70, 220),
            wobble: p.random(p.TWO_PI)
          });
        }
      };

      p.windowResized = () => {
        if (!this.container) return;
        p.resizeCanvas(this.container.clientWidth, this.container.clientHeight);
      };

      p.draw = () => {
        if (!this.isRunning) return;

        if (this.screenShake > 0) {
          p.push();
          p.translate(p.random(-1, 1) * this.screenShake, p.random(-1, 1) * this.screenShake);
          this.screenShake *= 0.88;
          if (this.screenShake < 0.3) this.screenShake = 0;
        }

        this.drawRealmEnvironment(p);
        this.updateAndDrawGroundDecals(p);
        this.drawCasterFloorSigil(p);
        this.processContinuousSpells(p);
        this.manageWaveSpawning(p);
        this.updateAndDrawDyingZombies(p);
        this.updateAndDrawZombies(p);
        this.updateAndDrawProjectiles(p);
        this.drawCelestialBeams(p);
        this.drawLightningBranches(p);
        this.drawBloodTendrils(p);
        this.updateAndDrawFrostCrystals(p);
        this.updateAndDrawSlashFlashes(p);
        this.updateAndDrawShockwaves(p);
        this.updateAndDrawSpectralBeasts(p);
        this.updateAndDrawParticles(p);
        this.updateAndDrawFloatingTexts(p);

        if (this.portalActive) {
          this.drawWarpPortal(p);
        }

        if (this.isWarping) {
          this.drawWarpEffect(p);
        }

        if (this.skyFlashAlpha > 0) {
          p.noStroke();
          const c = p.color(this.skyFlashColor);
          p.fill(p.red(c), p.green(c), p.blue(c), this.skyFlashAlpha);
          p.rect(0, 0, p.width, p.height);
          this.skyFlashAlpha = Math.max(0, this.skyFlashAlpha - 14);
        }

        if (this.damageFlashAlpha > 0) {
          p.noStroke();
          p.fill(220, 38, 38, this.damageFlashAlpha);
          p.rect(0, 0, p.width, p.height);
          this.damageFlashAlpha = Math.max(0, this.damageFlashAlpha - 10);
        }

        // Low-HP warning vignette pulse
        if (this.playerStats.hp > 0 && this.playerStats.hp <= this.playerStats.maxHp * 0.28) {
          const pulse = 32 + Math.sin(p.frameCount * 0.16) * 20;
          p.noFill();
          p.stroke(220, 38, 38, pulse);
          p.strokeWeight(28);
          p.rect(0, 0, p.width, p.height);
          p.noStroke();
        }

        if (this.screenShake > 0) {
          p.pop();
        }

        // Crisp high-visibility hand skin + motion trails on top layer
        this.drawDualHandSkeletalOverlay(p);

        const manaRegenBoost = 1 + (this.playerStats.upgrades?.manaRegenLevel || 0) * 0.2;
        this.playerStats.mana = Math.min(
          this.playerStats.maxMana,
          this.playerStats.mana + 0.52 * manaRegenBoost
        );

        this.checkMilestoneGoals();

        if (p.frameCount % 10 === 0) {
          this.onStatsUpdate({ ...this.playerStats });
        }
      };
    };

    new p5(sketch, this.container);
  }

  private drawRealmEnvironment(p: p5) {
    const realm = WORLD_REALMS[this.currentRealmIndex] || WORLD_REALMS[0];
    const w = p.width;
    const h = p.height;
    const horizonY = h * 0.54;

    p.noStroke();
    for (let y = 0; y <= horizonY; y += 6) {
      const inter = p.map(y, 0, horizonY, 0, 1);
      const c = p.lerpColor(p.color(realm.skyColorTop), p.color(realm.skyColorBottom), inter);
      p.fill(c);
      p.rect(0, y, w, 7);
    }

    // Theme-specific atmospheric backdrops
    if (realm.theme === 'glacial') {
      p.noFill();
      p.strokeWeight(14);
      for (let a = 0; a < 3; a++) {
        p.stroke(56, 189, 248, 22 + Math.sin(p.frameCount * 0.03 + a) * 10);
        p.beginShape();
        for (let x = 0; x <= w; x += 36) {
          const yOff = Math.sin(x * 0.006 + p.frameCount * 0.02 + a) * 35;
          p.vertex(x, h * 0.16 + yOff + a * 22);
        }
        p.endShape();
      }
    } else if (realm.theme === 'haunted_forest') {
      p.noStroke();
      p.fill(16, 185, 129, 16);
      p.rect(0, horizonY - 48, w, 55);
      // Twisted dead tree silhouettes
      p.fill('#021c15');
      for (let tx = 60; tx < w; tx += 150) {
        p.rect(tx, horizonY - 95, 14, 95);
        p.triangle(tx - 24, horizonY - 60, tx + 7, horizonY - 115, tx + 38, horizonY - 60);
      }
    } else if (realm.theme === 'mountains') {
      // Cascading glacial waterfalls down mossy mountain cliffs
      p.fill(103, 232, 249, 45);
      const wfOffset = (p.frameCount * 2) % 30;
      p.rect(w * 0.22, horizonY - 88, 18, 92);
      p.rect(w * 0.72, horizonY - 75, 14, 79);
      p.fill(224, 242, 254, 90);
      for (let wy = 0; wy < 70; wy += 18) {
        p.rect(w * 0.22 + 4, horizonY - 82 + ((wy + wfOffset) % 80), 10, 6);
      }
    } else if (realm.theme === 'superstore_ruins') {
      // Shattered steel rafters & flickering purple neon signs
      p.stroke('#3b0764');
      p.strokeWeight(4);
      for (let rx = 80; rx < w; rx += 180) {
        p.line(rx, 0, rx + 35, horizonY - 40);
      }
      if (Math.sin(p.frameCount * 0.18) > -0.3) {
        p.noStroke();
        p.fill(192, 132, 252, 40);
        p.rect(w * 0.35, horizonY - 78, w * 0.3, 18, 4);
      }
    } else if (realm.theme === 'sky_citadel') {
      // Drifting golden cloudbanks & floating temple islands
      p.noStroke();
      for (let i = 0; i < 6; i++) {
        const cx = ((i * 230 + p.frameCount * 0.35) % (w + 180)) - 90;
        const cy = h * 0.22 + (i % 3) * 42;
        p.fill(255, 255, 255, 28);
        p.ellipse(cx, cy, 130, 38);
        p.fill('#1e293b');
        p.triangle(cx - 32, cy - 10, cx + 32, cy - 10, cx, cy + 28);
      }
    } else if (realm.theme === 'volcanic') {
      // Glowing magma fissures on horizon
      p.noStroke();
      p.fill(249, 115, 22, 24);
      p.rect(0, horizonY - 22, w, 26);
    }

    // Moon / Solar Eclipse
    const moonX = w * 0.78;
    const moonY = h * 0.19;
    const moonRadius = 52;

    p.noStroke();
    p.fill(realm.coronaColor);
    p.circle(moonX, moonY, moonRadius * 2.8);
    p.circle(moonX, moonY, moonRadius * 1.8);
    p.fill(realm.moonColor);
    p.circle(moonX, moonY, moonRadius);

    if (realm.theme === 'desert_phantoms') {
      p.fill(16, 8, 2, 235);
      p.circle(moonX - 5, moonY - 3, moonRadius * 0.94);
    }

    // Distant Parallax Mountain Ridge
    p.fill(p.lerpColor(p.color(realm.skyColorBottom), p.color(realm.groundColor), 0.72));
    p.beginShape();
    p.vertex(0, horizonY);
    for (let x = 0; x <= w; x += 32) {
      const hillHeight = Math.sin(x * 0.007 + this.currentRealmIndex) * 48 + Math.cos(x * 0.015) * 24;
      p.vertex(x, horizonY - 22 - Math.abs(hillHeight));
    }
    p.vertex(w, horizonY);
    p.endShape(p.CLOSE);

    // Perspective Ground Plane
    for (let y = horizonY; y <= h; y += 8) {
      const inter = p.map(y, horizonY, h, 0, 1);
      const groundC = p.lerpColor(p.color(realm.groundColor), p.color('#020205'), inter);
      p.fill(groundC);
      p.rect(0, y, w, 9);
    }

    const themeTint = this.appTheme?.arenaTintHex || realm.accentColor;

    // Perspective Lines & Glowing Depth Flagstones (blended with chosen Arena Theme)
    p.stroke(themeTint + '34');
    p.strokeWeight(1.5);
    const vanishX = w / 2;
    for (let x = -w * 0.25; x <= w * 1.25; x += w * 0.12) {
      p.line(vanishX, horizonY, x, h);
    }
    for (let i = 1; i <= 5; i++) {
      const yLine = horizonY + Math.pow(i / 5, 1.7) * (h - horizonY);
      p.stroke(themeTint + '26');
      p.line(0, yLine, w, yLine);
    }

    // Horizon Theme Atmosphere Ribbon
    p.noStroke();
    p.fill(themeTint + '18');
    p.rect(0, horizonY - 18, w, 36);

    // Flank Battlefield Rune Monoliths & Torches
    const torchFlicker = Math.sin(p.frameCount * 0.22) * 5;
    for (const side of [-1, 1]) {
      const mx = w / 2 + side * (w * 0.36);
      const my = horizonY + 12;
      p.fill('#18181b');
      p.rect(mx - 12, my - 64, 24, 68, 4);
      p.fill(themeTint + '4e');
      p.ellipse(mx, my - 72, 38 + torchFlicker, 38 + torchFlicker);
      p.fill(this.appTheme?.secondaryHex || realm.accentColor);
      p.circle(mx, my - 72, 12 + torchFlicker * 0.3);
    }

    // Rolling Foreground Mist Layer
    p.fill(themeTint + '16');
    for (let f = 0; f < 4; f++) {
      const fx = ((f * 310 + p.frameCount * 0.6) % (w + 260)) - 130;
      p.ellipse(fx, h - 22, 340, 62);
    }

    // Subtle Arena Border Frame Glow matching selected Theme
    p.noFill();
    p.stroke(themeTint + '45');
    p.strokeWeight(4);
    p.rect(2, 2, w - 4, h - 4);
    p.noStroke();

    // Ambient Environmental Particles
    for (const pt of this.ambientParticles) {
      pt.y += realm.theme === 'volcanic' ? -pt.speed * 0.8 : pt.speed;
      pt.wobble += 0.04;
      pt.x += Math.sin(pt.wobble) * 0.85;

      if (pt.y > h) {
        pt.y = 0;
        pt.x = p.random(w);
      } else if (pt.y < 0) {
        pt.y = h;
        pt.x = p.random(w);
      }

      p.noStroke();
      p.fill(themeTint + Math.floor(pt.alpha).toString(16).padStart(2, '0'));
      p.circle(pt.x, pt.y, pt.size);
    }
  }

  private drawCasterFloorSigil(p: p5) {
    const cx = p.width * 0.5;
    const cy = p.height * 0.89;
    const spellColor =
      this.playerStats.upgrades?.handGlowOverride ||
      this.latestGesture?.matchedSpell?.color ||
      this.appTheme?.arenaTintHex ||
      '#38bdf8';

    p.push();
    p.translate(cx, cy);
    p.scale(1, 0.34);
    p.rotate(p.frameCount * 0.018);

    p.noFill();
    p.stroke(spellColor + '66');
    p.strokeWeight(3.5);
    p.circle(0, 0, 220);

    p.stroke(spellColor + '44');
    p.strokeWeight(2);
    p.circle(0, 0, 165);

    for (let i = 0; i < 6; i++) {
      const a = (p.TWO_PI / 6) * i;
      p.line(Math.cos(a) * 82, Math.sin(a) * 82, Math.cos(a + p.PI * 0.66) * 82, Math.sin(a + p.PI * 0.66) * 82);
    }
    p.pop();
  }

  private updateAndDrawGroundDecals(p: p5) {
    p.noStroke();
    for (let i = this.groundDecals.length - 1; i >= 0; i--) {
      const decal = this.groundDecals[i];
      decal.alpha -= 0.7;
      if (decal.alpha <= 0) {
        this.groundDecals.splice(i, 1);
        continue;
      }
      p.fill(decal.color);
      p.ellipse(decal.x, decal.y, decal.radius * 2, decal.radius * 0.75);
    }
  }

  private processContinuousSpells(p: p5) {
    if (!this.latestGesture || !this.latestGesture.handFound) {
      this.activeTitanShield = false;
      return;
    }

    const gesture = this.latestGesture;
    const now = Date.now();

    if (gesture.gesture === 'DUAL_RAISED_FISTS') {
      this.activeTitanShield = true;
      audioEngine.playShield();
      this.emitShieldParticles(gesture.aimPoint.x, gesture.aimPoint.y);
      return;
    } else {
      this.activeTitanShield = false;
    }

    if (!gesture.matchedSpell || !gesture.isUnlocked) {
      return;
    }

    const spell = gesture.matchedSpell;
    // Enforce strictly 2 hands if spell marks requiresTwoHands
    if (spell.requiresTwoHands && gesture.handsCount < 2) {
      return;
    }

    const hasteBoost = 1 + (this.playerStats.upgrades?.castHasteLevel || 0) * 0.1;
    const adjustedCooldown = Math.max(50, Math.round(spell.cooldownMs / hasteBoost));

    if (now - this.lastSpellFireTime >= adjustedCooldown) {
      this.lastSpellFireTime = now;
      this.castSpell(spell, gesture.aimPoint.x, gesture.aimPoint.y, Boolean(gesture.isDualBoosted));
    }
  }

  private castSpell(spell: SpellDefinition, targetX: number, targetY: number, isDualBoosted: boolean) {
    if (!this.p) return;
    if (this.playerStats.mana < spell.manaCost) return;

    this.playerStats.mana -= spell.manaCost;
    this.playerStats.spellsCast++;

    const spellPowerBonus = 1 + (this.playerStats.upgrades?.spellPowerLevel || 0) * 0.1;
    const dualMultiplier = isDualBoosted ? 1.45 : 1.0;
    const effectiveDamage = Math.round(spell.damage * spellPowerBonus * dualMultiplier);

    const w = this.p.width;
    const h = this.p.height;
    const leftX = this.latestGesture?.leftHandState
      ? (1 - this.latestGesture.leftHandState.palmCenter.x) * w
      : targetX - 40;
    const rightX = this.latestGesture?.rightHandState
      ? (1 - this.latestGesture.rightHandState.palmCenter.x) * w
      : targetX + 40;
    const singleX = this.latestGesture?.rightHandState
      ? rightX
      : this.latestGesture?.leftHandState
      ? leftX
      : targetX;
    const handY = h - 42;

    if (spell.id === 'fireball') {
      audioEngine.playFireball();
      const origins = isDualBoosted ? [leftX, rightX] : [singleX];
      origins.forEach((startX, idx) => {
        this.projectiles.push({
          id: `fb_${Date.now()}_${idx}`,
          spellId: 'fireball',
          startX,
          startY: handY,
          currentX: startX,
          currentY: handY,
          currentZ: 0.0,
          targetX: targetX + (origins.length > 1 ? (idx === 0 ? -14 : 14) : 0),
          targetY,
          speed: 0.048,
          damage: origins.length > 1 ? effectiveDamage * 0.55 : effectiveDamage,
          color: '#f97316',
          size: isDualBoosted ? 27 : 23,
          trail: []
        });
      });
    } else if (spell.id === 'water_blast') {
      audioEngine.playWaterBlast();
      const count = isDualBoosted ? 2 : 1;
      for (let i = 0; i < count; i++) {
        this.projectiles.push({
          id: `wb_${Date.now()}_${i}`,
          spellId: 'water_blast',
          startX: singleX + (Math.random() - 0.5) * 18,
          startY: handY,
          currentX: singleX,
          currentY: handY,
          currentZ: 0.0,
          targetX: targetX + (Math.random() - 0.5) * 22,
          targetY: targetY + (Math.random() - 0.5) * 16,
          speed: 0.062 + i * 0.008,
          damage: count > 1 ? effectiveDamage * 0.55 : effectiveDamage,
          color: '#38bdf8',
          size: isDualBoosted ? 22 : 18,
          trail: []
        });
      }
    } else if (spell.id === 'lightning') {
      audioEngine.playLightning();
      this.skyFlashColor = '#c084fc';
      this.skyFlashAlpha = 68;
      this.screenShake = Math.max(this.screenShake, 5);
      if (isDualBoosted) {
        this.createLightningArc(leftX, handY, targetX, targetY);
        this.createLightningArc(rightX, handY, targetX, targetY);
      } else {
        this.createLightningArc(singleX, handY, targetX, targetY);
      }
      this.shockwaves.push({
        x: targetX,
        y: targetY,
        radius: 10,
        maxRadius: 110,
        color: '#c084fc',
        alpha: 240,
        weight: 4
      });
      this.checkInstantDamageAt(targetX, targetY, effectiveDamage);
    } else if (spell.id === 'frost_nova') {
      audioEngine.playFrostNova();
      this.skyFlashColor = '#38bdf8';
      this.skyFlashAlpha = 55;
      this.triggerFrostNova(effectiveDamage);
    } else if (spell.id === 'celestial_beam') {
      audioEngine.playCelestialBeam();
      this.skyFlashColor = '#f472b6';
      this.skyFlashAlpha = 75;
      this.createCelestialBeamVFX(targetX);
      this.checkBeamDamageAt(targetX, effectiveDamage);
    } else if (spell.id === 'meteor_cataclysm') {
      audioEngine.playMeteorCrash();
      this.spawnMeteor(targetX, targetY, effectiveDamage);
      if (isDualBoosted) {
        this.spawnMeteor(targetX + 90, targetY - 25, Math.round(effectiveDamage * 0.6));
      }
    } else if (spell.id === 'blood_bender') {
      this.triggerBloodBender(targetX, targetY);
    } else if (spell.id === 'animal_puppetry') {
      this.triggerAnimalPuppetry(effectiveDamage);
    }
  }

  private triggerBloodBender(targetX: number, targetY: number) {
    if (!this.p) return;
    const now = Date.now();
    if (now - this.lastBloodBenderCastTime < 750) return;
    this.lastBloodBenderCastTime = now;

    audioEngine.playBloodBender();
    this.screenShake = 8;

    let targetZombie: ZombieEnemy | null = null;
    let closestDist = Infinity;

    for (const z of this.zombies) {
      if (z.isBloodControlled) continue;
      const zX = z.x * this.p.width;
      const zY = this.p.lerp(this.p.height * 0.54, this.p.height * 0.88, 1 - z.z);
      const d = Math.hypot(zX - targetX, zY - targetY);
      if (d < closestDist) {
        closestDist = d;
        targetZombie = z;
      }
    }

    if (targetZombie) {
      const hemomancyBoost = 1 + (this.playerStats.upgrades?.hemomancyLevel || 0) * 0.25;
      targetZombie.isBloodControlled = true;
      targetZombie.bloodControlTimer = Math.round(380 * hemomancyBoost);

      const zScreenX = targetZombie.x * this.p.width;
      const zScreenY = this.p.lerp(this.p.height * 0.54, this.p.height * 0.88, 1 - targetZombie.z);

      this.bloodTendrils.push({
        sourceX: this.p.width * 0.35,
        sourceY: this.p.height,
        targetX: zScreenX,
        targetY: zScreenY,
        alpha: 255,
        phase: 0
      });
      this.bloodTendrils.push({
        sourceX: this.p.width * 0.65,
        sourceY: this.p.height,
        targetX: zScreenX,
        targetY: zScreenY,
        alpha: 255,
        phase: Math.PI
      });

      this.floatingTexts.push({
        x: zScreenX,
        y: zScreenY - 55,
        text: '✦ BLOOD CONTROLLED!',
        color: '#ef4444',
        alpha: 255,
        vy: -1.2,
        size: 19
      });

      this.createExplosionParticles(zScreenX, zScreenY, '#991b1b', 28);
    }
  }

  private triggerAnimalPuppetry(damage: number) {
    if (!this.p) return;
    const now = Date.now();
    if (now - this.lastBeastCastTime < 750) return;
    this.lastBeastCastTime = now;

    audioEngine.playBeastRoar();
    this.screenShake = 7;

    const beastMasteryBoost = 1 + (this.playerStats.upgrades?.beastMasteryLevel || 0) * 0.3;

    for (let b = 0; b < 2; b++) {
      this.spectralBeasts.push({
        id: `beast_${Date.now()}_${b}`,
        x: b === 0 ? 0.3 : 0.7,
        y: 0.85,
        z: 0.1,
        targetZombieId: null,
        speed: 0.017 * beastMasteryBoost,
        damage: damage * 0.95 * beastMasteryBoost,
        lifetime: Math.round(250 * beastMasteryBoost),
        animPhase: Math.random() * Math.PI
      });
    }

    this.floatingTexts.push({
      x: this.p.width / 2,
      y: this.p.height * 0.42,
      text: '✦ SPECTRAL DIRE WOLVES UNLEASHED!',
      color: '#10b981',
      alpha: 255,
      vy: -1.2,
      size: 21
    });
  }

  private updateAndDrawSpectralBeasts(p: p5) {
    const horizonY = p.height * 0.54;
    for (let i = this.spectralBeasts.length - 1; i >= 0; i--) {
      const beast = this.spectralBeasts[i];
      beast.lifetime--;
      beast.animPhase += 0.28;

      if (beast.lifetime <= 0) {
        this.createExplosionParticles(
          beast.x * p.width,
          p.lerp(horizonY, p.height * 0.88, 1 - beast.z),
          '#10b981',
          16
        );
        this.spectralBeasts.splice(i, 1);
        continue;
      }

      beast.z += beast.speed;

      let target: ZombieEnemy | null = null;
      let minD = Infinity;
      for (const z of this.zombies) {
        const d = Math.hypot(z.x - beast.x, z.z - beast.z);
        if (d < minD) {
          minD = d;
          target = z;
        }
      }

      if (target) {
        beast.x += Math.sign(target.x - beast.x) * 0.0038;
        if (minD < 0.09) {
          const hitX = target.x * p.width;
          const hitY = p.lerp(horizonY, p.height * 0.88, 1 - target.z);
          this.damageZombie(target, beast.damage, hitX, hitY);
          this.createExplosionParticles(hitX, hitY, '#10b981', 14);
          beast.lifetime -= 65;
        }
      }

      const screenX = beast.x * p.width;
      const screenY = p.lerp(horizonY, p.height * 0.88, 1 - beast.z);
      const scale = p.map(beast.z, 0.0, 1.0, 1.4, 0.45);

      p.push();
      p.translate(screenX, screenY);

      p.noStroke();
      p.fill(16, 185, 129, 95);
      p.ellipse(0, 0, 54 * scale, 32 * scale);

      p.fill('#064e3b');
      p.rectMode(p.CENTER);
      p.rect(0, -6 * scale, 40 * scale, 20 * scale, 8 * scale);

      p.fill('#047857');
      p.triangle(14 * scale, -16 * scale, 30 * scale, -3 * scale, 14 * scale, 3 * scale);

      p.fill('#6ee7b7');
      p.circle(20 * scale, -7 * scale, 4.5 * scale);

      p.stroke('#10b981');
      p.strokeWeight(4 * scale);
      const gallop1 = Math.sin(beast.animPhase) * 12 * scale;
      const gallop2 = -Math.sin(beast.animPhase) * 12 * scale;
      p.line(-12 * scale, 5 * scale, -18 * scale + gallop1, 20 * scale);
      p.line(12 * scale, 5 * scale, 18 * scale + gallop2, 20 * scale);

      p.pop();
    }
  }

  private triggerFrostNova(damage: number) {
    if (!this.p) return;
    this.screenShake = 6;
    for (const z of this.zombies) {
      z.frozenTimer = 220;
      this.damageZombie(z, damage * 0.5, this.p.width / 2, this.p.height * 0.6);
      this.floatingTexts.push({
        x: z.x * this.p.width,
        y: this.p.lerp(this.p.height * 0.54, this.p.height * 0.88, 1 - z.z) - 30,
        text: 'PERMAFROST!',
        color: '#06b6d4',
        alpha: 255,
        vy: -1,
        size: 16
      });
    }

    this.shockwaves.push({
      x: this.p.width / 2,
      y: this.p.height * 0.68,
      radius: 20,
      maxRadius: this.p.width * 0.72,
      color: '#38bdf8',
      alpha: 245,
      weight: 6
    });

    for (let i = 0; i < 45; i++) {
      const angle = (this.p.TWO_PI / 45) * i;
      this.particles.push({
        x: this.p.width / 2,
        y: this.p.height * 0.65,
        vx: Math.cos(angle) * (Math.random() * 8 + 4),
        vy: Math.sin(angle) * (Math.random() * 5 + 2),
        size: Math.random() * 7 + 4,
        color: '#38bdf8',
        alpha: 255,
        decay: 5
      });
    }

    for (let i = 0; i < 16; i++) {
      const ang = (this.p.TWO_PI / 16) * i + Math.random() * 0.25;
      const spd = 4.5 + Math.random() * 5.5;
      this.frostCrystals.push({
        x: this.p.width / 2,
        y: this.p.height * 0.66,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.75 - 1.2,
        size: 10 + Math.random() * 10,
        rot: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.18,
        alpha: 255
      });
    }
  }

  private spawnMeteor(targetX: number, targetY: number, damage: number) {
    const startX = targetX - 190;
    const startY = -40;

    this.projectiles.push({
      id: `meteor_${Date.now()}_${Math.random()}`,
      spellId: 'meteor_cataclysm',
      startX,
      startY,
      currentX: startX,
      currentY: startY,
      currentZ: 0.0,
      targetX,
      targetY,
      speed: 0.048,
      damage,
      color: '#ef4444',
      size: 58,
      trail: []
    });
  }

  private manageWaveSpawning(p: p5) {
    const now = Date.now();

    if (this.zombiesSpawnedThisWave < this.zombiesRequiredForWave) {
      if (now >= this.nextZombieSpawnTime) {
        this.spawnZombie(p);
        this.zombiesSpawnedThisWave++;
        const interval = Math.max(820, 2500 - this.playerStats.wave * 200);
        this.nextZombieSpawnTime = now + interval;
      }
    } else if (this.zombies.length === 0 && !this.portalActive && !this.isWarping) {
      this.portalActive = true;
      this.portalScale = 0;
      this.onPortalStateChange?.(true);

      const apBonus = 55 + this.playerStats.wave * 25;
      this.playerStats.upgrades.arcanePoints += apBonus;
      this.playerStats.arenaPowersCount = (this.playerStats.arenaPowersCount || 0) + 3;
      // Grant +1 Portal Key every 2nd wave cleared so players can advance or also hunt/buy extra keys
      const grantedKey = this.playerStats.wave % 2 === 0;
      if (grantedKey) {
        this.playerStats.portalKeys = (this.playerStats.portalKeys || 0) + 1;
      }

      audioEngine.playLevelUp();
      this.floatingTexts.push({
        x: p.width / 2,
        y: p.height * 0.34,
        text: `⚔ WAVE ${this.playerStats.wave} CLEARED! +${apBonus} AP${grantedKey ? ' & +1 PORTAL KEY!' : ''}`,
        color: '#38bdf8',
        alpha: 255,
        vy: -1.1,
        size: 24
      });

      this.floatingTexts.push({
        x: p.width / 2,
        y: p.height * 0.41,
        text:
          (this.playerStats.portalKeys || 0) > 0
            ? 'PORTAL UNLOCKABLE — USE 1 KEY TO ENTER NEXT REALM [K]'
            : 'PORTAL SEALED — FIND OR BUY A PORTAL KEY TO ENTER!',
        color: (this.playerStats.portalKeys || 0) > 0 ? '#c084fc' : '#f43f5e',
        alpha: 255,
        vy: -0.5,
        size: 16
      });

      if (this.pendingTutorialAfterWave) {
        this.onWaveCompletedWithNewPower(
          this.pendingTutorialAfterWave.goal,
          this.pendingTutorialAfterWave.spell
        );
        this.pendingTutorialAfterWave = null;
      }
    }
  }

  private spawnZombie(p: p5) {
    const wave = this.playerStats.wave;
    const realm = WORLD_REALMS[this.currentRealmIndex] || WORLD_REALMS[0];

    // Realm-tuned monster pools (8 distinct monster archetypes)
    let pool: ZombieType[] = ['shambler'];
    if (realm.theme === 'volcanic') {
      pool = wave >= 2 ? ['shambler', 'runner', 'dreadknight'] : ['shambler', 'runner'];
    } else if (realm.theme === 'haunted_forest') {
      pool = ['shambler', 'dreadknight', 'wraith', 'runner'];
    } else if (realm.theme === 'mountains') {
      pool = ['golem', 'dreadknight', 'runner', 'shambler'];
    } else if (realm.theme === 'glacial') {
      pool = ['phantom', 'runner', 'wraith', 'golem'];
    } else if (realm.theme === 'superstore_ruins') {
      pool = ['abomination', 'dreadknight', 'runner', 'phantom'];
    } else if (realm.theme === 'desert_phantoms') {
      pool = ['phantom', 'wraith', 'titan', 'dreadknight'];
    } else if (realm.theme === 'sky_citadel') {
      pool = ['titan', 'phantom', 'wraith', 'golem'];
    } else {
      pool = ['titan', 'abomination', 'phantom', 'golem', 'dreadknight'];
    }

    const type = pool[Math.floor(p.random(pool.length))];

    const waveSpeedFactor = 1 + wave * 0.06;
    let hp = 70 + wave * 20;
    let shield = 0;
    let speed = 0.0012 * waveSpeedFactor;
    let damage = 10 + wave * 3;
    let width = 50;
    let height = 82;

    if (type === 'runner') {
      hp = Math.round(hp * 0.65);
      speed *= 2.4;
      damage = 15;
      width = 44;
      height = 70;
    } else if (type === 'dreadknight') {
      hp = Math.round(hp * 1.3);
      shield = 80 + wave * 25;
      speed *= 0.8;
      damage = 22;
      width = 62;
      height = 92;
    } else if (type === 'abomination') {
      hp = Math.round(hp * 3.1);
      shield = 50 + wave * 15;
      speed *= 0.52;
      damage = 36;
      width = 84;
      height = 120;
    } else if (type === 'wraith') {
      hp = Math.round(hp * 0.95);
      shield = 65 + wave * 20;
      speed *= 0.9;
      damage = 18;
      width = 52;
      height = 86;
    } else if (type === 'golem') {
      hp = Math.round(hp * 2.4);
      shield = 120 + wave * 30;
      speed *= 0.56;
      damage = 30;
      width = 78;
      height = 112;
    } else if (type === 'phantom') {
      hp = Math.round(hp * 1.05);
      shield = 75 + wave * 20;
      speed *= 1.38;
      damage = 24;
      width = 48;
      height = 88;
    } else if (type === 'titan') {
      hp = Math.round(hp * 3.6);
      shield = 150 + wave * 35;
      speed *= 0.45;
      damage = 42;
      width = 92;
      height = 132;
    }

    const isElite = wave >= 2 && Math.random() < 0.25;
    if (isElite) {
      hp = Math.round(hp * 1.45);
      shield = Math.round(shield * 1.35);
      damage = Math.round(damage * 1.25);
    }

    const zombie: ZombieEnemy = {
      id: `zombie_${Date.now()}_${Math.random()}`,
      type,
      x: p.random(0.14, 0.86),
      y: 0.54,
      z: 1.0,
      speed,
      hp,
      maxHp: hp,
      shield,
      maxShield: shield,
      damage,
      width,
      height,
      animFrame: p.random(100),
      staggerTimer: 0,
      lastAttackTime: 0,
      attackCooldown: type === 'wraith' ? 2300 : 1600,
      frozenTimer: 0,
      walkCyclePhase: p.random(p.TWO_PI),
      isBloodControlled: false,
      bloodControlTimer: 0,
      isElite,
      eliteName: isElite ? 'Key-Bearer Elite' : undefined
    };

    this.zombies.push(zombie);
    if (Math.random() < 0.45) {
      audioEngine.playZombieGroan();
    }
  }

  private updateAndDrawZombies(p: p5) {
    const horizonY = p.height * 0.54;
    const now = Date.now();

    if (this.zombies.length > 0 && now >= this.nextGroanTime) {
      this.nextGroanTime = now + 2200 + Math.random() * 2400;
      audioEngine.playZombieGroan();
    }

    this.zombies.sort((a, b) => b.z - a.z);

    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];

      if (z.isBloodControlled) {
        if (z.bloodControlTimer && z.bloodControlTimer > 0) {
          z.bloodControlTimer--;
          z.walkCyclePhase += 0.22;

          let target: ZombieEnemy | null = null;
          let minD = Infinity;
          for (const other of this.zombies) {
            if (other === z || other.isBloodControlled) continue;
            const d = Math.hypot(other.x - z.x, other.z - z.z);
            if (d < minD) {
              minD = d;
              target = other;
            }
          }

          if (target) {
            const dx = target.x - z.x;
            const dz = target.z - z.z;
            z.x += Math.sign(dx) * 0.0032;
            z.z += Math.sign(dz) * 0.0032;

            if (Math.hypot(dx, dz) < 0.08) {
              this.damageZombie(
                target,
                48,
                target.x * p.width,
                p.lerp(horizonY, p.height * 0.88, 1 - target.z)
              );
              audioEngine.playZombieHit();
            }
          }
        } else {
          z.isBloodControlled = false;
          audioEngine.playBloodExplosion();
          this.screenShake = 14;

          const screenX = z.x * p.width;
          const screenY = p.lerp(horizonY, p.height * 0.88, 1 - z.z);
          this.createExplosionParticles(screenX, screenY, '#991b1b', 45);

          for (let j = this.zombies.length - 1; j >= 0; j--) {
            const victim = this.zombies[j];
            if (victim === z) continue;
            const d = Math.hypot(victim.x - z.x, victim.z - z.z);
            if (d < 0.24) {
              this.damageZombie(victim, 240, victim.x * p.width, screenY);
            }
          }

          this.handleZombieKilled(z, screenX, screenY);
          this.zombies.splice(i, 1);
          continue;
        }
      } else {
        if (z.frozenTimer && z.frozenTimer > 0) {
          z.frozenTimer--;
        } else {
          z.walkCyclePhase += z.type === 'runner' ? 0.24 : 0.12;
          if (z.type === 'phantom') {
            z.x = Math.max(0.1, Math.min(0.9, z.x + Math.sin(z.walkCyclePhase * 0.6) * 0.0028));
          }
          if (z.staggerTimer > 0) {
            z.staggerTimer--;
          } else {
            z.z -= z.speed;
          }
        }
      }

      if (
        z.type === 'wraith' &&
        z.z < 0.75 &&
        z.z > 0.25 &&
        (!z.frozenTimer || z.frozenTimer <= 0) &&
        !z.isBloodControlled
      ) {
        if (now - z.lastAttackTime > z.attackCooldown) {
          z.lastAttackTime = now;
          this.spawnWraithSkullProjectile(z);
        }
      }

      if (z.z <= 0.05 && !z.isBloodControlled) {
        if (this.activeTitanShield) {
          audioEngine.playShieldDeflect();
          z.z += 0.2;
          this.floatingTexts.push({
            x: z.x * p.width,
            y: p.height * 0.72,
            text: 'TITAN SHIELD DEFLECTED!',
            color: '#eab308',
            alpha: 255,
            vy: -1,
            size: 17
          });
        } else {
          const armorItem =
            ARMOR_CATALOG.find((a) => a.id === this.playerStats.upgrades.armorTier) || ARMOR_CATALOG[0];
          const reducedDamage = Math.max(1, Math.round(z.damage * (1 - armorItem.damageReduction)));

          this.playerStats.hp -= reducedDamage;
          audioEngine.playZombieAttack();
          z.lastAttackTime = now;
          z.z += 0.22;
          this.screenShake = 14;
          this.damageFlashAlpha = 95;

          this.floatingTexts.push({
            x: p.width / 2,
            y: p.height * 0.5,
            text: `-${reducedDamage} HP (Armor -${Math.round(armorItem.damageReduction * 100)}%)`,
            color: '#ef4444',
            alpha: 255,
            vy: -1.5,
            size: 19
          });

          if (this.playerStats.hp <= 0) {
            this.playerStats.hp = 0;
            this.isRunning = false;
            this.onGameOver();
            return;
          }
        }
      }

      const screenX = z.x * p.width;
      const screenY = p.lerp(horizonY, p.height * 0.88, 1 - z.z);
      const scale = p.map(z.z, 1.0, 0.0, 0.35, 1.72);

      this.drawKinematicZombie(p, z, screenX, screenY, scale);
    }
  }

  private drawKinematicZombie(p: p5, z: ZombieEnemy, screenX: number, screenY: number, scale: number) {
    const drawW = z.width * scale;
    const drawH = z.height * scale;
    const phase = z.walkCyclePhase;
    const isHitFlash = z.staggerTimer > 8;
    const recoil = z.staggerTimer > 0 ? Math.sin((z.staggerTimer / 14) * Math.PI) * 9 * scale : 0;

    p.push();
    p.translate(screenX + (isHitFlash ? (Math.random() - 0.5) * 6 : 0), screenY - recoil * 0.45);

    if (z.type === 'phantom') {
      const ctx2d = p.drawingContext as CanvasRenderingContext2D;
      ctx2d.globalAlpha = 0.78;
    }

    // Blood-controlled crimson ritual circle underneath
    if (z.isBloodControlled) {
      p.noFill();
      p.stroke('#ef4444');
      p.strokeWeight(2.5 * scale);
      p.ellipse(0, drawH * 0.45, drawW * 1.45, drawH * 0.36);
    }

    // Shadow puddle beneath ragged undead frame
    p.noStroke();
    p.fill(0, 0, 0, p.map(z.z, 1.0, 0.0, 65, 195));
    p.ellipse(0, drawH * 0.46, drawW * 1.35, drawH * 0.32);

    const torsoSway = Math.sin(phase * 0.5) * 0.11 + (z.staggerTimer > 0 ? -0.14 : 0);
    const verticalBob =
      z.type === 'phantom' ? Math.sin(phase * 1.1) * 9 * scale : Math.abs(Math.sin(phase)) * 5.2 * scale;
    p.rotate(torsoSway);

    // Tattered Ragged Lower Legs & Shuffling Stride
    const leg1Phase = Math.sin(phase);
    const leg2Phase = Math.sin(phase + Math.PI);
    const knee1Bend = Math.max(0, leg1Phase * 0.85);
    const knee2Bend = Math.max(0, leg2Phase * 0.85);

    const clothDark =
      z.type === 'dreadknight'
        ? '#1e293b'
        : z.type === 'abomination'
        ? '#3b0764'
        : z.type === 'wraith'
        ? '#0f172a'
        : z.type === 'golem'
        ? '#334155'
        : z.type === 'phantom'
        ? '#312e81'
        : z.type === 'titan'
        ? '#2e1065'
        : '#1c1917';
    const clothMid =
      z.type === 'dreadknight'
        ? '#334155'
        : z.type === 'runner'
        ? '#291d1d'
        : z.type === 'abomination'
        ? '#4c1d95'
        : '#292524';
    const fleshSkin =
      z.type === 'runner'
        ? '#573632'
        : z.type === 'abomination'
        ? '#4c3e52'
        : z.type === 'golem'
        ? '#475569'
        : z.type === 'phantom'
        ? '#6366f1'
        : '#4b4b43';

    if (z.type !== 'phantom' && z.type !== 'wraith') {
      p.stroke(isHitFlash ? '#fca5a5' : clothDark);
      p.strokeWeight((z.type === 'golem' || z.type === 'titan' ? 11.5 : 8) * scale);

      const hipX1 = -drawW * 0.18;
      const kneeX1 = hipX1 - leg1Phase * 12 * scale;
      const kneeY1 = drawH * 0.22 + knee1Bend * 9 * scale;
      const footX1 = kneeX1 - leg1Phase * 14 * scale;
      const footY1 = drawH * 0.45 - knee1Bend * 5 * scale;
      p.line(hipX1, drawH * 0.06, kneeX1, kneeY1);
      p.line(kneeX1, kneeY1, footX1, footY1);

      const hipX2 = drawW * 0.18;
      const kneeX2 = hipX2 - leg2Phase * 12 * scale;
      const kneeY2 = drawH * 0.22 + knee2Bend * 9 * scale;
      const footX2 = kneeX2 - leg2Phase * 14 * scale;
      const footY2 = drawH * 0.45 - knee2Bend * 5 * scale;
      p.line(hipX2, drawH * 0.06, kneeX2, kneeY2);
      p.line(kneeX2, kneeY2, footX2, footY2);

      // Frayed tattered lower trousers strips
      p.noStroke();
      p.fill(isHitFlash ? '#ef4444' : clothMid);
      p.triangle(hipX1 - 6 * scale, drawH * 0.06, hipX1 + 6 * scale, drawH * 0.06, kneeX1 - 3 * scale, kneeY1 + 10 * scale);
      p.triangle(hipX2 - 6 * scale, drawH * 0.06, hipX2 + 6 * scale, drawH * 0.06, kneeX2 + 3 * scale, kneeY2 + 10 * scale);
    } else {
      // Spectral misty tail tatters for Wraith / Phantom
      p.noStroke();
      p.fill(clothDark + 'cc');
      p.triangle(-drawW * 0.34, drawH * 0.05, drawW * 0.34, drawH * 0.05, Math.sin(phase) * 10 * scale, drawH * 0.48);
    }

    const activeBody = isHitFlash ? '#f87171' : z.isBloodControlled ? '#7f1d1d' : clothDark;
    const torsoH = drawH * 0.46;
    const torsoTopY = -verticalBob - torsoH * 0.52;
    const torsoBotY = -verticalBob + torsoH * 0.48;

    // Back tattered hanging rags & hunched upper silhouette
    p.noStroke();
    p.fill(activeBody);
    p.quad(
      -drawW * 0.46, torsoTopY + 4 * scale,
      drawW * 0.46, torsoTopY + 4 * scale,
      drawW * 0.34, torsoBotY,
      -drawW * 0.34, torsoBotY
    );
    // Broad hunched shoulders dome
    p.arc(0, torsoTopY + 8 * scale, drawW * 0.94, drawH * 0.28, p.PI, 0);

    // Jagged hanging tattered cloth strips along hem
    p.fill(isHitFlash ? '#fca5a5' : clothMid);
    const tatterSway = Math.sin(phase * 1.4) * 3.5 * scale;
    p.triangle(-drawW * 0.34, torsoBotY - 2 * scale, -drawW * 0.14, torsoBotY - 2 * scale, -drawW * 0.28 + tatterSway, torsoBotY + 13 * scale);
    p.triangle(-drawW * 0.12, torsoBotY - 2 * scale, drawW * 0.1, torsoBotY - 2 * scale, tatterSway * 0.6, torsoBotY + 16 * scale);
    p.triangle(drawW * 0.12, torsoBotY - 2 * scale, drawW * 0.34, torsoBotY - 2 * scale, drawW * 0.26 - tatterSway, torsoBotY + 14 * scale);

    // Torn shirt folds & weathered texture lines
    p.stroke('#09090b');
    p.strokeWeight(1.8 * scale);
    p.line(-drawW * 0.32, torsoTopY + 10 * scale, -drawW * 0.08, torsoBotY - 8 * scale);
    p.line(drawW * 0.3, torsoTopY + 12 * scale, drawW * 0.06, torsoBotY - 10 * scale);
    p.noStroke();

    // Torn V-neck revealing exposed decayed chest cavity & ribcage (matching reference zombie)
    if (z.type === 'golem') {
      p.fill('#22d3ee');
      p.circle(0, -verticalBob, 15 * scale);
      p.fill('#475569');
      p.rect(-drawW * 0.42, -verticalBob - 14 * scale, 18 * scale, 18 * scale, 4);
      p.rect(drawW * 0.42, -verticalBob - 14 * scale, 18 * scale, 18 * scale, 4);
    } else if (z.type === 'titan') {
      p.stroke('#fbbf24');
      p.strokeWeight(2.8 * scale);
      p.noFill();
      p.rect(0, -verticalBob, drawW * 0.56, torsoH * 0.78, 5);
      p.noStroke();
      p.fill('#f59e0b');
      p.circle(0, -verticalBob - 4 * scale, 12 * scale);
    } else {
      // Ripped V-opening showing dark necrotic ribs
      p.fill('#270a0e');
      p.triangle(-drawW * 0.22, torsoTopY + 3 * scale, drawW * 0.22, torsoTopY + 3 * scale, 0, -verticalBob + 10 * scale);
      p.stroke('#a8a29e');
      p.strokeWeight(1.8 * scale);
      for (let r = -1; r <= 1; r++) {
        const ry = torsoTopY + (14 + r * 5.5) * scale;
        p.line(-drawW * 0.13, ry, drawW * 0.13, ry);
      }
      p.line(0, torsoTopY + 6 * scale, 0, -verticalBob + 5 * scale);
      p.noStroke();
    }

    // Hunched Shambling Arms with Frayed Sleeves & Splayed Clawed Hands
    const armPhase1 = Math.sin(phase + 0.4);
    const armPhase2 = Math.sin(phase + Math.PI + 0.4);

    // Left torn sleeve + gaunt sinewy forearm + 3 gnarled claws
    const shX1 = -drawW * 0.42;
    const shY1 = torsoTopY + 10 * scale;
    const elbX1 = shX1 - 8 * scale - armPhase1 * 7 * scale;
    const elbY1 = shY1 + 19 * scale;
    const wrX1 = elbX1 + 2 * scale - armPhase1 * 11 * scale;
    const wrY1 = elbY1 + 22 * scale;

    p.stroke(activeBody);
    p.strokeWeight(9 * scale);
    p.line(shX1, shY1, elbX1, elbY1);
    // Ragged sleeve tatter hanging from elbow
    p.noStroke();
    p.fill(clothMid);
    p.triangle(elbX1 - 5 * scale, elbY1, elbX1 + 5 * scale, elbY1, elbX1 - 6 * scale, elbY1 + 12 * scale);
    // Gaunt dark decayed forearm
    p.stroke(isHitFlash ? '#fca5a5' : fleshSkin);
    p.strokeWeight(5.2 * scale);
    p.line(elbX1, elbY1, wrX1, wrY1);
    // Splayed gnarled claw fingers
    p.stroke(isHitFlash ? '#fee2e2' : '#292524');
    p.strokeWeight(2.1 * scale);
    p.line(wrX1, wrY1, wrX1 - 6 * scale, wrY1 + 8 * scale);
    p.line(wrX1, wrY1, wrX1 - 1 * scale, wrY1 + 9.5 * scale);
    p.line(wrX1, wrY1, wrX1 + 4.5 * scale, wrY1 + 7.5 * scale);

    // Right torn sleeve + gaunt sinewy forearm + 3 gnarled claws
    const shX2 = drawW * 0.42;
    const shY2 = torsoTopY + 10 * scale;
    const elbX2 = shX2 + 8 * scale + armPhase2 * 7 * scale;
    const elbY2 = shY2 + 19 * scale;
    const wrX2 = elbX2 - 2 * scale + armPhase2 * 11 * scale;
    const wrY2 = elbY2 + 22 * scale;

    p.stroke(activeBody);
    p.strokeWeight(9 * scale);
    p.line(shX2, shY2, elbX2, elbY2);
    p.noStroke();
    p.fill(clothMid);
    p.triangle(elbX2 - 5 * scale, elbY2, elbX2 + 5 * scale, elbY2, elbX2 + 6 * scale, elbY2 + 12 * scale);
    p.stroke(isHitFlash ? '#fca5a5' : fleshSkin);
    p.strokeWeight(5.2 * scale);
    p.line(elbX2, elbY2, wrX2, wrY2);
    p.stroke(isHitFlash ? '#fee2e2' : '#292524');
    p.strokeWeight(2.1 * scale);
    p.line(wrX2, wrY2, wrX2 - 4.5 * scale, wrY2 + 7.5 * scale);
    p.line(wrX2, wrY2, wrX2 + 1 * scale, wrY2 + 9.5 * scale);
    p.line(wrX2, wrY2, wrX2 + 6 * scale, wrY2 + 8 * scale);

    if ((z.type === 'dreadknight' || z.type === 'golem' || z.type === 'titan') && z.shield > 0) {
      p.fill('#1e293b');
      p.stroke('#38bdf8');
      p.strokeWeight(2.5 * scale);
      p.rectMode(p.CENTER);
      p.rect(wrX2, wrY2 - 6 * scale, drawW * 0.4, drawH * 0.44, 6);
    }

    // Forward-Hunched Mottled Undead Head, Sparse Matted Hair, Deep Eye Sockets & Jagged Jaw
    const headY = torsoTopY - 4 * scale;
    const headW = drawW * 0.4;
    const headH = drawW * 0.46;
    const headTilt = Math.sin(phase * 0.5) * 0.12 + 0.08;

    p.push();
    p.translate(0, headY);
    p.rotate(headTilt);

    // Gaunt skull silhouette (wider brow, sunken hollow cheeks, narrow jaw)
    p.stroke('#09090b');
    p.strokeWeight(2 * scale);
    p.fill(isHitFlash ? '#fca5a5' : fleshSkin);
    p.beginShape();
    p.vertex(-headW * 0.48, -headH * 0.25);
    p.vertex(-headW * 0.34, -headH * 0.55);
    p.vertex(headW * 0.34, -headH * 0.55);
    p.vertex(headW * 0.48, -headH * 0.25);
    p.vertex(headW * 0.38, headH * 0.14);
    p.vertex(headW * 0.22, headH * 0.48);
    p.vertex(-headW * 0.22, headH * 0.48);
    p.vertex(-headW * 0.38, headH * 0.14);
    p.endShape(p.CLOSE);

    // Sunken dark cheekbone hollows & forehead wrinkles
    p.noStroke();
    p.fill('#1c1917');
    p.ellipse(-headW * 0.26, headH * 0.08, headW * 0.24, headH * 0.22);
    p.ellipse(headW * 0.26, headH * 0.08, headW * 0.24, headH * 0.22);

    // Sparse messy matted black hair strands on crown
    p.stroke('#09090b');
    p.strokeWeight(2 * scale);
    p.fill('#18181b');
    p.arc(0, -headH * 0.42, headW * 0.86, headH * 0.4, p.PI, 0);
    for (const hx of [-0.34, -0.18, -0.04, 0.12, 0.28]) {
      p.line(headW * hx, -headH * 0.5, headW * (hx + (hx < 0 ? -0.1 : 0.1)), -headH * 0.68);
    }
    p.noStroke();

    if (z.type === 'titan') {
      p.fill('#fbbf24');
      p.triangle(-headW * 0.45, -headH * 0.2, -headW * 0.78, -headH * 0.88, -headW * 0.18, -headH * 0.42);
      p.triangle(headW * 0.45, -headH * 0.2, headW * 0.78, -headH * 0.88, headW * 0.18, -headH * 0.42);
    }

    // Deep sunken black eye sockets + piercing pale-white & amber pinpoint eyes (like reference!)
    p.fill('#09090b');
    p.ellipse(-headW * 0.2, -headH * 0.12, headW * 0.28, headH * 0.24);
    p.ellipse(headW * 0.2, -headH * 0.12, headW * 0.28, headH * 0.24);

    const eyeLeft = z.isBloodControlled
      ? '#ef4444'
      : z.type === 'golem'
      ? '#22d3ee'
      : z.type === 'phantom'
      ? '#c084fc'
      : '#e7e5e4';
    const eyeRight = z.isBloodControlled
      ? '#ef4444'
      : z.type === 'golem'
      ? '#22d3ee'
      : z.type === 'phantom'
      ? '#c084fc'
      : '#f59e0b';
    p.fill(eyeLeft + '66');
    p.circle(-headW * 0.2, -headH * 0.12, 7.5 * scale);
    p.fill(eyeRight + '66');
    p.circle(headW * 0.2, -headH * 0.12, 7.5 * scale);
    p.fill(eyeLeft);
    p.circle(-headW * 0.2, -headH * 0.12, 3.6 * scale);
    p.fill(eyeRight);
    p.circle(headW * 0.2, -headH * 0.12, 3.6 * scale);

    // Gaping dark jagged mouth + uneven stained teeth
    const jawDrop = Math.abs(Math.sin(phase * 1.5)) * 5.2 * scale;
    p.fill('#09090b');
    p.ellipse(0, headH * 0.24 + jawDrop * 0.3, headW * 0.48, jawDrop + 6.5 * scale);
    p.fill('#d6d3d1');
    for (let t = -1; t <= 1; t++) {
      const tx = t * headW * 0.11;
      p.triangle(tx - 1.6 * scale, headH * 0.15, tx + 1.6 * scale, headH * 0.15, tx, headH * 0.24);
      p.triangle(tx - 1.5 * scale, headH * 0.34 + jawDrop * 0.5, tx + 1.5 * scale, headH * 0.34 + jawDrop * 0.5, tx, headH * 0.24 + jawDrop * 0.4);
    }

    p.pop();

    if (z.frozenTimer && z.frozenTimer > 0) {
      p.noStroke();
      p.fill(56, 189, 248, 95);
      p.rectMode(p.CENTER);
      p.rect(0, -verticalBob, drawW * 1.18, drawH * 1.18, 12);
      p.stroke('#bae6fd');
      p.strokeWeight(1.8 * scale);
      p.noFill();
      p.quad(0, -drawH * 0.55, drawW * 0.55, -verticalBob, 0, drawH * 0.42, -drawW * 0.55, -verticalBob);
      p.noStroke();
    }

    if (z.type === 'phantom') {
      const ctx2d = p.drawingContext as CanvasRenderingContext2D;
      ctx2d.globalAlpha = 1;
    }

    // Overhead HP & Shield Bars
    const barW = Math.max(58, drawW * 1.32);
    const barY = -drawH * 0.72 - verticalBob;

    p.rectMode(p.CORNER);
    p.noStroke();
    p.fill(15, 23, 42, 230);
    p.rect(-barW / 2, barY, barW, 9, 3);

    if (z.maxShield > 0) {
      const shieldRatio = Math.max(0, z.shield / z.maxShield);
      p.fill('#38bdf8');
      p.rect(-barW / 2, barY - 7, barW * shieldRatio, 4, 2);
    }

    const hpRatio = Math.max(0, z.hp / z.maxHp);
    p.fill(z.isBloodControlled ? '#ef4444' : z.type === 'titan' ? '#fbbf24' : '#22c55e');
    p.rect(-barW / 2, barY, barW * hpRatio, 9, 3);

    p.textAlign(p.CENTER, p.BOTTOM);
    p.textSize(10);
    p.fill('#f8fafc');
    let label = `${z.isElite ? '★ ' : ''}${z.type.toUpperCase()} · ${Math.round(z.hp)} HP`;
    if (z.shield > 0) label += ` [${Math.round(z.shield)}]`;
    if (z.isBloodControlled) label = '✦ BLOOD THRALL';
    p.text(label, 0, barY - (z.maxShield > 0 ? 9 : 2));

    p.pop();
  }

  private damageZombie(z: ZombieEnemy, damage: number, hitX: number, hitY: number) {
    let remainingDamage = damage;

    if (z.shield > 0) {
      if (z.shield >= remainingDamage) {
        z.shield -= remainingDamage;
        remainingDamage = 0;
        audioEngine.playShieldDeflect();
        this.floatingTexts.push({
          x: hitX + (Math.random() - 0.5) * 20,
          y: hitY - 35,
          text: `SHIELD -${Math.round(damage)}`,
          color: '#38bdf8',
          alpha: 255,
          vy: -1.2,
          size: 15
        });
      } else {
        remainingDamage -= z.shield;
        z.shield = 0;
        audioEngine.playShieldBreak();
        this.floatingTexts.push({
          x: hitX,
          y: hitY - 35,
          text: 'SHIELD BROKEN!',
          color: '#38bdf8',
          alpha: 255,
          vy: -1.4,
          size: 16
        });
      }
    }

      if (remainingDamage > 0) {
      z.hp -= remainingDamage;
      z.staggerTimer = 14;
      audioEngine.playZombieHit();

      this.slashFlashes.push({
        x: hitX,
        y: hitY - 18,
        angle: (Math.random() - 0.5) * Math.PI,
        color: '#f8fafc',
        alpha: 245,
        size: 32
      });

      this.floatingTexts.push({
        x: hitX + (Math.random() - 0.5) * 20,
        y: hitY - 45,
        text: `-${Math.round(remainingDamage)}`,
        color: '#ef4444',
        alpha: 255,
        vy: -1.5,
        size: 18
      });
    }

    if (z.hp <= 0) {
      const idx = this.zombies.indexOf(z);
      if (idx !== -1) {
        this.handleZombieKilled(z, hitX, hitY);
        this.zombies.splice(idx, 1);
      }
    }
  }

  private spawnWraithSkullProjectile(z: ZombieEnemy) {
    if (!this.p) return;
    const startX = z.x * this.p.width;
    const startY = this.p.lerp(this.p.height * 0.54, this.p.height * 0.88, 1 - z.z);
    this.projectiles.push({
      id: `skull_${Date.now()}`,
      spellId: 'fireball',
      startX,
      startY,
      currentX: startX,
      currentY: startY,
      currentZ: z.z,
      targetX: this.p.width / 2 + (Math.random() - 0.5) * 80,
      targetY: this.p.height * 0.82,
      speed: 0.016,
      damage: z.damage,
      color: '#a855f7',
      size: 24,
      trail: [],
      isEnemy: true
    });
  }

  private updateAndDrawProjectiles(p: p5) {
    const horizonY = p.height * 0.54;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];

      if (proj.isEnemy) {
        proj.currentZ -= proj.speed;
        proj.currentX = p.lerp(proj.startX, proj.targetX, 1 - proj.currentZ);
        proj.currentY = p.lerp(proj.startY, proj.targetY, 1 - proj.currentZ);

        if (this.activeTitanShield && this.latestGesture?.handFound) {
          const shieldX = this.latestGesture.aimPoint.x;
          const shieldY = this.latestGesture.aimPoint.y;
          if (p.dist(proj.currentX, proj.currentY, shieldX, shieldY) < 92) {
            audioEngine.playShieldDeflect();
            this.createExplosionParticles(proj.currentX, proj.currentY, '#38bdf8', 16);
            this.projectiles.splice(i, 1);
            continue;
          }
        }

        if (proj.currentZ <= 0.05) {
          const armorItem =
            ARMOR_CATALOG.find((a) => a.id === this.playerStats.upgrades.armorTier) || ARMOR_CATALOG[0];
          const reducedDamage = Math.max(1, Math.round(proj.damage * (1 - armorItem.damageReduction)));

          this.playerStats.hp -= reducedDamage;
          audioEngine.playZombieAttack();
          this.damageFlashAlpha = 80;
          this.screenShake = Math.max(this.screenShake, 10);
          this.createExplosionParticles(proj.currentX, proj.currentY, '#a855f7', 22);
          this.projectiles.splice(i, 1);
          continue;
        }

        p.noStroke();
        p.fill(168, 85, 247, 110);
        p.circle(proj.currentX, proj.currentY, proj.size * 1.9);
        p.fill('#a855f7');
        p.circle(proj.currentX, proj.currentY, proj.size);
        p.fill('#e9d5ff');
        p.circle(proj.currentX - 4, proj.currentY - 2, 4.5);
        p.circle(proj.currentX + 4, proj.currentY - 2, 4.5);
        continue;
      }

      proj.currentZ += proj.speed;
      proj.currentX = p.lerp(proj.startX, proj.targetX, proj.currentZ);
      proj.currentY = p.lerp(proj.startY, proj.targetY, proj.currentZ);

      proj.trail.push({ x: proj.currentX, y: proj.currentY, alpha: 255 });
      if (proj.trail.length > 16) proj.trail.shift();

      p.noStroke();
      proj.trail.forEach((t, tIdx) => {
        const ratio = (tIdx + 1) / proj.trail.length;
        p.fill(proj.color + Math.floor(ratio * 155).toString(16).padStart(2, '0'));
        p.circle(t.x + (Math.random() - 0.5) * 3, t.y + (Math.random() - 0.5) * 3, proj.size * ratio * 0.9);
      });

      // Distinct Stylized Spell Projectile Visuals
      if (proj.spellId === 'meteor_cataclysm') {
        p.push();
        p.translate(proj.currentX, proj.currentY);
        p.rotate(p.frameCount * 0.14);
        p.fill(239, 68, 68, 85);
        p.circle(0, 0, proj.size * 2.2);
        p.fill('#451a03');
        p.circle(0, 0, proj.size * 1.25);
        p.fill('#f97316');
        p.triangle(-proj.size * 0.45, -proj.size * 0.2, proj.size * 0.3, -proj.size * 0.45, 0, proj.size * 0.45);
        p.fill('#fde047');
        p.circle(0, 0, proj.size * 0.48);
        p.pop();
      } else if (proj.spellId === 'water_blast') {
        const orbSpin = p.frameCount * 0.25;
        p.fill(56, 189, 248, 70);
        p.circle(proj.currentX, proj.currentY, proj.size * 2.2);
        p.fill('#0284c7');
        p.circle(proj.currentX, proj.currentY, proj.size * 1.25);
        p.fill('#bae6fd');
        p.circle(proj.currentX + Math.cos(orbSpin) * proj.size * 0.45, proj.currentY + Math.sin(orbSpin) * proj.size * 0.45, 7);
        p.circle(proj.currentX - Math.cos(orbSpin) * proj.size * 0.45, proj.currentY - Math.sin(orbSpin) * proj.size * 0.45, 7);
      } else {
        // Blazing Fireball Comet Core
        p.fill(249, 115, 22, 85);
        p.circle(proj.currentX, proj.currentY, proj.size * 2.3);
        p.fill('#f97316');
        p.circle(proj.currentX, proj.currentY, proj.size * 1.4);
        p.fill('#fde047');
        p.circle(proj.currentX, proj.currentY, proj.size * 0.85);
        p.fill('#ffffff');
        p.circle(proj.currentX, proj.currentY, proj.size * 0.42);
      }

      let hit = false;
      for (let j = this.zombies.length - 1; j >= 0; j--) {
        const z = this.zombies[j];
        const zScreenX = z.x * p.width;
        const zScreenY = p.lerp(horizonY, p.height * 0.88, 1 - z.z);
        const zScale = p.map(z.z, 1.0, 0.0, 0.35, 1.72);
        const hitRadius = (z.width * zScale) / 1.25;

        if (p.dist(proj.currentX, proj.currentY, zScreenX, zScreenY - 20 * zScale) < hitRadius) {
          hit = true;
          this.playerStats.spellsHit++;
          this.playerStats.damageDealt += proj.damage;
          this.playerStats.currentStreak++;
          if (this.playerStats.currentStreak > this.playerStats.highestStreak) {
            this.playerStats.highestStreak = this.playerStats.currentStreak;
          }

          if (proj.spellId === 'water_blast') {
            z.z = Math.min(1.0, z.z + 0.085);
          }

          if (proj.spellId === 'meteor_cataclysm') {
            this.screenShake = Math.max(this.screenShake, 16);
            this.skyFlashColor = '#f97316';
            this.skyFlashAlpha = 95;
          }

          this.damageZombie(z, proj.damage, zScreenX, zScreenY);
          this.createExplosionParticles(proj.currentX, proj.currentY, proj.color, proj.spellId === 'meteor_cataclysm' ? 44 : 28);
          this.shockwaves.push({
            x: proj.currentX,
            y: proj.currentY,
            radius: 10,
            maxRadius: proj.size * (proj.spellId === 'meteor_cataclysm' ? 3.8 : 2.8),
            color: proj.color,
            alpha: 245,
            weight: proj.spellId === 'meteor_cataclysm' ? 6 : 4
          });
          this.groundDecals.push({
            x: proj.currentX,
            y: proj.currentY,
            radius: proj.size * 1.05,
            color: proj.color + '55',
            alpha: 210
          });
          break;
        }
      }

      if (hit || proj.currentZ >= 1.0) {
        if (!hit && proj.currentZ >= 1.0) {
          this.playerStats.currentStreak = 0;
          this.createExplosionParticles(proj.currentX, proj.currentY, proj.color, 10);
        }
        this.projectiles.splice(i, 1);
      }
    }
  }

  private handleZombieKilled(z: ZombieEnemy, screenX: number, screenY: number) {
    this.playerStats.zombiesKilled++;
    audioEngine.playZombieDeath();

    const deathScale = this.p ? this.p.map(z.z, 1.0, 0.0, 0.35, 1.72) : 1;
    this.dyingZombies.push({
      x: screenX,
      y: screenY,
      scale: deathScale,
      bodyColor: z.isBloodControlled ? '#991b1b' : '#292524',
      alpha: 230,
      vy: -0.7
    });

    this.playerStats.mana = Math.min(this.playerStats.maxMana, this.playerStats.mana + 15);
    const apGain =
      z.type === 'titan'
        ? 45
        : z.type === 'abomination' || z.type === 'golem'
        ? 35
        : z.type === 'dreadknight'
        ? 22
        : 12;
    this.playerStats.upgrades.arcanePoints += apGain;
    const powerGain = z.isElite || z.type === 'titan' || z.type === 'abomination' ? 2 : 1;
    this.playerStats.arenaPowersCount = Math.min(
      999,
      (this.playerStats.arenaPowersCount || 0) + powerGain
    );

    this.shockwaves.push({
      x: screenX,
      y: screenY,
      radius: 14,
      maxRadius: 96,
      color: '#10b981',
      alpha: 225,
      weight: 4
    });

    // Elite & Boss monsters can drop a Portal Key
    if (z.isElite || z.type === 'titan' || z.type === 'abomination') {
      if (Math.random() < 0.65) {
        this.playerStats.portalKeys = (this.playerStats.portalKeys || 0) + 1;
        this.floatingTexts.push({
          x: screenX,
          y: screenY - 82,
          text: '🔑 +1 PORTAL KEY DROPPED!',
          color: '#fbbf24',
          alpha: 255,
          vy: -1.8,
          size: 18
        });
      }
    }

    this.createExplosionParticles(screenX, screenY, '#10b981', 36);

    const xpGain = z.type === 'titan' ? 110 : z.type === 'abomination' ? 90 : z.type === 'golem' ? 75 : 35;
    const scoreGain = Math.round(
      xpGain * 10 * (1 + this.playerStats.spellsHit / Math.max(1, this.playerStats.spellsCast))
    );
    this.playerStats.score += scoreGain;
    this.playerStats.currentXp += xpGain;

    this.floatingTexts.push({
      x: screenX,
      y: screenY - 55,
      text: `+${scoreGain} PTS  (+${apGain} AP)`,
      color: '#facc15',
      alpha: 255,
      vy: -1.6,
      size: 19
    });

    if (this.playerStats.currentXp >= this.playerStats.xpToNextLevel) {
      this.playerStats.level++;
      this.playerStats.currentXp -= this.playerStats.xpToNextLevel;
      this.playerStats.xpToNextLevel = Math.round(this.playerStats.xpToNextLevel * 1.5);
      this.playerStats.maxHp += 20;
      this.playerStats.hp = this.playerStats.maxHp;
      this.playerStats.maxMana += 20;
      this.playerStats.mana = this.playerStats.maxMana;

      audioEngine.playLevelUp();
      this.floatingTexts.push({
        x: this.p!.width / 2,
        y: this.p!.height * 0.38,
        text: `★ LEVEL UP! ARCH-MAGE LEVEL ${this.playerStats.level} ★`,
        color: '#38bdf8',
        alpha: 255,
        vy: -1.2,
        size: 24
      });
    }
  }

  private checkMilestoneGoals() {
    for (const goal of GOALS_CATALOG) {
      if (this.completedGoalIds.has(goal.id)) continue;

      let achieved = false;
      if (goal.id === 'goal_slay_3' && this.playerStats.zombiesKilled >= goal.targetCount) achieved = true;
      else if (goal.id === 'goal_hit_8' && this.playerStats.spellsHit >= goal.targetCount) achieved = true;
      else if (goal.id === 'goal_defend' && (this.playerStats.wave > 1 || this.playerStats.score >= 500)) achieved = true;
      else if (goal.id === 'goal_runner_kill' && (this.playerStats.score >= 1200 || this.playerStats.wave >= 2)) achieved = true;
      else if (goal.id === 'goal_score_2500' && this.playerStats.score >= goal.targetCount) achieved = true;
      else if (goal.id === 'goal_streak_10' && this.playerStats.highestStreak >= goal.targetCount) achieved = true;

      if (achieved) {
        this.completedGoalIds.add(goal.id);
        const unlockedSpell = SPELL_CATALOG.find((s) => s.id === goal.unlockedSpellId);
        if (unlockedSpell) {
          if (!this.playerStats.unlockedSpellIds.includes(unlockedSpell.id)) {
            this.playerStats.unlockedSpellIds.push(unlockedSpell.id);
          }
          if (!this.playerStats.unlockedInThisSession.includes(unlockedSpell.id)) {
            this.playerStats.unlockedInThisSession.push(unlockedSpell.id);
          }

          this.pendingTutorialAfterWave = { goal, spell: unlockedSpell };
          audioEngine.playLevelUp();

          this.floatingTexts.push({
            x: this.p!.width / 2,
            y: this.p!.height * 0.3,
            text: `✦ NEW POWER UNLOCKED: ${unlockedSpell.name.toUpperCase()}!`,
            color: '#facc15',
            alpha: 255,
            vy: -0.8,
            size: 24
          });

          this.onGoalUnlockedWithoutStopping(goal, unlockedSpell);
        }
      }
    }
  }

  private createLightningArc(x1: number, y1: number, x2: number, y2: number) {
    const segments = 9;
    let curX = x1;
    let curY = y1;

    for (let i = 1; i <= segments; i++) {
      const targetSegmentX = x1 + (x2 - x1) * (i / segments);
      const targetSegmentY = y1 + (y2 - y1) * (i / segments);
      const nextX = i === segments ? x2 : targetSegmentX + (Math.random() - 0.5) * 38;
      const nextY = i === segments ? y2 : targetSegmentY + (Math.random() - 0.5) * 38;

      this.lightningBranches.push({ x1: curX, y1: curY, x2: nextX, y2: nextY, alpha: 255 });
      if (i > 1 && i < segments && Math.random() < 0.55) {
        this.lightningBranches.push({
          x1: nextX,
          y1: nextY,
          x2: nextX + (Math.random() - 0.5) * 75,
          y2: nextY + (Math.random() - 0.5) * 55,
          alpha: 210
        });
      }
      curX = nextX;
      curY = nextY;
    }
  }

  private drawLightningBranches(p: p5) {
    for (let i = this.lightningBranches.length - 1; i >= 0; i--) {
      const b = this.lightningBranches[i];
      b.alpha -= 26;
      if (b.alpha <= 0) {
        this.lightningBranches.splice(i, 1);
        continue;
      }
      p.stroke(168, 85, 247, b.alpha * 0.6);
      p.strokeWeight(8);
      p.line(b.x1, b.y1, b.x2, b.y2);

      p.stroke(192, 132, 252, b.alpha);
      p.strokeWeight(3.8);
      p.line(b.x1, b.y1, b.x2, b.y2);

      p.stroke(255, 255, 255, b.alpha);
      p.strokeWeight(1.8);
      p.line(b.x1, b.y1, b.x2, b.y2);
    }
  }

  private drawCelestialBeams(p: p5) {
    for (let i = this.celestialBeams.length - 1; i >= 0; i--) {
      const bm = this.celestialBeams[i];
      bm.alpha -= 11;
      if (bm.alpha <= 0) {
        this.celestialBeams.splice(i, 1);
        continue;
      }
      p.noStroke();
      p.fill(236, 72, 153, bm.alpha * 0.35);
      p.rect(bm.x - bm.width * 0.9, 0, bm.width * 1.8, bm.groundY);
      p.fill(250, 204, 21, bm.alpha * 0.55);
      p.rect(bm.x - bm.width * 0.45, 0, bm.width * 0.9, bm.groundY);
      p.fill(255, 255, 255, bm.alpha * 0.85);
      p.rect(bm.x - bm.width * 0.16, 0, bm.width * 0.32, bm.groundY);

      p.noFill();
      p.stroke(253, 224, 71, bm.alpha);
      p.strokeWeight(3);
      p.ellipse(bm.x, bm.groundY, bm.width * 2.2, 24);
      p.noStroke();
    }
  }

  private updateAndDrawSlashFlashes(p: p5) {
    for (let i = this.slashFlashes.length - 1; i >= 0; i--) {
      const sf = this.slashFlashes[i];
      sf.alpha -= 22;
      if (sf.alpha <= 0) {
        this.slashFlashes.splice(i, 1);
        continue;
      }
      p.push();
      p.translate(sf.x, sf.y);
      p.rotate(sf.angle);
      p.noStroke();
      p.fill(255, 255, 255, sf.alpha);
      p.ellipse(0, 0, sf.size * 1.5, 4);
      p.ellipse(0, 0, 4, sf.size);
      p.pop();
    }
  }

  private updateAndDrawFrostCrystals(p: p5) {
    for (let i = this.frostCrystals.length - 1; i >= 0; i--) {
      const fc = this.frostCrystals[i];
      fc.x += fc.vx;
      fc.y += fc.vy;
      fc.rot += fc.rotSpeed;
      fc.alpha -= 7.5;
      if (fc.alpha <= 0) {
        this.frostCrystals.splice(i, 1);
        continue;
      }
      p.push();
      p.translate(fc.x, fc.y);
      p.rotate(fc.rot);
      p.noStroke();
      p.fill(186, 230, 253, fc.alpha);
      p.quad(0, -fc.size, fc.size * 0.55, 0, 0, fc.size, -fc.size * 0.55, 0);
      p.pop();
    }
  }

  private updateAndDrawDyingZombies(p: p5) {
    for (let i = this.dyingZombies.length - 1; i >= 0; i--) {
      const dz = this.dyingZombies[i];
      dz.y += dz.vy;
      dz.alpha -= 11;
      if (dz.alpha <= 0) {
        this.dyingZombies.splice(i, 1);
        continue;
      }
      p.push();
      p.translate(dz.x, dz.y + (230 - dz.alpha) * 0.14);
      p.scale(1, Math.max(0.2, dz.alpha / 230));
      p.noStroke();
      p.fill(28, 25, 23, dz.alpha);
      p.ellipse(0, 0, 38 * dz.scale, 58 * dz.scale);
      p.fill(16, 185, 129, dz.alpha * 0.65);
      p.circle((Math.random() - 0.5) * 18 * dz.scale, -18 * dz.scale, 8 * dz.scale);
      p.pop();
    }
  }

  private drawBloodTendrils(p: p5) {
    for (let i = this.bloodTendrils.length - 1; i >= 0; i--) {
      const t = this.bloodTendrils[i];
      t.alpha -= 10;
      t.phase += 0.15;
      if (t.alpha <= 0) {
        this.bloodTendrils.splice(i, 1);
        continue;
      }

      p.noFill();
      p.stroke(185, 28, 28, t.alpha);
      p.strokeWeight(4);
      p.beginShape();
      for (let s = 0; s <= 10; s++) {
        const prog = s / 10;
        const curX = p.lerp(t.sourceX, t.targetX, prog) + Math.sin(t.phase + s) * 14;
        const curY = p.lerp(t.sourceY, t.targetY, prog);
        p.vertex(curX, curY);
      }
      p.endShape();
    }
  }

  private checkInstantDamageAt(targetX: number, targetY: number, damage: number) {
    if (!this.p) return;
    const horizonY = this.p.height * 0.54;

    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      const zScreenX = z.x * this.p.width;
      const zScreenY = this.p.lerp(horizonY, this.p.height * 0.88, 1 - z.z);
      if (Math.hypot(zScreenX - targetX, zScreenY - targetY) < 75) {
        this.playerStats.spellsHit++;
        this.playerStats.damageDealt += damage;
        this.damageZombie(z, damage, zScreenX, zScreenY);
      }
    }
  }

  private checkBeamDamageAt(targetX: number, damage: number) {
    if (!this.p) return;
    const horizonY = this.p.height * 0.54;

    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      const zScreenX = z.x * this.p.width;
      const zScreenY = this.p.lerp(horizonY, this.p.height * 0.88, 1 - z.z);
      if (Math.abs(zScreenX - targetX) < 52) {
        this.playerStats.spellsHit++;
        this.playerStats.damageDealt += damage;
        this.damageZombie(z, damage, zScreenX, zScreenY);
      }
    }
  }

  private updateAndDrawShockwaves(p: p5) {
    p.noFill();
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += (sw.maxRadius - sw.radius) * 0.18 + 2.5;
      sw.alpha -= 14;
      if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      p.stroke(sw.color + Math.floor(Math.max(0, sw.alpha)).toString(16).padStart(2, '0'));
      p.strokeWeight(sw.weight || 3);
      p.circle(sw.x, sw.y, sw.radius);
    }
  }

  private createCelestialBeamVFX(x: number) {
    if (!this.p) return;
    this.screenShake = 8;
    const groundY = this.p.height * 0.72;
    this.celestialBeams.push({
      x,
      groundY,
      alpha: 255,
      width: 68
    });
    this.shockwaves.push({
      x,
      y: groundY,
      radius: 16,
      maxRadius: 175,
      color: '#ec4899',
      alpha: 240,
      weight: 5.5
    });
    for (let i = 0; i < 45; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 58,
        y: Math.random() * this.p.height,
        vx: (Math.random() - 0.5) * 2.5,
        vy: -Math.random() * 9 - 3,
        size: Math.random() * 8 + 3,
        color: i % 2 === 0 ? '#f472b6' : '#facc15',
        alpha: 255,
        decay: 8
      });
    }
  }

  private emitShieldParticles(x: number, y: number) {
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 62 + Math.random() * 14;
      this.particles.push({
        x: x + Math.cos(angle) * r,
        y: y + Math.sin(angle) * r,
        vx: -Math.cos(angle) * 1.5,
        vy: -Math.sin(angle) * 1.5,
        size: 3.5,
        color: '#eab308',
        alpha: 210,
        decay: 9
      });
    }
  }

  private drawWarpPortal(p: p5) {
    if (!this.portalActive) return;
    const centerX = p.width / 2;
    const centerY = p.height * 0.44;
    const hasKey = (this.playerStats.portalKeys || 0) > 0;

    this.portalScale = p.min(1.0, this.portalScale + 0.04);
    const radius = 115 * this.portalScale;

    p.push();
    p.translate(centerX, centerY);

    const rotation = p.frameCount * 0.035;
    for (let i = 3; i >= 0; i--) {
      p.noFill();
      p.stroke(hasKey ? (i % 2 === 0 ? '#38bdf8' : '#c084fc') : '#f43f5e');
      p.strokeWeight(4.5 - i * 0.8);
      p.rotate(rotation * (i % 2 === 0 ? 1 : -1));
      p.ellipse(0, 0, radius * (0.5 + i * 0.2), radius * (0.4 + i * 0.15));
    }

    p.noStroke();
    p.fill(24, 12, 48, 220);
    p.circle(0, 0, radius * 0.8);

    // Keyhole emblem inside portal
    p.fill(hasKey ? '#fbbf24' : '#ef4444');
    p.circle(0, -8, 18);
    p.triangle(-7, -2, 7, -2, 10, 18);

    p.pop();
  }

  private drawWarpEffect(p: p5) {
    this.warpProgress += 0.022;
    const w = p.width;
    const h = p.height;

    p.push();
    p.translate(w / 2, h / 2);
    p.stroke(255, 255, 255, 180 * (1 - this.warpProgress));
    p.strokeWeight(2.5);
    for (let i = 0; i < 32; i++) {
      const angle = (p.TWO_PI / 32) * i;
      const len = p.map(this.warpProgress, 0, 1, 50, w * 0.85);
      p.line(Math.cos(angle) * 40, Math.sin(angle) * 40, Math.cos(angle) * len, Math.sin(angle) * len);
    }
    p.pop();

    p.noStroke();
    p.fill(255, 255, 255, p.sin(this.warpProgress * p.PI) * 230);
    p.rect(0, 0, w, h);

    if (this.warpProgress >= 1.0) {
      this.isWarping = false;
      this.portalActive = false;
      this.onPortalStateChange?.(false);
      this.playerStats.wave++;
      this.currentRealmIndex = (this.playerStats.wave - 1) % WORLD_REALMS.length;
      this.zombiesSpawnedThisWave = 0;
      this.zombiesRequiredForWave = 10 + this.playerStats.wave * 3;
      this.onRealmWarpComplete(this.currentRealmIndex);
    }
  }

  private updateAndDrawParticles(p: p5) {
    p.noStroke();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.alpha -= pt.decay;

      if (pt.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.fill(pt.color);
      p.circle(pt.x, pt.y, pt.size);
    }
  }

  private updateAndDrawFloatingTexts(p: p5) {
    p.textAlign(p.CENTER, p.CENTER);
    p.textStyle(p.BOLD);

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 3.2;

      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }

      p.textSize(ft.size || 18);
      p.fill(ft.color);
      p.text(ft.text, ft.x, ft.y);
    }
  }

  private drawSingleHandSkeleton(p: p5, lm: HandPoint[], trail: { x: number; y: number }[]) {
    const w = p.width;
    const h = p.height;
    const skinId = this.playerStats.upgrades?.handSkin || 'arcane_wireframe';
    const skin = HAND_SKINS_CATALOG.find((s) => s.id === skinId) || HAND_SKINS_CATALOG[0];
    const mainColor =
      this.playerStats.upgrades?.handGlowOverride ||
      this.latestGesture?.matchedSpell?.color ||
      skin.primaryColor;

    // Motion Trail Ribbon behind palm center
    const palmX = (1 - lm[9].x) * w;
    const palmY = lm[9].y * h;
    trail.push({ x: palmX, y: palmY });
    if (trail.length > 14) trail.shift();

    if (trail.length > 1) {
      for (let i = 1; i < trail.length; i++) {
        p.stroke(mainColor + Math.floor((i / trail.length) * 140).toString(16).padStart(2, '0'));
        p.strokeWeight((i / trail.length) * 14);
        p.line(trail[i - 1].x, trail[i - 1].y, trail[i].x, trail[i].y);
      }
    }

    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [5, 9], [9, 10], [10, 11], [11, 12],
      [9, 13], [13, 14], [14, 15], [15, 16],
      [13, 17], [17, 18], [18, 19], [19, 20],
      [0, 17]
    ];

    // High-contrast outer glow aura so hands stand out unmistakably
    p.stroke(mainColor + '66');
    p.strokeWeight(12);
    for (const [s, e] of connections) {
      p.line((1 - lm[s].x) * w, lm[s].y * h, (1 - lm[e].x) * w, lm[e].y * h);
    }

    // Crisp core bone conduit
    p.stroke(skin.secondaryColor);
    p.strokeWeight(4);
    for (const [s, e] of connections) {
      p.line((1 - lm[s].x) * w, lm[s].y * h, (1 - lm[e].x) * w, lm[e].y * h);
    }

    // Palm Aura Circle
    p.noFill();
    p.stroke(mainColor + 'aa');
    p.strokeWeight(2.5);
    p.circle(palmX, palmY, 54 + Math.sin(p.frameCount * 0.15) * 6);

    // Stylized Joints per Hand Skin
    for (let i = 0; i < lm.length; i++) {
      const x = (1 - lm[i].x) * w;
      const y = lm[i].y * h;
      const isTip = [4, 8, 12, 16, 20].includes(i);
      const sz = isTip ? 14 : 7.5;

      if (skin.jointStyle === 'diamond') {
        p.noStroke();
        p.fill(isTip ? mainColor : skin.secondaryColor);
        p.quad(x, y - sz * 0.6, x + sz * 0.6, y, x, y + sz * 0.6, x - sz * 0.6, y);
      } else if (skin.jointStyle === 'ring') {
        p.noFill();
        p.stroke(isTip ? mainColor : skin.secondaryColor);
        p.strokeWeight(2.5);
        p.circle(x, y, sz);
      } else if (skin.jointStyle === 'claw' && isTip) {
        p.noStroke();
        p.fill(mainColor);
        p.triangle(x - 6, y + 4, x + 6, y + 4, x, y - 14);
      } else {
        p.noStroke();
        p.fill(isTip ? mainColor : skin.secondaryColor);
        p.circle(x, y, sz);
      }
    }
  }

  private drawDualHandSkeletalOverlay(p: p5) {
    if (!this.latestGesture || !this.latestGesture.handFound) {
      this.leftHandTrail = [];
      this.rightHandTrail = [];
      return;
    }

    const g = this.latestGesture;
    const spellColor =
      this.playerStats.upgrades?.handGlowOverride || g.matchedSpell?.color || '#38bdf8';

    if (g.dualLandmarks?.left) {
      this.drawSingleHandSkeleton(p, g.dualLandmarks.left, this.leftHandTrail);
    } else {
      this.leftHandTrail = [];
    }

    if (g.dualLandmarks?.right) {
      this.drawSingleHandSkeleton(p, g.dualLandmarks.right, this.rightHandTrail);
    } else {
      this.rightHandTrail = [];
    }

    if (g.dualLandmarks?.left && g.dualLandmarks?.right && g.leftHandState && g.rightHandState) {
      const leftPalmX = (1 - g.leftHandState.palmCenter.x) * p.width;
      const leftPalmY = g.leftHandState.palmCenter.y * p.height;
      const rightPalmX = (1 - g.rightHandState.palmCenter.x) * p.width;
      const rightPalmY = g.rightHandState.palmCenter.y * p.height;

      p.stroke(spellColor + '99');
      p.strokeWeight(3.5);
      p.line(leftPalmX, leftPalmY, rightPalmX, rightPalmY);
    }

    // Aim Crosshair
    const aim = g.aimPoint;
    p.push();
    p.translate(aim.x, aim.y);
    p.noFill();
    p.stroke(spellColor);
    p.strokeWeight(3);
    p.circle(0, 0, g.isDualBoosted ? 52 : 42);
    p.line(-28, 0, -9, 0);
    p.line(9, 0, 28, 0);
    p.line(0, -28, 0, -9);
    p.line(0, 9, 0, 28);

    if (this.activeTitanShield) {
      p.rotate(p.frameCount * 0.06);
      p.stroke('#eab308');
      p.strokeWeight(4);
      p.circle(0, 0, 105);
      p.rectMode(p.CENTER);
      p.rect(0, 0, 88, 88, 16);
    }

    p.pop();
  }

  private createExplosionParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5.2 + 1.8;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 6 + 3,
        color,
        alpha: 255,
        decay: Math.random() * 8 + 4
      });
    }
  }

  public restart(newStats: PlayerStats) {
    this.playerStats = { ...newStats };
    this.zombies = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.groundDecals = [];
    this.lightningBranches = [];
    this.bloodTendrils = [];
    this.shockwaves = [];
    this.celestialBeams = [];
    this.slashFlashes = [];
    this.frostCrystals = [];
    this.dyingZombies = [];
    this.currentRealmIndex = 0;
    this.zombiesSpawnedThisWave = 0;
    this.zombiesRequiredForWave = 10;
    this.portalActive = false;
    this.onPortalStateChange?.(false);
    this.isWarping = false;
    this.isRunning = true;
    this.pendingTutorialAfterWave = null;
  }

  public destroy() {
    if (this.p) {
      this.p.remove();
      this.p = null;
    }
  }
}
