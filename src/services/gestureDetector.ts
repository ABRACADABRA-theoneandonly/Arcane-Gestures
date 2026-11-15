import {
  HandPoint,
  DetectedGesture,
  GestureId,
  SingleHandState,
  SpellId,
  GestureVerificationReport,
  FingerCheck,
  HandFeedback
} from '../types/game';
import { SPELL_CATALOG } from '../data/spellsAndRealms';

function dist2D(p1: HandPoint, p2: HandPoint): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.hypot(dx, dy);
}

export class GestureDetector {
  private smoothedLeft: HandPoint[] = [];
  private smoothedRight: HandPoint[] = [];
  private readonly alpha = 0.68; // Snappy smoothing for better hand responsiveness
  private previousGesture: GestureId = 'NONE';
  private gestureHoldFrames: number = 0;
  private readonly requiredHoldFrames = 2;

  private smoothPoints(target: HandPoint[], incoming: HandPoint[]): HandPoint[] {
    if (target.length !== incoming.length) {
      return incoming.map((p) => ({ ...p }));
    }
    const result: HandPoint[] = [];
    for (let i = 0; i < incoming.length; i++) {
      result.push({
        x: this.alpha * incoming[i].x + (1 - this.alpha) * target[i].x,
        y: this.alpha * incoming[i].y + (1 - this.alpha) * target[i].y,
        z:
          incoming[i].z !== undefined && target[i].z !== undefined
            ? this.alpha * (incoming[i].z || 0) + (1 - this.alpha) * (target[i].z || 0)
            : undefined
      });
    }
    return result;
  }

  public analyzeHand(lm: HandPoint[], isLeft: boolean): SingleHandState {
    const wrist = lm[0];

    // Finger extension checks using wrist-to-tip vs wrist-to-PIP & tip-to-MCP ratios
    const indexMcp = lm[5];
    const indexPip = lm[6];
    const indexTip = lm[8];
    const indexExtended =
      dist2D(wrist, indexTip) > dist2D(wrist, indexPip) * 1.1 &&
      dist2D(indexTip, indexMcp) > dist2D(indexPip, indexMcp) * 1.18;

    const middleMcp = lm[9];
    const middlePip = lm[10];
    const middleTip = lm[12];
    const middleExtended =
      dist2D(wrist, middleTip) > dist2D(wrist, middlePip) * 1.1 &&
      dist2D(middleTip, middleMcp) > dist2D(middlePip, middleMcp) * 1.18;

    const ringMcp = lm[13];
    const ringPip = lm[14];
    const ringTip = lm[16];
    const ringExtended =
      dist2D(wrist, ringTip) > dist2D(wrist, ringPip) * 1.1 &&
      dist2D(ringTip, ringMcp) > dist2D(ringPip, ringMcp) * 1.18;

    const pinkyMcp = lm[17];
    const pinkyPip = lm[18];
    const pinkyTip = lm[20];
    const pinkyExtended =
      dist2D(wrist, pinkyTip) > dist2D(wrist, pinkyPip) * 1.1 &&
      dist2D(pinkyTip, pinkyMcp) > dist2D(pinkyPip, pinkyMcp) * 1.18;

    const thumbMcp = lm[2];
    const thumbTip = lm[4];
    const thumbExtended = dist2D(thumbTip, pinkyMcp) > dist2D(thumbMcp, pinkyMcp) * 1.1;

    const fingerStates = {
      thumb: thumbExtended,
      index: indexExtended,
      middle: middleExtended,
      ring: ringExtended,
      pinky: pinkyExtended
    };

    // Orientation checks for Special 2-Hand Forbidden Spells
    const isHandFacingDown = wrist.y < (indexMcp.y + middleMcp.y) / 2 - 0.025;

    const indexClaw =
      (indexTip.y > indexPip.y || isHandFacingDown) &&
      dist2D(indexTip, indexMcp) < dist2D(indexPip, indexMcp) * 1.38;
    const middleClaw =
      (middleTip.y > middlePip.y || isHandFacingDown) &&
      dist2D(middleTip, middleMcp) < dist2D(middlePip, middleMcp) * 1.38;
    const isClaw =
      (isHandFacingDown && (indexClaw || middleClaw)) ||
      (indexClaw && middleClaw && indexTip.y > indexPip.y + 0.015);

    const indexCurledHalf =
      dist2D(indexTip, indexMcp) < dist2D(indexPip, indexMcp) * 1.35 &&
      dist2D(indexTip, indexMcp) > dist2D(indexPip, indexMcp) * 0.68;
    const middleCurledHalf =
      dist2D(middleTip, middleMcp) < dist2D(middlePip, middleMcp) * 1.35 &&
      dist2D(middleTip, middleMcp) > dist2D(middlePip, middleMcp) * 0.68;
    const isBeastTalon = !isHandFacingDown && !isClaw && indexCurledHalf && middleCurledHalf && !thumbExtended;

    // Standard single-hand & dual-hand postures
    const isFist =
      !indexExtended && !middleExtended && !ringExtended && !pinkyExtended && !isBeastTalon && !isClaw && !thumbExtended;
    const isThumbUp =
      thumbExtended &&
      !indexExtended &&
      !middleExtended &&
      !ringExtended &&
      !pinkyExtended &&
      thumbTip.y < thumbMcp.y - 0.025;
    const isIndexPointing =
      indexExtended && !middleExtended && !ringExtended && !pinkyExtended && !isClaw && !isBeastTalon;
    const isPeace =
      indexExtended &&
      middleExtended &&
      !ringExtended &&
      !pinkyExtended &&
      dist2D(indexTip, middleTip) > 0.025 &&
      !isClaw &&
      !isBeastTalon;
    const isThreeFingerTrident =
      indexExtended &&
      middleExtended &&
      ringExtended &&
      !pinkyExtended &&
      !isClaw &&
      !isBeastTalon;
    const isOpenPalm =
      indexExtended && middleExtended && ringExtended && pinkyExtended && !isClaw && !isBeastTalon;

    const palmCenterX = (wrist.x + indexMcp.x + pinkyMcp.x + middleMcp.x) / 4;
    const palmCenterY = (wrist.y + indexMcp.y + pinkyMcp.y + middleMcp.y) / 4;

    return {
      handFound: true,
      isLeft,
      landmarks: lm,
      fingerStates,
      isClaw,
      isBeastTalon,
      isFist,
      isOpenPalm,
      isIndexPointing,
      isPeace,
      isThreeFingerTrident,
      isThumbUp,
      wristPoint: wrist,
      palmCenter: { x: palmCenterX, y: palmCenterY }
    };
  }

  public processDualLandmarks(
    dualInput: { left: HandPoint[] | null; right: HandPoint[] | null },
    unlockedSpellIds: string[] | undefined,
    playerLevel: number,
    screenWidth: number,
    screenHeight: number
  ): DetectedGesture {
    let leftState: SingleHandState | null = null;
    let rightState: SingleHandState | null = null;
    let handsCount = 0;

    if (dualInput.left && dualInput.left.length >= 21) {
      this.smoothedLeft = this.smoothPoints(this.smoothedLeft, dualInput.left);
      leftState = this.analyzeHand(this.smoothedLeft, true);
      handsCount++;
    } else {
      this.smoothedLeft = [];
    }

    if (dualInput.right && dualInput.right.length >= 21) {
      this.smoothedRight = this.smoothPoints(this.smoothedRight, dualInput.right);
      rightState = this.analyzeHand(this.smoothedRight, false);
      handsCount++;
    } else {
      this.smoothedRight = [];
    }

    if (handsCount === 0 || (!leftState && !rightState)) {
      this.gestureHoldFrames = 0;
      this.previousGesture = 'NONE';
      return {
        gesture: 'NONE',
        matchedSpell: null,
        isUnlocked: false,
        confidence: 0,
        aimPoint: { x: screenWidth / 2, y: screenHeight / 2 },
        handFound: false,
        handsCount: 0,
        isDualBoosted: false,
        leftHandState: null,
        rightHandState: null,
        rawLandmarks: undefined,
        dualLandmarks: { left: null, right: null }
      };
    }

    let rawGesture: GestureId = 'NONE';
    let confidence = 0.5;
    let aimX = 0.5;
    let aimY = 0.5;
    let isDualBoosted = false;

    if (leftState && rightState) {
      const palmDist = dist2D(leftState.palmCenter, rightState.palmCenter);
      const indexTipDist = dist2D(leftState.landmarks[8], rightState.landmarks[8]);

      // STRICT 2-HAND SPECIALS FIRST
      // 1. CELESTIAL PRISM BEAM: Both hands brought close together
      if (palmDist < 0.17 || indexTipDist < 0.11) {
        rawGesture = 'CUPPED_PALMS_TOUCHING';
        confidence = 0.99;
        aimX = 1 - (leftState.palmCenter.x + rightState.palmCenter.x) / 2;
        aimY = (leftState.palmCenter.y + rightState.palmCenter.y) / 2;
      }
      // 2. FORBIDDEN BLOOD BENDER: Both hands downward puppeteer claws
      else if (leftState.isClaw && rightState.isClaw) {
        rawGesture = 'DUAL_PUPPETEER_CLAWS';
        confidence = 0.99;
        aimX = 1 - (leftState.palmCenter.x + rightState.palmCenter.x) / 2;
        aimY = (leftState.palmCenter.y + rightState.palmCenter.y) / 2;
      }
      // 3. FORBIDDEN ANIMAL PUPPETRY: Both hands upright beast talons
      else if (leftState.isBeastTalon && rightState.isBeastTalon) {
        rawGesture = 'DUAL_BEAST_TALONS';
        confidence = 0.99;
        aimX = 1 - (leftState.palmCenter.x + rightState.palmCenter.x) / 2;
        aimY = (leftState.palmCenter.y + rightState.palmCenter.y) / 2;
      }
      // STANDARD SPELLS IN DUAL MODE (TRIGGER DUAL BOOST!)
      // 4. WATER BLAST: Fist + Palm OR Dual 3-Finger Tridents
      else if (
        (leftState.isFist && rightState.isOpenPalm) ||
        (rightState.isFist && leftState.isOpenPalm) ||
        (leftState.isThreeFingerTrident && rightState.isThreeFingerTrident)
      ) {
        rawGesture = 'FIST_AND_PALM';
        confidence = 0.98;
        isDualBoosted = true;
        const directingHand = leftState.isOpenPalm || leftState.isThreeFingerTrident ? leftState : rightState;
        aimX = 1 - directingHand.palmCenter.x;
        aimY = directingHand.palmCenter.y;
      }
      // 5. TITAN AEGIS: Both fists
      else if (leftState.isFist && rightState.isFist) {
        rawGesture = 'DUAL_RAISED_FISTS';
        confidence = 0.98;
        isDualBoosted = true;
        aimX = 1 - (leftState.palmCenter.x + rightState.palmCenter.x) / 2;
        aimY = (leftState.palmCenter.y + rightState.palmCenter.y) / 2;
      }
      // 6. METEOR: Both thumbs up
      else if (leftState.isThumbUp && rightState.isThumbUp) {
        rawGesture = 'THUMBS_UP_DUAL';
        confidence = 0.98;
        isDualBoosted = true;
        aimX = 1 - (leftState.palmCenter.x + rightState.palmCenter.x) / 2;
        aimY = (leftState.palmCenter.y + rightState.palmCenter.y) / 2;
      }
      // 7. LIGHTNING: Both index pointing
      else if (leftState.isIndexPointing && rightState.isIndexPointing) {
        rawGesture = 'CROSS_INDEX_POINT';
        confidence = 0.98;
        isDualBoosted = true;
        aimX = 1 - (leftState.landmarks[8].x + rightState.landmarks[8].x) / 2;
        aimY = (leftState.landmarks[8].y + rightState.landmarks[8].y) / 2;
      }
      // 8. FROST NOVA: Both peace signs
      else if (leftState.isPeace && rightState.isPeace) {
        rawGesture = 'DUAL_PEACE_SPREAD';
        confidence = 0.98;
        isDualBoosted = true;
        aimX = 1 - (leftState.palmCenter.x + rightState.palmCenter.x) / 2;
        aimY = (leftState.palmCenter.y + rightState.palmCenter.y) / 2;
      }
      // 9. FIREBALL: Both palms open
      else if (leftState.isOpenPalm && rightState.isOpenPalm) {
        rawGesture = 'DUAL_PALMS_FORWARD';
        confidence = 0.98;
        isDualBoosted = true;
        aimX = 1 - (leftState.palmCenter.x + rightState.palmCenter.x) / 2;
        aimY = (leftState.palmCenter.y + rightState.palmCenter.y) / 2;
      }
      // Mixed fallback if one hand is casting a 1-hand spell while the other hand is idle in frame
      else {
        const primary = rightState.isOpenPalm || rightState.isThreeFingerTrident || rightState.isIndexPointing || rightState.isPeace || rightState.isThumbUp || rightState.isFist
          ? rightState
          : leftState;
        aimX = 1 - primary.palmCenter.x;
        aimY = primary.palmCenter.y;
        if (primary.isThreeFingerTrident) {
          rawGesture = 'FIST_AND_PALM';
          confidence = 0.88;
        } else if (primary.isIndexPointing) {
          rawGesture = 'CROSS_INDEX_POINT';
          confidence = 0.9;
          aimX = 1 - primary.landmarks[8].x;
          aimY = primary.landmarks[8].y;
        } else if (primary.isPeace) {
          rawGesture = 'DUAL_PEACE_SPREAD';
          confidence = 0.9;
        } else if (primary.isThumbUp) {
          rawGesture = 'THUMBS_UP_DUAL';
          confidence = 0.9;
        } else if (primary.isOpenPalm) {
          rawGesture = 'DUAL_PALMS_FORWARD';
          confidence = 0.9;
        } else if (primary.isFist) {
          rawGesture = 'DUAL_RAISED_FISTS';
          confidence = 0.88;
        }
      }
    } else {
      // SINGLE-HAND MODE: All standard spells work seamlessly!
      // Special/Forbidden spells (CUPPED_PALMS_TOUCHING, DUAL_PUPPETEER_CLAWS, DUAL_BEAST_TALONS)
      // strictly DO NOT activate with only 1 hand.
      const single = (leftState || rightState)!;
      aimX = 1 - single.palmCenter.x;
      aimY = single.palmCenter.y;

      if (single.isThreeFingerTrident) {
        rawGesture = 'FIST_AND_PALM';
        confidence = 0.92;
      } else if (single.isOpenPalm) {
        rawGesture = 'DUAL_PALMS_FORWARD';
        confidence = 0.94;
      } else if (single.isFist) {
        rawGesture = 'DUAL_RAISED_FISTS';
        confidence = 0.94;
      } else if (single.isIndexPointing) {
        rawGesture = 'CROSS_INDEX_POINT';
        confidence = 0.94;
        aimX = 1 - single.landmarks[8].x;
        aimY = single.landmarks[8].y;
      } else if (single.isPeace) {
        rawGesture = 'DUAL_PEACE_SPREAD';
        confidence = 0.94;
      } else if (single.isThumbUp) {
        rawGesture = 'THUMBS_UP_DUAL';
        confidence = 0.94;
      }
    }

    if (rawGesture === this.previousGesture && rawGesture !== 'NONE') {
      this.gestureHoldFrames++;
    } else {
      this.previousGesture = rawGesture;
      this.gestureHoldFrames = 1;
    }

    const stableGesture: GestureId = this.gestureHoldFrames >= this.requiredHoldFrames ? rawGesture : 'NONE';

    const screenAimPoint = {
      x: Math.max(20, Math.min(screenWidth - 20, aimX * screenWidth)),
      y: Math.max(20, Math.min(screenHeight - 20, aimY * screenHeight))
    };

    const matchedSpell = SPELL_CATALOG.find((s) => s.gesture === stableGesture) || null;

    let isUnlocked = false;
    if (matchedSpell) {
      if (unlockedSpellIds && unlockedSpellIds.length > 0) {
        isUnlocked = unlockedSpellIds.includes(matchedSpell.id);
      } else {
        isUnlocked = playerLevel >= matchedSpell.requiredLevel;
      }
    }

    return {
      gesture: stableGesture,
      matchedSpell,
      isUnlocked,
      confidence,
      aimPoint: screenAimPoint,
      handFound: true,
      handsCount,
      isDualBoosted,
      leftHandState: leftState,
      rightHandState: rightState,
      rawLandmarks: (leftState || rightState)?.landmarks,
      dualLandmarks: {
        left: leftState?.landmarks || null,
        right: rightState?.landmarks || null
      }
    };
  }

  public verifyGestureForSpell(
    targetSpellId: SpellId,
    dualInput: { left: HandPoint[] | null; right: HandPoint[] | null },
    screenWidth: number = 800,
    screenHeight: number = 600
  ): GestureVerificationReport {
    const targetSpell = SPELL_CATALOG.find((s) => s.id === targetSpellId) || SPELL_CATALOG[0];
    const detected = this.processDualLandmarks(dualInput, [targetSpellId], 99, screenWidth, screenHeight);

    const leftHand = detected.leftHandState;
    const rightHand = detected.rightHandState;
    const handsPresent = (leftHand ? 1 : 0) + (rightHand ? 1 : 0);
    const requiresTwo = Boolean(targetSpell.requiresTwoHands);

    const detectedSpell = detected.matchedSpell;

    const buildFingerChecks = (
      state: SingleHandState | null,
      expectedFingers: { thumb: boolean; index: boolean; middle: boolean; ring: boolean; pinky: boolean }
    ): { checks: FingerCheck[]; hints: string[]; match: boolean } => {
      if (!state) {
        return {
          checks: [],
          hints: ['Optional 2nd hand not in frame'],
          match: false
        };
      }

      const fingers: ('thumb' | 'index' | 'middle' | 'ring' | 'pinky')[] = [
        'thumb',
        'index',
        'middle',
        'ring',
        'pinky'
      ];
      const checks: FingerCheck[] = [];
      const hints: string[] = [];
      let allMatch = true;

      fingers.forEach((f) => {
        const actual = state.fingerStates[f];
        const expected = expectedFingers[f];
        const isOk = actual === expected;
        if (!isOk) allMatch = false;

        let instruction = '';
        if (!isOk) {
          if (expected && !actual) {
            instruction = `Extend your ${f} finger`;
            hints.push(`Extend your ${f} finger`);
          } else {
            instruction = `Curl your ${f} finger`;
            hints.push(`Curl your ${f} finger`);
          }
        } else {
          instruction = expected ? `${f} extended` : `${f} curled`;
        }

        checks.push({
          finger: f,
          isExtended: actual,
          expectedExtended: expected,
          isMatch: isOk,
          instruction
        });
      });

      return { checks, hints, match: allMatch };
    };

    let leftPose = 'Open Palm';
    let rightPose = 'Open Palm';
    let expectedLeftFingers = { thumb: true, index: true, middle: true, ring: true, pinky: true };
    let expectedRightFingers = { thumb: true, index: true, middle: true, ring: true, pinky: true };

    switch (targetSpell.gesture) {
      case 'DUAL_PALMS_FORWARD':
        leftPose = 'Open Palm';
        rightPose = 'Open Palm';
        expectedLeftFingers = { thumb: true, index: true, middle: true, ring: true, pinky: true };
        expectedRightFingers = { thumb: true, index: true, middle: true, ring: true, pinky: true };
        break;
      case 'FIST_AND_PALM':
        leftPose = handsPresent === 2 ? 'Pressure Fist' : '3-Finger Trident';
        rightPose = handsPresent === 2 ? 'Hydro Open Palm' : '3-Finger Trident';
        if (handsPresent === 2) {
          expectedLeftFingers = { thumb: false, index: false, middle: false, ring: false, pinky: false };
          expectedRightFingers = { thumb: true, index: true, middle: true, ring: true, pinky: true };
        } else {
          expectedLeftFingers = { thumb: false, index: true, middle: true, ring: true, pinky: false };
          expectedRightFingers = { thumb: false, index: true, middle: true, ring: true, pinky: false };
        }
        break;
      case 'CROSS_INDEX_POINT':
        leftPose = 'Index Pointer';
        rightPose = 'Index Pointer';
        expectedLeftFingers = { thumb: true, index: true, middle: false, ring: false, pinky: false };
        expectedRightFingers = { thumb: true, index: true, middle: false, ring: false, pinky: false };
        break;
      case 'DUAL_RAISED_FISTS':
        leftPose = 'Titan Fist';
        rightPose = 'Titan Fist';
        expectedLeftFingers = { thumb: false, index: false, middle: false, ring: false, pinky: false };
        expectedRightFingers = { thumb: false, index: false, middle: false, ring: false, pinky: false };
        break;
      case 'DUAL_PEACE_SPREAD':
        leftPose = 'Peace V-Sign';
        rightPose = 'Peace V-Sign';
        expectedLeftFingers = { thumb: false, index: true, middle: true, ring: false, pinky: false };
        expectedRightFingers = { thumb: false, index: true, middle: true, ring: false, pinky: false };
        break;
      case 'CUPPED_PALMS_TOUCHING':
        leftPose = 'Joined Palm (2-Hand Required)';
        rightPose = 'Joined Palm (2-Hand Required)';
        expectedLeftFingers = { thumb: true, index: true, middle: true, ring: true, pinky: true };
        expectedRightFingers = { thumb: true, index: true, middle: true, ring: true, pinky: true };
        break;
      case 'THUMBS_UP_DUAL':
        leftPose = 'Thumb Up';
        rightPose = 'Thumb Up';
        expectedLeftFingers = { thumb: true, index: false, middle: false, ring: false, pinky: false };
        expectedRightFingers = { thumb: true, index: false, middle: false, ring: false, pinky: false };
        break;
      case 'DUAL_PUPPETEER_CLAWS':
        leftPose = 'Downward Puppeteer Claw';
        rightPose = 'Downward Puppeteer Claw';
        expectedLeftFingers = { thumb: false, index: false, middle: false, ring: false, pinky: false };
        expectedRightFingers = { thumb: false, index: false, middle: false, ring: false, pinky: false };
        break;
      case 'DUAL_BEAST_TALONS':
        leftPose = 'Upright Beast Talon';
        rightPose = 'Upright Beast Talon';
        expectedLeftFingers = { thumb: false, index: false, middle: false, ring: false, pinky: false };
        expectedRightFingers = { thumb: false, index: false, middle: false, ring: false, pinky: false };
        break;
    }

    const leftCheck = buildFingerChecks(leftHand, expectedLeftFingers);
    const rightCheck = buildFingerChecks(rightHand, expectedRightFingers);

    const isPerformingOtherSpell = Boolean(
      detected.gesture !== 'NONE' && detected.gesture !== targetSpell.gesture && detectedSpell
    );

    const hasEnoughHands = requiresTwo ? handsPresent >= 2 : handsPresent >= 1;
    const isDirectMatch = hasEnoughHands && detected.gesture === targetSpell.gesture;

    let blockReason: string | null = null;
    let overallFeedback = '';

    if (handsPresent === 0) {
      blockReason = requiresTwo
        ? 'Two Hands Required: Place BOTH hands clearly in front of your webcam.'
        : 'No Hand Detected: Raise 1 hand (or both hands for Dual Boost) into view.';
      overallFeedback = blockReason;
    } else if (requiresTwo && handsPresent < 2) {
      blockReason = `Special 2-Hand Spell: "${targetSpell.name}" strictly requires BOTH hands in view.`;
      overallFeedback = 'Raise your second hand into camera view.';
    } else if (isPerformingOtherSpell && detectedSpell) {
      blockReason = `Wrong Hand Movement: You are casting "${detectedSpell.name}"! Switch to "${targetSpell.name}" (${targetSpell.gestureName}).`;
      overallFeedback = `Blocked: ${detectedSpell.name} is not allowed here.`;
    } else if (!isDirectMatch) {
      const hint =
        (rightHand ? rightCheck.hints[0] : null) ||
        (leftHand ? leftCheck.hints[0] : null) ||
        'Align your fingers with the target posture.';
      blockReason = `Adjust Hand: ${hint}`;
      overallFeedback = hint;
    } else {
      overallFeedback = detected.isDualBoosted
        ? '✓ Dual-Boosted Synergy Locked! Hold steady to unleash empowered power!'
        : '✓ Perfect Hand Posture! Hold steady to unleash continuous power!';
    }

    let accuracyScore = 0;
    if (!hasEnoughHands) {
      accuracyScore = handsPresent === 1 && requiresTwo ? 40 : 0;
    } else if (isDirectMatch) {
      accuracyScore = 100;
    } else if (isPerformingOtherSpell) {
      accuracyScore = 0;
    } else {
      const activeChecks = [...(leftHand ? leftCheck.checks : []), ...(rightHand ? rightCheck.checks : [])];
      const passed = activeChecks.filter((c) => c.isMatch).length;
      accuracyScore = activeChecks.length > 0 ? Math.round((passed / activeChecks.length) * 85) : 0;
    }

    const describeHand = (h: SingleHandState | null) => {
      if (!h) return 'Not in View';
      if (h.isThreeFingerTrident) return '3-Finger Trident';
      if (h.isOpenPalm) return 'Open Palm';
      if (h.isFist) return 'Fist';
      if (h.isIndexPointing) return 'Index Point';
      if (h.isPeace) return 'Peace V';
      if (h.isThumbUp) return 'Thumb Up';
      if (h.isClaw) return 'Puppeteer Claw';
      if (h.isBeastTalon) return 'Beast Talon';
      return 'Adjusting';
    };

    const leftHandFeedback: HandFeedback = {
      handFound: Boolean(leftHand),
      poseDetected: describeHand(leftHand),
      expectedPose: leftPose,
      isMatch: Boolean(leftHand) && (isDirectMatch || leftCheck.match),
      fingerChecks: leftCheck.checks,
      missingFingerHints: leftCheck.hints
    };

    const rightHandFeedback: HandFeedback = {
      handFound: Boolean(rightHand),
      poseDetected: describeHand(rightHand),
      expectedPose: rightPose,
      isMatch: Boolean(rightHand) && (isDirectMatch || rightCheck.match),
      fingerChecks: rightCheck.checks,
      missingFingerHints: rightCheck.hints
    };

    return {
      isMatch: isDirectMatch,
      targetSpell,
      detectedGesture: detected.gesture,
      detectedSpell,
      isPerformingOtherSpell,
      otherSpellName: detectedSpell?.name,
      handsPresentCount: handsPresent,
      leftHand: leftHandFeedback,
      rightHand: rightHandFeedback,
      blockReason,
      overallFeedback,
      accuracyScore
    };
  }

  public reset() {
    this.smoothedLeft = [];
    this.smoothedRight = [];
    this.previousGesture = 'NONE';
    this.gestureHoldFrames = 0;
  }
}

export const gestureDetector = new GestureDetector();
