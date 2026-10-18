# Chord 0.87 可行性探测记录

> 最后修改时间：2026-10-18 20:18 CST
> 文档版本：v1
> 修改说明：从当前设计文档归档 0.87.0 可行性探测，保留原始结果和证据位置。

本文从原桌面扩展设计文档抽出，记录 Pi/Chord 0.87.0 的前期探测，不是当前 1.2 作者协议或当前版本验收。原文中的工作区外路径仅保留为历史定位信息，本次未访问，存在性未核验。当前实现见[桌面扩展设计](../chord-desktop-extension-design.md)。

## Historical feasibility proof

The installed public packages were used, rather than the cached Pico branch:

| Capability                          | Observed result                                                                                                                         | Design consequence                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Chord services and replicated state | Method calls, hydrate/update subscriptions, immutable snapshots and transaction rollback passed in Node and headless Chrome             | Reuse Chord instead of writing another service/state system                                  |
| Provider replacement                | Existing consumer handle survived replacement; retired provider cleanup and subscriber disposal passed                                  | Use Chord lifecycle inside a live backend host                                               |
| Browser core                        | Bundled and executed without Node globals                                                                                               | Chord can run in a browser frontend                                                          |
| Supplied facet artifact             | Browser-target build still produced CommonJS; direct browser execution failed with `module is not defined`                              | Supply a browser entry/build convention; do not use the Node artifact loader in the renderer |
| Stable Pi extension bootstrap       | An injected Pi EventBus registered a facet from the same extension closure; the extension loaded once; a service call changed its state | A small discovery adapter can connect existing Pi extensions to Chord                        |
| Experimental Pi exports             | Installed `./experimental/plugin` and `./client` imports failed with `ERR_PACKAGE_PATH_NOT_EXPORTED`                                    | Do not build production against those source-only entry points                               |

These pre-implementation probes used a JSON-copying loopback adapter within the browser and an inline Pi extension. They establish Chord feasibility, not proof of the subsequently implemented Electron transport, asset containment or frontend isolation. Keep their evidence separate from the final product gates below.

Evidence scripts and result JSON are retained in `/private/tmp/pi-gui-chord-087-probe-4r9zmy/`: `run-node.mjs`, `run-browser.mjs`, `run-bootstrap.mjs`, `browser-result.json` and `bootstrap-result.json`. Public source: [Chord 0.87.0](https://github.com/earendil-works/pi/tree/v0.87.0/packages/chord), [Coding Agent package exports](https://github.com/earendil-works/pi/blob/v0.87.0/packages/coding-agent/package.json).

## 版本修改记录

| 版本 | 修改时间             | 修改内容                                                       |
| ---- | -------------------- | -------------------------------------------------------------- |
| v1   | 2026-10-18 20:18 CST | 从当前设计文档归档 0.87.0 可行性探测，保留原始结果和证据位置。 |
