import type { UploadFlowState } from '../types/api'

type ProgressRingProps = {
  progress: number
  tone: UploadFlowState['phase']
}

const radius = 64
const circumference = 2 * Math.PI * radius

export function ProgressRing({ progress, tone }: ProgressRingProps) {
  const safeProgress = Math.min(100, Math.max(0, progress))
  const dashOffset = circumference - (safeProgress / 100) * circumference
  const stroke =
    tone === 'error' ? '#ff7969' : tone === 'ready' ? '#78f0b1' : '#ff9b54'

  return (
    <div className="progress-ring" aria-label={`Прогресс ${safeProgress}%`}>
      <svg viewBox="0 0 160 160" role="presentation" aria-hidden="true">
        <circle className="progress-ring__track" cx="80" cy="80" r={radius} />
        <circle
          className="progress-ring__value"
          cx="80"
          cy="80"
          r={radius}
          stroke={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="progress-ring__label">{safeProgress}%</div>
    </div>
  )
}
