# 归档文档索引

> 最后修改时间：2026-10-18 20:22 CST
> 文档版本：v1
> 修改说明：创建七份历史材料的归档原因、原位置、当前入口及证据缺失说明。

这里保存已被当前实现或后续修复取代的报告、方案和阶段证据。归档不代表原结果无效，也不代表其中尚未闭环的问题已通过验证；正文中的“当前”“待实施”和版本说明，应按其原始时间理解。新任务采用当前架构、接口与指南。

| 文档                                                                      | 原位置                                                                    | 归档原因                                                                                                                 | 当前入口或适用范围                                                                                                              |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| [Workspace 重设计验证](workspace-redesign-verification.md)                | `docs/workspace-redesign-verification.md`                                 | 验证对象为九月 Pi/Chord 0.87 系列和后续局部修改，不能证明当前 1.2 工作区；旧包、测试计数和安装结果已不适合作为当前验收。 | [当前 Workspace 设计](../workspace-redesign-plan.md)。保留原始成功、失败、安装摘要与证据目标。                                  |
| [Workspace 基础阶段与 Pi 0.87 验证](workspace-foundation-verification.md) | `docs/workspace-redesign-plan.md` 的 Pi/Pico 调研、两节基础验证和阶段计划 | 升级与基础阶段已实施，旧版包导出结论和未来计划措辞不宜混入当前实现说明。                                                 | 从现行设计中抽出原文；当前协议见 [Chord 设计](../chord-desktop-extension-design.md)。                                           |
| [Chord 0.87 可行性探测](chord-feasibility.md)                             | `docs/chord-desktop-extension-design.md` 的 Historical feasibility proof  | 属于旧版前期 Node/浏览器探测，既不是当前 1.2 API，也不能代替 Electron 传输与资源隔离验证。                               | 保留探测结果、上游版本及原证据位置；工作区外证据未访问或重新核验。                                                              |
| [测试问题清单](test-diagnosis.md)                                         | `docs/reports/test-diagnosis.md`                                          | 十月十四日只排查快照中的多项问题已有后续修复，已不能作为当前未解决问题清单。                                             | [该轮整改状态](test-failure-remediation-plan.md)；原失败记录和证据强度保留。                                                    |
| [废弃设计清理报告](obsolete-design-review.md)                             | `docs/reports/obsolete-design-review.md`                                  | 一次性清理已完成，当时 Windows 故障、旧依赖说明和测试计数是历史状态。                                                    | [当前架构](../architecture.md)。保留已删实现范围及当时失败，不能推断所有平台现已通过。                                          |
| [测试失败整改方案与状态](test-failure-remediation-plan.md)                | `docs/missions/test-failure-remediation-plan.md`                          | 多项原待实施修复已有代码，旧验证目录规则也已被 records 规范取代，不应继续作为执行方案。                                  | 归档前补充静态实现状态、存量最终/早期检查的区别和未覆盖范围；新验证采用[隔离指南](../guides/isolated-desktop-verification.md)。 |
| [docs 时效性审查](docs-freshness-review.md)                               | `docs/reports/docs-freshness-review.md`                                   | 更新前的过时清单已在本轮处理中落实；若仍作为当前清单，会误导为这些文档尚未更新。                                         | 保留原始 14 份文档审查判断；后续阅读当前文档及本索引。                                                                          |

## 证据可用性

移动时已按新位置调整相对链接，历史产物目标不变。归档前检查发现 Workspace 重设计验证中原有 34 个链接在当前工作区没有对应文件，涉及 `.artifacts` 下的旧日志、截图、结果和旧预览包；这些缺失没有因归档而修复，也不据此重写原验收结果。新验证的全部产物应按 [AGENTS.md](../../AGENTS.md) 写入 `records/`。

## 当前保留的报告

[examples 删除影响评估](../reports/examples-removal-assessment.md)和 [Pi 包与扩展架构讨论](../reports/pi-packages-and-extension-architecture.md) 的主要前提仍与代码一致，继续保留在 reports。提案未实施或报告较旧，本身不构成归档理由。

## 版本修改记录

| 版本 | 修改时间             | 修改内容                                                     |
| ---- | -------------------- | ------------------------------------------------------------ |
| v1   | 2026-10-18 20:22 CST | 创建七份历史材料的归档原因、原位置、当前入口及证据缺失说明。 |
