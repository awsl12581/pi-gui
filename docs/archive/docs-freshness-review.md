# docs 文档时效性审查

> 最后修改时间：2026-10-18 20:18 CST
> 文档版本：v2
> 修改说明：归档更新前时效性审查，记录建议已处理并保留原始判断。

本文为更新前的审查快照，所列更新建议已在本轮文档整理中处理，不能继续作为未完成任务清单。六份文档中，五份当前说明已更新，整改方案已补状态并归档；历史报告及拆出的阶段材料见[归档索引](README.md)。下文保留原审查范围和判断。

## 范围与判断标准

审查基线为当前工作区，HEAD 为 `8a78b0e`。审查前已有的 `plans/sidebar-unseen-notification-consistency/plan.md` 删除状态未改动。本次检查 docs 中原有的全部 14 份 Markdown，结合当前源码、package scripts、CI workflow 和已有运行记录判断；没有重新运行产品测试，也没有查询线上分支保护状态。

成功标准是每项过时判断都能指出文档陈述及当前反证。日期较早、缺少元数据或目录分类不合规，本身不构成内容过时。明确限定版本、日期和平台的验证结果仍是历史证据，不能因后来代码变化而改写为无效结果。

## 需要更新的 6 份文档

| 文档                                                           | 过时内容与原因                                                                                                                                                                                                                                     | 当前核验依据                                                                                                                                                                                                                                                                                                                                                                                                     | 建议                                                                                                                                                |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Chord 桌面扩展设计](../chord-desktop-extension-design.md)     | 开头仍写 Pi/Chord 0.87.0；作者契约仍要求 `env.replicatedState`，已不适合指导当前扩展开发。当前使用 Chord 1.2，后端以 `api.serve` 注册 remote contract，使用 `self.state`；浏览器通过 client host 获取句柄。旧 transport 的描述和限制也需逐项重核。 | [helper manifest](../../packages/extension-ui/package.json)、[浏览器上下文](../../packages/extension-ui/src/browser.ts)、[transport](../../packages/extension-ui/src/transport.ts)、[当前作者说明](../../packages/extension-ui/README.md)。                                                                                                                                                                      | 重写当前作者契约与 transport 章节；0.87 的可行性探测、历史验证独立保留。文中工作区外 `/private/tmp/` 证据未访问，本次不判断其是否仍存在。           |
| [Workspace 重设计方案](../workspace-redesign-plan.md)          | 开头称当前 manifests 为 `^1.0.0`，与 1.2 不符；`ReviewScope` 示例只有 uncommitted/branch/turn，遗漏独立 staged/unstaged；称本阶段没有 checkpoint GC，但当前已有保留上限和后台 GC。                                                                 | [Review contract](../../apps/desktop/contracts/review.ts)、[checkpoint store](../../apps/desktop/electron/workbench/checkpoint-store.ts)、[当前架构](../architecture.md)。                                                                                                                                                                                                                                       | 更新被称为当前实现的章节；将阶段计划和九月验收留作历史记录。不要把旧版本通过结果当作 1.2 的验证。                                                   |
| [测试失败整改方案](test-failure-remediation-plan.md)           | 仍标记“待实施”，但 Git 环境删除覆盖、Guard 目标修正、单实例夹具、终端焦点保护和 host-action 消费确认均已有对应代码。另允许 `.artifacts` scratch/构建，与当前 AGENTS.md 要求产物统一进入 `records/` 冲突。                                          | [Git 环境](../../apps/desktop/electron/platform/files/git-environment.ts)、[解析 Guard](../../scripts/contract-resolution.test.mjs)、[typed lint Guard](../../scripts/typed-lint.test.mjs)、[单实例流程](../../apps/desktop/tests/core/settings-general.spec.ts)、[终端](../../apps/desktop/src/features/workbench/terminal-panel.tsx)、[消费确认](../../apps/desktop/electron/ipc/extension-view-requests.ts)。 | 改为实施状态表，分别记录已实现、已验证、仍待验证，不能简单标成全部完成。已有整改记录中的 `core-targeted.log` 为 14 项通过，但不能替代当前全量验收。 |
| [隔离桌面验证指南](../guides/isolated-desktop-verification.md) | 要求构建到 `apps/desktop/.artifacts/`，示例输出也在任意绝对目录；没有将 TMPDIR/TMP/TEMP 指向本轮 records 目录。现有 helper 使用系统 `tmpdir()`，照抄指南可能把 profile 和临时工作区写到工作区外。                                                  | [AGENTS.md](../../AGENTS.md) 的测试与实验记录规范、[Electron helper](../../apps/desktop/tests/helpers/electron-app.ts)、[Playwright 配置](../../apps/desktop/playwright.config.ts)。                                                                                                                                                                                                                             | 重新提供同时满足 records 归档、依赖解析及图标相对路径的隔离布局和命令；不能只替换一个输出路径而忽略依赖解析约束。                                   |
| [Platform 接口设计](../arch/platform-package-api.md)           | 自称描述已落地公开接口，但仍将接口限定为 9 个操作，遗漏后续加入的 GitHub CLI 导出；验收章节还写“实现阶段再补”测试脚本和 baseline 入口，而这些已存在。                                                                                              | [公开导出](../../packages/platform/src/index.ts)、[GitHub CLI 实现](../../packages/platform/src/github-cli.ts)、[根脚本](../../package.json)、[补充指南](../guides/github-cli-runtime.md)。                                                                                                                                                                                                                      | 补齐公开接口或明确拆分文档的覆盖范围，更新已落地事项；保留原 Windows 验证的时间范围，不凭代码存在宣称新增平台实测通过。                             |
| [CI 基线](../ci-baseline.md)                                   | typecheck 和 baseline 说明仍称覆盖“两套”桌面扩展示例，当前是五套；baseline 列表还遗漏 Platform 和 Catalogs 测试。“下一步”中的 JSON 校验与 IPC 加固已有实现，待办应收敛到具体缺口。                                                                 | [根脚本](../../package.json) 的 `typecheck:extension-examples`、`test:extension-examples`、`test:baseline`；[Review IPC](../../apps/desktop/electron/ipc/review-requests.ts)、[扩展 IPC](../../apps/desktop/electron/ipc/extension-view-requests.ts)、[持久化说明](../architecture.md)。                                                                                                                         | 按实际命令同步检查范围；重新核定未完成边界，不把已有局部校验解释为全部 IPC 已完成加固。                                                             |

## 应作为历史材料保留的 3 份文档

- [Workspace 重设计验证](workspace-redesign-verification.md)：记录九月 Pi/Chord 0.87 系列及后续局部验证，不能证明当前 1.2 工作区仍通过。正文已写明日期、失败及平台限制，宜归入历史报告并在入口注明适用版本，不应删除或改写原始通过结果。
- [测试问题清单](test-diagnosis.md)：是十月十四日的只排查快照，其中多项问题已有实现修复。不能继续作为当前未解决问题清单；宜链接整改状态。本次读取已有 `records/20261014-230924-test-remediation/core-targeted.log` 和退出码，确认历史定向运行有 14 项通过；同目录早期 `check.log` 则失败，不能据此声称全量基线通过。
- [废弃设计清理报告](obsolete-design-review.md)：是一次已完成清理及当时 Windows 失败的记录。旧测试计数、依赖版本和 `.artifacts` 路径不构成当前基线，但也不构成历史记录错误。保留历史证据，需要当前状态时链接新的实现或复验。

## 未发现足以判为过时的 5 份文档

- [架构与归属](../architecture.md)：已记录 Pi/Chord 1.2、当前存储格式、独立 Review scope 和 checkpoint 维护；九月验证另有明确时间范围。
- [GitHub CLI runtime](../guides/github-cli-runtime.md)：与当前 Windows 资源版本、resolver 及尚未迁移生产调用者的情况一致。
- [examples 删除影响评估](../reports/examples-removal-assessment.md)：五套示例、根脚本和专属 Electron 测试仍存在；文档是删除影响分析，不代表删除已经实施。
- [Pi 包与扩展架构讨论](../reports/pi-packages-and-extension-architecture.md)：已同步 1.2，现状与提案有区分，并明确旧 Chord 文档的验证限制。未重新访问上游，外部包维护状态不在本次核验结论内。
- [CI 合并门禁](../merge-enforcement.md)：四分片、五个聚合依赖及 fail-closed 机制与当前 workflow 一致。线上规则是否已激活未查询，不能判定激活状态已过时或已完成。

## 处理顺序与限制

优先更新 Chord 作者契约和隔离验证指南，避免直接误导开发与验证。其次闭环整改状态，再同步 Workspace、Platform 和 CI 的当前实现说明。历史报告保留原始结果，只补适用范围和后续结论入口。

本次仅新增审查报告，未改动或删除被审文档、代码、用户数据和历史产物。报告使用通用语言润色，核对事实、结论强度及引用；不把静态源码核对当作 Electron、真实 provider 或跨平台验收。

## 版本修改记录

| 版本 | 修改时间             | 修改内容                                                                               |
| ---- | -------------------- | -------------------------------------------------------------------------------------- |
| v1   | 2026-10-18 20:09 CST | 审查原有 14 份文档，列出 6 份需更新说明、3 份历史材料及 5 份未发现明确过时内容的文档。 |
| v2   | 2026-10-18 20:18 CST | 归档更新前时效性审查，记录建议已处理并保留原始判断。                                   |
