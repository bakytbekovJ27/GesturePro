import type { LanguageCode } from '../types/desktop'
import type { Translator } from '../i18n'

type SettingsScreenProps = {
  t: Translator
  language: LanguageCode
  onLanguageChange: (language: LanguageCode) => void
  onBack: () => void
}

export function SettingsScreen({
  t,
  language,
  onLanguageChange,
  onBack,
}: SettingsScreenProps) {
  return (
    <section className="screen screen--settings">
      <div className="screen-header">
        <p className="screen-eyebrow">{t('menu_subtitle')}</p>
        <h1 className="screen-title">{t('settings_title')}</h1>
      </div>

      <div className="settings-layout">
        <div className="surface-card settings-card">
          <h2>{t('settings_language')}</h2>
          <p>{t('settings_hint')}</p>
          <div className="language-grid">
            <button
              className={`language-tile ${language === 'ru' ? 'language-tile--active' : ''}`}
              onClick={() => onLanguageChange('ru')}
            >
              <span>{t('settings_lang_ru')}</span>
              <small>R</small>
            </button>
            <button
              className={`language-tile ${language === 'en' ? 'language-tile--active' : ''}`}
              onClick={() => onLanguageChange('en')}
            >
              <span>{t('settings_lang_en')}</span>
              <small>E</small>
            </button>
          </div>
        </div>

        <div className="surface-card settings-card settings-card--secondary">
          <h2>Desktop shell</h2>
          <p>
            Tauri now owns the desktop GUI shell. The next iteration can attach the existing Python
            core through a stable bridge without keeping any OpenCV window UI.
          </p>
          <ul className="settings-list">
            <li>React + Vite screens</li>
            <li>Typed core event model</li>
            <li>Mock desktop bridge for local development</li>
          </ul>
        </div>
      </div>

      <div className="screen-footer">
        <button className="text-button" onClick={onBack}>
          {t('settings_back')}
        </button>
      </div>
    </section>
  )
}
