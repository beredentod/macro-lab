// Page lifecycle only: no model calculations or continuously running tasks.
// Each model remembers its own state in this browser tab, scoped to this site.
const site = new URL('.', import.meta.url).pathname;

export function validModelState(state, specs, capitalMax) {
  const inRange = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
  return state && ['before', 'after'].every(regime =>
    state[regime] && specs.every(([key, , , min, max]) => inRange(state[regime][key], min, max))
  ) && ['before', 'after'].includes(state.mode)
    && [80, 160, 320].includes(state.horizon)
    && Number.isInteger(state.tau) && inRange(state.tau, 1, state.horizon - 1)
    && inRange(state.time, 0, state.horizon)
    && inRange(state.k0, Number.MIN_VALUE, capitalMax)
    && ['3', '8', '20'].includes(state.speed)
    && typeof state.controlsHidden === 'boolean';
}

export function connectSessionState(model, workspace, {capture, restore, pause}) {
  const key = `macro-lab:${site}:${model}:v1`;
  try {
    const saved = JSON.parse(sessionStorage.getItem(key));
    if (saved && restore(saved.state)) {
      const details = [...workspace.querySelectorAll('details')];
      if (Array.isArray(saved.open)) details.forEach((node, index) => {
        if (typeof saved.open[index] === 'boolean') node.open = saved.open[index];
      });
      // Restore scrolling after the charts have their final sizes.
      requestAnimationFrame(() => {
        for (const [id, top] of Object.entries(saved.scroll || {})) {
          const node = document.getElementById(id);
          if (node && workspace.contains(node) && Number.isFinite(top)) node.scrollTop = top;
        }
        if (Number.isFinite(saved.scrollY)) window.scrollTo(0, saved.scrollY);
      });
    }
  } catch {
    // Disabled storage or an incompatible saved state must not block a model.
  }
  window.addEventListener('pagehide', () => {
    pause();
    try {
      const scroll = {};
      workspace.querySelectorAll('[id]').forEach(node => {
        if (node.scrollTop) scroll[node.id] = node.scrollTop;
      });
      sessionStorage.setItem(key, JSON.stringify({
        state: capture(),
        open: [...workspace.querySelectorAll('details')].map(node => node.open),
        scroll, scrollY: window.scrollY
      }));
    } catch {
      // Navigation and both models still work when session storage is disabled.
    }
  });
}
