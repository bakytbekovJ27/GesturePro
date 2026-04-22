import type { GestureState, LoadState } from '../types/desktop'
import type { Translator } from '../i18n'

type DevPanelProps = {
  t: Translator
  gesture: GestureState
  loadState: LoadState
  onRefreshSession: () => void
  onSimulateRemoteDeck: () => void
  onCycleGesture: () => void
  onSimulateError: () => void
}

export function DevPanel({
  t,
  gesture,
  loadState,
  onRefreshSession,
  onSimulateRemoteDeck,
  onCycleGesture,
  onSimulateError,
}: DevPanelProps) {
  return (
    <aside className="dev-panel">
      <div className="dev-panel__head">
        <span>{t('devtools_title')}</span>
        <span className="dev-panel__badge">{t('badge_mock')}</span>
      </div>
      <div className="dev-panel__stats">
        <div>
          <span>Gesture</span>
          <strong>{gesture}</strong>
        </div>
        <div>
          <span>Load</span>
          <strong>{loadState}</strong>
        </div>
      </div>
      <div className="dev-panel__actions">
        <button onClick={onRefreshSession}>{t('devtools_session')}</button>
        <button onClick={onSimulateRemoteDeck}>{t('devtools_remote')}</button>
        <button onClick={onCycleGesture}>{t('devtools_gesture')}</button>
        <button onClick={onSimulateError}>{t('devtools_error')}</button>
      </div>
    </aside>
  )
}
