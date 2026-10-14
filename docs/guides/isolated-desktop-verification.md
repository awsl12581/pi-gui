# 隔离桌面验证构建

> 最后修改时间：2026-10-14 17:11 CST
> 文档版本：v1
> 修改说明：说明 Windows 下隔离 Electron 构建和 Playwright 输出的方法。

临时验证构建不能覆盖 `apps/desktop/out`，也不能更新已安装应用。使用仓库的 Electron Vite 配置，并在独立配置文件中给 main、preload 和 renderer 指定同一独立 `out` 目录下的三个子目录。配置中的相对路径以构建命令的工作目录为准；建议使用绝对路径。

开发构建会从输出位置解析外部桌面依赖。将独立构建根目录放在 `apps/desktop/.artifacts/<本次运行>/`，以便沿父目录找到 `apps/desktop/node_modules`。仅修改启动入口或 cwd 不能解决仓库根目录下构建的依赖缺失。

保留三个输出目录的相对关系。main 通过 `../../resources/icon.png` 读取窗口图标，因此独立构建根目录也需要对应的 `resources/icon.png`。复制仓库图标即可，不要修改正式资源。

Windows 无法运行现有 shell runner 时，构建成功后直接调用同一 Playwright 配置：

```powershell
$env:PI_APP_TEST_ENTRY = 'D:/GithubProject/pi-gui/apps/desktop/.artifacts/verification/out/main/main.js'
$env:PI_APP_TEST_OUTPUT_DIR = 'D:/absolute/unique-playwright-results'
$env:PI_APP_TEST_MODE = 'background'
$env:PI_APP_REAL_AUTH = '0'
pnpm exec playwright test -c apps/desktop/playwright.config.ts apps/desktop/tests/core/persistence.spec.ts
```

`PI_APP_TEST_ENTRY` 只改变测试启动入口；默认仍从 `apps/desktop` 启动。`PI_APP_TEST_OUTPUT_DIR` 指定本次独立输出位置；默认仍为配置目录下的 `test-results`。每次运行使用新目录，避免 Playwright 清空已有证据。测试 profile 和工作区仍由现有 Electron helper 创建并隔离。

构建日志和测试日志须完整保留。这条路径验证的是 fixture-backed Electron，不证明真实 provider、原生系统操作或安装包行为。已有日志、截图和临时产物不在清理范围。

## 版本修改记录

| 版本 | 修改时间             | 修改内容                                                           |
| ---- | -------------------- | ------------------------------------------------------------------ |
| v1   | 2026-10-14 17:11 CST | 记录独立构建目录、测试入口和输出路径，以及 Windows Core 验证边界。 |
