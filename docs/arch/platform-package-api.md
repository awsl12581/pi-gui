# Platform package 对外能力与接口设计

> 最后修改时间：2026-10-14 17:50 CST
> 文档版本：v1
> 修改说明：定义平台包的公开能力、参数语义、结果与错误契约，以及跨平台验收要求。

## 1. 状态和目标

本文是 `@pi-gui/platform` 的设计提案，尚未实现。文中的签名是拟定的完整公开接口，不代表仓库已有这些导出，也不代表 Windows、macOS 和 Linux 验证已经通过。

包放在 `packages/platform/`，先作为 private workspace package 使用。这里的“对外”是指对调用模块公开；npm 发布不属于本次设计的完成条件。

调用者描述要完成的操作，包负责处理宿主差异。写文件传路径和内容，运行程序传程序名、参数和工作目录，选择 shell 传可选的程序路径。调用者不需要提供操作系统枚举、平台上下文、能力 token、预解析句柄或重复的路径身份。

设计的成功标准：

- 每个公开函数都有固定职责，参数名称、单位、默认值和合法取值可以直接查到。
- 参数来自调用者已有的信息；由一个参数能够推导的信息不要求重复提交。
- 可选参数可以独立设置，不存在“打开 A 才能传 B”或“传 B 时必须同时传 C”的配置组合。
- 同一操作在支持的系统上具有相同的可观察结果；系统确实无法提供的保证明确返回或失败。
- 成功、能力不可用和执行失败分开表达，文件写入的错误能说明替换是否已经发生。
- 原子写入、路径包含性和进程参数的语义不能因平台适配而变弱。

## 2. 依赖和运行边界

包使用 Node 标准库，依赖方向如下：

```text
catalogs ──────────┐
pi-sdk-driver ────┼──> @pi-gui/platform ──> Node 标准库
Electron main ────┘
```

包不依赖 Electron、React、catalogs、session-driver 或 pi-sdk-driver。renderer 不得运行时导入它，桌面仍通过 narrow preload API 暴露具体产品操作。若 renderer 需要显示某个能力，由 desktop contracts 定义该产品所需的快照，不转发整个 package。

目标系统是 Windows、macOS 和 Linux，Node 范围与仓库基线一致：`>=22.19.0 <26`。其他系统暂不属于支持范围，调用入口返回 `unsupported-platform` 错误；不得自动按 Linux 处理。

## 3. 公开能力总表

统一从 `@pi-gui/platform` 根入口导入。初始公开接口限定如下，不导出内部平台策略或测试注入函数。

| 公开函数                     | 调用者的意图                   | 主要输入              | 返回                               |
| ---------------------------- | ------------------------------ | --------------------- | ---------------------------------- |
| `writeFileAtomically`        | 用完整内容替换一个文件         | 目标路径、内容        | 替换成功后的目录同步状态           |
| `resolveExistingPath`        | 得到已存在路径的真实绝对路径   | 路径                  | 宿主格式的绝对路径                 |
| `isPathInsideDirectory`      | 判断已有对象是否位于某目录之下 | 对象路径、目录路径    | 布尔值                             |
| `createSymbolicLink`         | 创建真正的符号链接             | 目标路径、链接路径    | 无返回值                           |
| `probeDirectoryCapabilities` | 检查当前身份在某目录能做什么   | 目录路径              | 文件链接、目录链接和目录同步能力   |
| `findExecutable`             | 查找可直接启动的程序           | 程序名或程序路径      | 绝对路径或 `null`                  |
| `runProcess`                 | 执行程序并收集输出             | 程序、argv、工作目录  | 退出码与原始输出字节               |
| `resolveShell`               | 得到一个可启动的交互 shell     | 可选 shell 名称或路径 | shell 类型、程序路径、交互启动参数 |
| `runShellCommand`            | 在指定 shell 中执行一段命令    | 命令文本、工作目录    | 退出码与原始输出字节               |

已有标准库操作如 `join`、`basename`、`readFile` 不再另起包装。Git 业务、备份轮转、JSON schema、会话租约及 PTY 进程所有权不属于该包。

## 4. 通用参数约定

### 4.1 路径

除程序查找和 shell 选择允许程序名外，所有路径参数均为**当前宿主的绝对文件系统路径**。不接受相对路径、file URL、`~` 展开或 `C:folder` 这类 Windows 驱动器相对路径；Windows 的盘符绝对路径和 UNC 路径均可输入。

绝对路径通常直接来自 folder picker、catalog 或现有 workspace。需要拼接相对资源时使用 `node:path.join(workspacePath, relativeFile)`，不需要申请 package 专有的路径对象。

路径始终保留原有大小写和字符，不自动转换分隔符或转为小写。展示格式、Git 路径格式和文件系统身份分别由各自使用者处理。包含性判断遵循真实文件系统，不能仅凭 `win32` 判断路径是否忽略大小写。

路径参数不能为空或包含 NUL。两个路径参数代表两个独立对象，不要求调用者预先计算它们之间的关系。例如包含性检查由包自己判定；符号链接的类型由目标对象推导。

### 4.2 内容、程序和命令

- 文件内容和 stdin 接受 `string | Uint8Array`。字符串以 UTF-8 编码，字节数组原样处理。调用者在 Promise 完成前不得修改传入的字节数组。
- 程序名是不带路径分隔符的名称，例如 `git`。程序路径必须是绝对路径。包含分隔符的相对程序路径被拒绝。
- `argv` 中每个字符串就是一个程序参数，不要加 shell 引号。例如传 `"a b.txt"` 这个原始字符串，而不是包含额外双引号的字符串。
- shell 命令是所选 shell 的源代码，不是跨平台脚本。包不会把 `export` 翻译成 `set`，也不会把 `printf` 翻译成 `echo`。

### 4.3 环境变量

`env` 是对当前进程环境的覆盖，不是必须重建的完整环境。值为字符串表示设置，值为 `undefined` 表示删除。父进程环境取调用时快照，包不修改 `process.env`。

Windows 按环境变量名称不区分大小写的规则合并。单次输入同时包含 `Path` 和 `PATH` 之类冲突键时，报 `invalid-argument`，不依赖对象遍历顺序选择一个。覆盖后的 PATH 用于本次程序查找和执行，调用者不用提前解析同一个程序再传回来。

包不自动记录环境变量、命令文本或 stdin。日志策略由调用者负责。

输入的环境变量名必须非空，不能包含 NUL 或 `=`；字符串值不能包含 NUL，空字符串是合法值。`argv` 元素可以为空字符串，不能包含 NUL。文件内容和 stdin 的字节输入可以包含 NUL。非法参数统一报 `invalid-argument`，不会截断输入后继续操作。

## 5. 文件安全替换

```ts
export interface AtomicWriteResult {
  readonly directorySync: "completed" | "unsupported";
}

export function writeFileAtomically(
  filePath: string,
  contents: string | Uint8Array,
): Promise<AtomicWriteResult>;
```

调用者只提供最终文件路径和最终内容。临时文件名、所在目录、平台选择和替换策略全部在包内决定，没有 `atomic`、`overwrite`、`fallback` 等改变该函数基本保证的开关。

行为契约：

1. 自动创建缺失的父目录。已有目标必须是普通文件；最终目标为符号链接或目录时拒绝。父目录的符号链接允许存在，最终写入真实父目录。
2. 在目标的同一真实目录中独占创建临时文件，写入全部内容并同步文件，然后用支持原子替换的操作安装到目标路径。
3. 目标尚不存在时创建它。目标已经存在时，读取者在正常运行期间只能看到旧的完整内容或新的完整内容，不能因本函数的替换步骤看见目标消失。
4. 不通过删除目标文件再 rename 实现降级。平台或文件系统无法满足替换保证时失败，保留原目标。
5. 同一进程内相同目标的写入按调用顺序串行执行，前一次失败不阻塞后续调用。跨进程独立替换可以覆盖彼此，最终内容来自某一次完整的成功写入；这不是读改写事务或跨进程锁。
6. 已有文件的 POSIX 权限位保留；Windows 不把 POSIX mode 当作 ACL。ACL、所有者、扩展属性和时间戳不承诺完全保留，需要这些能力的调用者不能直接迁移到该接口。
7. 替换后尝试同步父目录。平台明确不支持目录同步时成功返回 `unsupported`，此时不承诺断电后的目录项持久性。真实 I/O 失败仍抛错，不一律当作“不支持”。
8. 包只回收自身本次独占创建的临时文件；无法回收时错误包含残留临时路径。不会清理其他临时文件、备份或历史数据。

Windows 文件短暂被占用时允许内部有界重试，累计等待最多 1 秒。仅重试确认属于临时争用的错误，不把所有 EPERM 都当作锁；权限不足、只读目标和明确不支持的操作直接失败。重复错误不触发 unlink 降级。调用者没有重试次数参数，也不应无条件重复写入。

支持承诺先在本地 NTFS、APFS 和 ext4 上验收。网络文件系统及其他文件系统需要单独证据；系统名称相同不代表具有相同的原子性或持久性。明确检测到不支持时返回 `unsupported-operation`，不得声称平台包已验证所有文件系统。

校验当前 JSON 格式、生成 `.bak`、保留 `.corrupt` 以及决定旧格式拒绝策略，仍属于 persistence owner。平台包不读懂文件内容，也不会迁移旧数据。

```ts
const result = await writeFileAtomically(
  join(profilePath, "catalogs.json"),
  JSON.stringify(currentCatalog, null, 2) + "\n",
);
// directorySync 描述同步结果；函数已经完成了文件替换。
```

文件错误使用第 10 节的 `AtomicWriteError`，调用者能区分“未替换”“已替换后同步失败”和“无法确定”。Promise reject 不必然意味着文件仍是旧内容。

## 6. 真实路径与包含性

```ts
export function resolveExistingPath(path: string): Promise<string>;

export function isPathInsideDirectory(path: string, directoryPath: string): Promise<boolean>;
```

`resolveExistingPath` 解析符号链接并返回宿主格式的真实绝对路径。路径不存在报 `not-found`；不把“还不存在的路径”包装成已验证的真实路径。

`isPathInsideDirectory` 的两个参数都必须存在，第二个必须是目录。它解析链接后判断严格的目录后代关系。对象与目录相同返回 `false`；Windows 不同盘符或不同 UNC share 返回 `false`。名称前缀相似不是包含关系，例如 `repo-other` 不在 `repo` 内。

目录内指向外部的链接返回 `false`；目录外指向内部的链接按真实目标返回 `true`。这是“真实目标的位置”语义。需要拒绝路径中的所有链接时，调用者需要更严格的安全操作，不能把此函数结果当作“原路径没有链接”的证明。

权限错误和读取失败抛错，不返回 `false` 掩盖无法判定。结果是检查时刻的关系，不保证后续文件访问免受并发路径替换影响；不作为不受信任用户可修改目录中的原子安全打开接口。

```ts
const assetPath = join(extensionBuildPath, requestedRelativePath);
if (!(await isPathInsideDirectory(assetPath, extensionBuildPath))) {
  throw new Error("Asset resolves outside the extension build");
}
```

该示例只展示真实目标检查。extension owner 仍负责相对请求字段校验、服务期间的链接安全和资源生命周期。

## 7. 符号链接与目录能力

```ts
export type CapabilitySupport = "supported" | "unsupported" | "permission-denied";

export interface DirectoryCapabilities {
  readonly fileSymbolicLinks: CapabilitySupport;
  readonly directorySymbolicLinks: CapabilitySupport;
  readonly directorySync: CapabilitySupport;
}

export function probeDirectoryCapabilities(directoryPath: string): Promise<DirectoryCapabilities>;

export function createSymbolicLink(targetPath: string, linkPath: string): Promise<void>;
```

`probeDirectoryCapabilities` 必须接收实际使用的已有目录，结果只描述当前进程身份在该目录所属文件系统上的能力。它会在该目录创建独占探测子目录及探测文件，尝试操作，再只移除自己创建的对象。因此这是有写入副作用的探测，不能在只读启动检查中悄悄调用。

没有创建探测目录权限时报 `permission-denied` 错误；目录不存在、目录无效、磁盘满或探测清理失败同样抛错。探测顺利执行后，某项操作因权限被拒绝才将该项标为 `permission-denied`，确认不支持才标为 `unsupported`。不得把所有异常合并成“系统不支持”。

不提供全局 `supportsSymlinks` 布尔值，不按平台名永久缓存结果。测试可以依据自己的 fixture 目录探测结果明确说明未覆盖的原因；能力不可用不算对应产品验证通过。

`createSymbolicLink` 的目标必须已经存在且是普通文件或目录，链接父目录必须存在，链接位置必须尚不存在。包根据目标推导 Windows 所需的链接类型，调用者不传 `type`。创建真正的符号链接；权限不足时报错，不改建 junction、不复制目标，也不覆盖已有链接。断开的链接创建不属于这个接口的能力。

```ts
const capabilities = await probeDirectoryCapabilities(testDirectory);
// 生产操作可以直接尝试；不要求先 probe 再把结果传给 createSymbolicLink。
await createSymbolicLink(existingFilePath, newLinkPath);
```

## 8. 程序查找和执行

```ts
export interface ExecutableSearchOptions {
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
}

export function findExecutable(
  executable: string,
  options?: ExecutableSearchOptions,
): Promise<string | null>;

export interface ProcessOptions {
  readonly cwd: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly stdin?: string | Uint8Array;
  readonly timeoutMs?: number;
  readonly maxOutputBytes?: number;
  readonly signal?: AbortSignal;
}

export interface ProcessResult {
  readonly exitCode: number;
  readonly stdout: Buffer;
  readonly stderr: Buffer;
}

export function runProcess(
  executable: string,
  argv: readonly string[],
  options: ProcessOptions,
): Promise<ProcessResult>;
```

`findExecutable` 从有效 PATH 查找程序名，或检查给定的绝对路径。找到可直接启动的对象返回绝对路径；找不到返回 `null`；权限或文件系统异常抛错。POSIX 校验可执行权限。Windows 查找本机可执行文件，名称没有扩展名时依次尝试 `.exe`、`.com`；`.cmd`、`.bat` 和 shell 内置命令返回 `null`，不依赖 PATHEXT 将它们当作本机程序。

搜索选项 `cwd` 默认是当前进程工作目录，用于解释 PATH 中明确出现的相对目录或空项，不会隐式把该目录加入 PATH。`runProcess` 内部查找时使用自己必填的 cwd，因此查找和执行的路径基准一致。

`runProcess` 自行使用本次有效环境解析程序，不要求先调用 `findExecutable`。`cwd` 必填且必须是已有目录，避免操作悄悄发生在启动 Codex 或 Electron 时的目录里。

参数数组直接交给子进程，不经过 shell，不自动插入引号。包不把任意程序的参数再拼成命令字符串。Windows `.cmd`、`.bat` 输入报 `unsupported-operation`；需要执行脚本或 shell 内置命令时明确调用 `runShellCommand`。

选项的固定语义：

| 参数             | 默认值             | 语义                                                                     |
| ---------------- | ------------------ | ------------------------------------------------------------------------ |
| `cwd`            | 无，必填           | 子进程的工作目录，不用于改变父进程 cwd                                   |
| `env`            | 无覆盖             | 当前环境的覆盖和删除，规则见第 4 节                                      |
| `stdin`          | 空输入并关闭 stdin | 字符串按 UTF-8 编码；不会继承父进程交互输入                              |
| `timeoutMs`      | `30_000`           | 从本次调用开始到操作结束的总时限，单位毫秒；必须为正整数，`0` 不表示无限 |
| `maxOutputBytes` | `8 * 1024 * 1024`  | stdout 与 stderr 累计保留字节上限；必须为正整数                          |
| `signal`         | 无取消信号         | 已取消时不启动程序，运行中取消时终止本次直接子进程                       |

`stdout`、`stderr` 保存原始字节，适合 NUL 分隔的 Git 输出和二进制结果。读取文本时调用者直接使用 `.toString("utf8")`；跨 stdout/stderr 不承诺全局输出顺序。

程序正常退出，无论退出码为 0 或非 0，都返回 `ProcessResult`。非 0 的业务含义由调用者判断，例如某些 Git 命令用退出码表示存在差异。

启动失败、超时、取消、输出超限和被外部信号中断使用 `ProcessError`。超限不返回一个伪装成完整结果的截断输出；错误中保留已收集的字节。达到截止条件后关闭本次管道、终止并回收直接子进程；无法终止时明确报 `termination-failed`，不伪报取消完成。

该接口面向有限时长的批处理程序，不管理守护进程或任意后代进程树。Git、Pi 和 PTY 的长期生命周期继续由现有 owner 管理；要求整棵进程树终止的场景在另行定义并验证前不能迁移到此接口。

```ts
const result = await runProcess("git", ["status", "--porcelain=v1", "-z"], {
  cwd: workspacePath,
  timeoutMs: 10_000,
});
if (result.exitCode !== 0) {
  throw new Error(result.stderr.toString("utf8"));
}
// result.stdout 仍是 NUL 分隔的原始数据。
```

## 9. Shell 选择和命令执行

```ts
export type ShellKind = "cmd" | "powershell" | "sh" | "bash" | "zsh";

export interface ShellLaunch {
  readonly kind: ShellKind;
  readonly executable: string;
  readonly interactiveArguments: readonly string[];
}

export function resolveShell(shellPath?: string): Promise<ShellLaunch>;

export interface ShellCommandOptions extends ProcessOptions {
  readonly shellPath?: string;
}

export function runShellCommand(
  command: string,
  options: ShellCommandOptions,
): Promise<ProcessResult>;
```

`shellPath` 可直接传设置里的程序名或绝对路径。不再要求调用者同时传 `shellKind`、命令开关、平台枚举或是否登录模式。

未指定 `shellPath` 时，Windows 优先使用非空 `ComSpec`，否则查找 `cmd.exe`；macOS、Linux 优先使用非空 `SHELL`，否则分别使用 `/bin/zsh`、`/bin/bash`。选中的环境配置无效时报错，不悄悄回退到另一种 shell。

支持 cmd、Windows PowerShell/PowerShell（`powershell.exe`、`pwsh`）、sh、bash 和 zsh 的常规程序身份。包负责确定程序类型和相应启动参数。识别不了的自定义 shell 或包装脚本报 `unsupported-shell`，不猜测其命令语法。

`resolveShell` 返回供 PTY owner 使用的交互启动配置：cmd 使用 `/D` 禁用 AutoRun，PowerShell 使用 `-NoLogo`，sh/bash/zsh 使用 `-i`。没有命令执行参数，也不强制 login shell、不绕过执行策略。用户自行配置 shell 的普通启动配置仍可能执行自己的初始化文件。

`runShellCommand` 内部完成同样的 shell 选择，再使用对应的有限命令执行入口；调用者直接提供一段该 shell 支持的命令。`ProcessOptions` 中每个选项独立适用。默认 shell 名称选择使用当前进程的 ComSpec/SHELL；`env` 不改变这一默认名称，需要选择另一种 shell 时直接用 `shellPath`。显式传空 shell 名称或空白命令报 `invalid-argument`，只有省略 shellPath 才表示使用默认选择。

有限命令入口为 cmd 的 `/D /S /C`、PowerShell 的 `-NoLogo -NonInteractive -Command`，以及 sh/bash/zsh 的 `-c`。命令是一个完整的逻辑参数；包负责 Windows 启动层的正确转义，不要求调用者在 command 外再加一层引号。程序查找使用本次有效环境，调用者可直接在 env 中指定 PATH，而不需要提前解析 shell 路径。

命令文本原样提交，不拼接 cwd、环境设置语句或 stdin。工作目录和环境通过进程启动选项设置。包含未信任数据的参数应优先用 `runProcess` 的 argv，而不是插值到 shell 源代码。

```ts
// Terminal owner 直接取得可供 node-pty 启动的配置。
const shell = await resolveShell(settings.integratedTerminalShell || undefined);
// owner 使用 shell.executable 和 shell.interactiveArguments；仍持有 PTY 生命周期。

// 调用者明确选择 PowerShell，command 的语法因此固定。
const result = await runShellCommand("Get-Location", {
  cwd: workspacePath,
  shellPath: "pwsh.exe",
});
```

测试中的 `printf`、`pwd`、`export` 需要按实际 shell 改写，或用独立程序代替。不增加 `buildUniversalCommand` 之类试图翻译任意脚本的接口。

## 10. 错误契约

```ts
export type PlatformErrorCode =
  | "invalid-argument"
  | "unsupported-platform"
  | "unsupported-operation"
  | "unsupported-shell"
  | "not-found"
  | "already-exists"
  | "permission-denied"
  | "busy"
  | "io-failed"
  | "spawn-failed"
  | "timed-out"
  | "aborted"
  | "output-limit-exceeded"
  | "process-interrupted"
  | "termination-failed";

export class PlatformError extends Error {
  readonly code: PlatformErrorCode;
  readonly operation: string;
  readonly systemCode?: string;
  readonly cause?: unknown;
}

export class AtomicWriteError extends PlatformError {
  readonly filePath: string;
  readonly replacement: "not-applied" | "applied" | "unknown";
  readonly temporaryPath?: string;
}

export class ProcessError extends PlatformError {
  readonly pid?: number;
  readonly stdout: Buffer;
  readonly stderr: Buffer;
}
```

错误类由 package 构造。调用者使用公开类型和 `code` 分支，不解析操作系统的本地化错误文案。`systemCode` 保留系统原始错误码，例如 `EPERM`；跨平台含义由 `code` 表达。没有可靠证据区分锁与权限问题时不能随意把 EPERM 映射成 `busy`。

`operation` 是第 3 节公开操作的函数名，用于定位出错入口，不作为新增平台配置。异常可能暴露文件路径，调用者展示和记录时遵守自己的数据边界。

`AtomicWriteError.replacement` 精确定义如下：

| 值            | 包对本次写入的判断                           | 调用者处理                                               |
| ------------- | -------------------------------------------- | -------------------------------------------------------- |
| `not-applied` | 本次替换确定没有发生；其他进程仍可能修改目标 | 报错，保留恢复路径；不要据此推断目标仍等于之前读取的版本 |
| `applied`     | 新内容已安装，后续同步等步骤失败             | 不无条件重放；说明保存已发生但后续步骤失败               |
| `unknown`     | 无法可靠判断替换结果                         | 停止自动写入，重新读取并交给 owner 判定                  |

`temporaryPath` 只在本次临时文件无法回收时提供。`ProcessError.pid` 在子进程已经启动后提供，用于识别本次进程，不能据此推断它仍在运行。`stdout/stderr` 始终存在，可以为空；它们是部分输出，不能用来声称命令成功。取消先于调用时同样返回 `ProcessError`，code 为 `aborted`，输出为空。

| 操作                         | 需要直接处理的结果或错误                                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 所有操作                     | 非法参数为 `invalid-argument`；未支持的宿主为 `unsupported-platform`                                                                    |
| `writeFileAtomically`        | 链接/目录目标为 `unsupported-operation`；权限为 `permission-denied`；争用重试耗尽为 `busy`；其他 I/O 为 `io-failed`，均携带 replacement |
| 两个路径操作                 | 缺失对象为 `not-found`；权限为 `permission-denied`；第二参数非目录为 `invalid-argument`                                                 |
| `createSymbolicLink`         | 缺失目标/父目录为 `not-found`；链接位置已存在为 `already-exists`；权限和能力限制分别报错                                                |
| `probeDirectoryCapabilities` | 顺利完成的探测返回每项能力；无法完成探测或清理时抛错，不返回成功快照                                                                    |
| `findExecutable`             | 找不到可直接执行对象返回 `null`；显式路径指向无执行权限的对象为 `permission-denied`；PATH 中不可执行候选跳过，目录读取异常仍报告        |
| `runProcess`                 | 非 0 正常退出返回 exitCode；缺失程序为 `not-found`；创建子进程失败为 `spawn-failed`，运行中失败使用 ProcessError                        |
| `resolveShell`               | 未识别的 shell 为 `unsupported-shell`；识别到类型但程序缺失为 `not-found`                                                               |
| `runShellCommand`            | shell 选择错误沿用上述规则；启动/运行错误沿用进程规则                                                                                   |

这张表给出常见分支，不把底层 I/O 故障列举为每个操作的额外配置。所有错误保留 cause，无法可靠分类的系统 I/O 报 `io-failed`。

## 11. 参数心智模型审核

| 容易造成误解的设计                             | 本提案采用的接口                                            |
| ---------------------------------------------- | ----------------------------------------------------------- |
| 先创建 PlatformContext，再拿 token 才能写文件  | 直接 `writeFileAtomically(filePath, contents)`              |
| 传路径、root、canonicalRoot 和 isWindows       | 只传操作需要的路径；真实路径和平台在包内解析                |
| 传 targetPath，同时再填写 file/dir 类型        | 链接类型从已经存在的目标推导                                |
| 先查能力，再传 capability 给每个函数           | 能力探测独立；操作本身直接尝试并报告错误                    |
| 程序名、程序绝对路径和 PATH 必须同时填写       | `runProcess` 接受程序名或绝对路径，自行使用本次有效环境解析 |
| shellPath、shellKind、commandFlag 必须匹配     | 只接受 shellPath，包负责识别和选择启动方式                  |
| 字符串命令、argv、shell 开关混在一个函数里     | `runProcess` 和 `runShellCommand` 分开，输入语义固定        |
| timeout 的 0、负数、undefined 各有特殊模式     | 可选正整数毫秒；不传使用明确默认值                          |
| 一个 portablePath 同时用于展示、Git 和安全判断 | 宿主路径保持原义，转换只发生在实际消费边界                  |

多个参数可以描述同一操作的不同事实，例如目标路径和内容、程序和 argv；不要求调用者把同一个事实拆成多个必须匹配的参数。可选参数仅调整自身含义，不改变其他参数的类型或必要性。

## 12. 平台差异与实际保证

| 场景     | 统一行为                                           | 保留的差异                                           |
| -------- | -------------------------------------------------- | ---------------------------------------------------- |
| 文件替换 | 成功必须是完整内容替换，失败不做删除目标的降级     | 锁、权限、目录同步和文件系统原子性可能不同           |
| 路径     | 使用真实路径判定严格目录后代关系                   | 大小写、盘符、UNC、symlink 和挂载配置取决于文件系统  |
| symlink  | 按实际目录和进程身份探测，创建真正链接             | Windows 权限/开发者模式、文件系统支持可能限制创建    |
| 程序执行 | executable + argv 不经过 shell，输出按字节返回     | 搜索规则和可直接执行对象不同；Windows 批处理需 shell |
| shell    | 返回实际 shell 的启动配置，命令使用该 shell 的语法 | cmd、PowerShell 和 POSIX shell 的语言不同            |
| 能力受限 | 结果或错误明确说明限制                             | 不能将未支持或未覆盖的能力报告成成功                 |

包不会让所有系统拥有相同的能力。它统一调用方式和保证，保留调用者必须知道的能力限制。

## 13. 现有调用者与迁移边界

以下都是实施时的迁移目标，尚未完成：

| 现有位置                                                 | 计划使用能力              | 必须留在当前 owner 的行为                                  |
| -------------------------------------------------------- | ------------------------- | ---------------------------------------------------------- |
| `packages/catalogs/src/node/atomic-write.ts`             | 安全文件替换              | catalog schema、JSON 编码和 catalog 写入协调               |
| `apps/desktop/electron/persistence/atomic-file-write.ts` | 文件替换和目录同步        | `.bak`、`.corrupt`、校验已有数据和备份恢复                 |
| `apps/desktop/electron/platform/terminal-service.ts`     | shell 选择与交互启动配置  | node-pty、窗口/任务归属、终端大小、回放、PTY 关闭          |
| 平台文件和 worktree adapter                              | 真实路径与目录包含性      | checkout 归属、允许访问的范围和 GC 策略                    |
| Git adapter 的有限子进程调用                             | 程序执行                  | Git 环境隔离、命令含义、patch 编解码和 comparison 生命周期 |
| 测试 fixture                                             | 目录能力探测和 shell 类型 | 测试入口、CSS 选择器转义、fixture 数据和结果断言           |

迁移不能只是增加转发包装。每次迁移需核对原实现的保证，删除被完整覆盖的旧实现和平台分支；没有覆盖的生命周期或安全语义留在原 owner。禁止借机重新实现 Pi runtime。

该包不会直接修复全仓格式问题、Playwright CSS 转义或大列表 Diff 未显示。相关问题分别属于格式配置、测试 helper 和 Review/UI；不能用扩大 platform package 职责代替定位。

## 14. 验收与交付

实施前先建立 Windows、macOS、Linux 三系统测试矩阵。mock 平台测试只能证明策略选择，关键保证必须通过实际文件系统和子进程验证。

| 能力         | 必须验证的可观察结果与失败场景                                                                                                    |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| 文件替换     | 首次创建、已有文件替换、并发完整性、持续读取无缺失窗口、权限拒绝、文件占用、同步失败、故障后的原文件保护和 error replacement 状态 |
| 路径         | 含空格和非 ASCII 名称、同目录、相似前缀、内外链接、不存在对象、权限失败；Windows 盘符/UNC及实际大小写配置                         |
| symlink/探测 | 文件链接、目录链接、权限受限、明确不支持、探测失败与清理失败；测试不得把权限失败算作能力通过                                      |
| 程序         | 含空格路径、空参数、引号/反斜杠/NUL 校验、二进制和 NUL 输出、非 0 退出、缺失程序、stdin 关闭、env 删除、超时、取消和输出超限      |
| shell        | 支持系统上的默认 shell、用户指定 shell、实际启动身份、交互参数、有限命令执行和未知 shell 拒绝；PowerShell 未安装时明确记录未覆盖  |
| package 边界 | 所有公开导出可以从 package 根入口导入；renderer runtime 导入被 guard 拒绝，catalogs 无反向依赖                                    |
| 桌面回归     | 真实 Electron 上终端启动/关闭、状态恢复、附件保护和 Worktree profile 隔离；原生权限与安装包另行验证                               |

持续读取测试不能通过容忍缺失文件来获得绿色结果；输出超限测试不能只检查返回了部分输出；包含性测试必须覆盖链接逃逸。文件锁导致的 `EPERM` 需在实际环境复现后分类，不先写宽泛重试。

仓库检查沿用 `pnpm check`，新增 package 时同步 workspace typecheck、typed lint 和 host/renderer guard。实现阶段再补该 package 的实际测试脚本和 baseline 入口，不在包尚不存在时声称这些命令已经可运行。

落地顺序为：文件替换 → shell 配置 → 路径/链接能力 → 有限程序执行。每步先验证核心失败场景，再迁移真实调用者并删除重复实现。公开接口仍以本文件为准，阶段进度应在实施报告中标明，不能把目录已经创建当作能力完成。

## 15. 本文的验证状态

本次交付仅包含接口设计文档。已对照现有 catalogs 写入、desktop persistence、TerminalService 和平台边界检查；没有创建 package、修改运行时实现或执行跨平台验收。

9 个公开操作的 TypeScript 声明与 5 个调用示例已通过严格类型检查，文档通过仓库已安装 Prettier 的格式检查。检查使用 Node v24.21.0，声明和示例的检查输出保留于 `.artifacts/platform-package-doc-check.log`。这只证明声明和示例在类型上成立，不证明运行时行为。

现有 Windows 清理检查暴露了并发 rename 的 EPERM、symlink 权限、POSIX shell 用例和路径选择器问题，作为设计输入。历史失败与验证证据见 [清理报告](../reports/obsolete-design-review.md)。这些证据不证明本文的新接口已经正确实现。

## 版本修改记录

| 版本 | 修改时间             | 修改内容                                                                             |
| ---- | -------------------- | ------------------------------------------------------------------------------------ |
| v1   | 2026-10-14 17:50 CST | 创建平台包公开能力与接口提案，明确参数心智模型、错误语义、迁移边界和三系统验收要求。 |
