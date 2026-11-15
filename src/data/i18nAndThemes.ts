import { AppLanguage, AppThemeId } from '../types/game';

export interface AppThemeConfig {
  id: AppThemeId;
  name: string;
  accentHex: string;
  secondaryHex: string;
  arenaTintHex: string;
  homeBgClass: string;
  auraBlobClass: string;
  navClass: string;
  cardClass: string;
  primaryBtnClass: string;
  accentTextClass: string;
  borderAccentClass: string;
}

export const APP_THEMES: AppThemeConfig[] = [
  {
    id: 'obsidian_gold',
    name: 'Obsidian & Gold',
    accentHex: '#f59e0b',
    secondaryHex: '#fbbf24',
    arenaTintHex: '#f59e0b',
    homeBgClass: 'from-slate-950 via-slate-900 to-slate-950',
    auraBlobClass: 'bg-amber-500/10',
    navClass: 'bg-slate-950/85 border-slate-800/80',
    cardClass: 'bg-slate-900/70 border-slate-800',
    primaryBtnClass: 'from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-amber-500/25',
    accentTextClass: 'text-amber-400',
    borderAccentClass: 'border-amber-500/40'
  },
  {
    id: 'crimson_ember',
    name: 'Crimson Ember',
    accentHex: '#ef4444',
    secondaryHex: '#fb7185',
    arenaTintHex: '#ef4444',
    homeBgClass: 'from-[#180507] via-[#2b090e] to-[#0f0305]',
    auraBlobClass: 'bg-red-500/15',
    navClass: 'bg-[#140507]/90 border-red-900/60',
    cardClass: 'bg-red-950/35 border-red-900/50',
    primaryBtnClass: 'from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white shadow-red-500/30',
    accentTextClass: 'text-red-400',
    borderAccentClass: 'border-red-500/45'
  },
  {
    id: 'emerald_forest',
    name: 'Emerald Grove',
    accentHex: '#10b981',
    secondaryHex: '#34d399',
    arenaTintHex: '#10b981',
    homeBgClass: 'from-[#03140e] via-[#07271c] to-[#020c09]',
    auraBlobClass: 'bg-emerald-500/15',
    navClass: 'bg-[#04140f]/90 border-emerald-900/60',
    cardClass: 'bg-emerald-950/35 border-emerald-900/50',
    primaryBtnClass: 'from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-500/25',
    accentTextClass: 'text-emerald-400',
    borderAccentClass: 'border-emerald-500/45'
  },
  {
    id: 'frost_sapphire',
    name: 'Frost Sapphire',
    accentHex: '#38bdf8',
    secondaryHex: '#7dd3fc',
    arenaTintHex: '#38bdf8',
    homeBgClass: 'from-[#040e1f] via-[#091f3d] to-[#020814]',
    auraBlobClass: 'bg-sky-500/15',
    navClass: 'bg-[#050f21]/90 border-sky-900/60',
    cardClass: 'bg-sky-950/35 border-sky-900/50',
    primaryBtnClass: 'from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-950 shadow-sky-500/25',
    accentTextClass: 'text-sky-400',
    borderAccentClass: 'border-sky-500/45'
  },
  {
    id: 'celestial_violet',
    name: 'Celestial Void',
    accentHex: '#a855f7',
    secondaryHex: '#e879f9',
    arenaTintHex: '#c084fc',
    homeBgClass: 'from-[#0f051c] via-[#1f0a38] to-[#080210]',
    auraBlobClass: 'bg-purple-500/15',
    navClass: 'bg-[#10061e]/90 border-purple-900/60',
    cardClass: 'bg-purple-950/35 border-purple-900/50',
    primaryBtnClass: 'from-purple-500 to-fuchsia-500 hover:from-purple-400 hover:to-fuchsia-400 text-white shadow-purple-500/30',
    accentTextClass: 'text-purple-400',
    borderAccentClass: 'border-purple-500/45'
  },
  {
    id: 'midnight_teal',
    name: 'Aetheric Ocean',
    accentHex: '#14b8a6',
    secondaryHex: '#2dd4bf',
    arenaTintHex: '#2dd4bf',
    homeBgClass: 'from-[#031317] via-[#082a30] to-[#020c0e]',
    auraBlobClass: 'bg-teal-500/15',
    navClass: 'bg-[#041418]/90 border-teal-900/60',
    cardClass: 'bg-teal-950/35 border-teal-900/50',
    primaryBtnClass: 'from-teal-400 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 text-slate-950 shadow-teal-500/25',
    accentTextClass: 'text-teal-300',
    borderAccentClass: 'border-teal-500/45'
  }
];

export const LANGUAGES: { code: AppLanguage; label: string; nativeName: string; dir?: 'rtl' | 'ltr' }[] = [
  { code: 'en', label: 'English', nativeName: 'English' },
  { code: 'es', label: 'Spanish', nativeName: 'Español' },
  { code: 'fr', label: 'French', nativeName: 'Français' },
  { code: 'ar', label: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ja', label: 'Japanese', nativeName: '日本語' },
  { code: 'zh', label: 'Chinese', nativeName: '中文' }
];

export interface TranslationDict {
  brand: string;
  dojo: string;
  grimoire: string;
  leaderboard: string;
  realms: string;
  calibration: string;
  tagline: string;
  heroDesc: string;
  defendWaves: string;
  roleplayWorld: string;
  tutorialDojo: string;
  customizeHands: string;
  armory: string;
  archMageRank: string;
  portalKeys: string;
  equippedArmor: string;
  powersMastered: string;
  homeArenaTheme: string;
  languageLabel: string;
  health: string;
  mana: string;
  totalScore: string;
  accuracy: string;
  skyBalloon: string;
  ready: string;
  wardrobe: string;
  decorate: string;
  map: string;
  battleArena: string;
  outfitTitle: string;
  outfitSubtitle: string;
  genderLabel: string;
  female: string;
  male: string;
  neutral: string;
  hairstyleLabel: string;
  bangsLabel: string;
  rearHairLabel: string;
  skinToneLabel: string;
  wearOutfit: string;
  practiceInDojo: string;
  equipAndEnterBattle: string;
  newPowerUnlocked: string;
}

const EN_DICT: TranslationDict = {
  brand: 'Arcane Gestures',
  dojo: 'Tutorial Dojo',
  grimoire: 'Grimoire',
  leaderboard: 'Leaderboard',
  realms: 'Realms',
  calibration: 'Calibration',
  tagline: '1-Hand & 2-Hand Magic · 8 Fantasy Realms & Portal Keys · Open-World Roleplay Town',
  heroDesc:
    'Cast continuous spells with 1 hand (or raise 2 hands for Dual Boost & Forbidden Arts), customize your arena hands & RPG character, unlock Dimensional Portals with Keys, and explore House, Playground, Hospital, Superstore, Hills, Underground Cavern & Mountains!',
  defendWaves: 'Defend Horde Waves',
  roleplayWorld: 'Roleplay World (RPG)',
  tutorialDojo: 'Tutorial Dojo',
  customizeHands: 'Customize Hands',
  armory: 'Armory',
  archMageRank: 'Arch-Mage Rank',
  portalKeys: 'Portal Keys',
  equippedArmor: 'Equipped Armor',
  powersMastered: 'Powers Mastered',
  homeArenaTheme: 'Home & Arena Theme',
  languageLabel: 'Language',
  health: 'HEALTH',
  mana: 'MANA',
  totalScore: 'TOTAL SCORE',
  accuracy: 'Accuracy',
  skyBalloon: 'Sky Balloon',
  ready: 'READY!',
  wardrobe: 'Outfit',
  decorate: 'Decorate',
  map: 'Map',
  battleArena: 'Battle Arena',
  outfitTitle: 'Heroic Wardrobe & Character Creator',
  outfitSubtitle: 'Choose gender, hairstyles, skin tone, cloaks, pauldrons, helmets & signature weapons',
  genderLabel: 'Hero Gender & Silhouette',
  female: 'Female',
  male: 'Male',
  neutral: 'Neutral',
  hairstyleLabel: 'Hairstyle',
  bangsLabel: 'Bangs & Side Fringe',
  rearHairLabel: 'Rear / Back Hair',
  skinToneLabel: 'Skin Tone',
  wearOutfit: 'Wear This Hero Look',
  practiceInDojo: 'Practice in Dojo',
  equipAndEnterBattle: 'Equip & Enter Battle',
  newPowerUnlocked: 'New Power Unlocked!'
};

export const TRANSLATIONS: Record<AppLanguage, TranslationDict> = {
  en: EN_DICT,
  es: {
    brand: 'Gestos Arcanos',
    dojo: 'Dojo Tutorial',
    grimoire: 'Grimorio',
    leaderboard: 'Clasificación',
    realms: 'Reinos',
    calibration: 'Calibración',
    tagline: 'Magia de 1 y 2 Manos · 8 Reinos de Fantasía · Mundo Abierto RPG',
    heroDesc:
      'Lanza hechizos continuos con 1 mano (o 2 manos para Poder Doble y Artes Prohibidas), personaliza tu héroe RPG y manos de combate, abre Portales con Llaves y explora tu Casa, Parque, Hospital, Supermercado, Colinas, Cueva Subterránea y Montañas.',
    defendWaves: 'Defender Oleadas',
    roleplayWorld: 'Mundo Rol (RPG)',
    tutorialDojo: 'Dojo Tutorial',
    customizeHands: 'Manos Arena',
    armory: 'Armería',
    archMageRank: 'Rango Archimago',
    portalKeys: 'Llaves Portal',
    equippedArmor: 'Armadura Equipada',
    powersMastered: 'Poderes Dominados',
    homeArenaTheme: 'Tema de Inicio y Arena',
    languageLabel: 'Idioma',
    health: 'SALUD',
    mana: 'MANÁ',
    totalScore: 'PUNTUACIÓN',
    accuracy: 'Precisión',
    skyBalloon: 'Globo Celeste',
    ready: '¡LISTO!',
    wardrobe: 'Atuendo',
    decorate: 'Decorar',
    map: 'Mapa',
    battleArena: 'Arena Batalla',
    outfitTitle: 'Creador de Héroe y Vestuario',
    outfitSubtitle: 'Elige género, peinados, tono de piel, capas, hombreras, yelmos y armas',
    genderLabel: 'Género y Silueta',
    female: 'Femenino',
    male: 'Masculino',
    neutral: 'Neutral',
    hairstyleLabel: 'Peinado',
    bangsLabel: 'Flequillo y Mechones',
    rearHairLabel: 'Cabello Trasero',
    skinToneLabel: 'Tono de Piel',
    wearOutfit: 'Usar Este Estilo',
    practiceInDojo: 'Practicar en Dojo',
    equipAndEnterBattle: 'Equipar y Combatir',
    newPowerUnlocked: '¡Nuevo Poder Desbloqueado!'
  },
  fr: {
    brand: 'Gestes Arcaniques',
    dojo: 'Dojo Tutoriel',
    grimoire: 'Grimoire',
    leaderboard: 'Classement',
    realms: 'Royaumes',
    calibration: 'Calibration',
    tagline: 'Magie 1 et 2 Mains · 8 Royaumes Fantastiques · Ville RPG Ouverte',
    heroDesc:
      'Lancez des sorts continus à 1 main (ou 2 mains pour Arts Interdits), personnalisez votre héros RPG et mains de combat, ouvrez des Portails et explorez Maison, Parc, Hôpital, Supermarché, Collines, Caverne et Montagnes !',
    defendWaves: 'Combattre les Vagues',
    roleplayWorld: 'Monde Jeu de Rôle',
    tutorialDojo: 'Dojo Tutoriel',
    customizeHands: 'Mains Arène',
    armory: 'Armurerie',
    archMageRank: 'Rang Archimage',
    portalKeys: 'Clés Portail',
    equippedArmor: 'Armure Équipée',
    powersMastered: 'Pouvoirs Maîtrisés',
    homeArenaTheme: 'Thème Accueil & Arène',
    languageLabel: 'Langue',
    health: 'SANTÉ',
    mana: 'MANA',
    totalScore: 'SCORE TOTAL',
    accuracy: 'Précision',
    skyBalloon: 'Ballon Céleste',
    ready: 'PRÊT !',
    wardrobe: 'Tenue',
    decorate: 'Décorer',
    map: 'Carte',
    battleArena: 'Arène Combat',
    outfitTitle: 'Créateur de Héros & Garde-Robe',
    outfitSubtitle: 'Choisissez genre, coiffures, carnation, capes, épaulières et armes',
    genderLabel: 'Genre du Héros',
    female: 'Féminin',
    male: 'Masculin',
    neutral: 'Neutre',
    hairstyleLabel: 'Coiffure',
    bangsLabel: 'Frange & Mèches',
    rearHairLabel: 'Cheveux Arrière',
    skinToneLabel: 'Teint',
    wearOutfit: 'Porter Cette Tenue',
    practiceInDojo: 'Pratiquer au Dojo',
    equipAndEnterBattle: 'Équiper & Combattre',
    newPowerUnlocked: 'Nouveau Pouvoir Débloqué !'
  },
  ar: {
    brand: 'إيماءات السحر',
    dojo: 'دوجو التدريب',
    grimoire: 'كتاب السحر',
    leaderboard: 'لوحة المتصدرين',
    realms: 'العوالم',
    calibration: 'المعايرة',
    tagline: 'سحر بيد أو يدين · ٨ عوالم خيالية · عالم تقمص الأدوار المفتوح',
    heroDesc:
      'أطلق التعاويذ المتواصلة بيد واحدة أو بيدين، وخصّص بطلك وملابسك وألوان الساحة، واستكشف المنزل والملعب والمستشفى والمتجر والكهوف السرية والجبال!',
    defendWaves: 'دافع عن الموجات',
    roleplayWorld: 'عالم تقمص الأدوار',
    tutorialDojo: 'دوجو التدريب',
    customizeHands: 'تخصيص اليدين',
    armory: 'الترسانة',
    archMageRank: 'رتبة الساحر',
    portalKeys: 'مفاتيح البوابة',
    equippedArmor: 'الدرع المجهز',
    powersMastered: 'القوى المكتسبة',
    homeArenaTheme: 'سمة الرئيسية والساحة',
    languageLabel: 'اللغة',
    health: 'الصحة',
    mana: 'المانا',
    totalScore: 'النتيجة الكلية',
    accuracy: 'الدقة',
    skyBalloon: 'منطاد السماء',
    ready: 'جاهز!',
    wardrobe: 'المظهر',
    decorate: 'تزيين',
    map: 'الخريطة',
    battleArena: 'ساحة القتال',
    outfitTitle: 'منشئ البطل والأزياء',
    outfitSubtitle: 'اختر الجنس وتسريحات الشعر ولون البشرة والأردية والأسلحة',
    genderLabel: 'الجنس والشكل',
    female: 'أنثى',
    male: 'ذكر',
    neutral: 'محايد',
    hairstyleLabel: 'تسريحة الشعر',
    bangsLabel: 'الغرة والخصلات الجانبية',
    rearHairLabel: 'الشعر الخلفي',
    skinToneLabel: 'لون البشرة',
    wearOutfit: 'ارتداء هذا المظهر',
    practiceInDojo: 'تدرب في الدوجو',
    equipAndEnterBattle: 'تجهيز ودخول المعركة',
    newPowerUnlocked: 'تم فتح قوة جديدة!'
  },
  hi: {
    brand: 'आर्केन जेस्चर्स',
    dojo: 'प्रशिक्षण डोजो',
    grimoire: 'मंत्र ग्रंथ',
    leaderboard: 'लीडरबोर्ड',
    realms: 'लोक',
    calibration: 'कैलिब्रेशन',
    tagline: '1-हाथ और 2-हाथ जादू · 8 काल्पनिक लोक · ओपन-वर्ल्ड रोलप्ले टाउन',
    heroDesc:
      '1 हाथ से लगातार मंत्र चलाएं या 2 हाथों से विशेष शक्तियां जगाएं, अपने आरपीजी पात्र व एरिना थीम को सजाएं, और घर, खेल मैदान, अस्पताल, सुपरस्टोर, भूमिगत गुफा और पर्वत खोजें!',
    defendWaves: 'लहरों से रक्षा करें',
    roleplayWorld: 'रोलप्ले दुनिया (RPG)',
    tutorialDojo: 'प्रशिक्षण डोजो',
    customizeHands: 'हाथ सजाएं',
    armory: 'शस्त्रागार',
    archMageRank: 'आर्च-मेज रैंक',
    portalKeys: 'पोर्टल चाबियां',
    equippedArmor: 'पहना हुआ कवच',
    powersMastered: 'मास्टर शक्तियां',
    homeArenaTheme: 'होम और एरिना थीम',
    languageLabel: 'भाषा',
    health: 'स्वास्थ्य',
    mana: 'माना',
    totalScore: 'कुल स्कोर',
    accuracy: 'सटीकता',
    skyBalloon: 'स्काई बैलून',
    ready: 'तैयार!',
    wardrobe: 'पोशाक',
    decorate: 'सजावट',
    map: 'नक्शा',
    battleArena: 'बैटल एरिना',
    outfitTitle: 'हीरो कैरेक्टर और पोशाक',
    outfitSubtitle: 'लिंग, हेयरस्टाइल, त्वचा का रंग, कवच और हथियार चुनें',
    genderLabel: 'हीरो का लिंग',
    female: 'महिला',
    male: 'पुरुष',
    neutral: 'न्यूट्रल',
    hairstyleLabel: 'हेयरस्टाइल',
    bangsLabel: 'बैंग्स और साइड फ्रिंज',
    rearHairLabel: 'पीछे के बाल',
    skinToneLabel: 'त्वचा का रंग',
    wearOutfit: 'यह रूप पहनें',
    practiceInDojo: 'डोजो में अभ्यास करें',
    equipAndEnterBattle: 'लैस हों और युद्ध करें',
    newPowerUnlocked: 'नई शक्ति अनलॉक हुई!'
  },
  ja: {
    brand: 'アーケイン・ジェスチャー',
    dojo: '修練道場',
    grimoire: '魔導書',
    leaderboard: 'ランキング',
    realms: '異世界',
    calibration: '調整',
    tagline: '片手＆両手魔法 · 8つの幻想世界 · オープンワールドRPGタウン',
    heroDesc:
      '片手で連続魔法を放ち、両手で禁術を発動！RPGの性別・髪型・衣装やホーム＆アリーナのテーマを自由にカスタマイズして、家・公園・病院・地下洞窟・雪山を冒険しよう！',
    defendWaves: '防衛バトル開始',
    roleplayWorld: 'ロールプレイ世界 (RPG)',
    tutorialDojo: '修練道場',
    customizeHands: 'ハンド装飾',
    armory: '武器庫',
    archMageRank: '大魔導士ランク',
    portalKeys: 'ポータル鍵',
    equippedArmor: '装備中の鎧',
    powersMastered: '習得した力',
    homeArenaTheme: 'ホーム＆アリーナテーマ',
    languageLabel: '言語',
    health: '体力',
    mana: 'マナ',
    totalScore: '合計スコア',
    accuracy: '命中率',
    skyBalloon: '気球条件',
    ready: '準備完了！',
    wardrobe: '衣装',
    decorate: '模様替え',
    map: 'マップ',
    battleArena: 'バトルアリーナ',
    outfitTitle: 'ヒーロー外見・衣装クリエイター',
    outfitSubtitle: '性別、髪型、肌の色、マント、肩当て、兜、武器を自由に設定',
    genderLabel: '性別・シルエット',
    female: '女性',
    male: '男性',
    neutral: 'ニュートラル',
    hairstyleLabel: '髪型',
    bangsLabel: '前髪・サイドバング',
    rearHairLabel: '後ろ髪',
    skinToneLabel: '肌の色',
    wearOutfit: 'この姿で冒険する',
    practiceInDojo: '道場で練習する',
    equipAndEnterBattle: '装備して出撃',
    newPowerUnlocked: '新たな力を解放！'
  },
  zh: {
    brand: '奥术手势',
    dojo: '训练道场',
    grimoire: '魔法书',
    leaderboard: '排行榜',
    realms: '奇幻界域',
    calibration: '手势校准',
    tagline: '单双手施法 · 8大奇幻界域 · 开放世界角色扮演小镇',
    heroDesc:
      '单手连续施放元素法术，双手激发禁忌绝技！自由定制角色性别、发型、服饰与主页/竞技场主题，探索小屋、游乐场、医院、超市、地下水晶洞穴与雪山！',
    defendWaves: '开始战斗守卫',
    roleplayWorld: '角色扮演世界 (RPG)',
    tutorialDojo: '训练道场',
    customizeHands: '定制手部特效',
    armory: '军械库',
    archMageRank: '大法师等级',
    portalKeys: '传送门钥匙',
    equippedArmor: '当前护甲',
    powersMastered: '已掌握力量',
    homeArenaTheme: '主页与竞技场主题',
    languageLabel: '语言',
    health: '生命',
    mana: '法力',
    totalScore: '总分',
    accuracy: '命中率',
    skyBalloon: '飞天热气球',
    ready: '已就绪!',
    wardrobe: '装扮',
    decorate: '装修',
    map: '地图',
    battleArena: '战斗竞技场',
    outfitTitle: '英雄角色与装扮定制',
    outfitSubtitle: '选择性别、发型、肤色、披风、护肩、头饰与专属武器',
    genderLabel: '角色性别与体型',
    female: '女性',
    male: '男性',
    neutral: '中性',
    hairstyleLabel: '发型',
    bangsLabel: '刘海与侧刘海',
    rearHairLabel: '后发造型',
    skinToneLabel: '肤色',
    wearOutfit: '穿戴此造型',
    practiceInDojo: '前往道场练习',
    equipAndEnterBattle: '装备并进入战斗',
    newPowerUnlocked: '解锁新力量!'
  }
};

export function getTranslation(lang: AppLanguage): TranslationDict {
  return TRANSLATIONS[lang] || TRANSLATIONS.en;
}
