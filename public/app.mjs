import { createScene } from './scene.mjs';
import { createWorld } from './world.mjs';
import { plantStage } from './plots.mjs';
import { islands } from './islands.mjs';

const byId = id => document.getElementById(id);
const map = byId('map');
const message = byId('message');
const plantDialog = byId('plant-dialog');
const catalog = byId('seed-catalog');
const ideaDialog = byId('idea-dialog');
const plantForm = byId('plant-form');
const commentForm = byId('comment-form');
const waterButton = byId('water');
const worldView = byId('world-view');
const dashboard = byId('world-dashboard');
const dashboardButton = byId('toggle-dashboard');
const playerView = map.closest('main');
const world = createWorld(byId('world-map'));
let state = null;
let currentIsland = null;
let plants = [];
let selectedAdoption = null;
let pendingPlant = null;
let openPlant = null;
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

const scene = createScene(map, {
  onPlant: showIdea,
  onThrowRequest() {
    if (!live) { announce('Connecting to the garden…'); return false; }
    if (currentIsland !== state.home) { announce('Return home to plant a seed.'); return false; }
    return true;
  },
  onLanding(result, point) {
    if (result === 'miss') return announce('The seed went off the island. Try another throw.');
    if (result === 'blocked') return announce('The seed needs open grass. Try another throw.');
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
    plantDialog.showModal();
  }
});

function setDashboard(open) {
  const restoreFocus = !open && dashboard.contains(document.activeElement);
  dashboard.inert = !open;
  dashboard.classList.toggle('is-open', open);
  dashboardButton.setAttribute('aria-expanded', String(open));
  if (restoreFocus) dashboardButton.focus();
}

function closeWorld() {
  setDashboard(false);
  worldView.hidden = true;
  playerView.inert = false;
  map.focus({ preventScroll: true });
}

function showIsland(id) {
  currentIsland = id;
  scene.reset();
  updateGarden();
  closeWorld();
}

function updateGarden() {
  plants = state.plants.filter(plant => plant.island === currentIsland);
  scene.update(plants,currentIsland);
  byId('island-name').textContent = islandName(currentIsland) + (currentIsland === state.home ? ' · Home' : ' · Visiting');
  byId('seed-label').textContent = selectedAdoption ? 'Throw adopted seed' : 'Throw seed';
}

function renderCatalog() {
  const list = byId('catalog-items');
  const cards = state?.catalog ?? [];
  list.replaceChildren();
  if (selectedAdoption) {
    const selection = element('p', 'Selected to plant · ' + selectedAdoption.title);
    list.append(selection, button('Cancel adoption', () => {
      selectedAdoption = null;
      updateGarden();
      renderCatalog();
    }));
  }
  if (!cards.length) {
    list.append(element('p', 'No seeds from other islands yet.'));
    return;
  }
  for (const seed of cards) {
    const planted = seed.plantedOn.includes(state.home);
    const card = element('article', null, 'catalog-card');
    card.append(element('h3', seed.title), element('p', seed.idea),
      element('p', islandName(seed.originalIsland) + ' · ' + (planted ? 'Planted on your island' : 'Available to adopt'), 'muted'));
    if (!planted) {
      if (seed.growth) card.append(element('p', 'This idea is already growing. Bring its current tree and shared conversation to your island.'));
      card.append(button('Adopt seed', () => {
        selectedAdoption = seed;
        catalog.close();
        showIsland(state.home);
        renderCatalog();
        announce('Seed selected. Use Throw adopted seed to plant it.');
      }));
    }
    list.append(card);
  }
}

function renderWorld() {
  world.update(state);
  byId('world-home').textContent = 'Home · ' + islandName(state.home);
  const list = byId('bridge-list');
  list.replaceChildren();
  if (currentIsland !== state.home) list.append(button('Return home', () => showIsland(state.home)));
  if (!state.bridges.length) list.append(element('p', 'No bridges yet. Plant a seed from another island to begin one.'));
  for (const bridge of state.bridges) {
    const card = element('article');
    const name = islandName(bridge.destination);
    card.className = 'bridge-card';
    card.append(element('h3', name), element('strong', (bridge.open ? 'Bridge open' : 'Bridge building') + ' · ' + bridge.progress + '%'));
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
      if (bridge.canCross) card.append(button('Cross to ' + name, () => showIsland(bridge.destination)));
      else card.append(element('p', 'Comment on a shared plant to earn crossing access.', 'bridge-next'));
    } else {
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

function showIdea(id) {
  openPlant = id;
  commentForm.reset();
  setReply(null);
  byId('water-error').textContent = '';
  renderIdea();
  ideaDialog.showModal();
}

function renderIdea() {
  const plant = plants.find(item => item.id === openPlant);
  if (!plant) return;
  byId('idea-title').textContent = plant.title;
  byId('idea-origin').textContent = 'From ' + islandName(plant.originalIsland) + (plant.creator ? ' · Resident ' + plant.creator : '');
  byId('idea-text').textContent = plant.idea;
  byId('idea-question').textContent = plant.question;
  byId('idea-growth').textContent = plantStage(plant.growth) + ' · ' + plant.likes + ' water · ' + plant.commentCount + ' nutrients';
  byId('idea-participation').textContent = plant.participantCount + ' contributors · ' + plant.replyParticipantCount + ' have replied to someone else';
  const article = byId('article-link');
  article.hidden = !plant.hasArticle;
  article.href = '/api/plants/' + plant.id + '/article';
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
  byId('contributors').textContent = plant.contributors.length
    ? 'Contributors · ' + plant.contributors.map(item => 'Resident ' + item.resident + ' (' + islandName(item.island) + ')').join(', ')
    : 'No contributions yet.';
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
  renderWorld();
  byId('close-world').focus();
});
dashboardButton.addEventListener('click', () => setDashboard(dashboard.inert));
worldView.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !dashboard.inert) {
    event.preventDefault();
    setDashboard(false);
  }
});
byId('close-world').addEventListener('click', closeWorld);
byId('open-catalog').addEventListener('click', () => { renderCatalog(); catalog.showModal(); });
catalog.addEventListener('close', () => { if (!plantDialog.open) map.focus(); });
ideaDialog.addEventListener('close', () => { openPlant = null; map.focus(); });
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
    announce(point.adoption ? 'Seed planted. Check World View for your bridge.' : 'Seed planted');
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

const stream = new EventSource('/api/events');
stream.addEventListener('message', event => {
  state = JSON.parse(event.data);
  if (currentIsland === null || (currentIsland !== state.home &&
    !state.bridges.some(bridge => bridge.destination === currentIsland && bridge.canCross))) {
    currentIsland = state.home;
    selectedAdoption = null;
    scene.reset();
  }
  live = true;
  updateGarden();
  if (openPlant) renderIdea();
  if (catalog.open) renderCatalog();
  if (!worldView.hidden) renderWorld();
});
stream.addEventListener('error', () => {
  live = false;
  announce('Reconnecting to the garden…');
  if (openPlant) renderIdea();
});
map.focus({ preventScroll: true });
