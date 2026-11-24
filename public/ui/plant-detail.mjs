// Plant detail and shared discussion (Figma 23:478, Comment 16:293).
// Two columns: the idea (badge, author ID, title, stage or dormant state,
// open question, Water / Nutrients / Contributors, actions) and the shared
// discussion, which is the same on every island where the plant grows.
//
//   const detail = createPlantDetail({
//     onWater: plant => like(plant.id),            // resolve to the updated plant, or nothing
//     onFollow: (plant, on) => follow(plant.id, on),
//     onPost: async ({ text, replyTo }) => ({ ok: true }),
//   });
//   document.body.append(detail.layer);
//   detail.open(plant, comments);
//   detail.update(plant, comments);
//
// plant: { id, island, author, title, idea?, question, stage, dormant, plantedOn: [islandIds],
//          water: { count, goal }, nutrients: { count, goal }, contributors: { count, goal },
//          likes, following, paperUrl, canWater }
// comments: [ { id, author, authorIsland, at, text, replies: [ ...same, no nesting ] } ]

import { el, icon, islandBadgeSrc, islandClass, islandUi } from './islands-ui.mjs';
import { createField } from './fields.mjs';
import { createPanelShell } from './panel.mjs';
import { ageLabel } from './notifications.mjs';

const STAGE_TITLE = { seed: 'Seed', sprout: 'Sprout', young: 'Young plant', tree: 'Tree', mature: 'Mature oak' };

function stat(label, { count = 0, goal = 0 } = {}, tone) {
  return el('div', { class: `ui-stat ui-stat--${tone}` },
    el('span', { class: 'ui-stat__bar', 'aria-hidden': 'true' }),
    el('span', { class: 'ui-stat__label' }, label),
    el('span', { class: 'ui-stat__value' }, `${count} / ${goal}`));
}

export function createPlantDetail({ onWater, onFollow, onPost, onClose, contained = false }) {
  const titleId = `ui-plant-title-${Math.random().toString(36).slice(2, 8)}`;
  const shell = createPanelShell({ header: false, className: 'ui-panel--plant', labelledBy: titleId, contained, onClose });

  /* Idea column */
  const badge = el('img', { class: 'ui-badge ui-badge--24', alt: '' });
  const byline = el('p', { class: 'ui-plant-detail__byline' });
  const title = el('h2', { class: 'ui-plant-detail__title', id: titleId });
  const stageImg = el('img', { class: 'ui-stage ui-plant-detail__stage-img', alt: '' });
  const stageTitle = el('p', { class: 'ui-plant-detail__stage-title' });
  const stageMeta = el('p', { class: 'ui-plant-detail__stage-meta' });
  const idea = el('p', { class: 'ui-plant-detail__idea' });
  const question = el('p', { class: 'ui-plant-detail__question' });
  const stats = el('div', { class: 'ui-plant-detail__stats' });
  const waterLabel = el('span', { class: 'ui-btn__label' });
  const water = el('button', { type: 'button', class: 'ui-btn ui-btn--s' }, icon('water'), waterLabel);
  const followLabel = el('span', { class: 'ui-btn__label' });
  const follow = el('button', { type: 'button', class: 'ui-btn ui-btn--secondary ui-btn--s', 'aria-pressed': 'false' }, icon('follow'), followLabel);
  const paper = el('a', { class: 'ui-btn ui-btn--ghost ui-btn--s', target: '_blank', rel: 'noopener' }, icon('file'), el('span', { class: 'ui-btn__label' }, 'Paper (PDF)'));
  const author = el('a', { class: 'ui-btn ui-btn--secondary ui-btn--s', target: '_blank', rel: 'noopener noreferrer', hidden: true }, 'Connect to author');
  const ideaCol = el('section', { class: 'ui-plant-detail__idea-col' },
    el('div', { class: 'ui-plant-detail__origin' }, badge, byline),
    title,
    el('div', { class: 'ui-plant-detail__stage' }, stageImg, el('div', {}, stageTitle, stageMeta)),
    idea, question, stats,
    el('div', { class: 'ui-plant-detail__actions' }, water, follow, paper), author);

  /* Discussion column */
  const discussionTitle = el('h3', { class: 'ui-plant-detail__discussion-title' });
  const close = el('button', { type: 'button', class: 'ui-panel-header__close ui-plant-detail__close', 'aria-label': 'Close plant details', title: 'Close' }, icon('close'));
  const thread = el('ol', { class: 'ui-thread' });
  const emptyThread = el('p', { class: 'ui-thread__empty', hidden: true }, 'No comments yet. A comment nourishes this plant.');
  const comment = createField({ label: 'Comment · nourish', name: 'comment', multiline: true, rows: 1, maxlength: 1200, placeholder: 'Add a question, example or reply' });
  const replyCancel = el('button', { type: 'button', class: 'ui-btn ui-btn--ghost ui-btn--s', hidden: true }, el('span', { class: 'ui-btn__label' }, 'Cancel reply'));
  const post = el('button', { type: 'submit', class: 'ui-btn' }, el('span', { class: 'ui-btn__label' }, 'Post'));
  const postError = el('p', { class: 'ui-plant-detail__error', role: 'alert' });
  const composer = el('form', { class: 'ui-composer', novalidate: true },
    el('div', { class: 'ui-composer__row' }, comment.element, post), replyCancel, postError);
  const discussionCol = el('section', { class: 'ui-plant-detail__discussion', 'aria-labelledby': `${titleId}-d` },
    el('div', { class: 'ui-plant-detail__discussion-head' }, discussionTitle, close),
    thread, emptyThread, composer);
  discussionTitle.id = `${titleId}-d`;

  shell.body.classList.add('ui-plant-detail');
  shell.body.append(ideaCol, discussionCol);
  close.addEventListener('click', () => shell.close());

  let plant = null;
  let comments = [];
  let replyTo = null;
  const commentLabel = comment.element.querySelector('.ui-field__label');

  function setReply(target) {
    replyTo = target;
    commentLabel.textContent = target ? `Reply to ${target.author} · nourish` : 'Comment · nourish';
    replyCancel.hidden = !target;
    if (target) comment.input.focus();
  }
  replyCancel.addEventListener('click', () => { setReply(null); comment.input.focus(); });

  function renderComment(c, isReply) {
    const reply = el('button', { type: 'button', class: 'ui-comment__reply', 'aria-label': `Reply to ${c.author}` },
      icon('reply'), el('span', {}, 'Reply'));
    reply.addEventListener('click', () => setReply({ id: c.id, author: c.author }));
    return el('li', { class: `ui-comment${isReply ? ' ui-comment--reply' : ''}` },
      el('div', { class: 'ui-comment__body' },
        el('p', { class: 'ui-comment__meta' },
          el('img', { class: 'ui-badge ui-badge--sm', src: islandBadgeSrc(c.authorIsland ?? 0), alt: '' }),
          el('span', { class: 'ui-comment__author' }, c.author),
          el('span', { class: 'ui-comment__age' }, ageLabel(c.at))),
        c.replyAuthor ? el('p', { class: 'ui-comment__meta' }, 'Reply to ' + c.replyAuthor) : null,
        el('p', { class: 'ui-comment__text' }, c.text),
        reply));
  }

  function render() {
    if (!plant) return;
    const island = islandUi(plant.island);
    shell.panel.className = `ui-panel ui-panel--plant ${islandClass(plant.island)}`;
    badge.src = islandBadgeSrc(plant.island);
    byline.textContent = `${island.name} · by ${plant.author}`;
    title.textContent = plant.title;
    const stage = plant.dormant ? 'dormant' : plant.stage;
    stageImg.src = `/ui/stages/${stage}.svg`;
    stageTitle.textContent = plant.dormant ? 'Dormant' : STAGE_TITLE[plant.stage] ?? plant.stage;
    const on = plant.plantedOn ?? [plant.island];
    stageMeta.textContent = plant.dormant
      ? 'One like or comment revives it'
      : `Planted on ${on.length} ${on.length === 1 ? 'island' : 'islands'} · ${on.map(id => islandUi(id).short ?? islandUi(id).name).join(', ')}`;
    idea.textContent = plant.idea ?? '';
    idea.hidden = !plant.idea;
    question.textContent = `Open question: ${plant.question}`;
    stats.replaceChildren(
      stat('Water', plant.water, 'water'),
      stat('Nutrients', plant.nutrients, 'nutrients'),
      stat('Contributors', plant.contributors, 'contributors'));
    waterLabel.textContent = plant.mine ? 'Your plant' : plant.watered ? 'Watered' : `Water · ${plant.likes ?? 0}`;
    water.disabled = plant.canWater === false;
    water.title = plant.mine ? 'You can’t water your own plant' : plant.watered ? 'You already watered this plant' : 'Like to water';
    followLabel.textContent = plant.following ? 'Following' : 'Follow';
    follow.setAttribute('aria-pressed', String(Boolean(plant.following)));
    paper.hidden = !plant.paperUrl;
    if (plant.paperUrl) paper.href = plant.paperUrl;
    author.hidden = !plant.authorLinkedin;
    if (plant.authorLinkedin) author.href = plant.authorLinkedin;
    else author.removeAttribute('href');

    const total = comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0);
    discussionTitle.textContent = `Shared discussion · ${total}`;
    thread.replaceChildren(...comments.flatMap(c => [renderComment(c, false), ...(c.replies ?? []).map(r => renderComment(r, true))]));
    emptyThread.hidden = total > 0;
  }

  water.addEventListener('click', async () => {
    const id = plant.id;
    const next = await onWater?.(plant);
    if (next && plant.id === id) { plant = next; render(); }
  });
  follow.addEventListener('click', async () => {
    const id = plant.id;
    const want = !plant.following;
    const next = await onFollow?.(plant, want);
    if (plant.id !== id) return;
    plant = next ?? { ...plant, following: want };
    render();
  });
  composer.addEventListener('submit', async event => {
    event.preventDefault();
    postError.textContent = '';
    const text = comment.value.trim();
    if (!text) { comment.setError('Write a comment first.'); comment.input.focus(); return; }
    comment.setError(null);
    post.disabled = true;
    try {
      const result = await onPost?.({ plant, text, replyTo: replyTo?.id ?? null });
      if (result && result.ok === false) { postError.textContent = result.error ?? 'Something went wrong. Try again.'; return; }
      comment.input.value = '';
      setReply(null);
    } finally { post.disabled = false; }
  });

  return {
    layer: shell.layer,
    panel: shell.panel,
    open(nextPlant, nextComments = []) {
      plant = nextPlant; comments = nextComments; comment.input.value = ''; postError.textContent = ''; setReply(null); comment.setError(null); render(); shell.open();
    },
    update(nextPlant = plant, nextComments = comments) { plant = nextPlant; comments = nextComments; render(); },
    close: shell.close,
  };
}
