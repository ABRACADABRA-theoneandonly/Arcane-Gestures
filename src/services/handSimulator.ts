import { HandPoint, GestureId } from '../types/game';

function generateSingleHand(
  gestureType: 'palm' | 'fist' | 'index' | 'peace' | 'trident' | 'puppeteer' | 'beast' | 'thumb',
  wristX: number,
  wristY: number,
  isLeft: boolean
): HandPoint[] {
  const wrist: HandPoint = { x: wristX, y: wristY };
  const landmarks: HandPoint[] = new Array(21).fill(null).map(() => ({ x: wrist.x, y: wrist.y }));
  landmarks[0] = wrist;

  const sign = isLeft ? -1 : 1;
  const isOpen = gestureType === 'palm';
  const isIndex = gestureType === 'index';
  const isPeace = gestureType === 'peace';
  const isTrident = gestureType === 'trident';
  const isPuppeteer = gestureType === 'puppeteer';
  const isBeast = gestureType === 'beast';
  const isThumb = gestureType === 'thumb';

  if (isPuppeteer) {
    landmarks[5] = { x: wrist.x + sign * 0.02, y: wrist.y + 0.07 };
    landmarks[6] = { x: wrist.x + sign * 0.025, y: wrist.y + 0.12 };
    landmarks[7] = { x: wrist.x + sign * 0.02, y: wrist.y + 0.16 };
    landmarks[8] = { x: wrist.x + sign * 0.015, y: wrist.y + 0.20 };

    landmarks[9] = { x: wrist.x + sign * 0.05, y: wrist.y + 0.08 };
    landmarks[10] = { x: wrist.x + sign * 0.055, y: wrist.y + 0.13 };
    landmarks[11] = { x: wrist.x + sign * 0.05, y: wrist.y + 0.17 };
    landmarks[12] = { x: wrist.x + sign * 0.045, y: wrist.y + 0.21 };

    landmarks[13] = { x: wrist.x + sign * 0.08, y: wrist.y + 0.07 };
    landmarks[14] = { x: wrist.x + sign * 0.085, y: wrist.y + 0.12 };
    landmarks[15] = { x: wrist.x + sign * 0.08, y: wrist.y + 0.16 };
    landmarks[16] = { x: wrist.x + sign * 0.075, y: wrist.y + 0.19 };

    landmarks[17] = { x: wrist.x + sign * 0.11, y: wrist.y + 0.06 };
    landmarks[18] = { x: wrist.x + sign * 0.115, y: wrist.y + 0.10 };
    landmarks[19] = { x: wrist.x + sign * 0.11, y: wrist.y + 0.14 };
    landmarks[20] = { x: wrist.x + sign * 0.105, y: wrist.y + 0.17 };

    landmarks[1] = { x: wrist.x - sign * 0.02, y: wrist.y + 0.04 };
    landmarks[2] = { x: wrist.x - sign * 0.04, y: wrist.y + 0.07 };
    landmarks[3] = { x: wrist.x - sign * 0.05, y: wrist.y + 0.10 };
    landmarks[4] = { x: wrist.x - sign * 0.04, y: wrist.y + 0.13 };
    return landmarks;
  }

  // Index finger (5 to 8)
  const indexExt = isOpen || isIndex || isPeace || isTrident;
  landmarks[5] = { x: wrist.x + sign * 0.02, y: wrist.y - 0.08 };
  landmarks[6] = { x: wrist.x + sign * 0.02, y: wrist.y - (indexExt ? 0.14 : isBeast ? 0.13 : 0.09) };
  landmarks[7] = { x: wrist.x + sign * 0.02, y: wrist.y - (indexExt ? 0.20 : isBeast ? 0.16 : 0.07) };
  landmarks[8] = { x: wrist.x + sign * 0.02, y: wrist.y - (indexExt ? 0.26 : isBeast ? 0.14 : 0.05) };

  // Middle finger (9 to 12)
  const midExt = isOpen || isPeace || isTrident;
  landmarks[9] = { x: wrist.x + sign * 0.05, y: wrist.y - 0.09 };
  landmarks[10] = { x: wrist.x + sign * 0.05, y: wrist.y - (midExt ? 0.15 : isBeast ? 0.14 : 0.10) };
  landmarks[11] = { x: wrist.x + sign * 0.05, y: wrist.y - (midExt ? 0.21 : isBeast ? 0.17 : 0.07) };
  landmarks[12] = { x: wrist.x + sign * 0.05, y: wrist.y - (midExt ? 0.28 : isBeast ? 0.15 : 0.05) };

  // Ring finger (13 to 16)
  const ringExt = isOpen || isTrident;
  landmarks[13] = { x: wrist.x + sign * 0.08, y: wrist.y - 0.08 };
  landmarks[14] = { x: wrist.x + sign * 0.08, y: wrist.y - (ringExt ? 0.14 : isBeast ? 0.13 : 0.09) };
  landmarks[15] = { x: wrist.x + sign * 0.08, y: wrist.y - (ringExt ? 0.19 : isBeast ? 0.15 : 0.07) };
  landmarks[16] = { x: wrist.x + sign * 0.08, y: wrist.y - (ringExt ? 0.24 : isBeast ? 0.13 : 0.05) };

  // Pinky finger (17 to 20)
  const pinkyExt = isOpen;
  landmarks[17] = { x: wrist.x + sign * 0.11, y: wrist.y - 0.07 };
  landmarks[18] = { x: wrist.x + sign * 0.11, y: wrist.y - (pinkyExt ? 0.12 : isBeast ? 0.11 : 0.08) };
  landmarks[19] = { x: wrist.x + sign * 0.11, y: wrist.y - (pinkyExt ? 0.16 : isBeast ? 0.13 : 0.06) };
  landmarks[20] = { x: wrist.x + sign * 0.11, y: wrist.y - (pinkyExt ? 0.20 : isBeast ? 0.11 : 0.04) };

  // Thumb (1 to 4)
  const thumbExt = isOpen || isThumb;
  landmarks[1] = { x: wrist.x - sign * 0.02, y: wrist.y - 0.04 };
  landmarks[2] = { x: wrist.x - sign * 0.04, y: wrist.y - 0.07 };
  landmarks[3] = { x: wrist.x - sign * 0.07, y: wrist.y - (thumbExt ? 0.12 : isBeast ? 0.09 : 0.08) };
  landmarks[4] = { x: wrist.x - sign * (thumbExt ? 0.09 : 0.05), y: wrist.y - (thumbExt ? 0.18 : isBeast ? 0.08 : 0.09) };

  return landmarks;
}

export class HandSimulator {
  public generateDualSimulatedLandmarks(
    gesture: GestureId,
    mouseXNorm: number,
    mouseYNorm: number,
    forceSingleHand: boolean = false
  ): { left: HandPoint[] | null; right: HandPoint[] } {
    const centerY = Math.min(0.85, Math.max(0.2, mouseYNorm));
    const centerX = Math.min(0.85, Math.max(0.15, mouseXNorm));

    let leftType: 'palm' | 'fist' | 'index' | 'peace' | 'trident' | 'puppeteer' | 'beast' | 'thumb' = 'palm';
    let rightType: 'palm' | 'fist' | 'index' | 'peace' | 'trident' | 'puppeteer' | 'beast' | 'thumb' = 'palm';
    let separation = 0.18;

    switch (gesture) {
      case 'DUAL_PALMS_FORWARD':
        leftType = 'palm';
        rightType = 'palm';
        separation = 0.16;
        break;
      case 'FIST_AND_PALM':
        leftType = 'fist';
        rightType = forceSingleHand ? 'trident' : 'palm';
        separation = 0.18;
        break;
      case 'CROSS_INDEX_POINT':
        leftType = 'index';
        rightType = 'index';
        separation = 0.12;
        break;
      case 'DUAL_RAISED_FISTS':
        leftType = 'fist';
        rightType = 'fist';
        separation = 0.15;
        break;
      case 'DUAL_PEACE_SPREAD':
        leftType = 'peace';
        rightType = 'peace';
        separation = 0.22;
        break;
      case 'CUPPED_PALMS_TOUCHING':
        leftType = 'palm';
        rightType = 'palm';
        separation = 0.07;
        break;
      case 'DUAL_PUPPETEER_CLAWS':
        leftType = 'puppeteer';
        rightType = 'puppeteer';
        separation = 0.16;
        break;
      case 'THUMBS_UP_DUAL':
        leftType = 'thumb';
        rightType = 'thumb';
        separation = 0.16;
        break;
      case 'DUAL_BEAST_TALONS':
        leftType = 'beast';
        rightType = 'beast';
        separation = 0.19;
        break;
      default:
        leftType = 'palm';
        rightType = 'palm';
        separation = 0.16;
        break;
    }

    const leftWristX = Math.max(0.08, centerX - separation / 2);
    const rightWristX = Math.min(0.92, centerX + separation / 2);

    return {
      left: forceSingleHand ? null : generateSingleHand(leftType, leftWristX, centerY, true),
      right: generateSingleHand(rightType, forceSingleHand ? centerX : rightWristX, centerY, false)
    };
  }

  public generateSimulatedLandmarks(gesture: GestureId, mouseXNorm: number, mouseYNorm: number): HandPoint[] {
    const dual = this.generateDualSimulatedLandmarks(gesture, mouseXNorm, mouseYNorm, true);
    return dual.right;
  }
}

export const handSimulator = new HandSimulator();
