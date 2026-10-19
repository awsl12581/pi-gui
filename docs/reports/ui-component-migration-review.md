# UI 基础组件迁移清单与方案

> 最后修改时间：2026-10-19 10:52 CST
> 文档版本：v1
> 修改说明：核对 shadcn/Radix 基础组件接入情况，列出剩余入口、实施顺序和验收要求。

## 范围与判断标准

本次目标经用户确认为迁移到 `apps/desktop/src/components/ui`（shadcn/Radix）。当前 `docs/` 未找到专门的组件迁移指南；[工作区改版设计](../workspace-redesign-plan.md)描述的是 Workbench 等产品功能，不能作为组件迁移已完成的依据。本清单以现有组件和真实调用者为准，遵循该设计中的单一主题来源、既有状态归属，以及[国际化指南](../guides/internationalization.md)。

检查基于提交 `6398c1b0b720ec2015ef60c3dd4d4ee5b71de8f2` 对应的当前工作区源码。只进行静态阅读，没有运行 Electron；以下是待实施方案，不是运行验收结果。已有的 `pnpm-workspace.yaml` 修改不属于本次工作。

完成标准：通用交互由已有基础组件负责，业务状态仍由原 feature/controller 管理；保留各入口的键盘、焦点、异步提交和目标身份语义。原生文件选择、树节点及业务专用编辑行为应逐项判断，不能以原生标签数量计算完成率。

## 已接入的部分

- Button、Input 已在会话、侧栏、设置、Workbench 和扩展页面广泛使用，但这些页面仍混有原生控件。
- `fork-modal.tsx`、`image-attachment-thumb.tsx`、`command-palette.tsx` 已使用 Dialog；后者仍保留自有搜索与列表导航。
- `model-selector.tsx` 和 `extension-flags-selector.tsx` 已使用 Popover。
- `customize-page.tsx`、命令面板过滤项已使用 Tabs；`SettingsSelect` 已使用 Select。
- 外观主题选择已使用 RadioGroup；Review 文件勾选和自定义端点部分选项已使用 Checkbox。
- `styles.css` 已将 shadcn 颜色映射到现有主题 token，`ui/active-theme.ts` 已切换根元素的 `dark` class。

这些入口不应整页重写。后续迁移只处理残留交互与基础层缺口。

## 剩余清单

下表路径均相对于 `apps/desktop/src/`。P0 为继续扩散基础组件前的修正，P1 为优先替换的重复交互，P2 为后续整理。

| 优先级             | 入口与源码证据                                                                                                                                                                                                   | 剩余实现                                                                                                                | 迁移方案及必须保留的行为                                                                                                                                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0                 | `components/ui/dialog.tsx:66`、`:101`；`components/ui/command.tsx:28`                                                                                                                                            | Dialog 默认关闭文案写死为英文；CommandDialog 默认标题和描述也是英文。ForkModal 同时保留自有关闭按钮且未关闭默认按钮。   | 基础组件接入 `t` 和 `useLocale`，或由调用者显式传本地化标签；确认全体调用者只保留需要的关闭入口，提交中关闭受控。CommandDialog 目前未被业务调用，其文案在启用前处理。                                                                               |
| P1                 | `features/conversation/tree-modal.tsx:316`                                                                                                                                                                       | 自绘 backdrop、`role=dialog`、Tab 焦点圈定和 Escape。                                                                   | 改为受控 Dialog，使用 DialogTitle；保留树导航、搜索、两步选择/摘要、提交状态，以及只有选择步骤允许点遮罩关闭的规则。                                                                                                                                |
| P1                 | `features/extensions/extension-session-ui.tsx:234`                                                                                                                                                               | Pi 扩展的 confirm/select/input/editor 共用自绘弹窗。                                                                    | confirm 使用 AlertDialog，其他类型使用 Dialog；保留 `requestId`、取消响应、默认焦点和 Ctrl/Cmd+Enter。取消只回传一次，扩展作者的标题、内容及选项原样呈现。                                                                                          |
| P1                 | `features/scheduled-tasks/scheduled-task-editor.tsx:233`                                                                                                                                                         | 表单已用 Input/Textarea，弹窗外壳仍自绘。                                                                               | 替换 Dialog 外壳和标题，统一 Escape、点外关闭与 busy 规则；保留时区、时间、任务目标和表单校验，不改变调度执行。                                                                                                                                     |
| P1                 | `features/settings/settings-custom-endpoints-section.tsx:314`                                                                                                                                                    | 自绘弹窗、焦点陷阱与保存中 Escape 限制。                                                                                | 使用 Dialog，统一处理保存中的关闭入口；保留模型发现、错误状态、密钥字段和 provider ID 校验，避免关闭丢失仍在提交的上下文。                                                                                                                          |
| P1                 | `features/threads/hooks/use-workspace-menu.tsx:147`、`:181`；`features/settings/settings-mcp-section.tsx:128`                                                                                                    | 移除 workspace、删除 worktree、移除 MCP server 使用 `window.confirm`。                                                  | 使用受控 AlertDialog；打开时捕获操作目标，确认时调用原 action；取消、Escape 不执行操作。默认焦点放取消，异步期间防重复提交；worktree 的磁盘删除说明保留。                                                                                           |
| P1                 | `features/threads/sidebar.tsx:831`、`:1262`；`features/threads/thread-actions.tsx:140`；`features/threads/hooks/use-workspace-menu.tsx:84`                                                                       | Workspace/会话操作菜单和分组子菜单手写开关、Portal、定位、外部点击和悬停定时器。                                        | 使用 DropdownMenu，分组用 Sub、RadioGroup/RadioItem；保留显式 workspace/session 目标和菜单项 action。重命名表单独立保留为 Popover 或现有表单；只删除被菜单组件完整替代的监听器。                                                                    |
| P1                 | `features/workbench/review-menu.tsx:38`、`:84`                                                                                                                                                                   | Review 菜单手写 pointerdown/Escape/blur；单选项用 `menuitemradio`。                                                     | 使用 DropdownMenuRadioGroup/RadioItem、Separator 和说明区；保留 comparison identity、scope 值和 `data-option-id`，不改变 ReviewOwner 或选中项持久化。                                                                                               |
| P1                 | `features/scheduled-tasks/scheduled-tasks-view.tsx:98`、`:200`                                                                                                                                                   | 创建与每行操作菜单仍自绘。                                                                                              | 使用 DropdownMenu；保留创建方式、暂停/恢复/删除及当前任务目标，关闭菜单不触发 action。                                                                                                                                                              |
| P2                 | `features/threads/new-thread-view.tsx:175`、`:302`；`features/settings/settings-controls.tsx:25`、`:58`；`features/conversation/fork-modal.tsx:77`                                                               | 新线程工作区仍是原生 select；Local/Worktree、SettingsSegmented 和 Fork 环境选项仍自绘；SettingsSwitch 是原生 checkbox。 | 工作区改为 Select；互斥环境/分段偏好优先复用 RadioGroup，保留原布局；SettingsSwitch 保留当前可访问实现，若要求统一外观再新增一个局部 Switch 基础组件。不得把 switch 直接替换为语义不同的 Checkbox。                                                 |
| P2                 | `features/scheduled-tasks/scheduled-tasks-view.tsx:136`；`features/workbench/workbench.tsx:144`；`features/workbench/terminal-panel.tsx:349`；`features/workbench/file-editor-pane.tsx:120`                      | 定时任务过滤页签、工具页签、终端页签与文件页签仍由 feature 渲染和导航。                                                 | 过滤和页签按需使用 Tabs，保留单一受控 value；关闭按钮作为 Trigger 的同级元素。Workbench chooser 不是普通 tab，保留其独立状态；Terminal/文件内容的挂载不能因默认 TabsContent 行为改变。                                                              |
| P2                 | `features/extensions/extension-session-ui.tsx:273`；`features/conversation/tree-modal.tsx:504`；`features/conversation/composer-surface.tsx:386`                                                                 | 编辑器、摘要指令和 composer 仍使用原生 textarea。                                                                       | 前两处直接接入 Textarea 并保留 class/ref/事件。composer 单独处理：先核对自适应高度、IME、Enter/steer/queue 和焦点，再决定是否换壳，避免默认 `field-sizing-content` 或最小高度改变输入体验。                                                         |
| P2                 | `features/threads/sidebar.tsx:1257`、`:1703`；`features/conversation/context-meter.tsx:69`                                                                                                                       | 普通提示与信息卡使用自绘 tooltip，其他入口还使用 `title`。                                                              | 简单提示改 Tooltip；上下文卡先确认是否需要持久展示/交互，再选 Tooltip 或 Popover。快捷键提示状态保留，不要求所有原生 title 一律替换。                                                                                                               |
| P2，按行为等价决定 | `features/command-palette/command-palette.tsx:80`；`features/conversation/composer-surface.tsx:273`                                                                                                              | Command 基础组件存在，但命令面板和 slash/mention 列表仍自行导航。                                                       | 可复用 Command 的列表语义并关闭其默认过滤，保留已有 fuzzy 排序、匹配高亮和稳定 ID。必须覆盖 settling 时排队 Enter、Tab 切过滤、空查询 Backspace 返回和输入法。若不能等价覆盖，保留当前业务导航；slash/mention 不应迁成会抢输入焦点的 DropdownMenu。 |
| P2                 | `features/threads/sidebar.tsx`、`features/conversation/timeline-item.tsx`、`features/workbench/file-explorer.tsx`、`features/workbench/file-editor-pane.tsx`、`features/settings/settings-models-section.tsx` 等 | 原生 button 与 Button 混用，常见于行入口、关闭按钮和图标操作。                                                          | 普通动作逐处改用 Button，并显式保留 `type=button`、aria、ref、禁用态及紧凑尺寸。树节点、整行选择和拖拽目标按其语义保留；不要统一施加默认主按钮颜色和高度。                                                                                          |

## 实施顺序

1. 修正基础组件文案和关闭入口，核对主题适配。`styles.css` 未声明按 `.dark` 生效的 `@custom-variant dark`，而组件包含 `dark:` 工具类；需检查生成 CSS 是否仍跟随系统媒体查询。统一到应用选中的主题，再验证 Default 和命名主题。组件里的动画类也应核对是否有实际 CSS 定义，不能因类名存在就认定已生效。
2. 完成四处自绘弹窗和三处原生确认。复用现有 Dialog/AlertDialog，不增加全局弹窗服务。迁移后检查 `ui/dialog-focus.ts` 的全部调用者：`trapDialogFocus` 无调用者后可删除；`App.tsx` 的 `restoreTopmostDialogFocus` 是会话恢复焦点的协调逻辑，须确认 Radix 能完整覆盖后才删除。
3. 完成菜单。先迁移独立的 ReviewMenu，再迁移定时任务和侧栏菜单；逐处移除被替代的定位、外部点击、Escape 和子菜单定时器。Portal 移到 body 后，调整依赖祖先元素的 CSS 和 DOM 查询。
4. 完成普通 Select、分段选择、页签和提示。保持 Workbench reducer、文件标签状态、PTY owner 与原持久化路径不变。
5. 整理剩余按钮、普通多行输入和业务列表。命令面板/composer 单独验收；状态机语义不因为组件统一而重写。

每批替换后删除失去调用者的样式和交互逻辑。保留业务布局 CSS，不把“迁移到基础组件”扩展成全量 Tailwind 重写。`components/ui` 放交互基元，`features/*` 放业务组合；`src/ui` 中的图标、主题、语法高亮和 pane resize 等仍有独立职责，无需整目录迁移。

## 验收方案

按[CI 基线](../ci-baseline.md)执行格式、Lint、类型和架构检查；普通控件不为标签替换新增测试。提交前另核对 `.editorconfig`。

涉及删除、异步弹窗、会话切换及完整交互流程时，在真实可见 Electron 中复用现有用例，并只为缺少的高危或异常场景补充覆盖：

| 批次           | 可复用的 `apps/desktop/tests/core/` 用例                                                                                                                 | 必须观察的结果                                                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 弹窗和确认     | `tree-command.spec.ts`、`extensions-dialogs.spec.ts`、`custom-endpoints.spec.ts`、`scheduled-tasks.spec.ts`、`worktrees.spec.ts`、`mcp-settings.spec.ts` | Tab 不逃出、Escape/遮罩符合关闭规则；保存失败保留输入；取消不执行；切换会话后不误操作新目标；扩展请求只回应一次。删除验证使用专用 fixture worktree。 |
| 菜单           | `sidebar-ordering.spec.ts`、`worktrees.spec.ts`、`review-ux.spec.ts`、`review-scopes.spec.ts`、`scheduled-tasks.spec.ts`                                 | 方向键/Enter/Escape、焦点返回、子菜单碰撞、切换分组和 scope；Portal 后点击不被错误判为外部点击。                                                     |
| 页签           | `workbench-tabs.spec.ts`、`integrated-terminal.spec.ts`、`terminal-diff-layout.spec.ts`                                                                  | 关闭相邻/最后页签、chooser、隐藏/恢复、跨任务布局；切换或关闭工具视图不误杀 PTY，明确关闭 shell 仍终止它。                                           |
| 输入和命令     | `command-palette.spec.ts` 及桌面验证 skill 对应会话流程                                                                                                  | IME 不误发送；排队 Enter、steer、slash/mention 和延迟结果选择保持原行为；草稿与阅读位置保留。                                                        |
| 共用主题和语言 | `settings-language.spec.ts`、`settings-appearance.spec.ts`                                                                                               | 中英切换、长文案溢出、应用主题与系统主题不同时的颜色、焦点环和遮罩层级；语言切换不重挂载草稿或工具。                                                 |

执行时先阅读[桌面验证 skill](../../.agents/skills/verify-pi-gui/SKILL.md)，Windows 验证同时遵循对应 Windows skill，并按[隔离验证指南](../guides/isolated-desktop-verification.md)把构建、临时 profile、日志及截图放在新的 `records/` 子目录。现有测试文件是复用入口，迁移时仍需检查它们是否真正断言了上述行为；文件存在不代表场景已覆盖。

## 版本修改记录

| 版本 | 修改时间             | 修改内容                                                 |
| ---- | -------------------- | -------------------------------------------------------- |
| v1   | 2026-10-19 10:52 CST | 创建基础组件剩余迁移清单、源码依据、实施顺序与验收方案。 |
