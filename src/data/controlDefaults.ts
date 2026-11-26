import type {
  GraphicsQuality,
  HudCustomizationConfig,
  KeyActionId,
  KeyBindingsConfig,
  RenderEngineMode,
} from '../types/game';

export const DEFAULT_KEY_BINDINGS: KeyBindingsConfig = {
  moveForward: 'KeyW',
  moveBackward: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  attack: 'KeyJ',
  heavy: 'KeyE',
  jump: 'Space',
  dodge: 'ShiftLeft',
  block: 'KeyF',
  skill0: 'KeyQ',
  skill1: 'KeyR',
  skill2: 'KeyZ',
  skill3: 'KeyX',
  sprint: 'KeyC',
  interact: 'KeyG',
  map: 'KeyM',
  camera: 'KeyV',
  toggleHud: 'KeyH',
  potion1: 'Digit1',
  potion2: 'Digit2',
  potion3: 'Digit3',
  potion4: 'Digit4',
  quickSwap: 'KeyB',
  swapDeck: 'KeyN',
  lockOn: 'KeyT',
};

export const KEY_ACTION_LABELS: { id: KeyActionId; label: string; group: 'movement' | 'combat' | 'utility' }[] = [
  { id: 'moveForward', label: 'تقدّم للأمام', group: 'movement' },
  { id: 'moveBackward', label: 'تراجع للخلف', group: 'movement' },
  { id: 'moveLeft', label: 'حركة لليسار', group: 'movement' },
  { id: 'moveRight', label: 'حركة لليمين', group: 'movement' },
  { id: 'jump', label: 'قفز حر وتحكم بالهواء', group: 'movement' },
  { id: 'sprint', label: 'ركض سريع (اندفاع)', group: 'movement' },
  { id: 'dodge', label: 'مراوغة / دحرجة (تُدمج مع الهجوم)', group: 'combat' },
  { id: 'attack', label: 'هجوم أساسي (+ نقر الفأرة الأيسر)', group: 'combat' },
  { id: 'heavy', label: 'ضربة ثقيلة (+ نقر الفأرة الأيمن)', group: 'combat' },
  { id: 'block', label: 'صدّ ودفاع / صدّ مثالي', group: 'combat' },
  { id: 'lockOn', label: 'تثبيت الهدف القريب', group: 'combat' },
  { id: 'quickSwap', label: 'التبديل السريع للمهارات', group: 'combat' },
  { id: 'swapDeck', label: 'تبديل طقم المهارات (1 ↔ 2)', group: 'combat' },
  { id: 'skill0', label: 'المهارة 1', group: 'combat' },
  { id: 'skill1', label: 'المهارة 2', group: 'combat' },
  { id: 'skill2', label: 'المهارة 3', group: 'combat' },
  { id: 'skill3', label: 'المهارة 4', group: 'combat' },
  { id: 'interact', label: 'تفاعل / جمع / فتح كنز', group: 'utility' },
  { id: 'map', label: 'خريطة إيثيريا', group: 'utility' },
  { id: 'camera', label: 'تبديل زاوية الكاميرا', group: 'utility' },
  { id: 'toggleHud', label: 'إخفاء/إظهار واجهة القتال', group: 'utility' },
  { id: 'potion1', label: 'جرعة الشفاء', group: 'utility' },
  { id: 'potion2', label: 'لفيفة الطاقة والمانا', group: 'utility' },
  { id: 'potion3', label: 'إكسير الغضب', group: 'utility' },
  { id: 'potion4', label: 'الأداة التكتيكية السريعة', group: 'utility' },
];

export const DEFAULT_HUD_CONFIG: HudCustomizationConfig = {
  zenMode: false,
  hudScale: 1,
  hudOpacity: 0.92,
  cameraSensitivity: 1,
  autoDrinkHeal: true,
  mobilePreset: 'standard',
  mobileButtonsScale: 1,
  joystickOffset: { x: 0, y: 0 },
  actionsOffset: { x: 0, y: 0 },
  widgets: {
    radar: true,
    mission: true,
    biomeStrip: true,
    fps: true,
    controlsHint: true,
    floatingDamage: true,
    bossBar: true,
  },
};

export const QUALITY_LEVELS: {
  id: GraphicsQuality;
  label: string;
  shortDesc: string;
}[] = [
  { id: 'eco', label: 'اقتصادي', shortDesc: 'أخف استهلاك للأجهزة الضعيفة والبطارية' },
  { id: 'balanced', label: 'متوازن', shortDesc: 'سلاسة عالية مع تفاصيل متكاملة' },
  { id: 'high', label: 'عالي', shortDesc: 'إضاءة أغنى وظلال ناعمة ومسافة رؤية أوسع' },
  { id: 'ultra', label: 'فائق', shortDesc: 'توهّج ناعم وضباب قاري وانعكاسات خفيفة' },
  { id: 'mythic', label: 'أسطوري', shortDesc: 'أقصى تفاصيل للمشاهد والسيوف والجسيمات' },
  {
    id: 'impossible',
    label: 'الجودة المستحيلة',
    shortDesc: 'طابع واقعي ناعم (GTA Vice Stylized) + إضاءة ديناميكية وتوهّج سينمائي',
  },
];

export const RENDER_ENGINE_OPTIONS: {
  id: RenderEngineMode;
  label: string;
  desc: string;
}[] = [
  {
    id: 'auto',
    label: 'تلقائي (ذكي)',
    desc: 'يختار WebGL عند توفر بطاقة رسوم حقيقية أو المحرك الخفيف تلقائياً',
  },
  {
    id: 'webgl',
    label: 'WebGL 1/2',
    desc: 'محرك Three.js ثلاثي الأبعاد بخامات ناعمة وإضاءة تلقائية لكل ساحة وإقليم',
  },
  {
    id: 'canvas2d',
    label: 'الخفيف (Canvas2D)',
    desc: 'محرك البرمجيات السريع بدون WebGL المتوافق مع كل المتصفحات',
  },
];

export function formatKeyCodeLabel(code: string): string {
  if (!code) return '-';
  if (code === 'Space') return 'Space';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl';
  if (code === 'AltLeft' || code === 'AltRight') return 'Alt';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return code.replace('Arrow', 'سهم ');
  return code;
}
