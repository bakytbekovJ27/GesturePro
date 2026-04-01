import { ActionButton } from '../components/ActionButton'
import type { Translator } from '../i18n'

type MenuScreenProps = {
  t: Translator
  onStart: () => void
  onSettings: () => void
  onExit: () => void
}

export function MenuScreen({ t, onStart, onSettings, onExit }: MenuScreenProps) {
  return (
    <section className="screen screen--menu">
      <div className="hero-panel">
        <div className="hero-panel__badges">
          <span className="status-pill status-pill--accent">{t('badge_tauri')}</span>
          <span className="status-pill">{t('badge_bridge')}</span>
        </div>
        <p className="screen-eyebrow">{t('menu_subtitle')}</p>
        <h1 className="screen-title">{t('menu_title')}</h1>
        <p className="hero-panel__copy">{t('menu_status')}</p>
        <p className="hero-panel__hint">{t('gesture_hint')}</p>
      </div>

      <div className="menu-grid">
        <ActionButton label={t('menu_start')} onClick={onStart} meta="1" />
        <ActionButton
          label={t('menu_settings')}
          onClick={onSettings}
          tone="secondary"
          meta="2"
        />
        <ActionButton label={t('menu_exit')} onClick={onExit} tone="danger" meta="Q" />
      </div>

      <div className="mock-pip-card">
        <div className="mock-pip-card__camera">
          <span className="mock-pip-card__scan" />
        </div>
        <div className="mock-pip-card__body">
          <strong>Mock camera channel</strong>
          <span>Ready for the future native gesture stream.</span>
        </div>
      </div>
    </section>
  )
}
