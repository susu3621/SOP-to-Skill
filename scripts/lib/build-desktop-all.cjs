function buildWorkflowRunArgs({ workflowFile, branch }) {
  return ['workflow', 'run', workflowFile, '--ref', branch];
}

function selectWorkflowRun(runs, { workflowName, branch, expectedHeadSha, triggerTime }) {
  const matches = runs.filter((run) => {
    return (
      run.workflowName === workflowName &&
      run.event === 'workflow_dispatch' &&
      run.headBranch === branch &&
      run.headSha === expectedHeadSha &&
      run.createdAt >= triggerTime
    );
  });

  if (matches.length === 0) {
    throw new Error(`No workflow run matched ${workflowName} for ${branch} @ ${expectedHeadSha}`);
  }

  const earliestMatch = matches.reduce((earliest, run) => {
    return run.createdAt < earliest.createdAt ? run : earliest;
  });

  return earliestMatch.id;
}

module.exports = {
  buildWorkflowRunArgs,
  selectWorkflowRun,
};
