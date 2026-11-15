import React, { useState } from 'react';
import { LeaderboardEntry, CountryInfo } from '../types/game';
import { leaderboardService, REAL_COUNTRIES } from '../services/leaderboardService';
import { X, Globe2, MapPin, Trophy, Target, ShieldAlert } from 'lucide-react';

interface LeaderboardModalProps {
  onClose: () => void;
  playerCountry: CountryInfo;
  onUpdateCountry: (country: CountryInfo) => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  onClose,
  playerCountry,
  onUpdateCountry
}) => {
  const [activeTab, setActiveTab] = useState<'world' | 'country'>('world');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(playerCountry.code);

  const worldEntries = leaderboardService.getWorldLeaderboard();
  const countryEntries = leaderboardService.getCountryLeaderboard(selectedCountryCode);

  const activeEntries = activeTab === 'world' ? worldEntries : countryEntries;
  const currentCountryObj = REAL_COUNTRIES.find(c => c.code === selectedCountryCode) || playerCountry;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-cinzel text-xl font-bold text-slate-100">
                Verified Global & Regional Leaderboards
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-world geography rankings and player-tracked accuracy metrics
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

        {/* Tab Controls & Country Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
            <button
              onClick={() => setActiveTab('world')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'world'
                  ? 'bg-slate-800 text-amber-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>Worldwide Rankings</span>
            </button>
            <button
              onClick={() => setActiveTab('country')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'country'
                  ? 'bg-slate-800 text-amber-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>National Board ({currentCountryObj.name})</span>
            </button>
          </div>

          {/* Real Country Selector */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Location:</span>
            <select
              value={selectedCountryCode}
              onChange={(e) => {
                setSelectedCountryCode(e.target.value);
                const found = REAL_COUNTRIES.find(c => c.code === e.target.value);
                if (found) onUpdateCountry(found);
              }}
              className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {REAL_COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.flag} {country.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/60">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Spellcaster</th>
                <th className="py-3 px-4">Nation</th>
                <th className="py-3 px-4 text-right">Score</th>
                <th className="py-3 px-4 text-right">Accuracy</th>
                <th className="py-3 px-4 text-right">Wave</th>
                <th className="py-3 px-4 text-right">Kills</th>
                <th className="py-3 px-4">Mastered Spell</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs text-slate-300">
              {activeEntries.length > 0 ? (
                activeEntries.map((entry: LeaderboardEntry) => {
                  const isTop3 = entry.rank && entry.rank <= 3;
                  return (
                    <tr 
                      key={entry.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono-num font-bold">
                        {entry.rank === 1 ? (
                          <span className="text-amber-400">1st</span>
                        ) : entry.rank === 2 ? (
                          <span className="text-slate-300">2nd</span>
                        ) : entry.rank === 3 ? (
                          <span className="text-amber-600">3rd</span>
                        ) : (
                          <span className="text-slate-500">{entry.rank}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-100 flex items-center gap-2">
                        <span>{entry.playerName}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 text-slate-300">
                          <span>{REAL_COUNTRIES.find(c => c.code === entry.countryCode)?.flag || '🌐'}</span>
                          <span>{entry.countryName}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num font-bold text-amber-400">
                        {entry.score.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num">
                        <span className={entry.accuracy >= 90 ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
                          {entry.accuracy}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num">
                        Wave {entry.waveReached}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num">
                        {entry.zombiesKilled}
                      </td>
                      <td className="py-3 px-4 text-slate-400 truncate max-w-[140px]">
                        {entry.preferredSpell}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No verified scores recorded in {currentCountryObj.name} yet. Play a round to claim the #1 rank!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="border-t border-slate-800 pt-3 mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>All metrics calculated from confirmed projectile hits and zombie eliminations.</span>
          <span>Rankings update after each completed wave.</span>
        </div>
      </div>
    </div>
  );
};
