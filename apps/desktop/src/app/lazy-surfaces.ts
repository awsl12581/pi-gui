import { lazy } from "react";

export const SecondarySurfaces = lazy(() =>
  import("./secondary-surfaces").then((module) => ({ default: module.SecondarySurfaces })),
);
export const DiffPanel = lazy(() =>
  import("../features/workbench/diff-panel").then((module) => ({ default: module.DiffPanel })),
);
export const FileWorkbench = lazy(() =>
  import("../features/workbench/file-workbench").then((module) => ({
    default: module.FileWorkbench,
  })),
);
export const TerminalPanel = lazy(() =>
  import("../features/workbench/terminal-panel").then((module) => ({
    default: module.TerminalPanel,
  })),
);
