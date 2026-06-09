import type { LanguageCode } from '../types/desktop'
import type { Translator } from '../i18n'

type SettingsScreenProps = {
  t: Translator
  language: LanguageCode
  onLanguageChange: (language: LanguageCode) => void
  delay: number
  onDelayChange: (delay: number) => void
  drawingEnabled: boolean
  onDrawingChange: (enabled: boolean) => void
  onBack: () => void
}

export function SettingsScreen({
  t,
  language,
  onLanguageChange,
  delay,
  onDelayChange,
  drawingEnabled,
  onDrawingChange,
  onBack,
}: SettingsScreenProps) {
  return (
    <section className="screen screen--settings">
      <div className="screen-header">
        <p className="screen-eyebrow">{t('menu_subtitle')}</p>
        <h1 className="screen-title">{t('settings_title')}</h1>
        <p className="screen-subtitle">
          Manage language and keep the new desktop shell aligned with the runtime direction.
        </p>
      </div>

      <div className="settings-layout">
        {/* ── Left column: language + delay ── */}
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

          <div className="settings-divider"></div>

          <h2>{t('settings_delay')}</h2>
          <p>{t('settings_delay_hint')}</p>
          <div className="delay-control-group">
            <div className="delay-slider-wrapper">
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={delay}
                onChange={(e) => onDelayChange(parseFloat(e.target.value))}
                className="delay-slider"
              />
              <div className="delay-slider-labels">
                <span>0.5 {t('settings_seconds')} ({t('settings_delay_fast')})</span>
                <span>2.0 {t('settings_seconds')} ({t('settings_delay_slow')})</span>
              </div>
            </div>
            <div className="delay-value-badge">
              <strong>{delay.toFixed(1)}</strong>
              <span>{t('settings_seconds')}</span>
            </div>
          </div>
        </div>

        {/* ── Right column: drawing mode + shell info ── */}
        <div className="settings-right-col">
          {/* Drawing mode card */}
          <div className="surface-card settings-card settings-card--drawing">
            <div className="drawing-setting-header">
              <div className="drawing-setting-icon" aria-hidden="true">✏️</div>
              <div className="drawing-setting-copy">
                <h2>{t('settings_drawing')}</h2>
                <p>{t('settings_drawing_hint')}</p>
              </div>
            </div>

            <div className="drawing-setting-toggle-row">
              <span
                className={`settings-drawing-badge ${
                  drawingEnabled
                    ? 'settings-drawing-badge--on'
                    : 'settings-drawing-badge--off'
                }`}
              >
                {drawingEnabled ? t('settings_drawing_on') : t('settings_drawing_off')}
              </span>

              <button
                id="settings-drawing-toggle"
                className={`drawing-toggle${drawingEnabled ? ' drawing-toggle--on' : ''}`}
                role="switch"
                aria-checked={drawingEnabled}
                aria-label={t('settings_drawing')}
                onClick={() => onDrawingChange(!drawingEnabled)}
              >
                <span className="drawing-toggle__track" aria-hidden="true">
                  <span className="drawing-toggle__thumb" />
                </span>
              </button>
            </div>

            <div className="settings-pill-row" style={{ marginTop: '18px' }}>
              <span className={`status-pill ${drawingEnabled ? 'status-pill--draw-active' : ''}`}>
                ✏️ {t('settings_drawing')}
              </span>
              <span className="status-pill">P → toggle</span>
            </div>
          </div>

          {/* Shell info card */}
          <div className="surface-card settings-card settings-card--secondary">
            <h2>Desktop shell</h2>
            <p>
              Tauri now owns the desktop GUI shell. The next iteration can attach the existing Python
              core through a stable bridge without keeping any OpenCV window UI.
            </p>
            <div className="settings-pill-row">
              <span className="status-pill status-pill--accent">React + Vite</span>
              <span className="status-pill">Tauri Shell</span>
              <span className="status-pill status-pill--success">Typed Events</span>
            </div>
            <ul className="settings-list">
              <li>React + Vite screens</li>
              <li>Typed core event model</li>
              <li>Mock desktop bridge for local development</li>
            </ul>
          </div>
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

