// Top-right menu: black icon button plus dropdown (Menu 14:68, Menu Item 14:67).
//
//   const menu = createMenu({
//     playerId: 'Mossy-Fern-4821',
//     items: [
//       { id: 'catalog', title: 'Seed Catalog', meta: 'Adopt from other islands' },
//       { id: 'access', title: 'Island Access', meta: '1 island open · 3d left' },
//     ],
//     onSelect: id => { ... },   // called after the menu closes
//     onLogout: () => { ... },
//   });
//   hud.append(menu.element);
//   menu.setMeta('access', '2 islands open · 1d left');
//
// Keyboard: Enter, Space or ArrowDown opens and focuses the first item.
// ArrowUp/ArrowDown/Home/End move. Escape closes and returns focus to the
// button. Tab or a tap outside closes.

import { el, icon } from './islands-ui.mjs';
import { toggleMenu } from './motion.mjs';

let menuCount = 0;

export function createMenu({ items, playerId, onSelect, onLogout, label = 'Menu' }) {
  const menuId = `ui-menu-${++menuCount}`;
  const button = el('button', {
    type: 'button',
    class: 'ui-icon-btn',
    title: label,
    'aria-label': label,
    'aria-haspopup': 'menu',
    'aria-expanded': 'false',
    'aria-controls': menuId,
  }, icon('menu'));

  const rows = new Map();
  const list = items.map((item, index) => {
    const meta = el('span', { class: 'ui-menu__meta' }, item.meta ?? '');
    const row = el('button', {
      type: 'button',
      class: 'ui-menu__item',
      role: 'menuitem',
      tabindex: '-1',
      dataset: { id: item.id },
    },
    el('span', { class: 'ui-menu__index', 'aria-hidden': 'true' }, String(index + 1).padStart(2, '0')),
    el('span', { class: 'ui-menu__text' }, el('span', { class: 'ui-menu__title' }, item.title), meta));
    rows.set(item.id, { row, meta });
    return row;
  });

  const idText = el('span', { class: 'ui-menu__id' }, (playerId ?? '').toUpperCase());
  const logout = el('button', { type: 'button', class: 'ui-menu__item', role: 'menuitem', tabindex: '-1', dataset: { id: 'logout' } }, 'Sign out');
  const foot = el('div', { class: 'ui-menu__foot', role: 'none' }, idText, onLogout ? logout : null);

  const menu = el('div', { class: 'ui-menu', id: menuId, role: 'menu', 'aria-label': label, dataset: { state: 'closed' } }, list, foot);
  const element = el('div', { class: 'ui-menu-anchor' }, button, menu);

  const focusables = () => [...menu.querySelectorAll('[role="menuitem"]')];
  const isOpen = () => menu.dataset.state === 'open';

  function open(focus = 'first') {
    if (isOpen()) return;
    toggleMenu(button, menu, true);
    document.addEventListener('pointerdown', onOutside, true);
    const all = focusables();
    (focus === 'last' ? all.at(-1) : all[0])?.focus();
  }
  function close({ returnFocus = true } = {}) {
    if (!isOpen()) return;
    document.removeEventListener('pointerdown', onOutside, true);
    toggleMenu(button, menu, false);
    if (returnFocus) button.focus();
  }
  function onOutside(event) {
    if (!element.contains(event.target)) close({ returnFocus: false });
  }

  button.addEventListener('click', () => (isOpen() ? close() : open()));
  button.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); open('first'); }
    if (event.key === 'ArrowUp') { event.preventDefault(); open('last'); }
  });

  menu.addEventListener('keydown', event => {
    const all = focusables();
    const index = all.indexOf(document.activeElement);
    const move = next => { event.preventDefault(); all[(next + all.length) % all.length].focus(); };
    if (event.key === 'ArrowDown') move(index + 1);
    else if (event.key === 'ArrowUp') move(index - 1);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(all.length - 1);
    else if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if (event.key === 'Tab') close({ returnFocus: false });
  });

  menu.addEventListener('click', event => {
    const row = event.target.closest('[role="menuitem"]');
    if (!row) return;
    const id = row.dataset.id;
    close();
    if (id === 'logout') onLogout?.();
    else onSelect?.(id);
  });

  return {
    element,
    button,
    menu,
    open,
    close,
    /** Update the live meta line under an item. */
    setMeta(id, text) { const entry = rows.get(id); if (entry) entry.meta.textContent = text; },
    /** Mark the item whose panel is open (selected look). Pass null to clear. */
    setCurrent(id) { for (const [key, { row }] of rows) row.toggleAttribute('aria-current', key === id); },
    setPlayerId(next) { idText.textContent = next; },
  };
}
