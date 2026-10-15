"use client";

import { useState } from "react";
import { Icon } from "@iconify/react/offline";
import check from "@iconify-icons/lucide/check";
import copy from "@iconify-icons/lucide/copy";

export function CopyCommand({ command }: { readonly command: string }) {
  const [copied, setCopied] = useState(false);
  const [program, ...rest] = command.split(" ");
  return (
    <div className="command">
      <code>
        <span className="command__program">{program}</span> {rest.join(" ")}
      </code>
      <button
        className="command__copy"
        type="button"
        aria-label={copied ? "Copied" : "Copy command"}
        onClick={() => {
          navigator.clipboard.writeText(command).then(
            () => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            },
            () => setCopied(false),
          );
        }}
      >
        <Icon icon={copied ? check : copy} aria-hidden="true" />
      </button>
    </div>
  );
}
