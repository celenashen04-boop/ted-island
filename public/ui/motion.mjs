// CHI Island motion helpers. Plain ES module, no dependencies.
// The animations live in motion.css; these helpers only add and remove
// state classes and wait for the right animation to finish.
//
//   import { openPanel, closePanel, showToast, setRing, setNumeral } from '/ui/motion.mjs';

const reduce = matchMedia('(prefers-reduced-motion: reduce)');

/** True when the player asked for reduced motion. */
export const prefersReducedMotion = () => reduce.matches;

/**
 * Read a motion token in milliseconds, for canvas or three.js animations
 * that should match the CSS timing. Example: motionMs('--motion-duration-ripple') -> 700
 */
export function motionMs(token, element = document.documentElement) {
  const value = getComputedStyle(element).getPropertyValue(token).trim();
  const number = parseFloat(value);
  if (Number.isNaN(number)) return 0;
  return value.endsWith('ms') ? number : number * 1000;
}

/**
 * Resolve when the named animation ends on element, or right away if it
 * is not running (reduced motion, display none). A timeout guards against
 * an animationend that never fires.
 */
export function animationDone(element, name, fallbackMs = 4000) {
  return new Promise(resolve => {
    const names = getComputedStyle(element).animationName.split(',').map(s => s.trim());
    if (!names.includes(name)) { resolve(); return; }
    const timer = setTimeout(finish, fallbackMs);
    function finish() { clearTimeout(timer); element.removeEventListener('animationend', onEnd); resolve(); }
    function onEnd(event) { if (event.target === element && event.animationName === name) finish(); }
    element.addEventListener('animationend', onEnd);
  });
}

/** Restart a one-shot effect: removes the class, forces a reflow, adds it back. */
export function replay(element, className = 'is-playing') {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

/* ---------- Panels ---------- */

const openers = new WeakMap();

/** Open a .ui-layer (backdrop plus panel). Focus moves into the panel and returns to the opener on close. */
export function openPanel(layer) {
  const active = document.activeElement;
  if (active && active !== document.body && !layer.contains(active)) openers.set(layer, active);
  layer.dataset.state = 'open';
  const panel = layer.querySelector('.ui-panel');
  panel?.setAttribute('tabindex', '-1');
  panel?.focus({ preventScroll: true });
}

/** Close a .ui-layer after its exit animation. Returns a promise. */
export async function closePanel(layer) {
  if (layer.dataset.state !== 'open') return;
  layer.dataset.state = 'closing';
  // Return focus only if it is still inside the panel (or lost), never steal it from elsewhere.
  const opener = openers.get(layer);
  const active = document.activeElement;
  if (opener?.isConnected && (!active || active === document.body || layer.contains(active))) opener.focus({ preventScroll: true });
  await animationDone(layer.querySelector('.ui-panel'), 'ui-panel-out');
  if (layer.dataset.state === 'closing') layer.dataset.state = 'closed';
}

/* ---------- Menu ---------- */

/** Toggle a dropdown menu. The button's aria-expanded drives its black state. */
export async function toggleMenu(button, menu, open = menu.dataset.state !== 'open') {
  button.setAttribute('aria-expanded', String(open));
  if (open) {
    menu.dataset.state = 'open';
    return;
  }
  if (menu.dataset.state !== 'open') return;
  menu.dataset.state = 'closing';
  await animationDone(menu, 'ui-fade-out');
  if (menu.dataset.state === 'closing') menu.dataset.state = 'closed';
}

/* ---------- Plus button ---------- */

/** Ready or cancel the acorn. The + rotates into x through CSS. */
export function setPlusReady(button, ready) {
  button.setAttribute('aria-pressed', String(ready));
  button.setAttribute('aria-label', ready ? 'Cancel throw' : 'Plant a seed');
}

/* ---------- Toasts ---------- */

/**
 * Show a toast element in a .ui-toast-region. It slides down, holds for
 * --motion-toast-hold, slides out, and is removed.
 */
export async function showToast(region, toast) {
  toast.classList.remove('is-entering');
  region.append(toast);
  void toast.offsetWidth;
  toast.classList.add('is-entering');
  const total = motionMs('--motion-duration-base') * 2 + motionMs('--motion-toast-hold');
  // Under reduced motion the same animations run as plain fades, so this still waits.
  await animationDone(toast, 'ui-toast-out', total + 500);
  toast.remove();
}

/* ---------- Access ring and numerals ---------- */

/** Fixed 120 hour scale, matching the access cap. */
export const ACCESS_CAP_HOURS = 120;

/** Set an access ring to a number of hours left. The arc animates from its current value. */
export function setRing(ring, hoursLeft) {
  const pct = Math.max(0, Math.min(100, (hoursLeft / ACCESS_CAP_HOURS) * 100));
  ring.style.setProperty('--ring', pct.toFixed(2));
}

/** Set a big numeral (for example 72H). It counts from its current value to the new one. */
export function setNumeral(element, value) {
  element.style.setProperty('--num', String(Math.max(0, Math.round(value))));
}

/* ---------- Plants ---------- */

/** Swap a plant stage thumbnail with the grow transition. */
export async function swapStage(plant, src, alt) {
  const old = plant.querySelector('.ui-stage:not(.is-leaving)');
  const next = new Image();
  next.className = 'ui-stage is-entering';
  next.src = src;
  next.alt = alt;
  if (old) {
    old.classList.remove('is-entering');
    old.classList.add('is-leaving');
    old.alt = '';
  }
  plant.append(next);
  if (old) {
    await animationDone(old, 'ui-grow-out');
    old.remove();
  }
  await animationDone(next, 'ui-grow-in');
  next.classList.remove('is-entering');
}

/** Shrink and desaturate a plant (dormant), or reverse it (revived). */
export function setDormant(plant, dormant) {
  plant.toggleAttribute('data-dormant', dormant);
}
