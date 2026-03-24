import { formatPin } from '../lib/format'

type ConnectionStatusProps = {
  pinCode: string
  displayName: string
}

export function ConnectionStatus({ pinCode, displayName }: ConnectionStatusProps) {
  return (
    <div className="connection-pill">
      <div className="connection-pill__status">Подключено</div>
      <p className="connection-pill__name">{displayName}</p>
      <p className="connection-pill__pin">{formatPin(pinCode)}</p>
    </div>
  )
}
