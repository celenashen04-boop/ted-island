// Notification bell with an unread dot (Icon Button 13:69 with the unread dot).
// The dot is shape, and the accessible label carries the count, so color is
// never the only signal.
//
//   const bell = createBell({ unread: 2, onOpen: () => openPanel(notifications) });
//   bell.setUnread(3, { pulse: true }); // when a new notification arrives

import { el, icon } from './islands-ui.mjs';
import { replay } from './motion.mjs';

export function createBell({ unread = 0, onOpen } = {}) {
  const dot = el('img', { class: 'ui-icon-btn__dot', src: '/ui/icons/unread-dot.svg', alt: '' });
  const element = el('button', {
    type: 'button',
    class: 'ui-icon-btn',
    title: 'Notifications',
    'aria-haspopup': 'dialog',
  }, icon('bell'), dot);

  let count = 0;
  function setUnread(next, { pulse = false } = {}) {
    const grew = next > count;
    count = Math.max(0, next);
    dot.hidden = count === 0;
    element.setAttribute('aria-label', count ? `Notifications, ${count} unread` : 'Notifications');
    if (pulse && grew) replay(dot);
  }
  setUnread(unread);

  if (onOpen) element.addEventListener('click', () => onOpen());
  return { element, setUnread, get unread() { return count; } };
}
