# examples 删除影响评估

> 最后修改时间：2026-10-18 20:45 CST
> 文档版本：v2
> 修改说明：依据第一方插件维护与未来内置方向归档原删除影响评估。

本文已归档。用户现明确将这五套实现定位为持续维护的第一方插件，并计划后续随软件打包内置；原删除评估不再作为当前处理方案。以下保留当时的功能差异和清理范围，路径及名称以原评估时间为准。当前入口见[第一方插件](../../extensions/README.md)和[开发指南](../guides/first-party-extensions.md)。

## 结论

`examples/` 当前只有五套桌面扩展及其构建、测试和说明。主应用生产源码没有直接导入它们；它们通过 Pi 的扩展配置加载。删除目录可以移除这些扩展，但不能称为已被主应用替代后的重复代码清理。

应用已经具备通用扩展宿主、卡片渲染、侧面板及作用域受限的操作接口。具备这些基础能力，不代表已经内置每套扩展的业务逻辑。当前工作台内置面板只有 Files、Review 和 Terminal；主进程显式注册的应用内置扩展是 Thread orchestration 和 Scheduled tasks。

如果目标是下线仓库自带的五套扩展，可以整体删除并同步清理引用，保留通用扩展体系。如果目标是删除 examples 目录但保留这些功能，应先确定需要保留的功能，再迁入正式模块并接入加载入口。仅移动文件不会让扩展成为内置功能。

## 功能影响

| 扩展      | 主应用已有能力                           | 删除后失去的独立功能                                              |
| --------- | ---------------------------------------- | ----------------------------------------------------------------- |
| Usage     | 当前对话的上下文、缓存、token 和费用统计 | 跨对话与日期范围的统计、上下文分类估算、每次回复后的用量卡片      |
| Trace     | 普通对话和工具时间线                     | 模型及工具调用的实时瀑布图、首响应等待和调用级上下文详情          |
| GitHub    | 打开 URL、准备任务草稿等通用动作         | PR/issue 浏览面板、GitHub 状态筛选、模型的 github_read 工具       |
| PR Review | 本地工作区差异评审面板                   | PR 指定提交的模型评审、结构化问题记录、过期评审修复草稿的拒绝逻辑 |
| Test Runs | 集成终端和普通工具执行                   | 固定演示测试套件的专用面板、运行记录和配套示例命令                |

上述“失去”指删除本目录提供的实现。没有检查外部独立安装副本，也没有确认用户当前启用了哪些扩展。

## 同步清理范围

1. 删除 `examples/` 内的源码、预构建浏览器产物、测试、配置和说明。
2. 移除根 `package.json` 的 `typecheck:extension-examples`、`test:extension-examples`，以及 `typecheck`、`test:baseline` 对它们的调用。
3. 处理依赖目录的五个 Electron 测试文件：Core 的 `extension-examples.spec.ts`、`extension-github-view.spec.ts`、`extension-usage-view.spec.ts`、`extension-trace-view.spec.ts`，以及 Live 的 `extension-pr-review.spec.ts`。同步移除专属 helper `desktop-extension-examples.ts`。`extension-examples.spec.ts` 还验证关闭标签后运行保留、任务隔离与重载；删除其专属业务测试时，应核对仍保留的通用宿主测试覆盖这些约束。
4. 清理 `eslint.config.mjs` 的示例源码和类型项目配置，以及 `.prettierignore` 的示例产物排除项。
5. 清理根 README 和 `docs/architecture.md`、`docs/ci-baseline.md`、`docs/chord-desktop-extension-design.md`、`docs/workspace-redesign-plan.md` 中的当前实现或执行说明。历史验证结论应保留，明确对应已移除的实现，不改写历史结果。
6. 本次 Iconify 替换新增的根开发依赖 `@iconify/utils` 和 `@iconify-icons/lucide` 仅供示例源码使用，删除示例后可一并移除这两条根依赖并更新锁文件。桌面和官网自己的 Iconify 依赖保留。

通用扩展宿主、`packages/extension-ui`、卡片渲染和其他扩展测试不在示例删除范围内。用户扩展配置、会话记录、历史截图及验证产物也不随源码清理删除。

## 核验依据

- [工作台内置面板](../../apps/desktop/src/features/workbench/builtin-tools.tsx)：Files、Review、Terminal。
- [主进程注册](../../apps/desktop/electron/main.ts)：`builtinExtensions` 的显式注册项。
- [内置用量读取](../../packages/pi-sdk-driver/src/session-usage.ts)与[用量环](../../apps/desktop/src/features/conversation/context-meter.tsx)：当前对话统计。
- [通用扩展卡片渲染](../../apps/desktop/src/features/conversation/extension-card.tsx)：消费扩展提供的卡片，不负责生成 Usage 的统计卡片。
- [示例测试 helper](../../apps/desktop/tests/helpers/first-party-extensions.ts)：测试加载的真实目录。
- 五套扩展的 README、源码与根脚本、lint、格式配置中的引用。

本次仅做源码与引用检查，没有执行删除、修改用户配置或启动 Electron。文档按 humanizer-zh 的方法润色，并复核功能差异和引用，不改变结论强度。

## 版本修改记录

| 版本 | 修改时间             | 修改内容                                             |
| ---- | -------------------- | ---------------------------------------------------- |
| v1   | 2026-10-15 11:23 CST | 创建五套扩展的删除影响、依赖清理清单与核验依据。     |
| v2   | 2026-10-18 20:45 CST | 依据第一方插件维护与未来内置方向归档原删除影响评估。 |
