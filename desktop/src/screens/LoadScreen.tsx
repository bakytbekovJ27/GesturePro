import { ActionButton } from '../components/ActionButton'
import type { Translator } from '../i18n'
import type { LoadState, PresentationSource } from '../types/desktop'

type LoadScreenProps = {
  t: Translator
  loadState: LoadState
  statusMessage: string
  pinDisplay: string
  sessionMessage: string
  sessionBadge: string
  runtimeMessage: string
  runtimeBadge: string
  fileName: string | null
  source: PresentationSource | null
  onPickFile: () => void
  onLoadDemo: () => void
  onBack: () => void
}

export function LoadScreen({
  t,
  loadState,
  statusMessage,
  pinDisplay,
  sessionMessage,
  sessionBadge,
  runtimeMessage,
  runtimeBadge,
  fileName,
  source,
  onPickFile,
  onLoadDemo,
  onBack,
}: LoadScreenProps) {
  const sourceLabel =
    source === 'demo'
      ? t('load_source_demo')
      : source === 'file'
        ? t('load_source_file')
        : source === 'remote'
          ? t('load_source_remote')
          : null

  return (
    <section className="screen screen--load">
      <div className="screen-header">
        <p className="screen-eyebrow">{t('load_or')}</p>
        <h1 className="screen-title">{t('load_title')}</h1>
        <p className="screen-subtitle">
          Route a deck from the phone or load a local file without leaving the desktop shell.
        </p>
      </div>

      <div className="load-layout">
        <div className="surface-card load-primary-card">
          <div className="load-primary-card__graphic">
            <div className={`file-orb file-orb--${loadState}`} />
          </div>
          <div className="load-primary-card__status">
            <span className="status-dot status-dot--ready" />
            <span>{statusMessage || t('load_remote_ready')}</span>
          </div>
          <h2>{t('load_hint')}</h2>
          <p>{loadState === 'idle' ? t('load_idle') : statusMessage}</p>
          <div className="load-actions">
            <ActionButton
              label={t('load_hint')}
              onClick={onPickFile}
              tone="primary"
              meta="O"
              disabled={loadState === 'loading'}
            />
            <ActionButton
              label={t('load_demo')}
              onClick={onLoadDemo}
              tone="secondary"
              meta="D"
              disabled={loadState === 'loading'}
            />
          </div>
        </div>

        <div className="load-side">
          <div className="surface-card side-card">
            <div className="side-card__heading">
              <span>{t('load_session')}</span>
              <span className="status-pill">{sessionBadge}</span>
            </div>
            <div className="pin-display">{pinDisplay}</div>
            <p>{sessionMessage}</p>
            <small>{t('load_session_hint')}</small>
          </div>

          <div className="surface-card side-card">
            <div className="side-card__heading">
              <span>{t('load_remote_status')}</span>
              <span className="status-pill">{runtimeBadge}</span>
            </div>
            <p>{statusMessage || t('load_remote_ready')}</p>
            <small>{runtimeMessage}</small>
          </div>

          <div className="surface-card side-card">
            <div className="side-card__heading">
              <span>{t('load_local_file')}</span>
              {sourceLabel ? <span className="source-badge">{sourceLabel}</span> : null}
            </div>
            <strong>{fileName ?? t('load_no_file')}</strong>
            <small>Local and remote sources share the same presentation runtime once loaded.</small>
          </div>
        </div>
      </div>

      <div className="screen-footer">
        <button className="text-button" onClick={onBack}>
          {t('load_back')}
        </button>
      </div>
    </section>
  )
}
