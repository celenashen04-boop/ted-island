// Rotate prompt (Figma 18:3), built as drawn. Replaces #landscape-required.
// The game stays landscape only; show this when a phone is held upright and
// hide it when it turns back. The existing show and hide logic in app.mjs
// can keep driving it: only the markup changes.
//
//   const rotate = createRotatePrompt({ onFullscreen });   // onFullscreen is optional
//   document.body.append(rotate.element);
//   rotate.setVisible(isPortraitPhone);

import { el, icon } from './islands-ui.mjs';

export function createRotatePrompt({ onFullscreen, contained = false } = {}) {
  const fullscreen = onFullscreen
    ? el('button', { type: 'button', class: 'ui-btn', onclick: () => onFullscreen() }, el('span', { class: 'ui-btn__label' }, 'Open in landscape'))
    : null;
  const element = el('div', {
    class: `ui-rotate${contained ? ' ui-rotate--contained' : ''}`,
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'ui-rotate-title',
    'aria-describedby': 'ui-rotate-body',
    hidden: true,
  },
  el('p', { class: 'ui-eyebrow' }, 'CHI Island'),
  el('div', { class: 'ui-rule', 'aria-hidden': 'true' }, el('i'), el('i'), el('i')),
  el('div', { class: 'ui-rotate__space' }),
  el('span', { class: 'ui-icon ui-icon--rotate ui-rotate__icon', 'aria-hidden': 'true' }),
  el('h1', { class: 'ui-rotate__title', id: 'ui-rotate-title' }, 'Turn your phone sideways'),
  el('p', { class: 'ui-rotate__body', id: 'ui-rotate-body' }, 'CHI Island plays in landscape.'),
  fullscreen,
  el('div', { class: 'ui-rotate__push' }),
  el('p', { class: 'ui-rotate__note' }, 'Rotation lock on? Swipe down for Control Center and turn it off.'));

  return {
    element,
    setVisible(on) { element.hidden = !on; },
  };
}
