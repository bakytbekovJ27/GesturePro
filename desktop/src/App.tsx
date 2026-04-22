import { startTransition, useEffect, useEffectEvent, useState } from 'react'
import './App.css'
import { createDesktopCoreBridge } from './bridge'
import { isMockBridge } from './bridge/desktopCoreBridge'
import { DevPanel } from './components/DevPanel'
import { createTranslator } from './i18n'
import { closeDesktopWindow } from './lib/tauri'
import { LoadScreen } from './screens/LoadScreen'
import { MenuScreen } from './screens/MenuScreen'
import { PresentationScreen } from './screens/PresentationScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import type {
  CoreEvent,
  DesktopScreen,
  GestureMode,
  GestureState,
  LanguageCode,
  LoadState,
  PresentationSlide,
  PresentationSource,
  RuntimeState,
  SessionState,
} from './types/desktop'

function App() {
  const [bridge] = useState(() => createDesktopCoreBridge())
  const [screen, setScreen] = useState<DesktopScreen>('menu')
  const [language, setLanguage] = useState<LanguageCode>(() => {
    const saved = window.localStorage.getItem('gesturepro.desktop.lang')
    return saved === 'en' ? 'en' : 'ru'
  })
  const [pinDisplay, setPinDisplay] = useState('••• •••')
  const [sessionMessage, setSessionMessage] = useState('Booting desktop shell...')
  const [sessionState, setSessionState] = useState<SessionState>('creating')
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [loadStatus, setLoadStatus] = useState('Select a file or trigger a mock deck.')
  const [fileName, setFileName] = useState<string | null>(null)
  const [source, setSource] = useState<PresentationSource | null>(null)
  const [slides, setSlides] = useState<PresentationSlide[]>([])
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [activeGesture, setActiveGesture] = useState<GestureState>('NONE')
  const [gestureMode, setGestureMode] = useState<GestureMode>('idle')
  const [systemActive, setSystemActive] = useState(false)
  const [presentationStatus, setPresentationStatus] = useState('Gesture core paused.')
  const [cameraFrame, setCameraFrame] = useState<string | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>('starting')
  const [runtimeMessage, setRuntimeMessage] = useState('Desktop bridge is starting...')
  const t = createTranslator(language)
  const sessionBadge =
    sessionState === 'ready'
      ? t('badge_pin_ready')
      : sessionState === 'failed'
        ? t('badge_no_pin')
        : sessionState === 'stopped'
          ? t('badge_stopped')
          : t('badge_connecting')
  const runtimeBadge =
    bridge.kind === 'mock'
      ? t('badge_mock')
      : runtimeState === 'ready'
        ? t('badge_live')
        : runtimeState === 'degraded'
          ? t('badge_degraded')
          : runtimeState === 'error'
          ? t('badge_error')
          : t('badge_bridge')

  async function handlePickFile() {
    setLoadState('loading')
    const result = await bridge.pickPresentationFile()
    if (!result) {
      setLoadState('idle')
      setLoadStatus('File selection cancelled.')
    }
  }

  async function handleLoadDemo() {
    setLoadState('loading')
    await bridge.loadDemoSlides()
  }

  function goToPrevSlide() {
    setCurrentSlideIndex((current) => {
      if (slides.length === 0) {
        return 0
      }
      return current === 0 ? slides.length - 1 : current - 1
    })
  }

  function goToNextSlide() {
    setCurrentSlideIndex((current) => {
      if (slides.length === 0) {
        return 0
      }
      return (current + 1) % slides.length
    })
  }

  async function handleExit() {
    await closeDesktopWindow()
  }

  const handleCoreEvent = useEffectEvent((event: CoreEvent) => {
    switch (event.type) {
      case 'session_status':
        setSessionState(event.status)
        setPinDisplay(event.displayName)
        setSessionMessage(event.message)
        return
      case 'presentation_status':
        setLoadStatus(event.message)
        setPresentationStatus(event.message)
        setFileName(event.fileName ?? null)
        setSource(event.source ?? null)

        if (event.status === 'loading') {
          setLoadState('loading')
          return
        }

        if (event.status === 'idle') {
          setLoadState('idle')
          return
        }

        if (event.status === 'ready' && (event.slides || event.documentUrl)) {
          setLoadState('ready')
          startTransition(() => {
            setSlides(event.slides ?? [])
            setDocumentUrl(event.documentUrl ?? null)
            setCurrentSlideIndex(0)
            setScreen('presentation')
          })
          return
        }

        if (event.status === 'error') {
          setLoadState('error')
        }
        return
      case 'gesture_state':
        setActiveGesture(event.gesture)
        setGestureMode(event.mode)
        setSystemActive(event.systemActive)
        setPresentationStatus(event.message)
        if (!event.systemActive && event.mode === 'idle' && event.gesture === 'NONE') {
          setCameraFrame(null)
        }
        return
      case 'core_error':
        setLoadState('error')
        setLoadStatus(event.message)
        setPresentationStatus(event.message)
        if (pinDisplay === '••• •••') {
          setSessionState('failed')
          setSessionMessage(event.message)
        }
        return
      case 'runtime_status':
        setRuntimeState(event.status)
        setRuntimeMessage(event.message)
        if (event.status === 'error' || event.status === 'degraded') {
          setPresentationStatus(event.message)
          if (pinDisplay === '••• •••') {
            setSessionState('failed')
            setSessionMessage(event.message)
          }
        }
        return
      case 'presentation_command':
        if (event.action === 'next_slide') {
          goToNextSlide()
        } else {
          goToPrevSlide()
        }
        return
      case 'camera_frame':
        setCameraFrame(event.data)
        return
    }
  })

  const handleKeyboard = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key.toLowerCase()

    if (screen === 'menu') {
      if (key === '1') {
        setScreen('load')
      } else if (key === '2') {
        setScreen('settings')
      } else if (key === 'q' || key === 'escape') {
        void closeDesktopWindow()
      }
      return
    }

    if (screen === 'settings') {
      if (key === 'b' || key === 'escape') {
        setScreen('menu')
      } else if (key === 'r') {
        setLanguage('ru')
      } else if (key === 'e') {
        setLanguage('en')
      }
      return
    }

    if (screen === 'load') {
      if (key === 'b' || key === 'escape') {
        setScreen('menu')
      } else if (key === 'o') {
        void handlePickFile()
      } else if (key === 'd') {
        void handleLoadDemo()
      }
      return
    }

    if (screen === 'presentation') {
      if (key === 'arrowleft' || key === 'a') {
        goToPrevSlide()
      } else if (key === 'arrowright' || key === 'd') {
        goToNextSlide()
      } else if (key === 'm') {
        setScreen('menu')
      } else if (key === 'o') {
        setScreen('load')
      } else if (key === 'q') {
        void closeDesktopWindow()
      }
    }
  })

  useEffect(() => {
    const unsubscribe = bridge.subscribe(handleCoreEvent)
    let disposed = false
    void bridge.startSession().catch((error) => {
      if (disposed) {
        return
      }
      const message = error instanceof Error ? error.message : 'Desktop bridge failed to start.'
      setPinDisplay('••• •••')
      setSessionState('failed')
      setSessionMessage(message)
      setRuntimeState('error')
      setRuntimeMessage(message)
      setPresentationStatus(message)
    })
    return () => {
      disposed = true
      unsubscribe()
      void bridge.stopSession()
      void bridge.dispose()
    }
  }, [bridge])

  useEffect(() => {
    if (screen === 'presentation') {
      void bridge.startGestureCore()
    } else {
      void bridge.stopGestureCore()
    }
  }, [bridge, screen])

  useEffect(() => {
    window.localStorage.setItem('gesturepro.desktop.lang', language)
  }, [language])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboard)
    return () => {
      window.removeEventListener('keydown', handleKeyboard)
    }
  }, [])

  return (
    <div className="app-shell">
      <div className="app-shell__chrome">
        <div className="app-shell__chrome-copy">
          <span className="app-shell__eyebrow">GesturePro</span>
          <strong className="app-shell__title">Desktop Control</strong>
        </div>
        <div className="app-shell__chrome-right">
          <span className="status-pill status-pill--accent">{pinDisplay}</span>
          <span className={`status-pill ${runtimeState === 'ready' ? 'status-pill--success' : ''}`}>
            {runtimeBadge}
          </span>
        </div>
      </div>

      {screen === 'menu' ? (
        <MenuScreen
          t={t}
          sessionBadge={sessionBadge}
          pinDisplay={pinDisplay}
          sessionMessage={sessionMessage}
          onStart={() => setScreen('load')}
          onSettings={() => setScreen('settings')}
          onExit={() => void handleExit()}
        />
      ) : null}

      {screen === 'settings' ? (
        <SettingsScreen
          t={t}
          language={language}
          onLanguageChange={setLanguage}
          onBack={() => setScreen('menu')}
        />
      ) : null}

      {screen === 'load' ? (
        <LoadScreen
          t={t}
          loadState={loadState}
          statusMessage={loadStatus}
          pinDisplay={pinDisplay}
          sessionMessage={sessionMessage}
          sessionBadge={sessionBadge}
          runtimeMessage={runtimeMessage}
          runtimeBadge={runtimeBadge}
          fileName={fileName}
          source={source}
          onPickFile={() => void handlePickFile()}
          onLoadDemo={() => void handleLoadDemo()}
          onBack={() => setScreen('menu')}
        />
      ) : null}

      {screen === 'presentation' ? (
        <PresentationScreen
          t={t}
          title={fileName ?? slides[currentSlideIndex]?.title ?? 'Deck'}
          slides={slides}
          documentUrl={documentUrl}
          currentIndex={currentSlideIndex}
          activeGesture={activeGesture}
          gestureMode={gestureMode}
          systemActive={systemActive}
          statusMessage={presentationStatus}
          onPrev={goToPrevSlide}
          onNext={goToNextSlide}
          onMenu={() => setScreen('menu')}
          onLoad={() => setScreen('load')}
          cameraFrame={cameraFrame}
        />
      ) : null}

      {import.meta.env.DEV && isMockBridge(bridge) ? (
        <DevPanel
          t={t}
          gesture={activeGesture}
          loadState={loadState}
          onRefreshSession={() => void bridge.refreshSession()}
          onSimulateRemoteDeck={() => void bridge.simulateRemoteDeck()}
          onCycleGesture={() => bridge.cycleGesture()}
          onSimulateError={() => bridge.simulateError()}
        />
      ) : null}
    </div>
  )
}

export default App
