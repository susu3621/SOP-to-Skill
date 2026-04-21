# 文档模板基础技能设计

## 背景

当前仓库已经支持：

- 通过 onboarding 选择岗位、基础技能和预置业务 SOP
- 为业务用例生成 `SKILL.md`
- 通过预置结构化问题收集业务输入

但现有“模板”能力仍停留在文本说明层。像 `8D报告出具`、`ISO9001资料包出具` 这类场景，虽然已经有“内置模板”语义和“用户模板覆盖”语义，但系统并没有提供一个可复用的技术基础技能，用来把：

- `.docx` 模板
- AI 输出的结构化内容（JSON）

稳定地转换为：

- `.docx` 文档
- 可选 `.pdf` 文档

同时，当前也缺少一个可脚本化的校验入口，用来验证模板与结构化内容是否匹配，以及是否能够成功渲染输出。

## 目标

新增一个全局基础技能“文档模板”，并在 onboarding 中默认选中，使预置 SOP 和后续业务技能可以统一复用该能力。

本次设计的最小闭环是：

1. 新增一个基础技能目录 `skills/document-template/`
2. 集成 `docxtemplater`，支持“模板 + JSON -> docx”
3. 支持可选的 `docx -> pdf` 后处理
4. 提供独立校验脚本，验证模板变量覆盖和渲染成功性
5. 将该技能加入技能清单，并作为 onboarding 默认选中的基础技能
6. 为 `8D报告出具` 等业务技能建立统一的调用目标：业务技能负责生成结构化 JSON，文档模板技能负责产出正式文档

## 非目标

本次不做以下内容：

- 不做模板字段和最终文档内容位置的语义级比对
- 不做“期望文档 vs 实际文档”的回归对比基线
- 不做富文本、图片、图表等 `docxtemplater` 付费模块能力
- 不把文档渲染主逻辑搬到 Rust/Tauri 侧
- 不强制所有预置 SOP 在本次都补齐实际 `.docx` 模板文件

## 外部依赖约束

依据官方资料：

- `docxtemplater` 适合做“模板 + JSON -> docx”
- 官方 CLI 语法为 `docxtemplater input.docx data.json output.docx`
- `docxtemplater` 本身不负责 PDF 渲染；官方 FAQ 推荐使用 `libreoffice --headless --convert-to pdf`

参考：

- https://docxtemplater.com/
- https://docxtemplater.com/docs/cli/
- https://docxtemplater.com/docs/faq/
- https://github.com/open-xml-templating/docxtemplater

因此本次方案采用：

- Node 脚本负责 `.docx` 模板渲染
- `pdf` 作为可选后处理，依赖本机 LibreOffice

## 用户可见变化

### 1. 新增基础技能

新增基础技能：

- 标识：`document-template`
- 中文名：`文档模板`
- 英文名：`Document Template`

定位：

- 接收 `.docx` 模板与 JSON 数据
- 生成 `.docx`
- 按需生成 `.pdf`
- 提供模板校验能力

### 2. Onboarding 默认选中

`document-template` 为全局基础技能：

- 出现在基础技能列表中
- 新用户初始状态默认选中
- 脚本侧默认配置也默认选中

### 3. 业务技能调用约定

像 `8D报告出具`、`ISO9001资料包出具` 这类业务技能后续统一遵循：

- 业务技能负责从原始资料中组织结构化 JSON
- 文档模板基础技能负责把 JSON 套入模板并导出文档

这意味着“模板生成能力”从业务技能中抽离，成为横向复用的技术基础设施。

## 架构设计

### 总体分层

分成四层：

1. 配置层  
   `src/shared/config.json`、`skills/manifest.json`、前端 onboarding 默认值

2. 技能层  
   `skills/document-template/` 目录，承载最终可安装技能、脚本、说明文档、模板样例

3. 渲染层  
   Node 脚本集成 `docxtemplater` 和 `pizzip`，负责 docx 渲染；可选调用 LibreOffice 转 pdf

4. 校验层  
   独立 Node 脚本负责变量提取、输入覆盖校验、试渲染、可选 pdf 转换校验，并输出机器可读结果

### 为什么不放到 Rust/Tauri

当前技能生态以：

- `skills/*`
- `scripts/*`
- npm / Node

为主，而 `docxtemplater` 也天然属于 Node 生态。把渲染能力放在技能脚本里，可以让：

- WorkBuddy / Codex / Claude Code 共享同一组脚本
- 业务技能通过命令直接复用
- 维护边界更清晰

如果放进 Rust/Tauri，会让桌面端内聚更高，但对“技能可调用”这一核心目标帮助有限，反而增加跨语言维护成本。

## 技能目录设计

新增目录：

`skills/document-template/`

建议结构：

```text
skills/document-template/
├── SKILL.md
├── README.md
├── package.json
├── scripts/
│   ├── render_doc_template.js
│   ├── validate_doc_template.js
│   └── lib/
│       ├── render.js
│       ├── inspect.js
│       └── pdf.js
├── templates/
│   ├── 8d-report.docx
│   └── iso9001-package.docx
└── examples/
    ├── 8d-report.sample.json
    └── iso9001-package.sample.json
```

说明：

- `SKILL.md` 面向 AI 工具安装后的实际调用说明
- `README.md` 面向仓库开发者和模板维护者
- `templates/` 放预置模板
- `examples/` 放 JSON 示例
- `scripts/lib/` 放脚本共用逻辑，避免入口脚本膨胀

## 脚本职责

### 1. `render_doc_template.js`

输入参数：

- `--template <path>`
- `--data <path>`
- `--output <path>`
- `--format <docx|pdf>`，默认 `docx`
- `--keep-docx`，当输出 `pdf` 时可选保留中间 `docx`

行为：

1. 读取模板 `.docx`
2. 读取 JSON 数据
3. 使用 `docxtemplater` 渲染出 `.docx`
4. 若 `format=pdf`，调用 LibreOffice 转换
5. 输出最终文件路径和执行结果

返回约定：

- 成功：退出码 `0`
- 失败：非 `0`
- 标准输出可打印 JSON，包含 `success`、`docxPath`、`pdfPath`

### 2. `validate_doc_template.js`

输入参数：

- `--template <path>`
- `--data <path>`
- `--format <docx|pdf>`，默认 `docx`

校验目标只覆盖 A 类需求：

- 模板变量是否都有对应数据
- 模板能否成功渲染
- 如果要求 pdf，转换链路是否可用且成功

行为：

1. 使用模板检查能力提取标签
2. 基于 JSON 判断缺失字段
3. 试渲染到临时目录
4. 若要求 `pdf`，试执行转换
5. 输出 JSON 报告

返回 JSON 建议包含：

- `success`
- `templatePath`
- `dataPath`
- `requestedFormat`
- `missingTags`
- `renderedDocx`
- `renderedPdf`
- `warnings`
- `errors`

退出语义：

- 没有缺失字段且渲染成功：退出码 `0`
- 有缺失字段、渲染失败、pdf 转换失败：退出码 `1`

## 数据约定

### 输入数据格式

渲染输入为标准 JSON 文件。

首版支持：

- 基础标量：字符串、数字、布尔值
- 对象嵌套
- 数组循环

不额外发明业务专用 DSL。

这意味着：

- 8D 报告可以先产出一个结构化 JSON
- 模板用 `{field}`、`{#items}` 等原生 `docxtemplater` 语法消费这些字段

### 模板与业务技能的衔接

业务技能不直接产出最终 Word 文档，而是产出与模板字段对齐的 JSON。

例如 `8D报告出具` 后续可约定输出：

```json
{
  "report_no": "8D-2026-001",
  "customer": "某客户",
  "team": [
    { "name": "张三", "role": "质量" },
    { "name": "李四", "role": "工艺" }
  ],
  "d1_team": "跨部门小组已成立",
  "d2_problem": "客户端发现批次异常",
  "d3_containment": "已隔离库存"
}
```

模板负责决定最终展示格式。

## 预置 SOP 模板接入策略

### 首批接入范围

优先支持已有“模板覆盖”语义最明确的质量类预置 SOP：

- `8D报告出具`
- `ISO9001资料包出具`

后续可扩展到：

- `客诉售后问题分析与回复草稿`
- `项目周报`

### 覆盖优先级

模板来源优先级：

1. 用户指定模板
2. 仓库预置模板
3. 现有文本模板 fallback

这样做的目的是：

- 不阻断现有业务技能
- 允许逐步把“文字模板”升级成“真实 `.docx` 模板”

## Onboarding 与配置改动

### 1. 共享配置

在 `src/shared/config.json` 的 `baseSkills` 中新增 `document-template`。

该技能默认不需要凭证字段。

### 2. 默认选中

在以下两个入口同时加默认值：

- `src/shared/config.json` 的 `testDefaults.baseSkills`
- 前后端 onboarding 初始状态/默认选择逻辑

要求：

- 新状态默认包含 `document-template`
- 老状态如果本地已有保存值，不强制覆盖用户已有选择
- 对于“从未初始化过基础技能”的旧状态，自动补入 `document-template`

### 3. 技能清单

在 `skills/manifest.json` 中登记新技能，并补全版本、targets、contentHash。

## 错误处理

### 渲染失败

常见错误：

- 模板文件不存在
- JSON 解析失败
- 模板标签缺失数据
- 模板语法错误
- 输出目录不可写

要求：

- 错误信息应直接指向模板、数据文件或缺失字段
- 校验脚本和渲染脚本都返回可读 JSON，避免只输出堆栈

### PDF 失败

常见错误：

- 未安装 LibreOffice
- `soffice/libreoffice` 不在 PATH
- 转换命令返回非零

策略：

- `docx` 渲染成功但 `pdf` 失败时，明确区分“渲染成功”和“pdf 转换失败”
- 不把 pdf 失败伪装成模板失败

## 测试策略

### 前端/配置测试

验证：

- 新基础技能出现在配置与 UI 列表中
- 默认基础技能包含 `document-template`
- 默认安装预览会把该技能纳入候选集

### 脚本测试

验证：

- `render_doc_template.js` 能从样例模板与样例 JSON 生成 `docx`
- 缺失字段时返回失败
- `validate_doc_template.js` 能正确报告 `missingTags`
- 要求 `pdf` 时，在缺少 LibreOffice 的环境中给出清晰错误

### 仓库契约测试

验证：

- `skills/manifest.json` 包含 `document-template`
- 技能文档包含环境要求、pdf 转换依赖说明、示例命令

## 兼容性与迁移

### 向后兼容

本次改动不移除旧的文本模板表达能力。

即使某个业务技能尚未接入实际 `.docx` 模板，也仍可：

- 保持当前 `SKILL.md` 生成
- 保留现有默认描述里的 built-in template fallback

### 迁移路径

建议后续逐个业务技能迁移：

1. 先定义 JSON 结构
2. 再补 `.docx` 模板
3. 最后在业务技能里增加“调用文档模板基础技能”的说明

## 实施顺序

建议按以下顺序实现：

1. 新增 `document-template` 技能目录与最小脚本骨架
2. 先写脚本测试，再实现 `docx` 渲染
3. 增加模板校验脚本
4. 增加可选 `pdf` 转换
5. 把技能接入 `skills/manifest.json`
6. 把技能接入 `src/shared/config.json`
7. 补齐 onboarding 默认选中逻辑和测试
8. 增加首批模板样例与示例 JSON

## 风险与权衡

### 1. PDF 渲染并非 `docxtemplater` 原生能力

这是已知外部约束。首版通过 LibreOffice 解决，优点是免费、可本地执行；缺点是版式与 Word 不一定完全一致。

### 2. 模板字段抽取依赖 `docxtemplater` 检查能力

这能满足“字段是否齐全”的校验目标，但不等于文档业务语义正确。

### 3. 预置 SOP 全量补模板会扩大范围

因此本次只先建立技术底座和首批样例，不要求所有业务技能一次性完成迁移。

## 预期结果

完成后，仓库会具备一个真正可复用的技术基础技能：

- onboarding 中可见、默认选中
- 可被 8D 报告等业务技能调用
- 能把 `.docx` 模板与 JSON 组合成正式文档
- 能通过脚本自动验证模板与输入是否匹配

这将把当前“只有文字模板语义”的预置 SOP，升级为“可生成正式文档”的业务能力底座。
