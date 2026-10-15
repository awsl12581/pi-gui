import { Icon } from "@iconify/react/offline";
import plusIconData from "@iconify-icons/lucide/plus";
import terminalIconData from "@iconify-icons/lucide/terminal";
import sidebarToggleIconData from "@iconify-icons/lucide/panel-left-close";
import sidePanelIconData from "@iconify-icons/lucide/panel-right";
import closeIconData from "@iconify-icons/lucide/x";
import arrowUpIconData from "@iconify-icons/lucide/arrow-up";
import stopSquareIconData from "@iconify-icons/lucide/square";
import folderIconData from "@iconify-icons/lucide/folder";
import fileIconData from "@iconify-icons/lucide/file-text";
import archiveIconData from "@iconify-icons/lucide/archive";
import restoreIconData from "@iconify-icons/lucide/archive-restore";
import chevronDownIconData from "@iconify-icons/lucide/chevron-down";
import chevronRightIconData from "@iconify-icons/lucide/chevron-right";
import checkIconData from "@iconify-icons/lucide/check";
import customizeSidebarIconData from "@iconify-icons/lucide/sliders-horizontal";
import pencilIconData from "@iconify-icons/lucide/pencil";
import copyIconData from "@iconify-icons/lucide/copy";
import sparkIconData from "@iconify-icons/lucide/sparkles";
import settingsIconData from "@iconify-icons/lucide/settings";
import modelIconData from "@iconify-icons/lucide/box";
import reasoningIconData from "@iconify-icons/lucide/brain";
import statusIconData from "@iconify-icons/lucide/circle-plus";
import skillIconData from "@iconify-icons/lucide/blocks";
import extensionIconData from "@iconify-icons/lucide/puzzle";
import clockIconData from "@iconify-icons/lucide/clock";
import refreshIconData from "@iconify-icons/lucide/refresh-cw";
import pinIconData from "@iconify-icons/lucide/pin";
import worktreeIconData from "@iconify-icons/lucide/arrow-up-right";
import forkIconData from "@iconify-icons/lucide/git-fork";
import diffIconData from "@iconify-icons/lucide/git-compare";
import fileDiffIconData from "@iconify-icons/lucide/file-diff";
import chatIconData from "@iconify-icons/lucide/message-square";
import searchIconData from "@iconify-icons/lucide/search";
import sunIconData from "@iconify-icons/lucide/sun";
import bellIconData from "@iconify-icons/lucide/bell";
import keyboardIconData from "@iconify-icons/lucide/keyboard";
import plugIconData from "@iconify-icons/lucide/plug";
import moreIconData from "@iconify-icons/lucide/ellipsis";
import minusIconData from "@iconify-icons/lucide/minus";

export function PlusIcon() {
  return <Icon icon={plusIconData} aria-hidden="true" />;
}

export function TerminalIcon() {
  return <Icon icon={terminalIconData} aria-hidden="true" />;
}

export function SidebarToggleIcon() {
  return <Icon icon={sidebarToggleIconData} aria-hidden="true" />;
}

export function SidePanelIcon() {
  return <Icon icon={sidePanelIconData} aria-hidden="true" />;
}

export function CloseIcon() {
  return <Icon icon={closeIconData} aria-hidden="true" />;
}

export function ArrowUpIcon() {
  return <Icon icon={arrowUpIconData} aria-hidden="true" />;
}

export function StopSquareIcon() {
  return <Icon icon={stopSquareIconData} aria-hidden="true" className="icon--filled" />;
}

export function FolderIcon() {
  return <Icon icon={folderIconData} aria-hidden="true" />;
}

export function FileIcon() {
  return <Icon icon={fileIconData} aria-hidden="true" />;
}

export function ArchiveIcon() {
  return <Icon icon={archiveIconData} aria-hidden="true" />;
}

export function RestoreIcon() {
  return <Icon icon={restoreIconData} aria-hidden="true" />;
}

export function ChevronDownIcon() {
  return <Icon icon={chevronDownIconData} aria-hidden="true" />;
}

export function ChevronRightIcon() {
  return <Icon icon={chevronRightIconData} aria-hidden="true" />;
}

export function CheckIcon() {
  return <Icon icon={checkIconData} aria-hidden="true" />;
}

export function CustomizeSidebarIcon() {
  return <Icon icon={customizeSidebarIconData} aria-hidden="true" />;
}

export function PencilIcon() {
  return <Icon icon={pencilIconData} aria-hidden="true" />;
}

export function CopyIcon() {
  return <Icon icon={copyIconData} aria-hidden="true" />;
}

export function SparkIcon() {
  return <Icon icon={sparkIconData} aria-hidden="true" />;
}

export function SettingsIcon() {
  return <Icon icon={settingsIconData} aria-hidden="true" />;
}

export function ModelIcon() {
  return <Icon icon={modelIconData} aria-hidden="true" />;
}

export function ReasoningIcon() {
  return <Icon icon={reasoningIconData} aria-hidden="true" />;
}

export function StatusIcon() {
  return <Icon icon={statusIconData} aria-hidden="true" />;
}

export function SkillIcon() {
  return <Icon icon={skillIconData} aria-hidden="true" />;
}

export function ExtensionIcon() {
  return <Icon icon={extensionIconData} aria-hidden="true" />;
}

export function ClockIcon() {
  return <Icon icon={clockIconData} aria-hidden="true" />;
}

export function RefreshIcon() {
  return <Icon icon={refreshIconData} aria-hidden="true" />;
}

export function PinIcon({ filled = false }: { readonly filled?: boolean }) {
  return (
    <Icon icon={pinIconData} aria-hidden="true" className={filled ? "icon--filled" : undefined} />
  );
}

export function WorktreeIcon() {
  return <Icon icon={worktreeIconData} aria-hidden="true" />;
}

export function ForkIcon() {
  return <Icon icon={forkIconData} aria-hidden="true" />;
}

export function DiffIcon() {
  return <Icon icon={diffIconData} aria-hidden="true" />;
}

export function FileDiffIcon() {
  return <Icon icon={fileDiffIconData} aria-hidden="true" />;
}

export function ChatIcon() {
  return <Icon icon={chatIconData} aria-hidden="true" />;
}

export function SearchIcon() {
  return <Icon icon={searchIconData} aria-hidden="true" />;
}

export function SunIcon() {
  return <Icon icon={sunIconData} aria-hidden="true" />;
}

export function BellIcon() {
  return <Icon icon={bellIconData} aria-hidden="true" />;
}

export function KeyboardIcon() {
  return <Icon icon={keyboardIconData} aria-hidden="true" />;
}

export function PlugIcon() {
  return <Icon icon={plugIconData} aria-hidden="true" />;
}

export function MoreIcon() {
  return <Icon icon={moreIconData} aria-hidden="true" />;
}

export function MinusIcon() {
  return <Icon icon={minusIconData} aria-hidden="true" />;
}

export function PiLogoMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" fill="none">
      <rect width="64" height="64" rx="18" fill="#1f2638" />
      <text
        x="50%"
        y="54%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="SF Pro Display, SF Pro Text, ui-sans-serif, system-ui, sans-serif"
        fontSize="34"
        fontStyle="italic"
        fontWeight="700"
        fill="#ffffff"
      >
        π
      </text>
    </svg>
  );
}
