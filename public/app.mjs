import { installGameDesign } from './design-assets.mjs';
import { createScene } from './scene.mjs';
import { createWorld } from './world.mjs';
import { plantStage } from './plots.mjs';
import { islands } from './islands.mjs';

const byId = id => document.getElementById(id);
const map = byId('map');
const message = byId('message');
const seedLauncher = byId('seed-mode');
const plantingTip = byId('planting-tip');
const throwControl = 'tap';
const plantDialog = byId('plant-dialog');
const landscapeDialog = byId('landscape-required');
const catalog = byId('seed-catalog');
const catalogSeed = byId('catalog-seed');
const adoptSeed = byId('catalog-seed-adopt');
const catalogTip = byId('catalog-tip');
const catalogTipKey = 'chi-island.catalog-tip-seen';
let catalogTipSeen = false;
const ideaDialog = byId('idea-dialog');
const islandPlants = byId('island-plants');
const browsePlants = byId('browse-plants');
const plantForm = byId('plant-form');
const commentForm = byId('comment-form');
const waterButton = byId('water');
const worldView = byId('world-view');
const dashboard = byId('world-dashboard');
const dashboardButton = byId('toggle-dashboard');
const playerView = map.closest('main');
const artwork = new Map();
const homeIslandButton = byId('home-island');
const world = createWorld(byId('world-map'), artwork, homeIslandButton, closeWorld);
let state = null;
let currentIsland = null;
let plants = [];
let selectedAdoption = null;
let catalogIsland = null;
let openCatalogPacket = null;
let pendingPlant = null;
let plantWaitingForLandscape = false;
let openPlant = null;
let openPlantFromScene = false;
let replyTo = null;
let live = false;
let submitting = false;
let changingPlant = false;
let messageTimer;

const islandName = id => islands.find(island => island.id === id)?.name ?? 'Unknown island';

function element(tag, text, className) {
  const result = document.createElement(tag);
  if (text) result.textContent = text;
  if (className) result.className = className;
  return result;
}

function button(text, action) {
  const result = element('button', text, 'secondary');
  result.type = 'button';
  result.addEventListener('click', action);
  return result;
}

function announce(text) {
  message.textContent = text;
  clearTimeout(messageTimer);
  if (text) messageTimer = setTimeout(() => { message.textContent = ''; }, 3700);
}

function firstUseTip(id, focusTarget) {
  const tip = byId(id);
  const key = 'chi-island.' + id + '-seen';
  let dismissed = false;
  try { dismissed = localStorage.getItem(key) === '1'; }
  catch { /* Dismissal still works for this page. */ }
  tip.querySelector('button').addEventListener('click', () => {
    dismissed = true;
    tip.hidden = true;
    try { localStorage.setItem(key, '1'); }
    catch { /* Keep the in-memory dismissal. */ }
    focusTarget.focus({preventScroll:true});
  });
  return (visible = true) => { tip.hidden = dismissed || !visible; };
}

const showMovementTip = firstUseTip('movement-tip', map);
const showWorldTip = firstUseTip('world-tip', homeIslandButton);
const showParticipationTip = firstUseTip('participation-tip', byId('follow'));

const scene = createScene(map, {
  artwork,
  throwControl,
  onPlant(id) { showIdea(id, true); },
  onCross(destination, position) {
    const away = currentIsland === state.home ? destination : currentIsland;
    if (destination !== state.home && currentIsland !== state.home) return;
    if (!state.bridges.some(bridge => bridge.destination === away && bridge.canCross)) return;
    currentIsland = destination;
    scene.arrive(position);
    updateGarden();
    announce(destination === state.home ? 'Back on your home island.' : 'You crossed to ' + islandName(destination) + '.');
  },
  onBridgeLocked() { announce('Comment on a shared plant to earn access to this bridge.'); },
  onThrowRequest() {
    if (!live) { announce('Connecting to the garden…'); return false; }
    if (currentIsland !== state.home) { announce('Return home to plant a seed.'); return false; }
    return true;
  },
  onLanding(result, point) {
    if (result === 'miss') return announce('The seed went off the island. Try another throw.');
    if (result === 'blocked') return announce('The seed needs open grass. Try another throw.');
    if (catalogSeed.open) catalogSeed.close();
    if (catalog.open) catalog.close();
    if (!worldView.hidden) closeWorld();
    pendingPlant = { ...point, island: currentIsland, adoption: selectedAdoption };
    plantForm.reset();
    byId('plant-error').textContent = '';
    const adoption = pendingPlant.adoption;
    byId('seed-fields').hidden = Boolean(adoption);
    byId('seed-fields').querySelectorAll('input,textarea').forEach(field => { field.disabled = Boolean(adoption); });
    const confirmation = byId('adoption-confirmation');
    confirmation.hidden = !adoption;
    confirmation.textContent = adoption ? 'Plant “' + adoption.title + '” here to begin connecting the islands.' : '';
    plantWaitingForLandscape = landscapeDialog.open;
    if (!plantWaitingForLandscape) plantDialog.showModal();
  }
});

function setDashboard(open) {
  const restoreFocus = !open && dashboard.contains(document.activeElement);
  dashboard.inert = !open;
  dashboard.classList.toggle('is-open', open);
  dashboardButton.setAttribute('aria-expanded', String(open));
  showWorldTip(!open);
  if (restoreFocus) dashboardButton.focus();
}

function closeWorld() {
  setDashboard(false);
  worldView.hidden = true;
  playerView.inert = false;
  map.focus({ preventScroll: true });
}

function updateGarden() {
  plants = state.plants.filter(plant => plant.island === currentIsland);
  scene.update(plants,currentIsland,state.bridges);
  const visiting = currentIsland !== state.home;
  browsePlants.hidden = !visiting;
  seedLauncher.hidden = visiting;
  if (!visiting && islandPlants.open) islandPlants.close();
  if (islandPlants.open) renderIslandPlants();
  byId('island-name').textContent = islandName(currentIsland) + (currentIsland === state.home ? ' · Home' : ' · Visiting');
  const launchLabel = selectedAdoption ? 'Plant adopted seed' : 'Plant a seed';
  seedLauncher.setAttribute('aria-label', launchLabel);
  seedLauncher.title = launchLabel + ' (Q)';
  plantingTip.textContent = throwControl === 'slingshot' ? 'Drag back and release.' : 'Tap to throw.';
}

const catalogExamples = {
  0: [
    ['A Minute to Reset', 'Shared breathing breaks during stressful school weeks.', 'Could a one-minute pause help students feel more connected?'],
    ['Walk and Talk', 'A walking companion that prompts low-pressure conversations.', 'What makes it easier to open up while walking?'],
    ['The Quiet Check-In', 'A private way to share how your workday is going with your team.', 'What makes a check-in feel supportive?'],
    ['Small Wins Journal', 'A journal that helps people notice small achievements.', 'When does reflecting on a small win change how someone feels?']
  ],
  1: [
    ['The Repair Café Effect', 'A study of what brings people back to neighborhood repair cafés.', 'What turns a first repair visit into a lasting habit?'],
    ['Leftovers Loop', 'A shared kitchen board for using food before it spoils.', 'Which reminders make food sharing feel easy?'],
    ['A Cooler Way Home', 'A map of shaded routes and places to rest on hot days.', 'What makes a cooler route worth the detour?'],
    ['Borrow Better', 'A neighborhood tool library with lightweight reservations.', 'What makes people comfortable lending tools to a neighbor?']
  ],
  2: [
    ['A Game for Strangers', 'A cooperative mini-game that pairs strangers around a shared goal.', 'Can play make it easier to start collaborating?'],
    ['Pass the Quest', 'A scavenger hunt where each player creates a clue for the next.', 'What makes a handoff between players feel rewarding?'],
    ['Rules We Rewrite', 'A tabletop game that invites players to modify its rules as a group.', 'How does rewriting the rules change who feels heard?'],
    ['Play Across Ages', 'A cooperative puzzle designed for players from different generations.', 'Which roles help players learn from one another?']
  ]
};

function activeCatalogSeed() {
  if (!openCatalogPacket) return null;
  return openCatalogPacket.preview ?? state?.catalog.find(seed => seed.id === openCatalogPacket.seedId);
}

function renderAuthorConnection(linkedin) {
  const footer = byId('plant-author');
  const link = footer.querySelector('a');
  if (linkedin) link.href = linkedin;
  else link.removeAttribute('href');
  footer.hidden = !linkedin;
}

function renderSeedIsland(id, islandId) {
  const pill = byId(id);
  const island = islands.find(entry => entry.id === islandId);
  pill.textContent = island?.name ?? 'Unknown island';
  pill.style.setProperty('--island-accent', island?.color ?? '#a5b76e');
}

function renderCatalogSeed() {
  const seed = activeCatalogSeed();
  if (!seed) {
    if (catalogSeed.open) catalogSeed.close();
    return;
  }
  const preview = Boolean(openCatalogPacket.preview);
  const picked = selectedAdoption?.id === seed.id && !preview;
  byId('catalog-seed-title').textContent = seed.title;
  renderSeedIsland('catalog-seed-origin', seed.originalIsland);
  byId('catalog-seed-idea').textContent = seed.idea;
  const question = byId('catalog-seed-question');
  question.textContent = seed.question ?? '';
  question.hidden = !seed.question;
  const status = byId('catalog-seed-status');
  status.textContent = preview ? 'Example seed · Preview only'
    : seed.plantedHere ? 'Planted on your island' : picked ? 'Selected to plant' : '';
  status.hidden = !status.textContent;
  adoptSeed.hidden = preview || seed.plantedHere || picked;
  byId('catalog-seed-growth').hidden = adoptSeed.hidden || !seed.growth;
}

function catalogPacket(seed, island, preview = false) {
  const key = (preview ? 'preview-' : 'packet-') + seed.id;
  const packet = button(seed.title, () => {
    openCatalogPacket = {key, seedId: seed.id, preview: preview ? seed : null};
    renderCatalogSeed();
    catalogSeed.showModal();
    catalogSeed.querySelector('.seed-detail-body').scrollTop = 0;
  });
  packet.className = 'packet-cover';
  packet.style.setProperty('--packet-accent', island.color);
  packet.dataset.catalogFocus = key;
  packet.setAttribute('aria-haspopup', 'dialog');
  const cell = element('div', null, 'shelf-cell');
  cell.append(packet);
  return cell;
}

function renderCatalog() {
  const list = byId('catalog-items');
  const filters = byId('catalog-filters');
  const focused = catalog.contains(document.activeElement) ? document.activeElement.dataset.catalogFocus : null;
  list.replaceChildren();
  filters.replaceChildren();
  if (!state) {
    list.append(element('p', 'Connecting to the catalog…'));
    return;
  }

  const foreignIslands = islands.filter(island => island.id !== state.home);
  const options = [[null, 'All islands'], ...foreignIslands.map(island => [island.id, island.name])];
  if (!options.some(([id]) => id === catalogIsland)) catalogIsland = null;
  for (const [id, name] of options) {
    const filter = button(name, () => {
      catalogIsland = id;
      renderCatalog();
    });
    filter.className = 'catalog-filter';
    filter.dataset.catalogFocus = 'filter-' + id;
    filter.setAttribute('aria-pressed', String(catalogIsland === id));
    filters.append(filter);
  }

  if (selectedAdoption) {
    const selection = element('div', null, 'catalog-selection');
    const cancel = button('Cancel adoption', () => {
      selectedAdoption = null;
      updateGarden();
      renderCatalog();
    });
    cancel.dataset.catalogFocus = 'cancel-adoption';
    selection.append(element('p', 'Selected to plant · ' + selectedAdoption.title), cancel);
    list.append(selection);
  }

  const selectedIsland = foreignIslands.find(island => island.id === catalogIsland);
  const visibleIslands = selectedIsland ? [selectedIsland] : foreignIslands;
  const shelf = element('section', null, 'catalog-shelf');
  if (selectedIsland) {
    const heading = element('h3', selectedIsland.name);
    heading.id = 'selected-shelf-title';
    shelf.setAttribute('aria-labelledby', heading.id);
    shelf.style.setProperty('--shelf-accent', selectedIsland.color);
    const header = element('header', null, 'shelf-header');
    header.append(heading);
    shelf.append(header);
  } else {
    shelf.setAttribute('aria-label', 'Seed packets from all other islands');
  }

  const books = element('div', null, 'shelf-books');
  const origins = new Map(visibleIslands.map(island => [island.id, island]));
  const seeds = state.catalog.filter(seed => origins.has(seed.originalIsland));
  for (const seed of seeds) {
    books.append(catalogPacket(seed, origins.get(seed.originalIsland)));
  }
  for (const island of visibleIslands) {
    if (seeds.some(seed => seed.originalIsland === island.id)) continue;
    catalogExamples[island.id].forEach(([title, idea, question], index) => {
      const seed = {id: island.id + '-' + index, title, idea, question, originalIsland: island.id};
      books.append(catalogPacket(seed, island, true));
    });
  }
  if (!books.childElementCount) books.append(element('p', 'No seeds on this shelf yet.', 'shelf-empty'));
  shelf.append(books);
  list.append(shelf);
  if (focused) {
    const replacement = [...catalog.querySelectorAll('[data-catalog-focus]')]
      .find(control => control.dataset.catalogFocus === focused);
    replacement?.focus({ preventScroll: true });
  }
}

function renderWorld() {
  world.update(state);
  byId('world-home').textContent = 'Home · ' + islandName(state.home);
  const list = byId('bridge-list');
  list.replaceChildren();
  if (currentIsland !== state.home) list.append(button('Find bridge home', () => findBridge(state.home)));
  if (!state.bridges.length) list.append(element('p', 'Plant a seed from another island to start a bridge. Crossing lets you explore that island’s plants and discussions.', 'bridge-next'));
  for (const bridge of state.bridges) {
    const card = element('article');
    const name = islandName(bridge.destination);
    card.className = 'bridge-card';
    const status = bridge.open ? 'Bridge open' : bridge.progress === 100 ? 'Waiting for mature trees' : 'Bridge building';
    card.append(element('h3', name), element('strong', status + ' · ' + bridge.progress + '%'));
    const progress = element('progress');
    progress.max = 100; progress.value = bridge.progress;
    progress.setAttribute('aria-label', 'Bridge to ' + name);
    card.append(progress);
    if (bridge.legacyOpen) card.append(element('p', 'Opened under the earlier construction rules.'));
    else {
      card.append(element('p', 'Foundations ' + bridge.foundations + '/40 · Walkway ' + bridge.discussion * 10 +
        '/40 · Connection ' + (bridge.crossReply ? 20 : 0) + '/20', 'bridge-phases'));
      const details = element('dl', null, 'bridge-requirements');
      function requirement(label, value, complete) {
        const row = element('div');
        row.className = complete ? 'complete' : '';
        row.append(element('dt', label), element('dd', value));
        details.append(row);
      }
      for (const side of bridge.endpoints) {
        requirement('Residents · ' + islandName(side.island), side.residents + '/2', side.residents === 2);
      }
      requirement('Discussion', bridge.discussion + '/4 contributions', bridge.discussion === 4);
      requirement('Cross-island reply', (bridge.crossReply ? '1' : '0') + '/1', bridge.crossReply);
      card.append(details);
    }
    if (bridge.open) {
      if (!bridge.canCross) card.append(element('p', 'Comment on a shared plant to earn crossing access. Until then, you can preview this island’s seeds in the catalog.', 'bridge-next'));
      else if (currentIsland === state.home) card.append(button('Find bridge to ' + name, () => findBridge(bridge.destination)));
    } else {
      if (bridge.progress === 100) card.append(element('p', 'Water and discuss “' + (bridge.span?.title ?? 'a shared plant') +
        '” until both trees mature and join.', 'bridge-next'));
      if (bridge.foundations < 40) {
        const missing = bridge.endpoints.filter(side => side.residents < 2)
          .map(side => (2 - side.residents) + ' from ' + islandName(side.island)).join(' and ');
        card.append(element('p', 'Invite ' + missing + ' to like or comment on a shared plant.', 'bridge-next'));
      }
      if (bridge.discussion < 4) {
        const noComments = bridge.endpoints.find(side => side.comments === 0 && bridge.endpoints.some(other => other.comments === 3));
        const text = noComments
          ? 'Add a question, example, or reply from ' + islandName(noComments.island) + ' to finish the walkway.'
          : 'Add a question, example, or reply to build the walkway.';
        card.append(element('p', text, 'bridge-next'));
      }
      if (!bridge.crossReply) card.append(element('p', 'Reply to a resident of the other island on a shared plant.', 'bridge-next'));
    }
    list.append(card);
  }
  const updates = byId('follow-updates');
  updates.replaceChildren();
  if (!state.updates.length) updates.append(element('p', 'Follow a plant to see new activity here.'));
  for (const item of state.updates) {
    const text = {like:'Watered',comment:'New comment',plant:'Adopted'}[item.kind];
    updates.append(element('p', item.title + ' · ' + text + ' · ' + islandName(item.island)));
  }
}

function findBridge(destination) {
  closeWorld();
  if (scene.faceBridge(destination)) announce('Follow the roots to the bridge and walk across.');
}

function openIslandPlants() {
  if (!state || currentIsland === state.home || islandPlants.open) return;
  renderIslandPlants();
  islandPlants.showModal();
  byId('island-plants-title').focus();
}

function renderIslandPlants() {
  byId('island-plants-title').textContent = 'Plants on ' + islandName(currentIsland);
  const list = byId('island-plant-list');
  const focused = islandPlants.contains(document.activeElement) ? document.activeElement.dataset.plant : null;
  list.replaceChildren();
  if (!plants.length) list.append(element('p', 'No plants have been planted here yet.', 'muted'));
  for (const plant of plants) {
    const row = button('', () => showIdea(plant.id));
    row.className = 'island-plant-row';
    row.dataset.plant = plant.id;
    const count = plant.comments.length;
    row.append(element('strong', plant.title), element('span', plantStage(plant.growth) + ' · ' +
      count + (count === 1 ? ' comment' : ' comments'), 'muted'));
    list.append(row);
    if (focused === plant.id) row.focus({ preventScroll:true });
  }
}

function showIdea(id, fromScene = false) {
  openPlant = id;
  openPlantFromScene = fromScene;
  commentForm.reset();
  setReply(null);
  byId('water-error').textContent = '';
  showParticipationTip();
  renderIdea();
  ideaDialog.showModal();
  ideaDialog.querySelector('.seed-detail-body').scrollTop = 0;
}

function renderIdea() {
  const plant = plants.find(item => item.id === openPlant);
  if (!plant) return;
  byId('idea-title').textContent = plant.title;
  renderSeedIsland('idea-origin', plant.originalIsland);
  byId('idea-text').textContent = plant.idea;
  byId('idea-question').textContent = plant.question;
  byId('idea-growth').textContent = plantStage(plant.growth) + ' · ' + plant.likes + ' water · ' + plant.commentCount + ' nutrients';
  const article = byId('article-link');
  article.hidden = !plant.hasArticle;
  article.href = '/api/plants/' + plant.id + '/article';
  renderAuthorConnection(openPlantFromScene ? plant.authorLinkedin : null);
  waterButton.disabled = !live || changingPlant || Boolean(plant.mine || plant.watered);
  waterButton.textContent = plant.mine ? 'Your plant' : plant.watered ? '♥ Watered' : '♡ Like · Water';
  byId('follow').textContent = plant.following ? 'Unfollow' : 'Follow';
  byId('follow').disabled = !live || changingPlant;
  byId('post-comment').disabled = !live || changingPlant;
  const discussion = byId('discussion');
  const last = plant.comments.at(-1)?.id ?? 0;
  if (discussion.dataset.version !== plant.id + ':' + last) {
    discussion.dataset.version = plant.id + ':' + last;
    discussion.replaceChildren();
    for (const item of plant.comments) {
      const block = element('article', null, 'discussion-entry');
      block.append(element('strong', 'Resident ' + item.resident + ' · ' + islandName(item.island)));
      if (item.replyTo) block.append(element('p', 'Reply to Resident ' + item.replyResident + ' · ' + islandName(item.replyIsland), 'muted'));
      block.append(element('p', item.body), button('Reply', () => {
        setReply(item);
        commentForm.querySelector('textarea').focus();
      }));
      discussion.append(block);
    }
  }
  const contributors = byId('contributors');
  contributors.hidden = !plant.contributors.length;
  contributors.textContent = plant.contributors.length
    ? 'Contributors · ' + plant.contributors.map(item => 'Resident ' + item.resident + ' (' + islandName(item.island) + ')').join(', ')
    : '';
}

function setReply(item) {
  replyTo = item?.id ?? null;
  byId('reply-context').hidden = !item;
  byId('reply-target').textContent = item ? 'Replying to Resident ' + item.resident + ' · ' + islandName(item.island) : '';
  byId('post-comment').textContent = item ? 'Post reply' : 'Post comment';
}

async function post(url, body) {
  const headers = { 'X-TED-Island': 'garden' };
  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const response = await fetch(url, { method: 'POST', headers, body });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}

document.querySelectorAll('[data-close]').forEach(control => control.addEventListener('click', () => control.closest('dialog').close()));
byId('open-world').addEventListener('click', () => {
  if (!state) return announce('Connecting to the garden…');
  worldView.hidden = false;
  playerView.inert = true;
  showWorldTip();
  renderWorld();
  homeIslandButton.focus({ preventScroll: true });
});
dashboardButton.addEventListener('click', () => setDashboard(dashboard.inert));
worldView.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !dashboard.inert) {
    event.preventDefault();
    setDashboard(false);
  }
});
byId('open-catalog').addEventListener('click', () => {
  try { catalogTipSeen ||= localStorage.getItem(catalogTipKey) === '1'; }
  catch { /* The tip is still shown once in this page session. */ }
  catalogTip.hidden = catalogTipSeen;
  if (!catalogTipSeen) {
    catalogTipSeen = true;
    try { localStorage.setItem(catalogTipKey, '1'); }
    catch { /* Keep the in-memory state. */ }
  }
  renderCatalog();
  catalog.showModal();
});
byId('dismiss-catalog-tip').addEventListener('click', () => {
  catalogTip.hidden = true;
  byId('catalog-filters').querySelector('button[aria-pressed=true]')?.focus({ preventScroll: true });
});
adoptSeed.addEventListener('click', () => {
  const seed = activeCatalogSeed();
  if (!seed || adoptSeed.hidden) return;
  selectedAdoption = seed;
  catalogSeed.close();
  catalog.close();
  updateGarden();
  announce(currentIsland === state.home ? 'Seed selected. Tap + to plant it.' : 'Seed selected. Return to your home island to plant it.');
});
function closeOnBackdrop(dialog) {
  const onBackdrop = event => {
    if (event.target !== dialog) return false;
    const {left, right, top, bottom} = dialog.getBoundingClientRect();
    return event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom;
  };
  let pressedBackdrop = false;
  dialog.addEventListener('pointerdown', event => {
    pressedBackdrop = onBackdrop(event);
  });
  dialog.addEventListener('click', event => {
    if (pressedBackdrop && onBackdrop(event)) dialog.close();
    pressedBackdrop = false;
  });
}
closeOnBackdrop(catalogSeed);
closeOnBackdrop(ideaDialog);
catalogSeed.addEventListener('close', () => {
  if (catalogSeed.open) return;
  const key = openCatalogPacket?.key;
  openCatalogPacket = null;
  if (!catalog.open) return;
  const packet = [...catalog.querySelectorAll('[data-catalog-focus]')]
    .find(control => control.dataset.catalogFocus === key);
  (packet ?? byId('catalog-filters').querySelector('[aria-pressed=true]'))?.focus({preventScroll: true});
});
catalog.addEventListener('close', () => {
  catalogTip.hidden = true;
  if (!plantDialog.open) map.focus();
});
browsePlants.addEventListener('click', openIslandPlants);
islandPlants.addEventListener('close', () => { if (!ideaDialog.open) map.focus(); });
ideaDialog.addEventListener('close', () => { openPlant = null; if (!islandPlants.open) map.focus(); });
plantDialog.addEventListener('close', () => map.focus());

plantForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting || !pendingPlant) return;
  const body = new FormData(plantForm);
  const point = pendingPlant;
  for (const key of ['x', 'z', 'island']) body.append(key, String(point[key]));
  if (point.adoption) body.append('adopt', point.adoption.id);
  const error = byId('plant-error');
  const submit = plantForm.querySelector('[type=submit]');
  error.textContent = '';
  submitting = true;
  submit.disabled = true;
  submit.textContent = 'Planting…';
  try {
    await post('/api/plants', body);
    selectedAdoption = null;
    updateGarden();
    announce(point.adoption ? 'Seed planted. Open Bridges in World View to track your bridge.' : 'Seed planted');
    plantDialog.close();
  } catch (failure) {
    error.textContent = failure.message || 'Unable to plant the seed.';
  } finally {
    submitting = false;
    submit.disabled = false;
    submit.textContent = 'Plant research seed';
  }
});

async function changePlant(action, details) {
  const id = openPlant;
  if (!id || changingPlant) return false;
  changingPlant = true;
  byId('water-error').textContent = '';
  renderIdea();
  try {
    await post('/api/plants/' + id + '/' + action, { island: currentIsland, ...details });
    return true;
  } catch (error) {
    if (openPlant === id) byId('water-error').textContent = error.message || 'Unable to save your contribution.';
    return false;
  } finally {
    changingPlant = false;
    if (openPlant) renderIdea();
  }
}

waterButton.addEventListener('click', () => changePlant('water'));
byId('follow').addEventListener('click', () => {
  const plant = plants.find(item => item.id === openPlant);
  if (plant) changePlant('follow', {enabled: !plant.following});
});
byId('cancel-reply').addEventListener('click', () => setReply(null));
commentForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (await changePlant('comment', {text: new FormData(commentForm).get('comment'), replyTo})) {
    commentForm.reset();
    setReply(null);
  }
});

function connectGarden() {
  const stream = new EventSource('/api/events');
  stream.addEventListener('message', event => {
    state = JSON.parse(event.data);
    const firstArrival = currentIsland === null;
    if (currentIsland === null || (currentIsland !== state.home &&
      !state.bridges.some(bridge => bridge.destination === currentIsland && bridge.canCross))) {
      currentIsland = state.home;
      selectedAdoption = null;
      scene.reset();
    }
    live = true;
    updateGarden();
    if (firstArrival) showMovementTip();
    if (openPlant) renderIdea();
    if (catalog.open) renderCatalog();
    if (catalogSeed.open) renderCatalogSeed();
    if (!worldView.hidden) renderWorld();
  });
  stream.addEventListener('error', () => {
    live = false;
    announce('Reconnecting to the garden…');
    if (openPlant) renderIdea();
  });
}

const onboarding = byId('onboarding');
const onboardingForm = byId('onboarding-form');
const onboardingFields = byId('onboarding-fields');
const join = byId('join-island');
const retry = byId('retry-profile');
const onboardingError = byId('onboarding-error');
const shareResidentLinkedin = byId('share-resident-linkedin');

function enterGarden(profile) {
  const photo = byId('resident-photo');
  if (profile.hasPhoto) {
    photo.src = '/api/profile/photo';
    photo.hidden = false;
  }
  const linkedin = byId('resident-linkedin');
  if (profile.linkedin) {
    linkedin.href = profile.linkedin;
    linkedin.hidden = false;
    shareResidentLinkedin.hidden = false;
    shareResidentLinkedin.setAttribute('aria-pressed', String(profile.shareLinkedin));
  }
  byId('resident-badge').hidden = false;
  playerView.inert = false;
  if (onboarding.open) onboarding.close();
  connectGarden();
  map.focus({ preventScroll: true });
}

async function loadProfile() {
  onboardingError.textContent = '';
  retry.hidden = true;
  try {
    const response = await fetch('/api/profile', {cache:'no-store'});
    if (!response.ok) throw new Error('Could not load your resident profile.');
    const profile = await response.json();
    if (profile.completed) return enterGarden(profile);
    const options = byId('domain-options');
    options.replaceChildren();
    for (const island of islands) {
      const name = element('strong', island.name);
      const input = element('input');
      input.type = 'radio'; input.name = 'island'; input.value = String(island.id); input.required = true;
      input.checked = profile.island === island.id;
      const card = element('label', null, 'domain-card');
      card.style.setProperty('--domain-color', island.color);
      card.append(input, name);
      options.append(card);
    }
    onboardingFields.disabled = false;
    join.disabled = false;
    (options.querySelector('input:checked') ?? options.querySelector('input')).focus();
  } catch (error) {
    onboardingError.textContent = error.message || 'Could not load your resident profile.';
    retry.hidden = false;
  }
}

shareResidentLinkedin.addEventListener('click', async () => {
  const enabled = shareResidentLinkedin.getAttribute('aria-pressed') !== 'true';
  shareResidentLinkedin.disabled = true;
  try {
    const profile = await post('/api/profile/linkedin-sharing', {enabled});
    shareResidentLinkedin.setAttribute('aria-pressed', String(profile.shareLinkedin));
    announce(profile.shareLinkedin ? 'Your seeds and plants now link to your LinkedIn.' : 'Your LinkedIn is private again.');
  } catch (error) {
    announce(error.message || 'Could not update LinkedIn sharing.');
  } finally {
    shareResidentLinkedin.disabled = false;
  }
});

onboardingForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (join.disabled) return;
  const body = new FormData(onboardingForm);
  onboardingFields.disabled = true;
  join.disabled = true;
  join.textContent = 'Setting up…';
  onboardingError.textContent = '';
  try {
    enterGarden(await post('/api/profile', body));
  } catch (error) {
    onboardingError.textContent = error.message || 'Could not save your resident profile.';
  } finally {
    onboardingFields.disabled = false;
    join.disabled = false;
    join.textContent = 'Enter island';
  }
});
retry.addEventListener('click', loadProfile);
onboarding.addEventListener('cancel', event => event.preventDefault());

const mobilePreview = new URLSearchParams(location.search).get('preview') === 'mobile-game';
const touchLayout = matchMedia('(pointer: coarse)');
const portrait = matchMedia('(orientation: portrait)');
const playLandscape = byId('play-landscape');
const canLockLandscape = !mobilePreview && document.fullscreenEnabled &&
  typeof screen.orientation?.lock === 'function';

function updateOrientation() {
  const mobile = touchLayout.matches || mobilePreview;
  document.documentElement.classList.toggle('mobile-layout', mobile);
  byId('movement-tip-text').textContent = mobile
    ? 'Use the left joystick to move. Drag on the right to look around. Tap a plant to read it.'
    : 'Use WASD to move. Drag or use the arrow keys to look around. Click a plant to read it.';
  if (!mobilePreview && mobile && portrait.matches) {
    if (!landscapeDialog.open) landscapeDialog.showModal();
  } else if (landscapeDialog.open) {
    landscapeDialog.close();
    if (plantWaitingForLandscape) {
      plantWaitingForLandscape = false;
      plantDialog.showModal();
    } else if (!document.querySelector('dialog[open]') && !playerView.inert) {
      map.focus({preventScroll:true});
    }
  }
}

playLandscape.hidden = !canLockLandscape;
playLandscape.addEventListener('click', async () => {
  playLandscape.disabled = true;
  const alreadyFullscreen = Boolean(document.fullscreenElement);
  try {
    if (!alreadyFullscreen) await document.documentElement.requestFullscreen();
    await screen.orientation.lock('landscape');
  } catch {
    if (!alreadyFullscreen && document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    playLandscape.hidden = true;
  } finally {
    playLandscape.disabled = false;
  }
});
landscapeDialog.addEventListener('cancel', event => event.preventDefault());
touchLayout.addEventListener('change', updateOrientation);
portrait.addEventListener('change', updateOrientation);

installGameDesign(artwork).then(() => { if (!worldView.hidden) world.draw(); });
playerView.inert = true;
onboarding.showModal();
updateOrientation();
loadProfile();
