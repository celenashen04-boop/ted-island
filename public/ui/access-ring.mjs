// Island Access ring, card and row (Figma Access Card 14:268, Access Row 22:277).
// Fixed 120 hour scale, matching the access cap. The exact time is always
// shown in text, so ring length and color are never the only signal.
//
// Data in (one island):
//   {
//     islandId: 1,                 // id from islands.mjs
//     name: 'Sustainability',      // optional, defaults from islands-ui.mjs
//     hue: '#1E9E6A',              // optional, defaults to the island token
//     iconSvg: '<svg>...</svg>',   // optional, Ray's island icon; placeholder badge otherwise
//     expiresAt: 1764021600000,    // ms timestamp, or null if never opened
//     now: Date.now(),
//     maturity: { mature: 4, total: 12 },
//     isHome: false,
//   }
//
//   const card = createAccessCard(data, { onVisit, onUnlock, onSelect });
//   list.append(card.element);
//   card.update({ ...data, expiresAt: later, now: Date.now() }); // ring and numeral animate

import { el, icon, islandClass, islandUi, islandBadgeSrc } from './islands-ui.mjs';
import { setRing, setNumeral, ACCESS_CAP_HOURS } from './motion.mjs';

const HOUR = 3600 * 1000;
const ALERT_HOURS = 6;

/* ---------- Formatters (all copy lives here) ---------- */

/**
 * Derive the display state for one island.
 * Hours round up, so a card never reads 00H while access is still open.
 */
export function accessState({ expiresAt, now = Date.now(), isHome = false }) {
  if (isHome) return { kind: 'home', hours: Infinity, pct: 100 };
  if (expiresAt == null) return { kind: 'never', hours: 0, pct: 0 };
  const hours = Math.max(0, Math.ceil((expiresAt - now) / HOUR));
  if (hours <= 0) return { kind: 'expired', hours: 0, pct: 0 };
  const pct = Math.min(100, (hours / ACCESS_CAP_HOURS) * 100);
  return { kind: hours <= ALERT_HOURS ? 'alert' : 'active', hours, pct };
}

/** "5 days left", "24 hours left", "6 hours left", "Access expired" (visualrequirement.md table). */
export function timeLabel(state) {
  switch (state.kind) {
    case 'home': return 'Home · always open';
    case 'never': return 'Not open yet';
    case 'expired': return 'Access expired';
    default: {
      const { hours } = state;
      if (hours >= 48) return `${Math.floor(hours / 24)} days left`;
      return hours === 1 ? '1 hour left' : `${hours} hours left`;
    }
  }
}

/** Big numeral text: "120H", "72H", "06H", "00H", or the infinity sign for home. */
export function numeralText(state) {
  if (state.kind === 'home') return '∞';
  return String(state.hours).padStart(2, '0') + 'H';
}

/** Confirmed copy: "4 of 12 ideas mature (33%)", or "No ideas yet" (never 0%). Same on cards and rows. */
export function maturityText({ mature = 0, total = 0 } = {}) {
  if (!total) return 'No ideas yet';
  const pct = Math.round((mature / total) * 100);
  return `${mature} of ${total} ideas mature (${pct}%)`;
}

/** "Nov 24 at 3:30 p.m." */
export function formatExpiry(ms) {
  const date = new Date(ms);
  const month = date.toLocaleString('en-US', { month: 'short' });
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const hour12 = h % 12 || 12;
  return `${month} ${date.getDate()} at ${hour12}:${m} ${h < 12 ? 'a.m.' : 'p.m.'}`;
}

/* ---------- Ring ---------- */

const GEOMETRY = {
  card: { size: 80, r: 34, badge: 32 },
  row: { size: 52, r: 22, badge: 24 },
};
const SVG = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/**
 * Ring with the island badge in the center. size: 'card' (80 px) or 'row' (52 px).
 * Returns { element, svg, update(state) }.
 */
export function createRing({ islandId, hue, iconSvg, size = 'card' }) {
  const g = GEOMETRY[size];
  const c = g.size / 2;
  const svg = svgEl('svg', { class: 'ui-ring', viewBox: `0 0 ${g.size} ${g.size}`, 'aria-hidden': 'true' });
  svg.append(
    svgEl('circle', { class: 'ui-ring__track', cx: c, cy: c, r: g.r }),
    svgEl('circle', { class: 'ui-ring__arc', cx: c, cy: c, r: g.r, pathLength: 100 }),
  );

  const badge = el('span', { class: 'ui-ring__badge', 'aria-hidden': 'true' });
  const placeholder = el('img', { class: 'ui-badge', src: islandBadgeSrc(islandId), alt: '' });
  const muted = el('img', { class: 'ui-badge', src: '/ui/badges/muted.svg', alt: '' });
  const custom = iconSvg ? el('span', { class: 'ui-ring__icon' }) : null;
  if (custom) custom.innerHTML = iconSvg;
  badge.append(custom ?? placeholder);

  const element = el('span', { class: `ui-ring-wrap ui-ring-wrap--${size} ${islandClass(islandId)}` }, svg, badge);
  if (hue) element.style.setProperty('--island', hue);

  function update(state) {
    const off = state.kind === 'expired' || state.kind === 'never';
    element.classList.toggle('is-muted', off);
    badge.replaceChildren(off ? muted : (custom ?? placeholder));
    // setRing works in hours on the fixed scale; home is always full.
    setRing(svg, state.kind === 'home' ? ACCESS_CAP_HOURS : state.hours);
  }
  return { element, svg, update };
}

/* ---------- Card and row ---------- */

function build(data, { onVisit, onUnlock, onSelect }, size) {
  const island = islandUi(data.islandId);
  const name = data.name ?? island.name;
  const ring = createRing({ islandId: data.islandId, hue: data.hue, iconSvg: data.iconSvg, size });

  const numeral = el('span', { class: size === 'card' ? 'ui-numeral' : 'ui-numeral ui-numeral--row', 'aria-hidden': 'true' });
  const timeText = el('span');
  const time = el('span', { class: 'ui-access__time' }, icon('clock', 14), timeText);
  const maturity = el('span', { class: 'ui-access__maturity' });
  const expiry = el('span', { class: 'ui-access__expiry', 'aria-live': 'polite' });
  const live = el('span', { class: 'ui-sr-only' });

  const visitLabel = size === 'card' ? 'Visit island' : 'Visit';
  const unlockLabel = size === 'card' ? 'Unlock access' : 'Unlock';
  const visit = el('button', { type: 'button', class: 'ui-btn ui-btn--secondary ui-btn--s ui-access__action', 'aria-label': `${visitLabel}: ${name}` },
    icon('arrow-right'), el('span', { class: 'ui-btn__label' }, visitLabel));
  const unlock = el('button', { type: 'button', class: 'ui-btn ui-btn--s ui-access__action', 'aria-label': `${unlockLabel}: ${name}` },
    el('span', { class: 'ui-btn__label' }, unlockLabel));
  visit.addEventListener('click', () => onVisit?.(data.islandId));
  unlock.addEventListener('click', () => onUnlock?.(data.islandId));

  // Whole-card select target (shows the exact expiry). Sits behind the action button.
  const hit = el('button', { type: 'button', class: 'ui-access__hit', 'aria-expanded': 'false' }, live);

  const head = el('span', { class: 'ui-access__name' }, el('i', { class: 'ui-access__swatch', 'aria-hidden': 'true' }), name);
  const homeNote = el('span', { class: 'ui-access__maturity' }, 'You live here');

  const element = size === 'card'
    ? el('div', { class: `ui-access-card ${islandClass(data.islandId)}`, role: 'group', 'aria-label': name },
        hit, head, ring.element, numeral, time, maturity, expiry, homeNote, visit, unlock)
    : el('div', { class: `ui-access-row ${islandClass(data.islandId)}`, role: 'group', 'aria-label': name },
        hit, ring.element,
        el('span', { class: 'ui-access-row__text' }, head, time, maturity),
        numeral, visit, unlock);
  if (data.hue) element.style.setProperty('--island', data.hue);

  let current = data;
  let selected = false;
  // Rows show the expiry on a line under the bordered box, as in Figma 21:379.
  const root = size === 'card' ? element : el('div', { class: 'ui-access-row-wrap' }, element, expiry);

  function render(next) {
    current = { ...current, ...next };
    const state = accessState(current);
    const active = state.kind === 'active' || state.kind === 'alert';
    element.dataset.state = state.kind;
    ring.update(state);

    // Numeral: count for hours, plain text for the home infinity sign.
    if (state.kind === 'home') {
      numeral.classList.add('is-text');
      numeral.textContent = '∞';
    } else {
      numeral.classList.remove('is-text');
      numeral.textContent = '';
      setNumeral(numeral, state.hours);
    }

    timeText.textContent = timeLabel(state);
    time.classList.toggle('is-alert', state.kind === 'alert');
    maturity.textContent = maturityText(current.maturity);
    homeNote.hidden = state.kind !== 'home' || size === 'row';
    visit.hidden = !active;
    unlock.hidden = !(state.kind === 'expired' || state.kind === 'never');
    hit.disabled = !active;
    if (!active && selected) setSelected(false);

    const expiryText = !active ? '' : size === 'card'
      ? `Access ends ${formatExpiry(current.expiresAt)}`
      : `Access ends ${formatExpiry(current.expiresAt)} · Visit turns your view to the ${name} bridge.`;
    expiry.textContent = selected ? expiryText : '';
    expiry.hidden = !selected || !active;
    live.textContent = `${name}: ${timeLabel(state)}${active ? `, ${numeralText(state)}` : ''}. ${maturityText(current.maturity)}.${active ? ' Show exact expiry.' : ''}`;
    return state;
  }

  function setSelected(on) {
    selected = on;
    element.classList.toggle('is-selected', on);
    hit.setAttribute('aria-expanded', String(on));
    render({});
  }

  hit.addEventListener('click', () => {
    setSelected(!selected);
    onSelect?.(data.islandId, selected);
  });

  render(data);
  return {
    element: root,
    update: render,
    setSelected,
    get selected() { return selected; },
    get expiryText() { return expiry.textContent; },
    islandId: data.islandId,
  };
}

/** Full card for wide screens (176 px). */
export const createAccessCard = (data, handlers = {}) => build(data, handlers, 'card');

/** Compact row for landscape phones. */
export const createAccessRow = (data, handlers = {}) => build(data, handlers, 'row');
