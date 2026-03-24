import { formatFileSize, formatRelativeTime } from '../lib/format'
import type { PresentationSummary } from '../types/api'

type HistoryPanelProps = {
  items: PresentationSummary[]
  activeId: string | null
  onReuse: (presentationId: string) => void
}

export function HistoryPanel({ items, activeId, onReuse }: HistoryPanelProps) {
  return (
    <aside className="history-panel">
      <div>
        <p className="section-badge">История</p>
        <h2>Последние отправки</h2>
      </div>

      {items.length === 0 ? (
        <p className="history-empty">
          История появится после первой отправки. Здесь можно будет повторно запускать уже
          загруженные презентации.
        </p>
      ) : (
        <div className="history-list">
          {items.map((item) => (
            <article className="history-item" key={item.id}>
              <div>
                <strong className="history-item__title">{item.title}</strong>
                <small className="history-item__meta">
                  {formatFileSize(item.file_size)} • {formatRelativeTime(item.last_sent_at)}
                </small>
                <span className={`history-item__status history-item__status--${item.status}`}>
                  {item.status_message}
                </span>
              </div>
              <button
                className="history-item__button"
                disabled={
                  activeId === item.id ||
                  item.status === 'uploading' ||
                  item.status === 'converting' ||
                  item.status === 'error'
                }
                onClick={() => onReuse(item.id)}
              >
                {activeId === item.id ? 'Отправка...' : 'Отправить снова'}
              </button>
            </article>
          ))}
        </div>
      )}
    </aside>
  )
}
