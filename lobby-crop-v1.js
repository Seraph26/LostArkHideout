/* Lobby import — drag a box around the party panel.

   A full-screen capture leaves the panel a small fraction of the frame, and
   locating it automatically does not work: on a real 1920x1080 grab the panel
   text is too small for a first OCR pass to find anything to anchor on, so the
   read returns nothing at all. A person can point at it in one drag, which is
   both more reliable and faster than any heuristic.

   The crop is taken from the source image at full resolution, not from the
   scaled-down preview -- the whole point is to hand OCR every pixel the capture
   actually contains. */
(function () {
  'use strict';

  const MIN_SIDE = 40;   /* below this it is a stray click, not a selection */

  function styles() {
    if (document.getElementById('lobby-crop-style')) return;
    const s = document.createElement('style');
    s.id = 'lobby-crop-style';
    s.textContent =
      '.lobby-crop{position:relative;display:inline-block;max-width:100%;line-height:0;' +
        'user-select:none;-webkit-user-select:none;touch-action:none}' +
      '.lobby-crop img{max-width:100%;height:auto;display:block;cursor:crosshair}' +
      '.lobby-crop-box{position:absolute;border:2px solid #7aa2f7;background:rgba(122,162,247,.16);' +
        'pointer-events:none;box-shadow:0 0 0 9999px rgba(6,9,14,.55)}' +
      '.lobby-crop-size{position:absolute;top:-22px;left:0;font:11px/1 Inter,system-ui,sans-serif;' +
        'color:#cfe0ff;background:#1b2434;padding:3px 6px;border-radius:4px;white-space:nowrap}' +
      '.lobby-crop-actions{display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap}' +
      '.lobby-crop-actions button{font:inherit;font-weight:600;padding:7px 13px;border-radius:7px;cursor:pointer;' +
        'border:1px solid #4a5a80;background:#2c5cc5;color:#fff}' +
      '.lobby-crop-actions button[disabled]{opacity:.45;cursor:default}' +
      '.lobby-crop-actions .secondary{background:#1a2230;border-color:#46516a;color:#edf2fb}' +
      '.lobby-crop-hint{font:12px/1.5 Inter,system-ui,sans-serif;color:#8fa0b8;margin:0 0 8px}';
    document.head.appendChild(s);
  }

  /* Resolves with a canvas of the chosen region, or null if cancelled. */
  function pickRegion(container, imageSrc, options) {
    const opts = options || {};
    styles();
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (typeof imageSrc === 'string' && /^https?:/i.test(imageSrc)) img.crossOrigin = 'anonymous';
      img.onerror = () => reject(Error('That image could not be read.'));
      img.onload = () => {
        container.innerHTML = '';

        const hint = document.createElement('p');
        hint.className = 'lobby-crop-hint';
        hint.textContent = opts.hint || 'Drag a box around the party list on the right, then read it.';
        container.appendChild(hint);

        const wrap = document.createElement('div');
        wrap.className = 'lobby-crop';
        const view = document.createElement('img');
        view.src = img.src;
        view.draggable = false;
        wrap.appendChild(view);

        const box = document.createElement('div');
        box.className = 'lobby-crop-box';
        box.style.display = 'none';
        const size = document.createElement('span');
        size.className = 'lobby-crop-size';
        box.appendChild(size);
        wrap.appendChild(box);
        container.appendChild(wrap);

        const actions = document.createElement('div');
        actions.className = 'lobby-crop-actions';
        const read = document.createElement('button');
        read.textContent = 'Read this area';
        read.disabled = true;
        const whole = document.createElement('button');
        whole.className = 'secondary';
        whole.textContent = 'Use the whole image';
        actions.appendChild(read);
        actions.appendChild(whole);
        container.appendChild(actions);

        let start = null, rect = null;

        /* The preview is scaled to fit, so every coordinate has to be mapped
           back to the source before cropping. */
        const ratio = () => img.naturalWidth / Math.max(1, view.clientWidth);

        const clampPoint = e => {
          const b = view.getBoundingClientRect();
          return {
            x: Math.min(Math.max(e.clientX - b.left, 0), b.width),
            y: Math.min(Math.max(e.clientY - b.top, 0), b.height)
          };
        };

        const paint = () => {
          if (!rect) { box.style.display = 'none'; return; }
          box.style.display = 'block';
          box.style.left = rect.x + 'px';
          box.style.top = rect.y + 'px';
          box.style.width = rect.w + 'px';
          box.style.height = rect.h + 'px';
          const r = ratio();
          size.textContent = Math.round(rect.w * r) + ' × ' + Math.round(rect.h * r) + ' px';
        };

        view.addEventListener('pointerdown', e => {
          e.preventDefault();
          /* Capture keeps the drag alive past the image edge, but it throws for
             a pointer id the browser does not know about, which must not take
             the whole selection down with it. */
          try { view.setPointerCapture(e.pointerId); } catch (_) {}
          start = clampPoint(e);
          rect = null;
          read.disabled = true;
          paint();
        });
        view.addEventListener('pointermove', e => {
          if (!start) return;
          const p = clampPoint(e);
          rect = {
            x: Math.min(start.x, p.x), y: Math.min(start.y, p.y),
            w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y)
          };
          paint();
        });
        const finish = () => {
          start = null;
          const r = ratio();
          read.disabled = !rect || rect.w * r < MIN_SIDE || rect.h * r < MIN_SIDE;
          if (read.disabled) { rect = null; paint(); }
        };
        view.addEventListener('pointerup', finish);
        view.addEventListener('pointercancel', finish);

        const cropTo = region => {
          const cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(region.w));
          cv.height = Math.max(1, Math.round(region.h));
          const g = cv.getContext('2d', { willReadFrequently: true });
          g.imageSmoothingQuality = 'high';
          g.drawImage(img, region.x, region.y, region.w, region.h, 0, 0, cv.width, cv.height);
          return cv;
        };

        read.addEventListener('click', () => {
          if (!rect) return;
          const r = ratio();
          resolve({
            canvas: cropTo({ x: rect.x * r, y: rect.y * r, w: rect.w * r, h: rect.h * r }),
            rect: { x: Math.round(rect.x * r), y: Math.round(rect.y * r), w: Math.round(rect.w * r), h: Math.round(rect.h * r) },
            cropped: true
          });
        });
        whole.addEventListener('click', () => {
          resolve({
            canvas: cropTo({ x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight }),
            rect: { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight },
            cropped: false
          });
        });
      };
      img.src = imageSrc;
    });
  }

  /* A snip of the panel needs no crop step; a wide capture does. Keeping the
     threshold here means callers do not have to reason about it. */
  const needsCrop = width => Number(width) > 1200;

  window.LostArkLobbyCrop = { pickRegion, needsCrop, MIN_SIDE };
})();
