// New seed form (Figma Player View / New seed form 20:791, panel 20:903).
// Opens after a valid throw. Title and open question side by side, a short
// description, an optional paper or poster PDF, and Plant seed.
// For an adopted seed the fields are hidden and the panel confirms what is
// being planted (copy from the current app).
//
//   const form = createSeedForm({
//     onSubmit: async ({ title, question, idea, file }) => ({ ok: true }),   // or { ok: false, error }
//   });
//   document.body.append(form.layer);
//   form.open({ island: 0 });                                      // a new seed
//   form.open({ island: 0, adoption: { title: 'Play as research method' } });

import { el, icon, islandUi } from './islands-ui.mjs';
import { createField } from './fields.mjs';
import { createPanelShell } from './panel.mjs';

const REQUIRED = {
  title: 'Add a title.',
  question: 'Add an open question.',
  idea: 'Add a short description.',
};

export function createSeedForm({ onSubmit, onClose, contained = false }) {
  const shell = createPanelShell({
    title: 'Plant a research seed', className: 'ui-panel--seed',
    closeLabel: 'Close without planting', contained, onClose,
  });

  const title = createField({ label: 'Title or article', name: 'title', maxlength: 120 });
  const question = createField({ label: 'Open question', name: 'question', maxlength: 300 });
  const idea = createField({ label: 'Short description', name: 'idea', multiline: true, rows: 1, maxlength: 500, placeholder: 'What is the idea, in two sentences?' });
  const fields = { title, question, idea };

  // Attach: a real file input behind a secondary button, PDF only.
  const file = el('input', { type: 'file', accept: '.pdf,application/pdf', class: 'ui-sr-only', tabindex: '-1', 'aria-hidden': 'true' });
  const attachLabel = el('span', { class: 'ui-btn__label' }, 'Attach paper or poster');
  const attach = el('button', { type: 'button', class: 'ui-btn ui-btn--secondary ui-btn--s ui-seed-form__attach', onclick: () => file.click() },
    icon('paperclip'), attachLabel);
  file.addEventListener('change', () => {
    const chosen = file.files?.[0];
    attachLabel.textContent = chosen ? chosen.name : 'Attach paper or poster';
    attach.setAttribute('aria-label', chosen ? `Attached ${chosen.name}. Choose a different file` : 'Attach paper or poster');
  });

  const adoptionLine = el('p', { class: 'ui-seed-form__adoption', hidden: true });
  const error = el('p', { class: 'ui-seed-form__error', role: 'alert' });
  const submit = el('button', { type: 'submit', class: 'ui-btn' }, icon('seed'), el('span', { class: 'ui-btn__label' }, 'Plant seed'));
  const fieldBox = el('div', { class: 'ui-seed-form__fields' },
    el('div', { class: 'ui-seed-form__row' }, title.element, question.element), idea.element);
  const form = el('form', { class: 'ui-seed-form', novalidate: true },
    fieldBox, adoptionLine,
    el('div', { class: 'ui-seed-form__foot' }, attach, file, submit),
    error);
  shell.body.append(form);

  let adoption = null;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    error.textContent = '';
    if (!adoption) {
      let first = null;
      for (const [key, field] of Object.entries(fields)) {
        const missing = !field.value.trim();
        field.setError(missing ? REQUIRED[key] : null);
        if (missing && !first) first = field;
      }
      if (first) { first.input.focus(); return; }
    }
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    try {
      const result = await onSubmit?.(adoption
        ? { adoption }
        : { title: title.value.trim(), question: question.value.trim(), idea: idea.value.trim(), file: file.files?.[0] ?? null });
      if (result && result.ok === false) { error.textContent = result.error ?? 'Something went wrong. Try again.'; return; }
      shell.close();
    } finally {
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
    }
  });

  function reset() {
    form.reset();
    for (const field of Object.values(fields)) field.setError(null);
    attachLabel.textContent = 'Attach paper or poster';
    attach.removeAttribute('aria-label');
    error.textContent = '';
  }

  return {
    layer: shell.layer,
    panel: shell.panel,
    form,
    open({ island = 0, adoption: adopted = null } = {}) {
      reset();
      adoption = adopted;
      shell.header.setIsland(island);
      shell.header.setSubtitle(`Landed on open grass · ${islandUi(island).name}`);
      fieldBox.hidden = Boolean(adoption);
      attach.hidden = Boolean(adoption);
      adoptionLine.hidden = !adoption;
      adoptionLine.textContent = adoption ? `Plant “${adoption.title}” here to begin connecting the islands.` : '';
      shell.open();
      if (!adoption) requestAnimationFrame(() => title.input.focus({ preventScroll: true }));
    },
    close: shell.close,
  };
}
