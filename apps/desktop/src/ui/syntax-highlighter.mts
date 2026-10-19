import bash from "@shikijs/langs/bash";
import javascript from "@shikijs/langs/javascript";
import json from "@shikijs/langs/json";
import python from "@shikijs/langs/python";
import tsx from "@shikijs/langs/tsx";
import typescript from "@shikijs/langs/typescript";
import { createHighlighterCore, type ThemeRegistration } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";

export function createSyntaxHighlighter(themes: ThemeRegistration[]) {
  return createHighlighterCore({
    themes,
    langs: [typescript, tsx, javascript, json, python, bash],
    engine: createOnigurumaEngine(import("shiki/wasm")),
  });
}
