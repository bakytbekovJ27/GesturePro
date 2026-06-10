import { useEffect, useRef, useState } from 'react'
import { gestureModeLabelKey, type Translator } from '../i18n'
import type { GestureMode, GestureState, PresentationSlide } from '../types/desktop'

type DrawPoint = { x: number; y: number }
type DrawStroke = DrawPoint[]

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
  strokes: DrawStroke[]
  currentStroke: DrawStroke
  cursorPos: DrawPoint | null
  drawingEnabled: boolean
  erasingEnabled: boolean
  onToggleDrawing: () => void
  onToggleErasing: () => void
  onClearSlideDrawing: () => void
}

const STROKE_COLOR = 'rgba(105, 213, 255, 0.92)'
const STROKE_WIDTH = 3.5
const CURSOR_RADIUS = 14
const CURSOR_INNER_RADIUS = 5
const CURSOR_COLOR = 'rgba(105, 213, 255, 1)'
const CURSOR_GLOW = 'rgba(105, 213, 255, 0.44)'

function drawCanvas(
  canvas: HTMLCanvasElement,
  strokes: DrawStroke[],
  currentStroke: DrawStroke,
  cursorPos: DrawPoint | null,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const w = canvas.width
  const h = canvas.height

  ctx.clearRect(0, 0, w, h)

  function renderStroke(stroke: DrawStroke, alpha = 1) {
    if (stroke.length < 2) return
    ctx!.save()
    ctx!.globalAlpha = alpha
    ctx!.strokeStyle = STROKE_COLOR
    ctx!.lineWidth = STROKE_WIDTH
    ctx!.lineCap = 'round'
    ctx!.lineJoin = 'round'
    ctx!.shadowColor = CURSOR_GLOW
    ctx!.shadowBlur = 8
    ctx!.beginPath()
    ctx!.moveTo(stroke[0].x * w, stroke[0].y * h)
    for (let i = 1; i < stroke.length; i++) {
      ctx!.lineTo(stroke[i].x * w, stroke[i].y * h)
    }
    ctx!.stroke()
    ctx!.restore()
  }

  // Committed strokes
  for (const stroke of strokes) {
    renderStroke(stroke)
  }

  // Current in-progress stroke (slightly more transparent)
  renderStroke(currentStroke, 0.88)

  // Cursor ring
  if (cursorPos) {
    const cx = cursorPos.x * w
    const cy = cursorPos.y * h

    ctx.save()
    // Outer glow ring
    ctx.beginPath()
    ctx.arc(cx, cy, CURSOR_RADIUS, 0, Math.PI * 2)
    ctx.strokeStyle = CURSOR_GLOW
    ctx.lineWidth = 3
    ctx.stroke()

    // Inner filled dot
    ctx.beginPath()
    ctx.arc(cx, cy, CURSOR_INNER_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = CURSOR_COLOR
    ctx.shadowColor = CURSOR_GLOW
    ctx.shadowBlur = 14
    ctx.fill()
    ctx.restore()
  }
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
  strokes,
  currentStroke,
  cursorPos,
  drawingEnabled,
  erasingEnabled,
  onToggleDrawing,
  onToggleErasing,
  onClearSlideDrawing,
}: PresentationScreenProps) {
  const slide = slides[currentIndex]
  const hasSlides = slides.length > 0
  const progressWidth = hasSlides ? `${((currentIndex + 1) / slides.length) * 100}%` : '0%'
  const deckTitle = slide?.title ?? title

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [hoveredButton, setHoveredButton] = useState<string | null>(null)
  const lastGestureRef = useRef<GestureState>('NONE')

  // Calculate hover status for simulated gesture cursor
  useEffect(() => {
    if (!cursorPos || !containerRef.current) {
      setHoveredButton(null)
      return
    }

    const containerRect = containerRef.current.getBoundingClientRect()
    const clientX = containerRect.left + cursorPos.x * containerRect.width
    const clientY = containerRect.top + cursorPos.y * containerRect.height

    const buttons = [
      { id: 'btn-toggle-draw', selector: '#btn-toggle-draw' },
      { id: 'btn-toggle-erase', selector: '#btn-toggle-erase' },
      { id: 'btn-clear-board', selector: '#btn-clear-board' },
    ]

    let foundHovered = null
    for (const btn of buttons) {
      const el = document.querySelector(btn.selector)
      if (el) {
        const rect = el.getBoundingClientRect()
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          foundHovered = btn.id
          break
        }
      }
    }
    setHoveredButton(foundHovered)
  }, [cursorPos])

  // Click simulation on PINCH transition
  useEffect(() => {
    if (activeGesture === 'PINCH' && lastGestureRef.current !== 'PINCH') {
      if (hoveredButton === 'btn-toggle-draw') {
        onToggleDrawing()
      } else if (hoveredButton === 'btn-toggle-erase') {
        onToggleErasing()
      } else if (hoveredButton === 'btn-clear-board') {
        onClearSlideDrawing()
      }
    }
    lastGestureRef.current = activeGesture
  }, [activeGesture, hoveredButton, onToggleDrawing, onToggleErasing, onClearSlideDrawing])

  // Keep canvas resolution in sync with its display size
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ro = new ResizeObserver(() => {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      // Re-draw after resize
      drawCanvas(canvas, strokes, currentStroke, cursorPos)
    })
    ro.observe(container)

    // Initial size
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight

    return () => ro.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-draw whenever drawing data changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawCanvas(canvas, strokes, currentStroke, cursorPos)
  }, [strokes, currentStroke, cursorPos])

  const isDrawing = gestureMode === 'draw'
  const isClearing = gestureMode === 'clear'
  const hasAnnotations = strokes.length > 0 || currentStroke.length > 0

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

      <div className="presentation-stage" ref={containerRef}>
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

        {/* Drawing canvas – positioned absolute over the whole stage */}
        <canvas
          ref={canvasRef}
          className={`presentation-draw-canvas${isClearing ? ' presentation-draw-canvas--clearing' : ''}`}
          aria-hidden="true"
        />

        {/* Floating top bar controls */}
        <div className="whiteboard-topbar">
          <button
            id="btn-toggle-draw"
            className={`whiteboard-btn ${drawingEnabled ? 'whiteboard-btn--active' : ''} ${hoveredButton === 'btn-toggle-draw' ? 'whiteboard-btn--hovered' : ''}`}
            onClick={onToggleDrawing}
            title={t('hud_draw')}
          >
            ✏️ {t('hud_draw')}
          </button>
          <button
            id="btn-toggle-erase"
            className={`whiteboard-btn ${erasingEnabled ? 'whiteboard-btn--active' : ''} ${hoveredButton === 'btn-toggle-erase' ? 'whiteboard-btn--hovered' : ''}`}
            onClick={onToggleErasing}
            title={t('hud_erase')}
          >
            🧹 {t('hud_erase')}
          </button>
          <button
            id="btn-clear-board"
            className={`whiteboard-btn whiteboard-btn--clear ${hoveredButton === 'btn-clear-board' ? 'whiteboard-btn--hovered' : ''}`}
            onClick={onClearSlideDrawing}
            title={t('hud_clear')}
          >
            ❌ {t('hud_clear')}
          </button>
        </div>

        <div className="stage-overlay stage-overlay--left">
          <span className={`status-pill ${systemActive ? 'status-pill--success' : ''}`}>
            {systemActive ? t('hud_active') : t('hud_paused')}
          </span>
          <span className="status-pill">{t('gesture_badge')}: {activeGesture}</span>
          {drawingEnabled && (
            <span className="status-pill status-pill--draw-active">✏️ Draw Mode On</span>
          )}
          {erasingEnabled && (
            <span className="status-pill status-pill--danger">🧹 Erase Mode On</span>
          )}
          {isDrawing && (
            <span className="status-pill status-pill--accent">✏️ Drawing</span>
          )}
          {gestureMode === 'erase' && (
            <span className="status-pill status-pill--danger">🧹 Erasing</span>
          )}
          {isClearing && (
            <span className="status-pill status-pill--danger">🧹 Clearing</span>
          )}
          {!drawingEnabled && !erasingEnabled && hasAnnotations && (
            <span className="status-pill status-pill--annotations">📌 Annotations</span>
          )}
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

          <div className="toolbar-divider" aria-hidden="true" />

          <button
            id="draw-mode-toggle"
            className={`toolbar-button toolbar-button--draw${drawingEnabled ? ' toolbar-button--draw-active' : ''}`}
            onClick={onToggleDrawing}
            aria-pressed={drawingEnabled}
            title="Toggle drawing mode (P)"
          >
            {drawingEnabled ? '✏️ Drawing On' : '✏️ Draw Mode'}
          </button>

          <button
            id="erase-mode-toggle"
            className={`toolbar-button toolbar-button--erase${erasingEnabled ? ' toolbar-button--erase-active' : ''}`}
            onClick={onToggleErasing}
            aria-pressed={erasingEnabled}
            title="Toggle erasing mode (E)"
          >
            {erasingEnabled ? '🧹 Erasing On' : '🧹 Erase Mode'}
          </button>

          {hasAnnotations && (
            <button
              id="clear-slide-drawing"
              className="toolbar-button toolbar-button--clear-draw"
              onClick={onClearSlideDrawing}
              title="Clear all drawings on this slide"
            >
              ❌ Clear Slide
            </button>
          )}
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
