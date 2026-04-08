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

  return (
    <div className="field">
      <label>{getOnboardingCopy(locale, onboardingCopy.selectAgentApps)}</label>
      <div className="options options--cards">
        {agents.map((agent) => (
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
                {agent.website_url && (
                  <a
                    aria-label={`${agent.name} ${officialSiteLabel}`}
                    className="field-option__link"
                    href={agent.website_url}
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
        ))}
      </div>
    </div>
  )
}
