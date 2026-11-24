import { installGameDesign } from './design-assets.mjs';
import { createScene } from './scene.mjs';
import { createWorld } from './world.mjs';
import { islands } from './islands.mjs';
import { createIslandRenderer } from './island-kit/render.mjs';
import { createTopRight, MENU_ITEMS } from './ui/hud.mjs';
import { el, islandClass } from './ui/islands-ui.mjs';
import { createSeedCatalog } from './ui/catalog.mjs';
import { createSeedForm } from './ui/seed-form.mjs';
import { createPlantDetail } from './ui/plant-detail.mjs';
import { createAccessPanel } from './ui/access-panel.mjs';
import { createIslandPlants } from './ui/island-plants.mjs';
import { createFollowedPlants, followedMenuMeta } from './ui/followed-plants.mjs';
import { createNotificationPanel } from './ui/notifications.mjs';
import { createPanelShell } from './ui/panel.mjs';
import { createTutorial, TUTORIAL_STEPS } from './ui/tutorial.mjs';
import { createRotatePrompt } from './ui/rotate-prompt.mjs';
import { createViewIdeaPill, createLandingMarker, createLockedPrompt, createEdgePrompt, createActionFeedback } from './ui/world-feedback.mjs';
import { accessToast, plantedToast, toastRegion } from './ui/toast.mjs';

const byId = id => document.getElementById(id);
const map = byId('map');
const message = byId('message');
const seedLauncher = byId('seed-mode');
const plantingTip = byId('planting-tip');
const landscapeDialog = byId('landscape-required');
const worldView = byId('world-view');
const playerView = map.closest('main');
const islandChip = byId('browse-plants');
const artwork = new Map();
const islandRenderer = createIslandRenderer();
const world = createWorld(byId('world-map'), artwork, byId('home-island'), closeWorld, islandRenderer);
const toasts = toastRegion();
const stageNames = ['seed', 'sprout', 'young', 'tree', 'mature'];
const growthGoals = [[1, 0, 1], [2, 2, 2], [6, 8, 4]];
const islandName = id => islands.find(island => island.id === id)?.name ?? 'Unknown island';
const isLocked = id => id !== state?.home && !state?.access.some(item => item.island === id && item.active);
let state, account, catalog, access;
let currentIsland = null;
let plants = [];
let selectedAdoption, pendingPlant, openPlant, activePanel;
let live = false;
let crossing = false;
let changingPlant = false;
let plantWaitingForLandscape = false;
let messageTimer, promptTimer, focusedPlant, sceneTargets;
const sceneFeedback = el('div', { class: 'game-scene-feedback' });
const prompt = el('div', { class: 'game-scene-prompt' });
const ideaPill = createViewIdeaPill({ onOpen: () => focusedPlant && showIdea(focusedPlant.id, currentIsland, true) });
const landing = createLandingMarker('valid');
landing.element.hidden = true;
sceneFeedback.append(ideaPill.element, landing.element, prompt);
playerView.append(sceneFeedback);

function showScenePrompt(element) {
  prompt.replaceChildren(element);
  clearTimeout(promptTimer);
  promptTimer = setTimeout(() => prompt.replaceChildren(), 3300);
}

function positionOverlay(element, x, y) {
  element.style.left = x + 'px';
  element.style.top = y + 'px';
}

function updateSceneFeedback(frame) {
  sceneTargets = frame;
  const plant = plants.find(plant => plant.id === frame.plant?.id);
  if (plant && !activePanel && !playerView.inert) {
    if (focusedPlant !== plant || ideaPill.element.hidden) {
      focusedPlant = plant;
      ideaPill.set({ stage: stageNames[plant.growth], island: plant.originalIsland, title: plant.title, dormant: plant.dormant });
    }
    const pillWidth = ideaPill.element.offsetWidth;
    const x = Math.max(8, Math.min(frame.width - pillWidth - 8, frame.plant.right + 12));
    const y = Math.max(72, Math.min(frame.height - ideaPill.element.offsetHeight - 12, frame.plant.top));
    positionOverlay(ideaPill.element, x, y);
  } else {
    focusedPlant = null;
    ideaPill.hide();
  }
  const impactVisible = frame.landing && frame.landing.x > 20 && frame.landing.x < frame.width - 20 &&
    frame.landing.y > 20 && frame.landing.y < frame.height - 36;
  landing.element.hidden = !impactVisible;
  if (impactVisible) {
    landing.set(frame.landing.valid ? 'valid' : 'invalid');
    positionOverlay(landing.element, frame.landing.x, frame.landing.y);
  }
}

function element(tag, label, className) {
  return el(tag, { class: className }, label);
}

function announce(text) {
  message.textContent = text;
  clearTimeout(messageTimer);
  if (text) messageTimer = setTimeout(() => { message.textContent = ''; }, 4200);
}

const scene = createScene(map, {
  artwork,
  islandRenderer,
  isVisible: () => worldView.hidden,
  onPlant(id) { showIdea(id, currentIsland, true); },
  onFrame: updateSceneFeedback,
  async onCross(destination, position) {
    if (crossing || !live) return;
    crossing = true;
    try {
      const result = await post('/api/cross', { island: destination });
      receiveGarden(result.garden, { restorePosition: false });
      scene.arrive(position);
      savePosition();
      announce(destination === state.home ? 'Back on your home island.' : 'You crossed to ' + islandName(destination) + '.');
    } catch (error) {
      announce(error.message);
    } finally {
      crossing = false;
      refreshGarden().catch(() => {});
    }
  },
  onBridgeLocked(destination) {
    showScenePrompt(createLockedPrompt({ island: destination, onUnlock: openCatalog }).element);
  },
  onEdge() { showScenePrompt(createEdgePrompt('Use a bridge to leave the island.').element); },
  onThrowRequest() {
    if (!live) { announce('Connecting to the garden…'); return false; }
    if (currentIsland !== state.home) { announce('Return home to plant a seed.'); return false; }
    return true;
  },
  onLanding(result, point) {
    if (result !== 'planted') {
      const retry = createLandingMarker('failed', { onRetry: () => {
        prompt.replaceChildren();
        if (seedLauncher.getAttribute('aria-pressed') !== 'true') seedLauncher.click();
      } });
      showScenePrompt(retry.element);
      return;
    }
    if (!worldView.hidden) closeWorld();
    prompt.replaceChildren();
    pendingPlant = { ...point, island: currentIsland, adoption: selectedAdoption };
    plantWaitingForLandscape = landscapeDialog.open;
    if (!plantWaitingForLandscape) openPlantForm();
  }
});

function panelClosed(panel) {
  if (activePanel !== panel || panel.layer.dataset.state === 'open') return;
  const background = worldView.hidden ? playerView : worldView;
  background.inert = false;
  activePanel = null;
  hud.menu.setCurrent(null);
  const opener = panelOpeners.get(panel);
  const target = opener?.isConnected && background.contains(opener)
    ? opener : worldView.hidden ? map : byId('toggle-dashboard');
  target.focus({ preventScroll: true });
}

const panelOpeners = new WeakMap();

function openPanel(panel, args = [], menu = null) {
  if (!panel) return;
  const opener = activePanel ? panelOpeners.get(activePanel) : document.activeElement;
  panelOpeners.set(panel, opener);
  if (activePanel && activePanel !== panel) {
    activePanel.layer.inert = true;
    activePanel.close();
  }
  activePanel = panel;
  panel.layer.inert = false;
  hud.menu.setCurrent(menu);
  panel.open(...args);
  (worldView.hidden ? playerView : worldView).inert = true;
}

function dismissPanel() {
  const panel = activePanel;
  activePanel = null;
  hud.menu.setCurrent(null);
  if (panel) { panel.layer.inert = true; panel.close(); }
}

function closeWorld() {
  dismissPanel();
  worldView.hidden = true;
  playerView.inert = false;
  map.focus({ preventScroll: true });
}

const actions = {
  catalog: () => openCatalog(),
  access: () => openPanel(access, [], 'access'),
  followed: () => openPanel(followed, [], 'followed'),
  'how-to-play': () => startTutorial(),
  settings: () => openPanel(settings, [], 'settings'),
};
const hud = createTopRight({
  playerId: '',
  items: MENU_ITEMS.map(item => item.id === 'settings' ? { ...item, title: 'Settings', meta: '' } : item),
  onSelect: id => state && actions[id]?.(),
  onNotifications: () => state && openPanel(notes),
  onLogout: signOut,
});
playerView.append(hud.element);

const settings = createPanelShell({ title: 'Settings', onClose: () => panelClosed(settings) });
const shareLinkedin = el('button', {
  type: 'button', id: 'share-resident-linkedin', class: 'ui-btn ui-btn--secondary', 'aria-pressed': 'false', hidden: true,
}, 'Share LinkedIn');
settings.body.append(shareLinkedin);
settings.body.append(el('p', {}, 'Email reminders and password reset are unavailable in this prototype.'));

const seedForm = createSeedForm({
  onClose: () => panelClosed(seedForm),
  async onSubmit({ title, idea, question, file, adoption }) {
    const point = pendingPlant;
    if (!point) return { ok: false, error: 'Throw an acorn to choose where to plant.' };
    const body = new FormData();
    for (const key of ['x', 'z', 'island']) body.set(key, String(point[key]));
    if (adoption) body.set('adopt', adoption.id);
    else {
      for (const [key, value] of Object.entries({ title, idea, question })) body.set(key, value);
      if (file) body.set('article', file);
    }
    try {
      const result = await post('/api/plants', body);
      selectedAdoption = null;
      pendingPlant = null;
      updateGarden();
      if (result.access) reportAccess(result.access);
      else if (result.unchanged) announce('This seed is already planted on your island.');
      else plantedToast(toasts, { island: point.island, title: adoption?.title ?? title });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  },
});

const detail = createPlantDetail({
  onClose: () => {
    if (activePanel === detail) openPlant = null;
    panelClosed(detail);
  },
  onWater: plant => changePlant(plant, 'water'),
  onFollow: (plant, enabled) => changePlant(plant, 'follow', { enabled }),
  async onPost({ plant, text, replyTo }) {
    try {
      await changePlant(plant, 'comment', { text, replyTo }, true);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  },
});
const followed = createFollowedPlants({
  onOpen: plant => showIdea(plant.id, plant.placementIsland),
  onBrowse: openIslandPlants,
  onClose: () => panelClosed(followed),
});
const islandPlants = createIslandPlants({
  onOpen: plant => showIdea(plant.id, plant.placementIsland),
  onClose: () => panelClosed(islandPlants),
});
const notes = createNotificationPanel({
  async onSelect(item) {
    try { await post('/api/notifications/read', { id: item.id }); }
    catch (error) { announce(error.message); }
    if (activePanel !== notes) return;
    if (item.type === 'access') actions.access();
    else if (item.plantId && item.type !== 'retention') {
      const plant = findPlant(item.plantId);
      if (plant) showIdea(plant.id, plant.island);
      else announce('Visit the island where this idea grows to open its discussion.');
    }
  },
  onClose: () => panelClosed(notes),
});
document.body.append(settings.layer, seedForm.layer, detail.layer, followed.layer, islandPlants.layer, notes.layer);

const tutorial = createTutorial({
  targets: {
    joystick: () => document.documentElement.classList.contains('mobile-layout') ? byId('move-stick') : null,
    plus: () => seedLauncher.hidden ? null : seedLauncher,
    menu: () => hud.menu.button,
    landing: () => tutorialRect(sceneTargets?.landing ?? { x: map.clientWidth / 2, y: map.clientHeight * .68 }),
    plant: () => sceneTargets?.plant && tutorialRect({ x: sceneTargets.plant.left, y: sceneTargets.plant.top }, sceneTargets.plant),
    bridge: () => sceneTargets?.bridge ? tutorialRect(sceneTargets.bridge) : byId('open-world'),
  },
  steps: TUTORIAL_STEPS.map((step, index) => index === 0 && !matchMedia('(pointer: coarse)').matches &&
    new URLSearchParams(location.search).get('preview') !== 'mobile-game'
    ? { ...step, body: 'Use WASD to move. Drag the scene or use the arrow keys to look around.' }
    : index === 5 ? { ...step, body: 'Plant an adopted seed at home to open that island’s bridge for 48 hours. Walk across the branches to visit, and add time with likes and comments.' } : step),
  onDone: finishTutorial,
  onSkip: finishTutorial,
});
document.body.append(tutorial.element);
const tutorialKey = () => 'chi-island.ui-tutorial.' + account.id;

function tutorialRect(point, hit = null) {
  const rect = map.getBoundingClientRect();
  return {
    x: rect.left + point.x - (hit ? 0 : 12),
    y: rect.top + point.y - (hit ? 0 : 12),
    width: hit ? hit.right - hit.left : 24,
    height: hit ? hit.bottom - hit.top : 24,
  };
}

function startTutorial() {
  dismissPanel();
  playerView.inert = true;
  tutorial.start();
}

function finishTutorial() {
  try { localStorage.setItem(tutorialKey(), '1'); } catch { /* Play still works without storage. */ }
  playerView.inert = false;
  map.focus({ preventScroll: true });
}

function setupHomePanels() {
  catalog = createSeedCatalog({
    homeIsland: state.home,
    isLocked,
    onAdopt(seed) {
      selectedAdoption = seed;
      dismissPanel();
      playerView.inert = false;
      updateGarden();
      if (currentIsland === state.home) {
        map.focus();
        if (seedLauncher.getAttribute('aria-pressed') !== 'true') seedLauncher.click();
      } else announce('Seed selected. Return home to plant it.');
    },
    onView: seed => showIdea(seed.id, state.home),
    onClose: () => panelClosed(catalog),
  });
  access = createAccessPanel({
    homeIsland: state.home,
    islands: accessRows(),
    onVisit: findBridge,
    onUnlock: openCatalog,
    onOpenCatalog: openCatalog,
    onClose: () => panelClosed(access),
  });
  document.body.append(catalog.layer, access.layer);
}

function accessRows() {
  return state.islands.map(island => ({
    islandId: island.id,
    expiresAt: state.access.find(item => item.island === island.id)?.expiry || null,
    maturity: { mature: island.mature, total: island.total },
    isHome: island.id === state.home,
    isCurrent: island.id === currentIsland,
  }));
}

function openCatalog(island = null) {
  if (!worldView.hidden) closeWorld();
  openPanel(catalog, [{ island }], 'catalog');
}

function findBridge(destination) {
  closeWorld();
  if (scene.faceBridge(destination)) announce('Follow the branches to the bridge and walk across.');
}

function openIslandPlants() {
  if (state) openPanel(islandPlants, [{ island: currentIsland, plants: plants.map(plantRow) }]);
}

function openPlantForm() {
  openPanel(seedForm, [{ island: pendingPlant.island, adoption: pendingPlant.adoption }]);
}

function findPlant(id, island = currentIsland) {
  return state?.plants.find(plant => plant.id === id && plant.island === island) ??
    state?.plants.find(plant => plant.id === id);
}

function plantRow(plant) {
  const newReplies = state.notifications.filter(note => !note.read && note.plant === plant.id &&
    ['reply', 'comment', 'follow-comment'].includes(note.type)).length;
  return {
    id: plant.id, title: plant.title, island: plant.originalIsland, placementIsland: plant.island,
    stage: stageNames[plant.growth], dormant: plant.dormant, at: plant.lastActivity,
    newReplies, contributors: plant.participantCount,
  };
}

function plantDetail(plant) {
  const [water, nutrients, contributors] = growthGoals[Math.min(plant.growth, 2)];
  return {
    ...plantRow(plant),
    author: plant.creator, idea: plant.idea, question: plant.question, plantedOn: plant.plantedOn,
    water: { count: plant.likes, goal: water },
    nutrients: { count: plant.commentCount, goal: nutrients },
    contributors: { count: plant.participantCount, goal: contributors },
    likes: plant.likes, following: Boolean(plant.following), watered: plant.watered, mine: plant.mine,
    canWater: live && !plant.mine && !plant.watered,
    paperUrl: plant.hasArticle ? '/api/plants/' + plant.id + '/article' : null,
    authorLinkedin: openPlant?.fromScene ? plant.authorLinkedin : null,
  };
}

function threads(comments) {
  const roots = [];
  const byComment = new Map();
  for (const item of comments) {
    const comment = { id: item.id, author: item.resident, authorIsland: item.island, at: item.created, text: item.body };
    const parent = byComment.get(item.replyTo);
    if (parent) {
      comment.replyAuthor = item.replyResident;
      parent.replies.push(comment);
      byComment.set(item.id, parent);
    } else {
      comment.replies = [];
      roots.push(comment);
      byComment.set(item.id, comment);
    }
  }
  return roots;
}

function showIdea(id, island, fromScene = false) {
  const plant = findPlant(id, island);
  if (!plant) return;
  openPlant = { id, island: plant.island, fromScene };
  openPanel(detail, [plantDetail(plant), threads(plant.comments)]);
  for (const note of state.notifications) {
    if (!note.read && note.plant === id && ['reply', 'comment', 'follow-comment'].includes(note.type)) {
      post('/api/notifications/read', { id: note.id }).catch(() => {});
    }
  }
}

async function changePlant(plant, action, details = {}, throwError = false) {
  if (changingPlant) {
    if (throwError) throw new Error('A contribution is still saving. Try again in a moment.');
    return plant;
  }
  changingPlant = true;
  try {
    const response = await post('/api/plants/' + plant.id + '/' + action, { island: plant.placementIsland, ...details });
    if (response.access) {
      reportAccess(response.access);
      if (action === 'water' || action === 'comment') {
        showScenePrompt(createActionFeedback({
          kind: action === 'water' ? 'water' : 'nourish', island: response.access.island, until: response.access.expiry,
        }).element);
      }
    }
    await refreshGarden().catch(() => {});
    const current = findPlant(plant.id, plant.placementIsland);
    return current ? plantDetail(current) : plant;
  } catch (error) {
    if (throwError) throw error;
    announce(error.message);
    return plant;
  } finally {
    changingPlant = false;
  }
}

function reportAccess(access) {
  accessToast(toasts, {
    island: access.island,
    addedHours: access.addedHours,
    hoursLeft: (access.expiry - Date.now()) / 3_600_000,
    capped: !access.addedHours,
  });
}

function updateGarden() {
  plants = state.plants.filter(plant => plant.island === currentIsland);
  scene.update(plants, currentIsland, state.bridges);
  const visiting = currentIsland !== state.home;
  islandChip.hidden = false;
  islandChip.className = 'ui-island-chip ' + islandClass(currentIsland);
  byId('island-name').textContent = islandName(currentIsland);
  byId('island-context').textContent = visiting ? 'Visiting' : 'Home island';
  seedLauncher.hidden = visiting;
  const launchLabel = selectedAdoption ? 'Plant adopted seed' : 'Plant a seed';
  seedLauncher.dataset.launchLabel = launchLabel;
  if (seedLauncher.getAttribute('aria-pressed') !== 'true') {
    seedLauncher.setAttribute('aria-label', launchLabel);
    seedLauncher.title = launchLabel + ' (Q)';
  }
  plantingTip.textContent = selectedAdoption ? 'Tap to throw · ' + selectedAdoption.title : 'Tap to throw. Plant a research idea for others to explore.';
}

const panelData = new WeakMap();

function changedData(component, data, render) {
  const key = JSON.stringify(data);
  if (panelData.get(component) === key) return;
  panelData.set(component, key);
  render(data);
}

function renderPanels() {
  changedData(catalog, state.catalog, list => catalog.update(list.map(seed => ({
    ...seed, island: seed.originalIsland, stage: stageNames[seed.growth],
    growing: seed.growth > 0, planted: seed.plantedHere,
  }))));
  changedData(access, accessRows(), list => access.update(list));
  changedData(islandPlants, plants.map(plantRow), list => islandPlants.update(list));
  const followedRows = [...new Map(state.plants.filter(plant => plant.following)
    .map(plant => [plant.id, plantRow(plant)])).values()];
  changedData(followed, followedRows, list => followed.update(list));
  hud.menu.setMeta('followed', followedMenuMeta(followedRows));
  hud.menu.setMeta('access', state.access.filter(item => item.active).length + ' other islands open');

  const notificationRows = state.notifications.map(item => ({
    id: item.id, type: item.type === 'access-ending' ? 'access' : item.type,
    island: item.island ?? findPlant(item.plant)?.originalIsland,
    plant: item.title ?? 'Your plant', plantId: item.plant, at: item.created, unread: !item.read,
    exportUrl: item.type === 'retention' ? '/api/plants/' + item.plant + '/export' : null,
    quote: findPlant(item.plant)?.comments.find(comment => comment.id === item.comment)?.body.slice(0, 180),
  }));
  changedData(notes, notificationRows, items => notes.update(items));
  hud.bell.setUnread(notes.unread);

  if (activePanel === detail && openPlant) {
    const plant = findPlant(openPlant.id, openPlant.island);
    if (plant) changedData(detail, [plantDetail(plant), threads(plant.comments)], data => detail.update(...data));
    else detail.close();
  }
}

function receiveGarden(next, { restorePosition = true } = {}) {
  if (crossing && restorePosition) return;
  const firstArrival = currentIsland === null;
  const changedIsland = currentIsland !== next.position.island;
  const expired = state?.access.find(item => item.island === currentIsland && item.active) &&
    next.access.some(item => item.island === currentIsland && !item.active);
  state = next;
  currentIsland = next.position.island;
  if (firstArrival) setupHomePanels();
  if (selectedAdoption && next.catalog.find(seed => seed.id === selectedAdoption.id)?.plantedHere) selectedAdoption = null;
  live = true;
  updateGarden();
  if (restorePosition && changedIsland && Number.isFinite(next.position.x)) scene.arrive(next.position);
  renderPanels();
  if (!worldView.hidden) world.update(state);
  if (expired) announce('Your access ended. Water or nourish a plant here to renew access to its origin island.');
  if (firstArrival) {
    try { if (!localStorage.getItem(tutorialKey())) startTutorial(); }
    catch { startTutorial(); }
  }
}

islandChip.addEventListener('click', openIslandPlants);
byId('open-world').addEventListener('click', () => {
  if (!state) return announce('Connecting to the garden…');
  worldView.hidden = false;
  worldView.inert = false;
  playerView.inert = true;
  world.update(state);
  byId('home-island').focus({ preventScroll: true });
});
byId('toggle-dashboard').addEventListener('click', () => actions.access());
document.body.append(message);

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
    if (state) renderPanels();
  });
  setInterval(()=>{if(!crossing)savePosition();},3000);
  setInterval(()=>{
    if(!state)return;
    const expired=state.access.some(item=>item.active&&item.expiry<=Date.now());
    if(expired)refreshGarden().catch(()=>{});
    else if(!worldView.hidden)world.update(state);
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
  hud.setPlayerId(account.id);
  if (profile.linkedin) {
    shareResidentLinkedin.hidden = false;
    shareResidentLinkedin.setAttribute('aria-pressed', String(profile.shareLinkedin));
  }
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
async function signOut() {
  if (accountPending) return;
  accountPending = true;
  try {
    if(!account?.judge&&account?.id)rememberUsername(account.id);
    await post('/api/auth/logout',{});
    location.reload();
  }catch(error){
    announce(error.message || 'Could not sign out. Try again.');
  } finally {
    accountPending = false;
  }
}

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
const canLockLandscape = !mobilePreview && document.fullscreenEnabled &&
  typeof screen.orientation?.lock === 'function';
const rotatePrompt = createRotatePrompt({
  contained: true,
  onFullscreen: canLockLandscape ? enterFullscreen : undefined,
});
landscapeDialog.append(rotatePrompt.element);
rotatePrompt.element.removeAttribute('role');
rotatePrompt.element.removeAttribute('aria-modal');
rotatePrompt.setVisible(true);

function updateOrientation() {
  const mobile = touchLayout.matches || mobilePreview;
  document.documentElement.classList.toggle('mobile-layout', mobile);
  if (!mobilePreview && mobile && portrait.matches) {
    if (!landscapeDialog.open) landscapeDialog.showModal();
  } else if (landscapeDialog.open) {
    landscapeDialog.close();
    if (plantWaitingForLandscape) {
      plantWaitingForLandscape = false;
      openPlantForm();
    } else if (!document.querySelector('dialog[open]') && !playerView.inert) {
      map.focus({preventScroll:true});
    }
  }
}

async function enterFullscreen() {
  const control = rotatePrompt.element.querySelector('button');
  control.disabled = true;
  const alreadyFullscreen = Boolean(document.fullscreenElement);
  try {
    if (!alreadyFullscreen) await document.documentElement.requestFullscreen();
    await screen.orientation.lock('landscape');
  } catch {
    if (!alreadyFullscreen && document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    control.hidden = true;
  } finally {
    control.disabled = false;
  }
}
landscapeDialog.addEventListener('cancel', event => event.preventDefault());
touchLayout.addEventListener('change', updateOrientation);
portrait.addEventListener('change', updateOrientation);

installGameDesign(artwork).then(() => { if (!worldView.hidden) world.draw(); });
playerView.inert = true;
onboarding.showModal();
updateOrientation();
loadAccount();
