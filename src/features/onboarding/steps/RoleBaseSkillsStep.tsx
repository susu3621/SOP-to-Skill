import {
  getOnboardingBaseSkillOptions,
  getOnboardingRoleOptions,
} from '../../../content/workbuddy'
import type { Locale } from '../../../types'
import { getOnboardingCopy, onboardingCopy } from '../copy'

interface RoleBaseSkillsStepProps {
  locale: Locale
  selectedRoleId: string
  selectedBaseSkillIds: string[]
  onSelectRole: (roleId: string) => void
  onToggleBaseSkill: (skillId: string) => void
}

export function RoleBaseSkillsStep({
  locale,
  selectedRoleId,
  selectedBaseSkillIds,
  onSelectRole,
  onToggleBaseSkill,
}: RoleBaseSkillsStepProps) {
  const roles = getOnboardingRoleOptions(locale)
  const baseSkills = getOnboardingBaseSkillOptions(locale)

  return (
    <>
      <div className="field">
        <label>{getOnboardingCopy(locale, onboardingCopy.roleTab)}</label>
        <div className="options options--cards">
          {roles.map((role) => (
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
        <label>{getOnboardingCopy(locale, onboardingCopy.homeBaseSkills)}</label>
        <div className="options options--cards">
          {baseSkills.map((skill) => (
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
