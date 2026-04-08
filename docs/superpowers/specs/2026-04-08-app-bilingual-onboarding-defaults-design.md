# App Bilingual Onboarding Defaults Design

## Goal

完成三项改造：

1. 把默认用例中展示给用户的默认信息从代码写死改成配置驱动。
2. 默认不选任何岗位，因此初始状态不展示任何岗位用例默认内容。
3. 让整个应用界面支持中英文双语，并在中英文 README 中增加应用截图。

## Current State

当前仓库已经有一层基础的 locale 类型和 `preferred_locale` 持久化能力，但应用主要界面仍以中文硬编码为主，尤其是 onboarding 流程。

默认用例内容目前分散在两层：

- `src/shared/config.json` 提供用例元信息和部分 prompt 文案。
- `src/content/workbuddy.ts` 的 `buildDefaultUseCaseDescription()` 会把 `description`、`guidance`、`descriptionPrompt` 重新拼接成最终默认展示文本。

默认岗位目前通过 `defaultOnboardingRoleId` 固定为 `project-manager`，因此首次打开 onboarding 就会自动生成一组项目经理默认用例内容。

README 当前只有中英文文本内容，没有直接展示应用界面的截图。

## Requirements

### 1. 默认用例内容改成配置驱动

用户在“选择工作”后看到的默认内容应直接来源于配置，而不是由代码把多个字段重新拼接。

这次要覆盖三类默认内容：

- 用例描述默认值
- 信息来源默认值
- 当前流程 / SOP / 模板默认值

代码层应只负责：

- 根据当前选中的岗位筛选适用用例
- 读取并回填对应默认值
- 保留用户已修改过的内容

不再在 `workbuddy.ts` 中硬编码默认描述拼接规则。

### 2. 默认不选岗位

首次进入 onboarding 时：

- `selected_role_id` 为空
- `role_use_case_contents` 为空
- 用例配置页不展示任何用例卡片
- 首页“已设置内容”里不出现默认岗位或默认用例

只有用户明确选择岗位后，才生成该岗位对应的默认用例内容。

### 3. 全应用双语

整个应用界面都需要支持 `zh-CN` 和 `en-US`。

范围包括：

- App shell 导航和标题
- onboarding 首页、三个模块页、空状态、按钮、摘要区
- 选择岗位 / 选择工作 / 安装步骤中的所有静态文案
- 基础工具、岗位、用例名称与描述
- 所有步骤标签、字段标签、提示文案、按钮文字、状态标识

语言切换应复用现有 `preferred_locale` 配置存储。

### 4. README 增加截图

- `README.md` 使用英文说明并展示英文界面截图
- `README_CN.md` 使用中文说明并展示中文界面截图
- 截图应来自真实应用，而不是占位图或手绘 mock

## Recommended Approach

### A. 把共享配置升级为本地化配置源

`src/shared/config.json` 从“纯中文配置”升级为“可本地化配置”。

关键字段从单字符串改为本地化对象：

- `name`
- `description`
- `guidance`
- `descriptionPrompt`
- `infoSourcesPrompt`
- `rulesPrompt`

同时新增三个真正用于 UI 默认填充的字段：

- `defaultDescription`
- `defaultInfoSources`
- `defaultRules`

这样可以把“显示给用户的默认值”和“解释这个用例是什么”分开管理，避免再由代码拼接。

### B. 让 onboarding state 支持空岗位

`selected_role_id` 从“总有一个合法 role id”改成“可以为空字符串”。

配套调整：

- `createEmptyState()` 返回空岗位和空用例
- `normalizeState()` 不再强行回退到默认岗位
- 只有在 `selectRole()` 或从已保存状态恢复时才生成岗位用例
- 所有依赖当前岗位的计算逻辑都要接受空值

### C. 为 onboarding 建立独立双语文案层

把 `OnboardingShell.tsx` 及其步骤组件里目前的硬编码中文，统一提取到专门的 onboarding copy 模块。

文案层负责：

- 模块标题
- 空状态
- 按钮文案
- 表头
- 状态标签
- 说明文案

数据层负责：

- 岗位、工具、用例的本地化名称和描述
- 各类默认内容

UI 组件只通过 `locale` + `getCopy()` / `getText()` 读取文本，不再写死中文。

### D. 截图作为静态资源纳入仓库

新增固定截图目录，例如：

- `docs/images/app-home-zh.png`
- `docs/images/app-home-en.png`
- `docs/images/app-onboarding-zh.png`
- `docs/images/app-onboarding-en.png`
- `docs/images/app-install-zh.png`
- `docs/images/app-install-en.png`

README 直接引用这些仓库内资源，保证 GitHub 页面稳定显示。

## File-Level Design

### `src/shared/config.json`

职责：

- 成为 onboarding 业务数据和默认内容的单一配置源
- 为岗位、基础工具、用例提供双语名称和描述
- 为默认填充值提供双语默认内容

需要改造的结构：

- `agentApps`
- `roles`
- `baseSkills`
- `useCases`

### `src/content/workbuddy.ts`

职责变化：

- 从共享配置中读取双语业务数据
- 去掉默认描述拼接逻辑
- 根据 `locale` 或本地化字段返回展示文本

需要移除或收敛的逻辑：

- `buildDefaultUseCaseDescription()`
- `defaultOnboardingRoleId`
- 基于固定中文字符串构建 option 的逻辑

### `src/features/onboarding/useOnboarding.ts`

职责变化：

- onboarding 默认 state 改为空岗位
- 允许空岗位的归一化、dirty/completion 计算和保存逻辑
- 选择岗位后再生成默认用例

重点风险点：

- 现有 completion 判断不能因为空岗位而误判为已完成
- 安装候选 skill 生成逻辑要在无岗位时返回空
- 保存和恢复历史配置时要兼容旧数据中已有岗位值

### `src/features/onboarding/OnboardingShell.tsx` 及 `steps/*`

职责变化：

- 所有静态 UI 文案改由本地化 copy 提供
- 在未选择岗位时展示明确的空状态提示
- 首页摘要区在没有岗位时只显示“未设置”

### `src/App.tsx`

职责变化：

- 使用真正可切换的 locale，而不是固定 `const locale = 'zh-CN'`
- 把 onboarding 子树的 locale 统一传下去
- 提供清晰的语言切换入口，并和现有 `preferred_locale` 存储联动

### `README.md` / `README_CN.md`

职责变化：

- 增加真实应用截图
- 英文 README 展示英文界面截图
- 中文 README 展示中文界面截图

## Behavior Details

### 首次打开应用

- 默认语言仍为 `zh-CN`
- 如果本地配置里已有 `preferred_locale`，则优先使用保存值
- onboarding 不默认选岗位
- 用例配置区域显示“先选择岗位”的空状态

### 用户选择岗位后

- 立即按该岗位的配置生成默认用例记录
- 默认填充值直接取 `config.json` 中对应用例的默认字段
- 用户后续编辑内容不会被再次自动覆盖

### 用户切换语言后

- UI 静态文案即时切换
- 岗位名、工具名、用例名、提示文案即时切换
- 已有用户输入内容不做自动翻译
- 默认值只影响首次生成或尚未填写的项，不强制覆盖已编辑文本

## Testing Strategy

需要覆盖三类测试：

### 1. 配置与默认值

- `workbuddy` 内容层测试验证默认内容来自配置字段，而不是代码拼接
- 验证未选岗位时默认用例列表为空
- 验证选择岗位后才生成对应用例

### 2. Onboarding 交互

- `OnboardingShell` 测试验证默认不选岗位
- 验证无岗位时显示空状态，不显示任何默认用例
- 验证切换语言后主要界面文案变化正确

### 3. 应用级双语

- `App` 测试验证 locale 切换会影响导航、标题和 onboarding 文案
- 验证 `preferred_locale` 会被读取和持久化

README 截图本身不需要自动化测试，但路径应纳入 README diff 检查。

## Risks

### 1. 配置结构改动面大

`config.json` 从单语言变为双语言后，依赖它的读取逻辑会受到广泛影响，需要集中改一轮类型定义和读取代码。

### 2. 旧状态兼容

之前保存的数据里 `selected_role_id` 一定非空。改成允许空值后，归一化逻辑必须兼容旧存量配置，不应破坏已有用户数据。

### 3. 双语与用户输入混合

默认值和说明文案可以双语，但用户手工填写的内容是自由文本，切换语言时不能尝试自动翻译，否则会造成数据污染。

## Out of Scope

这轮不包含：

- 自动翻译用户输入内容
- 新增第三种语言
- 重做整体视觉设计
- 改动 GitHub Pages 或 release 流程
