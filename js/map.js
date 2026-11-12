/**
 * 灰灯镇 · 原创 GBA 风直交地图（16×16 图块，非任天堂素材）
 */
(function (root) {
  "use strict";

  var TILE = 16;
  var SCALE = 3;
  var COLS = 26;
  var ROWS = 15;
  var PX_W = COLS * TILE * SCALE;
  var PX_H = ROWS * TILE * SCALE;

  var TILE_INDEX = {
    grass: 0, grass2: 1, grass3: 2, dirt: 3, stone: 4, sand: 5,
    water: 6, water2: 7, shore_n: 8, shore_s: 9, shore_w: 10, shore_e: 11,
    bridge: 12, wall_top: 13, wall_front: 14,
    fence_h: 15, fence_n: 16, fence_s: 17, fence_w: 18, fence_e: 19, fence_gate: 20
  };
  var SHEET_COLS = 8;

  var TERRAIN_NAME = {
    grass: "草地", grass2: "草地", grass3: "草地",
    dirt: "道路", stone: "石砖", sand: "沙地",
    water: "护城河", water2: "护城河",
    shore_n: "河岸", shore_s: "河岸", shore_w: "河岸", shore_e: "河岸",
    bridge: "石桥",
    wall_top: "城墙", wall_front: "城墙",
    fence_h: "栅栏", fence_n: "栅栏", fence_s: "栅栏",
    fence_w: "栅栏", fence_e: "栅栏", fence_gate: "栅门"
  };

  function locTerrain(id) {
    if (typeof I18n !== "undefined" && id) {
      var s = I18n.t("terrain." + id);
      if (s && s !== "terrain." + id) return s;
    }
    return TERRAIN_NAME[id] || id || (typeof I18n !== "undefined" ? I18n.t("terrain.unknown") : "未知");
  }
  function locPlace(place) {
    if (!place) return "";
    if (typeof I18n !== "undefined") {
      if (place.id === "town" && currentMapId === "wilds") return I18n.t("place.return");
      return I18n.t("place." + place.id);
    }
    return place.name;
  }


  var START = { x: 13, y: 10 };

  var PLACES = [
    { id: "guild",    name: "公会",   tx: 2,  ty: 6,  tw: 5, th: 3, img: "guild",  ox: 0, oy: -32, enter: { x: 4, y: 9 } },
    { id: "inn",      name: "打铁铺",   tx: 14, ty: 3,  tw: 3, th: 2, img: "inn",    ox: 0, oy: -24, enter: { x: 15, y: 5 } },
    { id: "statue",   name: "雕像",   tx: 11, ty: 7,  tw: 2, th: 2, img: "statue", ox: 0, oy: -8,  enter: { x: 12, y: 9 } },
    { id: "arena",    name: "竞技场", tx: 17, ty: 6,  tw: 4, th: 3, img: "arena",  ox: 0, oy: -32, enter: { x: 18, y: 9 } },
    { id: "board",    name: "公告栏", tx: 2,  ty: 11, tw: 2, th: 2, img: "board",  ox: 0, oy: 0,   enter: { x: 3, y: 13 } },
    { id: "shop",     name: "商店",   tx: 7,  ty: 11, tw: 3, th: 2, img: "shop",   ox: 0, oy: -24, enter: { x: 8, y: 13 } },
    { id: "training", name: "训练场", tx: 20, ty: 10, tw: 5, th: 4, img: null,    ox: 0, oy: 0,   enter: { x: 22, y: 13 },
      extra: true },
    { id: "wilds",    name: "南门",   tx: 12, ty: 14, tw: 2, th: 1, img: "town_gate", ox: 0, oy: -16, enter: { x: 12, y: 14 },
      auto: true, open: true, labelX: 12.5, labelY: 13.15 }
  ];

  var TREES = [
    { x: 3, y: 3, img: "tree0" },
    { x: 8, y: 4, img: "tree1" },
    { x: 5, y: 4, img: "tree_sm0" },
    { x: 9, y: 3, img: "tree2" },
    { x: 22, y: 3, img: "tree0" },
    { x: 24, y: 5, img: "tree1" },
    { x: 1, y: 5, img: "tree_sm0" },
    { x: 8, y: 7, img: "tree_sm1" },
    { x: 16, y: 8, img: "tree_sm0" },
    { x: 21, y: 8, img: "tree1" },
    { x: 1, y: 10, img: "tree0" },
    { x: 5, y: 12, img: "tree_sm1" },
    { x: 15, y: 11, img: "tree2" },
    { x: 11, y: 11, img: "tree_sm0" }
  ];

  var DECOS = [
    { x: 21, y: 11, img: "dummy", ox: 0, oy: -8 },
    { x: 23, y: 11, img: "dummy", ox: 0, oy: -8 }
  ];

  var TOWN_PLACES = PLACES;
  var TOWN_TREES = TREES;
  var TOWN_DECOS = DECOS;

  var WILDS_PLACES = [
    { id: "town",    name: "回镇",   tx: 12, ty: 0, tw: 2, th: 1, img: null, ox: 0, oy: 0, enter: { x: 12, y: 0 },
      auto: true, open: true, labelX: 12.5, labelY: 0.2 },
    { id: "dungeon", name: "地下城", tx: 11, ty: 7, tw: 4, th: 3, img: "cave", ox: 0, oy: 0, enter: { x: 12, y: 10 },
      labelX: 12.5, labelY: 10.15 }
  ];
  var WILDS_TREES = [
    { x: 3, y: 3, img: "tree0" },
    { x: 6, y: 2, img: "tree_sm0" },
    { x: 8, y: 5, img: "tree1" },
    { x: 2, y: 8, img: "tree2" },
    { x: 5, y: 11, img: "tree0" },
    { x: 9, y: 12, img: "tree_sm1" },
    { x: 16, y: 3, img: "tree1" },
    { x: 20, y: 2, img: "tree0" },
    { x: 23, y: 4, img: "tree2" },
    { x: 21, y: 8, img: "tree_sm0" },
    { x: 18, y: 11, img: "tree1" },
    { x: 22, y: 12, img: "tree_sm1" },
    { x: 15, y: 13, img: "tree0" }
  ];
  var WILDS_DECOS = [];

  var currentMapId = "town";
  var mapCache = {};

  var imgs = {};
  var tileset = null;
  var canvas, ctx, wrap, labelsEl;
  var opts = {};
  var grid = [];
  var blocked = [];
  var placeMap = [];
  var cursor = { x: START.x, y: START.y };
  var player = { x: START.x, y: START.y, fx: START.x, fy: START.y, path: [], walking: false };
  var anim = { t: 0, cursor: 0, water: 0, unit: 0, raf: 0, running: false };
  var lastPlaceClick = null;
  var pendingConfirm = null;
  var ready = false;

  function grassOf(x, y) {
    var n = (x * 13 + y * 7) % 3;
    return n === 0 ? "grass" : n === 1 ? "grass2" : "grass3";
  }

  function paintRect(type, x0, y0, x1, y1) {
    var x, y;
    for (y = y0; y <= y1; y++) {
      for (x = x0; x <= x1; x++) {
        if (x > 0 && x < COLS - 1 && y > 0 && y < ROWS - 1) grid[y][x] = type;
      }
    }
  }

  function buildGrid() {
    var x, y, t;
    grid = [];
    blocked = [];
    placeMap = [];
    for (y = 0; y < ROWS; y++) {
      grid[y] = [];
      blocked[y] = [];
      placeMap[y] = [];
      for (x = 0; x < COLS; x++) {
        if (y === 0 || x === 0 || x === COLS - 1) t = "wall_top";
        else if (y === ROWS - 1) t = "wall_front";
        else if (y <= 2) t = (x === 12 || x === 13) ? "bridge" : (y === 2 && (x === 11 || x === 14) ? "shore_e" : "water");
        else if (y === 3 && x !== 12 && x !== 13) t = "shore_n";
        else t = grassOf(x, y);
        /* fix the awkward shore_e on water row — keep water clean */
        if (y <= 2 && x !== 12 && x !== 13 && x !== 0 && x !== COLS - 1) t = "water";
        grid[y][x] = t;
        blocked[y][x] = false;
        placeMap[y][x] = null;
      }
    }
    /* north-south road from the bridge */
    paintRect("dirt", 12, 3, 13, 13);
    /* short path to the inn door */
    paintRect("dirt", 14, 5, 15, 5);
    /* east-west road in front of hall / arena */
    paintRect("dirt", 2, 9, 20, 9);
    /* south walk to shop / board / training */
    paintRect("dirt", 3, 13, 22, 13);
    paintRect("dirt", 8, 12, 8, 13);
    /* plaza around the statue */
    paintRect("stone", 9, 7, 15, 9);
    /* keep the axis as stone too where it meets the plaza */
    paintRect("stone", 12, 6, 13, 6);
    /* training yard — south fence sits on row 12 so the row-13 road stays clear */
    paintRect("sand", 21, 11, 23, 12);
    for (x = 20; x <= 24; x++) grid[10][x] = "fence_n";
    grid[11][20] = "fence_w";
    grid[12][20] = "fence_w";
    grid[11][24] = "fence_e";
    grid[12][24] = "fence_e";
    grid[12][21] = "fence_s";
    grid[12][22] = "fence_gate";
    grid[12][23] = "fence_s";

    /* walkability */
    for (y = 0; y < ROWS; y++) {
      for (x = 0; x < COLS; x++) {
        t = grid[y][x];
        blocked[y][x] = !(
          t === "grass" || t === "grass2" || t === "grass3" ||
          t === "dirt" || t === "stone" || t === "sand" ||
          t === "bridge" || t === "shore_n" || t === "shore_s" ||
          t === "shore_w" || t === "shore_e" || t === "fence_gate"
        );
      }
    }
    stampPlaces(PLACES, TREES);

    /* 南墙开一道通往镇外的路口 */
    grid[14][12] = "dirt";
    grid[14][13] = "dirt";
    blocked[14][12] = false;
    blocked[14][13] = false;
    placeMap[14][12] = "wilds";
    placeMap[14][13] = "wilds";
  }

  function stampPlaces(places, trees) {
    places.forEach(function (p) {
      if (p.id === "training") {
        var i, j;
        for (j = 10; j <= 12; j++) {
          for (i = 20; i <= 24; i++) placeMap[j][i] = p.id;
        }
        placeMap[13][22] = p.id;
        return;
      }
      var j, i;
      for (j = p.ty; j < p.ty + p.th; j++) {
        for (i = p.tx; i < p.tx + p.tw; i++) {
          if (j >= 0 && j < ROWS && i >= 0 && i < COLS) {
            if (!p.open) blocked[j][i] = true;
            placeMap[j][i] = p.id;
          }
        }
      }
    });
    trees.forEach(function (tr) {
      if (tr.y >= 0 && tr.y < ROWS && tr.x >= 0 && tr.x < COLS) {
        if (!blocked[tr.y][tr.x] && !placeMap[tr.y][tr.x]) blocked[tr.y][tr.x] = true;
      }
    });
  }

  function buildWildsGrid() {
    var x, y, t;
    grid = [];
    blocked = [];
    placeMap = [];
    for (y = 0; y < ROWS; y++) {
      grid[y] = [];
      blocked[y] = [];
      placeMap[y] = [];
      for (x = 0; x < COLS; x++) {
        if ((x === 0 || x === COLS - 1 || y === ROWS - 1) || (y === 0 && x !== 12 && x !== 13)) {
          t = y === ROWS - 1 ? "wall_front" : "wall_top";
        } else {
          t = grassOf(x, y);
        }
        grid[y][x] = t;
        blocked[y][x] = false;
        placeMap[y][x] = null;
      }
    }
    paintRect("dirt", 12, 1, 13, 11);
    grid[0][12] = "dirt";
    grid[0][13] = "dirt";
    paintRect("dirt", 11, 10, 14, 11);
    paintRect("stone", 11, 10, 14, 10);
    for (y = 0; y < ROWS; y++) {
      for (x = 0; x < COLS; x++) {
        t = grid[y][x];
        blocked[y][x] = !(
          t === "grass" || t === "grass2" || t === "grass3" ||
          t === "dirt" || t === "stone" || t === "sand" ||
          t === "bridge" || t === "shore_n" || t === "shore_s" ||
          t === "shore_w" || t === "shore_e" || t === "fence_gate"
        );
      }
    }
    /* keep the north road open */
    blocked[0][12] = false;
    blocked[0][13] = false;
    stampPlaces(WILDS_PLACES, WILDS_TREES);
    blocked[0][12] = false;
    blocked[0][13] = false;
  }

  function snapshotMap(id, places, trees, decos, start) {
    mapCache[id] = {
      grid: grid,
      blocked: blocked,
      placeMap: placeMap,
      places: places,
      trees: trees,
      decos: decos,
      start: start
    };
  }

  function applySnapshot(id, spawn) {
    var m = mapCache[id];
    if (!m) return;
    currentMapId = id;
    grid = m.grid;
    blocked = m.blocked;
    placeMap = m.placeMap;
    PLACES = m.places;
    TREES = m.trees;
    DECOS = m.decos;
    var s = spawn || m.start;
    player.x = s.x;
    player.y = s.y;
    player.fx = s.x;
    player.fy = s.y;
    player.path = [];
    player.walking = false;
    player._then = null;
    cursor.x = s.x;
    cursor.y = s.y;
    lastPlaceClick = null;
    pendingConfirm = null;
    if (ready) {
      buildLabels();
      emitCursor();
    }
  }

  function switchMap(id, spawn) {
    if (!mapCache[id]) return;
    applySnapshot(id, spawn);
  }

  function buildAllMaps() {
    buildGrid();
    snapshotMap("town", TOWN_PLACES, TOWN_TREES, TOWN_DECOS, START);
    buildWildsGrid();
    snapshotMap("wilds", WILDS_PLACES, WILDS_TREES, WILDS_DECOS, { x: 12, y: 2 });
    applySnapshot("town");
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var im = new Image();
      im.onload = function () { resolve(im); };
      im.onerror = function () { reject(new Error("missing " + src)); };
      im.src = src;
    });
  }

  function preload() {
    var names = [
      "guild", "inn", "shop", "arena", "statue", "board",
      "dummy", "tree0", "tree1", "tree2", "tree_sm0", "tree_sm1",
      "cursor0", "cursor1", "unit0", "unit1",
      "cave", "town_gate"
    ];
    var jobs = [loadImage("assets/map/tileset.webp").then(function (im) { tileset = im; })];
    var keepPng = { cursor0: 1, cursor1: 1, unit0: 1, unit1: 1, dummy: 1 };
    names.forEach(function (n) {
      var ext = keepPng[n] ? ".png" : ".webp";
      jobs.push(loadImage("assets/map/" + n + ext).then(function (im) { imgs[n] = im; }));
    });
    return Promise.all(jobs);
  }

  function inBounds(x, y) {
    return x >= 0 && y >= 0 && x < COLS && y < ROWS;
  }

  function isWalkable(x, y) {
    return inBounds(x, y) && !blocked[y][x];
  }

  function placeAt(x, y) {
    return inBounds(x, y) ? placeMap[y][x] : null;
  }

  function placeById(id) {
    for (var i = 0; i < PLACES.length; i++) if (PLACES[i].id === id) return PLACES[i];
    return null;
  }

  function terrainInfo(x, y) {
    if (!inBounds(x, y)) return { name: "——", walk: false, place: null };
    var pid = placeMap[y][x];
    var p = pid ? placeById(pid) : null;
    var t = grid[y][x];
    return {
      x: x,
      y: y,
      name: p ? locPlace(p) : locTerrain(t),
      terrain: locTerrain(t),
      walk: !blocked[y][x],
      place: pid || null
    };
  }

  function nearestWalkable(x, y) {
    if (isWalkable(x, y)) return { x: x, y: y };
    var pid = placeAt(x, y);
    if (pid) {
      var p = placeById(pid);
      if (p && isWalkable(p.enter.x, p.enter.y)) return { x: p.enter.x, y: p.enter.y };
    }
    var r, dx, dy, best = null, bestD = 99;
    for (r = 1; r <= 6; r++) {
      for (dy = -r; dy <= r; dy++) {
        for (dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          var nx = x + dx, ny = y + dy;
          if (isWalkable(nx, ny)) {
            var d = Math.abs(dx) + Math.abs(dy);
            if (d < bestD) { bestD = d; best = { x: nx, y: ny }; }
          }
        }
      }
      if (best) return best;
    }
    return { x: player.x, y: player.y };
  }

  function bfs(sx, sy, tx, ty) {
    if (!isWalkable(tx, ty)) return null;
    if (sx === tx && sy === ty) return [];
    var q = [{ x: sx, y: sy }];
    var seen = {};
    seen[sx + "," + sy] = null;
    var head = 0;
    var dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    while (head < q.length) {
      var cur = q[head++];
      for (var i = 0; i < 4; i++) {
        var nx = cur.x + dirs[i][0], ny = cur.y + dirs[i][1];
        var k = nx + "," + ny;
        if (seen[k] !== undefined || !isWalkable(nx, ny)) continue;
        seen[k] = cur;
        if (nx === tx && ny === ty) {
          var path = [];
          var p = { x: nx, y: ny };
          while (p && !(p.x === sx && p.y === sy)) {
            path.push(p);
            p = seen[p.x + "," + p.y];
          }
          path.reverse();
          return path;
        }
        q.push({ x: nx, y: ny });
      }
    }
    return null;
  }

  function walkTo(x, y, then) {
    var dest = nearestWalkable(x, y);
    var path = bfs(player.x, player.y, dest.x, dest.y);
    if (!path) {
      if (then) then(false);
      return;
    }
    if (!path.length) {
      if (then) then(true);
      return;
    }
    player.path = path;
    player.walking = true;
    player._then = then || null;
    player._stepT = 0;
  }

  function stepWalk(dt) {
    if (!player.walking || !player.path.length) {
      if (player.walking) {
        player.walking = false;
        player.fx = player.x;
        player.fy = player.y;
        var cb = player._then;
        player._then = null;
        if (cb) cb(true);
        maybeAutoEnter();
      }
      return;
    }
    var STEP = 140;
    player._stepT = (player._stepT || 0) + dt;
    var nxt = player.path[0];
    var k = Math.min(1, player._stepT / STEP);
    player.fx = player.x + (nxt.x - player.x) * k;
    player.fy = player.y + (nxt.y - player.y) * k;
    if (k >= 1) {
      player.x = nxt.x;
      player.y = nxt.y;
      player.fx = nxt.x;
      player.fy = nxt.y;
      player.path.shift();
      player._stepT = 0;
      if (!player.path.length) {
        player.walking = false;
        var cb2 = player._then;
        player._then = null;
        if (cb2) cb2(true);
        maybeAutoEnter();
      }
    }
  }

  function maybeAutoEnter() {
    if (uiBlocked() || !opts.onEnter) return;
    var pid = placeAt(player.x, player.y);
    var p = pid ? placeById(pid) : null;
    if (p && p.auto) opts.onEnter(pid);
  }

  function emitCursor() {
    if (opts.onCursor) opts.onCursor(terrainInfo(cursor.x, cursor.y));
  }

  function uiBlocked() {
    if (opts.isBlocked) return !!opts.isBlocked();
    return false;
  }

  function setCursor(x, y) {
    if (!inBounds(x, y)) return;
    cursor.x = x;
    cursor.y = y;
    emitCursor();
  }

  function tryConfirm() {
    var info = terrainInfo(cursor.x, cursor.y);
    if (!info.place) return;
    var p = placeById(info.place);
    var dest = p.enter;
    function go() {
      if (opts.onEnter) opts.onEnter(info.place);
    }
    if (player.x === dest.x && player.y === dest.y && !player.walking) {
      go();
      return;
    }
    walkTo(dest.x, dest.y, function (ok) {
      if (ok) go();
    });
  }

  function onClick(ev) {
    if (uiBlocked() || !ready) return;
    var rect = canvas.getBoundingClientRect();
    var sx = (ev.clientX - rect.left) / rect.width;
    var sy = (ev.clientY - rect.top) / rect.height;
    var x = Math.floor(sx * COLS);
    var y = Math.floor(sy * ROWS);
    if (!inBounds(x, y)) return;
    ev.preventDefault();
    var info = terrainInfo(x, y);
    var same = lastPlaceClick && lastPlaceClick === info.place && cursor.x === x && cursor.y === y;
    setCursor(x, y);
    var dest = info.place ? placeById(info.place).enter : nearestWalkable(x, y);
    if (info.place && same) {
      lastPlaceClick = info.place;
      tryConfirm();
      return;
    }
    lastPlaceClick = info.place || ("t:" + x + "," + y);
    walkTo(dest.x, dest.y);
  }

  function onKey(ev) {
    if (uiBlocked() || !ready) return;
    var dx = 0, dy = 0;
    if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") dx = -1;
    else if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") dx = 1;
    else if (ev.key === "ArrowUp" || ev.key === "w" || ev.key === "W") dy = -1;
    else if (ev.key === "ArrowDown" || ev.key === "s" || ev.key === "S") dy = 1;
    else if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      tryConfirm();
      return;
    } else return;
    ev.preventDefault();
    setCursor(cursor.x + dx, cursor.y + dy);
    lastPlaceClick = placeAt(cursor.x, cursor.y);
  }

  function drawTile(type, x, y) {
    if (type === "water" && anim.water) type = "water2";
    else if (type === "water2" && !anim.water) type = "water";
    var idx = TILE_INDEX[type];
    if (idx === undefined) idx = 0;
    var ts = tileset && tileset.width ? Math.floor(tileset.width / SHEET_COLS) : TILE;
    var sx = (idx % SHEET_COLS) * ts;
    var sy = Math.floor(idx / SHEET_COLS) * ts;
    ctx.drawImage(tileset, sx, sy, ts, ts, x * TILE * SCALE, y * TILE * SCALE, TILE * SCALE, TILE * SCALE);
  }

  function drawSprite(img, px, py) {
    if (!img) return;
    ctx.drawImage(img, 0, 0, img.width, img.height, Math.round(px * SCALE), Math.round(py * SCALE), img.width * SCALE, img.height * SCALE);
  }

  function objectsForSort() {
    var list = [];
    PLACES.forEach(function (p) {
      if (!p.img) return;
      list.push({
        y: p.ty + p.th,
        x: p.tx,
        draw: function () { drawSprite(imgs[p.img], p.tx * TILE + p.ox, p.ty * TILE + p.oy); }
      });
    });
    TREES.forEach(function (tr) {
      var im = imgs[tr.img];
      var ox = im && im.width > 16 ? -Math.floor((im.width - 16) / 2) : 0;
      var oy = im ? 16 - im.height : 0;
      list.push({
        y: tr.y + 1,
        x: tr.x,
        draw: function () { drawSprite(im, tr.x * TILE + ox, tr.y * TILE + oy); }
      });
    });
    DECOS.forEach(function (d) {
      list.push({
        y: d.y + 1,
        x: d.x,
        draw: function () { drawSprite(imgs[d.img], d.x * TILE + (d.ox || 0), d.y * TILE + (d.oy || 0)); }
      });
    });
    var uimg = imgs[anim.unit ? "unit1" : "unit0"];
    list.push({
      y: player.fy + 1,
      x: player.fx,
      draw: function () {
        drawSprite(uimg, player.fx * TILE, player.fy * TILE);
      }
    });
    list.sort(function (a, b) { return a.y === b.y ? a.x - b.x : a.y - b.y; });
    return list;
  }

  function drawCursor() {
    var x = cursor.x, y = cursor.y;
    ctx.fillStyle = "rgba(232, 236, 80, 0.18)";
    ctx.fillRect(x * TILE * SCALE, y * TILE * SCALE, TILE * SCALE, TILE * SCALE);
    var im = imgs[anim.cursor ? "cursor1" : "cursor0"];
    drawSprite(im, x * TILE, y * TILE);
  }

  function layoutLabels() {
    if (!labelsEl || !canvas) return;
    var rect = wrap.getBoundingClientRect();
    var cr = canvas.getBoundingClientRect();
    labelsEl.style.width = cr.width + "px";
    labelsEl.style.height = cr.height + "px";
    labelsEl.style.left = (cr.left - rect.left) + "px";
    labelsEl.style.top = (cr.top - rect.top) + "px";
    var nodes = labelsEl.querySelectorAll(".map-label");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var tx = Number(el.getAttribute("data-x"));
      var ty = Number(el.getAttribute("data-y"));
      el.style.left = ((tx + 0.5) / COLS * 100) + "%";
      el.style.top = (ty / ROWS * 100) + "%";
    }
  }

  function buildLabels() {
    if (!labelsEl) return;
    labelsEl.innerHTML = PLACES.map(function (p) {
      var lx = p.labelX != null ? p.labelX : (p.id === "training" ? 22 : p.tx + p.tw / 2 - 0.5);
      var ly = p.labelY != null ? p.labelY : (p.id === "training" ? 13.15 : p.ty + p.th);
      return '<span class="map-label" data-x="' + lx + '" data-y="' + ly + '">' + locPlace(p) + "</span>";
    }).join("");
    layoutLabels();
  }

  var lastTs = 0;
  function frame(ts) {
    if (!anim.running) return;
    anim.raf = requestAnimationFrame(frame);
    if (!ready || !ctx) return;
    var dt = lastTs ? Math.min(50, ts - lastTs) : 16;
    lastTs = ts;
    anim.t += dt;
    var cFrame = Math.floor(anim.t / 380) % 2;
    var wFrame = Math.floor(anim.t / 520) % 2;
    var uFrame = player.walking ? Math.floor(anim.t / 140) % 2 : Math.floor(anim.t / 480) % 2;
    anim.cursor = cFrame;
    anim.water = wFrame;
    anim.unit = uFrame;
    stepWalk(dt);

    ctx.imageSmoothingEnabled = false;
    var x, y;
    for (y = 0; y < ROWS; y++) {
      for (x = 0; x < COLS; x++) drawTile(grid[y][x], x, y);
    }
    /* cursor under tall objects so the tile itself is marked, then again on top */
    ctx.fillStyle = "rgba(232, 236, 80, 0.16)";
    ctx.fillRect(cursor.x * TILE * SCALE, cursor.y * TILE * SCALE, TILE * SCALE, TILE * SCALE);
    objectsForSort().forEach(function (o) { o.draw(); });
    drawCursor();
  }

  function start() {
    if (anim.running) return;
    anim.running = true;
    lastTs = 0;
    anim.raf = requestAnimationFrame(frame);
  }

  function stop() {
    anim.running = false;
    if (anim.raf) cancelAnimationFrame(anim.raf);
    anim.raf = 0;
  }

  function resetUnit() {
    switchMap("town", START);
  }

  function mount(canvasEl, wrapEl, labelBox, options) {
    canvas = canvasEl;
    wrap = wrapEl;
    labelsEl = labelBox;
    opts = options || {};
    canvas.width = PX_W;
    canvas.height = PX_H;
    ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    buildAllMaps();
    if (!canvas._townBound) {
      canvas.addEventListener("click", onClick);
      canvas._townBound = true;
    }
    if (!document._townKeys) {
      document.addEventListener("keydown", function (ev) {
        var town = document.getElementById("screen-town");
        if (!town || !town.classList.contains("active")) return;
        onKey(ev);
      });
      window.addEventListener("resize", layoutLabels);
      document._townKeys = true;
    }
    var boot = tileset ? Promise.resolve() : preload();
    boot.then(function () {
      ready = true;
      buildLabels();
      emitCursor();
      start();
    }).catch(function (err) {
      console.error(err);
    });
    return boot;
  }

  root.TownMap = {
    TILE: TILE,
    SCALE: SCALE,
    COLS: COLS,
    ROWS: ROWS,
    START: START,
    mount: mount,
    start: start,
    stop: stop,
    resetUnit: resetUnit,
    setCursor: setCursor,
    tryConfirm: tryConfirm,
    terrainInfo: terrainInfo,
    placeAt: placeAt,
    layoutLabels: layoutLabels,
    refreshLabels: buildLabels,
    cursorTerrain: function () { return terrainInfo(cursor.x, cursor.y); },
    switchMap: switchMap,
    currentMap: function () { return currentMapId; },
    isWalking: function () { return player.walking; }
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
