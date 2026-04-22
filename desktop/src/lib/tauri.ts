export async function closeDesktopWindow(): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await invoke('stop_sidecar')
    await getCurrentWindow().close()
    return
  } catch {
    window.close()
  }
}
