// Viewport readout for checking layout on real phones. Loads only with ?debug=viewport.
// Shows what the browser reports for the screen, the visual viewport, and the safe areas,
// next to where the game box actually sits, so a screenshot is enough to diagnose fit.

// A manual popover sits in the top layer, so it shows above modal dialogs too.
const box = document.createElement('pre');
box.setAttribute('aria-hidden', 'true');
box.popover = 'manual';
Object.assign(box.style, {
  position: 'fixed', inset: 0, margin: 'auto', width: 'fit-content', height: 'fit-content', border: 0,
  padding: '8px 10px', maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto',
  font: '11px/1.35 ui-monospace, Menlo, monospace', color: '#fff', background: 'rgb(0 0 0 / .78)',
  borderRadius: '6px', pointerEvents: 'none', whiteSpace: 'pre-wrap',
});

// env() values cannot be read directly, so a hidden probe turns them into padding.
const probe = document.createElement('div');
Object.assign(probe.style, {
  position: 'fixed', visibility: 'hidden', pointerEvents: 'none',
  padding: 'env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px)',
});
document.body.append(probe, box);

const px = value => Math.round(parseFloat(value) || 0);
const rect = element => {
  if (!element) return 'none';
  const r = element.getBoundingClientRect();
  return `x ${Math.round(r.left)}..${Math.round(r.right)}  y ${Math.round(r.top)}..${Math.round(r.bottom)}`;
};

function raise() {
  if (typeof box.showPopover !== 'function') {
    box.style.zIndex = 2147483647;
    return;
  }
  // Reopening moves it back above any dialog opened since.
  if (box.matches(':popover-open')) box.hidePopover();
  box.showPopover();
}

function update() {
  raise();
  const root = getComputedStyle(document.documentElement);
  const safe = getComputedStyle(probe);
  const v = window.visualViewport;
  box.textContent = [
    `screen       ${screen.width} x ${screen.height}  dpr ${devicePixelRatio}  ${screen.orientation?.type ?? ''}`,
    `inner        ${innerWidth} x ${innerHeight}`,
    `client       ${document.documentElement.clientWidth} x ${document.documentElement.clientHeight}`,
    v ? `visual       ${Math.round(v.width)} x ${Math.round(v.height)}  off ${Math.round(v.offsetLeft)},${Math.round(v.offsetTop)}  scale ${v.scale.toFixed(2)}` : 'visual       unsupported',
    `safe t/r/b/l ${px(safe.paddingTop)} / ${px(safe.paddingRight)} / ${px(safe.paddingBottom)} / ${px(safe.paddingLeft)}`,
    `--game       ${['width', 'height', 'left', 'top'].map(name => root.getPropertyValue('--game-' + name).trim()).join('  ')}`,
    `.world       ${rect(document.querySelector('body > .world'))}`,
    `#open-world  ${rect(document.getElementById('open-world'))}`,
    `ua           ${navigator.userAgent.replace(/^Mozilla\/5\.0 /, '')}`,
  ].join('\n');
}

update();
window.visualViewport?.addEventListener('resize', update);
window.visualViewport?.addEventListener('scroll', update);
window.addEventListener('resize', update);
setInterval(update, 1000);
