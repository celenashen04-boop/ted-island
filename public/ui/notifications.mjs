// Notification list (Figma 21:996 list, 21:1166 empty, Notification Row 14:364).
// Right-side panel opened from the bell. Selecting a row opens the plant or
// the Island Access panel; the game decides which from the item's type.
//
//   const notes = createNotificationPanel({
//     items: [
//       { id: 'n1', type: 'reply', island: 0, plant: 'Haptics for calm breathing', quote: 'Could this work for group breathing?', at: Date.now() - 120000, unread: true },
//       { id: 'n2', type: 'access', island: 1, at: ..., unread: true },
//       { id: 'n3', type: 'thirsty', island: 2, plant: 'Play as research', idleDays: 12, at: ..., unread: false },
//     ],
//     hasEmail: false,
//     onSelect: item => item.type === 'access' ? access.open() : openPlant(item.plantId),
//     onAddEmail: () => menu.select('email'),
//   });
//   document.body.append(notes.layer);
//   bell.element.addEventListener('click', () => notes.open());
//   notes.update(items);                  // new list; returns the unread count for bell.setUnread()
//
// Types and copy follow the four Notification Row variants in Figma:
// Reply, Comment, Access and Thirsty.

import { el, icon, islandClass, islandUi } from './islands-ui.mjs';
import { openPanel, closePanel } from './motion.mjs';

const TYPES = {
  reply: {
    icon: 'reply',
    eyebrow: n => n.plant,
    title: () => 'Reply on your comment',
    body: n => (n.quote ? `“${n.quote}”` : ''),
  },
  comment: {
    icon: 'nourish',
    eyebrow: n => n.plant,
    title: () => 'New comment on your seed',
    body: n => (n.quote ? `“${n.quote}”` : ''),
  },
  access: {
    icon: 'clock',
    eyebrow: () => 'Island Access',
    title: n => `${islandUi(n.island).name} access ends in ${n.hoursLeft ?? 6} hours`,
    body: n => `Water or nourish a ${islandUi(n.island).name} plant to stay longer.`,
  },
  'follow-like': { icon: 'water', eyebrow: n => n.plant, title: () => 'A plant you follow was watered', body: () => '' },
  'follow-comment': { icon: 'nourish', eyebrow: n => n.plant, title: () => 'New discussion on a plant you follow', body: () => '' },
  'follow-plant': { icon: 'seed', eyebrow: n => n.plant, title: () => 'A plant you follow was adopted', body: n => islandUi(n.island).name },
  retention: { icon: 'file', eyebrow: n => n.plant, title: () => 'Plant scheduled for removal', body: () => 'Inactive for 30 days' },
  thirsty: {
    icon: 'water',
    eyebrow: n => n.plant,
    title: () => 'Your tree is getting thirsty',
    body: n => `No activity for ${n.idleDays ?? 12} days. One like revives it.`,
  },
};

/** Short age for the row eyebrow: 2m, 5h, 1d. */
export function ageLabel(at, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - at) / 60000));
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function createRow(item, onSelect, now) {
  const type = TYPES[item.type] ?? TYPES.reply;
  const body = type.body(item);
  const button = el('button', {
    type: 'button',
    class: `ui-note${item.unread ? ' is-unread' : ''} ${islandClass(item.island ?? 0)}`,
    dataset: { id: item.id },
    onclick: () => onSelect(item),
  },
  el('span', { class: 'ui-note__tab', 'aria-hidden': 'true' }, icon(type.icon)),
  el('span', { class: 'ui-note__text' },
    el('span', { class: 'ui-note__eyebrow' },
      el('span', { class: 'ui-note__swatch', 'aria-hidden': 'true' }),
      `${ageLabel(item.at, now)} · ${type.eyebrow(item)}`),
    el('span', { class: 'ui-note__title' },
      item.unread ? el('span', { class: 'ui-sr-only' }, 'Unread: ') : null,
      type.title(item)),
    body ? el('span', { class: 'ui-note__body' }, body) : null));
  return el('li', {}, button, item.exportUrl ? el('a', { href: item.exportUrl, class: 'ui-btn ui-btn--ghost ui-btn--s' }, 'Export plant and discussion') : null);
}

export function createNotificationPanel({
  items = [], hasEmail = false, onSelect, onAddEmail, onClose,
  contained = false, now = () => Date.now(),
}) {
  const titleId = `ui-notes-title-${Math.random().toString(36).slice(2, 8)}`;
  const subtitle = el('p', { class: 'ui-panel-header__subtitle' });
  const close = el('button', { type: 'button', class: 'ui-panel-header__close', 'aria-label': 'Close notifications', title: 'Close' }, icon('close'));
  const header = el('header', { class: 'ui-panel-header' },
    el('div', { class: 'ui-panel-header__row' },
      el('div', { class: 'ui-panel-header__text' },
        el('h2', { class: 'ui-panel-header__title', id: titleId }, 'Notifications'),
        subtitle),
      close),
    el('div', { class: 'ui-panel-header__rule', 'aria-hidden': 'true' }, el('i'), el('i'), el('i')));

  const list = el('ul', { class: 'ui-notes__list', 'aria-labelledby': titleId });
  const emailLine = ' Add an email to get them after CHI too.';
  const emptyBody = el('p', { class: 'ui-notes__empty-body' });
  const addEmail = el('button', { type: 'button', class: 'ui-btn ui-btn--secondary ui-btn--s', onclick: () => onAddEmail?.() },
    icon('arrow-right'), el('span', { class: 'ui-btn__label' }, 'Add email'));
  const empty = el('div', { class: 'ui-notes__empty' },
    el('h3', { class: 'ui-notes__empty-title' }, 'Nothing new yet'), emptyBody, addEmail);

  const panel = el('aside', { class: 'ui-panel ui-panel--notes', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    el('div', { class: 'ui-notes' }, header, list, empty));
  const backdrop = el('div', { class: 'ui-backdrop' });
  const layer = el('div', { class: `ui-layer${contained ? ' ui-layer--contained' : ''}`, dataset: { state: 'closed' } }, backdrop, panel);

  let data = items;

  function select(item) {
    if (item.unread) {
      item.unread = false;
      update(data);
      // The row was rebuilt; keep keyboard focus on it.
      [...list.querySelectorAll('.ui-note')].find(b => b.dataset.id === String(item.id))?.focus();
    }
    onSelect?.(item);
  }

  /** Re-render. Returns the unread count so the caller can update the bell. */
  function update(next = data, { email = hasEmail } = {}) {
    data = next;
    hasEmail = email;
    const t = now();
    const unread = data.filter(n => n.unread).length;
    const sorted = [...data].sort((a, b) => b.at - a.at);
    list.replaceChildren(...sorted.map(n => createRow(n, select, t)));
    list.hidden = data.length === 0;
    empty.hidden = data.length > 0;
    subtitle.textContent = unread ? `${unread} unread` : 'All caught up';
    emptyBody.textContent = 'Replies to your comments, comments on your seeds, access reminders and thirsty trees show up here.' + (hasEmail || !onAddEmail ? '' : emailLine);
    addEmail.hidden = hasEmail || !onAddEmail;
    return unread;
  }

  function open() { update(); openPanel(layer); }
  async function hide() { await closePanel(layer); onClose?.(); }
  close.addEventListener('click', hide);
  backdrop.addEventListener('click', hide);
  layer.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });

  update();
  return { layer, panel, open, close: hide, update, get unread() { return data.filter(n => n.unread).length; } };
}
