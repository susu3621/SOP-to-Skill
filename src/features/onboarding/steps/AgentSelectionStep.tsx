import { invoke } from '@tauri-apps/api/core'
import { openUrl } from '@tauri-apps/plugin-opener'
import type { MouseEvent } from 'react'
import { getOnboardingSupportedAgentOptions } from '../../../content/workbuddy'
import { getOnboardingCopy, onboardingCopy } from '../copy'
import type { Locale } from '../../../types'

interface AgentSelectionStepProps {
  locale: Locale
  selectedAgentIds: string[]
  onToggleAgent: (agentId: string) => void
}

export function AgentSelectionStep({
  locale,
  selectedAgentIds,
  onToggleAgent,
}: AgentSelectionStepProps) {
  const agents = getOnboardingSupportedAgentOptions(locale)
  const officialSiteLabel = getOnboardingCopy(locale, onboardingCopy.officialSite)

  async function handleOfficialSiteClick(
    event: MouseEvent<HTMLAnchorElement>,
    websiteUrl: string
  ) {
    event.preventDefault()

    try {
      await openUrl(websiteUrl)
      return
    } catch (pluginError) {
      try {
        await invoke('open_external_url', { url: websiteUrl })
        return
      } catch (fallbackError) {
        console.error(`Failed to open official site: ${websiteUrl}`, pluginError, fallbackError)
      }
    }
  }

  return (
    <div className="field">
      <label>{getOnboardingCopy(locale, onboardingCopy.selectAgentApps)}</label>
      <div className="options options--cards">
        {agents.map((agent) => {
          const websiteUrl = agent.website_url

          return (
            <div className="field-option" key={agent.id}>
              <input
                id={`agent-${agent.id}`}
                aria-label={agent.name}
                checked={selectedAgentIds.includes(agent.id)}
                type="checkbox"
                onChange={() => onToggleAgent(agent.id)}
              />
              <div className="field-option__content">
                <div className="field-option__header">
                  <label className="field-option__title" htmlFor={`agent-${agent.id}`}>
                    {agent.name}
                  </label>
                  {websiteUrl && (
                    <a
                      aria-label={`${agent.name} ${officialSiteLabel}`}
                      className="field-option__link"
                      href={websiteUrl}
                      onClick={(event) => void handleOfficialSiteClick(event, websiteUrl)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {officialSiteLabel}
                    </a>
                  )}
                </div>
                <label className="field-option__body" htmlFor={`agent-${agent.id}`}>
                  <span className="field-option__hint">{agent.description}</span>
                </label>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
