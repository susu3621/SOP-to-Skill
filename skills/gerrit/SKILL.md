---
name: Gerrit
description: Gerrit 代码审查工作流 — 提交评审、修改补丁、解决冲突、合入代码
---
# Gerrit

Gerrit 代码审查系统的工作流指南。团队使用 Gerrit 管理所有代码变更，**禁止直接 push 到 master**，所有变更必须通过 review 流程。

## 核心规则

> **绝对不要** 执行 `git push origin master`。所有变更必须提交到 `refs/for/master` 进入评审流程。

## 提交评审（最常用）

```bash
# 提交当前 HEAD 到 Gerrit 评审
git push origin HEAD:refs/for/master
```

这会在 Gerrit 上创建一个 Change，等待审查和合入。

## 完整工作流

### 1. 创建变更

```bash
# 确保在最新的 master 上开始工作
git fetch origin
git checkout -b my-feature origin/master

# 编辑文件，然后提交
git add .
git commit -m "简要描述变更内容"

# 推送到 Gerrit 评审
git push origin HEAD:refs/for/master
```

### 2. 修改已提交的变更（Amend）

Gerrit 通过 commit message 中的 `Change-Id` 来跟踪变更。修改后重新 push 会更新同一个 Change（而不是创建新的）。

```bash
# 修改文件后，追加到上一次提交
git add .
git commit --amend --no-edit

# 重新推送（Gerrit 通过 Change-Id 识别为同一变更）
git push origin HEAD:refs/for/master
```

> **重要**: `--amend` 只修改最后一次提交。commit message 中的 `Change-Id: Ixxxxxxxx` 行不要删除，它是 Gerrit 跟踪变更的依据。

### 3. Rebase 到最新 master

当 master 有新的提交，需要 rebase 后再 push：

```bash
# 获取最新代码
git fetch origin

# Rebase 到最新 master
git rebase origin/master

# 解决冲突（如有）后继续
# git add <resolved-files>
# git rebase --continue

# 重新推送
git push origin HEAD:refs/for/master
```

### 4. 使用 Topic 分组关联变更

多个相关的 Change 可以用 topic 分组：

```bash
# 推送时指定 topic
git push origin HEAD:refs/for/master%topic=my-feature-name
```

### 5. 给 Change 打 `Code-Review +2`

`Code-Review +2` 通常表示“审查通过，可以合并”。只有具备对应 Gerrit 权限的用户或自动化账号才能执行；如果账号没有 `+2` 权限，Gerrit 会直接拒绝。

做法为
```bash
# SSH: 给单个 Change 对应的 commit 打 +2
ssh -p 29418 juns@gerrit.junslan.com gerrit review \
  --project <project-name> \
  --code-review +2 \
  <commit-sha>
```

```bash
# SSH: 给当前分支相对 master 的所有新增提交统一打 +2
ssh -p 29418 juns@gerrit.junslan.com gerrit review \
  --project <project-name> \
  --code-review +2 \
  $(git rev-list --reverse origin/master..HEAD)
```

- `gerrit review` 传参既可以是 commit SHA，也可以是 `CHANGE_NUMBER,PATCHSET`
- 将 `<project-name>` 替换成实际 Gerrit project 名称；如果当前命令上下文已能唯一确定项目，也可以按团队习惯省略 `--project`
- 如果 Gerrit 返回权限不足、label 不允许设置或 reviewer 规则限制，说明当前账号不能打 `+2`，此时必须停止并改由有权限的 reviewer 处理
- `Code-Review +2` 只表示审查标签已满足；是否能真正合并，还要继续检查 `Verified` 等其他 submit rule
- 自动化场景下，如果目标就是“让 AI 自己补 `+2` 再合并”，优先走 SSH 命令，而不是只停留在提示“需要 +2”

### 6. 合并 Gerrit 上的提交（Submit）

当 Change 已满足当前仓库的 submit rule 时，可直接在 Gerrit 上触发合并。对于需要人工审查放行的仓库，`Code-Review +2` 通常是 submit 的显式前置条件；如果还没有拿到 `+2`，Gerrit 往往会返回 `submit requirement 'Code-Review' is unsatisfied`，此时必须先补齐 `+2` 再继续。优先使用 SSH 命令，适合脚本化场景：

```bash
# 合并当前分支相对 master 的所有待合并提交
ssh -p 29418 juns@gerrit.junslan.com gerrit review \
  --project <project-name> \
  --branch master \
  --submit \
  $(git rev-list --reverse origin/master..HEAD)
```

```bash
# 自动化推荐顺序：先补 +2，再 submit
COMMITS=$(git rev-list --reverse origin/master..HEAD)
ssh -p 29418 juns@gerrit.junslan.com gerrit review \
  --project <project-name> \
  --code-review +2 \
  $COMMITS
ssh -p 29418 juns@gerrit.junslan.com gerrit review \
  --project <project-name> \
  --branch master \
  --submit \
  $COMMITS
```

- `gerrit review --submit` 支持直接传 commit SHA，也支持 `CHANGE_NUMBER,PATCHSET`
- 如果 submit 前发现还缺少 `Code-Review +2`，并且当前账号具备权限，应先执行上一步的 `--code-review +2`，然后再继续 `--submit`
- submit 前先确认对应 Change 已拿到仓库要求的标签；本仓库如提示 `Code-Review` 未满足，通常就表示还缺少 `Code-Review +2`
- 如果 Gerrit 返回 `blocked by ...`、`409 Conflict` 或 `submit requirement 'Code-Review' is unsatisfied`，说明该 Change 还不满足 submit rule，不能强行合并
- 自动化系统若已有 HTTP 认证，也可调用 `POST /a/changes/<Change-Id>/submit`

## Change-Id 说明

Gerrit 使用 commit message 末尾的 `Change-Id` 行来识别变更：

```
实现新功能 XXX

详细说明...

Change-Id: I1234567890abcdef1234567890abcdef12345678
```

- **首次提交**：如果安装了 Gerrit 的 `commit-msg` hook，会自动生成 `Change-Id`
- **修改提交**：`git commit --amend` 保留原有 `Change-Id`，Gerrit 会将其识别为同一个 Change 的新 Patch Set
- **新 Change**：删除 `Change-Id` 行后提交会创建一个全新的 Change

### 安装 commit-msg hook

如果项目没有自动生成 `Change-Id`，需要安装 hook：

```bash
# 在项目根目录执行（根据实际 Gerrit 地址调整）
scp -p -P 29418 juns@gerrit.junslan.com:hooks/commit-msg .git/hooks/
chmod +x .git/hooks/commit-msg
```

## 常见问题处理

### Push 被拒绝："missing Change-Id"

```bash
# 补充 Change-Id：amend 提交触发 hook 自动生成
git commit --amend --no-edit
git push origin HEAD:refs/for/master
```

### Push 被拒绝："no new changes"

说明该 Change 已经在 Gerrit 上了（相同 Change-Id + 相同内容）。需要有实际修改后再 push。

### 想放弃本地变更，重新开始

```bash
git fetch origin
git reset --hard origin/master
```

## 注意事项

- 每次 `git push origin HEAD:refs/for/master` 推送的是 **单个 commit**。如果有多个 commit，每个都会创建一个独立的 Change
- 建议保持 **一个 feature 一个 commit** 的习惯，通过 `--amend` 持续更新
- 需要合并时，应在 Gerrit 上执行 submit；本地不需要手动 merge 到 `master`
