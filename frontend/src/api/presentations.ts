import axios from 'axios'
import type { AxiosProgressEvent } from 'axios'
import { apiClient, getAuthHeaders } from './client'
import type { PairingResponse, PresentationSummary } from '../types/api'


export async function pairSession(pinCode: string) {
  try {
    const response = await apiClient.post<PairingResponse>('/session/pair/', {
      pin_code: pinCode,
    })
    return response.data
  } catch (error) {
    throw mapApiError(error, 'Код недействителен или экран отключен.')
  }
}

export async function fetchRecentPresentations(accessToken: string) {
  try {
    const response = await apiClient.get<PresentationSummary[]>('/presentations/recent/', {
      headers: getAuthHeaders(accessToken),
    })
    return response.data
  } catch (error) {
    throw mapApiError(error, 'Не удалось получить историю презентаций.')
  }
}

export async function uploadPresentation(
  accessToken: string,
  file: File,
  onProgress?: (percent: number) => void,
) {
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await apiClient.post<PresentationSummary>('/presentations/upload/', formData, {
      headers: getAuthHeaders(accessToken),
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (!onProgress || !event.total) {
          return
        }
        const percent = Math.round((event.loaded / event.total) * 100)
        onProgress(percent)
      },
    })
    return response.data
  } catch (error) {
    throw mapApiError(error, 'Не удалось загрузить файл. Проверьте соединение.')
  }
}

export async function getPresentationStatus(accessToken: string, presentationId: string) {
  try {
    const response = await apiClient.get<PresentationSummary>(
      `/presentations/status/${presentationId}/`,
      {
        headers: getAuthHeaders(accessToken),
      },
    )
    return response.data
  } catch (error) {
    throw mapApiError(error, 'Не удалось получить статус обработки.')
  }
}

export async function reusePresentation(accessToken: string, presentationId: string) {
  try {
    const response = await apiClient.post<PresentationSummary>(
      `/presentations/${presentationId}/reuse/`,
      {},
      {
        headers: getAuthHeaders(accessToken),
      },
    )
    return response.data
  } catch (error) {
    throw mapApiError(error, 'Не удалось отправить презентацию повторно.')
  }
}

function mapApiError(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string' && detail) {
      return new Error(detail)
    }
  }
  return new Error(fallbackMessage)
}
