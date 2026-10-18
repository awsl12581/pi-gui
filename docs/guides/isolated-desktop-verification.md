# 隔离桌面验证构建

> 最后修改时间：2026-10-18 20:22 CST
> 文档版本：v2
> 修改说明：将构建、依赖解析入口、临时目录和测试输出统一到 records，补充配置示例与验证边界。

临时验证不能覆盖 `apps/desktop/out` 或更新已安装应用。每次运行先在 `records/` 创建独立目录，保存 `config.md`、构建配置、日志、退出码、测试输出及 `analysis.md`。以下为 fixture-backed Electron 的隔离方法，示例命令不表示已在本轮或全部平台执行通过。

## 目录与依赖解析

使用当前仓库已安装、符合环境基线的 Node 24–26 和 pnpm 10.25.0。先核对 [CI 基线](../ci-baseline.md)及 shared package 的构建状态；需要更新 shared 产物时单独记录命令与结果。本指南不调用会重建默认 `out` 的 `pnpm build` 或 `test:e2e:runner`。

从仓库根目录创建本轮目录。下面使用 PowerShell；macOS/Linux 使用等价的环境变量设置和目录符号链接。

```powershell
$repo = (Get-Location).Path
$run = Join-Path $repo ("records/" + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-desktop-' + [guid]::NewGuid().ToString('N').Substring(0, 6))
New-Item -ItemType Directory -Path $run -ErrorAction Stop
New-Item -ItemType Directory -Path "$run/tmp", "$run/resources" -ErrorAction Stop
$env:PI_GUI_VERIFY_RUN = $run
$env:TMPDIR = "$run/tmp"
$env:TMP = "$run/tmp"
$env:TEMP = "$run/tmp"
New-Item -ItemType Junction -Path "$run/node_modules" -Target "$repo/apps/desktop/node_modules" -ErrorAction Stop
Copy-Item "$repo/apps/desktop/resources/icon.png" "$run/resources/icon.png" -ErrorAction Stop
```

启动构建前，在 `$run/config.md` 记录时间、目的、代码版本、系统/架构、Node/pnpm 版本、输入、命令、上述路径和本次选定的用例。Markdown 配置与分析按 AGENTS.md 保留元数据和修改记录。

`run/node_modules` 只提供应用现有依赖的解析入口；Windows junction 不需要创建目录 symlink 的权限。macOS/Linux 可从仓库根目录执行 `ln -s "$PWD/apps/desktop/node_modules" "$PI_GUI_VERIFY_RUN/node_modules"`。不得通过这个链接安装依赖、生成缓存或写入文件。配置中的缓存目录应显式位于 run 内。

主进程从 `out/main/main.js` 向父目录查找依赖，因此 run 下的链接可复用桌面 workspace 的依赖关系，避免把构建移到 records 后无法解析外部包。图标相对主入口为 `../../resources/icon.png`，故复制到 run/resources。main、preload 和 renderer 的相对结构必须保持为 `out/main`、`out/preload`、`out/renderer`。

## 独立 Electron Vite 配置

将以下内容保存到本轮 `$run/electron.vite.config.mjs`，不修改仓库正式配置：

```js
import path from "node:path";
import baseConfig from "../../apps/desktop/electron.vite.config.mjs";

export default async function isolatedConfig(env) {
  const run = process.env.PI_GUI_VERIFY_RUN;
  if (!run || !path.isAbsolute(run)) {
    throw new Error("PI_GUI_VERIFY_RUN must be this run's absolute directory");
  }
  const base = typeof baseConfig === "function" ? await baseConfig(env) : baseConfig;
  const isolated = {};
  for (const name of ["main", "preload", "renderer"]) {
    isolated[name] = {
      ...base[name],
      cacheDir: path.join(run, "cache", name),
      build: {
        ...base[name].build,
        outDir: path.join(run, "out", name),
        emptyOutDir: true,
      },
    };
  }
  return isolated;
}
```

配置沿用仓库输入、插件、alias、externalize 规则与 renderer root，只替换输出和缓存位置。此相对 import 要求配置文件直接位于 `records/<run>/`；不要移到更深目录后继续照抄。

从仓库根目录构建，保留全部输出和退出码，失败立即停止：

```powershell
pnpm --dir apps/desktop exec electron-vite build --config "$run/electron.vite.config.mjs" 2>&1 | Tee-Object -FilePath "$run/build.log"
$buildExit = $LASTEXITCODE
Set-Content -Path "$run/build.exit" -Value $buildExit
if ($buildExit -ne 0) { throw "Isolated build failed; inspect $run/build.log" }
if (!(Test-Path "$run/out/main/main.js")) { throw 'Missing isolated main entry' }
```

## 独立 Playwright 运行

构建成功后，直接调用现有 Playwright 配置。以下用 persistence 作为定向示例，受影响流程应按仓库验证规范选择用例：

```powershell
$env:PI_APP_TEST_ENTRY = "$run/out/main/main.js"
$env:PI_APP_TEST_OUTPUT_DIR = "$run/playwright-persistence"
$env:PI_APP_TEST_MODE = 'background'
$env:PI_APP_TEST_LANE = 'core'
$env:PI_APP_REAL_AUTH = '0'
pnpm exec playwright test -c apps/desktop/playwright.config.ts apps/desktop/tests/core/persistence.spec.ts 2>&1 | Tee-Object -FilePath "$run/persistence.log"
$testExit = $LASTEXITCODE
Set-Content -Path "$run/persistence.exit" -Value $testExit
if ($testExit -ne 0) { throw "Electron verification failed; inspect $run/persistence.log" }
```

`PI_APP_TEST_ENTRY` 只替换启动入口；现有 helper 默认仍以 `apps/desktop` 为 cwd。`PI_APP_TEST_OUTPUT_DIR` 控制 Playwright 输出，TMPDIR/TMP/TEMP 控制 helper 通过系统 `tmpdir()` 创建的 profile 和临时工作区。启动前必须同时配置，不能先产生文件再归档。任何后续运行都使用新目录，避免 Playwright 清空已有输出。

若 macOS/Linux 的 Unix socket 因路径过长启动失败，保留失败 run，另建更短且唯一的 `records/<run>/` 路径并记录原因，再设置对应临时目录。不要改写 Chord 协议或把 scratch 放回 `.artifacts` 或系统临时目录来绕过。Windows/Linux 以及原生通知等功能仍需对应平台的依赖和专项验证，不能由本例证明。

结束后检查日志与退出码，在 analysis.md 写明结果、失败场景、证据路径和未覆盖范围。关闭本轮拥有的 Electron 进程，保留 profile、截图、日志和临时产物。fixture-backed Electron 不证明真实 provider、原生 OS 焦点/权限或安装包行为；真实对话参考[桌面验证 skill](../../.agents/skills/verify-pi-gui/SKILL.md)，使用其中脚本前核对其实际输出路径仍满足当前 AGENTS.md。

## 版本修改记录

| 版本 | 修改时间             | 修改内容                                                                         |
| ---- | -------------------- | -------------------------------------------------------------------------------- |
| v1   | 2026-10-14 17:11 CST | 记录独立构建目录、测试入口和输出路径，以及 Windows Core 验证边界。               |
| v2   | 2026-10-18 20:22 CST | 将构建、依赖解析入口、临时目录和测试输出统一到 records，补充配置示例与验证边界。 |
