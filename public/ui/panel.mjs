// Shared panel shell: Panel Header (16:132), backdrop, layer, open and close.
// Used by the Phase 6 panels (catalog, new seed, plant detail).
//
//   const shell = createPanelShell({ title: 'Seed Catalog', subtitle: '...', island: 1,
//     className: 'ui-panel--catalog', closeLabel: 'Close Seed Catalog', onClose });
//   shell.body.append(...);
//   document.body.append(shell.layer);
//   shell.open();

import { el, icon, islandClass } from './islands-ui.mjs';
import { openPanel, closePanel } from './motion.mjs';

let count = 0;

/** Panel Header: title, subtitle, close, and the black / grey / island rule. */
export function createPanelHeader({ title, subtitle = '', island, closeLabel = 'Close', titleId, headingLevel = 'h2' }) {
  const titleEl = el(headingLevel, { class: 'ui-panel-header__title', id: titleId }, title);
  const subtitleEl = el('p', { class: 'ui-panel-header__subtitle' }, subtitle);
  const close = el('button', { type: 'button', class: 'ui-panel-header__close', 'aria-label': closeLabel, title: 'Close' }, icon('close'));
  const element = el('header', { class: `ui-panel-header${island == null ? '' : ` ${islandClass(island)}`}` },
    el('div', { class: 'ui-panel-header__row' }, el('div', { class: 'ui-panel-header__text' }, titleEl, subtitleEl), close),
    el('div', { class: 'ui-panel-header__rule', 'aria-hidden': 'true' }, el('i'), el('i'), el('i')));
  return {
    element, close,
    setTitle: text => { titleEl.textContent = text; },
    setSubtitle: text => { subtitleEl.textContent = text; },
    setIsland(id) {
      element.className = `ui-panel-header${id == null ? '' : ` ${islandClass(id)}`}`;
    },
  };
}

/**
 * A right-side (or full-width) panel in a .ui-layer. header: false skips the
 * Panel Header for panels that draw their own (plant detail).
 */
export function createPanelShell({
  title, subtitle, island, className = '', closeLabel, header = true, labelledBy,
  contained = false, onClose,
}) {
  const titleId = `ui-panel-title-${++count}`;
  const head = header ? createPanelHeader({ title, subtitle, island, closeLabel, titleId }) : null;
  const body = el('div', { class: 'ui-panel__body' });
  const panel = el('aside', {
    class: `ui-panel ${className}`.trim(),
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': labelledBy ?? titleId,
  }, head ? head.element : null, body);
  const backdrop = el('div', { class: 'ui-backdrop' });
  const layer = el('div', { class: `ui-layer${contained ? ' ui-layer--contained' : ''}`, dataset: { state: 'closed' } }, backdrop, panel);

  async function close() {
    if (layer.dataset.state === 'closed') return;
    await closePanel(layer);
    onClose?.();
  }
  head?.close.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  layer.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } });

  return {
    layer, panel, body, header: head, titleId,
    open: () => openPanel(layer),
    close,
    get isOpen() { return layer.dataset.state !== 'closed'; },
  };
}
