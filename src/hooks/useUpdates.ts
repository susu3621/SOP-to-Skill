import { useState, useCallback, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import type { UpdateCheckResult, SkillResult } from '../types'

export function useUpdates() {
  const [updateResults, setUpdateResults] = useState<UpdateCheckResult[]>([])
  const [checking, setChecking] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [hasUpdates, setHasUpdates] = useState(false)

  const checkUpdates = useCallback(async () => {
    setChecking(true)

    try {
      const result: SkillResult<UpdateCheckResult[]> = await invoke('check_skill_updates')

      if (result.success) {
        setUpdateResults(result.success)
        setLastCheck(new Date())

        const hasAvailable = result.success.some(
          (r) => r.update_status === 'update-available'
        )
        setHasUpdates(hasAvailable)
      }
    } catch (e) {
      console.error('Failed to check updates:', e)
    }

    setChecking(false)
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
    updateResults,
    checking,
    lastCheck,
    hasUpdates,
    checkUpdates,
  }
}
