// First-run tutorial (Figma 19:398 to 19:1150), built as drawn.
// Dim over the scene, a dashed highlight around the target, and the
// Tutorial Card (16:389) beside it. Starts after choosing a home island.
//
//   const tutorial = createTutorial({
//     targets: {
//       joystick: () => document.querySelector('#move-stick'),        // an element...
//       plus:     () => document.querySelector('#seed-mode'),
//       menu:     () => hud.menu.button,
//       landing:  () => scene.screenRect('landing'),                   // ...or a rect {x, y, width, height}
//       plant:    () => scene.screenRect('nearest-plant'),
//       bridge:   () => scene.screenRect('nearest-bridge'),
//     },
//     onDone: () => { ... },   // Start playing or Skip tutorial
//   });
//   document.body.append(tutorial.element);
//   tutorial.start();

import { el, icon } from './islands-ui.mjs';
import { replay } from './motion.mjs';

/** Steps and copy from the Figma frames. pad is the highlight inset around the target. */
export const TUTORIAL_STEPS = [
  { target: 'joystick', pad: 4, side: 'right', title: 'Walk around',
    body: 'Drag the left pad to move. Drag the right side of the screen to look around.' },
  { target: 'plus', pad: 6, side: 'left', title: 'Plant your first idea',
    body: 'Tap + to ready an acorn, face open grass, then tap anywhere to throw. Add a title, a short description and an open question.' },
  { target: 'menu', pad: 6, side: 'left-below', title: 'Open the Seed Catalog',
    body: 'Ideas from other islands live in the catalog. Open it from the menu at the top right.' },
  { target: 'landing', pad: 0, side: 'right', title: 'Adopt and plant',
    body: 'Adopt a seed from another island and plant it at home. That opens 48 hours on its origin island.' },
  { target: 'plant', pad: 0, side: 'left-above', title: 'Water and nourish', stages: true,
    body: 'A like waters a plant, a comment nourishes it. Each one adds time on the plant’s origin island.' },
  { target: 'bridge', pad: 0, side: 'below-right', title: 'Adopt, water, cross', final: true,
    body: 'Adopt a seed from another island, water it, and that island’s bridge opens for you. Every like and comment adds time.' },
];

const MARGIN = 16;
const GAP = 16;
let maskCount = 0;

function rectOf(target, root) {
  const value = typeof target === 'function' ? target() : target;
  if (!value) return null;
  const r = value instanceof Element ? value.getBoundingClientRect() : value;
  const base = root.getBoundingClientRect();
  return { x: r.x - (value instanceof Element ? base.x : 0), y: r.y - (value instanceof Element ? base.y : 0), width: r.width, height: r.height };
}

export function createTutorial({ targets = {}, steps = TUTORIAL_STEPS, onDone, onSkip, contained = false }) {
  const maskId = `ui-tut-mask-${++maskCount}`;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'ui-tutorial__highlight');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<defs><mask id="${maskId}" maskUnits="userSpaceOnUse"><rect pathLength="100"/></mask></defs><rect class="ui-tutorial__dash" mask="url(#${maskId})"/>`;
  const [maskRect, dashRect] = [svg.querySelector('mask rect'), svg.querySelector('.ui-tutorial__dash')];

  const stepText = el('p', { class: 'ui-tutorial-card__step' });
  const progress = el('div', { class: 'ui-tutorial-card__progress', 'aria-hidden': 'true' }, steps.map(() => el('i')));
  const title = el('h2', { class: 'ui-tutorial-card__title', id: `${maskId}-title`, tabindex: '-1' });
  const body = el('p', { class: 'ui-tutorial-card__body' });
  const secondary = el('button', { type: 'button', class: 'ui-btn ui-btn--ghost ui-btn--s' }, el('span', { class: 'ui-btn__label' }));
  const nextIcon = icon('arrow-right');
  const primary = el('button', { type: 'button', class: 'ui-btn ui-btn--s' }, nextIcon, el('span', { class: 'ui-btn__label' }));
  const card = el('div', { class: 'ui-tutorial-card', role: 'dialog', 'aria-labelledby': `${maskId}-title`, 'aria-describedby': `${maskId}-body` },
    stepText, progress, title, body, el('div', { class: 'ui-tutorial-card__actions' }, secondary, primary));
  body.id = `${maskId}-body`;

  const stages = el('div', { class: 'ui-tutorial__stages', 'aria-label': 'Plant stages: seed, sprout, young plant, mature plant' },
    ['seed', 'sprout', 'young', 'mature'].map(s => el('img', { class: 'ui-stage', src: `/ui/stages/${s}.svg`, alt: '' })));

  const element = el('div', { class: `ui-tutorial${contained ? ' ui-tutorial--contained' : ''}`, hidden: true },
    el('div', { class: 'ui-tutorial__dim' }), svg, card, stages);

  let index = 0;

  function place() {
    const step = steps[index];
    const bounds = { width: element.clientWidth, height: element.clientHeight };
    const t = rectOf(targets[step.target], element);

    if (t) {
      const h = { x: t.x - step.pad, y: t.y - step.pad, width: t.width + step.pad * 2, height: t.height + step.pad * 2 };
      svg.style.cssText = `left:${h.x}px;top:${h.y}px;width:${h.width}px;height:${h.height}px`;
      svg.setAttribute('viewBox', `0 0 ${h.width} ${h.height}`);
      for (const r of [maskRect, dashRect]) {
        r.setAttribute('x', 1); r.setAttribute('y', 1);
        r.setAttribute('width', Math.max(0, h.width - 2)); r.setAttribute('height', Math.max(0, h.height - 2));
      }
      svg.style.display = '';

      // Card beside the highlight on the preferred side, then kept inside the frame.
      const cw = card.offsetWidth, ch = card.offsetHeight;
      let x, y;
      switch (step.side) {
        case 'right': x = h.x + h.width + GAP; y = h.y + h.height - ch; break;
        case 'left': x = h.x - GAP - cw; y = h.y + h.height - ch; break;
        case 'left-below': x = h.x - GAP * 2 - cw; y = h.y + h.height + GAP; break;
        case 'left-above': x = h.x - GAP * 4 - cw; y = h.y - ch / 2; break;
        case 'below-right': x = h.x + h.width + GAP / 2; y = h.y + h.height - GAP * 2; break;
        default: x = (bounds.width - cw) / 2; y = (bounds.height - ch) / 2;
      }
      x = Math.min(Math.max(x, MARGIN), bounds.width - cw - MARGIN);
      y = Math.min(Math.max(y, MARGIN), bounds.height - ch - MARGIN - (step.stages ? 44 : 0));
      card.style.left = `${x}px`;
      card.style.top = `${y}px`;
      stages.style.left = `${x}px`;
      stages.style.top = `${y + ch + 8}px`;
    } else {
      svg.style.display = 'none';
      card.style.left = `${(bounds.width - card.offsetWidth) / 2}px`;
      card.style.top = `${(bounds.height - card.offsetHeight) / 2}px`;
    }
  }

  function render() {
    const step = steps[index];
    stepText.textContent = `Step ${index + 1} of ${steps.length}`;
    [...progress.children].forEach((bar, i) => bar.classList.toggle('is-done', i <= index));
    title.textContent = step.title;
    body.textContent = step.body;
    secondary.querySelector('.ui-btn__label').textContent = step.final ? 'Replay' : 'Skip tutorial';
    primary.querySelector('.ui-btn__label').textContent = step.final ? 'Start playing' : 'Next';
    nextIcon.hidden = Boolean(step.final);
    stages.hidden = !step.stages;
    place();
    replay(svg);
    replay(card);
    if (step.stages) replay(stages);
    title.focus({ preventScroll: true });
  }

  function go(i) { index = Math.max(0, Math.min(steps.length - 1, i)); render(); }
  function finish(kind) {
    element.hidden = true;
    removeEventListener('resize', place);
    (kind === 'skip' ? onSkip ?? onDone : onDone)?.(kind);
  }

  primary.addEventListener('click', () => (steps[index].final ? finish('done') : go(index + 1)));
  secondary.addEventListener('click', () => (steps[index].final ? go(0) : finish('skip')));
  element.addEventListener('keydown', event => {
    if (event.key === 'Escape') finish('skip');
    if (event.key === 'ArrowRight' && !steps[index].final) go(index + 1);
    if (event.key === 'ArrowLeft') go(index - 1);
  });

  return {
    element,
    start(at = 0) { element.hidden = false; addEventListener('resize', place); go(at); },
    go,
    stop: () => finish('skip'),
    get step() { return index; },
    refresh: place,
  };
}
