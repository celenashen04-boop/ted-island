// Followed plants (menu 03). Figma 31:486, empty state 31:693.
// A 440 px right panel listing the plants the player follows, new activity
// first. Selecting a row opens Plant detail. The empty state points to
// Island plants.
//
//   const followed = createFollowedPlants({
//     plants: [ { id, island, title, stage, dormant, at, newReplies, contributors }, ... ],  // see plant-row.mjs
//     onOpen: plant => detail.open(...),
//     onBrowse: () => islandPlants.open(),
//   });
//   document.body.append(followed.layer);
//   followed.open();
//   hud.menu.setMeta('followed', followedMenuMeta(plants));   // "2 new replies"

import { el, icon } from './islands-ui.mjs';
import { createPanelShell } from './panel.mjs';
import { createPlantRow, plantRowState, sortPlants } from './plant-row.mjs';

/** Menu meta line: "2 new replies", or nothing when there is no new activity. */
export function followedMenuMeta(plants = []) {
  const replies = plants.filter(p => plantRowState(p) === 'new').reduce((n, p) => n + p.newReplies, 0);
  return replies ? `${replies} ${replies === 1 ? 'new reply' : 'new replies'}` : '';
}

export function createFollowedPlants({ plants = [], onOpen, onBrowse, onClose, contained = false, now }) {
  const shell = createPanelShell({
    title: 'Followed plants', className: 'ui-panel--followed',
    closeLabel: 'Close Followed plants', contained, onClose,
  });
  const list = el('ul', { class: 'ui-plant-list' });
  const empty = el('div', { class: 'ui-plant-empty', hidden: true },
    el('p', { class: 'ui-plant-empty__title' }, 'You’re not following any plants yet'),
    el('p', { class: 'ui-plant-empty__body' }, 'Open a plant and tap Follow. New comments and replies on it show up here and in your bell.'),
    el('button', { type: 'button', class: 'ui-btn ui-btn--secondary', onclick: () => onBrowse?.() },
      icon('eye'), el('span', { class: 'ui-btn__label' }, 'Browse island plants')));
  shell.body.append(list, empty);

  let data = plants;
  function render() {
    const fresh = data.filter(p => plantRowState(p) === 'new').length;
    shell.header.setSubtitle(!data.length ? 'Nothing followed yet' : fresh ? `${fresh} with new activity` : 'Up to date');
    list.replaceChildren(...sortPlants(data).map(p => el('li', {}, createPlantRow(p, { onOpen, now: now ?? Date.now() }))));
    list.hidden = !data.length;
    empty.hidden = Boolean(data.length);
    return fresh;
  }
  render();

  return {
    layer: shell.layer,
    panel: shell.panel,
    open: () => { render(); return shell.open(); },
    close: shell.close,
    /** New list; returns how many plants have new activity. */
    update(next) { data = next; return render(); },
  };
}
