(function () {
  "use strict";

  // ---------------------------------------------------------------- config
  // Paste the Apps Script Web App URL between the quotes after deploying it.
  // Until then the form still works: the Copy button puts everything on the
  // clipboard so a tester can paste it into an email or chat.
  var ENDPOINT = "https://script.google.com/macros/s/AKfycbwfK__bS21HMgTA5BWgDeptk6qUcGAVdCo2DLWmapReNGpx6bJWHZXL_7VnnAy6jUuHng/exec";
  var APP_VERSION = "";                       // filled from ?v=1.0.24 in the link

  var qs = new URLSearchParams(location.search);
  APP_VERSION = qs.get("v") || "";
  var PREFILL_WHO = qs.get("who") || "";

  // ---------------------------------------------------------------- features
  // id, label, one-line explanation of what the tester should look for
  var FEATURES = [
    ["count",    "Tapping to count",        "Tap the big bead — the number goes up and it feels right."],
    ["target",   "Target & cycles",         "Setting a target number, and what happens when you reach it."],
    ["feedback", "Tap sound & vibration",   "The click sound and the vibration when you tap."],
    ["reliable", "Never losing your count", "Closing the app, locking the phone, coming back later — was your count still there?"],
    ["today",    "Today's count",           "The running total for today shown on the counter screen."],
    ["history",  "History & stats",         "Looking back at previous days and your totals."],
    ["calendar", "Calendar",                "The calendar view of your dhikr days."],
    ["library",  "Dhikr library",           "Browsing the dhikr list and reading a dhikr's details."],
    ["routines", "Guided routines",         "Following a guided routine step by step."],
    ["remind",   "Reminders",               "Setting a reminder, and whether it actually arrived on time."],
    ["themes",   "Themes",                  "Changing the app's colours."],
    ["share",    "Share card",              "Making a card to share your dhikr."],
    ["export",   "Export & backup",         "Saving your data so nothing is lost if you change phone."],
    ["premium",  "Premium unlock",          "The upgrade screen itself — how clear it was, not whether you paid."],
    ["nav",      "Settings & navigation",   "Getting around the app: the menu, the top bar, finding things."]
  ];

  var TESTED = [["yes", "Yes", ""], ["no", "Didn't try", ""], ["none", "No access", ""]];
  var HOW    = [["perfect", "Worked perfectly", ""], ["minor", "Small annoyance", "neg"],
                ["bug", "Bug / error", "bad"], ["broken", "Didn't work", "bad"]];

  // no marker: a tick reads as "already passed", and any bullet forced an uneven
  // left edge inside the cards
  var ICON = '';

  var answers = { features: {}, overall: {}, price: "", worst: "", first: "", more: "",
                  who: "", phone: "", shots: [] };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text != null) { e.textContent = text; }
    return e;
  }

  // ---------------------------------------------------------------- build features
  var fwrap = document.getElementById("features");
  FEATURES.forEach(function (f) {
    var id = f[0];
    var card = el("div", "card");
    card.setAttribute("data-fid", id);

    var name = el("div", "name");
    name.innerHTML = ICON + "<span>" + f[1] + "</span>";
    card.appendChild(name);
    card.appendChild(el("div", "desc", f[2]));

    card.appendChild(el("div", "q", "Did you test this?"));
    var tested = el("div", "chips");
    tested.setAttribute("data-group", id + ":tested");
    TESTED.forEach(function (t) {
      var b = el("button", "chip" + (t[2] ? " " + t[2] : ""));
      b.type = "button";
      b.setAttribute("aria-pressed", "false");
      b.setAttribute("data-v", t[0]);
      b.textContent = t[1];
      tested.appendChild(b);
    });
    card.appendChild(tested);

    var follow = el("div", "follow");
    follow.hidden = true;
    follow.appendChild(el("div", "q", "How was it?"));
    var how = el("div", "chips");
    how.setAttribute("data-group", id + ":how");
    HOW.forEach(function (h) {
      var b = el("button", "chip" + (h[2] ? " " + h[2] : ""));
      b.type = "button";
      b.setAttribute("aria-pressed", "false");
      b.setAttribute("data-v", h[0]);
      b.textContent = h[1];
      how.appendChild(b);
    });
    follow.appendChild(how);

    follow.appendChild(el("div", "q", "Anything to add? (optional)"));
    var note = el("input", "");
    note.type = "text";
    note.setAttribute("data-note", id);
    note.placeholder = "What exactly happened";
    follow.appendChild(note);
    card.appendChild(follow);
    fwrap.appendChild(card);
  });

  // ---------------------------------------------------------------- overall block
  var RATINGS = [
    ["design",     "Design and how it looks"],
    ["ease",       "How easy it is to use"],
    ["reliability","Reliability (no crashes, no lost counts)"],
    ["speed",      "Speed and battery"]
  ];
  var SCALE = [["1", "Poor"], ["2", "OK"], ["3", "Good"], ["4", "Great"], ["5", "Excellent"]];
  var owrap = document.getElementById("overall");
  RATINGS.forEach(function (r) {
    var box = el("div", "");
    box.style.marginBottom = "16px";
    box.appendChild(el("div", "name", r[1]));
    var row = el("div", "chips rate");
    row.style.marginTop = "8px";
    row.setAttribute("data-group", "overall:" + r[0]);
    SCALE.forEach(function (s) {
      var b = el("button", "chip");
      b.type = "button";
      b.setAttribute("aria-pressed", "false");
      b.setAttribute("data-v", s[0]);
      b.textContent = s[1];
      row.appendChild(b);
    });
    box.appendChild(row);
    owrap.appendChild(box);
  });

  // ---------------------------------------------------------------- chip behaviour
  function groupOf(btn) {
    var g = btn.parentElement;
    return { key: g.getAttribute("data-group"), single: g.getAttribute("data-single") };
  }
  function setGroup(groupEl, value) {
    var key = groupEl.getAttribute("data-group") || groupEl.getAttribute("data-single");
    var kind = groupEl.getAttribute("data-group") ? "answered" : "price";
    Array.prototype.forEach.call(groupEl.children, function (c) {
      c.setAttribute("aria-pressed", c.getAttribute("data-v") === value ? "true" : "false");
    });
    if (kind === "answered") {
      var parts = key.split(":");
      if (parts[0] === "overall") { answers.overall[parts[1]] = value; }
      else { answers.features[parts[0]] = answers.features[parts[0]] || {};
             answers.features[parts[0]][parts[1]] = value; }
      if (parts[0] !== "overall" && parts[1] === "tested") {
        var card = groupEl.closest(".card");
        var follow = card.querySelector(".follow");
        follow.hidden = (value !== "yes");
        if (value !== "yes") {
          var how = follow.querySelector('[data-group$=":how"]');
          Array.prototype.forEach.call(how.children, function (c) { c.setAttribute("aria-pressed", "false"); });
          var f = answers.features[parts[0]];
          delete f.how;
          card.querySelector('[data-note]').value = "";
          answers.features[parts[0]].note = "";
        }
      }
    } else { answers.price = value; }
    save(); progress();
  }

  document.addEventListener("click", function (ev) {
    var btn = ev.target.closest(".chip");
    if (!btn) { return; }
    var g = btn.parentElement;
    if (g.hasAttribute("data-single")) { setGroup(g, btn.getAttribute("data-v")); return; }
    setGroup(g, btn.getAttribute("data-v"));
  });

  // ---------------------------------------------------------------- text + notes
  ["worst", "first", "more", "who", "phone"].forEach(function (id) {
    var node = document.getElementById(id);
    node.addEventListener("input", function () { answers[id] = node.value; save(); progress(); });
  });
  fwrap.addEventListener("input", function (ev) {
    var n = ev.target.getAttribute && ev.target.getAttribute("data-note");
    if (!n) { return; }
    answers.features[n] = answers.features[n] || {};
    answers.features[n].note = ev.target.value;
    save();
  });

  // ---------------------------------------------------------------- progress
  function total() { return FEATURES.length + RATINGS.length; }
  function done() {
    var c = 0;
    FEATURES.forEach(function (f) { if (answers.features[f[0]] && answers.features[f[0]].tested) { c++; } });
    Object.keys(answers.overall).forEach(function (k) { if (answers.overall[k]) { c++; } });
    return c;
  }
  function progress() {
    var d = done(), t = total();
    document.getElementById("pbar").style.width = Math.round(d / t * 100) + "%";
    document.getElementById("plabel").textContent = d + " of " + t + " answered";
  }

  // ---------------------------------------------------------------- persistence
  var KEY = "tasbeeh33-feedback-v1";
  function save() {
    try {
      var copy = JSON.parse(JSON.stringify(answers));
      copy.shots = answers.shots.map(function (s) { return { name: s.name }; });
      localStorage.setItem(KEY, JSON.stringify({ a: copy, ts: Date.now() }));
    } catch (e) {}
  }
  function restore() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) { return; }
      var saved = JSON.parse(raw).a;
      answers.worst = saved.worst || ""; answers.first = saved.first || "";
      answers.more = saved.more || ""; answers.who = saved.who || "";
      answers.phone = saved.phone || ""; answers.price = saved.price || "";
      document.getElementById("worst").value = answers.worst;
      document.getElementById("first").value = answers.first;
      document.getElementById("more").value = answers.more;
      document.getElementById("who").value = answers.who;
      document.getElementById("phone").value = answers.phone;
      answers.features = saved.features || {};
      answers.overall = saved.overall || {};
      Object.keys(answers.overall).forEach(function (k) { paint("overall:" + k, answers.overall[k]); });
      Object.keys(answers.features).forEach(function (k) {
        var f = answers.features[k];
        if (f.tested) { paint(k + ":tested", f.tested); showFollow(k, f.tested === "yes"); }
        if (f.how) { paint(k + ":how", f.how); }
        if (f.note) {
          var card = fwrap.querySelector('[data-fid="' + k + '"]');
          if (card) { card.querySelector("[data-note]").value = f.note; }
        }
      });
      if (answers.price) { paint("price", answers.price, true); }
    } catch (e) {}
  }
  function paint(key, value, single) {
    var sel = single ? '[data-single="' + key + '"]' : '[data-group="' + key + '"]';
    var g = document.querySelector(sel);
    if (!g) { return; }
    Array.prototype.forEach.call(g.children, function (c) {
      c.setAttribute("aria-pressed", c.getAttribute("data-v") === value ? "true" : "false");
    });
  }
  function showFollow(id, on) {
    var card = fwrap.querySelector('[data-fid="' + id + '"]');
    if (card) { card.querySelector(".follow").hidden = !on; }
  }

  // ---------------------------------------------------------------- screenshots
  var MAX_SHOTS = 5, MAX_EDGE = 1600, Q = 0.82;
  var shotsInput = document.getElementById("shots");
  shotsInput.addEventListener("change", function () {
    var files = Array.prototype.slice.call(shotsInput.files || []);
    var room = MAX_SHOTS - answers.shots.length;
    var st = document.getElementById("filestatus");
    if (room <= 0) { st.textContent = "Maximum " + MAX_SHOTS + " images."; st.className = "status"; return; }
    st.textContent = "Preparing " + Math.min(room, files.length) + " image(s)…"; st.className = "status";
    files.slice(0, room).forEach(function (file) {
      shrink(file).then(function (out) {
        answers.shots.push(out);
        addThumb(out);
        st.textContent = out.kb + " KB after shrinking (was " + Math.round(file.size / 1024) + " KB).";
        st.className = "status ok";
        save();
      }).catch(function () {
        st.textContent = "Couldn't read that image — try another one.";
        st.className = "status err";
      });
    });
    shotsInput.value = "";
  });

  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, MAX_EDGE / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
        var c = document.createElement("canvas");
        c.width = cw; c.height = ch;
        c.getContext("2d").drawImage(img, 0, 0, cw, ch);
        var data = c.toDataURL("image/jpeg", Q);
        URL.revokeObjectURL(url);
        resolve({ name: file.name.replace(/\.[^.]+$/, "") + ".jpg", data: data,
                  kb: Math.round(data.length * 0.75 / 1024), w: cw, h: ch });
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("decode")); };
      img.src = url;
    });
  }

  function addThumb(shot) {
    var box = el("div", "thumb");
    var im = el("img"); im.src = shot.data; im.alt = shot.name;
    var del = el("button", null, "×");
    del.type = "button";
    del.setAttribute("aria-label", "Remove " + shot.name);
    del.addEventListener("click", function () {
      answers.shots = answers.shots.filter(function (s) { return s !== shot; });
      box.remove(); save();
    });
    box.appendChild(im); box.appendChild(del);
    document.getElementById("thumbs").appendChild(box);
  }

  // ---------------------------------------------------------------- device info
  // Chrome no longer puts the real phone model in the user agent - it substitutes "K",
  // and it freezes the Android version at "10". The client hints API still carries the
  // truth, so ask for it on load; by the time anyone finishes the form it has arrived.
  var DEVICE_HINTS = null;
  (function () {
    try {
      if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
        navigator.userAgentData.getHighEntropyValues(["model", "platformVersion", "platform"])
          .then(function (h) { DEVICE_HINTS = h; refreshPhoneHint(); })
          .catch(function () {});
      }
    } catch (e) {}
  })();

  function device() {
    var ua = navigator.userAgent || "";
    var model = "";
    if (ua.indexOf("iPad") >= 0) { model = "iPad"; }
    else if (ua.indexOf("iPhone") >= 0) { model = "iPhone"; }
    else {
      var m = ua.match(/Android[^;]*;\s*([^)]+?)(?:\s+Build|\))/i);
      if (m) { model = m[1].trim(); }
    }
    var av = (ua.match(/Android\s+([\d.]+)/i) || [])[1] || "";
    if (DEVICE_HINTS) {
      if (DEVICE_HINTS.model) { model = DEVICE_HINTS.model; }
      // platformVersion is the OS version, so it only belongs in the Android column
      // when the OS is actually Android - on Windows it would read "19"
      var isAndroid = String(DEVICE_HINTS.platform || "") === "Android" || /Android/i.test(ua);
      if (isAndroid && DEVICE_HINTS.platformVersion) {
        av = String(DEVICE_HINTS.platformVersion).split(".")[0];
      }
    }
    // a bare "K" is the placeholder Chrome sends when the hints are unavailable
    if (!model || /^k$/i.test(model)) { model = ""; }
    var dpr = window.devicePixelRatio || 1;
    return { model: model, android: av, ua: ua,
             screen: (window.screen
               ? Math.round(screen.width * dpr) + "x" + Math.round(screen.height * dpr)
               : ""),
             dpr: dpr };
  }

  // show the tester what was detected, so a wrong model is visible before they send
  function refreshPhoneHint() {
    var el = document.getElementById("phone");
    if (!el || el.value) { return; }
    var d = device();
    el.placeholder = d.model ? ("Detected: " + d.model) : "Not detected - type it if you know it";
  }
  setTimeout(refreshPhoneHint, 2000);

  // ---------------------------------------------------------------- payload
  function payload() {
    var d = device();
    if (answers.phone) { d.model = answers.phone; }
    return {
      kind: "tasbeeh33-tester-feedback",
      appVersion: APP_VERSION,
      sentAt: new Date().toISOString(),
      device: d,
      who: answers.who,
      features: answers.features,
      overall: answers.overall,
      priceBandUsd: answers.price,
      worstBug: answers.worst,
      fixFirst: answers.first,
      anythingElse: answers.more,
      screenshots: answers.shots.map(function (s) { return { name: s.name, data: s.data }; })
    };
  }

  function asText() {
    var p = payload(), L = [];
    L.push("Tasbeeh 33 — tester feedback");
    L.push("Version: " + (p.appVersion || "unknown") + "   Device: " + p.device.model +
           " (Android " + p.device.android + ")");
    L.push("From: " + (p.who || "(not given)") + "   At: " + p.sentAt);
    L.push("");
    L.push("FEATURES");
    FEATURES.forEach(function (f) {
      var a = p.features[f[0]] || {};
      L.push("- " + f[1] + ": " + (a.tested || "not answered") + (a.how ? " / " + a.how : "") +
             (a.note ? " — " + a.note : ""));
    });
    L.push("");
    L.push("OVERALL");
    RATINGS.forEach(function (r) { L.push("- " + r[1] + ": " + (p.overall[r[0]] || "not answered")); });
    L.push("");
    L.push("PRICE BAND (USD): " + (p.priceBandUsd || "not answered"));
    L.push("BUG: " + (p.worstBug || "—"));
    L.push("FIX FIRST: " + (p.fixFirst || "—"));
    L.push("ELSE: " + (p.anythingElse || "—"));
    L.push("SCREENSHOTS: " + p.screenshots.length);
    return L.join("\n");
  }

  // ---------------------------------------------------------------- send
  var sendBtn = document.getElementById("send");
  var status = document.getElementById("status");
  function sayRaw(msg, cls) { status.textContent = msg; status.className = "status" + (cls ? " " + cls : ""); }
  function say(msg, cls) { sayRaw(msg, cls); syncBarSpace(); }

  function finish(extra) {
    document.getElementById("app").innerHTML =
      '<div class="done">' +
      '<svg class="mark" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" ' +
      'fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7.5 12.4 L10.8 15.7 L16.6 9.2" ' +
      'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" ' +
      'stroke-linejoin="round"/></svg>' +
      '<h1>Thank you</h1><p class="muted">' + extra + '</p>' +
      '<p class="muted">You can close this page. If you think of anything else, just open the link again — ' +
      'your answers were kept on this phone.</p></div>';
    document.querySelector(".submit").style.display = "none";
    window.scrollTo(0, 0);
  }
  function clearStored() { try { localStorage.removeItem(KEY); } catch (e) {} }

  sendBtn.addEventListener("click", function () {
    var d = done();
    if (d < 4 && !answers.worst) {
      say("Please answer at least a few features first — it takes a minute.", "err");
      return;
    }
    var p = payload();
    if (!ENDPOINT) {
      // Not connected yet: no modal, just put the answers on the clipboard.
      if (navigator.clipboard) { navigator.clipboard.writeText(asText()); }
      say("Copied. Send it to nazbyte.support@gmail.com — the form isn't connected yet.", "ok");
      return;
    }
    sendBtn.disabled = true;
    say("Sending…", "");
    fetch(ENDPOINT, { method: "POST", mode: "no-cors",
                      headers: { "Content-Type": "text/plain;charset=utf-8" },
                      body: JSON.stringify(p) })
      .then(function () { clearStored(); finish("Your feedback was sent to the developer."); })
      .catch(function () {
        sendBtn.disabled = false;
        say("Couldn't send. Press Copy and send the text instead.", "err");
      });
  });

  // Keep the fixed action bar from covering the last section: reserve exactly the
  // space it occupies, and re-measure when it changes (status text wrapping, resize).
  function syncBarSpace() {
    var sub = document.querySelector(".submit");
    if (!sub) { return; }
    var fixed = getComputedStyle(sub).position === "fixed";
    document.body.style.paddingBottom = fixed ? (sub.offsetHeight + 20) + "px" : "36px";
  }
  window.addEventListener("resize", syncBarSpace);
  window.addEventListener("orientationchange", syncBarSpace);
  if (document.readyState === "complete") { syncBarSpace(); } else { window.addEventListener("load", syncBarSpace); }
  syncBarSpace();

  document.getElementById("copy").addEventListener("click", function () {
    var t = asText();
    var done2 = function () { say("Copied. Paste it into an email or chat.", "ok"); };
    if (navigator.clipboard) { navigator.clipboard.writeText(t).then(done2, done2); }
    else {
      var ta = document.createElement("textarea");
      ta.value = t; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      ta.remove(); done2();
    }
  });

  restore();
  // ?who= prefill must win over the previously saved (possibly empty) value
  if (PREFILL_WHO) {
    answers.who = PREFILL_WHO;
    document.getElementById("who").value = PREFILL_WHO;
  }
  progress();
})();
