import React from 'react';
import { Award, Coins, Compass, Gem, Palette, Shield, Sparkles, Swords, Trophy, User } from 'lucide-react';
import type { AppDestination, PlayerProfile, SystemTheme } from '../types/game';

interface TopNavProps {
  active: AppDestination;
  profile?: PlayerProfile;
  systemTheme: SystemTheme;
  onToggleSystemTheme: () => void;
  onNavigate: (dest: AppDestination) => void;
  onQuickFight: () => void;
}

const NAV_ITEMS: {
  id: Exclude<AppDestination, 'combat'>;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'hub', label: 'النقابة والساحة', shortLabel: 'الساحة', icon: Compass },
  { id: 'forge', label: 'الأفتار والمهارات', shortLabel: 'الأفتار', icon: User },
  { id: 'armory', label: 'المتجر والسامان', shortLabel: 'المتجر', icon: Shield },
  { id: 'rewards', label: 'العقود والمهام', shortLabel: 'المهام', icon: Sparkles },
  { id: 'pvp', label: 'التنافس والدردشة', shortLabel: 'التنافس', icon: Trophy },
];

export const TopNav: React.FC<TopNavProps> = ({
  active,
  profile,
  systemTheme,
  onToggleSystemTheme,
  onNavigate,
  onQuickFight,
}) => {
  return (
    <>
      <header
        className="sticky top-0 z-30 backdrop-blur-xl border-b shadow-lg shadow-black/35 safe-pad-top"
        style={{
          backgroundColor: 'var(--sys-surface-deep)',
          borderColor: 'var(--sys-border)',
        }}
      >
        <div className="max-w-[1380px] mx-auto px-[var(--ui-pad-x)] h-14 sm:h-16 landscape-phone-header-inner flex items-center justify-between gap-2 sm:gap-3">
          {/* Zone 1: Manhwa System Crest & Brand */}
          <button
            type="button"
            onClick={() => onNavigate('hub')}
            className="font-display text-sm sm:text-xl font-extrabold tracking-tight text-[#F8FAFC] hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2"
          >
            <span
              className="w-7 h-7 rounded-lg border flex items-center justify-center shrink-0"
              style={{
                borderColor: 'var(--sys-accent)',
                background: 'linear-gradient(135deg, var(--sys-accent-soft), var(--sys-primary-soft))',
              }}
              aria-hidden="true"
            >
              <span
                className="w-2.5 h-2.5 rotate-45 inline-block"
                style={{ backgroundColor: 'var(--sys-accent)' }}
              />
            </span>
            <span>ميدان الأبطال</span>
          </button>

          {/* Zone 2: Desktop + Landscape Phone Navigation Links */}
          <nav className="hidden md:flex landscape-phone-inline-nav items-center gap-2.5 md:gap-5 lg:gap-7 overflow-x-auto no-scrollbar">
            {NAV_ITEMS.map((item) => {
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`landscape-phone-nav-link relative py-2 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive ? 'text-[#F8FAFC]' : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                  }`}
                >
                  <span className="landscape-label-full">{item.label}</span>
                  <span className="hidden landscape-label-short">{item.shortLabel}</span>
                  {isActive && (
                    <span
                      className="absolute bottom-0 inset-x-0 h-0.5 rounded-full"
                      style={{
                        background:
                          'linear-gradient(to left, var(--sys-primary), var(--sys-accent), var(--sys-primary))',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Theme Switcher + Currencies + Primary Action */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleSystemTheme}
              title="تبديل سمة واجهة المانهوا (النظام الملكي / الهاوية القرمزية)"
              className="min-h-[34px] sm:min-h-[38px] px-2 sm:px-2.5 py-1 rounded-lg bg-[#0C1324] hover:bg-[#15203A] border border-white/15 text-xs font-bold text-[#F1F5F9] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Palette className="w-3.5 h-3.5" style={{ color: 'var(--sys-primary)' }} />
              <span className="hidden md:inline">
                {systemTheme === 'royal_cyan' ? 'النظام الملكي' : 'الهاوية البنفسجية'}
              </span>
            </button>

            {profile && (
              <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#0B1222] border border-white/10 text-xs font-mono-num">
                <span className="flex items-center gap-1 text-[#E6B85C]" title="الذهب">
                  <Coins className="w-3.5 h-3.5" />
                  <span>{profile.gold}</span>
                </span>
                <span className="text-white/15">|</span>
                <span className="flex items-center gap-1 text-[#38BDF8]" title="الجواهر">
                  <Gem className="w-3.5 h-3.5" />
                  <span>{profile.gems}</span>
                </span>
                <span className="text-white/15">|</span>
                <span className="flex items-center gap-1 text-[#10B981]" title="أوسمة النقابة">
                  <Award className="w-3.5 h-3.5" />
                  <span>{profile.guildMarks}</span>
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={onQuickFight}
              className="min-h-[36px] sm:min-h-[38px] px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold system-btn-primary rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <Swords className="w-4 h-4" />
              <span>ابدأ القتال</span>
            </button>
          </div>
        </div>
      </header>

      {/* Responsive Mobile Bottom Navigation Bar (< md, hidden in short horizontal phone landscape) */}
      <nav
        aria-label="التنقل السريع"
        className="md:hidden landscape-phone-hide-bottom fixed bottom-0 inset-x-0 z-30 border-t backdrop-blur-xl px-1 pt-1 pb-[max(0.25rem,var(--safe-bottom))] grid grid-cols-5 gap-1"
        style={{
          backgroundColor: 'var(--sys-surface-deep)',
          borderColor: 'var(--sys-border)',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={`mob_${item.id}`}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`min-h-[46px] px-1 py-1 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                isActive ? 'text-[#F8FAFC] bg-white/10' : 'text-[#94A3B8]'
              }`}
              style={isActive ? { color: 'var(--sys-primary)' } : undefined}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-full">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
