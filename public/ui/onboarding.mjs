// Login and onboarding flow (Figma Screens · Onboarding 11:5), built as drawn.
//
//   Enter (18:21)
//     I'm new here   -> ID reveal (18:128) -> Secure your ID (18:218) -> Choose home island (18:519)
//     I have an ID   -> Sign in (18:323)
//     Login as Judge -> Judge session (18:423) -> Choose home island
//
// Backend work stays outside: pass async callbacks.
//
//   const onboarding = createOnboarding({
//     createAccount: async () => ({ id: 'Mossy-Fern-4821' }),            // enter page creates the session
//     setPassword: async ({ id, password, email, remind }) => ({ ok: true }),
//     signIn: async ({ id, password }) => ({ ok: false, error: '...' }),
//     startJudge: async () => ({ id: 'Quiet-Kelp-7310' }),
//     islandStats: { 0: { residents: 12, ideas: 9 }, ... },             // optional
//     onChooseIsland: async islandId => { ... },                        // then start the tutorial
//     onSignedIn: () => { ... },
//     onForgotPassword: () => { ... },
//   });
//   document.body.append(onboarding.element);

import { el, icon, islandBadgeSrc, ISLAND_UI } from './islands-ui.mjs';
import { createField, createCheckbox, infoLine } from './fields.mjs';
import { createIdLabel, copyText } from './id-label.mjs';

const MIN_PASSWORD = 6;

/** Island descriptions from the Choose home island frame. */
const ISLAND_COPY = {
  0: 'Health, wellbeing & accessibility',
  1: 'Climate, energy, more-than-human design',
  2: 'Play, games & playful interaction',
};

const rule = () => el('div', { class: 'ui-rule', 'aria-hidden': 'true' }, el('i'), el('i'), el('i'));
const button = (label, { variant = '', iconName = 'arrow-right', block = false, onclick, type = 'button' } = {}) =>
  el('button', { type, class: `ui-btn ${variant}${block ? ' ui-btn--block' : ''}`, onclick },
    iconName ? icon(iconName) : null, el('span', { class: 'ui-btn__label' }, label));

function stats(s) {
  if (!s) return '';
  const ideas = s.ideas ? `${s.ideas} ideas` : 'No ideas yet';
  return `${s.residents} residents · ${ideas}`;
}

export function createOnboarding({
  createAccount, setPassword, signIn, startJudge, onChooseIsland, onSignedIn, onForgotPassword,
  islandStats = {}, deliveryAvailable = () => true, contained = false, start = 'enter',
}) {
  const element = el('div', { class: `ui-onboard${contained ? ' ui-onboard--contained' : ''}` });
  const screens = {};
  let playerId = '';
  let path = 'new';

  async function busy(btn, task) {
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    try { return await task(); } finally { btn.disabled = false; btn.removeAttribute('aria-busy'); }
  }

  /* Enter (18:21) */
  {
    const newBtn = button('I’m new here', { block: true });
    const idBtn = button('I have an ID', { variant: 'ui-btn--secondary', iconName: 'user' });
    const judgeBtn = button('Login as Judge', { variant: 'ui-btn--secondary', iconName: 'judge' });
    const error = el('p', { class: 'error', role: 'alert' });
    newBtn.addEventListener('click', () => busy(newBtn, async () => {
      const result = await createAccount?.();
      error.textContent = result?.error ?? '';
      if (!result?.id) return;
      playerId = result.id;
      path = 'new';
      show('reveal');
    }));
    idBtn.addEventListener('click', () => show('signin'));
    judgeBtn.addEventListener('click', () => busy(judgeBtn, async () => {
      const result = await startJudge?.();
      error.textContent = result?.error ?? '';
      if (!result?.id) return;
      playerId = result.id;
      path = 'judge';
      show('judge');
    }));
    screens.enter = el('section', { class: 'ui-onboard__screen', 'aria-labelledby': 'ui-ob-enter' },
      el('div', { class: 'ui-onboard__panel' },
        el('p', { class: 'ui-eyebrow' }, 'Research garden · CHI 2027'), rule(),
        el('h1', { class: 'ui-onboard__title', id: 'ui-ob-enter', tabindex: '-1' }, 'Plant an idea. Cross a bridge.'),
        el('p', { class: 'ui-onboard__lede' }, 'A shared garden where first-time attendees meet through research ideas, not small talk.'),
        el('div', { class: 'ui-onboard__spacer' }),
        error, el('div', { class: 'ui-onboard__enter-actions' }, newBtn,
          el('div', { class: 'ui-onboard__row ui-onboard__row--split' }, idBtn, judgeBtn))));
  }

  /* ID reveal (18:128). */
  {
    const idText = el('p', { class: 'ui-id-block__id' });
    const copyLabel = el('span', {}, 'Copy');
    const status = el('span', { class: 'ui-sr-only', role: 'status' });
    const copy = el('button', { type: 'button', class: 'ui-id-block__copy' }, icon('copy'), copyLabel, status);
    copy.addEventListener('click', async () => {
      const ok = await copyText(playerId);
      copy.toggleAttribute('data-copied', ok);
      copyLabel.textContent = ok ? 'Copied' : 'Copy';
      status.textContent = ok ? 'ID copied' : 'Could not copy. Select and copy your ID by hand.';
      setTimeout(() => { copy.removeAttribute('data-copied'); copyLabel.textContent = 'Copy'; status.textContent = ''; }, 1600);
    });
    const next = button('I saved it', { onclick: () => show('secure') });
    screens.reveal = el('section', { class: 'ui-onboard__screen', 'aria-labelledby': 'ui-ob-reveal' },
      el('div', { class: 'ui-onboard__panel ui-onboard__panel--md' },
        el('p', { class: 'ui-eyebrow' }, 'Step 1 of 3 · Your ID'), rule(),
        el('h1', { class: 'ui-onboard__title', id: 'ui-ob-reveal', tabindex: '-1' }, 'This is you on CHI Island'),
        el('div', { class: 'ui-id-block' }, idText, copy),
        el('p', { class: 'ui-onboard__body' }, 'Save this ID. You’ll need it to log back in.'),
        el('p', { class: 'ui-onboard__lede', style: 'max-width:456px' }, 'It is your only public name: it shows on your seeds and comments. No real names.'),
        el('div', { class: 'ui-onboard__spacer' }),
        next));
    screens.reveal.onShow = () => { idText.textContent = playerId; };
  }

  /* Secure your ID (18:218) */
  {
    const password = createField({ label: 'Password', type: 'password', name: 'password', placeholder: 'At least 6 characters', autocomplete: 'new-password' });
    const email = createField({ label: 'Email (optional)', type: 'email', name: 'email', placeholder: 'you@university.edu', autocomplete: 'email', inputmode: 'email', spellcheck: false });
    const remind = createCheckbox({ label: 'Email me when island access is about to expire.', name: 'remind', checked: true });
    const warning = infoLine('Without an email, a forgotten password can’t be recovered.');
    const delivery = infoLine('Email delivery and password reset are unavailable on this server.');
    const syncWarning = () => {
      warning.hidden = email.value.trim() !== '' || !deliveryAvailable();
      delivery.hidden = deliveryAvailable();
    };
    email.input.addEventListener('input', syncWarning);
    const submit = button('Continue', { type: 'submit' });
    const form = el('form', { class: 'ui-onboard__col ui-onboard__col--form', novalidate: true },
      password.element, email.element, remind.element, warning, delivery, submit);
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (password.value.length < MIN_PASSWORD) {
        password.setError('Use at least 6 characters.');
        password.input.focus();
        return;
      }
      password.setError(null);
      if (email.value && !email.input.checkValidity()) {
        email.setError('Check the email address.');
        email.input.focus();
        return;
      }
      email.setError(null);
      busy(submit, async () => {
        const result = await setPassword?.({ id: playerId, password: password.value, email: email.value.trim(), remind: remind.checked });
        if (result && result.ok === false) { password.setError(result.error ?? 'Something went wrong. Try again.'); return; }
        password.input.value = '';
        email.input.value = '';
        show('home');
      });
    });
    screens.secure = el('section', { class: 'ui-onboard__screen', 'aria-labelledby': 'ui-ob-secure' },
      el('div', { class: 'ui-onboard__panel ui-onboard__panel--lg' },
        el('div', { class: 'ui-onboard__col ui-onboard__col--text' },
          el('p', { class: 'ui-eyebrow' }, 'Step 2 of 3 · Secure it'), rule(),
          el('h1', { class: 'ui-onboard__title', id: 'ui-ob-secure', tabindex: '-1' }, 'Set a password'),
          el('p', { class: 'ui-onboard__lede' }, 'Leave your email and we’ll let you know when someone replies to your research or your island access is about to expire. Your email is never shown.')),
        form));
    screens.secure.onShow = syncWarning;
  }

  /* Sign in (18:323) */
  {
    const id = createField({ label: 'Your ID', name: 'username', autocomplete: 'username', spellcheck: false });
    id.input.setAttribute('autocapitalize', 'characters');
    const password = createField({ label: 'Password', type: 'password', name: 'password', autocomplete: 'current-password' });
    const submit = button('Sign in', { type: 'submit' });
    const forgot = el('button', { type: 'button', class: 'ui-btn ui-btn--ghost ui-btn--s ui-onboard__push', onclick: () => onForgotPassword?.(id.value.trim()) },
      el('span', { class: 'ui-btn__label' }, 'Forgot password?'));
    const form = el('form', { class: 'ui-onboard__col', style: 'width:100%', novalidate: true },
      id.element, password.element, el('div', { class: 'ui-onboard__row' }, submit, forgot));
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!id.value.trim()) { id.setError('Enter your ID.'); id.input.focus(); return; }
      id.setError(null);
      busy(submit, async () => {
        const result = await signIn?.({ id: id.value.trim(), password: password.value });
        if (result && result.ok === false) {
          password.setError(result.error ?? 'That ID and password don’t match.');
          password.input.focus();
          return;
        }
        password.setError(null);
        password.input.value = '';
        onSignedIn?.();
      });
    });
    screens.signin = el('section', { class: 'ui-onboard__screen', 'aria-labelledby': 'ui-ob-signin' },
      el('div', { class: 'ui-onboard__panel' },
        el('p', { class: 'ui-eyebrow' }, 'Welcome back'), rule(),
        el('h1', { class: 'ui-onboard__title', id: 'ui-ob-signin', tabindex: '-1' }, 'Sign in'),
        form, button('Back', { variant: 'ui-btn--ghost', onclick: () => show('enter') })));
  }

  /* Judge session (18:423) */
  {
    const label = createIdLabel('');
    const next = button('Choose an island', { onclick: () => show('home') });
    screens.judge = el('section', { class: 'ui-onboard__screen', 'aria-labelledby': 'ui-ob-judge' },
      el('div', { class: 'ui-onboard__panel' },
        el('p', { class: 'ui-eyebrow' }, 'Judge session'), rule(),
        el('h1', { class: 'ui-onboard__title', id: 'ui-ob-judge', tabindex: '-1' }, 'Welcome, judge'),
        el('p', { class: 'ui-onboard__lede' }, 'You get a random ID and play as a regular resident. Everything syncs across your devices in real time.'),
        label.element,
        infoLine('Session lasts until you close this browser.'),
        el('div', { class: 'ui-onboard__spacer' }),
        next));
    label.element.style.background = 'var(--color-bg-inverse)';
    screens.judge.onShow = () => label.setId(playerId);
  }

  /* Choose home island (18:519) with the home island explainer */
  {
    const eyebrow = el('p', { class: 'ui-eyebrow' });
    const explainerId = 'ui-ob-explainer';
    const term = el('button', { type: 'button', class: 'ui-home__term', 'aria-expanded': 'false', 'aria-controls': explainerId }, 'home island');
    const explainer = el('aside', { class: 'ui-explainer', id: explainerId, hidden: true, 'aria-label': 'What is a home island?' },
      el('p', { class: 'ui-explainer__title' }, icon('home'), 'What is a home island?'),
      el('p', { class: 'ui-explainer__body' }, 'It’s where your seeds grow and where you always have access. Other islands open for a while when you adopt, water or nourish their ideas.'));
    const setExplainer = open => { explainer.hidden = !open; term.setAttribute('aria-expanded', String(open)); };
    term.addEventListener('click', () => setExplainer(explainer.hidden));

    const options = ISLAND_UI.map((island, i) => el('label', { class: 'ui-home__option' },
      el('input', { type: 'radio', name: 'home-island', value: String(island.id), checked: i === 0, 'aria-describedby': `ui-ob-island-${island.id}` }),
      el('span', { class: 'ui-home__head' },
        el('img', { class: 'ui-badge', src: islandBadgeSrc(island.id), alt: '' }),
        el('span', { class: 'ui-home__mark', 'aria-hidden': 'true' }, icon('check'))),
      el('span', { class: 'ui-home__name' }, island.name),
      el('span', { class: 'ui-home__desc', id: `ui-ob-island-${island.id}` }, ISLAND_COPY[island.id] ?? ''),
      el('span', { class: 'ui-home__stats' }, stats(islandStats[island.id]))));
    const fieldset = el('fieldset', { class: 'ui-home__options' }, el('legend', { class: 'ui-sr-only' }, 'Home island'), options);

    const enter = button('Enter island', { type: 'submit' });
    const error = el('p', { class: 'error', role: 'alert' });
    const form = el('form', { class: 'ui-home', 'aria-labelledby': 'ui-ob-home' },
      eyebrow,
      el('h1', { class: 'ui-home__title', id: 'ui-ob-home', tabindex: '-1' }, 'Choose your ', term),
      fieldset, error,
      el('div', { class: 'ui-home__foot' }, el('p', { class: 'ui-home__hint' }, 'Pick the domain closest to your work.'), enter),
      explainer);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const choice = Number(new FormData(form).get('home-island'));
      busy(enter, async () => { error.textContent = (await onChooseIsland?.(choice))?.error ?? ''; });
    });
    form.addEventListener('keydown', event => { if (event.key === 'Escape' && !explainer.hidden) { setExplainer(false); term.focus(); } });
    form.addEventListener('pointerdown', event => { if (!explainer.hidden && !explainer.contains(event.target) && event.target !== term) setExplainer(false); });

    screens.home = el('section', { class: 'ui-onboard__screen' }, form);
    screens.home.onShow = () => {
      eyebrow.textContent = path === 'judge' ? 'Welcome to CHI Island' : 'Step 3 of 3 · Welcome to CHI Island';
      setExplainer(false);
    };
  }

  for (const screen of Object.values(screens)) { screen.hidden = true; element.append(screen); }

  function show(name) {
    for (const [key, screen] of Object.entries(screens)) {
      const on = key === name;
      screen.hidden = !on;
      screen.classList.toggle('is-entering', on);
    }
    screens[name].onShow?.();
    screens[name].querySelector('h1')?.focus({ preventScroll: true });
  }

  show(start);
  return {
    element,
    show,
    setPlayerId(id) { playerId = id; },
    get playerId() { return playerId; },
    setPath(next) { path = next; },
  };
}
