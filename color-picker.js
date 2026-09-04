import { validColor } from './appearance.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function hexToHsv(hex, fallbackHue = 0) {
  const channels = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255);
  const [r, g, b] = channels;
  const max = Math.max(...channels), min = Math.min(...channels), delta = max - min;
  let h = fallbackHue;
  if (delta) {
    const sector = max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
    h = (sector * 60 + 360) % 360;
  }
  return { h, s: max ? delta / max * 100 : 0, v: max * 100 };
}

export function hsvToHex({ h, s, v }) {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 100) / 100;
  v = clamp(v, 0, 100) / 100;
  const channel = n => {
    const k = (n + h / 60) % 6;
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255).toString(16).padStart(2, '0');
  };
  return `#${channel(5)}${channel(3)}${channel(1)}`;
}

export function createColorPicker(dialog, onChange) {
  const get = id => dialog.querySelector(`#${id}`);
  const plane = get('color-plane'), hex = get('picker-hex');
  const fields = { h: get('picker-hue'), s: get('picker-saturation'), v: get('picker-brightness') };
  let state, role, original, pending = null, frame = null, pointer = null;

  function flush() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    if (pending !== null) { const color = pending; pending = null; onChange(role, color); }
  }

  function sync(emit = false) {
    const color = hsvToHex(state), hue = hsvToHex({ h: state.h, s: 100, v: 100 });
    dialog.style.setProperty('--picker-hue', hue);
    dialog.style.setProperty('--picker-color', color);
    dialog.style.setProperty('--picker-x', `${state.s}%`);
    dialog.style.setProperty('--picker-y', `${100 - state.v}%`);
    Object.entries(fields).forEach(([key, input]) => {
      input.value = Math.round(state[key]);
      const unit = key === 'h' ? '°' : '%';
      get(`${input.id}-value`).textContent = `${Math.round(state[key])}${unit}`;
      input.setAttribute('aria-valuetext', `${Math.round(state[key])}${key === 'h' ? ' degrees' : ' percent'}`);
      input.style.setProperty('--slider-thumb', key === 'h' ? hue : color);
    });
    fields.s.style.setProperty('--slider-fill', `linear-gradient(to right,${hsvToHex({ ...state, s: 0 })},${hsvToHex({ ...state, s: 100 })})`);
    fields.v.style.setProperty('--slider-fill', `linear-gradient(to right,#000,${hsvToHex({ ...state, v: 100 })})`);
    if (document.activeElement !== hex) hex.value = color;
    if (emit) { pending = color; if (frame === null) frame = requestAnimationFrame(flush); }
  }

  function clearError() { hex.removeAttribute('aria-invalid'); get('picker-error').textContent = ''; }
  Object.entries(fields).forEach(([key, input]) => input.addEventListener('input', () => {
    clearError(); state[key] = Number(input.value); sync(true);
  }));
  hex.addEventListener('input', () => {
    clearError();
    if (validColor(hex.value.trim())) { state = hexToHsv(hex.value.trim(), state.h); sync(true); }
  });
  function validateHex() {
    if (!validColor(hex.value.trim())) {
      hex.setAttribute('aria-invalid', 'true');
      get('picker-error').textContent = 'Use six hex digits, such as #bd93f9.';
    }
  }
  hex.addEventListener('change', validateHex);
  hex.addEventListener('blur', validateHex);
  get('picker-restore').addEventListener('click', () => { clearError(); state = hexToHsv(original); hex.value = original; sync(true); });

  function point(event) {
    const rect = plane.getBoundingClientRect();
    state.s = clamp((event.clientX - rect.left) / rect.width * 100, 0, 100);
    state.v = 100 - clamp((event.clientY - rect.top) / rect.height * 100, 0, 100);
    clearError(); sync(true);
  }
  plane.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    pointer = event.pointerId;
    plane.setPointerCapture(pointer);
    event.preventDefault(); point(event);
  });
  plane.addEventListener('pointermove', event => { if (event.pointerId === pointer) point(event); });
  plane.addEventListener('pointerup', event => { if (event.pointerId === pointer) { point(event); pointer = null; flush(); } });
  plane.addEventListener('pointercancel', () => { pointer = null; flush(); });
  plane.addEventListener('lostpointercapture', () => { pointer = null; });
  dialog.addEventListener('close', () => { pointer = null; flush(); });

  return {
    open(key, color, title) {
      flush(); role = key; original = color; state = hexToHsv(color);
      get('color-picker-title').textContent = title;
      hex.value = color; clearError(); sync(); dialog.showModal();
    },
  };
}
