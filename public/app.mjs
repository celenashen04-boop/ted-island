import { installGameDesign } from './design-assets.mjs';
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
const artwork = new Map();
const world = createWorld(byId('world-map'), artwork);
let state = null;
let currentIsland = null;
let plants = [];
let selectedAdoption = null;
let catalogIsland = null;
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
  artwork,
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
  const filters = byId('catalog-filters');
  const focused = catalog.contains(document.activeElement) ? document.activeElement.dataset.catalogFocus : null;
  list.replaceChildren();
  filters.replaceChildren();
  if (!state) {
    list.append(element('p', 'Connecting to the catalog…'));
    return;
  }

  const foreignIslands = islands.filter(island => island.id !== state.home);
  if (!foreignIslands.some(island => island.id === catalogIsland)) catalogIsland = null;
  for (const island of [null, ...foreignIslands]) {
    const id = island?.id ?? null;
    const filter = button(island?.name ?? 'All islands', () => {
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

  for (const island of foreignIslands.filter(entry => catalogIsland === null || entry.id === catalogIsland)) {
    const shelf = element('section', null, 'catalog-shelf');
    const heading = element('h3', 'Island ' + island.letter + ' — ' + island.name);
    heading.id = 'shelf-' + island.id;
    shelf.setAttribute('aria-labelledby', heading.id);
    shelf.style.setProperty('--shelf-accent', island.color);
    const header = element('header', null, 'shelf-header');
    header.append(heading, element('p', island.description, 'muted'));
    shelf.append(header);
    const books = element('div', null, 'shelf-books');
    const seeds = state.catalog.filter(seed => seed.originalIsland === island.id);
    if (!seeds.length) books.append(element('p', 'No seeds on this shelf yet.', 'shelf-empty'));
    for (const seed of seeds) {
      const planted = seed.plantedOn.includes(state.home);
      const picked = selectedAdoption?.id === seed.id;
      const card = element('article', null, 'catalog-card');
      card.append(element('h4', seed.title), element('p', seed.idea),
        element('p', planted ? 'Planted on your island' : picked ? 'Selected to plant' : 'Available to adopt', 'seed-status'));
      if (!planted && !picked) {
        if (seed.growth) card.append(element('p', 'This idea is already growing. Bring its current tree and shared conversation to your island.', 'muted'));
        const adopt = button('Adopt seed', () => {
          selectedAdoption = seed;
          catalog.close();
          showIsland(state.home);
          announce('Seed selected. Use Throw adopted seed to plant it.');
        });
        adopt.dataset.art = 'adopt';
        adopt.dataset.catalogFocus = 'adopt-' + seed.id;
        card.append(adopt);
      }
      books.append(card);
    }
    shelf.append(books);
    list.append(shelf);
  }
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

function connectGarden() {
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
}

const onboarding = byId('onboarding');
const onboardingForm = byId('onboarding-form');
const onboardingFields = byId('onboarding-fields');
const profilePhoto = byId('profile-file');
const join = byId('join-island');
const retry = byId('retry-profile');
const onboardingError = byId('onboarding-error');
let previewURL;

function releasePhotoPreview() {
  if (previewURL) URL.revokeObjectURL(previewURL);
  previewURL = null;
  byId('photo-preview').hidden = true;
}

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
  }
  byId('resident-badge').hidden = false;
  playerView.inert = false;
  if (onboarding.open) onboarding.close();
  releasePhotoPreview();
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
      const text = element('span');
      text.append(name, element('small', island.description, 'muted'));
      card.append(input, text);
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

profilePhoto.addEventListener('change', () => {
  releasePhotoPreview();
  const file = profilePhoto.files[0];
  byId('photo-selection').textContent = file ? file.name : '';
  onboardingError.textContent = '';
  if (!file) return;
  previewURL = URL.createObjectURL(file);
  const image = byId('photo-preview');
  image.src = previewURL;
  image.hidden = false;
});

async function photoForUpload(file) {
  if (file.size <= 1024 * 1024 && ['image/jpeg','image/png','image/webp'].includes(file.type)) return file;
  const image = byId('photo-preview');
  try {
    await image.decode();
  } catch {
    throw new Error('This photo format could not be opened. Choose a JPEG, PNG, or WebP image.');
  }
  const scale = Math.min(1, 768 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d', {alpha:false});
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const photo = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .8));
  if (!photo || photo.size > 1024 * 1024) throw new Error('Could not resize this photo. Choose a smaller image.');
  return new File([photo], 'profile-photo.jpg', {type:'image/jpeg'});
}

onboardingForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (join.disabled) return;
  const body = new FormData(onboardingForm);
  onboardingFields.disabled = true;
  join.disabled = true;
  join.textContent = 'Setting up…';
  onboardingError.textContent = '';
  try {
    const file = body.get('photo');
    if (file instanceof File && file.size) body.set('photo', await photoForUpload(file));
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
installGameDesign(artwork).then(() => { if (!worldView.hidden) world.draw(); });
playerView.inert = true;
onboarding.showModal();
loadProfile();
