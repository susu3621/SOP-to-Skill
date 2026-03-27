function getOnboardingGeneratedSkillIds(input) {
  if (!input.roleKey) {
    throw new Error('Missing roleKey for onboarding skill id generation.');
  }

  if (!input.useCaseDirectory) {
    throw new Error('Missing useCaseDirectory for onboarding skill id generation.');
  }

  const productionSkillId = `${input.roleKey}-${input.useCaseDirectory}`;
  const testSkillId = `test-${productionSkillId}`;

  return {
    productionSkillId,
    testSkillId,
  };
}

function getDefaultOnboardingGeneratedInstallCandidates(input) {
  if (!input.selectedRole) {
    return [];
  }

  const roleUseCases = Array.isArray(input.useCases) ? input.useCases : [];
  const roleUseCaseIds = roleUseCases
    .filter((useCase) => (useCase.applicableRoleIds || []).includes(input.selectedRole.id))
    .map((useCase) => {
      const useCaseDirectory = input.sharedConfig?.useCases?.[useCase.name]?.directory;
      if (!useCaseDirectory) {
        throw new Error(`Missing directory mapping for use case: ${useCase.name}`);
      }

      return getOnboardingGeneratedSkillIds({
        roleKey: input.selectedRole.id,
        useCaseDirectory,
      });
    });

  return roleUseCaseIds.flatMap(({ productionSkillId, testSkillId }) => [
    productionSkillId,
    testSkillId,
  ]);
}

module.exports = {
  getDefaultOnboardingGeneratedInstallCandidates,
  getOnboardingGeneratedSkillIds,
};
