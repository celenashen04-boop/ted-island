// Email and reminders (menu 05). Figma: no email 31:834, saved 31:995.
// The optional email, the two reminder checkboxes, and Remove email.
// The email is never shown to other players.
//
//   const email = createEmailSettings({
//     settings: { email: '', remindAccess: true, remindReplies: true },
//     onSave: async ({ email, remindAccess, remindReplies }) => ({ ok: true }),   // or { ok: false, error }
//     onRemove: async () => ({ ok: true }),
//   });
//   document.body.append(email.layer);
//   email.open();
//   hud.menu.setMeta('settings', emailMenuMeta(settings));   // "Not set up", "Reminders on" or "Reminders off"

import { el, icon } from './islands-ui.mjs';
import { createField, createCheckbox, infoLine } from './fields.mjs';
import { createPanelShell } from './panel.mjs';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Menu meta line for Email and reminders. */
export function emailMenuMeta({ email, remindAccess, remindReplies } = {}) {
  if (!email) return 'Not set up';
  return remindAccess || remindReplies ? 'Reminders on' : 'Reminders off';
}

export function createEmailSettings({ settings = {}, onSave, onRemove, onClose, contained = false }) {
  const shell = createPanelShell({
    title: 'Email and reminders', subtitle: 'Optional · never shown to other players',
    className: 'ui-panel--email', closeLabel: 'Close Email and reminders', contained, onClose,
  });

  const field = createField({ label: 'Email', type: 'email', name: 'email', placeholder: 'you@university.edu', autocomplete: 'email', inputmode: 'email', spellcheck: false });
  const savedNote = el('p', { class: 'ui-field__help ui-email__saved', id: `${field.input.id}-saved` }, 'Saved. Used only for reminders and password reset.');
  field.element.append(savedNote);
  const access = createCheckbox({ label: 'Email me when island access is about to expire.', name: 'remindAccess' });
  const replies = createCheckbox({ label: 'Email me when someone replies to me or comments on my plants.', name: 'remindReplies' });
  const warning = infoLine('Without an email, a forgotten password can’t be recovered.');
  const saveLabel = el('span', { class: 'ui-btn__label' });
  const saveIcon = icon('mail');
  const save = el('button', { type: 'submit', class: 'ui-btn' }, saveIcon, saveLabel);
  const remove = el('button', { type: 'button', class: 'ui-btn ui-btn--ghost ui-btn--s ui-email__remove' }, el('span', { class: 'ui-btn__label' }, 'Remove email'));
  const error = el('p', { class: 'ui-email__error', role: 'alert' });
  const status = el('p', { class: 'ui-sr-only', role: 'status' });
  const form = el('form', { class: 'ui-email', novalidate: true },
    field.element, access.element, replies.element, warning,
    el('div', { class: 'ui-email__actions' }, save, remove), error, status);
  shell.body.append(form);

  let saved = { email: '', remindAccess: true, remindReplies: true, ...settings };

  function render() {
    const has = Boolean(saved.email);
    field.input.value = saved.email;
    field.setError(null);
    access.input.checked = has ? Boolean(saved.remindAccess) : true;
    replies.input.checked = has ? Boolean(saved.remindReplies) : true;
    savedNote.hidden = !has;
    if (has) field.input.setAttribute('aria-describedby', savedNote.id); else field.input.removeAttribute('aria-describedby');
    warning.hidden = has;
    saveIcon.hidden = has;
    saveLabel.textContent = has ? 'Save changes' : 'Save';
    remove.hidden = !has;
    error.textContent = '';
  }

  async function busy(button, task) {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    try { return await task(); } finally { button.disabled = false; button.removeAttribute('aria-busy'); }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    error.textContent = '';
    const email = field.value.trim();
    if (!EMAIL.test(email)) { field.setError('Check the email address.'); field.input.focus(); return; }
    field.setError(null);
    const next = { email, remindAccess: access.checked, remindReplies: replies.checked };
    const result = await busy(save, () => onSave?.(next));
    if (result && result.ok === false) { error.textContent = result.error ?? 'Something went wrong. Try again.'; return; }
    saved = next;
    render();
    status.textContent = '';
    requestAnimationFrame(() => { status.textContent = 'Saved.'; });
  });

  remove.addEventListener('click', async () => {
    error.textContent = '';
    const result = await busy(remove, () => onRemove?.());
    if (result && result.ok === false) { error.textContent = result.error ?? 'Something went wrong. Try again.'; return; }
    saved = { email: '', remindAccess: true, remindReplies: true };
    render();
    field.input.focus();
    status.textContent = '';
    requestAnimationFrame(() => { status.textContent = 'Email removed.'; });
  });

  render();
  return {
    layer: shell.layer,
    panel: shell.panel,
    open: () => { render(); return shell.open(); },
    close: shell.close,
    update(next) { saved = { ...saved, ...next }; render(); },
    get settings() { return { ...saved }; },
  };
}
