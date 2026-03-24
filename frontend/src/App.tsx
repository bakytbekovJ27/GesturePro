import { startTransition, useEffect, useEffectEvent, useRef, useState } from 'react'
import './App.css'
import {
  fetchRecentPresentations,
  getPresentationStatus,
  pairSession,
  reusePresentation,
  uploadPresentation,
} from './api/presentations'
import { ConnectionStatus } from './components/ConnectionStatus'
import { HistoryPanel } from './components/HistoryPanel'
import { ProgressRing } from './components/ProgressRing'
import {
  clearStoredSession,
  loadStoredHistory,
  loadStoredSession,
  mergeStoredHistory,
  saveStoredHistory,
  saveStoredSession,
} from './lib/storage'
import { formatPin } from './lib/format'
import type {
  PairingResponse,
  PresentationSummary,
  SessionState,
  UploadFlowState,
} from './types/api'

const MAX_FILE_SIZE = 50 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ['.pdf', '.pptx']
const CONVERSION_HINTS = [
  'Преобразуем анимации и макеты...',
  'Почти готово. Проверяем страницы...',
  'Собираем PDF для большого экрана...',
  'Синхронизируем файл с компьютером...',
]
const SYNC_HINTS = [
  'Ожидаем, пока экран GesturePro подхватит файл...',
  'Компьютер проверяет новую презентацию...',
  'Почти на месте. Загружаем PDF на экран...',
]

const idleProgressState: UploadFlowState = {
  presentationId: null,
  fileName: '',
  phase: 'idle',
  uploadPercent: 0,
  title: '',
  detail: '',
  error: null,
  hintIndex: 0,
}

function App() {
  const [session, setSession] = useState<SessionState | null>(() => loadStoredSession())
  const [view, setView] = useState<'pairing' | 'dashboard' | 'progress'>(() =>
    loadStoredSession() ? 'dashboard' : 'pairing',
  )
  const [pinCode, setPinCode] = useState('')
  const [pairingError, setPairingError] = useState('')
  const [isPairing, setIsPairing] = useState(false)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [dashboardMessage, setDashboardMessage] = useState<string | null>(null)
  const [recentItems, setRecentItems] = useState<PresentationSummary[]>(() => loadStoredHistory())
  const [progress, setProgress] = useState<UploadFlowState>(idleProgressState)
  const [retryFile, setRetryFile] = useState<File | null>(null)
  const [reusingId, setReusingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  async function syncRecentPresentations(activeSession: SessionState) {
    try {
      const recent = await fetchRecentPresentations(activeSession.accessToken)
      setRecentItems(recent)
      saveStoredHistory(recent)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (!session) {
      return
    }
    void syncRecentPresentations(session)
  }, [session])

  function resetToDashboardSoon() {
    window.setTimeout(() => {
      setProgress(idleProgressState)
      setRetryFile(null)
      startTransition(() => {
        setView('dashboard')
      })
    }, 2200)
  }

  function handleInvalidSession() {
    clearStoredSession()
    setSession(null)
    setRecentItems([])
    setPairingError('Сессия истекла. Подключитесь заново.')
    startTransition(() => {
      setView('pairing')
    })
  }

  async function beginUpload(file: File) {
    if (!session) {
      handleInvalidSession()
      return
    }

    setDashboardError(null)
    setDashboardMessage(null)
    setRetryFile(file)
    setProgress({
      presentationId: null,
      fileName: file.name,
      phase: 'uploading',
      uploadPercent: 0,
      title: file.name,
      detail: 'Отправка файла... 0%',
      error: null,
      hintIndex: 0,
    })
    startTransition(() => {
      setView('progress')
    })

    try {
      const response = await uploadPresentation(session.accessToken, file, (percent) => {
        setProgress((current) => ({
          ...current,
          phase: 'uploading',
          uploadPercent: percent,
          detail: `Отправка файла... ${percent}%`,
          error: null,
        }))
      })

      const mergedItems = mergeStoredHistory([response], recentItems)
      setRecentItems(mergedItems)
      saveStoredHistory(mergedItems)

      if (response.status === 'presenting') {
        setProgress({
          presentationId: response.id,
          fileName: file.name,
          phase: 'ready',
          uploadPercent: 100,
          title: response.title,
          detail: response.status_message,
          error: null,
          hintIndex: 0,
        })
        setDashboardMessage(`"${response.title}" уже транслируется на экран.`)
        if (session) {
          void syncRecentPresentations(session)
        }
        resetToDashboardSoon()
        return
      }

      setProgress({
        presentationId: response.id,
        fileName: file.name,
        phase: response.status === 'converting' ? 'converting' : 'syncing',
        uploadPercent: 100,
        title: response.title,
        detail: response.status_message,
        error: null,
        hintIndex: 0,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось загрузить файл. Проверьте соединение.'
      setProgress({
        presentationId: null,
        fileName: file.name,
        phase: 'error',
        uploadPercent: 100,
        title: file.name,
        detail: 'Загрузка остановлена.',
        error: message,
        hintIndex: 0,
      })
    }
  }

  const pollPresentationStatus = useEffectEvent(async () => {
    if (
      !session ||
      !progress.presentationId ||
      !['converting', 'syncing'].includes(progress.phase)
    ) {
      return
    }

    try {
      const statusResponse = await getPresentationStatus(session.accessToken, progress.presentationId)
      const mergedItems = mergeStoredHistory([statusResponse], recentItems)
      setRecentItems(mergedItems)
      saveStoredHistory(mergedItems)

      if (statusResponse.status === 'presenting') {
        setProgress((current) => ({
          ...current,
          phase: 'ready',
          uploadPercent: 100,
          title: statusResponse.title,
          detail: statusResponse.status_message,
          error: null,
        }))
        setDashboardMessage(`"${statusResponse.title}" готова и отправлена на экран.`)
        void syncRecentPresentations(session)
        resetToDashboardSoon()
        return
      }

      if (statusResponse.status === 'error') {
        setProgress((current) => ({
          ...current,
          phase: 'error',
          detail: 'Обработка прервана.',
          error: statusResponse.error_message || statusResponse.status_message,
        }))
        return
      }

      setProgress((current) => ({
        ...current,
        phase: statusResponse.status === 'converting' ? 'converting' : 'syncing',
        detail: statusResponse.status_message,
      }))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось проверить статус обработки.'
      setProgress((current) => ({
        ...current,
        phase: 'error',
        detail: 'Связь с сервером потеряна.',
        error: message,
      }))
    }
  })

  useEffect(() => {
    if (view !== 'progress' || !['converting', 'syncing'].includes(progress.phase)) {
      return
    }

    const statusTimer = window.setInterval(() => {
      void pollPresentationStatus()
    }, 3000)

    const hintTimer = window.setInterval(() => {
      setProgress((current) => {
        if (!['converting', 'syncing'].includes(current.phase)) {
          return current
        }
        return {
          ...current,
          hintIndex:
            current.phase === 'converting'
              ? (current.hintIndex + 1) % CONVERSION_HINTS.length
              : (current.hintIndex + 1) % SYNC_HINTS.length,
        }
      })
    }, 5000)

    void pollPresentationStatus()

    return () => {
      window.clearInterval(statusTimer)
      window.clearInterval(hintTimer)
    }
  }, [view, progress.phase, progress.presentationId])

  const handlePair = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const sanitizedPin = pinCode.replace(/\D/g, '').slice(0, 6)
    if (sanitizedPin.length !== 6) {
      setPairingError('Введите 6-значный PIN-код.')
      return
    }

    setIsPairing(true)
    setPairingError('')
    setDashboardError(null)

    try {
      const pairedSession = await pairSession(sanitizedPin)
      const nextSession = mapPairedSession(pairedSession)
      saveStoredSession(nextSession)
      setSession(nextSession)
      setPinCode('')
      setDashboardMessage(`Подключено к ${nextSession.displayName}.`)
      startTransition(() => {
        setView('dashboard')
      })
      await syncRecentPresentations(nextSession)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Код недействителен или экран отключен.'
      setPairingError(message)
    } finally {
      setIsPairing(false)
    }
  }

  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    const extension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setDashboardError('Неверный формат файла. Разрешены только PDF и PPTX.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setDashboardError('Слишком большой файл. Максимум 50 МБ.')
      return
    }

    await beginUpload(file)
  }

  const handleRetryUpload = async () => {
    if (!retryFile) {
      return
    }
    await beginUpload(retryFile)
  }

  const handleReusePresentation = async (presentationId: string) => {
    if (!session) {
      handleInvalidSession()
      return
    }

    setReusingId(presentationId)
    setDashboardError(null)
    setDashboardMessage(null)

    try {
      const reused = await reusePresentation(session.accessToken, presentationId)
      const mergedItems = mergeStoredHistory([reused], recentItems)
      setRecentItems(mergedItems)
      saveStoredHistory(mergedItems)
      setDashboardMessage(`"${reused.title}" снова отправлена на экран.`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось отправить презентацию повторно.'
      setDashboardError(message)
    } finally {
      setReusingId(null)
    }
  }

  const disconnectSession = () => {
    clearStoredSession()
    setSession(null)
    setRecentItems([])
    setDashboardMessage(null)
    setDashboardError(null)
    setProgress(idleProgressState)
    setRetryFile(null)
    startTransition(() => {
      setView('pairing')
    })
  }

  const conversionHint =
    progress.phase === 'syncing'
      ? SYNC_HINTS[progress.hintIndex] || SYNC_HINTS[0]
      : CONVERSION_HINTS[progress.hintIndex] || CONVERSION_HINTS[0]

  return (
    <main className="app-shell">
      <div className="ambient ambient--left" />
      <div className="ambient ambient--right" />

      <section className="phone-frame">
        <header className="top-bar">
          <div>
            <p className="eyebrow">GesturePro Remote</p>
            <h1>Мобильная загрузка презентаций без лишних шагов</h1>
          </div>
          {session ? (
            <button className="ghost-button ghost-button--small" onClick={disconnectSession}>
              Отключить
            </button>
          ) : null}
        </header>

        {view === 'pairing' ? (
          <section className="pairing-card">
            <div className="pairing-copy">
              <p className="section-badge">Подключение</p>
              <h2>Введите код, который показан на экране с GesturePro</h2>
              <p>
                На компьютере PIN появляется при запуске desktop-приложения. После ввода код
                сессии сохраняется локально.
              </p>
            </div>

            <form className="pairing-form" onSubmit={handlePair}>
              <label className="sr-only" htmlFor="pin-code">
                6-значный PIN-код
              </label>
              <input
                id="pin-code"
                className={`pin-input ${pairingError ? 'pin-input--error' : ''}`}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123 456"
                maxLength={7}
                value={formatPin(pinCode)}
                onChange={(event) => {
                  setPinCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                  if (pairingError) {
                    setPairingError('')
                  }
                }}
              />
              {pairingError ? <p className="status-banner status-banner--error">{pairingError}</p> : null}

              <div className="pairing-actions">
                <button className="primary-button" disabled={isPairing} type="submit">
                  {isPairing ? 'Подключение...' : 'Подключиться к экрану'}
                </button>
                <button className="ghost-button" type="button" disabled>
                  Сканировать QR
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {view === 'dashboard' && session ? (
          <section className="dashboard-grid">
            <div className="dashboard-panel dashboard-panel--hero">
              <div className="panel-head">
                <div>
                  <p className="section-badge">Сессия</p>
                  <h2>{session.displayName}</h2>
                </div>
                <ConnectionStatus pinCode={session.pinCode} displayName={session.displayName} />
              </div>

              <p className="hero-copy">
                Выберите презентацию на телефоне, загрузите её в backend и отправьте на связанный
                экран без ручного выбора файла на компьютере.
              </p>

              {dashboardMessage ? (
                <p className="status-banner status-banner--success">{dashboardMessage}</p>
              ) : null}
              {dashboardError ? (
                <p className="status-banner status-banner--error">{dashboardError}</p>
              ) : null}

              <button className="upload-launcher" onClick={() => fileInputRef.current?.click()}>
                <span className="upload-launcher__icon">+</span>
                <span>
                  <strong>Загрузить презентацию</strong>
                  <small>PDF или PPTX до 50 МБ</small>
                </span>
              </button>

              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                onChange={(event) => {
                  void handleFileSelection(event)
                }}
              />
            </div>

            <HistoryPanel
              items={recentItems}
              activeId={reusingId}
              onReuse={(presentationId) => {
                void handleReusePresentation(presentationId)
              }}
            />
          </section>
        ) : null}

        {view === 'progress' ? (
          <section className="progress-panel">
            <div className="progress-card">
              <p className="section-badge">Состояние загрузки</p>
              <div className={`progress-phase progress-phase--${progress.phase}`}>
                {progress.phase === 'uploading' && 'Отправка'}
                {progress.phase === 'converting' && 'Конвертация'}
                {progress.phase === 'syncing' && 'Синхронизация с экраном'}
                {progress.phase === 'ready' && 'Трансляция'}
                {progress.phase === 'error' && 'Ошибка'}
              </div>
              <div className="file-chip">
                <span className="file-chip__name">{progress.title || progress.fileName}</span>
                <span className="file-chip__meta">{progress.fileName}</span>
              </div>

              <ProgressRing progress={progress.uploadPercent} tone={progress.phase} />

              <div className="progress-copy">
                <h2>{progress.detail}</h2>
                {['converting', 'syncing'].includes(progress.phase) ? <p>{conversionHint}</p> : null}
                {progress.phase === 'ready' ? (
                  <p>Через пару секунд приложение вернётся на главный экран.</p>
                ) : null}
                {progress.phase === 'error' && progress.error ? (
                  <p className="status-banner status-banner--error">{progress.error}</p>
                ) : null}
              </div>

              {progress.phase === 'error' ? (
                <div className="progress-actions">
                  <button className="primary-button" onClick={() => void handleRetryUpload()}>
                    Повторить загрузку
                  </button>
                  <button
                    className="ghost-button"
                    onClick={() => {
                      setProgress(idleProgressState)
                      startTransition(() => {
                        setView('dashboard')
                      })
                    }}
                  >
                    Назад к дашборду
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  )
}

function mapPairedSession(pairedSession: PairingResponse): SessionState {
  return {
    pinCode: pairedSession.pin_code,
    accessToken: pairedSession.access_token,
    displayName: pairedSession.display_name,
    connectedAt: new Date().toISOString(),
  }
}

export default App
