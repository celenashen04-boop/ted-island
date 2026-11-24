// In-world prompts and feedback (Player View 20:437 to 20:1355).
// Small DOM pieces the game positions over the 3D scene. Each returns
// { element, ... } and plays its entry motion from motion.css.
//
//   View idea pill (16:302), Dormant plant (20:1355):
//     const pill = createViewIdeaPill({ onOpen: () => openPlant(id) });
//     pill.set({ stage: 'young', island: 0, title: 'Haptics for calm breathing' });
//     pill.set({ dormant: true, island: 0, title: 'Play as research method' });
//   Landing marker (16:328), Landing valid 20:437, invalid 20:555, failed 20:673:
//     const marker = createLandingMarker('valid');  marker.set('invalid');
//   Edge prompt (20:962):     createEdgePrompt()
//   Locked bridge (20:1086):  createLockedPrompt({ island: 2, onUnlock: () => openCatalog({ island: 2 }) })
//   Water feedback (20:1223): createActionFeedback({ kind: 'water', island: 1, until: date })
//
// The game owns placement: put these in a layer over the canvas and set
// left/top from the projected world position. Nothing here reads the scene.

import { el, icon, islandClass, islandUi } from './islands-ui.mjs';
import { replay } from './motion.mjs';

const STAGE_LABEL = { seed: 'Seed', sprout: 'Sprout', young: 'Young plant', mature: 'Mature plant' };

/** "Tue 3 p.m.", "Tue 3:30 p.m." (the style of the confirmed water copy). */
export function formatUntil(date) {
  const d = new Date(date);
  const day = d.toLocaleDateString('en-US', { weekday: 'short' });
  const h24 = d.getHours();
  const h = h24 % 12 || 12;
  const m = d.getMinutes();
  return `${day} ${h}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h24 < 12 ? 'a.m.' : 'p.m.'}`;
}

/* View Idea Pill: next to the reticle when the player looks at a plant. */
export function createViewIdeaPill({ onOpen } = {}) {
  const eyebrow = el('span', { class: 'ui-pill__eyebrow' });
  const title = el('span', { class: 'ui-pill__title' });
  const action = el('span', { class: 'ui-pill__action' });
  const element = el('button', { type: 'button', class: 'ui-pill', hidden: true, onclick: () => onOpen?.() },
    eyebrow, title, el('span', { class: 'ui-pill__row' }, action, icon('arrow-right')));

  return {
    element,
    /** Show for a plant. dormant switches the copy to the revive hint. */
    set({ stage = 'young', island = 0, title: text, dormant = false }) {
      const short = islandUi(island).short ?? islandUi(island).name;
      eyebrow.textContent = `${dormant ? 'Dormant' : STAGE_LABEL[stage] ?? stage} · ${short}`;
      title.textContent = text;
      action.textContent = dormant ? 'One like or comment revives it' : 'View idea';
      element.classList.toggle('is-dormant', dormant);
      element.setAttribute('aria-label', `${text}. ${dormant ? 'Dormant. One like or comment revives it. Open' : 'View idea'}`);
      if (element.hidden) { element.hidden = false; replay(element); }
    },
    hide() { element.hidden = true; },
  };
}

/* Landing Marker: valid ring, broken ring with a reason, or a failed throw. */
const LANDING = {
  valid: { src: '/ui/markers/valid.svg', label: 'Open grass' },
  invalid: { src: '/ui/markers/invalid.svg', label: 'Aim at open soil' },
  failed: { src: '/ui/markers/failed.svg', label: 'Tap the acorn to try again' },
};

export function createLandingMarker(state = 'valid', { onRetry } = {}) {
  const img = el('img', { class: 'ui-landing__marker', alt: '' });
  const label = el('span', { class: 'ui-landing__label' });
  // Failed throws are tappable (retry); the others are status only.
  const element = el('div', { class: 'ui-landing', role: 'status' }, img, label);
  element.addEventListener('click', () => { if (current === 'failed') onRetry?.(); });
  let current = '';

  function set(next) {
    if (next === current) return;
    current = next;
    const s = LANDING[next] ?? LANDING.valid;
    element.className = `ui-landing ui-landing--${next}`;
    img.src = s.src;
    label.textContent = s.label;
    if (next === 'failed') { element.setAttribute('role', 'button'); element.tabIndex = 0; }
    else { element.setAttribute('role', 'status'); element.removeAttribute('tabindex'); }
    replay(element);
  }
  element.addEventListener('keydown', event => {
    if (current === 'failed' && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onRetry?.(); }
  });
  set(state);
  return { element, set, get state() { return current; } };
}

/* Edge prompt: the player walks toward the island edge. */
export function createEdgePrompt(text = 'The bridges are this way') {
  const element = el('div', { class: 'ui-prompt ui-world-prompt', role: 'status' },
    el('p', { class: 'ui-prompt__line' }, text), icon('arrow-right'));
  replay(element);
  return { element };
}

/* Locked bridge: confirmed copy plus Unlock access (opens the catalog filtered to the island). */
export function createLockedPrompt({ island, onUnlock }) {
  const name = islandUi(island).name;
  const element = el('div', { class: `ui-prompt ui-prompt--locked ui-world-prompt ${islandClass(island)}`, role: 'status' },
    el('p', { class: 'ui-prompt__eyebrow' }, icon('lock'), el('span', { class: 'ui-prompt__swatch', 'aria-hidden': 'true' }), `Bridge locked · ${name}`),
    el('p', { class: 'ui-prompt__body' }, `Adopt a ${name} seed and plant it on your home island to unlock this bridge.`),
    el('button', { type: 'button', class: 'ui-btn ui-btn--s ui-prompt__action', onclick: () => onUnlock?.(island) },
      el('span', { class: 'ui-btn__label' }, 'Unlock access')));
  replay(element);
  return { element };
}

/* Water and nourish feedback, under the reticle after a like or comment.
   Pair it with accessToast() from toast.mjs for the hours gained. */
export function createActionFeedback({ kind = 'water', island, until }) {
  const name = islandUi(island).name;
  const element = el('div', { class: `ui-prompt ui-prompt--feedback ui-world-prompt ${islandClass(island)}`, role: 'status' },
    icon(kind === 'nourish' ? 'nourish' : 'water'),
    // Nourish reads "+1 nutrient" to match the Nutrients stat (Cassius, Nov 23).
    el('p', { class: 'ui-prompt__line' }, `+1 ${kind === 'nourish' ? 'nutrient' : 'water'} · ${name} access until ${formatUntil(until)}`));
  replay(element);
  return { element };
}
