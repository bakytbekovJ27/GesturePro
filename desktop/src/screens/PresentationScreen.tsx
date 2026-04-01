import { gestureModeLabelKey, type Translator } from '../i18n'
import type { GestureMode, GestureState, PresentationSlide } from '../types/desktop'

type PresentationScreenProps = {
  t: Translator
  slides: PresentationSlide[]
  currentIndex: number
  activeGesture: GestureState
  gestureMode: GestureMode
  systemActive: boolean
  statusMessage: string
  onPrev: () => void
  onNext: () => void
  onMenu: () => void
  onLoad: () => void
}

export function PresentationScreen({
  t,
  slides,
  currentIndex,
  activeGesture,
  gestureMode,
  systemActive,
  statusMessage,
  onPrev,
  onNext,
  onMenu,
  onLoad,
}: PresentationScreenProps) {
  const slide = slides[currentIndex]
  const progressWidth = slides.length > 0 ? `${((currentIndex + 1) / slides.length) * 100}%` : '0%'

  return (
    <section className="screen screen--presentation">
      <div className="presentation-topbar">
        <div>
          <p className="screen-eyebrow">{t('presentation_title')}</p>
          <h1 className="presentation-deck-title">{slide?.title ?? 'Deck'}</h1>
        </div>
        <div className="presentation-actions">
          <button className="text-button" onClick={onMenu}>
            {t('presentation_menu')}
          </button>
          <button className="text-button" onClick={onLoad}>
            {t('presentation_reload')}
          </button>
        </div>
      </div>

      <div className="presentation-stage">
        {slide ? <img src={slide.imageUrl} alt={slide.title} className="presentation-stage__image" /> : null}

        <div className="stage-overlay stage-overlay--left">
          <span className={`status-pill ${systemActive ? 'status-pill--success' : ''}`}>
            {systemActive ? t('hud_active') : t('hud_paused')}
          </span>
          <span className="status-pill">{t('gesture_badge')}: {activeGesture}</span>
        </div>

        <div className="stage-overlay stage-overlay--right">
          <div className="pip-widget">
            <div className="pip-widget__mock-viewport" />
            <div className="pip-widget__meta">
              <strong>{activeGesture}</strong>
              <span>{statusMessage}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="presentation-toolbar">
        <button className="toolbar-button" onClick={onPrev}>
          {t('presentation_prev')}
        </button>
        <button className="toolbar-button" onClick={onNext}>
          {t('presentation_next')}
        </button>
      </div>

      <div className="presentation-hud">
        <div className="hud-item">
          <span>{systemActive ? t('hud_active') : t('hud_paused')}</span>
          <strong>{t(gestureModeLabelKey(gestureMode))}</strong>
        </div>
        <div className="hud-item hud-item--wide">
          <span>
            {t('hud_slide')} {currentIndex + 1} {t('hud_of')} {slides.length}
          </span>
          <div className="progress-track">
            <div
              className="progress-track__fill"
              style={{ width: progressWidth }}
            />
          </div>
        </div>
        <div className="hud-item hud-item--wide">
          <span>{statusMessage}</span>
          <strong>{t('hud_hint')}</strong>
        </div>
      </div>
    </section>
  )
}
