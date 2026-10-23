/**
 * Puts an Edit into a textarea the way typing would, so Cmd+Z still undoes it.
 *
 * Setting a controlled textarea's value from React wipes the browser's undo history. Instead we
 * select just the part that changed and "type" the new text over it with execCommand. The
 * browser records that as one undoable step and fires an input event, which reaches React's
 * onChange as if the user had typed. execCommand is old but still works in every browser we
 * support; if it ever refuses, setRangeText plus an input event does the same minus the undo.
 */
import type { Edit } from './editText'

/**
 * Runs `then` once no sheet or menu is open, so a text box can take focus (an open sheet or menu
 * keeps focus inside itself). Gives up waiting after a second and runs it anyway.
 */
export function afterOverlaysClose(then: () => void, waited = 0) {
  if (!document.querySelector('[role="dialog"], [role="menu"]') || waited >= 1000) then()
  else setTimeout(() => afterOverlaysClose(then, waited + 20), 20)
}

export function applyEdit(el: HTMLTextAreaElement, edit: Edit) {
  const old = el.value
  const next = edit.value
  let head = 0
  while (head < old.length && head < next.length && old[head] === next[head]) head += 1
  let tail = 0
  while (tail < old.length - head && tail < next.length - head && old[old.length - 1 - tail] === next[next.length - 1 - tail]) tail += 1
  const inserted = next.slice(head, next.length - tail)
  el.focus()
  // Something else can hold focus (a sheet that's still closing): then don't type into it.
  const focused = document.activeElement === el
  el.setSelectionRange(head, old.length - tail)
  const done = focused && (inserted ? document.execCommand('insertText', false, inserted) : head === old.length - tail || document.execCommand('delete'))
  if (!done || el.value !== next) {
    el.value = old
    el.setRangeText(inserted, head, old.length - tail)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
  el.setSelectionRange(edit.start, edit.end)
}
