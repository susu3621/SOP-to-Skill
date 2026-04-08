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

  return (
    <div className="field">
      <label>{getOnboardingCopy(locale, onboardingCopy.selectAgentApps)}</label>
      <div className="options options--cards">
        {agents.map((agent) => (
          <label className="field-option" key={agent.id}>
            <input
              aria-label={agent.name}
              checked={selectedAgentIds.includes(agent.id)}
              type="checkbox"
              onChange={() => onToggleAgent(agent.id)}
            />
            <span>
              <span>{agent.name}</span>
              <span className="field-option__hint">{agent.description}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
