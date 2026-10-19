function getFocusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("disabled") && !element.getAttribute("aria-hidden"));
}

export function restoreTopmostDialogFocus(): boolean {
  const dialogs = document.querySelectorAll<HTMLElement>("[aria-modal='true']");
  const dialog = dialogs.item(dialogs.length - 1);
  if (!dialog) {
    return false;
  }
  if (!dialog.contains(document.activeElement)) {
    (getFocusableElements(dialog)[0] ?? dialog).focus();
  }
  return true;
}
