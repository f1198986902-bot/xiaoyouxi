/**
 * Ashlamp Town · personal standings sync.
 *
 * Set LEADERBOARD_ENDPOINT to a CORS-friendly JSON document URL that
 * accepts GET (returns the document) and PUT (replaces the document).
 * Leave it empty for local-only mode. An optional LEADERBOARD_KEY may be
 * sent as X-Master-Key if a later host requires it.
 * Never put a GitHub token or any repo credential in this file.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.Leaderboard = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var LEADERBOARD_ENDPOINT = "";
  var LEADERBOARD_KEY = "";
  var CACHE_KEY = "ashlamp-town-lb-cache-v1";
  var MAX_ROWS_PER_SEASON = 400;
  var KEEP_SEASONS = 3;

  function authHeaders() {
    var h = { Accept: "application/json", "Content-Type": "application/json" };
    if (LEADERBOARD_KEY) h["X-Master-Key"] = LEADERBOARD_KEY;
    return h;
  }

  function emptyDoc() {
    return { updatedAt: 0, rows: [] };
  }

  function normalizeDoc(data) {
    if (!data) return emptyDoc();
    if (Array.isArray(data)) return { updatedAt: Date.now(), rows: data.filter(Boolean) };
    var src = data.record && (data.record.rows || data.record) ? data.record : data;
    if (Array.isArray(src)) return { updatedAt: Date.now(), rows: src.filter(Boolean) };
    if (Array.isArray(src.rows)) {
      return { updatedAt: typeof src.updatedAt === "number" ? src.updatedAt : Date.now(), rows: src.rows.filter(Boolean) };
    }
    return emptyDoc();
  }

  function loadCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return emptyDoc();
      return normalizeDoc(JSON.parse(raw));
    } catch (e) {
      return emptyDoc();
    }
  }

  function saveCache(doc) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(doc));
    } catch (e) {}
  }

  function prune(rows) {
    var bySeason = {};
    var i, r, key, keys, out = [];
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      if (!r || !r.playerId) continue;
      key = typeof r.seasonIndex === "number" ? r.seasonIndex : 0;
      if (!bySeason[key]) bySeason[key] = [];
      bySeason[key].push(r);
    }
    keys = Object.keys(bySeason).map(function (k) { return +k; });
    keys.sort(function (a, b) { return b - a; });
    keys = keys.slice(0, KEEP_SEASONS);
    keys.sort(function (a, b) { return a - b; });
    for (i = 0; i < keys.length; i++) {
      r = bySeason[keys[i]].slice();
      r.sort(function (a, b) {
        var ua = typeof a.updatedAt === "number" ? a.updatedAt : 0;
        var ub = typeof b.updatedAt === "number" ? b.updatedAt : 0;
        return ub - ua;
      });
      out = out.concat(r.slice(0, MAX_ROWS_PER_SEASON));
    }
    return out;
  }

  function upsertRow(rows, rec) {
    var i, out = [], found = false;
    for (i = 0; i < rows.length; i++) {
      if (rows[i] && rec && rows[i].playerId === rec.playerId && rows[i].seasonIndex === rec.seasonIndex) {
        out.push(rec);
        found = true;
      } else if (rows[i]) {
        out.push(rows[i]);
      }
    }
    if (rec && rec.playerId && !found) out.push(rec);
    return prune(out);
  }

  function fetchDoc(cb) {
    var cached = loadCache();
    if (!LEADERBOARD_ENDPOINT || typeof fetch !== "function") {
      cb(cached, false, "local");
      return;
    }
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (ctrl) try { ctrl.abort(); } catch (e) {}
    }, 8000);
    var opts = { method: "GET", headers: authHeaders(), mode: "cors", cache: "no-store" };
    if (ctrl) opts.signal = ctrl.signal;
    fetch(LEADERBOARD_ENDPOINT, opts)
      .then(function (res) {
        if (!res.ok) throw new Error("status " + res.status);
        return res.json();
      })
      .then(function (data) {
        clearTimeout(timer);
        var doc = normalizeDoc(data);
        saveCache(doc);
        cb(doc, true, "remote");
      })
      .catch(function () {
        clearTimeout(timer);
        cb(cached, false, "cache");
      });
  }

  function publish(rec, cb) {
    var local = loadCache();
    local.rows = upsertRow(local.rows, rec);
    local.updatedAt = Date.now();
    saveCache(local);
    if (!LEADERBOARD_ENDPOINT || typeof fetch !== "function") {
      if (cb) cb(local, false);
      return;
    }
    fetchDoc(function (doc, ok) {
      if (!ok) {
        if (cb) cb(local, false);
        return;
      }
      doc.rows = upsertRow(doc.rows, rec);
      doc.updatedAt = Date.now();
      saveCache(doc);
      fetch(LEADERBOARD_ENDPOINT, {
        method: "PUT",
        headers: authHeaders(),
        mode: "cors",
        body: JSON.stringify(doc)
      })
        .then(function (res) {
          if (!res.ok) throw new Error("status " + res.status);
          if (cb) cb(doc, true);
        })
        .catch(function () {
          if (cb) cb(doc, false);
        });
    });
  }

  function rowsForSeason(doc, seasonIndex) {
    var rows = (doc && doc.rows) || [];
    return rows.filter(function (r) {
      return r && r.seasonIndex === seasonIndex;
    });
  }

  return {
    ENDPOINT: LEADERBOARD_ENDPOINT,
    fetchDoc: fetchDoc,
    publish: publish,
    rowsForSeason: rowsForSeason,
    loadCache: loadCache,
    upsertRow: upsertRow
  };
});
