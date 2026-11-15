import React, { useState } from 'react';
import { Volume2, VolumeX, Globe, Palette, Check } from 'lucide-react';
import { AppLanguage, AppThemeId } from '../types/game';
import { APP_THEMES, AppThemeConfig, LANGUAGES, getTranslation } from '../data/i18nAndThemes';

interface TopNavProps {
  onOpenGrimoire: () => void;
  onOpenLeaderboard: () => void;
  onOpenCalibration: () => void;
  onOpenRealms: () => void;
  onOpenTrainingDojo: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  language: AppLanguage;
  onChangeLanguage: (lang: AppLanguage) => void;
  appTheme: AppThemeConfig;
  onChangeTheme: (themeId: AppThemeId) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onOpenGrimoire,
  onOpenLeaderboard,
  onOpenCalibration,
  onOpenRealms,
  onOpenTrainingDojo,
  isMuted,
  onToggleMute,
  language,
  onChangeLanguage,
  appTheme,
  onChangeTheme
}) => {
  const [showThemePicker, setShowThemePicker] = useState(false);
  const t = getTranslation(language);

  return (
    <header
      className={`flex items-center justify-between gap-4 px-5 py-3 backdrop-blur-md border-b relative z-30 transition-colors duration-300 ${appTheme.navClass}`}
    >
      {/* Zone 1: Single text element wordmark in Cinzel display face */}
      <div className="font-cinzel text-lg font-bold tracking-wider text-slate-100 whitespace-nowrap shrink-0 flex items-center gap-2">
        <span className={appTheme.accentTextClass}>✦</span>
        <span>{t.brand}</span>
      </div>

      {/* Zone 2: Concise single-line navigation links */}
      <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-300">
        <button
          onClick={onOpenTrainingDojo}
          className={`${appTheme.accentTextClass} hover:brightness-125 transition-colors whitespace-nowrap shrink-0 cursor-pointer font-semibold`}
        >
          {t.dojo}
        </button>
        <button
          onClick={onOpenGrimoire}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {t.grimoire}
        </button>
        <button
          onClick={onOpenLeaderboard}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {t.leaderboard}
        </button>
        <button
          onClick={onOpenRealms}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {t.realms}
        </button>
        <button
          onClick={onOpenCalibration}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {t.calibration}
        </button>
      </nav>

      {/* Zone 3: Language Switcher, Theme Selector, Mute */}
      <div className="flex items-center gap-2 shrink-0 relative">
        <div
          className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-200"
          title={t.languageLabel}
        >
          <Globe className={`w-3.5 h-3.5 shrink-0 ${appTheme.accentTextClass}`} />
          <select
            value={language}
            onChange={(e) => onChangeLanguage(e.target.value as AppLanguage)}
            aria-label={t.languageLabel}
            className="bg-transparent text-xs font-medium text-slate-100 focus:outline-none cursor-pointer pr-1"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-slate-950 text-slate-100">
                {lang.nativeName}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowThemePicker((prev) => !prev)}
            className={`px-2.5 py-1.5 text-slate-200 hover:text-white bg-slate-900/90 border rounded-lg hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium ${appTheme.borderAccentClass}`}
            title={t.homeArenaTheme}
          >
            <Palette className="w-3.5 h-3.5" style={{ color: appTheme.accentHex }} />
            <span className="hidden sm:inline max-w-[90px] truncate">{appTheme.name}</span>
          </button>

          {showThemePicker && (
            <div className="absolute right-0 mt-2 w-60 rounded-xl bg-slate-950/95 border border-slate-700 shadow-2xl p-3 z-50 backdrop-blur-xl">
              <div className="text-[11px] font-cinzel font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" style={{ color: appTheme.accentHex }} />
                <span>{t.homeArenaTheme}</span>
              </div>
              <div className="space-y-1">
                {APP_THEMES.map((theme) => {
                  const active = theme.id === appTheme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => {
                        onChangeTheme(theme.id);
                        setShowThemePicker(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                        active
                          ? 'bg-slate-800 text-white font-semibold border border-slate-600'
                          : 'text-slate-300 hover:bg-slate-900 border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${theme.accentHex}, ${theme.secondaryHex})`
                          }}
                        />
                        <span>{theme.name}</span>
                      </span>
                      {active && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onToggleMute}
          className="p-2 text-slate-300 hover:text-white bg-slate-900/90 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          aria-label="Toggle Sound"
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-slate-500" />
          ) : (
            <Volume2 className={`w-4 h-4 ${appTheme.accentTextClass}`} />
          )}
        </button>
      </div>
    </header>
  );
};

