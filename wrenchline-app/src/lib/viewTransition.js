// Wraps a state update in the browser's View Transitions API so that when a
// list re-sorts (e.g. an order's status/priority changes and it moves to a
// new position), the rows animate smoothly to their new spot instead of the
// screen flickering. Falls back to a plain synchronous update on browsers
// that don't support it (e.g. older Safari) — no behavior change there.
export function withViewTransition(update) {
  if (typeof document !== 'undefined' && typeof document.startViewTransition === 'function') {
    document.startViewTransition(update)
  } else {
    update()
  }
}
