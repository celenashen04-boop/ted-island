// Form controls: Text Field (14:388) and Checkbox (14:398).
//
//   const pw = createField({ label: 'Password', type: 'password', name: 'password',
//     placeholder: 'At least 6 characters', help: 'You need this and your ID to log back in.',
//     autocomplete: 'new-password' });
//   form.append(pw.element);
//   pw.setError('Use at least 6 characters.'); pw.setError(null);

import { el, icon } from './islands-ui.mjs';

let count = 0;

export function createField({ label, type = 'text', name, placeholder = '', help = '', value = '', autocomplete, inputmode, required = false, spellcheck }) {
  const id = `ui-field-${++count}`;
  const helpId = `${id}-help`;
  const input = el('input', {
    class: 'ui-field__input',
    id,
    type,
    name,
    placeholder,
    autocomplete,
    inputmode,
    required,
    spellcheck: spellcheck === undefined ? null : String(spellcheck),
    'aria-describedby': help ? helpId : null,
  });
  input.value = value;
  const helpText = el('p', { class: 'ui-field__help', id: helpId }, help);
  const element = el('div', { class: 'ui-field' },
    el('label', { class: 'ui-field__label', for: id }, label), input, help ? helpText : null);

  return {
    element,
    input,
    get value() { return input.value; },
    /** Show an error (alert border, helper replaced). Pass null to restore the helper. */
    setError(message) {
      element.classList.toggle('is-error', Boolean(message));
      input.setAttribute('aria-invalid', String(Boolean(message)));
      if (!help && message && !helpText.isConnected) element.append(helpText);
      if (!help && !message) helpText.remove(); // an empty helper would still take a grid row
      helpText.textContent = message || help;
      if (message) input.setAttribute('aria-describedby', helpId);
      else if (!help) input.removeAttribute('aria-describedby');
      if (message) helpText.setAttribute('role', 'alert'); else helpText.removeAttribute('role');
    },
  };
}

export function createCheckbox({ label, name, checked = false }) {
  const input = el('input', { class: 'ui-check__input', type: 'checkbox', name, checked });
  const element = el('label', { class: 'ui-check' }, input, el('span', { class: 'ui-check__box', 'aria-hidden': 'true' }, icon('check')), el('span', {}, label));
  return { element, input, get checked() { return input.checked; } };
}

/** Info line with the small info icon ("Without an email..."). */
export const infoLine = text => el('p', { class: 'ui-info' }, icon('info'), el('span', {}, text));
