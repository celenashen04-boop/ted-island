import { createScene } from './scene.mjs';
import { plantStage } from './plots.mjs';

const byId = (id) => document.getElementById(id);
const map = byId('map');
const message = byId('message');
const plantDialog = byId('plant-dialog');
const ideaDialog = byId('idea-dialog');
const plantForm = byId('plant-form');
const waterButton = byId('water');
let plants = [];
let pendingPoint = null;
let openPlant = null;
let live = false;
let submitting = false;
let watering = false;

let messageTimer;
function announce(text) {
  message.textContent = text;
  clearTimeout(messageTimer);
  if (text) messageTimer = setTimeout(() => { message.textContent = ''; }, 3400);
}

const scene = createScene(map, {
  onPlant: showIdea,
  onThrowRequest() {
    if (!live) { announce('Connecting to the garden…'); return false; }
    return true;
  },
  onLanding(result, point) {
    if (result === 'miss') return announce('The seed went off the island. Try another throw.');
    if (result === 'blocked') return announce('The seed needs open grass. Try another throw.');
    pendingPoint = point;
    plantForm.reset();
    byId('plant-error').textContent = '';
    plantDialog.showModal();
  }
});

function showIdea(id) {
  openPlant = id;
  byId('water-error').textContent = '';
  renderIdea();
  ideaDialog.showModal();
}

function renderIdea() {
  const plant = plants.find((item) => item.id === openPlant);
  if (!plant) return;
  byId('idea-title').textContent = plant.title;
  byId('idea-text').textContent = plant.idea;
  byId('idea-growth').textContent = plantStage(plant.likes) + ' · ' + plant.likes + (plant.likes === 1 ? ' like' : ' likes');
  byId('article-link').href = '/api/plants/' + plant.id + '/article';
  waterButton.disabled = !live || watering || Boolean(plant.mine || plant.watered);
  waterButton.textContent = plant.mine ? 'Your plant' : plant.watered ? '♥ Watered' : '♡ Like · Water';
}

async function post(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'X-TED-Island': 'garden' },
    body
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}

document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
ideaDialog.addEventListener('close', () => { openPlant = null; map.focus(); });
plantDialog.addEventListener('close', () => map.focus());

plantForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submitting || pendingPoint === null) return;
  const body = new FormData(plantForm);
  const point = pendingPoint;
  body.append('x', String(point.x));
  body.append('z', String(point.z));
  const error = byId('plant-error');
  const submit = plantForm.querySelector('[type=submit]');
  error.textContent = '';
  submitting = true;
  submit.disabled = true;
  submit.textContent = 'Saving article…';
  try {
    await post('/api/plants', body);
    announce('Seed planted');
    plantDialog.close();
  } catch (failure) {
    error.textContent = failure.message || 'Unable to plant the seed.';
  } finally {
    submitting = false;
    submit.disabled = false;
    submit.textContent = 'Plant research seed';
  }
});

waterButton.addEventListener('click', async () => {
  const id = openPlant;
  if (!id || watering) return;
  watering = true;
  byId('water-error').textContent = '';
  renderIdea();
  try {
    await post('/api/plants/' + id + '/water');
  } catch (error) {
    if (openPlant === id) byId('water-error').textContent = error.message || 'Unable to water the plant.';
  } finally {
    watering = false;
    if (openPlant) renderIdea();
  }
});

const stream = new EventSource('/api/events');
stream.addEventListener('message', (event) => {
  plants = JSON.parse(event.data);
  scene.update(plants);
  live = true;
  if (openPlant) renderIdea();
});
stream.addEventListener('error', () => {
  live = false;
  announce('Reconnecting to the garden…');
  if (openPlant) renderIdea();
});
map.focus({ preventScroll: true });
