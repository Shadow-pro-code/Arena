import React, { useState } from 'react';
import { BookOpen, Compass, Shield, Sparkles, Swords, X } from 'lucide-react';
import type { StarterBlessing } from '../types/game';
import { BUNDLED_IMAGES } from '../data/bundledAssets';

interface StoryPrologueModalProps {
  open: boolean;
  playerName: string;
  hasSeenIntro: boolean;
  onCompleteIntro: (blessing: StarterBlessing) => void;
  onClose: () => void;
}

const CHAPTERS = [
  {
    id: 1,
    badge: 'الفصل الأول · نداء البوابة السماوية',
    title: 'استدعاء بطل جديد إلى قارة إيثيريا',
    body: 'انشقّت سماء العالم القديم ببوابة ذهبية عابرة للأبعاد، واستُدعي روحُك إلى قارة «إيثيريا» الممزقة بين إشعاع الأثير وظلال الهاوية. عند بوابة قرية الملاذ، التقط الحكيم أوريون إشارة قدومك ليمنحك ميثاق المستدعى الأول.',
    highlight: 'عالم إيثيريا المفتوح يمتد الآن بقطر 14,000 متر كاملة (توسّع 100×) بتسعة أقاليم متصلة وأسرار منسية.',
  },
  {
    id: 2,
    badge: 'الفصل الثاني · النقابة والحياة اليومية',
    title: 'قوتك تُصنع من المهارة والعمل كما من السيف',
    body: 'في قرية الملاذ الآمنة، لن تقاتل وحيداً! رئيس النقابة كايل، الحدّاد برون، الخيميائية ليرا، والتاجر سليم بانتظارك بعقود عمل مجزية لجمع الأعشاب والمعادن والبلورات وكسب أوسمة النقابة والذهب، قبل العبور إلى ساحات القتال الست الكبرى.',
    highlight: '8 سمات قتالية قابلة للتطوير + 4 مهارات قتالية نشطة [Q] [R] [Z] [X] + 6 كاميرات عرض!',
  },
];

const BLESSINGS: {
  id: StarterBlessing;
  title: string;
  subtitle: string;
  bonuses: string[];
  accent: string;
  icon: 'sword' | 'magic' | 'luck';
}[] = [
  {
    id: 'vanguard',
    title: 'بركة الطليعة الحديدية',
    subtitle: 'للمحاربين وأبطال الاشتباك المباشر والصلابة',
    bonuses: ['+3 قوة (STR)', '+2 دفاع (DEF)', '+2 حيوية (VIT)', '+180 ذهب'],
    accent: '#F97316',
    icon: 'sword',
  },
  {
    id: 'arcane',
    title: 'بركة الأثير السحري',
    subtitle: 'لسحرة المهارات الخارقة وإيقاع التعاويذ السريع',
    bonuses: ['+3 ذكاء (INT)', '+2 روح (SPR)', '+2 براعة (DEX)', '+10 جواهر · +140 ذهب'],
    accent: '#38BDF8',
    icon: 'magic',
  },
  {
    id: 'fortune',
    title: 'بركة الرحّال المحظوظ',
    subtitle: 'لمستكشفي القارة وصائدي الكنوز والغنائم',
    bonuses: ['+3 حظ (LCK)', '+2 رشاقة (AGI)', '+25 وسام نقابة', '+280 ذهب + صندوق محارب'],
    accent: '#E6B85C',
    icon: 'luck',
  },
];

export const StoryPrologueModal: React.FC<StoryPrologueModalProps> = ({
  open,
  playerName,
  hasSeenIntro,
  onCompleteIntro,
  onClose,
}) => {
  const [step, setStep] = useState<number>(0);
  const [selectedBlessing, setSelectedBlessing] = useState<StarterBlessing>('vanguard');

  if (!open) return null;

  const isBlessingStep = step === 2;
  const chapter = CHAPTERS[step] || CHAPTERS[0];

  const handleConfirmBlessing = () => {
    onCompleteIntro(selectedBlessing);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#050811]/88 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="قصة استدعاء المستدعى في إيثيريا"
    >
      <div className="w-full max-w-4xl max-h-[94dvh] overflow-y-auto isekai-panel rounded-2xl shadow-2xl my-auto">
        {/* Dramatic Visual Banner */}
        <div className="relative h-36 sm:h-52 landscape-phone-story-banner bg-[#0B1120] overflow-hidden shrink-0">
          <img
            src={BUNDLED_IMAGES.storyAwakening}
            alt="بوابة استدعاء إيثيريا"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D1422] via-[#0D1422]/45 to-transparent" />
          <div className="absolute top-2.5 sm:top-3 inset-x-3 sm:inset-x-4 flex items-center justify-between">
            <span className="px-2.5 sm:px-3 py-1 rounded-lg bg-[#0A0F1A]/80 border border-[#E6B85C]/40 text-[11px] sm:text-xs font-bold text-[#E6B85C] flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>سِفر بداية إيثيريا · {playerName}</span>
            </span>
            {hasSeenIntro && (
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق القصة"
                className="p-2 rounded-lg bg-[#0A0F1A]/80 hover:bg-[#16223A] border border-white/15 text-[#CBD5E1] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="absolute bottom-2.5 sm:bottom-3 inset-x-4 sm:inset-x-5 flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-[#7DD3FC]">
              {isBlessingStep ? 'الفصل الثالث · ميثاق البركة الأولى' : chapter.badge}
            </span>
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setStep(idx)}
                  aria-label={`الفصل ${idx + 1}`}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    step === idx ? 'w-7 bg-[#E6B85C]' : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {!isBlessingStep ? (
            <div className="space-y-4">
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F8FAFC]">
                {chapter.title}
              </h2>
              <p className="text-sm sm:text-base text-[#CBD5E1] leading-relaxed">
                {chapter.body}
              </p>
              <div className="p-3.5 rounded-xl bg-[#0B1220] border border-[#38BDF8]/30 text-xs sm:text-sm font-semibold text-[#7DD3FC] flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[#E6B85C] shrink-0" />
                <span>{chapter.highlight}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-2xl font-extrabold text-[#F8FAFC]">
                  {hasSeenIntro ? 'سجل بركات الاستدعاء الثلاث' : 'اختر بركة الاستدعاء الأولى لبطلك'}
                </h2>
                <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
                  {hasSeenIntro
                    ? 'لقد فعلت بركة الاستدعاء مسبقاً في بداية رحلتك، ويمكنك مراجعة الفصول في أي وقت.'
                    : 'تمنحك البركة دفعة فورية في السمات الثماني والذهب لتبدأ مغامرتك بأسلوبك المفضل.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {BLESSINGS.map((b) => {
                  const active = selectedBlessing === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBlessing(b.id)}
                      className={`text-right p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                        active
                          ? 'bg-[#17243D] border-[#E6B85C] shadow-[0_0_24px_-8px_rgba(230,184,92,0.45)]'
                          : 'bg-[#0B1220] border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span
                            className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/10"
                            style={{ backgroundColor: `${b.accent}22`, color: b.accent }}
                          >
                            {b.icon === 'sword' ? (
                              <Swords className="w-4 h-4" />
                            ) : b.icon === 'magic' ? (
                              <Sparkles className="w-4 h-4" />
                            ) : (
                              <Compass className="w-4 h-4" />
                            )}
                          </span>
                          {active && (
                            <span className="text-[11px] font-bold text-[#E6B85C]">مختارة</span>
                          )}
                        </div>
                        <h3 className="font-display text-base font-bold text-[#F8FAFC]">
                          {b.title}
                        </h3>
                        <p className="text-xs text-[#94A3B8] leading-snug">{b.subtitle}</p>
                      </div>

                      <div className="pt-2 border-t border-white/10 flex flex-wrap gap-1.5 text-[11px] font-mono-num">
                        {b.bonuses.map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-[#141F35] text-[#E2E8F0] border border-white/10"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  className="px-4 py-2.5 text-xs font-semibold text-[#CBD5E1] bg-[#141F35] hover:bg-[#1D2D4C] border border-white/10 rounded-xl cursor-pointer"
                >
                  السابق
                </button>
              )}
              {!isBlessingStep && !hasSeenIntro && (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-3 py-2.5 text-xs font-medium text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer"
                >
                  تخطي إلى اختيار البركة
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {!isBlessingStep ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.min(2, s + 1))}
                  className="px-6 py-2.5 text-sm font-bold text-[#0A0F1A] bg-[#E6B85C] hover:bg-[#F5D076] rounded-xl flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <span>متابعة القصة</span>
                  <Shield className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmBlessing}
                  className="px-6 py-2.5 text-sm font-bold text-[#0A0F1A] bg-gradient-to-r from-[#E6B85C] to-[#F5D076] hover:brightness-105 rounded-xl flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{hasSeenIntro ? 'العودة إلى إيثيريا' : 'تفعيل البركة وبدء المغامرة'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
