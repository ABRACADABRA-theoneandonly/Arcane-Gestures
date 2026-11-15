import React, { useState } from 'react';
import { DetectedGesture, GestureId } from '../types/game';
import { SPELL_CATALOG } from '../data/spellsAndRealms';
import { X, Camera, RefreshCw, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

interface HandCalibrationModalProps {
  onClose: () => void;
  gesture: DetectedGesture | null;
  cameraActive: boolean;
  onRestartCamera: () => void;
  onSimulateGesture: (gesture: GestureId) => void;
}

export const HandCalibrationModal: React.FC<HandCalibrationModalProps> = ({
  onClose,
  gesture,
  cameraActive,
  onRestartCamera,
  onSimulateGesture
}) => {
  const [selectedPractice, setSelectedPractice] = useState<GestureId>('DUAL_PALMS_FORWARD');

  const fingers = ['thumb', 'index', 'middle', 'ring', 'pinky'] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-cinzel text-xl font-bold text-slate-100">
                MediaPipe Dual-Hand AI Vision
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Calibrate 2-hand webcam tracking and multi-point finger landmark geometry
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

        <div className="space-y-4 overflow-y-auto pr-1">
          {/* Camera Status Card */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${cameraActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <div>
                <div className="text-sm font-semibold text-slate-200">
                  {cameraActive ? 'Dual Webcam Vision Online (MediaPipe Hands)' : 'Camera Standby / Off'}
                </div>
                <div className="text-xs text-slate-400">
                  {cameraActive 
                    ? `Tracking ${gesture?.handsCount || 0} hand(s) · 1 hand casts standard powers, 2 hands empower or cast specials` 
                    : 'Ensure lighting is adequate and raise 1 or 2 hands in frame'}
                </div>
              </div>
            </div>
            <button
              onClick={onRestartCamera}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{cameraActive ? 'Re-calibrate' : 'Start Camera'}</span>
            </button>
          </div>

          {/* Real-time Two-Hand Landmark Telemetry */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Live Dual-Hand Finger Status
              </h3>
              <span className="text-xs font-mono text-amber-400 font-semibold">
                {gesture?.handsCount || 0} / 2 Hands Detected
              </span>
            </div>

            {/* Left Hand Telemetry */}
            <div>
              <div className="text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <span>Left Hand:</span>
                <span className="text-slate-500 font-normal">
                  {gesture?.leftHandState ? (gesture.leftHandState.isOpenPalm ? 'Open Palm' : gesture.leftHandState.isFist ? 'Fist' : gesture.leftHandState.isClaw ? 'Claw' : 'Detected') : 'Not Detected'}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
                {fingers.map((finger) => {
                  const isExt = gesture?.leftHandState?.fingerStates[finger] ?? false;
                  return (
                    <div
                      key={`left_${finger}`}
                      className={`p-2 rounded-lg border text-[10px] ${
                        isExt
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      <div className="capitalize">{finger}</div>
                      <div className="text-[9px] mt-0.5">{isExt ? 'Ext' : 'Curl'}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Hand Telemetry */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <span>Right Hand:</span>
                <span className="text-slate-500 font-normal">
                  {gesture?.rightHandState ? (gesture.rightHandState.isOpenPalm ? 'Open Palm' : gesture.rightHandState.isFist ? 'Fist' : gesture.rightHandState.isClaw ? 'Claw' : 'Detected') : 'Not Detected'}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
                {fingers.map((finger) => {
                  const isExt = gesture?.rightHandState?.fingerStates[finger] ?? false;
                  return (
                    <div
                      key={`right_${finger}`}
                      className={`p-2 rounded-lg border text-[10px] ${
                        isExt
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      <div className="capitalize">{finger}</div>
                      <div className="text-[9px] mt-0.5">{isExt ? 'Ext' : 'Curl'}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Two-Hand Gesture */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Classified Two-Hand Gesture:</span>
              <span className="font-semibold text-amber-400 font-mono">
                {gesture?.handFound ? gesture.gesture : 'Awaiting Both Hands'}
              </span>
            </div>
          </div>

          {/* Practice / Simulator Buttons */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Practice / Simulate Two-Handed Gestures
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Click any dual-gesture configuration below to test dual hand landmark simulation directly:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SPELL_CATALOG.map((spell) => {
                const isMatching = gesture?.gesture === spell.gesture;
                return (
                  <button
                    key={spell.id}
                    onClick={() => {
                      setSelectedPractice(spell.gesture);
                      onSimulateGesture(spell.gesture);
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isMatching
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="font-semibold text-xs">{spell.gestureName}</div>
                      {spell.isForbidden && (
                        <span className="text-[10px] font-bold text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800">
                          Forbidden
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">{spell.name}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
