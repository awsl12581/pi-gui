// node_modules/@iconify-icons/lucide/data/r/refresh-cw.js
var data = {
  "width": 24,
  "height": 24,
  "body": '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9a9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5m5 4a9 9 0 0 1-9 9a9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></g>'
};
var refresh_cw_default = data;

// node_modules/@iconify-icons/lucide/data/c/chevron-down.js
var data2 = {
  "width": 24,
  "height": 24,
  "body": '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m6 9l6 6l6-6"/>'
};
var chevron_down_default = data2;

// node_modules/@iconify/utils/lib/icon/defaults.js
var defaultIconDimensions = Object.freeze({
  left: 0,
  top: 0,
  width: 16,
  height: 16
});
var defaultIconTransformations = Object.freeze({
  rotate: 0,
  vFlip: false,
  hFlip: false
});
var defaultIconProps = Object.freeze({
  ...defaultIconDimensions,
  ...defaultIconTransformations
});
var defaultExtendedIconProps = Object.freeze({
  ...defaultIconProps,
  body: "",
  hidden: false
});

// node_modules/@iconify/utils/lib/customisations/defaults.js
var defaultIconSizeCustomisations = Object.freeze({
  width: null,
  height: null
});
var defaultIconCustomisations = Object.freeze({
  ...defaultIconSizeCustomisations,
  ...defaultIconTransformations
});

// node_modules/@iconify/utils/lib/svg/size.js
var unitsSplit = /(-?[0-9.]*[0-9]+[0-9.]*)/g;
var unitsTest = /^-?[0-9.]*[0-9]+[0-9.]*$/g;
function calculateSize(size, ratio, precision) {
  if (ratio === 1) return size;
  precision = precision || 100;
  if (typeof size === "number") return Math.ceil(size * ratio * precision) / precision;
  if (typeof size !== "string") return size;
  const oldParts = size.split(unitsSplit);
  if (oldParts === null || !oldParts.length) return size;
  const newParts = [];
  let code = oldParts.shift();
  let isNumber = unitsTest.test(code);
  while (true) {
    if (isNumber) {
      const num = parseFloat(code);
      if (isNaN(num)) newParts.push(code);
      else newParts.push(Math.ceil(num * ratio * precision) / precision);
    } else newParts.push(code);
    code = oldParts.shift();
    if (code === void 0) return newParts.join("");
    isNumber = !isNumber;
  }
}

// node_modules/@iconify/utils/lib/svg/defs.js
function splitSVGDefs(content, tag = "defs") {
  let defs = "";
  const index = content.indexOf("<" + tag);
  while (index >= 0) {
    const start = content.indexOf(">", index);
    const end = content.indexOf("</" + tag);
    if (start === -1 || end === -1) break;
    const endEnd = content.indexOf(">", end);
    if (endEnd === -1) break;
    defs += content.slice(start + 1, end).trim();
    content = content.slice(0, index).trim() + content.slice(endEnd + 1);
  }
  return {
    defs,
    content
  };
}
function mergeDefsAndContent(defs, content) {
  return defs ? "<defs>" + defs + "</defs>" + content : content;
}
function wrapSVGContent(body, start, end) {
  const split = splitSVGDefs(body);
  return mergeDefsAndContent(split.defs, start + split.content + end);
}

// node_modules/@iconify/utils/lib/svg/build.js
var isUnsetKeyword = (value) => value === "unset" || value === "undefined" || value === "none";
function iconToSVG(icon, customisations) {
  const fullIcon = {
    ...defaultIconProps,
    ...icon
  };
  const fullCustomisations = {
    ...defaultIconCustomisations,
    ...customisations
  };
  const box = {
    left: fullIcon.left,
    top: fullIcon.top,
    width: fullIcon.width,
    height: fullIcon.height
  };
  let body = fullIcon.body;
  [fullIcon, fullCustomisations].forEach((props) => {
    const transformations = [];
    const hFlip = props.hFlip;
    const vFlip = props.vFlip;
    let rotation = props.rotate;
    if (hFlip) {
      if (vFlip) rotation += 2;
      else {
        transformations.push("translate(" + (box.width + box.left).toString() + " " + (0 - box.top).toString() + ")");
        transformations.push("scale(-1 1)");
        box.top = box.left = 0;
      }
    } else if (vFlip) {
      transformations.push("translate(" + (0 - box.left).toString() + " " + (box.height + box.top).toString() + ")");
      transformations.push("scale(1 -1)");
      box.top = box.left = 0;
    }
    let tempValue;
    if (rotation < 0) rotation -= Math.floor(rotation / 4) * 4;
    rotation = rotation % 4;
    switch (rotation) {
      case 1:
        tempValue = box.height / 2 + box.top;
        transformations.unshift("rotate(90 " + tempValue.toString() + " " + tempValue.toString() + ")");
        break;
      case 2:
        transformations.unshift("rotate(180 " + (box.width / 2 + box.left).toString() + " " + (box.height / 2 + box.top).toString() + ")");
        break;
      case 3:
        tempValue = box.width / 2 + box.left;
        transformations.unshift("rotate(-90 " + tempValue.toString() + " " + tempValue.toString() + ")");
    }
    if (rotation % 2 === 1) {
      if (box.left !== box.top) {
        tempValue = box.left;
        box.left = box.top;
        box.top = tempValue;
      }
      if (box.width !== box.height) {
        tempValue = box.width;
        box.width = box.height;
        box.height = tempValue;
      }
    }
    if (transformations.length) body = wrapSVGContent(body, '<g transform="' + transformations.join(" ") + '">', "</g>");
  });
  const customisationsWidth = fullCustomisations.width;
  const customisationsHeight = fullCustomisations.height;
  const boxWidth = box.width;
  const boxHeight = box.height;
  let width;
  let height;
  if (customisationsWidth === null) {
    height = customisationsHeight === null ? "1em" : customisationsHeight === "auto" ? boxHeight : customisationsHeight;
    width = calculateSize(height, boxWidth / boxHeight);
  } else {
    width = customisationsWidth === "auto" ? boxWidth : customisationsWidth;
    height = customisationsHeight === null ? calculateSize(width, boxHeight / boxWidth) : customisationsHeight === "auto" ? boxHeight : customisationsHeight;
  }
  const attributes = {};
  const setAttr = (prop, value) => {
    if (!isUnsetKeyword(value)) attributes[prop] = value.toString();
  };
  setAttr("width", width);
  setAttr("height", height);
  const viewBox = [
    box.left,
    box.top,
    boxWidth,
    boxHeight
  ];
  attributes.viewBox = viewBox.join(" ");
  return {
    attributes,
    viewBox,
    body
  };
}

// node_modules/@iconify/utils/lib/svg/html.js
function iconToHTML(body, attributes) {
  let renderAttribsHTML = body.indexOf("xlink:") === -1 ? "" : ' xmlns:xlink="http://www.w3.org/1999/xlink"';
  for (const attr in attributes) renderAttribsHTML += " " + attr + '="' + attributes[attr] + '"';
  return '<svg xmlns="http://www.w3.org/2000/svg"' + renderAttribsHTML + ">" + body + "</svg>";
}

// node_modules/@earendil-works/chord/dist/context/index.js
var ABORT_SIGNAL_CONTEXT_KEY = Object.freeze({
  token: /* @__PURE__ */ Symbol("chord.abortSignal")
});
var BaseContext = class {
  get abortSignal() {
    return this.value(ABORT_SIGNAL_CONTEXT_KEY);
  }
};
var EmptyContext = class extends BaseContext {
  #name;
  constructor(name) {
    super();
    this.#name = name;
  }
  value(_key) {
    return void 0;
  }
  toString() {
    return this.#name;
  }
};
var BACKGROUND_CONTEXT = new EmptyContext("[Context BACKGROUND_CONTEXT]");
var TODO_CONTEXT = new EmptyContext("[Context TODO_CONTEXT]");

// node_modules/@earendil-works/chord/dist/api.js
function defineService(id, options) {
  if (id.length === 0)
    throw new TypeError("Service ID must not be empty");
  if (id.startsWith("$chord."))
    throw new TypeError("Service IDs beginning with $chord. are reserved");
  return Object.freeze({ id, local: options?.local ?? false });
}

// examples/desktop-extensions/usage/contract.ts
var Usage = defineService("pi-gui.example.usage.v1");

// examples/desktop-extensions/usage/model.ts
var CONTEXT_KINDS = [
  "toolResults",
  "toolCalls",
  "user",
  "assistant",
  "thinking",
  "images",
  "summaries",
  "other"
];
var PERIODS = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "all", label: "All time" }
];
var SORTS = [
  { id: "share", label: "Share" },
  { id: "cost", label: "Cost" },
  { id: "recent", label: "Recent" },
  { id: "cacheHit", label: "Cache hit" }
];
var CONTEXT_LABELS = {
  toolResults: "Tool results",
  toolCalls: "Tool calls",
  user: "Your messages",
  assistant: "Agent replies",
  thinking: "Thinking",
  images: "Images",
  summaries: "Summaries",
  other: "Extension messages"
};
var CONTEXT_ITEM_LABELS = {
  toolResults: "Tool result",
  toolCalls: "Tool call",
  user: "Your message",
  assistant: "Agent reply",
  thinking: "Thinking",
  images: "Image",
  summaries: "Summary",
  other: "Extension message"
};
var LOW_CACHE_HIT = 0.7;
function emptyCounts() {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 };
}
function emptyKinds() {
  return Object.fromEntries(CONTEXT_KINDS.map((kind) => [kind, 0]));
}
function addCounts(target, usage) {
  target.input += usage.input;
  target.output += usage.output;
  target.cacheRead += usage.cacheRead;
  target.cacheWrite += usage.cacheWrite;
  target.cost += usage.cost;
}
function totalTokens(counts) {
  return counts.input + counts.output + counts.cacheRead + counts.cacheWrite;
}
function cacheHitRate(counts) {
  const prompt = counts.input + counts.cacheRead + counts.cacheWrite;
  return prompt > 0 ? counts.cacheRead / prompt : null;
}
function localDayStart(time) {
  const day = new Date(time);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}
function periodStart(period, now) {
  if (period === "all") return null;
  const days = period === "today" ? 0 : period === "7d" ? 6 : 29;
  const start = new Date(localDayStart(now));
  start.setDate(start.getDate() - days);
  return start.getTime();
}
function sumDays(days, since) {
  const counts = emptyCounts();
  for (const day of days) if (since === null || day.dayStart >= since) addCounts(counts, day);
  return counts;
}
function summarize(threads, period, now) {
  const since = periodStart(period, now);
  const totals = emptyCounts();
  const context = emptyKinds();
  const models = /* @__PURE__ */ new Map();
  const rows = [];
  for (const thread of threads) {
    const counts = sumDays(thread.days, since);
    const tokens2 = totalTokens(counts);
    if (tokens2 === 0) continue;
    addCounts(totals, counts);
    for (const kind of CONTEXT_KINDS) context[kind] += thread.context.byKind[kind];
    if (thread.model) models.set(thread.model, (models.get(thread.model) ?? 0) + tokens2);
    rows.push({
      thread,
      counts,
      tokens: tokens2,
      cacheHit: cacheHitRate(counts),
      share: 0,
      subscription: counts.cost === 0
    });
  }
  const tokens = totalTokens(totals);
  for (const row of rows) row.share = tokens > 0 ? row.tokens / tokens : 0;
  const model = [...models].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return {
    rows: sortRows(rows, "share"),
    totals,
    tokens,
    cacheHit: cacheHitRate(totals),
    subscription: tokens > 0 && totals.cost === 0,
    context,
    contextTotal: CONTEXT_KINDS.reduce((sum, kind) => sum + context[kind], 0),
    model
  };
}
function sortRows(rows, key) {
  const value = (row) => key === "share" ? row.tokens : key === "cost" ? row.counts.cost : key === "recent" ? row.thread.lastActiveAt : (
    // Lowest cache hit first: that is what needs attention.
    -(row.cacheHit ?? 1)
  );
  return [...rows].sort(
    (a, b) => value(b) - value(a) || b.thread.lastActiveAt - a.thread.lastActiveAt
  );
}
function formatTokens(value) {
  const units = [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "k"]
  ];
  for (const [size, suffix] of units) {
    if (value >= size) {
      const scaled = value / size;
      return `${scaled >= 100 ? Math.round(scaled) : Number(scaled.toFixed(1))}${suffix}`;
    }
  }
  return String(Math.round(value));
}
function formatPercent(value) {
  if (value === null) return "\u2014";
  if (value > 0 && value < 0.01) return "<1%";
  return `${Math.round(value * 100)}%`;
}
function formatCost(value) {
  if (value === 0) return "$0";
  if (value < 0.01) return "<$0.01";
  return `$${value.toFixed(value >= 1e3 ? 0 : 2)}`;
}
function formatRelative(time, now) {
  const minutes = Math.floor((now - time) / 6e4);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const date = new Date(time);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...sameYear ? {} : { year: "numeric" }
  });
}

// examples/desktop-extensions/usage/desktop.ts
var VISIBLE_ROWS = 8;
var TOKEN_PARTS = [
  { key: "input", label: "Input", color: "var(--c-input)" },
  { key: "output", label: "Output", color: "var(--c-output)" },
  { key: "cacheWrite", label: "Cache write", color: "var(--c-write)" },
  { key: "cacheRead", label: "Cache read", color: "var(--c-read)" }
];
var KIND_COLORS = {
  toolResults: "var(--k-tool-results)",
  toolCalls: "var(--k-tool-calls)",
  user: "var(--k-user)",
  assistant: "var(--k-assistant)",
  thinking: "var(--k-thinking)",
  images: "var(--k-images)",
  summaries: "var(--k-summaries)",
  other: "var(--k-other)"
};
var CSS = `
*{box-sizing:border-box}
html,body{margin:0;background:var(--background)}
.usage{
  --fg:var(--foreground);
  --muted:color-mix(in srgb,var(--fg) 56%,transparent);
  --faint:color-mix(in srgb,var(--fg) 38%,transparent);
  --line:color-mix(in srgb,var(--fg) 10%,transparent);
  --hover:color-mix(in srgb,var(--fg) 5%,transparent);
  --track:color-mix(in srgb,var(--fg) 8%,transparent);
  --c-input:#3f7be0;--c-output:#e06a3c;--c-write:#4faa7c;--c-read:#e4a73b;
  --k-tool-results:#7a6cd9;--k-tool-calls:#b2a8ee;--k-user:#34978f;--k-assistant:#8dcac2;
  --k-thinking:#9a9aa4;--k-images:#d27990;--k-summaries:#c4a56a;--k-other:color-mix(in srgb,var(--fg) 30%,transparent);
  --warn:#c9771f;
  container:usage/inline-size;
  font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif;
  font-size:13px;line-height:1.45;color:var(--fg);background:var(--background);
  padding:20px 20px 28px;min-height:100vh;-webkit-font-smoothing:antialiased;
}
button,select{font:inherit;color:inherit}
.num{font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
.muted{color:var(--muted)}
h1{font-size:15px;font-weight:600;margin:0}
h2{font-size:13px;font-weight:500;margin:0}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px}
.icon-button{width:26px;height:26px;display:grid;place-items:center;border:0;border-radius:6px;background:none;color:var(--muted);cursor:pointer}
.icon-button:hover{background:var(--hover);color:var(--fg)}
.icon-button svg{width:15px;height:15px}
.icon-button[data-busy=true] svg{animation:spin 0.9s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.scope{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:14px 0 6px}
.scope-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.picker{position:relative;display:inline-flex;align-items:center;color:var(--muted);white-space:nowrap}
.picker select{appearance:none;-webkit-appearance:none;border:0;background:none;padding:3px 18px 3px 4px;border-radius:6px;cursor:pointer;color:var(--fg)}
.picker select:hover{background:var(--hover)}
.picker select:focus-visible,.icon-button:focus-visible,.row:focus-visible,.more:focus-visible{outline:2px solid color-mix(in srgb,var(--accent) 70%,transparent);outline-offset:1px}
.picker svg{position:absolute;right:4px;width:10px;height:10px;pointer-events:none;color:var(--muted)}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));column-gap:20px;margin:0}
.stat{display:flex;align-items:baseline;gap:8px;padding:9px 0;border-bottom:1px solid var(--line);min-width:0}
.stat dt{color:var(--muted)}
.stat dd{margin:0;font-variant-numeric:tabular-nums;white-space:nowrap}
.bar{display:flex;gap:2px;height:8px;border-radius:4px;overflow:hidden;background:var(--track)}
.bar span{min-width:3px;height:100%}
.bar span:first-child{border-radius:4px 0 0 4px}.bar span:last-child{border-radius:0 4px 4px 0}
.bar span:only-child{border-radius:4px}
section{margin-top:26px}
.stats + section{margin-top:22px}
.section-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:12px 0 8px;border-bottom:1px solid var(--line)}
.section-head.first{padding-top:0}
.list{list-style:none;margin:0;padding:0}
.list li{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--line)}
.list .label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.list .pct{width:40px}
.swatch{width:9px;height:9px;border-radius:2px;flex:none}
.note{color:var(--faint);font-size:12px;margin:8px 0 0}
.now{display:flex;align-items:center;gap:10px;margin-top:12px;color:var(--muted)}
.now .meter{flex:1;height:4px;border-radius:2px;background:var(--track);overflow:hidden}
.now .meter span{display:block;height:100%;background:var(--accent)}
.threads-head{display:grid;grid-template-columns:var(--cols);column-gap:12px;padding:6px 0;color:var(--muted);border-bottom:1px solid var(--line)}
.threads{list-style:none;margin:0;padding:0;--cols:minmax(0,1fr) 72px 60px 60px 60px 44px}
.threads-head{--cols:minmax(0,1fr) 72px 60px 60px 60px 44px}
.threads > li{border-bottom:1px solid var(--line)}
.row{all:unset;box-sizing:border-box;display:grid;grid-template-columns:var(--cols);column-gap:12px;align-items:center;width:100%;padding:9px 6px 9px 0;cursor:pointer;border-radius:6px}
.row:hover{background:var(--hover)}
.row:hover .title{text-decoration:underline;text-decoration-color:var(--faint);text-underline-offset:3px}
.who{min-width:0}
.title{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.meta{display:block;color:var(--muted);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:1px}
.meta .here{color:var(--accent)}
.meta .warn,.low{color:var(--warn)}
.share{height:4px;border-radius:2px;background:color-mix(in srgb,var(--c-input) 22%,transparent);overflow:hidden}
.share span{display:block;height:100%;min-width:3px;border-radius:2px;background:var(--c-input)}
.narrow{display:none}
.more{border:0;background:none;padding:10px 0 0;color:var(--muted);cursor:pointer}
.more:hover{color:var(--fg)}
.more.open{padding:8px 0 0;color:var(--accent)}
.detail{padding:4px 0 16px}
.detail .counts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));column-gap:16px}
.detail .counts div{display:flex;align-items:center;gap:8px;padding:6px 0}
.detail .counts .num{margin-left:auto}
.detail h3{font-size:12px;font-weight:500;color:var(--muted);margin:12px 0 6px}
.detail .bar{height:6px}
.empty{padding:28px 0;text-align:left}
.empty p{margin:0 0 4px}
.error{color:var(--warn);margin:10px 0 0}
footer{margin-top:18px}
@container usage (max-width:560px){
  .stats{grid-template-columns:repeat(2,minmax(0,1fr))}
  .threads,.threads-head{--cols:minmax(0,1fr) 56px 40px}
  .wide{display:none}
  .narrow{display:inline}
  .who .share.narrow{display:block;margin-top:6px;max-width:140px}
  .detail .counts{grid-template-columns:repeat(2,minmax(0,1fr))}
}
`;
var refreshSvg = iconToSVG(refresh_cw_default, { width: 16, height: 16 });
var REFRESH_ICON = iconToHTML(refreshSvg.body, {
  ...refreshSvg.attributes,
  "aria-hidden": "true"
});
var chevronSvg = iconToSVG(chevron_down_default, { width: 10, height: 10 });
var CHEVRON_ICON = iconToHTML(chevronSvg.body, {
  ...chevronSvg.attributes,
  "aria-hidden": "true"
});
function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(props)) {
    if (value === void 0 || value === false) continue;
    if (name === "class") node.className = String(value);
    else node.setAttribute(name, value === true ? "" : String(value));
  }
  for (const child of children)
    if (child !== null && child !== void 0 && child !== false) node.append(child);
  return node;
}
function picker(label, options, value, onChange, prefix) {
  const select = h("select", { "aria-label": label });
  for (const option of options) select.append(h("option", { value: option.id }, option.label));
  select.value = value;
  select.onchange = () => onChange(select.value);
  const wrap = h("span", { class: "picker" }, prefix ? `${prefix}\xA0` : null, select);
  wrap.insertAdjacentHTML("beforeend", CHEVRON_ICON);
  return wrap;
}
function stackedBar(label, parts) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  const bar = h("div", {
    class: "bar",
    role: "img",
    "aria-label": `${label}: ${parts.filter((part) => part.value > 0).map((part) => `${part.label} ${formatPercent(part.value / total)}`).join(", ")}`
  });
  for (const part of parts) {
    if (part.value <= 0) continue;
    const segment = h("span", {
      title: `${part.label} \xB7 ${formatTokens(part.value)} \xB7 ${formatPercent(part.value / total)}`
    });
    segment.style.flex = `${part.value} 1 0`;
    segment.style.background = part.color;
    bar.append(segment);
  }
  return bar;
}
function listRow(color, label, value, extra, testId) {
  return h(
    "li",
    testId ? { "data-testid": testId } : {},
    h("span", { class: "swatch", "aria-hidden": "true", style: `background:${color}` }),
    h("span", { class: "label" }, label),
    extra !== void 0 ? h("span", { class: "num muted pct" }, extra) : null,
    h("span", { class: "num" }, value)
  );
}
function contextParts(byKind) {
  return CONTEXT_KINDS.map((kind) => ({
    kind,
    label: CONTEXT_LABELS[kind],
    value: byKind[kind],
    color: KIND_COLORS[kind]
  })).filter((part) => part.value > 0).sort((a, b) => b.value - a.value);
}
async function mount(root, host) {
  host.signal.throwIfAborted();
  const style = h("style");
  style.textContent = CSS;
  const view = h("main", { class: "usage" });
  root.replaceChildren(style, view);
  let state = null;
  let period = "all";
  let sort = "share";
  let expanded = null;
  let showAll = false;
  let actionError = "";
  let disposed = false;
  const refreshButton = h("button", {
    class: "icon-button",
    type: "button",
    "aria-label": "Refresh usage",
    title: "Refresh"
  });
  refreshButton.innerHTML = REFRESH_ICON;
  const render = () => {
    if (disposed) return;
    const now = Date.now();
    const loading = !state || state.status === "loading" || state.status === "idle";
    refreshButton.dataset.busy = String(loading);
    const top = h("div", { class: "top" }, h("h1", {}, "Usage"), refreshButton);
    const scope = h(
      "div",
      { class: "scope" },
      h(
        "span",
        { class: "scope-name" },
        "This folder",
        state?.folderName ? h("span", { class: "muted" }, ` \xB7 ${state.folderName}`) : null
      ),
      picker("Period", PERIODS, period, (next) => {
        period = next;
        expanded = null;
        render();
      })
    );
    const children = [top, scope];
    const error = state?.error || actionError;
    if (!state || state.refreshedAt === null && state.status !== "error") {
      children.push(h("p", { class: "muted empty" }, "Reading this folder\u2019s threads\u2026"));
      view.replaceChildren(...children.filter((child) => child instanceof Node));
      return;
    }
    const summary = summarize(state.threads, period, now);
    children.push(statsRow(summary));
    if (error) children.push(h("p", { class: "error", role: "alert" }, error));
    if (summary.rows.length === 0) {
      children.push(emptyState(state, period));
    } else {
      children.push(tokenSection(summary), contextSection(summary), threadsSection(summary, now));
    }
    children.push(footer(state, now));
    view.replaceChildren(...children.filter((child) => child instanceof Node));
  };
  const statsRow = (summary) => {
    const stat = (label, value, testId, title) => h(
      "div",
      { class: "stat" },
      h("dt", {}, label),
      h("dd", { "data-testid": testId, ...title ? { title } : {} }, value)
    );
    return h(
      "dl",
      { class: "stats" },
      stat("Threads", String(summary.rows.length), "usage-threads"),
      stat("Tokens", formatTokens(summary.tokens), "usage-tokens", summary.tokens.toLocaleString()),
      stat("Cache hit", formatPercent(summary.cacheHit), "usage-cache-hit"),
      summary.subscription ? stat("Cost", "Subscription", "usage-cost", "No per-token cost reported by the provider") : stat("Cost", formatCost(summary.totals.cost), "usage-cost")
    );
  };
  const tokenSection = (summary) => h(
    "section",
    { "aria-labelledby": "usage-breakdown" },
    stackedBar(
      "Token breakdown",
      TOKEN_PARTS.map((part) => ({
        label: part.label,
        value: summary.totals[part.key],
        color: part.color
      }))
    ),
    h(
      "div",
      { class: "section-head" },
      h("h2", { id: "usage-breakdown" }, "Breakdown"),
      summary.model ? h("span", { class: "muted" }, summary.model) : null
    ),
    h(
      "ul",
      { class: "list" },
      ...TOKEN_PARTS.map(
        (part) => listRow(
          part.color,
          part.label,
          formatTokens(summary.totals[part.key]),
          void 0,
          `usage-${part.key}`
        )
      )
    )
  );
  const contextSection = (summary) => {
    const parts = contextParts(summary.context);
    const current = summary.rows.find((row) => row.thread.current)?.thread.contextNow;
    return h(
      "section",
      { "aria-labelledby": "usage-context" },
      h(
        "div",
        { class: "section-head first" },
        h("h2", { id: "usage-context" }, "What fills context"),
        h("span", { class: "muted" }, `${formatTokens(summary.contextTotal)} \xB7 estimated`)
      ),
      h("div", { style: "margin-top:12px" }, stackedBar("Context by kind", parts)),
      h(
        "ul",
        { class: "list", "data-testid": "usage-context-kinds" },
        ...parts.map(
          (part) => listRow(
            part.color,
            part.label,
            formatTokens(part.value),
            formatPercent(part.value / summary.contextTotal),
            `usage-context-${part.kind}`
          )
        )
      ),
      current ? contextNow(current) : null,
      h(
        "p",
        { class: "note" },
        "Current branch of each thread listed, after compaction. Estimated from text size; excludes the system prompt and tool definitions."
      )
    );
  };
  const contextNow = (now) => {
    const fraction = now.tokens === null ? null : now.tokens / now.contextWindow;
    const meter = h("span", { class: "meter" }, h("span", {}));
    meter.firstChild.style.width = `${Math.min(100, (fraction ?? 0) * 100)}%`;
    return h(
      "div",
      { class: "now", "data-testid": "usage-context-now" },
      h("span", {}, "This thread now"),
      meter,
      h(
        "span",
        { class: "num" },
        now.tokens === null ? `? of ${formatTokens(now.contextWindow)}` : `${formatTokens(now.tokens)} of ${formatTokens(now.contextWindow)} \xB7 ${formatPercent(fraction)}`
      )
    );
  };
  const threadsSection = (summary, now) => {
    const rows = sortRows(summary.rows, sort);
    const visible = showAll ? rows : rows.slice(0, VISIBLE_ROWS);
    const list = h("ul", { class: "threads", "aria-label": "Threads" });
    for (const row of visible) list.append(threadItem(row, now));
    const onlyThis = rows.every((row) => row.thread.current);
    return h(
      "section",
      { "aria-labelledby": "usage-threads" },
      h(
        "div",
        { class: "section-head first", style: "border-bottom:0;padding-bottom:0" },
        h("h2", { id: "usage-threads" }, "Threads"),
        picker(
          "Sort threads",
          SORTS,
          sort,
          (next) => {
            sort = next;
            render();
          },
          "Sort by:"
        )
      ),
      h(
        "div",
        { class: "threads-head", "aria-hidden": "true" },
        h("span", {}),
        h("span", { class: "wide" }),
        h("span", { class: "num" }, "Tokens"),
        h("span", { class: "num wide" }, "Cache hit"),
        h("span", { class: "num wide" }, "Cost"),
        h("span", { class: "num" }, "Share")
      ),
      list,
      rows.length > VISIBLE_ROWS ? h(
        "button",
        { class: "more", type: "button", "data-action": "more" },
        showAll ? "Show fewer" : `Show ${rows.length - VISIBLE_ROWS} more`
      ) : null,
      onlyThis ? h("p", { class: "note" }, "No other threads in this folder have usage yet.") : null
    );
  };
  const threadItem = (row, now) => {
    const { thread } = row;
    const open = expanded === thread.id;
    const low = row.cacheHit !== null && row.cacheHit < LOW_CACHE_HIT;
    const shareBar = (extra) => {
      const bar = h("span", { class: `share ${extra}`, "aria-hidden": "true" }, h("span", {}));
      bar.firstChild.style.width = `${row.share * 100}%`;
      return bar;
    };
    const costText = row.subscription ? "Subscription" : formatCost(row.counts.cost);
    const meta = h(
      "span",
      { class: "meta" },
      thread.current ? h("span", { class: "here" }, "This thread \xB7 ") : null,
      [thread.model, formatRelative(thread.lastActiveAt, now)].filter(Boolean).join(" \xB7 "),
      h("span", { class: "narrow" }, ` \xB7 ${costText}`),
      low ? h("span", { class: "narrow warn" }, ` \xB7 Cache ${formatPercent(row.cacheHit)}`) : null
    );
    const button = h(
      "button",
      {
        class: "row",
        type: "button",
        "aria-expanded": String(open),
        "data-testid": "usage-thread-row",
        "data-thread-title": thread.title
      },
      h(
        "span",
        { class: "who" },
        h("span", { class: "title" }, thread.title),
        meta,
        shareBar("narrow")
      ),
      shareBar("wide"),
      h(
        "span",
        { class: "num", "data-cell": "tokens", title: row.tokens.toLocaleString() },
        formatTokens(row.tokens)
      ),
      h(
        "span",
        {
          class: `num wide${low ? " low" : ""}`,
          "data-cell": "cache-hit",
          title: low ? "Low cache hit: most of this thread\u2019s prompts were sent uncached" : void 0
        },
        formatPercent(row.cacheHit)
      ),
      h(
        "span",
        {
          class: "num wide",
          "data-cell": "cost",
          title: row.subscription ? "Subscription: no per-token cost reported" : void 0
        },
        row.subscription ? "\u2014" : formatCost(row.counts.cost)
      ),
      h("span", { class: "num", "data-cell": "share" }, formatPercent(row.share))
    );
    button.onclick = () => {
      expanded = open ? null : thread.id;
      render();
    };
    return h("li", {}, button, open ? threadDetail(row) : null);
  };
  const openThreadButton = (id) => {
    const button = h("button", { class: "more open", type: "button" }, "Open thread");
    button.onclick = () => {
      actionError = "";
      render();
      host.actions.openThread(id).catch((reason) => {
        actionError = reason instanceof Error ? reason.message : String(reason);
        render();
      });
    };
    return button;
  };
  const threadDetail = (row) => {
    const { thread, counts } = row;
    const parts = contextParts(thread.context.byKind);
    return h(
      "div",
      { class: "detail", "data-testid": "usage-thread-detail" },
      h(
        "div",
        { class: "counts" },
        ...TOKEN_PARTS.map(
          (part) => h(
            "div",
            {},
            h("span", { class: "swatch", style: `background:${part.color}` }),
            h("span", { class: "muted" }, part.label),
            h("span", { class: "num", "data-cell": part.key }, formatTokens(counts[part.key]))
          )
        )
      ),
      row.subscription ? h("p", { class: "note" }, "Subscription plan: the provider reported no per-token cost.") : null,
      thread.current ? null : openThreadButton(thread.id),
      thread.contextNow ? contextNow(thread.contextNow) : null,
      h("h3", {}, `In context now \xB7 ${formatTokens(thread.context.total)} estimated`),
      stackedBar(`${thread.title} context by kind`, parts),
      h("h3", {}, "Largest"),
      h(
        "ul",
        { class: "list" },
        ...thread.context.largest.map(
          (group) => listRow(
            KIND_COLORS[group.kind],
            group.kind === "summaries" ? group.label : [
              group.count > 1 ? CONTEXT_LABELS[group.kind] : CONTEXT_ITEM_LABELS[group.kind],
              group.label
            ].filter(Boolean).join(" \xB7 "),
            formatTokens(group.tokens),
            group.count > 1 ? `\xD7${group.count}` : "",
            "usage-largest"
          )
        )
      )
    );
  };
  const emptyState = (current, selected) => {
    const none = current.threads.length === 0;
    const periodLabel = PERIODS.find((option) => option.id === selected).label.toLowerCase();
    return h(
      "div",
      { class: "empty", "data-testid": "usage-empty" },
      h(
        "p",
        {},
        none ? "No threads in this folder have usage yet" : `No usage ${selected === "today" ? "today" : `in the last ${periodLabel}`}`
      ),
      h(
        "p",
        { class: "muted" },
        none ? "Threads appear here once they get a reply from a model." : "Choose a longer period to see earlier threads."
      )
    );
  };
  const footer = (current, now) => {
    const parts = [
      `Read ${current.scanned} saved ${current.scanned === 1 ? "thread" : "threads"}`,
      current.unreadable ? `${current.unreadable} unreadable skipped` : "",
      current.capped ? `${current.capped} older not read` : "",
      current.refreshedAt ? `updated ${formatRelative(current.refreshedAt, now)}` : ""
    ].filter(Boolean);
    return h("footer", { class: "note" }, parts.join(" \xB7 "));
  };
  view.addEventListener("click", (event) => {
    const target = event.target;
    if (target.closest("[data-action=more]")) {
      showAll = !showAll;
      render();
    }
  });
  const binding = host.services.open({
    services: [Usage],
    assertAccess: () => host.signal.throwIfAborted(),
    onError: (reason) => {
      actionError = reason instanceof Error ? reason.message : String(reason);
      render();
    }
  });
  const service = binding.use(Usage);
  const refresh = () => {
    actionError = "";
    service.refresh({}, BACKGROUND_CONTEXT).catch((reason) => {
      actionError = reason instanceof Error ? reason.message : String(reason);
      render();
    });
  };
  refreshButton.onclick = refresh;
  let unsubscribe = () => {
  };
  const clock = setInterval(render, 6e4);
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    clearInterval(clock);
    unsubscribe();
    host.signal.removeEventListener("abort", dispose);
    binding.dispose(BACKGROUND_CONTEXT).catch(() => {
    });
    root.replaceChildren();
  };
  host.signal.addEventListener("abort", dispose, { once: true });
  render();
  try {
    await binding.ready(BACKGROUND_CONTEXT);
    host.signal.throwIfAborted();
    unsubscribe = service.state.subscribe((next) => {
      state = next;
      render();
    });
    if (service.state.value) state = service.state.value;
    render();
    refresh();
  } catch (reason) {
    dispose();
    throw reason;
  }
  return dispose;
}
export {
  mount
};
