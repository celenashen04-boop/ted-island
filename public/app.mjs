import { installGameDesign } from './design-assets.mjs';
import { createScene } from './scene.mjs';
import { createWorld } from './world.mjs';
import { plantStage } from './plots.mjs';
import { islands } from './islands.mjs';
import { createIslandRenderer } from './island-kit/render.mjs';

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
const islandRenderer = createIslandRenderer();
const homeIslandButton = byId('home-island');
const world = createWorld(byId('world-map'), artwork, homeIslandButton, closeWorld, islandRenderer);
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

let crossing = false, account = null;
const scene = createScene(map, {
  artwork,
  islandRenderer,
  isVisible: () => worldView.hidden,
  throwControl,
  onPlant(id) { showIdea(id, true); },
  async onCross(destination, position) {
    if (crossing || !live) return;
    crossing = true;
    try {
      const result = await post('/api/cross', {island: destination});
      state = result.garden;
      currentIsland = destination;
      updateGarden();
      scene.arrive(position);
      savePosition();
      announce(destination === state.home ? 'Back on your home island.' : 'You crossed to ' + islandName(destination) + '.');
    } catch (error) {
      announce(error.message);
      refreshGarden().catch(() => {});
    } finally {
      crossing = false;
    }
  },
  onBridgeLocked() { announce('Adopt and plant a seed from that island to unlock access. Water or nourish its plants to extend access.'); },
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
    confirmation.textContent = adoption ? 'Plant “' + adoption.title + '” here to earn 48 hours of island access.' : '';
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
  byId('island-name').textContent = account.id + ' · ' + islandName(currentIsland) + (currentIsland === state.home ? ' · Home' : ' · Visiting');
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
    : seed.plantedHere ? 'Planted on your island' : picked ? 'Selected to plant' : 'Plant this seed to earn 48 hours of access.';
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
  for (const access of state.access) {
    const card = element('article');
    card.className = 'bridge-card';
    const name = islandName(access.island);
    const time = remainingAccess(access.expiry);
    const island=state.islands.find(entry=>entry.id===access.island);
    card.append(element('h3', name), element('strong', time || 'Access expired'),
      element('p', island.total ? island.mature+' of '+island.total+' ideas mature' : 'No ideas yet.'));
    const progress = element('progress');
    progress.max = 120;
    progress.value = Math.max(0,(access.expiry-Date.now())/3_600_000);
    progress.setAttribute('aria-label', name + ' remaining access');
    card.append(progress);
    if (currentIsland !== access.island) {
      card.append(time?button('Visit island', () => findBridge(access.island)):button('Unlock access', () => {
        closeWorld();
        catalogIsland = access.island;
        renderCatalog();
        catalog.showModal();
      }));
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

function remainingAccess(expiry) {
  const minutes = Math.ceil((expiry-Date.now())/60_000);
  if(minutes<=0)return '';
  const days=Math.floor(minutes/1440), hours=Math.floor(minutes%1440/60);
  return [days&&days+' d',hours&&hours+' h',minutes%60&&minutes%60+' min'].filter(Boolean).join(' ');
}

function announceAccess(access, fallback='') {
  if(!access){if(fallback)announce(fallback);return;}
  if(!access.addedHours){announce('Access full (5 days).');return;}
  const added=Number(access.addedHours.toFixed(1));
  announce('+'+added+' hours · '+islandName(access.island)+' access: '+remainingAccess(access.expiry));
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
      block.append(element('strong', item.resident + ' · ' + islandName(item.island)));
      if (item.replyTo) block.append(element('p', 'Reply to ' + item.replyResident + ' · ' + islandName(item.replyIsland), 'muted'));
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
    ? 'Contributors · ' + plant.contributors.map(item => item.resident + ' (' + islandName(item.island) + ')').join(', ')
    : '';
}

function setReply(item) {
  replyTo = item?.id ?? null;
  byId('reply-context').hidden = !item;
  byId('reply-target').textContent = item ? 'Replying to ' + item.resident + ' · ' + islandName(item.island) : '';
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
    const result=await post('/api/plants', body);
    selectedAdoption = null;
    updateGarden();
    announceAccess(result.access,result.unchanged?'This seed is already planted on your island.':'Seed planted.');
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
    const result=await post('/api/plants/' + id + '/' + action, { island: currentIsland, ...details });
    announceAccess(result.access);
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

const notificationDialog=byId('notifications');
byId('open-notifications').addEventListener('click',()=>{
  if(!state)return;
  renderNotifications();
  notificationDialog.showModal();
});
function renderNotifications() {
  const list=byId('notification-list');
  list.replaceChildren();
  byId('notification-dot').hidden=!state.notifications.some(item=>!item.read);
  for(const notification of state.notifications){
    const row=element('article',null,'bridge-card');
    const title=notification.title ?? 'Your plant';
    const text={
      comment:'New comment on '+title,
      reply:'New reply on '+title,
      'access-ending':islandName(notification.island)+' access ends within 6 hours.',
      thirsty:title+' is getting thirsty.',
      'follow-like':title+' was watered.',
      'follow-comment':'New discussion on '+title,
      'follow-plant':title+' was adopted on '+islandName(notification.island)+'.',
      retention:title+' is scheduled for deletion after 30 days without activity.'
    }[notification.type];
    row.append(element('p',text));
    if(notification.type==='retention'){
      const link=element('a','Export plant and discussion');
      link.href='/api/plants/'+notification.plant+'/export';
      row.append(link);
    }
    if(!notification.read)row.append(button('Mark read',()=>post('/api/notifications/read',{id:notification.id}).catch(error=>announce(error.message))));
    list.append(row);
  }
  if(!state.notifications.length)list.append(element('p','No notifications yet.'));
}

function receiveGarden(next) {
  if(crossing)return;
  const firstArrival = currentIsland === null;
  const changedIsland = currentIsland !== next.position.island;
  const expired = state?.access.find(item=>item.island===currentIsland&&item.active) &&
    next.access.some(item=>item.island===currentIsland&&!item.active);
  state = next;
  currentIsland = next.position.island;
  if(changedIsland)selectedAdoption=null;
  live = true;
  byId('notification-dot').hidden=!state.notifications.some(item=>!item.read);
  if(notificationDialog.open)renderNotifications();
  updateGarden();
  if(changedIsland && Number.isFinite(next.position.x))scene.arrive(next.position);
  if(expired)announce('Your access ended. Water or nourish a plant here to renew access to its origin island.');
  if(firstArrival)showMovementTip();
  if(openPlant)renderIdea();
  if(catalog.open)renderCatalog();
  if(catalogSeed.open)renderCatalogSeed();
  if(!worldView.hidden)renderWorld();
}

async function refreshGarden() {
  const response=await fetch('/api/garden',{cache:'no-store'});
  if(response.ok)receiveGarden(await response.json());
}

let lastSaved;
function savePosition() {
  const pose=scene.pose();
  if(!pose || currentIsland===null || !live)return;
  const position={island:currentIsland,...pose};
  const key=JSON.stringify(position);
  if(key===lastSaved)return;
  lastSaved=key;
  post('/api/position',position).catch(()=>{if(lastSaved===key)lastSaved=null;});
}

function connectGarden() {
  const stream = new EventSource('/api/events');
  stream.addEventListener('message', event => receiveGarden(JSON.parse(event.data)));
  stream.addEventListener('error', () => {
    live = false;
    announce('Reconnecting to the garden…');
    if (openPlant) renderIdea();
  });
  setInterval(()=>{if(!crossing)savePosition();},3000);
  setInterval(()=>{
    if(!state)return;
    const expired=state.access.some(item=>item.active&&item.expiry<=Date.now());
    if(expired)refreshGarden().catch(()=>{});
    else if(!worldView.hidden)renderWorld();
  },15000);
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

const signInForm=byId('sign-in-form');
const signUpForm=byId('sign-up-form');
const signInUsername=byId('sign-in-username');
const accountStatus=byId('account-status');
const lastUsernameKey='chi-last-username';

function rememberUsername(username) {
  try {localStorage.setItem(lastUsernameKey,username);}
  catch { /* The account still works if browser storage is unavailable. */ }
}

function showAccountForm(signIn,{username='',message='',focus=true}={}){
  signInForm.hidden=!signIn;
  signUpForm.hidden=signIn;
  byId('show-sign-in').hidden=signIn;
  byId('show-sign-up').hidden=!signIn;
  byId('account-error').textContent='';
  accountStatus.textContent=message;
  accountStatus.hidden=!message;
  if(username)signInUsername.value=username;
  if(focus)(signIn?(username?byId('sign-in-password'):signInUsername):byId('sign-up-username')).focus();
}

function accountStep(next) {
  account=next;
  const hasAccess=next && !next.needsPassword;
  byId('account-entry').hidden=Boolean(hasAccess);
  onboardingForm.hidden=!hasAccess;
  onboarding.setAttribute('aria-labelledby',hasAccess?'onboarding-title':'account-title');
  if(hasAccess){
    if(!next.judge)rememberUsername(next.id);
    loadProfile();
  }else if(next?.needsPassword){
    showAccountForm(false,{focus:false});
  }
}

let accountPending=false;
async function requestAccount(path,body) {
  if(accountPending)return;
  accountPending=true;
  const error=byId('account-error');
  error.textContent='';
  accountStatus.hidden=true;
  try {
    const result=await post('/api/auth/'+path,body);
    if(path==='register'){
      rememberUsername(result.id);
      signUpForm.reset();
      showAccountForm(true,{username:result.id,message:'Account created. Sign in to continue.'});
    }else{
      signInForm.reset();
      accountStep(result);
    }
  }catch(failure){error.textContent=failure.message;}
  finally{accountPending=false;}
}

byId('show-sign-in').addEventListener('click',()=>showAccountForm(true));
byId('show-sign-up').addEventListener('click',()=>showAccountForm(false));
byId('judge-account').addEventListener('click',()=>requestAccount('start',{judge:true}));
for(const [form,action] of [[signInForm,'login'],[signUpForm,'register']]){
  form.addEventListener('submit',event=>{
    event.preventDefault();
    requestAccount(action,Object.fromEntries(new FormData(form)));
  });
}
byId('sign-out').addEventListener('click',async event=>{
  const control=event.currentTarget;
  control.disabled=true;
  try {
    if(!account?.judge&&account?.id)rememberUsername(account.id);
    await post('/api/auth/logout',{});
    location.reload();
  }catch(error){
    control.disabled=false;
    announce(error.message || 'Could not sign out. Try again.');
  }
});

async function loadAccount() {
  try{
    const response=await fetch('/api/auth',{cache:'no-store'});
    if(!response.ok)throw new Error('Could not load your account.');
    const {account:next}=await response.json();
    if(!next){
      let username='';
      try {username=localStorage.getItem(lastUsernameKey)??'';}
      catch { /* Browser storage is optional. */ }
      if(username)showAccountForm(true,{username,focus:false});
    }
    accountStep(next);
  }catch(error){byId('account-error').textContent=error.message;}
}

async function loadProfile() {
  onboardingError.textContent = '';
  retry.hidden = true;
  try {
    const response = await fetch('/api/profile', {cache:'no-store'});
    if (!response.ok) throw new Error('Could not load your player profile.');
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
    onboardingError.textContent = error.message || 'Could not load your player profile.';
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
    onboardingError.textContent = error.message || 'Could not save your player profile.';
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
loadAccount();
