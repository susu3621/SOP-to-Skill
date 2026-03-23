import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type {
  SkillInfo,
  InstalledSkillInfo,
  TargetAppInfo,
  SkillResult,
} from '../types'

export function useSkills() {
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [installed, setInstalled] = useState<InstalledSkillInfo[]>([])
  const [targetApps, setTargetApps] = useState<TargetAppInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSkills = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result: SkillResult<SkillInfo[]> = await invoke('list_skills')
      if (result.success) {
        setSkills(result.success)
      } else if (result.error) {
        setError(result.error)
      }
    } catch (e) {
      setError(String(e))
    }

    setLoading(false)
  }, [])

  const loadInstalled = useCallback(async () => {
    try {
      const result: SkillResult<InstalledSkillInfo[]> = await invoke('list_installed')
      if (result.success) {
        setInstalled(result.success)
      }
    } catch (e) {
      console.error('Failed to load installed skills:', e)
    }
  }, [])

  const loadTargetApps = useCallback(async () => {
    try {
      const apps: TargetAppInfo[] = await invoke('get_target_apps')
      setTargetApps(apps)
    } catch (e) {
      console.error('Failed to load target apps:', e)
    }
  }, [])

  const installSkill = useCallback(
    async (
      skillId: string,
      appId: string,
      variables: Record<string, string>
    ): Promise<{ success?: InstalledSkillInfo; error?: string }> => {
      try {
        const result: SkillResult<InstalledSkillInfo> = await invoke('install_skill', {
          skillId,
          appId,
          variables,
        })

        if (result.success) {
          await loadInstalled()
          await loadSkills()
          return { success: result.success }
        }

        return { error: result.error || 'Unknown error' }
      } catch (e) {
        return { error: String(e) }
      }
    },
    [loadInstalled, loadSkills]
  )

  const uninstallSkill = useCallback(
    async (skillId: string, appId: string): Promise<{ success?: boolean; error?: string }> => {
      try {
        const result: SkillResult<void> = await invoke('uninstall_skill', {
          skillId,
          appId,
        })

        if (result.success !== undefined) {
          await loadInstalled()
          await loadSkills()
          return { success: true }
        }

        return { error: result.error || 'Unknown error' }
      } catch (e) {
        return { error: String(e) }
      }
    },
    [loadInstalled, loadSkills]
  )

  const getSkill = useCallback(async (skillId: string): Promise<SkillInfo | null> => {
    try {
      const result: SkillResult<SkillInfo> = await invoke('get_skill', { skillId })
      return result.success || null
    } catch {
      return null
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadSkills()
    loadInstalled()
    loadTargetApps()
  }, [loadSkills, loadInstalled, loadTargetApps])

  return {
    skills,
    installed,
    targetApps,
    loading,
    error,
    loadSkills,
    loadInstalled,
    installSkill,
    uninstallSkill,
    getSkill,
  }
}

export function useLocale() {
  const [locale, setLocale] = useState<'zh-CN' | 'en-US'>('zh-CN')

  useEffect(() => {
    // Try to load preferred locale from config
    invoke<SkillResult<{ preferred_locale?: string }>>('get_config')
      .then((result) => {
        if (result.success?.preferred_locale) {
          setLocale(result.success.preferred_locale as 'zh-CN' | 'en-US')
        }
      })
      .catch(() => {
        // Default to zh-CN
      })
  }, [])

  const updateLocale = useCallback(async (newLocale: 'zh-CN' | 'en-US') => {
    try {
      await invoke('update_config', { preferredLocale: newLocale })
      setLocale(newLocale)
    } catch (e) {
      console.error('Failed to update locale:', e)
    }
  }, [])

  const getText = useCallback(
    (localized: Record<string, string> | undefined): string => {
      if (!localized) return ''
      return localized[locale] || localized['zh-CN'] || localized['en-US'] || ''
    },
    [locale]
  )

  return { locale, setLocale: updateLocale, getText }
}
