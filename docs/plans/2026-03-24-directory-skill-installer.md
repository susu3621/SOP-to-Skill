# Directory Skill Installer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前基于 `template.yaml` 的单文件渲染安装方式，补充为“`SKILL.md + scripts/` 目录包复制安装”的最小实现，优先支持 `jira` 这类脚本型 skill。

**Architecture:** 保留现有桌面配置器的 skill 列表与安装入口，但新增一种从 `SKILL.md` 发现 skill 的路径。安装目录包 skill 时，递归复制整个目录到目标底座目录，然后只对复制后的 `SKILL.md` 做占位符替换，例如 `{{skill_dir}}` 和 `{{script_dir}}`。

**Tech Stack:** Rust, Tauri, serde_yaml, Handlebars, React

---

### Task 1: Add Failing Tests For Package Skill Discovery And Install

**Files:**
- Modify: `src-tauri/src/template/loader.rs`
- Modify: `src-tauri/src/template/renderer.rs`
- Test: `src-tauri/src/template/loader.rs`
- Test: `src-tauri/src/template/renderer.rs`

- [ ] **Step 1: Write the failing tests**
- [ ] **Step 2: Run Rust tests to verify package-skill cases fail**
- [ ] **Step 3: Implement the smallest loader/renderer changes to support package skills**
- [ ] **Step 4: Re-run Rust tests to verify they pass**

### Task 2: Install And Uninstall Directory Skills

**Files:**
- Modify: `src-tauri/src/models/skill.rs`
- Modify: `src-tauri/src/commands/skill.rs`
- Modify: `src-tauri/src/template/renderer.rs`
- Test: `src-tauri/src/commands/skill.rs`

- [ ] **Step 1: Write the failing install/uninstall tests**
- [ ] **Step 2: Run Rust tests to verify install/uninstall behavior fails**
- [ ] **Step 3: Implement directory copy install, placeholder rendering, and directory cleanup**
- [ ] **Step 4: Re-run Rust tests to verify they pass**

### Task 3: Migrate Jira To A Single Templated SKILL.md

**Files:**
- Modify: `skills/jira/SKILL.md`
- Optional Modify: `skills/jira/README.md`
- Optional Modify: `skills/jira/INSTALLATION.md`
- Optional Modify: `skills/jira/QUICK_REFERENCE.md`

- [ ] **Step 1: Replace hard-coded platform-specific script paths with package placeholders**
- [ ] **Step 2: Keep command examples aligned with installed directory layout**
- [ ] **Step 3: Verify no stale `REPO_ROOT` or `~/.claude` references remain in the installed skill guide**

### Task 4: Verify End-To-End Behavior

**Files:**
- Modify: `src/App.tsx`
- Test: `npm run test`
- Test: `cargo test`

- [ ] **Step 1: Adjust UI copy only if the new package model makes current wording inaccurate**
- [ ] **Step 2: Run `cargo test` from `src-tauri`**
- [ ] **Step 3: Run `npm run test` from the repo root**
- [ ] **Step 4: Report actual verification status, including any remaining gaps**
