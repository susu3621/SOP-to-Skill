import { useState, useCallback, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import type { AppUpdateInfo } from '../types'

export function useUpdates() {
  const [appUpdate, setAppUpdate] = useState<AppUpdateInfo | null>(null)
  const [checking, setChecking] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [hasUpdates, setHasUpdates] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkUpdates = useCallback(async () => {
    setChecking(true)
    setError(null)

    try {
      const result = await invoke<AppUpdateInfo | null>('check_app_update')
      setAppUpdate(result ?? null)
      setLastCheck(new Date())
      setHasUpdates(Boolean(result))
    } catch (e) {
      setAppUpdate(null)
      setHasUpdates(false)
      setError(String(e))
      console.error('Failed to check updates:', e)
    } finally {
      setChecking(false)
    }
  }, [])

  const installUpdate = useCallback(async (): Promise<{ success?: boolean; error?: string }> => {
    setInstalling(true)
    setError(null)

    try {
      await invoke<boolean>('install_app_update')
      return { success: true }
    } catch (e) {
      const message = String(e)
      setError(message)
      return { error: message }
    } finally {
      setInstalling(false)
    }
  }, [])

  // Listen for tray check updates event
  useEffect(() => {
    const unlisten = listen('tray-check-updates', () => {
      checkUpdates()
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [checkUpdates])

  // Periodic check (every hour)
  useEffect(() => {
    const interval = setInterval(
      () => {
        checkUpdates()
      },
      60 * 60 * 1000
    ) // 1 hour

    return () => clearInterval(interval)
  }, [checkUpdates])

  // Initial check
  useEffect(() => {
    checkUpdates()
  }, [checkUpdates])

  return {
    appUpdate,
    checking,
    installing,
    lastCheck,
    hasUpdates,
    error,
    checkUpdates,
    installUpdate,
  }
}
