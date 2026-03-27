import { onboardingBaseSkills, onboardingRoles } from '../../../content/workbuddy'

interface RoleBaseSkillsStepProps {
  selectedRoleId: string
  selectedBaseSkillIds: string[]
  onSelectRole: (roleId: string) => void
  onToggleBaseSkill: (skillId: string) => void
}

export function RoleBaseSkillsStep({
  selectedRoleId,
  selectedBaseSkillIds,
  onSelectRole,
  onToggleBaseSkill,
}: RoleBaseSkillsStepProps) {
  return (
    <>
      <div className="field">
        <label>选择岗位</label>
        <div className="options options--cards">
          {onboardingRoles.map((role) => (
            <label className="field-option" key={role.id}>
              <input
                aria-label={role.name}
                checked={selectedRoleId === role.id}
                name="selected-role"
                type="radio"
                onChange={() => onSelectRole(role.id)}
              />
              <span>
                <span>{role.name}</span>
                <span className="field-option__hint">{role.description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label>基础技能</label>
        <div className="options options--cards">
          {onboardingBaseSkills.map((skill) => (
            <label className="field-option" key={skill.id}>
              <input
                aria-label={skill.name}
                checked={selectedBaseSkillIds.includes(skill.id)}
                type="checkbox"
                onChange={() => onToggleBaseSkill(skill.id)}
              />
              <span>
                <span>{skill.name}</span>
                <span className="field-option__hint">{skill.description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
    </>
  )
}
