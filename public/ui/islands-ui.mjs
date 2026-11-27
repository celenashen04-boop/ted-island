// UI presentation for the shared island IDs and names.
// short is the one-word form used in small labels ("Young plant · Health").
import { islands } from '../islands.mjs';

const presentation = [
  { key: 'health', short: 'Health' },
  { key: 'sustainability', short: 'Sustainability' },
  { key: 'games', short: 'Games' },
];
export const ISLAND_UI = islands.map(({id,name})=>({id,name,...presentation[id]}));

/** Island record by id, or the muted placeholder if unknown. */
export function islandUi(id) {
  return ISLAND_UI.find(island => island.id === id) ?? { id, key: 'muted', name: 'Unknown island' };
}

/** CSS class that sets --island to that island's hue. */
export const islandClass = id => 'ui-island-' + islandUi(id).key;

/** Shared island badge image path. */
export const islandBadgeSrc = id => `/ui/badges/${islandUi(id).key}.svg`;

/** Small DOM helper used by the UI modules: el('span', { class: 'x' }, 'text'). */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    if (name === 'dataset') Object.assign(node.dataset, value);
    else if (name.startsWith('on') && typeof value === 'function') node.addEventListener(name.slice(2), value);
    else node.setAttribute(name, value === true ? '' : value);
  }
  node.append(...children.flat().filter(child => child != null && child !== false));
  return node;
}

/** Icon span for the masked icon set. */
export const icon = (name, size) =>
  el('span', { class: `ui-icon ui-icon--${name}${size ? ` ui-icon--${size}` : ''}`, 'aria-hidden': 'true' });
