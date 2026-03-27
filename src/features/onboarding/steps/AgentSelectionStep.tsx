import { onboardingSupportedAgents } from '../../../content/workbuddy'

interface AgentSelectionStepProps {
  selectedAgentIds: string[]
  onToggleAgent: (agentId: string) => void
}

export function AgentSelectionStep({
  selectedAgentIds,
  onToggleAgent,
}: AgentSelectionStepProps) {
  return (
    <div className="field">
      <label>选择 Agent 应用</label>
      <div className="options options--cards">
        {onboardingSupportedAgents.map((agent) => (
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
