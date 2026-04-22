import { ActionButton } from '../components/ActionButton'
import type { Translator } from '../i18n'

type MenuScreenProps = {
  t: Translator
  sessionBadge: string
  pinDisplay: string
  sessionMessage: string
  onStart: () => void
  onSettings: () => void
  onExit: () => void
}

export function MenuScreen({
  t,
  sessionBadge,
  pinDisplay,
  sessionMessage,
  onStart,
  onSettings,
  onExit,
}: MenuScreenProps) {
  return (
    <section className="screen screen--menu">
      <div className="menu-main">
        <div className="hero-panel">
          <div className="hero-panel__badges">
            <span className="status-pill status-pill--accent">{sessionBadge}</span>
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
      </div>

      <div className="menu-sidebar">
        <div className="surface-card menu-focus-card">
          <span className="menu-focus-card__eyebrow">Active PIN</span>
          <div className="pin-display pin-display--compact">{pinDisplay}</div>
          <p>{sessionMessage}</p>
          <span className="status-pill status-pill--success">{sessionBadge}</span>
        </div>

        <div className="surface-card menu-flow-card">
          <div className="menu-flow-step">
            <span className="menu-flow-step__index">1</span>
            <div className="menu-flow-step__copy">
              <strong>Connect the phone</strong>
              <p>Enter the live PIN in the mobile app to pair this desktop session.</p>
            </div>
          </div>
          <div className="menu-flow-step">
            <span className="menu-flow-step__index">2</span>
            <div className="menu-flow-step__copy">
              <strong>Choose a deck</strong>
              <p>Open a local file here or wait for a presentation sent from mobile.</p>
            </div>
          </div>
          <div className="menu-flow-step">
            <span className="menu-flow-step__index">3</span>
            <div className="menu-flow-step__copy">
              <strong>Present with gestures</strong>
              <p>Once the deck is ready, switch into presentation mode and control the flow.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
