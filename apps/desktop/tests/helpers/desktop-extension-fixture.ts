import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, type Page } from "@playwright/test";

export async function installDesktopExtensionFixture(
  workspace: string,
  attackUrl: string,
  helperModulePath = require.resolve("@pi-gui/extension-ui"),
): Promise<void> {
  const directory = join(workspace, ".pi", "extensions", "desktop-security");
  await mkdir(join(directory, "dist"), { recursive: true });
  const contract =
    'import {cell,remote,method} from "@earendil-works/chord";\nimport {Type} from "typebox";\nconst State=Type.Object({value:Type.Number(),activations:Type.Number()});\nconst Counter=remote("security.counter",{version:1,input:Type.Object({}),variants:{default:{state:{state:State},methods:{increment:method(Type.Object({}),State)}}}});';
  await writeFile(
    join(directory, "index.ts"),
    `
${contract}
import { registerDesktopView } from ${JSON.stringify(helperModulePath)};
export default function fixture(pi) {
  let activations = 0;
  registerDesktopView(pi, {
    id: "security", title: "Security fixture", source: import.meta.url,
    frontend: new URL("./dist/desktop.js", import.meta.url),
    backend: () => ({setup(api) {
      api.serve(Counter,(_input,_principal,self)=>{
        const {state}=self.state({state:cell(State,{value:0,activations:++activations})});
        return {kind:"default",state,async increment(_input,context){state.change(context,draft=>{draft.value++});return state.value}};
      },{eager:true});
    }}),
  });
}

`,
  );
  // Bundle the public Chord contract into the sandboxed browser frontend.
  await build({
    outfile: join(directory, "dist", "desktop.js"),
    bundle: true,
    platform: "browser",
    format: "esm",
    stdin: {
      resolveDir: process.cwd(),
      contents: `
${contract}
export async function mount(root, host) {
  root.innerHTML = '<h1>Security fixture</h1><output id="counter"></output><button id="increment">Increment</button><pre id="boundary"></pre><button id="network">Try network</button><output id="network-result"></output><button id="navigate">Try navigation</button><output id="navigation-result"></output><button id="outside">Try outside file</button><output id="outside-result"></output><button id="draft">Prepare task draft</button>';
  const service=host.host.get(Counter,{}, {at:"desktop-extension"});
  await service.ready;
  const render = value => { if(!value)return; root.querySelector('#counter').textContent = 'Count ' + value.value + ' · activations ' + value.activations; };
  render(service.state.value);
  const unsubscribe = service.state.subscribe(render);
  let parentAccess = 'allowed';
  try { void parent.document.body; } catch { parentAccess = 'blocked'; }
  root.querySelector('#boundary').textContent = JSON.stringify({ preload: typeof window.piApp, process: typeof process, require: typeof require, parentAccess, origin: self.origin });
  // Record delivery and failure so a missing increment says whether the click or the call was lost.
  root.querySelector('#increment').onclick = event => {
    const button = event.currentTarget;
    button.dataset.clicks = String(Number(button.dataset.clicks ?? 0) + 1);
    service.increment({}).catch(error => { button.dataset.error = String(error?.message ?? error); });
  };
  root.querySelector('#network').onclick = async () => {
    try { await fetch(${JSON.stringify(attackUrl)}); root.querySelector('#network-result').textContent = 'Network allowed'; }
    catch { root.querySelector('#network-result').textContent = 'Network blocked'; }
  };
  root.querySelector('#navigate').onclick = () => {
    location.href = ${JSON.stringify(attackUrl)};
    setTimeout(() => { root.querySelector('#navigation-result').textContent = 'Navigation blocked'; }, 100);
  };
  root.querySelector('#outside').onclick = async () => {
    try { await host.actions.openFile({path:'../outside.txt'}); root.querySelector('#outside-result').textContent = 'Outside allowed'; }
    catch { root.querySelector('#outside-result').textContent = 'Outside blocked'; }
  };
  root.querySelector('#draft').onclick = () => host.actions.prepareTaskDraft({ title: 'Extension prepared task', prompt: 'Inspect the scoped extension findings.' }).catch(() => {});
  return () => { unsubscribe(); return service.release(); };
}
`,
    },
  });
}

export async function openDesktopExtensionFixture(window: Page): Promise<void> {
  const workbench = window.getByTestId("workbench");
  if (!(await workbench.isVisible())) await window.getByTestId("toggle-side-panel").click();
  const chooser = window.getByTestId("workbench-chooser");
  if (!(await chooser.isVisible())) await window.getByTestId("workbench-add-tab").click();
  await chooser.getByRole("button", { name: "Security fixture", exact: true }).click();
}

/**
 * Waits until the host has received the frame's ready signal. The frame paints its content
 * before mount() returns, so visible frame text alone does not mean the view is ready.
 */
export async function expectExtensionViewReady(window: Page): Promise<void> {
  await expect(window.getByTestId("extension-view-panel")).toHaveAttribute("data-state", "ready");
}
