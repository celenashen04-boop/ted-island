// Toasts (Figma Toast 13:124): Access gained, Access full, Planted.
// Slide down from the top center, hold 3 s, slide out (motion.css).
//
//   const region = toastRegion();                       // once, in the HUD
//   accessToast(region, { island: 2, addedHours: 48, hoursLeft: 76 });
//   accessToast(region, { island: 2, capped: true });
//   plantedToast(region, { island: 0, title: 'Haptics for calm breathing' });
//
// Copy follows the Figma split (title plus detail line). The team still has
// to confirm that against the confirmed strings (UI-CONTEXT section 11), so all
// wording lives in the format functions below.

import { el, islandClass, islandUi } from './islands-ui.mjs';
import { showToast } from './motion.mjs';

/** "3d 04h left" style, from hours. */
export function formatLeft(hours) {
  const total = Math.max(0, Math.round(hours));
  const days = Math.floor(total / 24);
  const rest = String(total % 24).padStart(2, '0');
  return `${days}d ${rest}h left`;
}

/** Create (or reuse) the top-center toast region inside root. */
export function toastRegion(root = document.body) {
  let region = root.querySelector(':scope > .ui-toast-region');
  if (!region) {
    region = el('div', { class: 'ui-toast-region', 'aria-live': 'polite' });
    root.append(region);
  }
  return region;
}

/** Build a toast element. island is an island id from islands.mjs. */
export function toastElement({ island, title, detail }) {
  return el('div', { class: `ui-toast ${islandClass(island)}`, role: 'status' },
    el('span', { class: 'ui-toast__stripe', 'aria-hidden': 'true' }),
    el('div', { class: 'ui-toast__text' },
      el('p', { class: 'ui-toast__title' }, title),
      el('p', { class: 'ui-toast__detail' }, detail)));
}

/** "+48 hours" after an action, or "Access full" at the 5-day cap. */
export function accessToast(region, { island, addedHours = 0, hoursLeft = 0, capped = false }) {
  const name = islandUi(island).name;
  const toast = capped
    ? toastElement({ island, title: 'Access full', detail: `${name} · 5 days (cap)` })
    : toastElement({ island, title: `+${addedHours} hours`, detail: `${name} access · ${formatLeft(hoursLeft)}` });
  return showToast(region, toast);
}

/** "Planted" after a seed is planted. island is the island it was planted on. */
export function plantedToast(region, { island, title, where = 'on your island' }) {
  return showToast(region, toastElement({ island, title: 'Planted', detail: `${title} · ${where}` }));
}
