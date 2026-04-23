import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.README_SCREENSHOT_URL ?? 'http://127.0.0.1:1420/'
const outputDir = path.resolve('docs/images')

function buildUseCases(locale) {
  if (locale === 'en-US') {
    return [
      {
        role_id: 'project-manager',
        use_case_id: 'daily-log',
        use_case_name: 'Daily Log',
        description:
          'Capture daily progress, meeting conclusions, and blockers in a traceable project log.\n\nRuntime input: ask the user for the specific date when the Skill is invoked; if anything is missing, ask follow-up questions before proceeding. Do not fill this during Skill design.',
        info_sources:
          'Current workflow / SOP / template:\nhttps://company.example/sop/daily-log\n\nGood examples:\nhttps://company.example/examples/daily-log\n\nOther:\nhttps://company.example/wiki/project-log',
        rules: 'Write the log in the shared daily format, grouped by progress, blockers, and next steps.',
      },
      {
        role_id: 'project-manager',
        use_case_id: 'planning',
        use_case_name: 'Planning',
        description:
          'Create or update project plans so milestones, owners, and dependencies stay aligned.\n\nRuntime input: ask the user for the planning time range and scope when the Skill is invoked; if anything is missing, ask follow-up questions before proceeding. Do not fill this during Skill design.',
        info_sources:
          'Current workflow / SOP / template:\nhttps://company.example/sop/planning\n\nGood examples:\nhttps://company.example/examples/planning\n\nOther:\nhttps://company.example/wiki/roadmap',
        rules: 'Keep the output concise and include milestone owners, due dates, and external dependencies.',
      },
      {
        role_id: 'project-manager',
        use_case_id: 'weekly-report',
        use_case_name: 'Weekly Report',
        description:
          'Summarize project status, major risks, and decisions for the weekly stakeholder update.\n\nRuntime input: ask the user for the reporting week or project when the Skill is invoked; if anything is missing, ask follow-up questions before proceeding. Do not fill this during Skill design.',
        info_sources:
          'Current workflow / SOP / template:\nhttps://company.example/sop/weekly-report\n\nGood examples:\nhttps://company.example/examples/weekly-report\n\nOther:\nhttps://company.example/wiki/reporting',
        rules: 'List risks first, then milestones, and finish with required support.',
      },
    ]
  }

  return [
    {
      role_id: 'project-manager',
      use_case_id: 'daily-log',
      use_case_name: '记录日志',
      description:
        '记录每日推进动作、会议结论和阻塞项，形成可追溯的项目日志。\n\n运行时输入：调用 Skill 时需要用户提供具体哪一天；如果用户未提供完整信息，先追问补齐，不需要在设计 Skill 时填写。',
      info_sources:
        '当前流程 / SOP / 模板：\nhttps://company.example/sop/daily-log\n\n较好的例子：\nhttps://company.example/examples/daily-log\n\n其他：\nhttps://company.example/wiki/project-log',
      rules: '按共享日志模板输出，分成进展、阻塞和下一步三部分。',
    },
    {
      role_id: 'project-manager',
      use_case_id: 'planning',
      use_case_name: '记录计划',
      description:
        '制定和更新项目计划，保证里程碑、负责人和依赖关系保持一致。\n\n运行时输入：调用 Skill 时需要用户提供计划的时间及范围；如果用户未提供完整信息，先追问补齐，不需要在设计 Skill 时填写。',
      info_sources:
        '当前流程 / SOP / 模板：\nhttps://company.example/sop/planning\n\n较好的例子：\nhttps://company.example/examples/planning\n\n其他：\nhttps://company.example/wiki/roadmap',
      rules: '输出保持简洁，包含里程碑负责人、截止时间和外部依赖。',
    },
    {
      role_id: 'project-manager',
      use_case_id: 'weekly-report',
      use_case_name: '项目周报',
      description:
        '汇总项目状态、主要风险和关键决策，形成每周的对外同步内容。\n\n运行时输入：调用 Skill 时需要用户提供周报对应的时间范围或项目；如果用户未提供完整信息，先追问补齐，不需要在设计 Skill 时填写。',
      info_sources:
        '当前流程 / SOP / 模板：\nhttps://company.example/sop/weekly-report\n\n较好的例子：\nhttps://company.example/examples/weekly-report\n\n其他：\nhttps://company.example/wiki/reporting',
      rules: '优先列出风险，再列里程碑进展，最后补充需要协调的事项。',
    },
  ]
}

function buildScenario(locale) {
  const useCases = buildUseCases(locale)
  const installCandidateGroups = useCases.map((useCase) => ({
    use_case_id: useCase.use_case_id,
    use_case_name: useCase.use_case_name,
    production_skill_id: `project-manager-${useCase.use_case_id}`,
    test_skill_id: `test-project-manager-${useCase.use_case_id}`,
  }))

  const selectedInstallSkillIds = [
    'jira',
    'confluence',
    'project-manager-daily-log',
    'test-project-manager-daily-log',
    'project-manager-planning',
    'test-project-manager-planning',
    'project-manager-weekly-report',
    'test-project-manager-weekly-report',
  ]

  return {
    locale,
    installedSkills: [
      {
        skill_id: 'jira',
        app_id: 'codex',
        app_name: 'Codex',
        installed_version: '0.2.0',
        installed_at: '2026-04-08T10:00:00Z',
        output_path: '/tmp/codex/jira',
      },
      {
        skill_id: 'confluence',
        app_id: 'claude-code',
        app_name: 'Claude Code',
        installed_version: '0.2.0',
        installed_at: '2026-04-08T10:01:00Z',
        output_path: '/tmp/claude/confluence',
      },
      {
        skill_id: 'project-manager-weekly-report',
        app_id: 'workbuddy',
        app_name: 'WorkBuddy',
        installed_version: '0.2.0',
        installed_at: '2026-04-08T10:02:00Z',
        output_path: '/tmp/workbuddy/project-manager-weekly-report',
      },
    ],
    onboardingState: {
      selected_agent_ids: ['workbuddy', 'codex', 'claude-code'],
      selected_role_id: 'project-manager',
      selected_base_skill_ids: ['jira', 'confluence'],
      role_use_case_contents: useCases,
      selected_install_skill_ids: selectedInstallSkillIds,
      selected_install_skill_ids_initialized: true,
      selected_install_candidate_skill_ids: selectedInstallSkillIds,
      credential_values: {
        jira_base_url: 'https://jira.example.com',
        jira_email: 'pm@example.com',
        confluence_base_url: 'https://wiki.example.com',
      },
    },
    onboardingPreview: {
      install_candidate_skill_ids: selectedInstallSkillIds,
      generated_skill_ids: installCandidateGroups.map(({ production_skill_id, test_skill_id }) => ({
        production_skill_id,
        test_skill_id,
      })),
      selected_agent_ids: ['workbuddy', 'codex', 'claude-code'],
      selected_install_skill_ids: selectedInstallSkillIds,
      agent_previews: [
        {
          agent_id: 'workbuddy',
          added_skill_ids: installCandidateGroups.flatMap((group) => [
            group.production_skill_id,
            group.test_skill_id,
          ]),
          removed_skill_ids: [],
          unchanged_skill_ids: ['jira', 'confluence'],
        },
        {
          agent_id: 'codex',
          added_skill_ids: installCandidateGroups.flatMap((group) => [
            group.production_skill_id,
            group.test_skill_id,
          ]),
          removed_skill_ids: [],
          unchanged_skill_ids: ['jira'],
        },
        {
          agent_id: 'claude-code',
          added_skill_ids: installCandidateGroups.flatMap((group) => [
            group.production_skill_id,
            group.test_skill_id,
          ]),
          removed_skill_ids: [],
          unchanged_skill_ids: ['confluence'],
        },
      ],
    },
  }
}

function initMockScript(scenario) {
  window.__README_SCREENSHOT_RUNTIME__ = {
    preferredLocale: scenario.locale,
    installedSkills: scenario.installedSkills,
    onboardingState: scenario.onboardingState,
    onboardingPreview: scenario.onboardingPreview,
  }

  const callbacks = new Map()
  const eventListeners = new Map()
  let nextCallbackId = 1

  function registerCallback(callback, once = false) {
    const id = nextCallbackId
    nextCallbackId += 1
    callbacks.set(id, (data) => {
      if (once) {
        callbacks.delete(id)
      }
      if (typeof callback === 'function') {
        return callback(data)
      }
      return undefined
    })
    return id
  }

  function removeEventListener(event, id) {
    const listeners = eventListeners.get(event) ?? []
    eventListeners.set(
      event,
      listeners.filter((listenerId) => listenerId !== id)
    )
    callbacks.delete(id)
  }

  window.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
    unregisterListener: removeEventListener,
  }

  window.__TAURI_INTERNALS__ = {
    callbacks,
    transformCallback: registerCallback,
    unregisterCallback(id) {
      callbacks.delete(id)
    },
    runCallback(id, data) {
      const callback = callbacks.get(id)
      if (callback) {
        callback(data)
      }
    },
    async invoke(cmd, args) {
      const runtime = window.__README_SCREENSHOT_RUNTIME__

      switch (cmd) {
        case 'plugin:event|listen': {
          const listeners = eventListeners.get(args.event) ?? []
          listeners.push(args.handler)
          eventListeners.set(args.event, listeners)
          return args.handler
        }
        case 'plugin:event|unlisten':
          removeEventListener(args.event, args.eventId)
          return null
        case 'plugin:event|emit': {
          const listeners = eventListeners.get(args.event) ?? []
          listeners.forEach((listenerId) => {
            window.__TAURI_INTERNALS__.runCallback(listenerId, {
              event: args.event,
              id: listenerId,
              payload: args.payload,
            })
          })
          return null
        }
        case 'list_skills':
          return { success: [] }
        case 'list_installed':
          return { success: runtime.installedSkills }
        case 'get_target_apps':
          return []
        case 'check_app_update':
          return null
        case 'install_app_update':
          return true
        case 'get_config':
          return { success: { preferred_locale: runtime.preferredLocale } }
        case 'update_config':
          runtime.preferredLocale = args.preferredLocale
          return { success: { preferred_locale: runtime.preferredLocale } }
        case 'get_onboarding_state':
          return { success: runtime.onboardingState }
        case 'set_onboarding_state':
          runtime.onboardingState = args.state
          return { success: runtime.onboardingState }
        case 'get_onboarding_install_preview':
          return { success: runtime.onboardingPreview }
        case 'stage_onboarding_generated_packages':
          return { success: { production: null, test: null } }
        case 'sync_onboarding_installation':
          return {
            success: {
              selected_agent_ids: runtime.onboardingState.selected_agent_ids,
              selected_install_skill_ids: runtime.onboardingState.selected_install_skill_ids,
              agent_results: runtime.onboardingPreview.agent_previews.map((preview) => ({
                ...preview,
                success: true,
                error: null,
              })),
            },
          }
        default:
          return { success: null }
      }
    },
  }
}

async function waitForFonts(page) {
  await page.waitForFunction(() => document.fonts?.status === 'loaded')
}

async function waitForLocaleReady(page, locale) {
  const expectedTitle =
    locale === 'en-US'
      ? 'Hand your company SOPs to AI so you can spend time on work that matters.'
      : 'SOP 交给 AI 执行，省下时间去做真正有价值的事。'
  await page.getByRole('heading', { name: expectedTitle }).waitFor()
}

async function captureForLocale(page, locale) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await waitForLocaleReady(page, locale)
  await waitForFonts(page)

  const shell = page.locator('main.shell')

  await shell.screenshot({
    path: path.join(outputDir, locale === 'en-US' ? 'app-home-en.png' : 'app-home-zh.png'),
  })
}

async function main() {
  await mkdir(outputDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })

  try {
    for (const locale of ['zh-CN', 'en-US']) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1280 },
        deviceScaleFactor: 2,
      })
      const page = await context.newPage()
      const scenario = buildScenario(locale)
      await page.addInitScript(initMockScript, scenario)
      await captureForLocale(page, locale)
      await context.close()
    }
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
