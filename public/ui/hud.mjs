// Top-right HUD cluster: ID label, notification bell, menu (Player View 20:3).
//
//   import { createTopRight } from '/ui/hud.mjs';
//   const hud = createTopRight({
//     playerId: 'Mossy-Fern-4821',
//     unread: 1,
//     items: MENU_ITEMS,
//     onSelect: id => id === 'catalog' ? openCatalog() : ...,
//     onNotifications: () => openPanel(notificationsLayer),
//     onLogout: () => ...,
//   });
//   document.querySelector('.world').append(hud.element);

import { el } from './islands-ui.mjs';
import { createIdLabel } from './id-label.mjs';
import { createBell } from './bell.mjs';
import { createMenu } from './menu.mjs';

/**
 * Menu contents, Option C (chosen by Cassius, Nov 22): Figma's four items
 * plus Email and reminders, the home for the optional email, the expiry
 * reminder checkbox, and unsubscribe. Meta lines are live; update with setMeta.
 */
export const MENU_ITEMS = [
  { id: 'catalog', title: 'Seed Catalog', meta: 'Adopt from other islands' },
  { id: 'access', title: 'Island Access', meta: '' },
  { id: 'followed', title: 'Followed plants', meta: '' },
  { id: 'how-to-play', title: 'How to play', meta: 'Replay the tutorial' },
  { id: 'settings', title: 'Email and reminders', meta: 'Not set up' },
];

export function createTopRight({ playerId, unread = 0, items = MENU_ITEMS, onSelect, onNotifications, onLogout }) {
  const idLabel = createIdLabel(playerId);
  const bell = createBell({ unread, onOpen: onNotifications });
  const menu = createMenu({ items, playerId, onSelect, onLogout });
  const element = el('div', { class: 'ui-hud-tr' }, idLabel.element, bell.element, menu.element);
  return {
    element,
    idLabel,
    bell,
    menu,
    setPlayerId(id) { idLabel.setId(id); menu.setPlayerId(id); },
  };
}
