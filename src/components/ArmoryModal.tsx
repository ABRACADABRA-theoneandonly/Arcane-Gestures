import React from 'react';
import { PlayerStats, ArmorTier } from '../types/game';
import { ARMOR_CATALOG } from '../data/spellsAndRealms';
import { audioEngine } from '../services/audioEngine';
import { Shield, Sparkles, Zap, Flame, X, ArrowUpCircle, CheckCircle2, PawPrint } from 'lucide-react';

interface ArmoryModalProps {
  stats: PlayerStats;
  onUpdateStats: (newStats: Partial<PlayerStats>) => void;
  onClose: () => void;
}

export const ArmoryModal: React.FC<ArmoryModalProps> = ({
  stats,
  onUpdateStats,
  onClose
}) => {
  const currentArmor = ARMOR_CATALOG.find(a => a.id === stats.upgrades.armorTier) || ARMOR_CATALOG[0];

  const handleEquipOrBuyArmor = (tierId: ArmorTier) => {
    const item = ARMOR_CATALOG.find(a => a.id === tierId);
    if (!item) return;

    if (stats.upgrades.armorTier === tierId) return;

    // Check cost if upgrading to a higher tier
    const isOwned = item.tier <= currentArmor.tier;
    if (!isOwned) {
      if (stats.upgrades.arcanePoints < item.costAP) {
        return; // Insufficient AP
      }

      // Deduct AP and equip
      audioEngine.playArmorUpgrade();
      const newAP = stats.upgrades.arcanePoints - item.costAP;
      const hpBonusDiff = item.bonusHp - currentArmor.bonusHp;

      onUpdateStats({
        maxHp: stats.maxHp + hpBonusDiff,
        hp: stats.hp + hpBonusDiff,
        upgrades: {
          ...stats.upgrades,
          armorTier: tierId,
          arcanePoints: newAP
        }
      });
    } else {
      // Re-equipping previously unlocked tier
      audioEngine.playArmorUpgrade();
      const hpBonusDiff = item.bonusHp - currentArmor.bonusHp;
      onUpdateStats({
        maxHp: stats.maxHp + hpBonusDiff,
        hp: Math.min(stats.maxHp + hpBonusDiff, stats.hp),
        upgrades: {
          ...stats.upgrades,
          armorTier: tierId
        }
      });
    }
  };

  const handleUpgradeStat = (
    statKey: 'spellPowerLevel' | 'manaCapacityLevel' | 'manaRegenLevel' | 'castHasteLevel' | 'hemomancyLevel' | 'beastMasteryLevel',
    cost: number
  ) => {
    if (stats.upgrades.arcanePoints < cost) return;

    audioEngine.playLevelUp();
    const newAP = stats.upgrades.arcanePoints - cost;
    const currentLevel = stats.upgrades[statKey] || 0;

    let updatedMaxMana = stats.maxMana;
    if (statKey === 'manaCapacityLevel') {
      updatedMaxMana += 20;
    }

    onUpdateStats({
      maxMana: updatedMaxMana,
      upgrades: {
        ...stats.upgrades,
        [statKey]: currentLevel + 1,
        arcanePoints: newAP
      }
    });
  };

  const statConfig = [
    {
      key: 'spellPowerLevel' as const,
      name: 'Spell Destruction',
      description: '+10% Damage to all continuous two-handed magic spells',
      cost: 150 + (stats.upgrades.spellPowerLevel || 0) * 100,
      icon: Flame,
      color: 'text-orange-400'
    },
    {
      key: 'manaCapacityLevel' as const,
      name: 'Mana Reservoir',
      description: '+20 Maximum Mana pool for longer sustained barrages',
      cost: 120 + (stats.upgrades.manaCapacityLevel || 0) * 80,
      icon: Sparkles,
      color: 'text-sky-400'
    },
    {
      key: 'manaRegenLevel' as const,
      name: 'Mana Surge Rate',
      description: '+20% Passive mana regeneration speed per second',
      cost: 140 + (stats.upgrades.manaRegenLevel || 0) * 90,
      icon: Zap,
      color: 'text-amber-400'
    },
    {
      key: 'castHasteLevel' as const,
      name: 'Cast Stream Haste',
      description: '+10% Rapid-fire projectile frequency (reduces stream cooldown)',
      cost: 180 + (stats.upgrades.castHasteLevel || 0) * 120,
      icon: ArrowUpCircle,
      color: 'text-purple-400'
    },
    {
      key: 'hemomancyLevel' as const,
      name: 'Hemomancy Potency',
      description: '+25% Blood Thrall duration and detonation shockwave damage',
      cost: 250 + (stats.upgrades.hemomancyLevel || 0) * 150,
      icon: Shield,
      color: 'text-red-400'
    },
    {
      key: 'beastMasteryLevel' as const,
      name: 'Beast Mastery Bond',
      description: '+30% Spectral Dire Wolf leap speed, attack damage, and life duration',
      cost: 260 + (stats.upgrades.beastMasteryLevel || 0) * 160,
      icon: PawPrint,
      color: 'text-emerald-400'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-cinzel text-xl font-bold text-slate-100">
                The Arcane Armory & Forge
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Forge reinforced armor and upgrade combat attributes using earned Arcane Points (AP)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (stats.upgrades.arcanePoints >= 120) {
                  audioEngine.playArmorUpgrade();
                  onUpdateStats({
                    portalKeys: (stats.portalKeys || 0) + 1,
                    upgrades: { ...stats.upgrades, arcanePoints: stats.upgrades.arcanePoints - 120 }
                  });
                }
              }}
              disabled={stats.upgrades.arcanePoints < 120}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                stats.upgrades.arcanePoints >= 120
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
              title="Forge a Dimensional Portal Key (120 AP)"
            >
              +1 Portal Key (120 AP)
            </button>

            {/* AP Balance Badge */}
            <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <div className="text-xs">
                <span className="text-slate-400">AP: </span>
                <strong className="text-amber-300 font-mono text-sm">{stats.upgrades.arcanePoints}</strong>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-1">
          {/* Column 1: Armor Tiers Progression */}
          <div className="space-y-3">
            <h3 className="font-cinzel text-sm font-bold text-slate-200 tracking-wide flex items-center gap-2">
              <span>Armor Tiers & Physical Protection</span>
            </h3>

            <div className="space-y-2.5">
              {ARMOR_CATALOG.map(armor => {
                const isEquipped = stats.upgrades.armorTier === armor.id;
                const isUnlocked = armor.tier <= currentArmor.tier;
                const canAfford = stats.upgrades.arcanePoints >= armor.costAP;

                return (
                  <div
                    key={armor.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isEquipped
                        ? 'bg-slate-950/90 border-amber-500/60 shadow-md shadow-amber-500/5 ring-1 ring-amber-500/30'
                        : isUnlocked
                        ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/20 border-slate-800/60 opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-3 h-3 rounded-full shrink-0" 
                            style={{ backgroundColor: armor.visualColor }} 
                          />
                          <h4 className="font-semibold text-slate-100 text-sm">{armor.name}</h4>
                          <span className="text-xs text-slate-500">Tier {armor.tier}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {armor.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-300 mt-2 font-mono">
                          <span className="text-emerald-400">
                            Defense: -{Math.round(armor.damageReduction * 100)}% Damage
                          </span>
                          {armor.bonusHp > 0 && (
                            <span className="text-sky-400">+{armor.bonusHp} Max HP</span>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="shrink-0">
                        {isEquipped ? (
                          <div className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-xs rounded-lg flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Equipped</span>
                          </div>
                        ) : isUnlocked ? (
                          <button
                            onClick={() => handleEquipOrBuyArmor(armor.id)}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors cursor-pointer"
                          >
                            Equip
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEquipOrBuyArmor(armor.id)}
                            disabled={!canAfford}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                              canAfford
                                ? 'bg-amber-600 hover:bg-amber-500 text-slate-950'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            Forge ({armor.costAP} AP)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: Stat Upgrades */}
          <div className="space-y-3">
            <h3 className="font-cinzel text-sm font-bold text-slate-200 tracking-wide flex items-center gap-2">
              <span>Combat Attribute Enhancements</span>
            </h3>

            <div className="space-y-2.5">
              {statConfig.map(stat => {
                const currentLevel = stats.upgrades[stat.key] || 0;
                const canAfford = stats.upgrades.arcanePoints >= stat.cost;
                const IconComponent = stat.icon;

                return (
                  <div
                    key={stat.key}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-slate-900 border border-slate-800 ${stat.color}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-100 text-sm">{stat.name}</h4>
                          <span className="text-xs font-mono text-amber-400">Rank {currentLevel}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                          {stat.description}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleUpgradeStat(stat.key, stat.cost)}
                      disabled={!canAfford}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-all cursor-pointer ${
                        canAfford
                          ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-md shadow-amber-600/20'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      +{stat.cost} AP
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
