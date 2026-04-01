import type { GestureMode, LanguageCode } from './types/desktop'

const translations = {
  ru: {
    menu_start: 'СТАРТ',
    menu_settings: 'НАСТРОЙКИ',
    menu_exit: 'ВЫХОД',
    menu_subtitle: 'Управление жестами',
    menu_title: 'GESTURE SUITE',
    menu_status: 'Новый desktop shell уже подключается к реальному Python runtime для PIN, PDF и жестов.',
    settings_title: 'Настройки',
    settings_language: 'Язык интерфейса',
    settings_lang_ru: 'Русский',
    settings_lang_en: 'English',
    settings_back: '← Назад',
    settings_hint: 'Язык меняется мгновенно и влияет на все экраны нового desktop runtime.',
    load_title: 'Загрузить презентацию',
    load_hint: 'Выберите локальный PDF',
    load_demo: 'Загрузить демо',
    load_or: 'или дождитесь файла с телефона',
    load_back: '← Назад',
    load_idle: 'Выберите локальный PDF или дождитесь презентации с телефона по PIN.',
    load_session: 'Сессия подключения',
    load_session_hint: 'Эта сессия теперь создаётся реальным desktop sidecar и backend pairing.',
    load_remote_status: 'Мобильная синхронизация',
    load_remote_ready: 'PIN активен. Ждём презентацию с телефона.',
    load_local_file: 'Локальный файл',
    load_source_demo: 'demo',
    load_source_file: 'file',
    load_source_remote: 'remote',
    load_loading: 'Загрузка...',
    load_ready: 'Файл подготовлен. Перехожу в режим презентации.',
    load_error: 'Не удалось подготовить презентацию.',
    load_no_file: 'Файл пока не выбран',
    presentation_title: 'Presentation Mode',
    presentation_menu: 'M → Меню',
    presentation_reload: 'O → Загрузка',
    presentation_prev: '← Предыдущий',
    presentation_next: 'Следующий →',
    hud_active: '● АКТИВНО',
    hud_paused: '● ПАУЗА',
    hud_slide: 'Слайд',
    hud_of: 'из',
    hud_draw: 'Рисование',
    hud_erase: 'Ластик',
    hud_swipe: 'Листание',
    hud_clear: 'Очистка',
    hud_idle: 'Ожидание',
    hud_hint:
      'Vertical slice: PDF и remote sync уже живые, а аннотации и PIP будут следующим этапом.',
    gesture_hint: 'Клавиатура остаётся запасным управлением, но слайды уже можно листать реальными жестами.',
    gesture_badge: 'Жест',
    devtools_title: 'Mock Control',
    devtools_session: 'Новый PIN',
    devtools_remote: 'Remote deck',
    devtools_gesture: 'След. жест',
    devtools_error: 'Ошибка',
    badge_mock: 'MOCK',
    badge_tauri: 'TAURI',
    badge_bridge: 'BRIDGE READY',
    badge_live: 'LIVE',
    badge_degraded: 'DEGRADED',
    badge_error: 'ERROR',
    badge_pin_ready: 'PIN READY',
    badge_connecting: 'CONNECTING',
    badge_no_pin: 'NO PIN',
    badge_stopped: 'STOPPED',
  },
  en: {
    menu_start: 'START',
    menu_settings: 'SETTINGS',
    menu_exit: 'EXIT',
    menu_subtitle: 'Gesture Control',
    menu_title: 'GESTURE SUITE',
    menu_status: 'The new Tauri desktop shell is now wired into a real Python runtime for PIN, PDF, and gestures.',
    settings_title: 'Settings',
    settings_language: 'Interface language',
    settings_lang_ru: 'Русский',
    settings_lang_en: 'English',
    settings_back: '← Back',
    settings_hint: 'Language switches instantly and updates every screen in the new desktop runtime.',
    load_title: 'Load Presentation',
    load_hint: 'Choose a local PDF',
    load_demo: 'Load demo deck',
    load_or: 'or wait for a phone upload',
    load_back: '← Back',
    load_idle: 'Pick a local PDF or wait for a phone presentation via PIN pairing.',
    load_session: 'Connection session',
    load_session_hint: 'This session now comes from the real desktop sidecar and backend pairing flow.',
    load_remote_status: 'Mobile sync',
    load_remote_ready: 'PIN is active. Waiting for a presentation from the phone.',
    load_local_file: 'Local file',
    load_source_demo: 'demo',
    load_source_file: 'file',
    load_source_remote: 'remote',
    load_loading: 'Loading...',
    load_ready: 'Presentation prepared. Switching into presentation mode.',
    load_error: 'Failed to prepare the presentation.',
    load_no_file: 'No file selected yet',
    presentation_title: 'Presentation Mode',
    presentation_menu: 'M → Menu',
    presentation_reload: 'O → Load',
    presentation_prev: '← Previous',
    presentation_next: 'Next →',
    hud_active: '● ACTIVE',
    hud_paused: '● PAUSED',
    hud_slide: 'Slide',
    hud_of: 'of',
    hud_draw: 'Draw',
    hud_erase: 'Erase',
    hud_swipe: 'Swipe',
    hud_clear: 'Clear',
    hud_idle: 'Idle',
    hud_hint:
      'Vertical slice milestone: live PDF loading and remote sync are in, while annotation tools come next.',
    gesture_hint: 'Keyboard controls remain as a fallback, but real gestures can now advance slides.',
    gesture_badge: 'Gesture',
    devtools_title: 'Mock Control',
    devtools_session: 'New PIN',
    devtools_remote: 'Remote deck',
    devtools_gesture: 'Next gesture',
    devtools_error: 'Error',
    badge_mock: 'MOCK',
    badge_tauri: 'TAURI',
    badge_bridge: 'BRIDGE READY',
    badge_live: 'LIVE',
    badge_degraded: 'DEGRADED',
    badge_error: 'ERROR',
    badge_pin_ready: 'PIN READY',
    badge_connecting: 'CONNECTING',
    badge_no_pin: 'NO PIN',
    badge_stopped: 'STOPPED',
  },
} as const

export type TranslationKey = keyof (typeof translations)['ru']

export type Translator = (key: TranslationKey) => string

export function createTranslator(language: LanguageCode): Translator {
  return (key) => translations[language][key]
}

export function gestureModeLabelKey(mode: GestureMode): TranslationKey {
  switch (mode) {
    case 'draw':
      return 'hud_draw'
    case 'erase':
      return 'hud_erase'
    case 'swipe':
      return 'hud_swipe'
    case 'clear':
      return 'hud_clear'
    default:
      return 'hud_idle'
  }
}
