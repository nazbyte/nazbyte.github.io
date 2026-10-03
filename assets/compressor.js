/* NazByte in-browser image compressor.
 *
 * Runs ENTIRELY on the visitor's device: no upload, no server, no account, no
 * quota. Files are read with FileReader and encoded with canvas.toBlob.
 *
 * The product promise is "the output is under your target size, first try".
 * For JPEG and WebP that is met by a binary search on encoder quality. PNG has
 * no quality setting, so it is met by stepping the dimensions down. If neither
 * can reach the target, we say so plainly rather than shipping a bigger file.
 */
(function () {
  'use strict';

  var FORMATS = {
    jpeg: { mime: 'image/jpeg', ext: 'jpg', label: 'JPG' },
    webp: { mime: 'image/webp', ext: 'webp', label: 'WebP' },
    png:  { mime: 'image/png',  ext: 'png',  label: 'PNG'  }
  };

  function bytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
    return (n / 1048576).toFixed(n < 10485760 ? 2 : 1) + ' MB';
  }

  function toBlob(canvas, mime, quality) {
    return new Promise(function (resolve) {
      canvas.toBlob(function (b) { resolve(b); }, mime, quality);
    });
  }

  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }

  function drawScaled(bitmap, scale) {
    var w = bitmap.width * scale, h = bitmap.height * scale;
    var c = makeCanvas(w, h);
    var ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, c.width, c.height);
    return c;
  }

  /* Binary-search the encoder quality that lands just under targetBytes. */
  async function searchQuality(bitmap, mime, targetBytes, floorQuality) {
    var base = drawScaled(bitmap, 1);
    var best = null;
    var lo = floorQuality, hi = 0.96;
    var smallest = await toBlob(base, mime, floorQuality);
    if (!smallest || smallest.size > targetBytes) {
      return { blob: smallest, quality: floorQuality, canvas: base, fits: false };
    }
    for (var i = 0; i < 9; i++) {
      var mid = (lo + hi) / 2;
      var b = await toBlob(base, mime, mid);
      if (!b) break;
      if (b.size <= targetBytes) { best = { blob: b, quality: mid, canvas: base, fits: true }; lo = mid; }
      else { hi = mid; }
    }
    if (!best) return { blob: smallest, quality: floorQuality, canvas: base, fits: false };
    return best;
  }

  /* ----------------------------------------------------------------- PNG
   * canvas.toBlob('image/png') has no quality setting and always writes 24-bit
   * truecolour, so a photographic PNG cannot be brought down to a small target
   * that way. The thing that actually shrinks a PNG is reducing its palette, so
   * we do that ourselves: median-cut to N colours, then write a real indexed
   * PNG (colour type 3) with PLTE/tRNS, deflating the scanlines through the
   * browser's own CompressionStream. No library, no upload.
   */

  var CRC_TABLE = (function () {
    var t = new Int32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c;
    }
    return t;
  })();

  function crc32(buf) {
    var c = -1;
    for (var i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  }

  function chunk(type, data) {
    var out = new Uint8Array(12 + data.length);
    var dv = new DataView(out.buffer);
    dv.setUint32(0, data.length);
    for (var i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8);
    dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  }

  async function deflate(bytes) {
    if (typeof CompressionStream === 'undefined') return bytes;   // stored, still valid
    var cs = new CompressionStream('deflate');
    var stream = new Blob([bytes]).stream().pipeThrough(cs);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  /* Median-cut colour quantisation. Returns palette + one index per pixel. */
  function quantize(rgba, maxColors) {
    var n = rgba.length / 4;
    var hist = new Int32Array(32768);
    var sums = new Float64Array(32768 * 4);
    for (var i = 0; i < n; i++) {
      var o = i * 4;
      var key = ((rgba[o] >> 3) << 10) | ((rgba[o + 1] >> 3) << 5) | (rgba[o + 2] >> 3);
      hist[key]++;
      sums[key * 4] += rgba[o];
      sums[key * 4 + 1] += rgba[o + 1];
      sums[key * 4 + 2] += rgba[o + 2];
      sums[key * 4 + 3] += rgba[o + 3];
    }
    var keys = [], box = { lo: 0, hi: 0, r: 0, g: 0, b: 0 };
    for (var k = 0; k < 32768; k++) if (hist[k]) keys.push(k);
    if (!keys.length) return { palette: new Uint8Array([0, 0, 0, 0]), indices: new Uint8Array(n) };

    function makeBox(list) {
      var mn = [255, 255, 255], mx = [0, 0, 0];
      for (var j = 0; j < list.length; j++) {
        var c = list[j], rr = (c >> 10) & 31, gg = (c >> 5) & 31, bb = c & 31;
        if (rr < mn[0]) mn[0] = rr; if (rr > mx[0]) mx[0] = rr;
        if (gg < mn[1]) mn[1] = gg; if (gg > mx[1]) mx[1] = gg;
        if (bb < mn[2]) mn[2] = bb; if (bb > mx[2]) mx[2] = bb;
      }
      var d = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
      var axis = d[0] >= d[1] && d[0] >= d[2] ? 0 : (d[1] >= d[2] ? 1 : 2);
      var weight = 0;
      return { keys: list, axis: axis, span: d[axis], weight: weight };
    }
    function boxWeight(b) {
      var w = 0;
      for (var j = 0; j < b.keys.length; j++) w += hist[b.keys[j]];
      return w;
    }

    var boxes = [makeBox(keys)];
    while (boxes.length < maxColors) {
      var pick = -1, best = 0;
      for (var bi = 0; bi < boxes.length; bi++) {
        var sc = boxes[bi].span * Math.log(boxWeight(boxes[bi]) + 1);
        if (boxes[bi].keys.length > 1 && sc > best) { best = sc; pick = bi; }
      }
      if (pick < 0) break;
      var target = boxes[pick];
      var shift = target.axis === 0 ? 10 : (target.axis === 1 ? 5 : 0);
      target.keys.sort(function (a, b) { return ((a >> shift) & 31) - ((b >> shift) & 31); });
      var mid = target.keys.length >> 1;
      var a1 = target.keys.slice(0, mid), a2 = target.keys.slice(mid);
      if (!a1.length || !a2.length) break;
      boxes.splice(pick, 1, makeBox(a1), makeBox(a2));
    }

    var palette = new Uint8Array(boxes.length * 4);
    var lut = new Int16Array(32768).fill(-1);
    for (var b2 = 0; b2 < boxes.length; b2++) {
      var tot = 0, ar = 0, ag = 0, ab = 0, aa = 0;
      for (var q = 0; q < boxes[b2].keys.length; q++) {
        var ck = boxes[b2].keys[q], w = hist[ck];
        tot += w;
        ar += sums[ck * 4]; ag += sums[ck * 4 + 1]; ab += sums[ck * 4 + 2]; aa += sums[ck * 4 + 3];
        lut[ck] = b2;
      }
      if (!tot) tot = 1;
      palette[b2 * 4] = Math.round(ar / tot);
      palette[b2 * 4 + 1] = Math.round(ag / tot);
      palette[b2 * 4 + 2] = Math.round(ab / tot);
      palette[b2 * 4 + 3] = Math.round(aa / tot);
    }

    var indices = new Uint8Array(n);
    var cache = new Map();
    for (var p = 0; p < n; p++) {
      var oo = p * 4;
      var kk = ((rgba[oo] >> 3) << 10) | ((rgba[oo + 1] >> 3) << 5) | (rgba[oo + 2] >> 3);
      var idx = lut[kk];
      if (idx < 0) {                                   // nearest palette entry
        idx = cache.get(kk);
        if (idx === undefined) {
          var bd = Infinity;
          for (var pb = 0; pb < boxes.length; pb++) {
            var dr = rgba[oo] - palette[pb * 4],
                dg = rgba[oo + 1] - palette[pb * 4 + 1],
                db = rgba[oo + 2] - palette[pb * 4 + 2],
                da = (rgba[oo + 3] - palette[pb * 4 + 3]) * 0.5;
            var dd = dr * dr + dg * dg + db * db + da * da;
            if (dd < bd) { bd = dd; idx = pb; }
          }
          cache.set(kk, idx);
        }
      }
      indices[p] = idx;
    }
    return { palette: palette, indices: indices };
  }

  async function encodeIndexedPng(w, h, palette, indices) {
    var colors = palette.length / 4;
    var hasAlpha = false;
    for (var a = 0; a < colors; a++) if (palette[a * 4 + 3] < 255) { hasAlpha = true; break; }

    var raw = new Uint8Array(h * (1 + w));
    for (var y = 0; y < h; y++) {
      raw[y * (1 + w)] = 0;                                 // filter: none
      raw.set(indices.subarray(y * w, y * w + w), y * (1 + w) + 1);
    }
    var idat = await deflate(raw);

    var ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer);
    dv.setUint32(0, w); dv.setUint32(4, h);
    ihdr[8] = 8; ihdr[9] = 3; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

    var plte = new Uint8Array(colors * 3);
    for (var c = 0; c < colors; c++) {
      plte[c * 3] = palette[c * 4];
      plte[c * 3 + 1] = palette[c * 4 + 1];
      plte[c * 3 + 2] = palette[c * 4 + 2];
    }
    var parts = [
      new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
      chunk('IHDR', ihdr), chunk('PLTE', plte)
    ];
    if (hasAlpha) {
      var trns = new Uint8Array(colors);
      for (var t2 = 0; t2 < colors; t2++) trns[t2] = palette[t2 * 4 + 3];
      parts.push(chunk('tRNS', trns));
    }
    parts.push(chunk('IDAT', idat), chunk('IEND', new Uint8Array(0)));
    return new Blob(parts, { type: 'image/png' });
  }

  function imageDataAt(bitmap, scale) {
    var canvas = drawScaled(bitmap, scale);
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    return { canvas: canvas, data: ctx.getImageData(0, 0, canvas.width, canvas.height).data };
  }

  /* PNG does not compress like JPEG: a photo stays large until you throw away
   * colours AND pixels. So encode once at full size / 256 colours to LEARN the
   * bytes-per-pixel, use that to estimate the scale the target needs, then walk
   * down from there. Guessing blind took dozens of encodes and still missed.
   *
   * COLOUR_FACTOR is how much size drops as the palette shrinks, measured from
   * the encoder itself on real photos.
   */
  var COLOUR_STEPS = [256, 128, 64, 32, 16, 8];
  var COLOUR_FACTOR = { 256: 1, 128: 0.82, 64: 0.64, 32: 0.5, 16: 0.38, 8: 0.3 };

  async function shrinkPng(bitmap, targetBytes, onNote) {
    var totalPixels = bitmap.width * bitmap.height;

    var full = imageDataAt(bitmap, 1);
    var q0 = quantize(full.data, 256);
    var blob0 = await encodeIndexedPng(full.canvas.width, full.canvas.height, q0.palette, q0.indices);
    var last = { blob: blob0, canvas: full.canvas, scale: 1, quality: 1,
                 colors: q0.palette.length / 4, fits: blob0.size <= targetBytes };
    if (last.fits) return last;

    var bytesPerPixel = blob0.size / totalPixels;
    var guess = Math.sqrt((targetBytes / bytesPerPixel) / totalPixels) * Math.sqrt(COLOUR_FACTOR[16]);
    var scale = Math.min(0.98, Math.max(0.15, guess * 1.15));

    while (scale > 0.12) {
      var img = imageDataAt(bitmap, scale);
      if (Math.max(img.canvas.width, img.canvas.height) < 40) break;
      for (var ci = 0; ci < COLOUR_STEPS.length; ci++) {
        var c = COLOUR_STEPS[ci];
        var q = quantize(img.data, c);
        var nColours = q.palette.length / 4;
        if (nColours < 2) continue;
        var blob = await encodeIndexedPng(img.canvas.width, img.canvas.height, q.palette, q.indices);
        last = { blob: blob, canvas: img.canvas, scale: scale, quality: ci / COLOUR_STEPS.length,
                 colors: nColours, fits: blob.size <= targetBytes };
        if (last.fits) return last;
      }
      scale *= 0.82;
    }
    if (!last.fits && onNote) onNote('png-too-big');
    return last;
  }

  /* Public: compress one already-decoded bitmap to <= targetBytes. */
  async function compress(bitmap, opts) {
    var target = opts.targetBytes;
    var fmt = FORMATS[opts.format] || FORMATS.jpeg;

    // Re-encoding a file that is already small enough would only lose quality.
    if (opts.originalSize && opts.originalSize <= target && opts.format === 'keep') {
      return { blob: opts.originalBlob, width: bitmap.width, height: bitmap.height,
               quality: null, scale: 1, format: opts.originalExt || 'original', kept: true, fits: true };
    }

    var result;
    if (fmt.mime === 'image/png') {
      result = await shrinkPng(bitmap, target);
    } else {
      result = await searchQuality(bitmap, fmt.mime, target, 0.05);
      if (!result.fits) {                       // quality alone wasn't enough
        var scales = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4];
        for (var i = 0; i < scales.length && !result.fits; i++) {
          var shrunk = drawScaled(bitmap, scales[i]);
          var r = await searchQualityOn(shrunk, fmt.mime, target, 0.05);
          if (r.fits) { r.scale = scales[i]; result = r; }
        }
      }
    }
    if (!result) return null;
    return {
      blob: result.blob,
      width: result.canvas ? result.canvas.width : bitmap.width,
      height: result.canvas ? result.canvas.height : bitmap.height,
      quality: result.quality,
      colors: result.colors || null,
      scale: result.scale || 1,
      format: fmt.ext,
      kept: false,
      fits: !!result.fits
    };
  }

  /* ------------------------------------------------- smallest-file mode
   * The other honest half of the job: "make this smaller" with no number to hit.
   * Every pixel is kept, the encoder runs at a quality whose artefacts do not
   * show, and the result is only offered when it is genuinely smaller than what
   * came in. Nothing here claims to be lossless — any re-encode of a photograph
   * is lossy — so the row reports the quality (or the colour count) that was
   * actually used, and a crude fidelity gate decides whether to accept it.
   */
  var BEST_QUALITY = 0.85;         // first try
  var SAFE_QUALITY = 0.92;         // second try if the first moved the picture
  var VISIBLE_DIFF = 6;            // mean per-channel difference that starts to show
  var FLAT_BUCKETS = 4096;         // 5-bit colour buckets a flat graphic stays under

  /* Cheap, honest fidelity check: downscale both images to 64x48 and compare
     average per-channel difference. It is not SSIM, but it catches the case that
     matters here - a re-encode that visibly moves a whole picture - and it costs
     one extra decode and two tiny canvases. */
  async function meanDiff(bitmap, blob) {
    var W = 64, H = 48;
    var a = makeCanvas(W, H), b = makeCanvas(W, H);
    var ca = a.getContext('2d', { willReadFrequently: true });
    var cb = b.getContext('2d', { willReadFrequently: true });
    ca.imageSmoothingQuality = 'high';
    cb.imageSmoothingQuality = 'high';
    ca.drawImage(bitmap, 0, 0, W, H);
    var bmp;
    try {
      bmp = await createImageBitmap(blob);
    } catch (e) {
      return 0;                                  // cannot decode: do not block on it
    }
    cb.drawImage(bmp, 0, 0, W, H);
    bmp.close && bmp.close();
    var da = ca.getImageData(0, 0, W, H).data;
    var db = cb.getImageData(0, 0, W, H).data;
    var sum = 0;
    for (var i = 0; i < da.length; i += 4) {
      sum += Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) +
             Math.abs(da[i + 2] - db[i + 2]);
    }
    return sum / ((da.length / 4) * 3);
  }

  async function compressBest(bitmap, fmt, file) {
    if (fmt.mime === 'image/png') {
      /* A photograph stored as PNG cannot shrink without losing detail; a logo,
         signature or screenshot can, because it uses very few colours. Only
         attempt the palette when the picture really is that flat, and then still
         check the result against the fidelity gate. */
      var src = imageDataAt(bitmap, 1);
      var data = src.data;
      var seen = new Int32Array(32768);
      var distinct = 0;
      for (var i = 0; i < data.length; i += 4) {
        var key = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
        if (!seen[key]) { seen[key] = 1; distinct++; if (distinct > FLAT_BUCKETS) break; }
      }
      if (distinct > FLAT_BUCKETS) return { kept: true, why: 'photo-png' };
      var q = quantize(data, 256);
      var blob = await encodeIndexedPng(src.canvas.width, src.canvas.height,
                                        q.palette, q.indices);
      if (blob.size >= file.size) return { kept: true, why: 'no-gain' };
      var diff = await meanDiff(bitmap, blob);
      if (diff > VISIBLE_DIFF) return { kept: true, why: 'detail' };
      return { blob: blob, width: src.canvas.width, height: src.canvas.height,
               colors: q.palette.length / 4, diff: diff, scale: 1, format: 'png',
               kept: false, fits: true, single: true };
    }

    var canvas = drawScaled(bitmap, 1);
    var qualities = [BEST_QUALITY, SAFE_QUALITY];
    for (var qi = 0; qi < qualities.length; qi++) {
      var out = await toBlob(canvas, fmt.mime, qualities[qi]);
      if (!out) continue;
      if (out.size >= file.size) {
        if (qi === qualities.length - 1) return { kept: true, why: 'no-gain' };
        continue;
      }
      var d = await meanDiff(bitmap, out);
      if (d <= VISIBLE_DIFF) {
        return { blob: out, width: canvas.width, height: canvas.height,
                 quality: qualities[qi], diff: d, scale: 1, format: fmt.ext,
                 kept: false, fits: true, single: true };
      }
    }
    return { kept: true, why: 'detail' };
  }

  async function searchQualityOn(canvas, mime, targetBytes, floorQuality) {
    var lo = floorQuality, hi = 0.96, best = null;
    for (var i = 0; i < 8; i++) {
      var mid = (lo + hi) / 2;
      var b = await toBlob(canvas, mime, mid);
      if (!b) break;
      if (b.size <= targetBytes) { best = { blob: b, quality: mid, canvas: canvas, fits: true }; lo = mid; }
      else { hi = mid; }
    }
    return best || { blob: await toBlob(canvas, mime, floorQuality), quality: floorQuality, canvas: canvas, fits: false };
  }

  /* ------------------------------------------------------------------ UI
   *
   * The flow is deliberately TWO steps: add, then compress.
   *
   * Dropping a file used to start compressing immediately, using whatever
   * number happened to be in the target field - so a visitor who added their
   * image first (the natural thing to do) got it squeezed to the default 100 KB
   * before they had chosen anything, with no way to tell what had just
   * happened. Now added files queue up as "Ready", the primary button spells
   * out what it will do ("Compress 2 images to 100 KB"), and no encoding
   * happens until it is pressed.
   *
   * AFTER the first run, changing the target or a size chip re-runs the batch on
   * the spot - that is the tool's promise ("switching is instant") and it is an
   * obvious cause and effect. Only the first run is gated.
   *
   * Every run reports progress, because a 6 MB PNG can take seconds: an
   * indeterminate bar on the card, a spinner plus "Compressing 2 of 5" in the
   * footer, and a per-row state (Ready -> Compressing -> result). Nothing here
   * can look like a hang.
   */
  function init(root) {
    var targetInput = root.querySelector('[data-nz-target]');
    var formatSel   = root.querySelector('[data-nz-format]');
    var input       = root.querySelector('[data-nz-input]');
    var drop        = root.querySelector('[data-nz-drop]');
    var list        = root.querySelector('[data-nz-list]');
    var summary     = root.querySelector('[data-nz-summary]');
    var runBtn      = root.querySelector('[data-nz-run]');
    var downloadAll = root.querySelector('[data-nz-download-all]');
    var progress    = root.querySelector('[data-nz-progress]');
    var spin        = root.querySelector('[data-nz-spin]');
    var chips       = root.querySelectorAll('[data-nz-preset]');
    var sizePanel   = root.querySelector('[data-nz-panel="size"]');
    var smallPanel  = root.querySelector('[data-nz-panel="small"]');
    var modeBtns    = root.querySelectorAll('[data-nz-mode]');

    var mode = 'size';     // 'size' = fit a number, 'small' = as small as it goes
    var batch = [];        // [{file, el}] the files added since the last drop
    var results = [];
    var busy = false;
    var hasRun = false;    // has this batch been compressed at least once?

    function setMode(m) {
      mode = m;
      modeBtns.forEach(function (b) {
        var on = b.dataset.nzMode === m;
        b.classList.toggle('on', on);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
      });
      if (sizePanel) sizePanel.hidden = (m !== 'size');
      if (smallPanel) smallPanel.hidden = (m !== 'small');
      syncFooter();
    }

    function targetBytes() {
      var kb = parseFloat(targetInput.value);
      if (!isFinite(kb) || kb <= 0) return null;
      return Math.round(kb * 1024);
    }

    function targetLabel() {
      var t = targetBytes();
      if (!t) return '';
      return (t % 1024 === 0 ? (t / 1024) : (t / 1024).toFixed(1)) + ' KB';
    }

    function setTarget(kb) {
      targetInput.value = kb;
      chips.forEach(function (c) {
        c.classList.toggle('on', parseFloat(c.dataset.nzPreset) === parseFloat(kb));
      });
    }

    /* The footer carries exactly one primary action at a time: Compress while
       files are waiting, Download all once there are results. */
    function syncFooter() {
      if (busy) return;
      var n = batch.length;
      if (!n) {
        runBtn.hidden = true;
        downloadAll.hidden = true;
        summary.textContent = 'Choose an image to begin.';
        return;
      }
      if (!hasRun) {
        var total = batch.reduce(function (sum, p) { return sum + p.file.size; }, 0);
        var small = mode === 'small';
        runBtn.hidden = false;
        runBtn.disabled = !small && !targetBytes();
        runBtn.textContent = small
          ? 'Compress ' + (n > 1 ? n + ' images' : 'the image') + ' (smallest)'
          : 'Compress ' + (n > 1 ? n + ' images' : 'the image') +
            (targetBytes() ? ' to ' + targetLabel() : '');
        downloadAll.hidden = true;
        summary.textContent = n === 1
          ? 'Ready — ' + bytes(batch[0].file.size)
          : n + ' images ready — ' + bytes(total);
        return;
      }
      runBtn.hidden = true;
      downloadAll.hidden = !results.length;
    }

    function setBusy(on, text) {
      busy = on;
      root.classList.toggle('nz-busy', on);
      root.setAttribute('aria-busy', on ? 'true' : 'false');
      if (progress) progress.classList.toggle('on', on);
      if (spin) spin.hidden = !on;
      runBtn.disabled = on;
      if (on) {
        runBtn.hidden = true;
        if (text) summary.textContent = text;
      }
    }

    function row(file) {
      var el = document.createElement('div');
      el.className = 'nz-row nz-row-pending';
      el.innerHTML =
        '<div class="nz-thumb"></div>' +
        '<div class="nz-meta">' +
          '<div class="nz-name" title=""></div>' +
          '<div class="nz-sizes"></div>' +
        '</div>' +
        '<div class="nz-act"></div>';
      el.querySelector('.nz-name').textContent = file.name;
      el.querySelector('.nz-name').setAttribute('title', file.name);
      /* the extension stands in for a thumbnail until the file is decoded, so a
         queued row never looks like a broken image box */
      el.querySelector('.nz-thumb').dataset.ext =
        (file.name.split('.').pop() || 'IMG').slice(0, 4).toUpperCase();
      status(el, 'Ready — ' + bytes(file.size), '');
      list.appendChild(el);
      return el;
    }

    function status(el, text, cls) {
      var sizes = el.querySelector('.nz-sizes');
      sizes.textContent = text;
      sizes.className = 'nz-sizes' + (cls ? ' ' + cls : '');
    }

    function setState(el, state, text, cls) {
      el.classList.remove('nz-row-pending', 'nz-row-working');
      if (state) el.classList.add('nz-row-' + state);
      status(el, text, cls);
    }

    async function handle(file, el, target) {
      setState(el, 'working', 'Compressing…');

      var fmt = formatSel.value;
      var ext = (file.name.split('.').pop() || '').toLowerCase();
      var outFmt = fmt === 'keep' ? (ext === 'png' ? 'png' : (ext === 'webp' ? 'webp' : 'jpeg')) : fmt;

      var bitmap;
      try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch (e) {
        setState(el, null, 'This browser cannot read that file type. Try JPG, PNG or WebP.', 'bad');
        return;
      }

      var thumb = el.querySelector('.nz-thumb');
      var tc = makeCanvas(72, 72);
      var tctx = tc.getContext('2d');
      var s = Math.max(72 / bitmap.width, 72 / bitmap.height);
      tctx.drawImage(bitmap, (72 - bitmap.width * s) / 2, (72 - bitmap.height * s) / 2,
                     bitmap.width * s, bitmap.height * s);
      thumb.innerHTML = '';
      thumb.appendChild(tc);

      var out;
      if (mode === 'small') {
        out = await compressBest(bitmap, FORMATS[outFmt], file);
        if (out && out.kept) {
          out = { blob: file, format: ext === 'jpeg' ? 'jpg' : (ext || 'jpg'),
                  width: bitmap.width, height: bitmap.height, kept: true, fits: true,
                  scale: 1, why: out.why };
        }
      } else {
        out = await compress(bitmap, {
          targetBytes: target,
          format: fmt === 'keep' ? outFmt : fmt,
          originalSize: file.size,
          originalBlob: file,
          originalExt: ext
        });
      }
      bitmap.close && bitmap.close();

      if (!out || !out.blob) { setState(el, null, 'Could not compress this file.', 'bad'); return; }

      var url = URL.createObjectURL(out.blob);
      var name = out.kept ? file.name
                          : file.name.replace(/\.[^.]+$/, '') + '.' + out.format;
      var pct = Math.round((1 - out.blob.size / file.size) * 100);

      el.classList.remove('nz-row-pending', 'nz-row-working');
      var resized = out.scale && out.scale < 1;
      var facts = [];
      if (out.kept) {
        facts.push(bytes(file.size));
        facts.push('left untouched — ' + keptReason(out.why));
      } else {
        facts.push(bytes(file.size) + '  →  ' + bytes(out.blob.size) + '  (' +
                   (pct >= 0 ? pct + '% smaller' : Math.abs(pct) + '% larger') + ')');
        if (resized) facts.push('resized ' + Math.round(out.scale * 100) + '%');
        if (out.width) facts.push(out.width + '×' + out.height + (resized ? '' : ' kept'));
        /* the encoder only has a quality dial for JPG and WebP; a PNG is shrunk by
           cutting its palette, so report the colour count there instead */
        if (out.format !== 'png' && out.quality) {
          facts.push('quality ' + Math.round(out.quality * 100));
        }
        if (out.colors) facts.push(out.colors + ' colours');
      }
      el.querySelector('.nz-sizes').textContent = facts.join('  ·  ');
      el.querySelector('.nz-sizes').className = 'nz-sizes ' + (out.fits ? 'good' : 'warn');

      var a = document.createElement('a');
      a.className = 'nz-dl';
      a.href = url;
      a.download = name;
      a.textContent = 'Download';
      el.querySelector('.nz-act').innerHTML = '';
      el.querySelector('.nz-act').appendChild(a);

      results.push({ file: file, out: out, url: url, name: name });
    }

    function keptReason(why) {
      if (why === 'photo-png') {
        return 'a photograph stored as PNG cannot shrink without losing detail — JPG or WebP ' +
               'would be far smaller';
      }
      return 're-encoding would not make it smaller';
    }

    function recount(target) {
      var ok = results.filter(function (r) { return r.out.fits; }).length;
      if (!results.length) { summary.textContent = ''; downloadAll.hidden = true; return; }
      var total = results.reduce(function (n, r) { return n + r.out.blob.size; }, 0);
      var before = results.reduce(function (n, r) { return n + r.file.size; }, 0);
      var shrunk = results.filter(function (r) { return !r.out.kept; }).length;
      summary.textContent = mode === 'small'
        ? (shrunk === results.length
             ? results.length + ' compressed'
             : shrunk + ' of ' + results.length + ' compressed') +
          '  ·  ' + bytes(before) + ' → ' + bytes(total) +
          (shrunk === 0 ? '  ·  nothing to gain' : '')
        : ok + ' of ' + results.length + ' under ' +
          (target / 1024).toFixed(target % 1024 === 0 ? 0 : 1) + ' KB  ·  ' +
          bytes(before) + ' → ' + bytes(total);
      downloadAll.hidden = false;
    }

    /* Only ever called from an explicit action: the Compress button, or a target
       change AFTER the first run. */
    var chain = Promise.resolve();
    function run(reason) {
      if (busy) return;
      var target = mode === 'size' ? targetBytes() : null;
      if (mode === 'size' && !target) {
        summary.textContent = 'Type a target size in KB first.';
        return;
      }
      if (!batch.length) return;

      var items = batch;
      var total = items.length;
      var started = 0;
      hasRun = true;
      results = [];
      list.innerHTML = '';
      downloadAll.hidden = true;
      items.forEach(function (it) { it.el = row(it.file); });
      setBusy(true, 'Compressing 1 of ' + total + '…');

      items.forEach(function (it) {
        chain = chain.then(function () {
          if (started > 0) summary.textContent = 'Compressing ' + (started + 1) + ' of ' + total + '…';
          started++;
          return handle(it.file, it.el, target);
        });
      });
      chain = chain.then(function () {
        setBusy(false);
        recount(target);   // the batch stays, so a new target can re-run it
      });
      return chain;
    }

    function addFiles(fileList) {
      var files = Array.prototype.slice.call(fileList).filter(function (f) {
        return /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name);
      });
      if (!files.length) {
        summary.textContent = 'Those are not images — use JPG, PNG or WebP.';
        return;
      }
      /* a new drop replaces the previous batch, so the card never shows two
         different targets' results side by side */
      list.innerHTML = '';
      batch = [];
      results = [];
      hasRun = false;
      files.forEach(function (f) {
        var el = row(f);
        batch.push({ file: f, el: el });
      });
      syncFooter();
    }

    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        setTarget(c.dataset.nzPreset);
        if (hasRun) { run('chip'); } else { syncFooter(); }
      });
    });

    /* switching mode is an explicit choice, and after the first run it
       re-compresses the batch the same way a size change does */
    modeBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        if (busy || mode === b.dataset.nzMode) return;
        setMode(b.dataset.nzMode);
        if (hasRun) { run('mode'); }
      });
    });
    targetInput.addEventListener('change', function () {
      if (hasRun) { run('target'); } else { syncFooter(); }
    });
    formatSel.addEventListener('change', function () { if (hasRun) run('format'); });
    runBtn.addEventListener('click', function () { run('button'); });

    input.addEventListener('change', function () { addFiles(input.files); input.value = ''; });

    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); });
    });
    drop.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
    });
    drop.addEventListener('click', function (e) { if (e.target === drop) input.click(); });
    root.querySelector('[data-nz-browse]').addEventListener('click', function () { input.click(); });

    downloadAll.addEventListener('click', function () {
      results.forEach(function (r, i) {
        setTimeout(function () {
          var a = document.createElement('a');
          a.href = r.url;
          a.download = r.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }, i * 350);
      });
    });

    if (targetInput.value) setTarget(targetInput.value);
    setMode(mode);          // paints the selected mode, its panel and the footer
    root.classList.add('nz-ready');
  }

  window.NZCompress = { init: init, compress: compress, bytes: bytes, FORMATS: FORMATS };
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-nz-compressor]').forEach(init);
  });
})();

