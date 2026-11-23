// Anonymous player ID label with a copy action (Figma ID Label 13:81).
//
//   const label = createIdLabel('Mossy-Fern-4821');
//   hud.append(label.element);
//   label.setId('Quiet-Reed-1203');

import { el, icon } from './islands-ui.mjs';

const COPIED_MS = 1600;

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers without clipboard access (http, older Safari).
    const area = el('textarea', { readonly: true, 'aria-hidden': 'true', style: 'position:fixed;opacity:0;pointer-events:none' });
    area.value = text;
    document.body.append(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    area.remove();
    return ok;
  }
}

export function createIdLabel(playerId) {
  let id = playerId;
  let timer = 0;
  const text = el('span', {}, id.toUpperCase());
  const status = el('span', { class: 'ui-sr-only', role: 'status' });
  const element = el('button', { type: 'button', class: 'ui-id-label', title: 'Copy your ID' }, text, icon('copy'), status);

  const label = () => element.setAttribute('aria-label', `Your ID, ${id}. Copy`);
  label();

  element.addEventListener('click', async () => {
    const ok = await copyText(id);
    clearTimeout(timer);
    element.toggleAttribute('data-copied', ok);
    text.textContent = ok ? 'COPIED' : id.toUpperCase();
    status.textContent = ok ? 'ID copied' : 'Could not copy. Select and copy your ID by hand.';
    timer = setTimeout(() => {
      element.removeAttribute('data-copied');
      text.textContent = id.toUpperCase();
      status.textContent = '';
    }, COPIED_MS);
  });

  return {
    element,
    setId(next) {
      id = next;
      text.textContent = id.toUpperCase();
      label();
    },
  };
}
