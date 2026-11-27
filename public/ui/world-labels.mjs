// World View island labels and legend (Figma 23:3, World Island Label 16:416).
// Home is inverse with a home icon, Open shows time left, Locked shows a lock.
// The maturity rate sits under every name, or "No ideas yet", never 0%.
//
//   const label = createWorldLabel({ island: 1, access: 'open', maturity: { mature: 4, total: 12 }, hoursLeft: 76 });
//   worldLayer.append(label.element);              // the game positions it over the island
//   label.set({ access: 'locked' });
//   worldLayer.append(createWorldLegend().element);

import { el, icon, islandBadgeSrc, islandClass, islandUi } from './islands-ui.mjs';
import { maturityText } from './access-ring.mjs';

/** "3d left" (24 h or more), "6h left". */
export function shortLeft(hours) {
  const h = Math.max(0, Math.ceil(hours));
  return h >= 24 ? `${Math.floor(h / 24)}d left` : `${h}h left`;
}

export function createWorldLabel(initial) {
  const name = el('span', { class: 'ui-world-label__name' });
  const badge = el('img', { class: 'ui-badge ui-badge--sm', alt: '' });
  const mark = el('span', { class: 'ui-world-label__mark' });
  const meta = el('span', { class: 'ui-world-label__meta' });
  const element = el('span', { class: 'ui-world-label' },
    el('span', { class: 'ui-world-label__row' }, badge, name, mark),
    meta);
  let state = {};

  function set(next) {
    state = { ...state, ...next };
    const { island, access = 'locked', maturity, hoursLeft } = state;
    element.className = `ui-world-label ui-world-label--${access} ${islandClass(island)}`;
    badge.src = islandBadgeSrc(island);
    name.textContent = islandUi(island).name;
    mark.replaceChildren(access === 'home' ? icon('home') : access === 'locked' ? icon('lock') : '');
    const parts = [maturityText(maturity)];
    if (access === 'open' && hoursLeft != null) parts.push(shortLeft(hoursLeft));
    if (access === 'locked') parts.push('Locked');
    meta.textContent = parts.join(' · ');
    // Icons are decorative; the words carry home, open and locked for screen readers.
    element.setAttribute('aria-label', `${islandUi(island).name}${access === 'home' ? ', home island' : ''}. ${parts.join(', ')}`);
  }
  set(initial);
  return { element, set };
}

export function createWorldLegend() {
  const element = el('div', { class: 'ui-world-legend' },
    el('span', { class: 'ui-world-legend__open', 'aria-hidden': 'true' }), el('span', {}, 'Open to you'),
    el('img', { class: 'ui-world-legend__locked', src: '/ui/markers/legend-locked.svg', alt: '', width: 24, height: 4 }), el('span', {}, 'Locked'),
    el('span', { class: 'ui-world-legend__hint' }, 'Drag to rotate'));
  return { element };
}
