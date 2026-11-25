import React, { useEffect, useState } from 'react';
import { RefreshCw, Server, Swords, Trophy, Users, Wifi, WifiOff } from 'lucide-react';
import type {
  ArenaId,
  ChatMessage,
  ConnectionMode,
  LeaderboardEntry,
  OnlineRoomSummary,
  PlayerProfile,
  RivalChampion,
} from '../types/game';
import { ARENAS, ARENA_LIST, RIVAL_CHAMPIONS, WEAPONS, getRankLabel } from '../data/gameCatalog';
import { SystemChatPanel } from './SystemChatPanel';

interface PvpCompetitionViewProps {
  profile: PlayerProfile;
  connected: boolean;
  connectionMode?: ConnectionMode;
  customServerUrl?: string;
  onSaveServerUrl?: (url: string) => void;
  onlinePlayers: number;
  rooms: OnlineRoomSummary[];
  activeRoom: OnlineRoomSummary | null;
  roomError: string;
  leaderboard: LeaderboardEntry[];
  worldMessages: ChatMessage[];
  roomMessages: ChatMessage[];
  onRefreshRooms: () => void;
  onCreateOnlineRoom: (roomName: string, arenaId: ArenaId) => void;
  onJoinOnlineRoom: (codeOrId: string) => void;
  onChallengeChampion: (champion: RivalChampion, arenaId: ArenaId) => void;
  onStartLocalPvp: (p2Champion: RivalChampion, arenaId: ArenaId) => void;
  onSendChat: (
    channel: 'world' | 'room',
    text: string,
    senderName: string,
    senderRank: string,
    isQuick?: boolean
  ) => void;
}

export const PvpCompetitionView: React.FC<PvpCompetitionViewProps> = ({
  profile,
  connected,
  connectionMode = connected ? 'live_server' : 'static_local',
  customServerUrl = '',
  onSaveServerUrl,
  onlinePlayers,
  rooms,
  activeRoom,
  roomError,
  leaderboard,
  worldMessages,
  roomMessages,
  onRefreshRooms,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  onChallengeChampion,
  onStartLocalPvp,
  onSendChat,
}) => {
  const [roomName, setRoomName] = useState(`حلبة ${profile.avatar.name}`);
  const [roomArena, setRoomArena] = useState<ArenaId>(profile.favoriteArena);
  const [joinCode, setJoinCode] = useState('');
  const [localArena, setLocalArena] = useState<ArenaId>('magma_caldera');
  const [localP2Id, setLocalP2Id] = useState<string>(RIVAL_CHAMPIONS[1].id);
  const [serverDraft, setServerDraft] = useState(customServerUrl);
  const [showServerConfig, setShowServerConfig] = useState(false);

  useEffect(() => {
    setServerDraft(customServerUrl);
  }, [customServerUrl]);

  useEffect(() => {
    onRefreshRooms();
  }, [onRefreshRooms]);

  const selectedLocalP2 = RIVAL_CHAMPIONS.find((c) => c.id === localP2Id) || RIVAL_CHAMPIONS[1];

  return (
    <main className="ui-shell-container space-y-[var(--ui-section-gap)]">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E6B85C]/20 pb-5">
        <div>
          <h1 className="font-display ui-section-title font-extrabold text-[#F1F5F9]">
            ساحات التنافس المباشر بين اللاعبين
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            أنشئ غرفة تنافس حية أونلاين لمقاتلة لاعبين آخرين في الوقت الفعلي، أو خُض مبارزة محلية 1 ضد 1، أو تحدَّ أبطال التصنيف.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span
            className={`inline-flex items-center gap-1.5 font-medium ${
              connected
                ? 'text-[#10B981]'
                : connectionMode === 'connecting'
                  ? 'text-[#F59E0B]'
                  : 'text-[#38BDF8]'
            }`}
          >
            {connected ? (
              <Wifi className="w-4 h-4" />
            ) : connectionMode === 'connecting' ? (
              <WifiOff className="w-4 h-4" />
            ) : (
              <Wifi className="w-4 h-4" />
            )}
            <span>
              {connected
                ? `متصل بالخادم الحي (${onlinePlayers} لاعب)`
                : connectionMode === 'connecting'
                  ? 'جارٍ الاتصال بالخادم...'
                  : 'الوضع الساكن / المحلي (GitHub Pages جاهز)'}
            </span>
          </span>
          <span className="text-[#566173]">·</span>
          <span className="text-[#CBD5E1]">
            تصنيفك:{' '}
            <strong className="font-mono-num text-[#E6B85C]">
              {profile.rating} ({getRankLabel(profile.rating)})
            </strong>
          </span>
          {onSaveServerUrl && (
            <button
              type="button"
              onClick={() => setShowServerConfig((v) => !v)}
              className="px-2.5 py-1 rounded-md bg-[#121C30] hover:bg-[#1B2B49] border border-white/15 text-[#CBD5E1] flex items-center gap-1.5 cursor-pointer"
            >
              <Server className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>إعداد الخادم</span>
            </button>
          )}
        </div>
      </div>

      {showServerConfig && onSaveServerUrl && (
        <section className="system-window rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-sm sm:text-base font-bold text-[#F1F5F9]">
                ربط خادم الأونلاين الخارجي (اختياري للنشر الساكن)
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                على GitHub Pages تعمل التحديات المصنفة، المبارزة المحلية، والدردشة عبر البث المحلي تلقائياً. يمكنك إدخال رابط خادم Node/WebSocket خارجي متى شئت.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="url"
              dir="ltr"
              value={serverDraft}
              onChange={(e) => setServerDraft(e.target.value)}
              placeholder="https://your-arena-server.onrender.com"
              className="flex-1 min-w-[220px] px-3.5 py-2 text-xs sm:text-sm bg-[#0A0F1A] border border-white/15 rounded-lg text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
            />
            <button
              type="button"
              onClick={() => onSaveServerUrl(serverDraft)}
              className="px-4 py-2 text-xs font-bold text-[#0A0F1A] bg-[#38BDF8] hover:bg-[#7DD3FC] rounded-lg cursor-pointer whitespace-nowrap"
            >
              حفظ والاتصال
            </button>
            <button
              type="button"
              onClick={() => {
                setServerDraft('');
                onSaveServerUrl('');
              }}
              className="px-3.5 py-2 text-xs font-semibold text-[#CBD5E1] bg-[#16223A] hover:bg-[#203050] border border-white/10 rounded-lg cursor-pointer whitespace-nowrap"
            >
              الوضع المحلي التلقائي
            </button>
          </div>
        </section>
      )}

      {roomError && (
        <div className="px-4 py-2.5 text-sm text-[#FCA5A5] bg-[#2B1517] border border-[#EF4444]/40 rounded-lg">
          {roomError}
        </div>
      )}

      {/* Row 1: Real-Time Online Multiplayer Rooms + Local 1v1 Duel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 landscape-split-12 gap-5 sm:gap-6 items-stretch">
        {/* Live WebSocket Rooms */}
        <section className="lg:col-span-7 landscape-span-7 system-window rounded-xl p-4 sm:p-6 flex flex-col justify-between space-y-5 sm:space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-[#F1F5F9]">
                  غرف القتال المباشر أونلاين
                </h2>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  افتح اللعبة في نافذتين أو شارك رمز الغرفة لخوض قتال ثلاثي الأبعاد حي في نفس الساحة.
                </p>
              </div>
              <button
                type="button"
                onClick={onRefreshRooms}
                className="p-2 rounded-lg bg-[#18253C] hover:bg-[#223454] text-[#CBD5E1] hover:text-[#F1F5F9] border border-white/10 transition-colors cursor-pointer"
                aria-label="تحديث الغرف"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Create Room Form */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={roomName}
                maxLength={28}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="اسم الغرفة"
                className="px-3.5 py-2.5 text-sm bg-[#0A0F1A] border border-white/15 rounded-lg text-[#F1F5F9] focus:outline-none focus:border-[#E6B85C]"
              />
              <select
                value={roomArena}
                onChange={(e) => setRoomArena(e.target.value as ArenaId)}
                className="px-3.5 py-2.5 text-sm bg-[#0A0F1A] border border-white/15 rounded-lg text-[#F1F5F9] focus:outline-none focus:border-[#E6B85C]"
              >
                {ARENA_LIST.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!connected}
                onClick={() => onCreateOnlineRoom(roomName.trim() || 'ساحة التحدي', roomArena)}
                className="px-4 py-2.5 text-sm font-bold text-[#0A0F1A] bg-[#E6B85C] hover:bg-[#F5D076] disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-md shadow-[#E6B85C]/15"
              >
                إنشاء غرفة ودخول
              </button>
            </div>

            {/* Join by Code */}
            <div className="flex items-center gap-3 pt-1">
              <input
                type="text"
                value={joinCode}
                maxLength={10}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="أدخل رمز الغرفة (مثال: AB-42)"
                className="flex-1 px-3.5 py-2 text-sm font-mono-num uppercase bg-[#0A0F1A] border border-white/15 rounded-lg text-[#F1F5F9] focus:outline-none focus:border-[#E6B85C]"
              />
              <button
                type="button"
                disabled={!connected || !joinCode.trim()}
                onClick={() => onJoinOnlineRoom(joinCode.trim())}
                className="px-4 py-2 text-sm font-semibold text-[#F1F5F9] bg-[#18253C] hover:bg-[#223454] disabled:opacity-40 border border-white/10 rounded-lg whitespace-nowrap cursor-pointer"
              >
                انضمام بالرمز
              </button>
            </div>
          </div>

          {/* Active Rooms List */}
          <div className="space-y-2.5 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between text-xs text-[#94A3B8]">
              <span>الغرف النشطة الآن</span>
              <span className="font-mono-num">{rooms.length} غرفة</span>
            </div>
            {rooms.length === 0 ? (
              <div className="p-4 rounded-lg bg-[#0D1422] border border-white/5 text-center text-xs text-[#94A3B8]">
                لا توجد غرف مفتوحة حالياً — أنشئ غرفة جديدة أعلاه وشارك الرمز مع صديقك أو افتح نافذة ثانية للتجربة الفورية.
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {rooms.map((r) => (
                  <div
                    key={r.id}
                    className="p-3.5 rounded-lg bg-[#0D1422] border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2">
                        <span>{r.name}</span>
                        <span className="font-mono-num text-xs text-[#E6B85C]">{r.code}</span>
                      </div>
                      <div className="text-xs text-[#94A3B8] mt-0.5">
                        {ARENAS[r.arenaId]?.name || r.arenaId} · المضيف: {r.hostName} ·{' '}
                        <span className="font-mono-num">
                          {r.playerCount}/{r.maxPlayers}
                        </span>{' '}
                        لاعب
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onJoinOnlineRoom(r.code)}
                      className="px-3.5 py-1.5 text-xs font-bold text-[#0A0F1A] bg-[#E6B85C] hover:bg-[#F5D076] rounded-md whitespace-nowrap cursor-pointer"
                    >
                      انضمام للقتال
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Local 1v1 Shared-Arena PvP */}
        <section className="lg:col-span-5 landscape-span-5 system-window rounded-xl p-4 sm:p-6 flex flex-col justify-between space-y-4 sm:space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#E6B85C]">
              <Users className="w-5 h-5" />
              <h2 className="font-display text-xl font-bold text-[#F1F5F9]">
                مبارزة محلية (لاعبان على نفس الجهاز)
              </h2>
            </div>
            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              تنافس مباشر وجهاً لوجه مع صديقك في نفس الساحة ثلاثية الأبعاد — الأفضل من 3 جولات!
            </p>

            <div className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs text-[#94A3B8]">أفتار اللاعب الثاني (P2)</span>
                <select
                  value={localP2Id}
                  onChange={(e) => setLocalP2Id(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0A0F1A] border border-white/15 rounded-lg text-[#F1F5F9] focus:outline-none focus:border-[#E6B85C]"
                >
                  {RIVAL_CHAMPIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {WEAPONS[c.avatar.weaponId].name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs text-[#94A3B8]">ساحة المبارزة</span>
                <select
                  value={localArena}
                  onChange={(e) => setLocalArena(e.target.value as ArenaId)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0A0F1A] border border-white/15 rounded-lg text-[#F1F5F9] focus:outline-none focus:border-[#E6B85C]"
                >
                  {ARENA_LIST.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="p-3.5 rounded-lg bg-[#0D1422] border border-white/5 text-xs space-y-1.5 text-[#CBD5E1]">
              <div>
                <strong className="text-[#E6B85C]">اللاعب 1:</strong> حركة <span className="font-mono-num">WASD</span> · هجوم{' '}
                <span className="font-mono-num">Space</span> · ثقيل <span className="font-mono-num">E</span> · 4 مهارات{' '}
                <span className="font-mono-num">Q / R / Z / X</span> · مراوغة <span className="font-mono-num">Shift</span>
              </div>
              <div>
                <strong className="text-[#38BDF8]">اللاعب 2:</strong> حركة <span className="font-mono-num">الأسهم</span> · هجوم{' '}
                <span className="font-mono-num">K</span> · ثقيل <span className="font-mono-num">L</span> · قوة{' '}
                <span className="font-mono-num">O</span> · مراوغة <span className="font-mono-num">P</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onStartLocalPvp(selectedLocalP2, localArena)}
            className="w-full py-3 px-4 text-sm font-bold text-[#0A0F1A] bg-[#E6B85C] hover:bg-[#F5D076] rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#E6B85C]/15"
          >
            <Swords className="w-4 h-4" />
            <span>بدء مبارزة 1 ضد 1 المحلية</span>
          </button>
        </section>
      </div>

      {/* Live World & Room Chat System */}
      <section>
        <SystemChatPanel
          playerName={profile.avatar.name}
          playerRating={profile.rating}
          connected={connected}
          connectionMode={connectionMode}
          activeRoom={activeRoom}
          worldMessages={worldMessages}
          roomMessages={roomMessages}
          onSendChat={onSendChat}
        />
      </section>

      {/* Row 2: Ranked Champions Ladder & Direct Challenge */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#E6B85C]" />
            <h2 className="font-display text-xl font-bold text-[#F1F5F9]">
              سلم أبطال الميدان والتحدي المصنّف
            </h2>
          </div>
          <span className="text-xs text-[#94A3B8]">
            اربح النزالات المصنفة لجمع +34 نقطة تصنيف وصناديق مكافآت
          </span>
        </div>

        <div className="bg-[#121B2D]/90 backdrop-blur-md border border-[#E6B85C]/20 rounded-xl overflow-x-auto shadow-xl">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-[#94A3B8] bg-[#0D1422]/60">
                <th className="py-3.5 px-4 font-medium">المركز</th>
                <th className="py-3.5 px-4 font-medium">المقاتل</th>
                <th className="py-3.5 px-4 font-medium">السلاح المفضل</th>
                <th className="py-3.5 px-4 font-medium">الرتبة</th>
                <th className="py-3.5 px-4 font-medium">الانتصارات</th>
                <th className="py-3.5 px-4 font-medium">التصنيف</th>
                <th className="py-3.5 px-4 font-medium text-left">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(leaderboard.length > 0
                ? leaderboard
                : RIVAL_CHAMPIONS.map(
                    (c): LeaderboardEntry => ({
                      id: c.id,
                      name: c.name,
                      rankTitle: getRankLabel(c.rating),
                      rating: c.rating,
                      wins: c.wins,
                      weaponId: c.avatar.weaponId,
                      championId: c.id,
                      isLiveUser: false,
                    })
                  )
              ).map((entry, idx) => {
                const champ = RIVAL_CHAMPIONS.find((c) => c.id === entry.championId || c.id === entry.id);
                const isSelf = entry.name === profile.avatar.name && entry.isLiveUser;
                return (
                  <tr
                    key={entry.id}
                    className={`${isSelf ? 'bg-[#18253C]' : 'hover:bg-white/[0.03]'} transition-colors`}
                  >
                    <td className="py-3.5 px-4 font-mono-num font-bold text-[#CBD5E1]">
                      #{idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#F1F5F9]">
                      <span>{entry.name}</span>
                      {isSelf && (
                        <>
                          <span className="text-xs font-normal text-[#E6B85C] mr-2">(أنت)</span>
                          <span className="text-[11px] font-medium text-[#38BDF8] mr-1.5">
                            · «{profile.avatar.title}»
                          </span>
                        </>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#CBD5E1]">
                      {WEAPONS[entry.weaponId]?.name || 'نصل الطليعة'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#E6B85C] font-semibold">
                      {entry.rankTitle}
                    </td>
                    <td className="py-3.5 px-4 font-mono-num text-[#F1F5F9]">{entry.wins}</td>
                    <td className="py-3.5 px-4 font-mono-num font-bold text-[#E6B85C]">
                      {entry.rating}
                    </td>
                    <td className="py-3.5 px-4 text-left">
                      {champ ? (
                        <button
                          type="button"
                          onClick={() => onChallengeChampion(champ, champ.arenaFavorite)}
                          className="px-3.5 py-1.5 text-xs font-bold text-[#0A0F1A] bg-[#E6B85C] hover:bg-[#F5D076] rounded-md whitespace-nowrap cursor-pointer"
                        >
                          تحدَّ في {ARENAS[champ.arenaFavorite].name.split(' ')[0]}
                        </button>
                      ) : (
                        <span className="text-xs text-[#64748B]">لاعب مصنّف</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};
