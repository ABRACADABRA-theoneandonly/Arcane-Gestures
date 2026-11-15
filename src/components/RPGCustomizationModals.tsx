import React from 'react';
import {
  HandSkinId,
  HouseConfig,
  PlayerStats,
  RPGOutfit
} from '../types/game';
import { HAND_SKINS_CATALOG } from '../data/spellsAndRealms';
import { audioEngine } from '../services/audioEngine';
import { X, Shirt, Home, Hand, Check, Sparkles, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

// ==================== 1. HAND CUSTOMIZER MODAL (Fighting Arena) ====================
interface HandCustomizerModalProps {
  stats: PlayerStats;
  onUpdateStats: (newStats: Partial<PlayerStats>) => void;
  onClose: () => void;
}

export const HandCustomizerModal: React.FC<HandCustomizerModalProps> = ({
  stats,
  onUpdateStats,
  onClose
}) => {
  const currentSkinId = stats.upgrades.handSkin || 'arcane_wireframe';
  const currentGlow = stats.upgrades.handGlowOverride || '';

  const selectSkin = (skinId: HandSkinId, costAP: number) => {
    audioEngine.playArmorUpgrade();
    onUpdateStats({
      upgrades: {
        ...stats.upgrades,
        arcanePoints: Math.max(
          0,
          stats.upgrades.arcanePoints - (skinId === 'arcane_wireframe' ? 0 : Math.min(costAP, stats.upgrades.arcanePoints))
        ),
        handSkin: skinId
      }
    });
  };

  const activeSkin = HAND_SKINS_CATALOG.find((s) => s.id === currentSkinId) || HAND_SKINS_CATALOG[0];
  const previewColor = currentGlow || activeSkin.primaryColor;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Hand className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-cinzel text-xl font-bold text-slate-100">Customize Arena Hands</h2>
              <p className="text-xs text-slate-400">Personalize hand gauntlets, joint sigils, and spell motion trails</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 overflow-y-auto pr-1">
          {/* Live Hand Preview */}
          <div className="md:col-span-5 bg-slate-950 rounded-xl border border-slate-800 p-4 flex flex-col items-center justify-center">
            <svg viewBox="0 0 180 200" className="w-40 h-44">
              <defs>
                <radialGradient id="handAura" cx="50%" cy="55%" r="48%">
                  <stop offset="0%" stopColor={previewColor} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={previewColor} stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="90" cy="112" r="70" fill="url(#handAura)" />
              {[
                [90, 170, 50, 125], [50, 125, 35, 95],
                [90, 170, 68, 95], [68, 95, 62, 42],
                [90, 170, 90, 90], [90, 90, 90, 30],
                [90, 170, 112, 95], [112, 95, 118, 45],
                [90, 170, 132, 108], [132, 108, 144, 65]
              ].map(([x1, y1, x2, y2], idx) => (
                <g key={idx}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={previewColor} strokeWidth="9" strokeLinecap="round" opacity="0.35" />
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={activeSkin.secondaryColor} strokeWidth="3.5" strokeLinecap="round" />
                </g>
              ))}
              {[
                [90, 170], [35, 95], [62, 42], [90, 30], [118, 45], [144, 65], [68, 95], [90, 90], [112, 95]
              ].map(([cx, cy], idx) => (
                <g key={idx}>
                  {activeSkin.jointStyle === 'diamond' ? (
                    <polygon points={`${cx},${cy - 7} ${cx + 7},${cy} ${cx},${cy + 7} ${cx - 7},${cy}`} fill={activeSkin.secondaryColor} stroke={previewColor} strokeWidth="2" />
                  ) : activeSkin.jointStyle === 'ring' ? (
                    <circle cx={cx} cy={cy} r="7" fill="none" stroke={previewColor} strokeWidth="3" />
                  ) : (
                    <circle cx={cx} cy={cy} r="6" fill={activeSkin.secondaryColor} stroke={previewColor} strokeWidth="2" />
                  )}
                </g>
              ))}
            </svg>
            <div className="text-xs font-semibold text-slate-200 mt-1">{activeSkin.name}</div>
            <div className="text-[11px] text-amber-400 font-mono mt-1">{stats.upgrades.arcanePoints} AP Available</div>

            <div className="mt-4 w-full">
              <div className="text-[11px] text-slate-400 mb-1.5 text-center">Aura Glow Tint Override</div>
              <div className="flex items-center justify-center gap-2">
                {['', '#38bdf8', '#f97316', '#ef4444', '#10b981', '#ec4899', '#facc15'].map((clr) => (
                  <button
                    key={clr || 'default'}
                    onClick={() => onUpdateStats({ upgrades: { ...stats.upgrades, handGlowOverride: clr || undefined } })}
                    className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                      currentGlow === clr ? 'border-white scale-110' : 'border-slate-700'
                    }`}
                    style={{ backgroundColor: clr || activeSkin.primaryColor }}
                    title={clr || 'Skin Default'}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-7 space-y-2.5">
            {HAND_SKINS_CATALOG.map((skin) => {
              const isSelected = currentSkinId === skin.id;
              return (
                <button
                  key={skin.id}
                  onClick={() => selectSkin(skin.id, isSelected ? 0 : Math.min(skin.costAP, stats.upgrades.arcanePoints))}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-slate-800/90 border-sky-400 shadow-lg'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: skin.primaryColor }} />
                      <span className="text-sm font-semibold text-slate-100">{skin.name}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{skin.description}</p>
                  </div>
                  <div className="shrink-0 text-xs font-bold">
                    {isSelected ? (
                      <span className="text-emerald-400 flex items-center gap-1"><Check className="w-4 h-4" /> Active</span>
                    ) : (
                      <span className="text-amber-400">{skin.costAP === 0 ? 'Free' : `${skin.costAP} AP`}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== 2. RPG OUTFIT CUSTOMIZER MODAL (Gender, Hairstyles & Fantasy Character Creator) ====================
interface RPGOutfitModalProps {
  outfit: RPGOutfit;
  playerName?: string;
  onSavePlayerName?: (name: string) => void;
  onSaveOutfit: (outfit: RPGOutfit) => void;
  onClose: () => void;
  labels?: {
    outfitTitle: string;
    outfitSubtitle: string;
    genderLabel: string;
    female: string;
    male: string;
    neutral: string;
    hairstyleLabel: string;
    bangsLabel?: string;
    rearHairLabel?: string;
    skinToneLabel: string;
    wearOutfit: string;
  };
}

export const RPGOutfitModal: React.FC<RPGOutfitModalProps> = ({
  outfit,
  playerName,
  onSavePlayerName,
  onSaveOutfit,
  onClose,
  labels
}) => {
  const update = (patch: Partial<RPGOutfit>) => onSaveOutfit({ ...outfit, ...patch });
  const gender = outfit.gender || 'female';
  const hairStyle = outfit.hairStyle || 'long_wavy';
  const bangsStyle = outfit.bangsStyle || 'side_bangs';
  const rearHairStyle = outfit.rearHairStyle || 'default';

  const t = {
    outfitTitle: labels?.outfitTitle || 'Heroic Wardrobe & Character Creator',
    outfitSubtitle: labels?.outfitSubtitle || 'Choose gender, hairstyles, bangs, rear hair, skin tone, cloaks & weapons',
    genderLabel: labels?.genderLabel || 'Hero Gender & Silhouette',
    female: labels?.female || 'Female',
    male: labels?.male || 'Male',
    neutral: labels?.neutral || 'Neutral',
    hairstyleLabel: labels?.hairstyleLabel || 'Hairstyle',
    bangsLabel: labels?.bangsLabel || 'Bangs & Side Fringe',
    rearHairLabel: labels?.rearHairLabel || 'Rear / Back Hair',
    skinToneLabel: labels?.skinToneLabel || 'Skin Tone',
    wearOutfit: labels?.wearOutfit || 'Wear This Hero Look'
  };

  // Gender-aware shoulder/waist proportions
  const shoulderW = gender === 'male' ? 29 : gender === 'female' ? 23 : 26;
  const waistW = gender === 'female' ? 24 : 30;
  const skirtFlare = gender === 'female' ? 35 : 30;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <Shirt className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-cinzel text-lg font-bold text-slate-100">{t.outfitTitle}</h2>
              <p className="text-xs text-slate-400">{t.outfitSubtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 overflow-y-auto pr-1 items-start">
          {/* Detailed Layered Fantasy Hero SVG Preview */}
          <div className="md:col-span-5 bg-gradient-to-b from-[#1e1b18] to-[#12100e] rounded-xl border border-amber-900/40 p-4 flex flex-col items-center">
            <svg viewBox="0 0 180 232" className="w-52 h-64">
              {/* Ground Shadow */}
              <ellipse cx="90" cy={gender === 'female' ? 218 : 204} rx={gender === 'male' ? 40 : 34} ry="8" fill="#000000" opacity="0.55" />

              {/* Billowing Cloak behind character */}
              {outfit.cloakColor !== 'none' && (
                <path
                  d={`M${90 - shoulderW} 68 L${90 + shoulderW} 68 L140 184 Q90 194 40 184 Z`}
                  fill={outfit.cloakColor}
                  stroke="#0f172a"
                  strokeWidth="2"
                />
              )}

              {/* Rear / Back Hair Layer */}
              {rearHairStyle === 'long_flowing' && (
                <g>
                  <path
                    d="M64 38 Q53 78 58 118 Q74 126 90 122 Q106 126 122 118 Q127 78 116 38 Q90 21 64 38 Z"
                    fill={outfit.hairColor}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />
                  <path d="M68 65 Q64 90 67 114" fill="none" stroke="#0f172a" strokeWidth="1" opacity="0.3" />
                  <path d="M112 65 Q116 90 113 114" fill="none" stroke="#0f172a" strokeWidth="1" opacity="0.3" />
                </g>
              )}
              {rearHairStyle === 'shoulder_layered' && (
                <path
                  d="M66 39 Q56 64 59 86 Q72 88 80 78 L100 78 Q108 88 121 86 Q124 64 114 39 Q90 22 66 39 Z"
                  fill={outfit.hairColor}
                  stroke="#0f172a"
                  strokeWidth="1.5"
                />
              )}
              {rearHairStyle === 'spiky_nape' && (
                <path
                  d="M68 42 L60 62 L68 65 L64 79 L77 73 L90 80 L103 73 L116 79 L112 65 L120 62 L112 42 Q90 24 68 42 Z"
                  fill={outfit.hairColor}
                  stroke="#0f172a"
                  strokeWidth="1.5"
                />
              )}
              {rearHairStyle === 'twin_tails' && (
                <g>
                  <path d="M72 44 Q49 64 52 106 Q64 98 73 66 Z" fill={outfit.hairColor} stroke="#0f172a" strokeWidth="1.4" />
                  <path d="M108 44 Q131 64 128 106 Q116 98 107 66 Z" fill={outfit.hairColor} stroke="#0f172a" strokeWidth="1.4" />
                  <circle cx="70" cy="52" r="2.6" fill="#eab308" stroke="#0f172a" strokeWidth="0.9" />
                  <circle cx="110" cy="52" r="2.6" fill="#eab308" stroke="#0f172a" strokeWidth="0.9" />
                </g>
              )}
              {rearHairStyle === 'default' && hairStyle === 'long_wavy' && (
                <path d="M67 40 Q58 76 65 110 Q90 116 115 110 Q122 76 113 40 Q90 22 67 40 Z" fill={outfit.hairColor} stroke="#0f172a" strokeWidth="1.5" />
              )}
              {hairStyle === 'ponytail' && (
                <g>
                  <path d="M96 27 Q132 30 128 88 Q116 78 106 46 Z" fill={outfit.hairColor} stroke="#0f172a" strokeWidth="1.5" />
                  <circle cx="99" cy="28" r="3.5" fill="#eab308" stroke="#0f172a" strokeWidth="1" />
                </g>
              )}
              {hairStyle === 'twin_braids' && (
                <g fill={outfit.hairColor} stroke="#0f172a" strokeWidth="1.3">
                  <ellipse cx="69" cy="58" rx="5.5" ry="9" />
                  <ellipse cx="67" cy="73" rx="5" ry="8.5" />
                  <ellipse cx="66" cy="87" rx="4.2" ry="7" />
                  <ellipse cx="111" cy="58" rx="5.5" ry="9" />
                  <ellipse cx="113" cy="73" rx="5" ry="8.5" />
                  <ellipse cx="114" cy="87" rx="4.2" ry="7" />
                </g>
              )}

              {/* Legs & Fantasy Leather Boots */}
              {gender === 'male' ? (
                <g>
                  {/* Athletic wide-stance muscular thighs & calves */}
                  <path
                    d="M68 128 Q63 148 67 166 L61 196 L76 196 L83 166 Q86 150 90 138 Q95 152 104 168 L113 200 L127 200 L118 164 Q117 144 111 128 Z"
                    fill={outfit.pantsColor}
                    stroke="#1c1917"
                    strokeWidth="1.8"
                  />
                  {/* Knee anatomy accents */}
                  <path d="M70 158 Q74 162 78 158" fill="none" stroke="#0f172a" strokeWidth="1.3" opacity="0.45" />
                  <path d="M104 160 Q109 164 113 160" fill="none" stroke="#0f172a" strokeWidth="1.3" opacity="0.45" />
                  {/* Heroic Boots planted in wide stance */}
                  <path d="M64 170 L81 170 L78 198 L54 201 L59 190 Z" fill="#451a03" stroke="#1c1917" strokeWidth="1.6" />
                  <path d="M104 172 L120 172 L130 202 L113 202 L110 190 Z" fill="#451a03" stroke="#1c1917" strokeWidth="1.6" />
                </g>
              ) : gender === 'female' ? (
                <g>
                  {/* Long athletic contoured thighs, knees & calves in graceful contrapposto stance */}
                  <path
                    d="M68 128 Q63 148 72 170 L70 212 L81 212 L84 170 Q86 148 90 137 Q94 150 100 172 L107 214 L118 214 L112 170 Q116 146 112 128 Z"
                    fill={outfit.pantsColor}
                    stroke="#1c1917"
                    strokeWidth="1.6"
                  />
                  {/* Subtle knee contour */}
                  <path d="M73 168 Q77 171 81 168" fill="none" stroke="#0f172a" strokeWidth="1.1" opacity="0.4" />
                  <path d="M99 169 Q104 172 108 169" fill="none" stroke="#0f172a" strokeWidth="1.1" opacity="0.4" />
                  {/* Sleek Longer Heroine Boots */}
                  <path d="M69 182 L82 182 L81 213 L65 216 L69 204 Z" fill="#451a03" stroke="#1c1917" strokeWidth="1.5" />
                  <path d="M102 183 L115 183 L125 216 L109 216 L106 204 Z" fill="#451a03" stroke="#1c1917" strokeWidth="1.5" />
                </g>
              ) : (
                <g>
                  {/* Sturdy Armored Vanguard Legs, Pointed Knee Poleyns & Sabaton Boots */}
                  <path
                    d="M68 128 L66 194 L83 194 L87 138 L93 138 L97 194 L114 194 L112 128 Z"
                    fill={outfit.pantsColor}
                    stroke="#1c1917"
                    strokeWidth="1.6"
                  />
                  {/* Metallic Shin Greaves */}
                  <path d="M67 162 L83 162 L82 190 L67 190 Z" fill="#94a3b8" stroke="#334155" strokeWidth="1.4" />
                  <path d="M97 162 L113 162 L113 190 L98 190 Z" fill="#94a3b8" stroke="#334155" strokeWidth="1.4" />
                  {/* Pointed Diamond Knee Guards (Poleyns) */}
                  <polygon points="75,149 84,159 75,169 66,159" fill="#cbd5e1" stroke="#334155" strokeWidth="1.4" />
                  <polygon points="105,149 114,159 105,169 96,159" fill="#cbd5e1" stroke="#334155" strokeWidth="1.4" />
                  {/* Armored Sabaton Boots */}
                  <path d="M66 184 L83 184 L85 200 L61 200 Z" fill="#64748b" stroke="#1c1917" strokeWidth="1.5" />
                  <path d="M97 184 L114 184 L119 200 L95 200 Z" fill="#64748b" stroke="#1c1917" strokeWidth="1.5" />
                </g>
              )}

              {/* Neck & Clavicle Line */}
              {gender === 'male' && (
                <path
                  d="M80 58 L80 65 L58 72 L122 72 L100 65 L100 58 Z"
                  fill={outfit.skinTone}
                  stroke="#1c1917"
                  strokeWidth="1.5"
                />
              )}
              {gender === 'female' && (
                <path
                  d="M84 57 L84 65 L66 72 L114 72 L96 65 L96 57 Z"
                  fill={outfit.skinTone}
                  stroke="#1c1917"
                  strokeWidth="1.4"
                />
              )}
              {gender === 'neutral' && (
                <g>
                  <path
                    d="M82 57 L82 65 L63 72 L117 72 L98 65 L98 57 Z"
                    fill={outfit.skinTone}
                    stroke="#1c1917"
                    strokeWidth="1.4"
                  />
                  {/* High-Neck Armored Gambeson Collar */}
                  <path d="M80 64 Q90 71 100 64 L103 73 L77 73 Z" fill={outfit.topColor} stroke="#1c1917" strokeWidth="1.4" />
                </g>
              )}

              {/* Gender-Aware Layered Tunic / Armor Torso */}
              {gender === 'male' ? (
                <g>
                  {/* Heroic V-Taper Athletic Torso */}
                  <path
                    d="M57 72 Q90 67 123 72 Q126 86 116 98 L109 118 L113 140 Q90 148 67 140 L71 118 L64 98 Q54 86 57 72 Z"
                    fill={outfit.topColor}
                    stroke="#1c1917"
                    strokeWidth="2"
                  />
                  {/* Sculpted Pectoral & Core Contour */}
                  <path d="M67 88 Q81 95 90 90 Q99 95 113 88" fill="none" stroke="#0f172a" strokeWidth="1.6" opacity="0.45" />
                  <line x1="90" y1="73" x2="90" y2="112" stroke="#0f172a" strokeWidth="1.2" opacity="0.3" />
                  <path d="M77 104 Q90 107 103 104" fill="none" stroke="#0f172a" strokeWidth="1.1" opacity="0.28" />
                </g>
              ) : gender === 'female' ? (
                <g>
                  {/* Hourglass Athletic Heroine Torso matching reference sheet */}
                  <path
                    d="M66 72 Q90 68 114 72 Q115 84 109 94 L103 111 Q115 123 114 139 Q90 147 66 139 Q65 123 77 111 L71 94 Q65 84 66 72 Z"
                    fill={outfit.topColor}
                    stroke="#1c1917"
                    strokeWidth="1.8"
                  />
                  {/* Sculpted Chest & Waist Contour */}
                  <path d="M72 82 Q80 91 88 85" fill="none" stroke="#0f172a" strokeWidth="1.4" opacity="0.4" />
                  <path d="M92 85 Q100 91 108 82" fill="none" stroke="#0f172a" strokeWidth="1.4" opacity="0.4" />
                  <path d="M80 98 Q90 101 100 98" fill="none" stroke="#0f172a" strokeWidth="1" opacity="0.25" />
                </g>
              ) : (
                <g>
                  {/* Vanguard Armored Tunic + Segmented Hip Tassets & Diagonal Baldric Strap */}
                  <path
                    d="M63 72 Q90 68 117 72 L113 114 L67 114 Z"
                    fill={outfit.topColor}
                    stroke="#1c1917"
                    strokeWidth="1.8"
                  />
                  {/* Central Split Tunic Flap */}
                  <path d="M80 114 L100 114 L98 144 L90 138 L82 144 Z" fill={outfit.topColor} stroke="#1c1917" strokeWidth="1.4" />
                  {/* Segmented 3-Tiered Hip Armor Tassets (Left & Right) */}
                  <g fill="#94a3b8" stroke="#1e293b" strokeWidth="1.3">
                    <path d="M66 116 L80 118 L79 127 L64 125 Z" />
                    <path d="M64 126 L79 128 L78 137 L62 135 Z" />
                    <path d="M62 136 L78 138 L77 148 L61 145 Z" />
                    <path d="M114 116 L100 118 L101 127 L116 125 Z" />
                    <path d="M116 126 L101 128 L102 137 L118 135 Z" />
                    <path d="M118 136 L102 138 L103 148 L119 145 Z" />
                  </g>
                  {/* Diagonal Leather Baldric Chest Strap */}
                  <path d="M107 71 L113 73 L73 114 L67 112 Z" fill="#78350f" stroke="#1c1917" strokeWidth="1.2" />
                  <circle cx="88" cy="93" r="2.2" fill="#eab308" />
                </g>
              )}

              {outfit.topStyle === 'knight_plate' && (
                <>
                  <rect x="74" y="72" width="32" height="44" rx="4" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
                  <path d="M84 118 L96 118 L99 160 L81 160 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
                </>
              )}
              {outfit.topStyle === 'mage_robe' && (
                <path d="M72 70 L90 105 L108 70 L102 152 L78 152 Z" fill="#1e293b" opacity="0.45" />
              )}
              {outfit.topStyle === 'ranger_cloak' && (
                <path d="M68 72 L112 72 L106 135 L74 135 Z" fill="#3f6212" stroke="#1a2e05" strokeWidth="1.5" />
              )}
              {outfit.topStyle === 'druid_silk' && (
                <path d="M70 72 L110 72 L120 176 L60 176 Z" fill="#7dd3fc" opacity="0.7" />
              )}
              {outfit.topStyle === 'berserker_hide' && (
                <>
                  <path d="M64 70 L84 70 L114 114 L96 120 Z" fill="#78350f" />
                  <ellipse cx="90" cy="72" rx="28" ry="8" fill="#d6d3d1" />
                </>
              )}
              {outfit.topStyle === 'doctor_coat' && (
                <rect x="86" y="70" width="8" height="78" fill="#38bdf8" />
              )}

              {/* Leather Belt & Brass Buckle */}
              <rect
                x={gender === 'male' ? 69 : gender === 'female' ? 75 : 90 - waistW - 2}
                y="110"
                width={gender === 'male' ? 42 : gender === 'female' ? 30 : (waistW + 2) * 2}
                height="8.5"
                rx="2"
                fill="#451a03"
                stroke="#1c1917"
                strokeWidth="1.2"
              />
              <rect x="84" y="109" width="12" height="10.5" rx="2" fill="#eab308" stroke="#78350f" strokeWidth="1.2" />

              {/* Arms & Gauntlets */}
              {gender === 'male' ? (
                <g>
                  {/* Left Muscular Arm: Raised Bent Fighting-Stance Fist (like reference pose) */}
                  <path
                    d="M57 72 Q46 76 47 93 L34 95 L34 106 L55 107 Q61 104 61 92 L63 82 Z"
                    fill={outfit.skinTone}
                    stroke="#1c1917"
                    strokeWidth="1.6"
                  />
                  {/* Forearm Wrist Bracer + Clenched Fist (Left) */}
                  <rect x="38" y="95" width="11" height="11" rx="2" fill="#451a03" stroke="#1c1917" strokeWidth="1.1" />
                  <rect x="26" y="93" width="13" height="12" rx="4" fill={outfit.skinTone} stroke="#1c1917" strokeWidth="1.6" />
                  <line x1="30" y1="96" x2="30" y2="103" stroke="#1c1917" strokeWidth="1" opacity="0.55" />
                  <line x1="34" y1="96" x2="34" y2="103" stroke="#1c1917" strokeWidth="1" opacity="0.55" />

                  {/* Right Muscular Arm: Broad Deltoid, Flexed Bicep & Clenched Fist Extended Out */}
                  <path
                    d="M123 72 Q136 76 135 95 L143 119 L132 123 L123 101 L119 86 Z"
                    fill={outfit.skinTone}
                    stroke="#1c1917"
                    strokeWidth="1.6"
                  />
                  {/* Forearm Bracer + Clenched Fist (Right) */}
                  <rect x="129" y="109" width="12" height="11" rx="2" transform="rotate(-12 135 114)" fill="#451a03" stroke="#1c1917" strokeWidth="1.1" />
                  <rect x="131" y="120" width="13" height="13" rx="4" fill={outfit.skinTone} stroke="#1c1917" strokeWidth="1.6" />
                  <line x1="135" y1="124" x2="135" y2="131" stroke="#1c1917" strokeWidth="1" opacity="0.55" />
                  <line x1="139" y1="124" x2="139" y2="131" stroke="#1c1917" strokeWidth="1" opacity="0.55" />
                </g>
              ) : gender === 'female' ? (
                <g>
                  {/* Longer Graceful Slim Athletic Arms extending down to mid-thigh hands */}
                  <path
                    d="M66 72 Q58 80 58 104 L51 139 L58 141 L65 107 L68 82 Z"
                    fill={outfit.skinTone}
                    stroke="#1c1917"
                    strokeWidth="1.4"
                  />
                  <rect x="51" y="123" width="8" height="12" rx="2" fill="#451a03" stroke="#1c1917" strokeWidth="1" />
                  <ellipse cx="54" cy="143" rx="3.8" ry="6" fill={outfit.skinTone} stroke="#1c1917" strokeWidth="1.3" />

                  <path
                    d="M114 72 Q122 80 122 104 L129 139 L122 141 L115 107 L112 82 Z"
                    fill={outfit.skinTone}
                    stroke="#1c1917"
                    strokeWidth="1.4"
                  />
                  <rect x="121" y="123" width="8" height="12" rx="2" fill="#451a03" stroke="#1c1917" strokeWidth="1" />
                  <ellipse cx="126" cy="143" rx="3.8" ry="6" fill={outfit.skinTone} stroke="#1c1917" strokeWidth="1.3" />
                </g>
              ) : (
                <g>
                  {/* Vanguard Muscular Arms + Pointed Forearm Vambraces + Clenched Fists */}
                  <path d="M63 72 Q52 78 52 98 L49 124 L59 124 L62 100 L65 82 Z" fill={outfit.skinTone} stroke="#1c1917" strokeWidth="1.5" />
                  <path d="M117 72 Q128 78 128 98 L131 124 L121 124 L118 100 L115 82 Z" fill={outfit.skinTone} stroke="#1c1917" strokeWidth="1.5" />
                  {/* Armored Steel/Leather Forearm Vambraces */}
                  <path d="M51 98 L61 102 L59 124 L48 124 Z" fill="#94a3b8" stroke="#1e293b" strokeWidth="1.4" />
                  <path d="M129 98 L119 102 L121 124 L132 124 Z" fill="#94a3b8" stroke="#1e293b" strokeWidth="1.4" />
                  {/* Clenched Fists */}
                  <rect x="47" y="123" width="12" height="11" rx="3.5" fill={outfit.skinTone} stroke="#1c1917" strokeWidth="1.4" />
                  <rect x="121" y="123" width="12" height="11" rx="3.5" fill={outfit.skinTone} stroke="#1c1917" strokeWidth="1.4" />
                  {/* Signature Asymmetrical Layered Vanguard Shoulder Pauldron (Right Side like Reference) */}
                  <g fill="#94a3b8" stroke="#1e293b" strokeWidth="1.4">
                    <path d="M106 72 Q122 63 132 76 Q120 79 106 75 Z" />
                    <path d="M111 78 Q126 73 133 83 Q121 85 112 82 Z" />
                    <path d="M114 84 Q127 81 131 89 Q122 90 115 88 Z" />
                  </g>
                </g>
              )}

              {/* Shoulder Pauldrons */}
              {outfit.shoulderArmor !== 'none' && (
                <>
                  <ellipse
                    cx={gender === 'male' ? 56 : gender === 'neutral' ? 62 : 90 - shoulderW}
                    cy="74"
                    rx={gender === 'male' ? 14 : 13}
                    ry="9.5"
                    fill={
                      outfit.shoulderArmor === 'gold_pauldrons'
                        ? '#eab308'
                        : outfit.shoulderArmor === 'steel_pauldrons'
                        ? '#94a3b8'
                        : '#78350f'
                    }
                    stroke="#0f172a"
                    strokeWidth="2"
                  />
                  <ellipse
                    cx={gender === 'male' ? 124 : gender === 'neutral' ? 118 : 90 + shoulderW}
                    cy="74"
                    rx={gender === 'male' ? 14 : 13}
                    ry="9.5"
                    fill={
                      outfit.shoulderArmor === 'gold_pauldrons'
                        ? '#eab308'
                        : outfit.shoulderArmor === 'steel_pauldrons'
                        ? '#94a3b8'
                        : '#78350f'
                    }
                    stroke="#0f172a"
                    strokeWidth="2"
                  />
                </>
              )}

              {/* Held Weapon / Staff */}
              {outfit.weapon === 'orb_staff' && (
                <g>
                  <line x1="138" y1="30" x2="132" y2="195" stroke="#78350f" strokeWidth="5" strokeLinecap="round" />
                  <circle cx="139" cy="28" r="9" fill="#38bdf8" stroke="#bae6fd" strokeWidth="2" />
                </g>
              )}
              {outfit.weapon === 'runic_sword' && (
                <g>
                  <polygon points="139,34 145,34 142,122 136,122" fill="#e2e8f0" stroke="#475569" strokeWidth="1.5" />
                  <rect x="130" y="118" width="22" height="5" rx="2" fill="#eab308" />
                </g>
              )}
              {outfit.weapon === 'oak_bow' && (
                <g>
                  <path d="M36 50 Q14 100 36 155" fill="none" stroke="#92400e" strokeWidth="5" strokeLinecap="round" />
                  <line x1="36" y1="50" x2="36" y2="155" stroke="#e2e8f0" strokeWidth="1.5" />
                </g>
              )}
              {outfit.weapon === 'paladin_halberd' && (
                <g>
                  <line x1="140" y1="18" x2="134" y2="195" stroke="#57534e" strokeWidth="4.5" />
                  <path d="M140 20 L160 32 L142 54 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
                </g>
              )}
              {outfit.weapon === 'spirit_lantern' && (
                <g>
                  <line x1="34" y1="103" x2="25" y2="118" stroke="#78350f" strokeWidth="3" />
                  <rect x="18" y="118" width="14" height="18" rx="3" fill="#34d399" stroke="#065f46" strokeWidth="2" />
                </g>
              )}

              {/* Head & Facial Gender Features */}
              {gender === 'male' ? (
                <g>
                  {/* Sculpted Angular Hero Jaw & Oval Head */}
                  <path
                    d="M73 43 Q73 29 90 29 Q107 29 107 43 Q106 56 97 63 L90 66 L83 63 Q74 56 73 43 Z"
                    fill={outfit.skinTone}
                    stroke="#1c1917"
                    strokeWidth="1.5"
                  />
                  {/* Confident Angular Eyebrows */}
                  <line x1="79" y1="44" x2="87" y2="45.5" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
                  <line x1="101" y1="44" x2="93" y2="45.5" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
                </g>
              ) : gender === 'female' ? (
                <g>
                  {/* Graceful Oval Head & Soft Jawline */}
                  <path
                    d="M75 43 Q75 29 90 29 Q105 29 105 43 Q104 55 95 61 L90 64 L85 61 Q76 55 75 43 Z"
                    fill={outfit.skinTone}
                    stroke="#1c1917"
                    strokeWidth="1.5"
                  />
                  {/* Delicate Arched Brows, Lashes & Rose Blush */}
                  <path d="M78 45 Q82 42.5 86 44.5" fill="none" stroke="#0f172a" strokeWidth="1.3" strokeLinecap="round" />
                  <path d="M94 44.5 Q98 42.5 102 45" fill="none" stroke="#0f172a" strokeWidth="1.3" strokeLinecap="round" />
                  <ellipse cx="79" cy="54" rx="3.2" ry="1.8" fill="#fb7185" opacity="0.45" />
                  <ellipse cx="101" cy="54" rx="3.2" ry="1.8" fill="#fb7185" opacity="0.45" />
                  <line x1="79" y1="47.5" x2="81.5" y2="48.5" stroke="#0f172a" strokeWidth="1.2" />
                  <line x1="98.5" y1="48.5" x2="101" y2="47.5" stroke="#0f172a" strokeWidth="1.2" />
                </g>
              ) : (
                <g>
                  {/* Sculpted Vanguard Head + Signature Rogue Eyepatch Strap */}
                  <path
                    d="M74 43 Q74 29 90 29 Q106 29 106 43 Q105 56 96 62 L90 65 L84 62 Q75 56 74 43 Z"
                    fill={outfit.skinTone}
                    stroke="#1c1917"
                    strokeWidth="1.5"
                  />
                  {/* Eyepatch Strap & Patch over Right Eye (Viewer's Right) */}
                  <line x1="74" y1="41" x2="106" y2="48" stroke="#1e293b" strokeWidth="1.8" />
                  <ellipse cx="97" cy="48.5" rx="5.5" ry="4.5" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
                  <line x1="79" y1="44" x2="86" y2="45" stroke="#0f172a" strokeWidth="1.7" strokeLinecap="round" />
                </g>
              )}
              <circle cx="83" cy="49" r="2.2" fill="#0f172a" />
              {gender !== 'neutral' && <circle cx="97" cy="49" r="2.2" fill="#0f172a" />}

              {/* Front Hairstyles */}
              {hairStyle === 'spiky' && (
                <path
                  d="M70 43 L74 26 L83 32 L90 19 L97 32 L106 26 L110 43 Q90 36 70 43 Z"
                  fill={outfit.hairColor}
                  stroke="#0f172a"
                  strokeWidth="1.2"
                />
              )}
              {hairStyle === 'long_wavy' && (
                <path
                  d="M69 50 Q67 22 90 22 Q113 22 111 50 Q105 37 96 36 Q90 39 84 36 Q75 37 69 50 Z"
                  fill={outfit.hairColor}
                  stroke="#0f172a"
                  strokeWidth="1.2"
                />
              )}
              {hairStyle === 'bob' && (
                <path d="M68 58 Q66 23 90 23 Q114 23 112 58 Q104 38 90 38 Q76 38 68 58 Z" fill={outfit.hairColor} stroke="#0f172a" strokeWidth="1.2" />
              )}
              {hairStyle === 'ponytail' && (
                <path
                  d="M71 46 Q68 23 90 23 Q112 23 109 46 Q100 34 90 35 Q80 34 71 46 Z"
                  fill={outfit.hairColor}
                  stroke="#0f172a"
                  strokeWidth="1.2"
                />
              )}
              {hairStyle === 'twin_braids' && (
                <g>
                  <path
                    d="M70 48 Q68 23 90 23 Q112 23 110 48 Q101 35 90 39 Q79 35 70 48 Z"
                    fill={outfit.hairColor}
                    stroke="#0f172a"
                    strokeWidth="1.2"
                  />
                  <line x1="90" y1="24" x2="90" y2="38" stroke="#0f172a" strokeWidth="1" opacity="0.4" />
                </g>
              )}
              {hairStyle === 'curly_afro' && (
                <g fill={outfit.hairColor}>
                  <circle cx="74" cy="36" r="9" />
                  <circle cx="90" cy="29" r="11" />
                  <circle cx="106" cy="36" r="9" />
                  <circle cx="69" cy="46" r="7" />
                  <circle cx="111" cy="46" r="7" />
                </g>
              )}
              {hairStyle === 'undercut' && (
                <path d="M72 43 Q74 22 109 28 Q105 42 90 37 Q78 36 72 43 Z" fill={outfit.hairColor} stroke="#0f172a" strokeWidth="1.2" />
              )}
              {hairStyle === 'braided_bun' && (
                <g fill={outfit.hairColor} stroke="#0f172a" strokeWidth="1.2">
                  <circle cx="90" cy="18" r="9.5" />
                  <path d="M84 18 Q90 13 96 18" fill="none" stroke="#0f172a" strokeWidth="1" opacity="0.45" />
                  <path d="M71 47 Q68 23 90 23 Q112 23 109 47 Q100 35 90 35 Q80 35 71 47 Z" />
                </g>
              )}

              {/* Front Bangs & Side Bangs Layer */}
              {bangsStyle === 'blunt_bangs' && (
                <g>
                  <path
                    d="M71 44 Q71 22 90 22 Q109 22 109 44 L105 44 L103 40 L100 44 L91 43 L89 40 L87 43 L77 44 L75 40 Z"
                    fill={outfit.hairColor}
                    stroke="#0f172a"
                    strokeWidth="1.1"
                  />
                </g>
              )}
              {bangsStyle === 'side_bangs' && (
                <g>
                  <path
                    d="M70 49 Q70 22 90 22 Q111 22 110 53 Q106 43 96 42 Q85 41 75 48 L70 54 Z"
                    fill={outfit.hairColor}
                    stroke="#0f172a"
                    strokeWidth="1.1"
                  />
                  <path d="M79 34 Q93 33 105 42" fill="none" stroke="#0f172a" strokeWidth="0.9" opacity="0.35" />
                </g>
              )}
              {bangsStyle === 'curtain_bangs' && (
                <g>
                  <path
                    d="M90 23 Q74 23 68 58 Q73 48 80 41 Q86 35 90 32 Q94 35 100 41 Q107 48 112 58 Q106 23 90 23 Z"
                    fill={outfit.hairColor}
                    stroke="#0f172a"
                    strokeWidth="1.1"
                  />
                  <line x1="90" y1="23" x2="90" y2="33" stroke="#0f172a" strokeWidth="1" opacity="0.45" />
                </g>
              )}
              {bangsStyle === 'wispy_bangs' && (
                <path
                  d="M71 45 Q73 22 90 22 Q107 22 109 45 Q104 35 100 45 Q95 33 90 46 Q85 33 80 45 Q76 35 71 45 Z"
                  fill={outfit.hairColor}
                  stroke="#0f172a"
                  strokeWidth="1.1"
                />
              )}
              {bangsStyle === 'face_framing' && (
                <g fill={outfit.hairColor} stroke="#0f172a" strokeWidth="1.1">
                  <path d="M70 38 Q67 52 72 68 Q77 56 77 41 Z" />
                  <path d="M110 38 Q113 52 108 68 Q103 56 103 41 Z" />
                  <path d="M73 41 Q80 33 90 34 Q100 33 107 41 Q103 23 90 23 Q77 23 73 41 Z" />
                </g>
              )}

              {/* Headwear / Accessory */}
              {outfit.accessory === 'wizard_hat' && (
                <g>
                  <ellipse cx="90" cy="34" rx="25" ry="5" fill="#5b21b6" stroke="#facc15" strokeWidth="1.5" />
                  <polygon points="72,34 90,6 108,34" fill="#6d28d9" stroke="#facc15" strokeWidth="1.5" />
                </g>
              )}
              {outfit.accessory === 'crimson_hood' && (
                <path d="M68 54 Q66 20 90 19 Q114 20 112 54 Q102 34 90 34 Q78 34 68 54 Z" fill={outfit.topColor} stroke="#1c1917" strokeWidth="1.5" />
              )}
              {outfit.accessory === 'plumed_helm' && (
                <g>
                  <path d="M72 46 Q72 26 90 26 Q108 26 108 46 L104 56 L76 56 Z" fill="#94a3b8" stroke="#334155" strokeWidth="1.5" />
                  <rect x="78" y="42" width="24" height="5" fill="#0f172a" />
                  <path d="M88 26 Q98 8 112 18" fill="none" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />
                </g>
              )}
              {outfit.accessory === 'halo' && (
                <ellipse cx="90" cy="20" rx="18" ry="4.5" fill="none" stroke="#facc15" strokeWidth="3" />
              )}
              {outfit.accessory === 'sunglasses' && (
                <rect x="76" y="45" width="28" height="7" rx="2" fill="#020617" />
              )}
              {outfit.accessory === 'flower_crown' && (
                <g>
                  <circle cx="80" cy="32" r="4" fill="#f472b6" />
                  <circle cx="90" cy="30" r="4.5" fill="#facc15" />
                  <circle cx="100" cy="32" r="4" fill="#34d399" />
                </g>
              )}
              {outfit.accessory === 'wolf_ears' && (
                <>
                  <polygon points="73,34 79,16 86,31" fill={outfit.hairColor} />
                  <polygon points="94,31 101,16 107,34" fill={outfit.hairColor} />
                </>
              )}
            </svg>
            <div className="font-cinzel text-sm font-bold text-slate-100 mt-1">
              {playerName?.trim() || 'Aria'}
            </div>
            <span className="text-[11px] text-amber-300/90 font-semibold mt-0.5 text-center">
              {gender.toUpperCase()} · {hairStyle.replace('_', ' ').toUpperCase()} · {bangsStyle.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          {/* Right Controls */}
          <div className="md:col-span-7 space-y-3 text-xs">
            {/* Hero Name Input */}
            {onSavePlayerName && (
              <div>
                <label className="text-slate-400 block mb-1 font-medium">Hero Name (how everyone addresses you)</label>
                <input
                  type="text"
                  value={playerName ?? ''}
                  onChange={(e) => onSavePlayerName(e.target.value)}
                  maxLength={20}
                  placeholder="Enter your hero name..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 focus:border-amber-400 focus:outline-none text-slate-100 font-semibold text-xs"
                />
              </div>
            )}

            {/* Gender Selector */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">{t.genderLabel}</label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['female', t.female],
                    ['male', t.male],
                    ['neutral', t.neutral]
                  ] as const
                ).map(([gId, label]) => (
                  <button
                    key={gId}
                    onClick={() => update({ gender: gId })}
                    className={`py-2 px-3 rounded-lg border font-semibold cursor-pointer transition-colors ${
                      gender === gId
                        ? 'bg-pink-500 text-white border-pink-400 shadow'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 8 Hairstyles Selector */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">{t.hairstyleLabel} (8 Styles)</label>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['long_wavy', 'Long Wavy'],
                    ['spiky', 'Spiky'],
                    ['bob', 'Classic Bob'],
                    ['ponytail', 'High Ponytail'],
                    ['twin_braids', 'Twin Braids'],
                    ['curly_afro', 'Curly Crown'],
                    ['undercut', 'Side Undercut'],
                    ['braided_bun', 'Braided Bun']
                  ] as const
                ).map(([hId, label]) => (
                  <button
                    key={hId}
                    onClick={() => update({ hairStyle: hId })}
                    className={`px-2.5 py-1.5 rounded-lg border cursor-pointer ${
                      hairStyle === hId
                        ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bangs & Side Fringe Selector */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">{t.bangsLabel}</label>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['none', 'Clean / None'],
                    ['side_bangs', 'Side Bangs'],
                    ['blunt_bangs', 'Blunt Bangs'],
                    ['curtain_bangs', 'Curtain Bangs'],
                    ['wispy_bangs', 'Wispy Fringe'],
                    ['face_framing', 'Side Cheek Locks']
                  ] as const
                ).map(([bId, label]) => (
                  <button
                    key={bId}
                    onClick={() => update({ bangsStyle: bId })}
                    className={`px-2.5 py-1 rounded-lg border cursor-pointer ${
                      bangsStyle === bId
                        ? 'bg-pink-500 text-white font-bold border-pink-400'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rear / Back Hair Selector */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">{t.rearHairLabel}</label>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['default', 'Style Default'],
                    ['long_flowing', 'Long Flowing Back'],
                    ['shoulder_layered', 'Shoulder Layers'],
                    ['spiky_nape', 'Spiky Wolf Nape'],
                    ['twin_tails', 'Twin Back Tails']
                  ] as const
                ).map(([rId, label]) => (
                  <button
                    key={rId}
                    onClick={() => update({ rearHairStyle: rId })}
                    className={`px-2.5 py-1 rounded-lg border cursor-pointer ${
                      rearHairStyle === rId
                        ? 'bg-indigo-500 text-white font-bold border-indigo-400'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">Class Armor & Tunic</label>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['mage_robe', 'Crimson Mage'],
                    ['knight_plate', 'Crusader Knight'],
                    ['ranger_cloak', 'Forest Ranger'],
                    ['druid_silk', 'Sky Druid'],
                    ['berserker_hide', 'Berserker Hide'],
                    ['doctor_coat', 'Healer Coat'],
                    ['cozy_hoodie', 'Cozy Hoodie']
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => update({ topStyle: id })}
                    className={`px-2.5 py-1.5 rounded-lg border cursor-pointer ${
                      outfit.topStyle === id ? 'bg-amber-500 text-slate-950 font-bold border-amber-400' : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">Equipped Fantasy Weapon</label>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['orb_staff', 'Orb Staff'],
                    ['runic_sword', 'Runic Sword'],
                    ['oak_bow', 'Hunter Bow'],
                    ['paladin_halberd', 'Halberd'],
                    ['spirit_lantern', 'Spirit Lantern'],
                    ['none', 'Unarmed']
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => update({ weapon: id })}
                    className={`px-2.5 py-1 rounded-lg border cursor-pointer ${
                      outfit.weapon === id ? 'bg-sky-500 text-slate-950 font-bold border-sky-400' : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">Shoulder Pauldrons</label>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['none', 'None'],
                    ['leather_pauldrons', 'Leather'],
                    ['steel_pauldrons', 'Steel'],
                    ['gold_pauldrons', 'Gilded Gold']
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => update({ shoulderArmor: id })}
                    className={`px-2.5 py-1 rounded-lg border cursor-pointer ${
                      outfit.shoulderArmor === id ? 'bg-purple-500 text-white font-bold border-purple-400' : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">{t.skinToneLabel}</label>
                <div className="flex flex-wrap gap-1.5">
                  {['#fde2c8', '#f5cba7', '#d99b66', '#9a613b', '#5d3a24'].map((c) => (
                    <button key={c} onClick={() => update({ skinTone: c })} className={`w-5 h-5 rounded-full border cursor-pointer ${outfit.skinTone === c ? 'border-white scale-110' : 'border-slate-700'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Tunic Color</label>
                <div className="flex flex-wrap gap-1.5">
                  {['#991b1b', '#2563eb', '#15803d', '#6d28d9', '#f8fafc', '#b45309'].map((c) => (
                    <button key={c} onClick={() => update({ topColor: c })} className={`w-5 h-5 rounded-full border cursor-pointer ${outfit.topColor === c ? 'border-white scale-110' : 'border-slate-700'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Cloak Mantle</label>
                <div className="flex flex-wrap gap-1.5">
                  {['none', '#450a0a', '#1e293b', '#14532d', '#4c1d95', '#78350f'].map((c) => (
                    <button
                      key={c}
                      onClick={() => update({ cloakColor: c })}
                      className={`w-5 h-5 rounded-full border cursor-pointer ${outfit.cloakColor === c ? 'border-white scale-110' : 'border-slate-700'}`}
                      style={{ backgroundColor: c === 'none' ? '#0f172a' : c }}
                      title={c === 'none' ? 'No Cloak' : c}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Hair Color</label>
                <div className="flex flex-wrap gap-1.5">
                  {['#5b341e', '#fbbf24', '#38bdf8', '#1e293b', '#991b1b', '#e2e8f0', '#ec4899'].map((c) => (
                    <button key={c} onClick={() => update({ hairColor: c })} className={`w-5 h-5 rounded-full border cursor-pointer ${outfit.hairColor === c ? 'border-white scale-110' : 'border-slate-700'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">Headwear & Hoods</label>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['crimson_hood', 'Rogue Hood'],
                    ['plumed_helm', 'Plumed Helm'],
                    ['wizard_hat', 'Wizard Hat'],
                    ['flower_crown', 'Flower Crown'],
                    ['wolf_ears', 'Wolf Ears'],
                    ['halo', 'Golden Halo'],
                    ['sunglasses', 'Shades'],
                    ['none', 'None']
                  ] as const
                ).map(([acc, label]) => (
                  <button
                    key={acc}
                    onClick={() => update({ accessory: acc })}
                    className={`px-2.5 py-1 rounded-lg border cursor-pointer ${
                      outfit.accessory === acc ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl cursor-pointer"
            >
              {t.wearOutfit}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== 3. HOUSE DECORATOR MODAL (Cozy Isometric Room Inspo) ====================
interface HouseDecoratorModalProps {
  houseConfig: HouseConfig;
  onUpdateHouse: (config: HouseConfig) => void;
  onClose: () => void;
}

export const HouseDecoratorModal: React.FC<HouseDecoratorModalProps> = ({
  houseConfig,
  onUpdateHouse,
  onClose
}) => {
  const toggleFurniture = (id: string) => {
    audioEngine.playAncientRune();
    onUpdateHouse({
      ...houseConfig,
      furniture: houseConfig.furniture.map((f) => (f.id === id ? { ...f, placed: !f.placed } : f))
    });
  };

  const nudgeFurniture = (id: string, dx: number, dy: number) => {
    onUpdateHouse({
      ...houseConfig,
      furniture: houseConfig.furniture.map((f) =>
        f.id === id
          ? { ...f, x: Math.max(155, Math.min(640, f.x + dx)), y: Math.max(120, Math.min(440, f.y + dy)) }
          : f
      )
    });
  };

  const placedSet = new Set(houseConfig.furniture.filter((f) => f.placed).map((f) => f.type));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <Home className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-cinzel text-lg font-bold text-slate-100">Cozy Home Interior Studio</h2>
              <p className="text-xs text-slate-400">Customize warm walls, herringbone floors, hearthside lighting & room furniture</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-y-auto pr-1">
          {/* Left: Cozy Diorama Live Preview + Compact Icon Palette */}
          <div className="lg:col-span-6 flex flex-col gap-3">
            <div className="relative rounded-2xl overflow-hidden border border-amber-900/50 bg-[#c28341]">
              {/* Live SVG Cozy Room Preview inspired by Image 1 */}
              <svg viewBox="0 0 360 270" className="w-full h-auto block">
                {/* Warm Wall Backdrops */}
                <polygon points="180,12 348,80 348,186 180,120" fill={houseConfig.wallColor} />
                <polygon points="180,12 12,80 12,186 180,120" fill={houseConfig.wallColor} opacity="0.88" />
                {/* Cozy Floor */}
                <polygon
                  points="180,120 348,186 180,256 12,186"
                  fill={
                    houseConfig.floorTheme === 'herringbone_warm'
                      ? '#d9dee6'
                      : houseConfig.floorTheme === 'oak_wood'
                      ? '#8b5a2b'
                      : houseConfig.floorTheme === 'marble'
                      ? '#e2e8f0'
                      : '#475569'
                  }
                />

                {/* Twin Windows with Purple Roller Blinds (Left Wall) */}
                {[
                  [68, 72],
                  [118, 52]
                ].map(([wx, wy], idx) => (
                  <g key={idx}>
                    <polygon points={`${wx},${wy} ${wx + 28},${wy - 11} ${wx + 28},${wy + 30} ${wx},${wy + 41}`} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" />
                    <polygon points={`${wx + 4},${wy + 3} ${wx + 24},${wy - 5} ${wx + 24},${wy + 18} ${wx + 4},${wy + 26}`} fill="#635ea8" />
                    <polygon points={`${wx + 4},${wy + 26} ${wx + 24},${wy + 18} ${wx + 24},${wy + 29} ${wx + 4},${wy + 37}`} fill="#fef08a" opacity="0.8" />
                  </g>
                ))}

                {/* Sunbeam Shafts across Floor */}
                <polygon points="72,110 148,80 250,210 140,235" fill="#fef08a" opacity="0.16" />

                {/* Wood Door + Clock & Fireplace Chimney (Right Wall) */}
                <polygon points="194,28 228,42 228,136 194,122" fill="#8b5a3c" stroke="#e2e8f0" strokeWidth="3" />
                <polygon points="244,44 294,64 294,160 244,140" fill="#8e88ad" />
                <circle cx="268" cy="76" r="8" fill="#fef3c7" stroke="#92400e" strokeWidth="2" />

                {/* Placed Rug */}
                {placedSet.has('rug') && (
                  <g>
                    <ellipse cx="195" cy="186" rx="68" ry="30" fill="#4d9b85" />
                    <ellipse cx="195" cy="186" rx="54" ry="23" fill="none" stroke="#c27a52" strokeWidth="4" />
                    <ellipse cx="195" cy="186" rx="34" ry="14" fill="#63b099" />
                  </g>
                )}

                {/* Fireplace Hearth + Books + Lamp */}
                {placedSet.has('fireplace') && (
                  <g>
                    <polygon points="222,126 296,156 296,174 222,144" fill="#d9a06b" />
                    <rect x="236" y="138" width="38" height="24" rx="4" fill="#312e4a" />
                    <ellipse cx="255" cy="158" rx="11" ry="5" fill="#f97316" />
                    <rect x="230" y="112" width="6" height="16" fill="#6366f1" />
                    <rect x="237" y="112" width="6" height="16" fill="#ef4444" />
                    <rect x="244" y="113" width="6" height="15" fill="#eab308" />
                  </g>
                )}

                {/* Cozy Bed with Purple Blanket & Golden Throw Pillow */}
                {placedSet.has('bed') && (
                  <g>
                    <polygon points="104,174 166,148 212,172 150,198" fill="#d99b66" />
                    <polygon points="114,166 146,152 178,168 146,182" fill="#f1f5f9" />
                    <polygon points="138,168 178,151 214,170 174,188" fill="#7069c4" />
                    <ellipse cx="168" cy="166" rx="11" ry="7" fill="#d99a26" />
                  </g>
                )}

                {/* Violet Floor Beanbag Cushion */}
                {placedSet.has('beanbag') && (
                  <polygon points="196,204 236,192 260,214 218,228" fill="#5e59a8" />
                )}

                {/* Nightstand & Warm Lamp */}
                {placedSet.has('nightstand') && (
                  <g>
                    <ellipse cx="92" cy="192" rx="14" ry="8" fill="#c0834d" />
                    <polygon points="84,176 100,176 96,162 88,162" fill="#eab308" />
                  </g>
                )}

                {/* Lavender Floor Lamp */}
                {placedSet.has('floor_lamp') && (
                  <g>
                    <line x1="312" y1="184" x2="312" y2="122" stroke="#cbd5e1" strokeWidth="3" />
                    <polygon points="300,124 324,124 320,106 304,106" fill="#9f8fe0" />
                  </g>
                )}

                {/* Stainless Arcane Fridge */}
                {placedSet.has('fridge') && (
                  <g>
                    <rect x="292" y="102" width="18" height="36" rx="2" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.4" />
                    <line x1="292" y1="115" x2="310" y2="115" stroke="#64748b" strokeWidth="1.2" />
                    <line x1="295" y1="106" x2="295" y2="112" stroke="#475569" strokeWidth="1.5" />
                    <line x1="295" y1="118" x2="295" y2="128" stroke="#475569" strokeWidth="1.5" />
                  </g>
                )}

                {/* Lush Potted Plant */}
                {placedSet.has('plant') && (
                  <g>
                    <rect x="134" y="138" width="12" height="12" rx="2" fill="#d97706" />
                    <ellipse cx="136" cy="130" rx="6" ry="12" fill="#4d7c0f" transform="rotate(-20 136 130)" />
                    <ellipse cx="144" cy="130" rx="6" ry="12" fill="#65a30d" transform="rotate(20 144 130)" />
                  </g>
                )}
              </svg>

              {/* Floating Quick-Toggle White Tile Palette (Image 1 Aesthetic) */}
              <div className="absolute top-3 left-3 bg-white/95 rounded-xl p-1.5 shadow-lg grid grid-cols-3 gap-1">
                {houseConfig.furniture.slice(0, 9).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => toggleFurniture(f.id)}
                    title={`Toggle ${f.name}`}
                    className={`w-7 h-7 rounded-md flex items-center justify-center border text-[10px] font-bold cursor-pointer transition-all ${
                      f.placed
                        ? 'bg-amber-100 border-amber-500 text-amber-900 shadow-inner'
                        : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: f.color }} />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1.5">Warm Wall Finish</label>
                <div className="flex flex-wrap gap-1.5">
                  {['#b46b2c', '#8c5230', '#475569', '#312e81', '#14532d', '#4c1d95'].map((wColor) => (
                    <button
                      key={wColor}
                      onClick={() => onUpdateHouse({ ...houseConfig, wallColor: wColor })}
                      className={`w-6 h-6 rounded-lg border-2 cursor-pointer ${
                        houseConfig.wallColor === wColor ? 'border-white scale-110' : 'border-slate-700'
                      }`}
                      style={{ backgroundColor: wColor }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1.5">Floor Tile Theme</label>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      ['herringbone_warm', 'Cozy Tile'],
                      ['oak_wood', 'Warm Oak'],
                      ['slate_stone', 'Slate'],
                      ['marble', 'Marble']
                    ] as const
                  ).map(([fl, label]) => (
                    <button
                      key={fl}
                      onClick={() => onUpdateHouse({ ...houseConfig, floorTheme: fl })}
                      className={`px-2 py-1 rounded-md border text-[11px] cursor-pointer ${
                        houseConfig.floorTheme === fl ? 'bg-amber-500 text-slate-950 font-bold border-amber-400' : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Furniture List & Position Nudge Controls */}
          <div className="lg:col-span-6 space-y-2 text-xs">
            <label className="text-slate-400 block font-medium">Furniture Placement & Coordinates</label>
            {houseConfig.furniture.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: item.color }} />
                  <span className="font-semibold text-slate-200">{item.name}</span>
                </div>

                <div className="flex items-center gap-1">
                  {item.placed && (
                    <>
                      <button onClick={() => nudgeFurniture(item.id, -25, 0)} className="p-1 bg-slate-800 hover:bg-slate-700 rounded cursor-pointer" title="Move Left">
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button onClick={() => nudgeFurniture(item.id, 25, 0)} className="p-1 bg-slate-800 hover:bg-slate-700 rounded cursor-pointer" title="Move Right">
                        <ArrowRight className="w-3 h-3" />
                      </button>
                      <button onClick={() => nudgeFurniture(item.id, 0, -20)} className="p-1 bg-slate-800 hover:bg-slate-700 rounded cursor-pointer" title="Move Up">
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button onClick={() => nudgeFurniture(item.id, 0, 20)} className="p-1 bg-slate-800 hover:bg-slate-700 rounded cursor-pointer" title="Move Down">
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => toggleFurniture(item.id)}
                    className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ml-1 ${
                      item.placed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.placed ? 'Placed' : 'Place'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
