import { gestureModeLabelKey, type Translator } from '../i18n'
import type { GestureMode, GestureState, PresentationSlide } from '../types/desktop'

type PresentationScreenProps = {
  t: Translator
  title: string
  slides: PresentationSlide[]
  documentUrl: string | null
  currentIndex: number
  activeGesture: GestureState
  gestureMode: GestureMode
  systemActive: boolean
  statusMessage: string
  onPrev: () => void
  onNext: () => void
  onMenu: () => void
  onLoad: () => void
  cameraFrame: string | null
}

export function PresentationScreen({
  t,
  title,
  slides,
  documentUrl,
  currentIndex,
  activeGesture,
  gestureMode,
  systemActive,
  statusMessage,
  onPrev,
  onNext,
  onMenu,
  onLoad,
  cameraFrame,
}: PresentationScreenProps) {
  const slide = slides[currentIndex]
  const hasSlides = slides.length > 0
  const progressWidth = hasSlides ? `${((currentIndex + 1) / slides.length) * 100}%` : '0%'
  const deckTitle = slide?.title ?? title

  return (
    <section className="screen screen--presentation">
      <div className="presentation-topbar">
        <div>
          <p className="screen-eyebrow">{t('presentation_title')}</p>
          <h1 className="presentation-deck-title">{deckTitle}</h1>
          <p className="screen-subtitle">
            Keep the stage clean while gesture state, progress, and camera confidence stay visible.
          </p>
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
        {documentUrl ? (
          <iframe
            src={documentUrl}
            title={deckTitle}
            className="presentation-stage__document"
          />
        ) : slide ? (
          <img src={slide.imageUrl} alt={slide.title} className="presentation-stage__image" />
        ) : (
          <div className="presentation-stage__empty">{statusMessage}</div>
        )}

        <div className="stage-overlay stage-overlay--left">
          <span className={`status-pill ${systemActive ? 'status-pill--success' : ''}`}>
            {systemActive ? t('hud_active') : t('hud_paused')}
          </span>
          <span className="status-pill">{t('gesture_badge')}: {activeGesture}</span>
        </div>

        <div className="stage-overlay stage-overlay--right">
          <div className="pip-widget">
            {cameraFrame ? (
              <img
                src={cameraFrame}
                alt="Camera"
                className="pip-widget__viewport"
              />
            ) : (
              <div className="pip-widget__mock-viewport" />
            )}
            <div className="pip-widget__meta">
              <span className="pip-widget__signal">{t(gestureModeLabelKey(gestureMode))}</span>
              <strong>{activeGesture}</strong>
              <span>{statusMessage}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="presentation-toolbar">
        <button className="toolbar-button" onClick={onPrev} disabled={!hasSlides}>
          {t('presentation_prev')}
        </button>
        <button className="toolbar-button" onClick={onNext} disabled={!hasSlides}>
          {t('presentation_next')}
        </button>
      </div>

      <div className="presentation-hud">
        <div className="hud-item">
          <span>{systemActive ? t('hud_active') : t('hud_paused')}</span>
          <strong>{t(gestureModeLabelKey(gestureMode))}</strong>
        </div>
        <div className="hud-item hud-item--wide">
          {hasSlides ? (
            <>
              <span>
                {t('hud_slide')} {currentIndex + 1} {t('hud_of')} {slides.length}
              </span>
              <div className="progress-track">
                <div
                  className="progress-track__fill"
                  style={{ width: progressWidth }}
                />
              </div>
              <strong className="hud-highlight">{Math.round(((currentIndex + 1) / slides.length) * 100)}% ready</strong>
            </>
          ) : (
            <>
              <span>{t('hud_pdf')}</span>
              <strong>{deckTitle}</strong>
            </>
          )}
        </div>
        <div className="hud-item hud-item--wide">
          <span>{statusMessage}</span>
          <strong>{t('hud_hint')}</strong>
        </div>
      </div>
    </section>
  )
}
