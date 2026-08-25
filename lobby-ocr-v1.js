/* Lobby import — clipboard capture and OCR.

   Separate from lobby-import-v1.js so that file stays pure logic with no
   network and no DOM. This one owns the parts that cannot be unit tested:
   loading tesseract, reading the clipboard, and turning pixels into text.

   Paste only, deliberately. A drop target would have to contend with the
   capture-phase `drop` handler on #suggestedParties in
   general-party-optimizer-v2.js, which calls stopImmediatePropagation(), and
   with the browser navigating away to any image dropped outside a handler.
   Neither problem exists if the only input is Ctrl+V. The screenshot can only
   come from a machine running the game, so nothing is lost by being desktop
   only. */
(function () {
  'use strict';

  const TESSERACT_JS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

  /* eng alone barely covers diacritics and substitutes the wrong mark -- it read
     Góldensparrow as Göldensparrow and Brelshaza as Breishaza. Adding German,
     French and Spanish covers every accent seen so far and measured far better
     on the reference lobby: servers 3/8 -> 8/8, item levels 5/8 -> 8/8. The
     script/Latin model would be broader but is unavailable (404 at tesseract's
     default tessdata path, 403 on jsdelivr for both tessdata_fast and _best).
     tessdata_fast keeps each model near 840KB rather than the ~11MB the default
     path serves. */
  const LANGS = ['eng', 'deu', 'fra', 'spa'];
  const LANG_PATH = 'https://cdn.jsdelivr.net/gh/tesseract-ocr/tessdata_fast@main';

  /* Uniform block. The panel is a two-column grid of short fragments, not a
     document, so tesseract's full page-layout analysis (PSM 3) is the wrong
     tool; 6 is what produced every measured result we trust. */
  const PSM = '6';

  /* Upscaling adds no information and past roughly 30px cap height it costs
     accuracy, because smooth interpolation softens the edges binarization
     depends on. Scale small crops up toward a working width and leave large
     captures alone rather than handing tesseract a 50-megapixel canvas. */
  const TARGET_WIDTH = 1500, MAX_SCALE = 4;
  const scaleFor = w => Math.max(1, Math.min(MAX_SCALE, Math.round((TARGET_WIDTH / Math.max(1, w)) * 100) / 100));

  /* A full-screen grab leaves the party panel a small fraction of the frame and
     its text too small to read. Win+Shift+S onto just the panel is what the
     reference capture was, and it scored 8/8 on servers and item levels. */
  const WIDE_CAPTURE = 1200;

  let scriptPromise = null, workerPromise = null;

  /* The worker is created once and reused, but progress belongs to whichever
     call is running. A logger cannot be passed to recognize() -- it is
     postMessage'd to a Web Worker and functions are not cloneable -- so it is
     fixed at creation and forwarded through here. */
  let activeProgress = null;

  function loadScript(src) {
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => { scriptPromise = null; reject(Error('Could not load the OCR library.')); };
      document.head.appendChild(s);
    });
    return scriptPromise;
  }

  /* One worker, reused. The convenience Tesseract.recognize() spins up a fresh
     worker per call, which re-fetches ~3.4MB of language data every paste. */
  async function getWorker() {
    if (workerPromise) return workerPromise;
    workerPromise = (async () => {
      await loadScript(TESSERACT_JS);
      if (!window.Tesseract) throw Error('OCR library loaded but did not initialise.');
      const worker = await window.Tesseract.createWorker(LANGS, 1, {
        langPath: LANG_PATH,
        gzip: false,
        logger: m => { if (activeProgress) activeProgress(m); }
      });
      await worker.setParameters({ tessedit_pageseg_mode: PSM });
      return worker;
    })();
    workerPromise.catch(() => { workerPromise = null; });   /* let a failed load be retried */
    return workerPromise;
  }

  /* Clipboard pastes arrive as data URLs and need nothing special, but a remote
     URL taints the canvas unless it is requested cross-origin, and a tainted
     canvas cannot be read back -- which is exactly what OCR does. */
  const loadImage = src => new Promise((resolve, reject) => {
    const img = new Image();
    if (typeof src === 'string' && /^https?:/i.test(src)) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(Error('That image could not be read.'));
    img.src = src;
  });

  const readBlob = blob => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(Error('That image could not be read.'));
    r.readAsDataURL(blob);
  });

  /* Draw a region of the source at a chosen scale. No manual threshold or
     invert: tesseract runs its own adaptive binarization and reads
     light-on-dark natively. */
  function toCanvas(img, rect, scale) {
    const r = rect || { x: 0, y: 0, w: img.width, h: img.height };
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(r.w * scale));
    cv.height = Math.max(1, Math.round(r.h * scale));
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, cv.width, cv.height);
    return cv;
  }

  /* Locate the party panel from the first pass instead of asking the user to
     crop to it. Server names and item levels are the two things we can identify
     without knowing where anything is, so their bounding boxes mark the panel
     wherever it sits -- which is what makes any resolution, aspect ratio or
     window size workable rather than only a tight crop. */
  function anchorRect(words, scale, rect, img) {
    const api = window.LostArkLobbyImport;
    if (!api || !Array.isArray(words)) return null;
    const base = rect || { x: 0, y: 0, w: img.width, h: img.height };
    const found = [];
    for (const w of words) {
      const t = String(w && w.text || '').replace(/^[^0-9A-Za-zÀ-ɏ]+/, '').replace(/[^0-9A-Za-zÀ-ɏ.]+$/, '');
      if (!t || !w.bbox) continue;
      if (api.repairIlvl(t) || api.nearestServer(t)) found.push(w.bbox);
    }
    if (found.length < 3) return null;          /* too little to trust */

    /* Reject outliers before taking bounds. One stray word elsewhere in the
       frame that happens to look like a server or an item level would otherwise
       stretch the box across the whole screen, and a box that wide cannot be
       zoomed enough to read -- which showed up as the panel being found but the
       rows going unread. Keep anchors near the median centre; the real ones are
       clustered in a panel. */
    const median = xs => { const s = xs.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
    const cx = median(found.map(b => (b.x0 + b.x1) / 2));
    const cy = median(found.map(b => (b.y0 + b.y1) / 2));
    const dist = found.map(b => Math.hypot((b.x0 + b.x1) / 2 - cx, (b.y0 + b.y1) / 2 - cy));
    const cutoff = Math.max(median(dist) * 2.5, 1);
    const kept = found.filter((b, i) => dist[i] <= cutoff);
    if (kept.length < 3) return null;

    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const heights = [];
    for (const b of kept) {
      x0 = Math.min(x0, b.x0); y0 = Math.min(y0, b.y0);
      x1 = Math.max(x1, b.x1); y1 = Math.max(y1, b.y1);
      heights.push(b.y1 - b.y0);
    }
    const textHeight = median(heights) / scale;   /* source pixels */

    /* Back into source pixels, then pad: names sit on the row below their
       server, and the panel's edges carry the title and gate line. */
    const toSrc = (v, o) => o + v / scale;
    let sx = toSrc(x0, base.x), sy = toSrc(y0, base.y);
    let sw = (x1 - x0) / scale, sh = (y1 - y0) / scale;
    /* Pad generously and deliberately over-include. Anchors only mark the
       middle of the panel -- class icons sit left of the servers, names sit on
       the row below, and a column whose servers all misread contributes no
       anchors at all -- so a tight box clips real content. Extra dark
       background costs nothing, because the parser finds rows by pattern
       rather than by position. */
    const padX = Math.max(40, sw * 0.35), padTop = Math.max(60, sh * 0.55), padBottom = Math.max(40, sh * 0.35);
    sx = Math.max(0, sx - padX); sy = Math.max(0, sy - padTop);
    sw = Math.min(img.width - sx, sw + padX * 2);
    sh = Math.min(img.height - sy, sh + padTop + padBottom);
    if (sw < 80 || sh < 60) return null;
    return { x: Math.round(sx), y: Math.round(sy), w: Math.round(sw), h: Math.round(sh), textHeight };
  }

  /* Scale the second pass by how tall the text actually measured, not by the
     image width. Sizing to a target width couples the crop's generosity to the
     zoom -- padding the crop to avoid clipping made the output wider, which cut
     the upscale, which shrank the glyphs back down and lost rows that a tighter
     crop had read. Text height is the thing OCR cares about, so aim at it
     directly. */
  const TARGET_TEXT_PX = 36, MAX_PASS_WIDTH = 3000;
  function scaleForText(textHeight, rectWidth) {
    if (!Number.isFinite(textHeight) || textHeight <= 0) return scaleFor(rectWidth);
    const wanted = TARGET_TEXT_PX / textHeight;
    return Math.max(1, Math.min(6, MAX_PASS_WIDTH / Math.max(1, rectWidth), wanted));
  }

  /* More slots with names is a better read; the encounter being identified
     breaks ties. */
  function quality(lobby) {
    if (!lobby) return -1;
    const named = lobby.slots.filter(s => s.name).length;
    return named * 10 + (lobby.encounterId ? 5 : 0) + (lobby.region ? 1 : 0);
  }

  /* The passes see different things: the first has the whole frame including
     the lobby title, the second has the panel enlarged but cropped tight enough
     to have cut the title off. Take the rows from whichever read them better
     and the heading from whichever found it, rather than tuning padding until
     one pass happens to catch both. */
  function mergeLobby(best, all) {
    const api = window.LostArkLobbyImport;
    const out = Object.assign({}, best);
    for (const l of all) {
      if (!l) continue;
      if (!out.raid && l.raid) { out.raid = l.raid; out.act = l.act; out.difficulty = l.difficulty; }
      if (!out.gate && l.gate) out.gate = l.gate;
    }
    /* Rebuild through the parser's own helper. Doing the string concatenation
       here instead silently undid the pinned gate for extreme raids, turning a
       valid extreme-brelshaza-g2 back into a g1 that does not exist. */
    out.effectiveGate = api.effectiveGateFor(out.raid, out.gate);
    out.encounterId = api.encounterIdFor(out.raid, out.gate);
    return out;
  }

  /* Returns the raw text plus enough context for the UI to explain a poor read
     without the caller having to know anything about images. */
  async function runPass(img, rect, scale) {
    const canvas = toCanvas(img, rect, scale);
    const worker = await getWorker();
    const started = Date.now();
    const { data } = await worker.recognize(canvas);
    return {
      text: (data && data.text) || '',
      words: (data && data.words) || [],
      ms: Date.now() - started,
      rect: rect || { x: 0, y: 0, w: img.width, h: img.height },
      scale,
      canvas: { width: canvas.width, height: canvas.height }
    };
  }

  /* Two passes, and the second only when the first did not already read a whole
     lobby. Pass one finds where the panel is; pass two reads it at a useful
     size. That is what lets a full-screen grab work as well as a tight crop,
     without anyone changing their resolution, aspect ratio or window mode. */
  async function readLobby(source, onProgress) {
    const api = window.LostArkLobbyImport;
    if (!api) throw Error('Lobby parser is unavailable.');
    /* A canvas is accepted as-is so a cropped region can be handed straight in
       without a round trip through a data URL, which would re-encode it. Every
       use below is width/height plus drawImage, which a canvas satisfies. */
    let img;
    if (source && source.nodeName === 'CANVAS') {
      img = source;
    } else {
      const src = (source instanceof Blob) ? await readBlob(source) : source;
      img = await loadImage(src);
    }

    activeProgress = onProgress || null;
    const passes = [];
    try {
      const first = await runPass(img, null, scaleFor(img.width));
      first.lobby = api.parseLobby(first.text);
      passes.push(first);

      let best = first;
      const rect = anchorRect(first.words, first.scale, null, img);
      const complete = first.lobby.encounterId &&
        [4, 8].includes(first.lobby.slots.filter(s => s.name).length);
      /* A panel that fills the frame was already read at its best. One sitting
         in a corner of a wider shot deserves a closer look even when the first
         parse looked plausible -- four rows out of eight read exactly like a
         valid 4-player lobby, so "looks complete" is not evidence on its own. */
      const fillsFrame = rect && rect.w >= img.width * 0.75 && rect.h >= img.height * 0.60;

      if (rect && (!complete || !fillsFrame)) {
        const second = await runPass(img, rect, scaleForText(rect.textHeight, rect.w));
        second.lobby = api.parseLobby(second.text);
        passes.push(second);
        if (quality(second.lobby) > quality(first.lobby)) best = second;
      }

      const lobby = mergeLobby(best.lobby, passes.map(p => p.lobby));

      return {
        text: best.text,
        lobby,
        ms: passes.reduce((n, p) => n + p.ms, 0),
        source: { width: img.width, height: img.height },
        ocr: { width: best.canvas.width, height: best.canvas.height, scale: best.scale },
        cropped: best.rect.w !== img.width || best.rect.h !== img.height,
        rect: best.rect,
        passes: passes.map(p => ({
          rect: p.rect, scale: p.scale, ms: p.ms,
          named: p.lobby.slots.filter(s => s.name).length,
          encounterId: p.lobby.encounterId
        })),
        wideCapture: img.width > WIDE_CAPTURE
      };
    } finally {
      activeProgress = null;
    }
  }

  /* Text only, for callers that do not want the lobby parsed. */
  async function readImage(source, onProgress) {
    const result = await readLobby(source, onProgress);
    return { text: result.text, ms: result.ms, source: result.source, ocr: result.ocr, wideCapture: result.wideCapture };
  }

  /* Image pastes only, so pasting a character URL into a text field is
     untouched. Listening on window rather than a specific element means it
     works wherever focus happens to be. */
  function onPasteImage(handler) {
    const listener = event => {
      const items = event.clipboardData && event.clipboardData.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind === 'file' && item.type.indexOf('image/') === 0) {
          const file = item.getAsFile();
          if (file) { event.preventDefault(); handler(file); }
          return;
        }
      }
    };
    window.addEventListener('paste', listener);
    return () => window.removeEventListener('paste', listener);
  }

  /* Pre-warm on idle so the first paste is not also a 3.4MB download. Callers
     opt in; nothing here runs on its own. */
  const preload = () => getWorker().catch(() => {});

  window.LostArkLobbyOCR = {
    readImage, readLobby, onPasteImage, preload,
    scaleFor, LANGS, PSM, WIDE_CAPTURE
  };
})();
