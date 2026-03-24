export function formatPin(pinCode: string) {
  const sanitized = pinCode.replace(/\D/g, '').slice(0, 6)
  if (sanitized.length <= 3) {
    return sanitized
  }
  return `${sanitized.slice(0, 3)} ${sanitized.slice(3)}`
}

export function formatFileSize(fileSize: number) {
  if (!fileSize) {
    return 'размер неизвестен'
  }
  const units = ['Б', 'КБ', 'МБ', 'ГБ']
  let value = fileSize
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

export function formatRelativeTime(dateString: string) {
  const timestamp = new Date(dateString).getTime()
  if (Number.isNaN(timestamp)) {
    return 'только что'
  }

  const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000))
  if (diffMinutes < 1) {
    return 'только что'
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} мин назад`
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours} ч назад`
  }

  const diffDays = Math.round(diffHours / 24)
  return `${diffDays} дн назад`
}
