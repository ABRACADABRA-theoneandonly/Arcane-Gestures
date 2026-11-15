import { HandPoint } from '../types/game';

export interface DualHandLandmarks {
  left: HandPoint[] | null;
  right: HandPoint[] | null;
  bothFound: boolean;
  handCount: number;
  allLandmarks: HandPoint[][];
}

type ResultsCallback = (dualHands: DualHandLandmarks) => void;

interface MediaPipeHandsInstance {
  setOptions: (options: Record<string, unknown>) => void;
  onResults: (cb: (results: {
    multiHandLandmarks?: Array<Array<{ x: number; y: number; z?: number }>>;
    multiHandedness?: Array<{ label: string; score: number }>;
  }) => void) => void;
  send: (input: { image: HTMLVideoElement }) => Promise<void>;
  close?: () => void;
}

export class CameraManager {
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private hands: MediaPipeHandsInstance | null = null;
  private isProcessing: boolean = false;
  private animationFrameId: number | null = null;
  private onResultsCallback: ResultsCallback | null = null;
  private cameraStatus: 'uninitialized' | 'requesting' | 'active' | 'denied' | 'error' = 'uninitialized';
  private errorMessage: string = '';

  public getStatus() {
    return {
      status: this.cameraStatus,
      errorMessage: this.errorMessage
    };
  }

  public getStream(): MediaStream | null {
    return this.stream;
  }

  public async initialize(
    videoEl: HTMLVideoElement,
    onResults: ResultsCallback
  ): Promise<boolean> {
    this.videoElement = videoEl;
    this.onResultsCallback = onResults;
    this.cameraStatus = 'requesting';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      this.stream = stream;
      this.videoElement.srcObject = stream;
      await this.videoElement.play();

      await this.initMediaPipe();

      this.cameraStatus = 'active';
      this.startLoop();
      return true;
    } catch (err: unknown) {
      console.warn('Camera or MediaPipe initialization warning:', err);
      this.cameraStatus = 'denied';
      this.errorMessage = err instanceof Error ? err.message : 'Webcam access denied or unavailable.';
      return false;
    }
  }

  private async initMediaPipe() {
    const globalHands = (window as unknown as {
      Hands?: new (config: { locateFile: (file: string) => string }) => MediaPipeHandsInstance;
    }).Hands;

    if (globalHands) {
      this.hands = new globalHands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      // Lower thresholds to 0.45 for fast, reliable single and dual hand pickup
      this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.45,
        minTrackingConfidence: 0.45
      });

      this.hands.onResults((results) => {
        if (!this.onResultsCallback) return;

        const rawSets = results.multiHandLandmarks || [];
        const handedness = results.multiHandedness || [];

        if (rawSets.length === 0) {
          this.onResultsCallback({
            left: null,
            right: null,
            bothFound: false,
            handCount: 0,
            allLandmarks: []
          });
          return;
        }

        const formattedSets: HandPoint[][] = rawSets.map((raw) =>
          raw.map((p) => ({ x: p.x, y: p.y, z: p.z }))
        );

        let leftHand: HandPoint[] | null = null;
        let rightHand: HandPoint[] | null = null;

        if (formattedSets.length === 1) {
          const label = handedness[0]?.label?.toLowerCase();
          if (label === 'left') {
            // In webcam selfie view, MediaPipe "Left" corresponds to user's right hand when mirrored
            rightHand = formattedSets[0];
          } else if (label === 'right') {
            leftHand = formattedSets[0];
          } else {
            const avgX = formattedSets[0][0].x;
            if (avgX > 0.5) rightHand = formattedSets[0];
            else leftHand = formattedSets[0];
          }
        } else if (formattedSets.length >= 2) {
          const firstAvgX = formattedSets[0][0].x;
          const secondAvgX = formattedSets[1][0].x;
          if (firstAvgX < secondAvgX) {
            leftHand = formattedSets[0];
            rightHand = formattedSets[1];
          } else {
            leftHand = formattedSets[1];
            rightHand = formattedSets[0];
          }
        }

        this.onResultsCallback({
          left: leftHand,
          right: rightHand,
          bothFound: Boolean(leftHand && rightHand),
          handCount: formattedSets.length,
          allLandmarks: formattedSets
        });
      });
    }
  }

  private startLoop() {
    const loop = async () => {
      if (!this.stream || !this.videoElement) return;

      if (this.videoElement.readyState >= 2 && this.hands && !this.isProcessing) {
        this.isProcessing = true;
        try {
          await this.hands.send({ image: this.videoElement });
        } catch {
          // Frame skip
        } finally {
          this.isProcessing = false;
        }
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    if (this.hands && this.hands.close) {
      this.hands.close();
      this.hands = null;
    }

    this.cameraStatus = 'uninitialized';
  }
}

export const cameraManager = new CameraManager();
