# 测试失败整改方案

> 最后修改时间：2026-10-18 20:18 CST
> 文档版本：v2
> 修改说明：补充已落地修复及存量验证状态，将原待实施方案归档并明确执行边界。

## 归档状态与后续实现

本文原为十月十四日待实施方案，现归档为该轮整改的方案与状态记录。下方原有实施顺序、建议和验收命令保留为历史内容，不再作为当前执行指南；新验证遵循[隔离指南](../guides/isolated-desktop-verification.md)和 AGENTS.md。

| 事项         | 当前静态核对与已有证据                                                                                                 | 限制                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Git 环境隔离 | helper 已返回 GIT_* 的 undefined 删除覆盖，保留可信 extra；解析和 typed-lint Guard 已改用当前 Platform/Catalogs 入口。 | 本轮未重跑 Git 或 Guard 测试。                                               |
| 单实例与终端 | General 用例已检查同 profile 第二进程退出；终端初始化检查当前焦点，renderer 快捷键允许打开 Settings。                  | 存量 core-targeted.log 记录 14 项通过，不是本轮或全平台验证。                |
| 扩展导航     | frame 在 Promise 结果后的 microtask 发 ack；main 按连接、sender、requestId 等待并提交，超时为 10 秒。                  | 存在实现不等于所有生命周期场景本轮均验证。                                   |
| 整轮基线     | 存量 check-final.exit 为 0，check-final.log 末尾记录 335 个桌面单元通过、1 个跳过；较早 check.exit 为 1。              | 两次运行阶段不同，不能用最终结果抹去早期失败，更不能推断当前 HEAD 全量通过。 |

上述原始文件均位于 `records/20261014-230924-test-remediation/`。Windows 故障、真实 provider、原生 OS、打包安装的当前验证状态不在本轮文档更新中闭环。

## 原方案状态与依据（历史）

以下保留方案制定时的状态：当时为待实施方案，未修复实现或重新运行产品测试。依据 [本轮排查](test-diagnosis.md)、[清理审计](obsolete-design-review.md)、[架构与归属](../architecture.md)、[Platform 接口](../arch/platform-package-api.md)、[扩展视图设计](../chord-desktop-extension-design.md)、[隔离验证指南](../guides/isolated-desktop-verification.md) 和根级 AGENTS.md v5。

审计已明确淘汰无版本 UI-state、旧格式迁移和旧 Git diff 链路。解决测试失败时保持当前实现为唯一实现，修改过期断言，不恢复旧导出、旧格式读取或已淘汰工具。当前格式的数据校验、损坏保护、备份恢复和用户数据原样保留仍是验收要求。

## 成功标准与实施顺序

1. 先修 Git 隔离，证明 Review 暂存不会写入被父环境指定的另一仓库，Checkpoint 仍只使用应用自有对象库。
2. 同步处理三个 Guard 和单实例夹具，使基线检查验证当前架构。
3. 修终端设置快捷键与焦点交接，再区分并处理扩展线程切换的生命周期问题。
4. 修验证目录条件和相应夹具，使用隔离构建完整复验。不得靠跳过、自动重试、增大超时或容忍错误来取得通过。

所有修改由当前主代理完成，保留当前分支。使用现有测试为主；只对 Git 权限/目标隔离、连接失效等高风险或异常场景扩展覆盖。普通修改采用静态检查。桌面整体流程必须用真实 Electron 验证。拟议验收命令不代表已经执行或通过。

## 1. Git 环境隔离：修正调用方的删除表达

**职责：Desktop Git adapter；优先级 P0。**

Platform 的公开约定是 env 覆盖父环境，undefined 删除。当前 Platform 再合并父环境符合这一约定，错误在 isolatedGitEnvironment 返回了“删过键的完整环境”，却没有表达删除。

建议重新实现现有 isolatedGitEnvironment：返回 Git 专用覆盖项，扫描当前父环境中的 GIT_*，将每个待隔离键设为 undefined；然后设置 GIT_OPTIONAL_LOCKS、GIT_TERMINAL_PROMPT，并应用由可信调用方传入的 extra 覆盖项。Windows 按大小写不敏感规则归并键，避免产生同时含 git_dir / GIT_DIR 的冲突输入。extra 中合法的应用自有 GIT_DIR、GIT_INDEX_FILE 等显式配置必须在删除后生效。

统一让 Review、app-store-files 和 Checkpoint 使用这一现有 helper。保留 Platform 的 env 覆盖语义和程序解析能力；Git-specific 策略不下沉到 Platform，不增加 full-env 模式，不退回独立 execFile 路径，不修改全局 process.env。

**验收：**扩展已有 git-review 的父环境重定向回归，检查 Review 的列表来自真实 checkout，stage 只改变真实 checkout 的 index，诱饵仓库的文件、index 和暂存内容不变。Checkpoint 的受污染父环境场景确认额外指定的应用对象库生效、用户仓库 index/objects/refs 不变。覆盖 Windows 变量大小写与明确 extra 覆盖。Platform 的实际子进程设置/删除/空字符串语义仍通过。

现有命令：pnpm --filter @pi-gui/platform test；pnpm test:desktop-unit --grep 'inherited Git repository overrides'；pnpm test:desktop-unit --grep 'checkpoint|git-review'。补充场景按上述高风险边界验收，不为 helper 每个分支增加测试。

## 2. 三个 Guard：跟随已完成迁移，保留约束目的

**职责：scripts 的架构与 typed-lint Guard；优先级 P1。**

- contract-resolution 删除对 @pi-gui/catalogs/node/atomic-write 的要求。保留 Catalogs/node 的真实 Node 解析检查，并核验新原子写入所有者 @pi-gui/platform 的根入口可从 desktop 解析。不得恢复旧 subpath export 或转发文件。
- typed-lint 的 paths 改用实际存在的 catalogs/test/json-catalog-store.test.mts，并覆盖 platform/src/index.ts 和 platform/test/platform.test.mts。继续证明各 workspace 和执行上下文的七条 typed rules 生效，不降低规则强度。
- 新 workspace 夹具停止对生产配置包列表做字符串替换。复制现有基准配置，在夹具内通过一个可执行的 ESLint 配置组合追加 new-feature 的具体 typed project；依然分别验证“未注册失败”“注册后通过”和真实非法 Promise 被拒绝。不把生产 typedProject 暴露成仅服务测试的公共 API，不新增通用配置生成框架。

**验收：**pnpm build:shared 后 pnpm test:guards 通过；在已有 Guard 中核验违规失败和有效样例通过。pnpm lint 与 pnpm check:architecture 仍通过。解析 Guard 不依赖陈旧 dist 中的残留文件。

## 3. 单实例测试：删除旧 opt-in 数据路径

**职责：Desktop persistence 与现有 settings-general 用例；优先级 P1。**

清理审计要求仅维护当前格式。当前 UI-state 中 allowMultiple 的接口字段、knownKeys、decoder 返回项和 boolean 校验只有读取/测试用途，已经没有应用行为调用者。将这些项目一起删除，而非加入无版本兼容或忽略旧字段的分支。

重写现有用例为当前单实例用户流程：首次启动或使用最小有效 version:19 状态启动，确认获得单实例锁；同一 profile 启动第二进程，确认它退出且第一窗口继续可用；打开 General，确认不存在多实例开关。删除旧开关被读取后丢弃的专属断言。

packages/session-driver/src/types.ts 的 HostUiRequest.select.allowMultiple 是当前 Pi 选择请求参数，与应用多实例无关，保留该接口。

**验收：**现有 UI-state 无版本/未知字段拒绝用例继续证明报错且不覆盖原始文件；在现有 malformed-data 表中涵盖已淘汰字段即可，不新增专属迁移测试。实际 Electron 完成同 profile 双进程验证；无效 profile 应给出启动诊断，而不是等待 workspace 超时。检查并同步架构中的当前字段约定。

现有命令：pnpm test:desktop-unit --grep 'UI-state|persisted|workbench'；Electron settings-general.spec.ts。

## 4. 终端焦点与设置快捷键：保留用户焦点，明确路由

**职责：TerminalPanel、use-desktop-commands 和 main 的既有快捷键入口；优先级 P1。**

终端首次创建不能在异步初始化完成后无条件 terminal.focus()。在实际用户选择终端时建立一次焦点意图；初始化完成后仅在这次意图仍有效、用户未把焦点移到 composer/其他控件时聚焦。沿用组件和现有 Workbench 的选中状态，不增加另一套全局焦点状态库。

Cmd+, / Ctrl+, 是应用设置入口。在 renderer 的终端分支和 main 的终端 before-input-event 分支明确处理这个现有命令，调用现有 openSettings 处理器，并避免 xterm 同时把该键送入 shell。保持 Ctrl+C 等终端控制键语义。检查两入口同时触发时只执行一次，沿用当前命令分发与配对机制；不增加重复 IPC 或另一套快捷键注册系统。

**验收：**扩展已有 workbench-tabs 整体流程，确认终端异步就绪后 composer 仍保留用户输入焦点；刻意聚焦终端后设置快捷键也能打开设置。Back/Escape 返回原任务，Files/Terminal 标签和两份草稿在切换与重启后保持。真实 Electron 验证；原生 OS 键盘路由采用仓库 native lane，不能由后台 Playwright 单独证明。

现有命令：Electron workbench-tabs.spec.ts、integrated-terminal.spec.ts 和相关 native 快捷键用例。Windows/macOS/Linux 分别使用平台规定的 modifier，不把 shell 源代码当作跨平台命令。

## 5. 扩展线程切换：先确认行为，再替换时间推迟

**职责：扩展 host action、frame bootstrap、现有连接生命周期；优先级 P1。**

目前已确认“主 renderer 收到成功 IPC，iframe 随后移除，console 成功消息偶发缺失”；尚未充分区分 Promise 回调未执行和销毁后 Playwright console 证据丢失。不能仅根据 console 缺失改变产品协议。

首先修改现有 links 回归的证据：成功回调通过扩展原有 Chord backend 记录可在视图关闭后读取的最小结果，验证线程实际切换和回调实际执行。结果属于扩展测试夹具，不新增产品数据库、通知 inbox 或宽泛 preload 能力。

- 若回调实际执行，只是 console 被丢弃：以持久可观察结果取代 console 判据，保留现有产品实现。
- 若证实切换先于 frame 消费结果：替换 openThread 的 setImmediate 路径。为这一导航动作增加窄范围、带 requestId 的消费确认：frame 处理 host-action-result 并 resolve 当前请求后，在紧随的 microtask 中确认；main 只有收到匹配活连接、原请求和发起 sender 的确认，才启动原窗口的线程选择队列。保证即时 Promise.then 的消费先于导航，不能承诺等待作者任意异步后续工作。

确认用于排序，不用于信任授权。目的线程由 main 原请求解析并保存；确认不允许传入目标窗口/任务。执行前再次核验连接、runtime generation 和当前任务。用户先导航、关闭、reload 或窗口销毁时撤销待导航请求，保持现有 rejected/unavailable 行为。等待确认须有界并报告失败，禁止自动重放、切到前台窗口回退、固定 sleep 或保留旧 setImmediate 作为备用路径。

明确 API Promise 的成功表示动作已接受还是导航已完成；本方案沿用当前“接受后回调可执行，再开始切换”的语义。若需要新增 wire 消息，同任务更新 contracts、frame/main 解码、扩展设计和架构文档，维持 opaque iframe 与 narrow preload 边界，不另建通用可靠消息框架。

**验收：**现有 links 流程可观察成功回调和正确线程；跨 folder、已归档线程仍拒绝。确定性暂停消费时不会先导航；关闭/reload 后无迟到导航；同窗口草稿先保存，多窗口不会串线。扩展安全、生命周期、draft action 和 command compatibility 的现有 Electron 用例通过。重复观测只用于暴露竞态，不用重试取得绿色结果。

## 6. 临时目录条件：修夹具的独立性

**职责：现有验证 helper、scripts 夹具及隔离指南；优先级 P1。**

每次在 records 下保存 config、完整日志、原始结果和 analysis；短 scratch 可以位于工作区 .artifacts 下，用唯一短名字，在 config 中记录映射。socket 路径按实际字节长度检查系统上限；只缩短测试目录，不修改 Chord 或增加 TCP fallback。保留用户资料与所有证据，不自动删除。

- 格式 Guard：给“错误格式必须被拒绝”的夹具指定自己的空 ignore 文件，防止仓库忽略规则遮蔽该断言；另一现有用例继续独立验证生产 ignore 规则。不是从生产检查中移除源文件。
- changed-files：工作区内移走 .git 后会发现父仓库，明确将此夹具断言为 nested-workspace 的 unavailable 诊断和 Retry 状态；仍验证恢复 .git 后 reviewed 标记不丢失。不要靠宽泛正则吞掉任意错误，也不要改变产品 Git root 校验或添加 ceiling 环境绕过。
- MCP：分别验证真实写入目标和展示路径。home 下按当前产品约定显示 ~，其他目录显示绝对路径；读取真实 mcpPath 核验错误 URL 没有创建/改写文件，保留后续有效更新流程。不得为了测试关闭产品路径缩写或删除校验断言。

遵循隔离指南：验证构建在 apps/desktop/.artifacts/<run>/ 内独立输出 main/preload/renderer，并保留相对路径、资源和桌面依赖解析关系；成功后设置 PI_APP_TEST_ENTRY。不得覆盖 apps/desktop/out 或正式安装。每次 Playwright 输出用新目录，避免覆盖原失败证据。必要时改指南时递增其元数据版本。

## 验证与交付

先做每项定向检查，再 pnpm check 与 Electron Core 完整复验；静态检查、Guard、unit 和 Electron 结果分别报告。若需要新增 bounded acknowledgement，只增加对应高风险/异常回归；普通调整不新增逐分支单测。

正式提交前必须完成 pnpm format:check、pnpm lint 和待提交文件的 EditorConfig 核验，全部通过才提交。新文档使用通用语言润色，检查事实、原因强度和历史证据没有改变；不把尚未实施方案写成当前架构。

清理审计记录的 Windows EPERM、symlink 权限、POSIX shell、路径选择器和大列表 Diff 是历史未闭环项目，不属于本轮 macOS 已确认的修复结果。建立独立 Windows 复验记录，重现后按 filesystem / fixture / UI 各自归属处理；Platform 不承担 CSS selector、shell 语言翻译或 Review 展示职责。若作为本次跨平台验收目标，其失败须解决或明确报告阻断，不宣称全平台完成。

真实 provider、原生 OS、打包安装分别按相应 lane 验证；本方案没有要求发布、安装或全量 provider 使用。当前问题不涉及 Pi 的模型执行行为，不为 desktop lifecycle 问题分叉 Pi 运行时。

## 版本修改记录

| 版本 | 修改时间             | 修改内容                                                         |
| ---- | -------------------- | ---------------------------------------------------------------- |
| v1   | 2026-10-14 23:02 CST | 依据架构约束和清理审计制定测试失败的处理方案与验收标准。         |
| v2   | 2026-10-18 20:18 CST | 补充已落地修复及存量验证状态，将原待实施方案归档并明确执行边界。 |
