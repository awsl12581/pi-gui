# 废弃设计与无调用代码清理

> 最后修改时间：2026-10-18 20:18 CST
> 文档版本：v4
> 修改说明：归档已完成清理的历史范围和验证结果，补充后续状态入口。

本文归档为十月十四日清理快照。删除范围和当时 Windows 检查结果保留，不作为当前失败清单；当前行为见[架构](../architecture.md)，后续整改见[整改状态](test-failure-remediation-plan.md)。

## 完成范围

依据根级 AGENTS.md v3，只维护当前 pi-gui 格式。旧格式不做转换；文件本身保留。当前格式的校验、首次启动、原子写入、备份恢复、损坏保护和 Pi 原生会话集成仍保留。

| 已删除的兼容路径                                 | 当前行为                                                             |
| ------------------------------------------------ | -------------------------------------------------------------------- |
| UI-state 无版本及 v2–v18 读取                    | 只接受 v19；首次启动无文件仍可进入应用。                             |
| v18 缺失 Changes scope 补齐                      | 模板解码要求显式 scope。                                             |
| 退役 Worktrees 工具过滤和选择修复                | 只接受当前工具类型；新线程仍可选择 Local 或 Worktree。               |
| 内联附件、transcripts 解码和启动迁移             | 附件由独立 AttachmentStore 管理。                                    |
| pre-workbench 迁移副本及 preserveExistingAs 回调 | 保留当前原子写入、.bak 和 .corrupt 保护，不删除已有迁移副本。        |
| catalog v1 默认集合和升级                        | 只接受 v2；旧格式拒绝且不覆盖。                                      |
| 共享 ~/.pi/worktrees 根目录识别                  | 仅当前 profile 的 worktrees 根属于应用管理范围；现有旧目录不被删除。 |
| 无 token 租约的 pid/hostname 身份回退            | 当前租约要求 token；无 token 文件报错并保留，不当作可抢占租约。      |
| fork 的 userMessageIndex 回退                    | 使用 sourceMessageId 或 sourceMessageIndex；保留现行消息 fork。      |

## 无产品调用代码

删除旧 Git diff 实现及完整自有链路：getChangedFiles、getFileDiff、stageFile 的 contracts、preload、IPC、main 注入和专属测试。产品继续使用 [Review adapter](../../apps/desktop/electron/platform/files/git-review.ts)；该路径已有重命名、特殊路径和暂存操作测试。

删除 cloneTranscriptMessage、resolveModelSettingsOwnerId、commandUnsupportedCapabilityMessage、pruneFiles、leaseBlocksBinding，以及 BrowserPreviewIcon、MaximizeIcon、MinimizeIcon、PiGlyphIcon、GripIcon。删除只有测试调用的 validateDesktopExtensionSource 和 rendererBoundaryCopy 包装；相关测试改为直接覆盖现行验证函数和 startupSurfaceCopy。

旧格式迁移专属测试随实现删除。当前 malformed layout、附件损坏、scope 校验、备份恢复、租约并发和 context-edit 回归仍保留。新增或调整的拒绝用例确认不支持的 UI-state、catalog 和租约不会被覆盖。

## 设计和文档

[架构](../architecture.md)和 [Workbench 设计](../workspace-redesign-plan.md)同步当前格式、Review 路径和新线程 Worktree 入口，不再把旧布局迁移或 Worktrees 工具页作为当前实现。

删除 plans/pi-app-mvp/plan.md 和 plans/phase-1-codex-parity/plan.md：单活动会话、尚无 slash/图片/模型设置等阶段假设已过时；未来 pi-ws-driver 未实施。没有删除对应的历史日志、截图、验证报告或实验结果。旧 picker、终端抽屉、blocks-first 方案、路径级 Reviewed 和 AppStoreInternals 已无独立产品实现；历史验证记录和防止重新引入的 guard 保留。

当前 Pi 私有接口适配、原生 transcript 回退、terminal-only 诊断和实际依赖未删除。它们有调用者，属于当前集成要求。Pi/Chord 0.87.1 的历史验证仍作为历史证据；当前 package manifests 为 ^1.0.0。

## 验证

使用 Windows 和现有 Node 24，未升级系统或依赖。临时 Electron 构建输出到 apps/desktop/.artifacts/cleanup-verification，与正式 out 分离。Playwright 每次写入独立目录；操作方法见 [隔离验证指南](../guides/isolated-desktop-verification.md)。

| 检查                               | 结果与日志                                                                                                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| lint、全工作区 typecheck、架构检查 | 通过；.artifacts/cleanup-lint.log、cleanup-typecheck.log、cleanup-architecture.log。                                                                                                |
| 隔离 Electron build                | 通过；.artifacts/cleanup-build.log。                                                                                                                                                |
| Pi SDK driver                      | 163 项通过；.artifacts/cleanup-driver.log。                                                                                                                                         |
| catalog 当前格式与拒绝保护         | 26 项通过；.artifacts/cleanup-catalog-codec.log。                                                                                                                                   |
| Workbench 当前格式与损坏隔离       | 17 项通过；.artifacts/cleanup-persistence-unit.log。                                                                                                                                |
| catalog 全套                       | 27 通过、1 失败；并发 rename 出现 EPERM，.artifacts/cleanup-catalogs.log。                                                                                                          |
| desktop unit 全套                  | 305 通过、16 失败、2 跳过；.artifacts/cleanup-unit.log。失败涉及 Windows 非法文件名、symlink 权限、文件锁、Git 内容或模式预期。Review/checkpoint 实现未在本次修改。                 |
| test:baseline                      | 在 guards 停止，75 通过、39 失败；Windows 路径分隔符、诊断路径和 test discovery 预期失败，.artifacts/cleanup-baseline.log。                                                         |
| pnpm check                         | format:check 先停止；670 个未编辑文件已有格式问题。未全仓重排格式。                                                                                                                 |
| Electron Core                      | 首轮 30 通过、5 失败；.artifacts/cleanup-core.log。其中一项残留 Worktrees 兼容 fixture 已删除并定向复验；另有 Windows 路径选择器、两项 POSIX shell 命令和大列表 Diff 未显示的失败。 |

当前格式与 IPC 的最终定向单测 44 项通过（.artifacts/cleanup-current-unit.log）；最终独立构建通过（.artifacts/cleanup-build-final-desktop.log）。最终 Electron 定向复验 3 项全部通过：损坏 UI-state 的备份恢复、无效/孤立布局隔离、Worktree 创建和回收的 profile 隔离（.artifacts/cleanup-final-core-desktop.log）。

最终复验曾因临时构建放在仓库根目录而无法解析桌面依赖，已停止；该次输出保留于 .artifacts/cleanup-final-core.log。改为桌面目录内独立输出后才得到上述 3 项通过结果，未复用失败构建。

这些结果不证明真实 provider、原生系统操作或安装包。未为获得绿色结果跳过失败测试、增大超时或修改无关平台实现。

## 版本修改记录

| 版本 | 修改时间             | 修改内容                                                                                                   |
| ---- | -------------------- | ---------------------------------------------------------------------------------------------------------- |
| v1   | 2026-10-14 16:28 CST | 首次记录九组无产品调用代码、六项已替代设计、过时文档和仍需保留的兼容场景。                                 |
| v2   | 2026-10-14 16:37 CST | 按 AGENTS.md v3 修正旧数据兼容保留结论，新增八组旧数据兼容清理项和旧 fork 参数回退，明确当前数据保护边界。 |
| v3   | 2026-10-14 17:11 CST | 完成兼容层、无调用链路和过时阶段计划清理，记录保留边界和实际检查证据。                                     |
| v4   | 2026-10-18 20:18 CST | 归档已完成清理的历史范围和验证结果，补充后续状态入口。                                                     |
