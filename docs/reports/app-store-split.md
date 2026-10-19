# App Store 设置域拆分结果

> 最后修改时间：2026-10-19 14:13 CST
> 文档版本：v1
> 修改说明：记录按章程完成的模块拆分、验证证据与剩余边界。

## 实现

按[拆分章程](../missions/app-store-split-charter.md)，设置业务迁入 `electron/settings/`：

- `preferences-owner.ts`：9 个偏好操作，包括语言、主题、通知和侧栏。
- `runtime-settings-owner.ts`：33 个运行时设置及模型设置操作，包括 Provider、Skills、扩展开关、MCP 和会话重载。
- `model-settings.ts`：8 个设置文件读取、合并、比较和应用函数。

主类通过窄能力接口委托，仍独占聚合状态、driver、catalog 与可变 Map。内置扩展开关写盘失败回滚、忙碌会话延迟重载、部分失败提示及 i18n 处理保持原有逻辑。公开的 137 个方法签名经结构检查保持一致，`app-store.ts` 从 5,059 行降至 4,262 行。架构文档已同步。

现有 MCP、模型菜单、主题和语言用例的部分定位器改为当前的 RadioGroup、Select 和 portal 操作，保留业务断言。没有更改产品界面，也没有增加状态库、兼容层或新 IPC。

## 验证

全仓格式、Lint、架构和类型检查通过；新 owner 的边界检查 4 项通过。设置测试调整后的最终格式、Lint 和 desktop 类型复验见[最终静态记录](../../records/20261019-1412-app-store-static/)。

Windows fixture-backed Electron 中，MCP 配置完整流程与失败保护、主题选择与重启、语言跨窗口同步／草稿保留／重启恢复均通过。语言用例使用可见窗口，截图已检查。[针对性运行](../../records/20261019-1409-app-store-targeted/analysis.md)为 5 通过、2 未通过；模型作用域仍被旧原生 Select 断言阻断，全预设遍历达到 60 秒上限。因此这两项不能作为完成验收。

全量 `pnpm check` 未全绿：guard 阶段 77 通过、37 失败，包含 Windows 路径断言和测试发现问题；后续 baseline package 阶段未运行。单独 desktop unit 为 322 通过、16 失败、2 跳过，失败集中在未修改的 Git、symlink、路径和文件权限相关模块。设置初轮 Electron 为 10 通过、7 失败，部分旧定位器随后修正并复验；Provider 空状态、Skills 导航等失败没有扩展修复。完整结果与原始日志见[复验分析](../../records/20261019-1402-app-store-verification/analysis.md)。

本轮没有执行真实 Provider 对话、原生 OS 流程或安装包验证，没有更新正式安装。

## 剩余边界

本轮完成设置域拆分。主类仍负责启动恢复、会话事件排序、窗口投影、选择 hydration 和持久化协调。后续拆分应围绕这些状态的归属继续进行，并保留选择 epoch、发布 revision 及窗口动作串行语义，不通过共享整个 store 或继承隐藏依赖。

## 版本修改记录

| 版本 | 修改时间             | 修改内容                                 |
| ---- | -------------------- | ---------------------------------------- |
| v1   | 2026-10-19 14:13 CST | 记录设置域拆分、实测结果和主类剩余职责。 |
