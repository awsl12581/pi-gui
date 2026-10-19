# 桌面首屏启动慢的原因分析

> 最后修改时间：2026-10-19 13:31 CST
> 文档版本：v2
> 修改说明：补充两阶段启动实现、同源码构建对比和真实 Electron 验证结果。

## 结论

优化前的启动流程把所有工作区的数据同步和运行时准备放在创建窗口之前。用户等待的既有 Electron 启动时间，也有历史会话扫描、Git worktree 刷新和扩展资源加载时间。本轮已将已登记工作区的全量同步、worktree 刷新和次要工作区运行时加载移到窗口就绪之后。

检查与实现基于 HEAD `a6e5e76a3283cbc6943b41de3a8913ae05822f3e` 加工作区修改。经用户协调暂停其他修改后，整合并保留默认工作区功能。本轮使用隔离构建验证，未覆盖正式输出或更新已安装应用。

## 已实施的优化与结果

- 启动先复用 catalog，校验当前格式的 UI 状态和附件，只准备所选工作区运行时；新增初始目录及首次默认工作区仍走现有注册流程。
- 首窗口 `ready-to-show` 后同步已登记工作区、刷新 worktree 和加载其余运行时。同步使用 `reconcileWorkspace(id)`，不重新注册已被移除的工作区；后台刷新保留较新的选择与草稿，并发布失败诊断。
- 终端、设置、差异和文件面板拆为按需 chunk；高亮引擎及语法库在首次显示代码时加载，等待期间显示纯文本。加载提示复用现有国际化文案。

同源码构建中，首屏入口 JS 从 **4,185,176 字节降到 2,686,123 字节，减少 35.82%**。这里比较的是原始文件大小，不是网络压缩体积或整体安装包大小。原始数据见 `records/20261019-132655-startup-verified/bundle-comparison.json`；baseline 构建配置和覆盖源码见 `records/20261019-131641-startup-baseline/`。

在相同隔离 profile 中登记三个空项目及默认工作区，先预热登记，再交替启动优化前后构建，各测三轮：

| 轮次   | 优化前可用时间（ms） | 优化后可用时间（ms） |
| ------ | -------------------- | -------------------- |
| 1      | 4667.0               | 2849.5               |
| 2      | 4879.4               | 2778.5               |
| 3      | 4608.6               | 2778.4               |
| 中位数 | 4667.0               | 2778.5               |

中位数缩短 **40.47%**。指标从调用共享启动 helper 开始，到工作区列表可见且 state 请求成功为止，包含 helper 准备时间；没有清空系统缓存。这是 Windows 上 fixture-backed Electron 的小规模实测，不能推算安装版、大量历史会话或其他机器的固定收益。原始日志、脚本、浏览器 paint entries 和统计结果均在 `records/20261019-132836-startup-timing/`。

最终定向验证 **11 项全部通过**：默认工作区、会话重启恢复、扫描被阻塞时首屏可用、外部会话发现、草稿保留、工具布局经设置页及重启恢复，以及高亮与主题检查。构建、TypeScript、架构、Lint、Prettier 和 EditorConfig 检查通过。证据目录为 `records/20261019-132655-startup-verified/`。

更广的初轮测试并非全绿：恢复页英语标题、旧原生下拉框选择器、Windows `printf`、菜单指针拦截和旧模型下拉框选择器相关用例失败。恢复页标题和语言下拉框两个失败已在优化前产物复现，见 `records/20261019-132716-startup-baseline-check/tests.log`。高亮动态导入在 Node 测试中的模块格式问题已修正，后续验证通过。没有将这些失败算成通过，也没有扩大本轮范围修改无关用例。

当前仍需等待 Pi SDK 静态导入、必要的数据校验及所选运行时准备后才创建窗口；本轮没有消除这些成本。全量扫描本身仍使用 Pi 原生实现，只是移出了首屏等待路径。

## 优化前确认的启动路径

以下原因分析与源码行号保留自 v1，描述优化前实现；当前行为以上面的实施结果和架构文档为准。

`main.ts` 静态导入 Pi SDK → `app.whenReady()` → 创建 store → 等待 `store.initialize()` → 注册 IPC → `createAppWindow()` → 加载 renderer → `ready-to-show` 显示窗口。

对应位置：`apps/desktop/electron/main.ts:14`、`:1085`、`:1268`、`:556`。窗口配置为 `show: false`（`:485`）。因此初始化过程中的任何慢操作都会延迟窗口出现，启动提示也无法提前显示。

### 1. 所有工作区都进入首屏的等待链路

`apps/desktop/electron/application/app-store.ts:2162` 起读取登记工作区，对它们执行 `syncStartupWorkspace()`，随后等待 `refreshState()`。并行同步仍需要等待最慢的工作区完成。

`refreshStateNow()`（`:2368`）依次等待 worktree 刷新、所选工作区运行时，以及其他全部工作区运行时。后者使用 `Promise.allSettled()`（`:2442`），错误会被收集，但不会提前结束等待。即使首屏只显示一个工作区，其他工作区仍会延迟首屏。

### 2. 会话同步会读取历史正文

`packages/pi-sdk-driver/src/session-supervisor.ts:455` 每次同步调用 `SessionManager.list(workspace.path)`，之后才合并已有 catalog 并写回。

当前安装的 Pi 实现位于 `node_modules/@earendil-works/pi-coding-agent/dist/core/session-manager.js`：`list()` 调用 `listSessionsFromDir()`（`:594`），再调用 `buildSessionInfo()`（`:492`），逐行读取 JSONL、解析消息并拼接 `allMessagesText`。每目录并发上限为 10。它并非只读文件名或会话头，也没有利用 GUI catalog 跳过未变化文件。

所以工作区越多、历史会话越多、正文越大，启动扫描的工作量越大。这里确认的是代码行为，没有读取用户历史内容或测量其总数据量。

### 3. 每个工作区加载完整运行时资源

`app-store.ts:2882` 的 `ensureRuntimeLoaded()` 调用 `RuntimeSupervisor.getRuntimeSnapshot()`。

`packages/pi-sdk-driver/src/runtime-supervisor.ts:532` 为每个工作区创建独立 settings、package manager 和 resource loader，并等待 `resourceLoader.reload()`、扩展 provider 注册。`:702` 随后刷新模型运行时、解析资源路径、构造 skills、extensions、providers 和 models 清单。

多个工作区会分别执行这些工作。这里的模型刷新显式使用 `allowNetwork: false`，不能将它直接归因为模型 API 网络慢；npm 包来源解析或扩展自身的具体耗时仍需运行时分段测量。

### 4. Git worktree 刷新逐仓库等待

`apps/desktop/electron/workspace/app-store-worktree.ts:316` 首先检查所有工作区，再在 `:363` 的循环中逐个等待 `refreshWorktrees()`。`apps/desktop/electron/platform/worktrees/worktree-manager.ts:66` 还通过全局队列串行执行刷新。

这是为了保持 worktree 归属正确；问题在于它被放在首屏之前。多仓库时耗时会累积。GC 已明确放到后台（`app-store.ts:2195`），本次不把它列为直接阻塞初始化的原因。

### 5. 主进程入口依赖本身有可测开销

独立 Node 进程的三轮顺序导入结果如下，单位为毫秒：

| 导入模块                          | 第 1 轮 | 第 2 轮 | 第 3 轮 |
| --------------------------------- | ------- | ------- | ------- |
| `@pi-gui/pi-sdk-driver`           | 1186.6  | 1135.3  | 1154.0  |
| `@earendil-works/pi-coding-agent` | 1154.1  | 1114.7  | 1137.8  |

每项在单独子进程中测量，两个模块的耗时不能相加。SDK driver 的静态依赖链已包含 Pi 运行时；主进程甚至仅校验 URL 的导入也来自该包根入口。测量不包含应用初始化、窗口渲染或 Node 进程创建时间。Node 与 Electron、源码与当前构建产物的差异，以及文件缓存状态，都会影响实际值。

原始数据：`records/20261019-125818-startup-import/import-results.log`；配置和脚本同目录。首次测量因脚本 cwd 路径错误未成功，单独保留在 `records/20261019-125809-startup-analysis/`，没有纳入表格。

### 6. renderer 的首屏依赖较重

`apps/desktop/src/app/App.tsx` 静态引入 TerminalPanel、DiffPanel、SecondarySurfaces 等功能。后者继续静态引入设置页。终端加载 xterm；多个首屏可达模块引入 `src/ui/syntax-highlight.ts`，该模块在顶层启动 Shiki、WASM、多语言和多主题初始化（`:59`）。高亮为异步加载，代码允许先显示纯文本，因此不能据此声称首屏必须等待 WASM 完成；它仍增加启动期间的加载与计算工作。

现存 renderer 入口文件 `index-CvT2s9Ir.js` 为 3,474,102 字节，WASM chunk 为 622,448 字节。但入口产物时间为 2026-10-15 12:31，早于当前源码，仅可作为旧构建体积参考，不能作为当前构建的性能结论。本次未覆盖构建产物。

## 开发模式的额外等待

`apps/desktop/scripts/dev.mjs:20` 先等待五个共享包构建，然后启动 watch 与 electron-vite。若用户通过 `pnpm dev` 启动，从命令运行到窗口出现的时间还包括这些编译步骤。安装版不走该路径。

## 原始建议的处理顺序

1. 先创建窗口并显示启动界面；仅等待必要的语言、主题与数据校验，把全工作区扫描、worktree 刷新和非选中运行时加载移到首屏之后。保留当前数据损坏保护与 renderer/main 边界。
2. 先显示 catalog 中的会话摘要，再后台同步 Pi 原生会话；对未变化记录避免重复扫描，保持与 CLI 外部修改的同步能力。
3. 按需加载工作区运行时、终端、设置页和高亮资源；不改变 Pi 运行时语义。
4. 用当前实际启动入口测量进程启动、依赖导入完成、initialize 各阶段、窗口创建、ready-to-show 和可交互时间，再决定后续优化。现有证据足以定位阻塞设计，尚不足以认定某一个阶段贡献最多秒数。

## 版本修改记录

| 版本 | 修改时间             | 修改内容                                                             |
| ---- | -------------------- | -------------------------------------------------------------------- |
| v1   | 2026-10-19 13:00 CST | 创建首屏启动链路分析，记录导入耗时及验证边界。                       |
| v2   | 2026-10-19 13:31 CST | 记录分阶段启动与按需加载实现、构建体积对比、三轮启动实测和验证结果。 |
