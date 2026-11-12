/**
 * 灰灯镇 · 主流程与界面
 */
(function () {
  "use strict";

  var D = GameData;
  var C = Combat;
  var SAVE_KEY = "ashlamp-town-save-v1";
  var STAT_KEYS = C.STAT_KEYS;

  var activeUi = null;
  var statueHealNote = false;
  var lastVictory = null;
  var lastFaint = null;

  function t(key, vars) {
    return I18n.t(key, vars);
  }
  function statLabel(key) {
    return t("stat." + key);
  }
  function promotedNameOf(person) {
    var promo = person && person.promoted && person.classId && D.PROMOTIONS[person.classId];
    return promo ? t("promo." + promo.id) : "";
  }
  function classNameOf(person) {
    if (!person) return "";
    if (typeof person === "string") {
      if (D.CLASSES[person]) return t("class." + person);
      return person;
    }
    if (person.weapon && person.weapon.type === "train") return t("arena.dummy");
    if (person.className === "训练器具" || person.className === "Training Dummy") return t("arena.dummy");
    if (person.classId && D.CLASSES[person.classId]) {
      return promotedNameOf(person) || t("class." + person.classId);
    }
    return person.className || "";
  }
  function weaponName(w) {
    if (!w) return "";
    if (typeof w === "string") {
      if (D.WEAPONS[w]) return t("weapon." + w);
      if (w === "木臂" || w === "Wooden Arm") return t("arena.woodArm");
      return w;
    }
    if (w.id && D.WEAPONS[w.id]) return t("weapon." + w.id);
    if (w.type === "train" || w.name === "木臂" || w.name === "Wooden Arm") return t("arena.woodArm");
    return w.name || "";
  }
  function displayName(person) {
    if (!person) return "";
    if (typeof person === "string") return person;
    var n = person.name || "";
    var cid = person.classId;
    if (person.dungeonId === "d2" || n === "石门魔物 II" || n === "Stonegate Monster II" || n === "石门魔物二") return t("monster.name2");
    if (person.dungeonId === "d1" || n === "石门魔物 I" || n === "Stonegate Monster I" || n === "石门魔物一") return t("monster.name1");
    if (n === "石门骑士 柯刚" || n === "Stonegate Knight Kegang" || n === "石门魔物" || n === "Stonegate Monster") return t("monster.name");
    if (n === "木人" || n === "Wooden Dummy" || n === "Training Dummy") return t("arena.dummyName");
    if (n === "教练" || n === "Instructor" || /^教练/.test(n) || /^Instructor\b/.test(n)) return t("arena.instructor");
    if (n === "老兵" || n === "Veteran" || /^老兵/.test(n) || /^Veteran\b/.test(n)) return t("arena.veteran");
    if (cid && D.CLASSES[cid]) {
      var zh = I18n.literal("zh", "class." + cid);
      var en = I18n.literal("en", "class." + cid);
      var raw = D.CLASSES[cid].name;
      if (n === zh || n === en || n === raw) return promotedNameOf(person) || t("class." + cid);
    }
    return n;
  }
  function itemName(it) {
    if (!it) return "";
    var id = typeof it === "string" ? it : it.id;
    if (id === "tonic") return t("item.tonic");
    if (id === "promoBook") return t("item.promoBook");
    if (id === "challengeWrit") return t("item.challengeWrit");
    return (typeof it === "object" && it.name) ? it.name : String(it);
  }
  function usesText(w, cur) {
    if (!w) return "";
    var max = w.maxUses != null ? w.maxUses : (w.id && D.weaponMaxUses ? D.weaponMaxUses(w.id) : 0);
    if (!max) return "";
    var left = typeof cur === "number" ? cur : (typeof w.uses === "number" ? w.uses : max);
    return t("wep.uses", { cur: left, max: max });
  }
  function wepLine(w, cur) {
    if (!w) return "";
    var line = t("wep.line", { mt: w.mt, hit: w.hit, wt: w.wt });
    var u = usesText(w, cur);
    if (u) line += "　" + u;
    if (typeof cur === "number" ? cur <= 0 : (typeof w.uses === "number" && w.uses <= 0)) {
      line += "　" + t("wep.broken");
    }
    return line;
  }
  function setView(view) {
    activeUi = view || null;
    var el = $("#modal");
    if (el) el.dataset.view = view || "";
  }
  function setLanguage(next) {
    if (next !== "en" && next !== "zh") return;
    I18n.setLang(next);
    if (state) {
      state.lang = I18n.getLang();
      save();
    }
  }
  function syncLangButtons() {
    $all("[data-lang]").forEach(function (btn) {
      var on = btn.getAttribute("data-lang") === I18n.getLang();
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $all(".lang-switch").forEach(function (box) {
      var lab = box.querySelector(".lang-label");
      if (lab) lab.textContent = t("ui.language");
      box.setAttribute("aria-label", t("ui.language"));
    });
  }
  function langSwitcher(compact) {
    var cur = I18n.getLang();
    return (
      '<div class="lang-switch' +
      (compact ? " compact" : "") +
      '" role="group" aria-label="' +
      esc(t("ui.language")) +
      '">' +
      (compact ? "" : '<span class="lang-label">' + esc(t("ui.language")) + "</span>") +
      '<button type="button" class="lang-btn' +
      (cur === "en" ? " active" : "") +
      '" data-lang="en" aria-pressed="' +
      (cur === "en" ? "true" : "false") +
      '">English</button>' +
      '<button type="button" class="lang-btn' +
      (cur === "zh" ? " active" : "") +
      '" data-lang="zh" aria-pressed="' +
      (cur === "zh" ? "true" : "false") +
      '">中文</button></div>'
    );
  }
  function forecastTitle(ctx) {
    if (!ctx) return "";
    if (ctx.kind === "dungeon") {
      var boss = ctx.playerIsA ? ctx.def : ctx.atk;
      return ctx.playerIsA
        ? t("dungeon.forecast", { name: displayName(boss) })
        : t("dungeon.foeTurn", { name: displayName(boss) });
    }
    if (ctx.kind === "guild") return t("guild.huntName");
    if (ctx.kind === "arena") return t("arena.titleOf", { name: displayName(ctx.def) });
    return ctx.title || "";
  }
  function applyLanguage() {
    document.documentElement.lang = I18n.getLang() === "zh" ? "zh-CN" : "en";
    document.title = t("game.title");
    var kicker = $(".title-kicker");
    if (kicker) kicker.textContent = t("title.kicker");
    var h1 = $("#screen-title h1");
    if (h1) h1.textContent = t("game.title");
    var tag = $(".title-tag");
    if (tag) tag.innerHTML = t("title.tag");
    var bs = $("#btn-start");
    if (bs) bs.textContent = t("title.new");
    var bc = $("#btn-continue");
    if (bc) bc.textContent = t("title.continue");
    var enter = $("#btn-enter-place");
    if (enter) enter.textContent = t("ui.enter");
    var canvas = $("#town-map");
    if (canvas) canvas.setAttribute("aria-label", t("map.aria"));
    syncLangButtons();
    if (state) {
      state.lang = I18n.getLang();
      renderHud();
    }
    if (typeof TownMap !== "undefined") {
      if (TownMap.refreshLabels) TownMap.refreshLabels();
      var town = $("#screen-town");
      if (town && town.classList.contains("active") && TownMap.cursorTerrain) {
        renderTerrain(TownMap.cursorTerrain());
      }
    }
    refreshOpenUi();
  }
  function refreshOpenUi() {
    var modal = $("#modal");
    var battle = $("#battle");
    var view = modal && modal.dataset.view;
    if (modal && !modal.classList.contains("hidden") && view) {
      if (view === "board") openBoard();
      else if (view === "shop") openShop();
      else if (view === "bank") openBank();
      else if (view === "statue") openStatue(false, true);
      else if (view === "training") openTraining();
      else if (view === "arena") openArena();
      else if (view === "guild") openGuild();
      else if (view === "guild-rules") openGuildRules();
      else if (view === "bag") openBag();
      else if (view === "stats") openStats();
      else if (view === "dungeon-pick") openDungeonPick();
      else if (view === "dungeon-deploy") openDungeonDeploy();
      else if (view === "dungeon-room") renderDungeonRoom();
      else if (view === "personal-board") openPersonalBoard(true);
      else if (view === "welcome") showWelcome();
      else if (view === "dungeon-win") renderDungeonWin();
      else if (view === "dungeon-wipe") renderDungeonWipe();
      else if (view === "faint") renderFaint();
    }
    if (battle && !battle.classList.contains("hidden") && pendingBattle && !pendingBattle.result && !battleBusy) {
      showForecast(pendingBattle);
    } else if (battle && !battle.classList.contains("hidden")) {
      var banner = $("#b-banner");
      if (banner && !banner.classList.contains("show")) banner.textContent = t("crit.splash");
      ["a", "b"].forEach(function (id) {
        var unit = pendingBattle && (id === "a" ? pendingBattle.atk : pendingBattle.def);
        if (!unit) return;
        var nm = $("#ba-name-" + id);
        if (nm) nm.textContent = displayName(unit);
        var wpn = $("#ba-wpn-" + id);
        if (wpn) wpn.textContent = weaponName(unit.weapon || unit.weaponId);
        var hit = $("#ba-hit-" + id + " .lab");
        if (hit) {
          $("#ba-hit-" + id + " .lab").textContent = t("ba.hit");
          $("#ba-dmg-" + id + " .lab").textContent = t("ba.dmg");
          $("#ba-crt-" + id + " .lab").textContent = t("ba.crt");
        }
      });
    }
  }
  function showWelcome() {
    openModal(
      panel(
        t("welcome.title"),
        "<p>" +
          t("welcome.p1") +
          "</p><p>" +
          t("welcome.p2") +
          "</p><p class='muted'>" +
          t("welcome.p3") +
          "</p>" +
          actions({ close: t("welcome.ok") }),
        "narrow"
      ),
      true
    );
    setView("welcome");
  }
  function renderFaint() {
    var info = lastFaint || {};
    openModal(
      panel(
        t("faint.title"),
        "<p>" +
          esc(info.reason || "") +
          "</p><p>" +
          t("faint.body", { day: info.day != null ? info.day : (state && state.day) }) +
          (info.penalty > 0 ? t("faint.gold", { gold: info.penalty }) : "") +
          "</p><p class='muted'>" +
          t("faint.hp") +
          "</p>" +
          actions({ close: t("ui.stand") }),
        "narrow"
      ),
      true
    );
    setView("faint");
  }
  function renderDungeonWin() {
    var v = lastVictory || { goldGain: 0, drop: null, loot: {} };
    var loot = v.loot || {};
    var dropLine = "";
    function addLoot(drop, key) {
      if (!drop || !drop.weapon) return;
      dropLine +=
        "<p class='loot-note'>" +
        t(key, { weapon: weaponName(drop.weapon), name: drop.unit ? displayName(drop.unit) : "" }) +
        "</p>";
    }
    addLoot(loot.copper || (!loot.silver && v.drop ? v.drop : null), "dungeon.lootCopper");
    addLoot(loot.silver, "dungeon.lootSilver");
    if (loot.tome) dropLine += "<p class='loot-note'>" + t("dungeon.lootTome") + "</p>";
    openModal(
      panel(
        t("dungeon.winTitle"),
        "<p>" +
          t(v.dungeonId ? "dungeon.winLead." + v.dungeonId : "dungeon.winLead") +
          "</p><p>" +
          t("dungeon.winGold", { gold: v.goldGain }) +
          "</p>" +
          dropLine +
          actions({ "dungeon-close": t("dungeon.leaveCave") }),
        "narrow"
      ),
      true
    );
    setView("dungeon-win");
  }
  function renderDungeonWipe() {
    openModal(
      panel(
        t("dungeon.wipeTitle"),
        "<p>" +
          t("dungeon.wipeLead") +
          "</p>" +
          actions({ "dungeon-close": t("dungeon.backOut") }),
        "narrow"
      ),
      true
    );
    setView("dungeon-wipe");
  }


  var CLASS_ICONS = {
    sword: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8 L13.4 4.6 V14.2 L16.2 15.6 V17.2 H7.8 V15.6 L10.6 14.2 V4.6 Z"/><path d="M9 19.2 H15"/></svg>',
    cavalier: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 20 L17 4.5"/><path d="M15.2 3.2 L18.4 5.6 L16 6.6"/><path d="M8.2 14.8 H13"/></svg>',
    archer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 3.8 C17 7.2 17 16.8 7.2 20.2"/><path d="M7.2 3.8 V20.2"/><path d="M5 12 H19.6"/><path d="M16.8 9.2 L19.6 12 L16.8 14.8"/></svg>',
    thief: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8 L14.1 13.5 L12 21 L9.9 13.5 Z"/><path d="M8.6 13.5 H15.4"/></svg>',
    armor: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2 L19.5 7.2 V13.2 C19.5 17.4 16.2 20.2 12 20.8 C7.8 20.2 4.5 17.4 4.5 13.2 V7.2 Z"/><path d="M12 3.2 V20.8"/><path d="M5 8.2 H19"/></svg>',
    fighter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 20 L16 8"/><path d="M13.2 5.2 L19 9.4 L17.2 11.6 L11.6 7.2 Z"/><path d="M6.5 18.5 H11"/></svg>'
  };

  var state = null;
  var pendingBattle = null;
  var battleBusy = false;
  var toastTimer = 0;
  var battleTimers = [];
  var incomeTimer = 0;
  var incomePauseAt = 0;
  var goldPopTimer = 0;
  var dungeonRun = null;
  var pendingDungeonId = "d1";
  var personalBoardBack = "arena";
  var personalBoardRemote = { rows: [], ok: false };

  function later(fn, ms) {
    var id = setTimeout(fn, ms);
    battleTimers.push(id);
    return id;
  }
  function clearBattleTimers() {
    var i;
    for (i = 0; i < battleTimers.length; i++) clearTimeout(battleTimers[i]);
    battleTimers = [];
  }
  function isMonsterArt(id) {
    return id === "stonegate" || id === "axefiend";
  }
  function classArtId(person) {
    if (!person) return "sword";
    if (typeof person === "string") return D.CLASSES[person] ? person : "sword";
    if (person.classId && D.CLASSES[person.classId]) return person.classId;
    return "sword";
  }
  function artClass(person) {
    if (!person) return "dummy";
    if (typeof person === "string") {
      if (person === "dummy") return "dummy";
      return person;
    }
    if (person.artId) return person.artId;
    if (person.classId && D.CLASSES[person.classId]) return person.classId;
    if (person.className === "训练器具" || person.className === "Training Dummy") return "dummy";
    if (person.weapon && person.weapon.type === "train") return "dummy";
    return "sword";
  }
  function mugSrc(person, foe) {
    var id = typeof person === "string" ? person : artClass(person);
    if (id === "dummy") return "assets/units/mug-dummy.webp";
    var foeTag = foe && !isMonsterArt(id) ? "-foe" : "";
    return "assets/units/mug-" + id + foeTag + ".webp";
  }
  function standSrc(person, foe, facing, pose) {
    var id = typeof person === "string" ? person : artClass(person);
    var extra = pose === "atk" ? "-atk" : "";
    if (id === "dummy") return "assets/units/stand-dummy-" + facing + ".webp";
    var foeTag = foe && !isMonsterArt(id) ? "-foe" : "";
    return "assets/units/stand-" + id + "-" + facing + extra + foeTag + ".webp";
  }
  function classMugSrc(person, foe) {
    return mugSrc({ classId: classArtId(person) }, foe);
  }
  function classStandSrc(person, foe, facing, pose) {
    return standSrc({ classId: classArtId(person) }, foe, facing, pose);
  }
  function artOnError(person, foe, kind, facing, pose) {
    if (!person || typeof person === "string" || !person.artId) return "";
    var fb = kind === "stand"
      ? classStandSrc(person, foe, facing, pose)
      : classMugSrc(person, foe);
    return ' onerror="this.onerror=null;this.src=\'' + fb.replace(/'/g, "") + '\'"';
  }
  function weaponKind(person) {
    if (person && person.weapon && person.weapon.type) return person.weapon.type;
    var cid = classArtId(person);
    if (cid === "archer") return "bow";
    if (cid === "cavalier" || cid === "armor") return "lance";
    if (cid === "fighter") return "axe";
    return "sword";
  }
  function mugTag(person, foe, clsName) {
    return (
      '<img class="' +
      (clsName || "mug") +
      '" src="' +
      mugSrc(person, foe) +
      '"' +
      artOnError(person, foe, "mug") +
      ' alt="" draggable="false" />'
    );
  }
  function hpTrack(hp, max) {
    var pct = Math.round((hp / Math.max(1, max)) * 100);
    var low = pct <= 30 ? " low" : "";
    return (
      '<span class="hp-track"><span class="hp-fill' +
      low +
      '" style="width:' +
      pct +
      '%"></span></span>'
    );
  }

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function rng() {
    return C.createRng();
  }

  function showScreen(id) {
    $all(".screen").forEach(function (el) {
      el.classList.toggle("active", el.id === id);
    });
  }

  function toast(msg) {
    var el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("show");
    }, 2400);
  }

  function hasSave() {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch (e) {
      return false;
    }
  }
  function save() {
    try {
      if (state) {
        state.lang = I18n.getLang();
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      }
    } catch (e) {}
  }
  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return migrateSave(JSON.parse(raw));
    } catch (e) {
      return null;
    }
  }

  function dungeonIds() {
    return (D.DUNGEON_ORDER && D.DUNGEON_ORDER.length) ? D.DUNGEON_ORDER.slice() : ["d1", "d2"];
  }
  function emptyDungeonTimes() {
    var o = {}, i, ids = dungeonIds();
    for (i = 0; i < ids.length; i++) o[ids[i]] = 0;
    return o;
  }
  function migrateDungeonTimes(raw) {
    var o = emptyDungeonTimes();
    if (typeof raw === "number") {
      o.d1 = raw;
      return o;
    }
    if (raw && typeof raw === "object") {
      dungeonIds().forEach(function (id) {
        if (typeof raw[id] === "number") o[id] = raw[id];
      });
    }
    return o;
  }
  function makePlayerId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    var i, s = "", hex = "0123456789abcdef";
    for (i = 0; i < 32; i++) s += hex.charAt(Math.floor(Math.random() * 16));
    return s.slice(0, 8) + "-" + s.slice(8, 12) + "-4" + s.slice(13, 16) + "-a" + s.slice(17, 20) + "-" + s.slice(20, 32);
  }
  function seasonIndexAt(ms) {
    var epoch = D.SEASON_EPOCH_MS || Date.UTC(2025, 11, 31, 16, 0, 0);
    var idx = Math.floor(((ms || Date.now()) - epoch) / (D.ARENA_SEASON_MS || 1296000000));
    if (idx < 0) idx = 0;
    return idx;
  }
  function seasonStartAt(idx) {
    var epoch = D.SEASON_EPOCH_MS || Date.UTC(2025, 11, 31, 16, 0, 0);
    return epoch + idx * (D.ARENA_SEASON_MS || 1296000000);
  }
  function newUnit(name, classId, id) {
    var cls = D.CLASSES[classId];
    var b = cls.bases;
    var start = cls.startingWeapon;
    var uses = {};
    uses[start] = D.weaponMaxUses(start);
    return {
      id: id || classId,
      name: name || cls.name,
      classId: classId,
      className: cls.name,
      level: 1,
      exp: 0,
      maxHp: b.hp,
      hp: b.hp,
      str: b.str,
      skill: b.skill,
      spd: b.spd,
      luck: b.luck,
      def: b.def,
      weaponId: start,
      weapons: [start],
      weaponUses: uses,
      promoted: false,
      dungeonLockUntil: emptyDungeonTimes(),
      dungeonFoughtUntil: emptyDungeonTimes(),
      arenaFoughtUntil: 0,
      classBonusApplied: true
    };
  }

  function unitFromSave(raw, fallbackId) {
    var classId = raw && D.CLASSES[raw.classId] ? raw.classId : fallbackId;
    if (!classId || !D.CLASSES[classId]) return null;
    var cls = D.CLASSES[classId];
    var givenId = raw && raw.id ? String(raw.id).slice(0, 32) : "";
    var u = newUnit(cls.name, classId, givenId || classId);
    if (!raw) return u;
    if (raw.name) u.name = String(raw.name).slice(0, 8);
    if (typeof raw.level === "number") u.level = C.clamp(Math.floor(raw.level), 1, D.LEVEL_CAP);
    if (typeof raw.exp === "number") u.exp = Math.max(0, Math.floor(raw.exp));
    ["maxHp", "hp", "str", "skill", "spd", "luck", "def"].forEach(function (k) {
      if (typeof raw[k] === "number") u[k] = Math.max(0, Math.floor(raw[k]));
    });
    if (raw.weaponId && D.WEAPONS[raw.weaponId]) u.weaponId = raw.weaponId;
    if (Array.isArray(raw.weapons)) {
      u.weapons = raw.weapons.filter(function (id) { return !!D.WEAPONS[id]; });
      if (!u.weapons.length) u.weapons = [cls.startingWeapon];
      if (u.weapons.indexOf(u.weaponId) === -1) u.weaponId = u.weapons[0];
    }
    maybeSwapStartingIron(u);
    u.weaponUses = normalizeWeaponUses(u, raw && raw.weaponUses);
    if (u.maxHp < 1) u.maxHp = cls.bases.hp;
    if (u.hp > u.maxHp) u.hp = u.maxHp;
    if (u.level >= D.LEVEL_CAP) u.exp = 0;
    u.promoted = !!raw.promoted;
    u.dungeonLockUntil = migrateDungeonTimes(raw.dungeonLockUntil);
    u.dungeonFoughtUntil = migrateDungeonTimes(raw.dungeonFoughtUntil);
    u.arenaFoughtUntil = typeof raw.arenaFoughtUntil === "number" ? raw.arenaFoughtUntil : 0;
    u.classBonusApplied = !!raw.classBonusApplied;
    if (!u.classBonusApplied) applyClassBonusOnce(u);
    ensureLanceLoadout(u);
    if (!u.weaponUses[u.weaponId] && u.weaponUses[u.weaponId] !== 0) {
      u.weaponUses[u.weaponId] = D.weaponMaxUses(u.weaponId);
    }
    return u;
  }

  function maybeSwapStartingIron(u) {
    if (!u) return;
    var iron = D.CLASS_START_IRON && D.CLASS_START_IRON[u.classId];
    var wood = D.CLASSES[u.classId] && D.CLASSES[u.classId].startingWeapon;
    if (!iron || !wood) return;
    if (u.weapons.length === 1 && u.weapons[0] === iron) {
      u.weapons = [wood];
      u.weaponId = wood;
    }
  }

  function normalizeWeaponUses(u, saved) {
    var out = {};
    var i, id, max;
    for (i = 0; i < u.weapons.length; i++) {
      id = u.weapons[i];
      max = D.weaponMaxUses(id);
      if (saved && typeof saved[id] === "number") out[id] = C.clamp(Math.floor(saved[id]), 0, max);
      else out[id] = max;
    }
    return out;
  }

  function ensureLanceLoadout(u) {
    if (!u || (u.classId !== "cavalier" && u.classId !== "armor")) return;
    var w = D.WEAPONS[u.weaponId];
    if (w && w.type === "lance") return;
    var start = D.CLASSES[u.classId].startingWeapon;
    if (u.weapons.indexOf(start) === -1) u.weapons.push(start);
    u.weaponId = start;
    if (!u.weaponUses) u.weaponUses = {};
    if (u.weaponUses[start] == null) u.weaponUses[start] = D.weaponMaxUses(start);
  }

  function emptyState() {
    return {
      party: D.PARTY_ORDER.map(function (id) { return newUnit(D.CLASSES[id].name, id, id); }),
      activeId: D.PARTY_ORDER[0],
      gold: D.START_GOLD,
      items: { tonic: 0, promoBook: 0, challengeWrit: 0 },
      day: 1,
      period: 0,
      quests: [],
      guildQuest: null,
      arenaRoster: generateArenaRoster(1, 1),
      introShown: false,
      restedAtInn: false,
      lastGoldTick: Date.now(),
      economyRev: D.ECONOMY_REV,
      guildId: null,
      guildPoints: emptyGuildPoints(),
      arenaPoints: 0,
      guildJoinedAt: 0,
      arenaSeasonStart: seasonStartAt(seasonIndexAt(Date.now())),
      arenaBoard: generateArenaBoard(seasonStartAt(seasonIndexAt(Date.now()))),
      arenaPrizeNote: null,
      playerId: makePlayerId(),
      playerName: "",
      goldSpentThisSeason: 0,
      lastPrizeSeason: seasonIndexAt(Date.now()) - 1,
      seasonClock: "global"
    };
  }

  function migrateSave(data) {
    if (!data || typeof data !== "object") return null;
    try {
      var party = [];
      var usedIds = {};
      var haveClass = {};
      var i, u, id, src;
      if (Array.isArray(data.party)) {
        for (i = 0; i < data.party.length; i++) {
          src = data.party[i];
          u = unitFromSave(src, src && src.classId);
          if (!u) continue;
          if (!u.id || usedIds[u.id]) u.id = allocUnitId(u.classId, usedIds);
          usedIds[u.id] = true;
          haveClass[u.classId] = true;
          party.push(u);
        }
      }
      if (data.player && data.player.classId) {
        u = unitFromSave(data.player, data.player.classId);
        if (u && !haveClass[u.classId]) {
          if (!u.id || usedIds[u.id]) u.id = allocUnitId(u.classId, usedIds);
          usedIds[u.id] = true;
          haveClass[u.classId] = true;
          party.push(u);
        }
      }
      for (i = 0; i < D.PARTY_ORDER.length; i++) {
        id = D.PARTY_ORDER[i];
        if (haveClass[id]) continue;
        u = newUnit(D.CLASSES[id].name, id, allocUnitId(id, usedIds));
        usedIds[u.id] = true;
        haveClass[id] = true;
        party.push(u);
      }
      if (!party.length) return null;
      for (i = 0; i < party.length; i++) ensureLanceLoadout(party[i]);

      var items = { tonic: 0, promoBook: 0, challengeWrit: 0 };
      src = data.items || (data.player && data.player.items) || {};
      ["tonic", "promoBook", "challengeWrit"].forEach(function (k) {
        if (typeof src[k] === "number" && src[k] > 0) items[k] = Math.floor(src[k]);
      });

      var activeId = resolveActiveId(data.activeId, party);
      if (!activeId && data.player && data.player.classId) {
        activeId = resolveActiveId(data.player.classId, party);
      }
      if (!activeId) activeId = party[0].id;

      var day = typeof data.day === "number" ? Math.max(1, Math.floor(data.day)) : 1;
      var period = typeof data.period === "number" ? C.clamp(Math.floor(data.period), 0, 2) : 0;
      var lastTick = typeof data.lastGoldTick === "number" ? data.lastGoldTick : Date.now();

      var gold = D.START_GOLD;
      if (typeof data.gold === "number" && data.gold > gold) gold = data.gold;
      if (gold < 0) gold = 0;

      var ret = {
        party: party,
        activeId: activeId,
        gold: gold,
        items: items,
        day: day,
        period: period,
        quests: Array.isArray(data.quests) ? data.quests : [],
        guildQuest: data.guildQuest || null,
        arenaRoster: Array.isArray(data.arenaRoster) ? data.arenaRoster : generateArenaRoster(day, partyMaxOf(party)),
        introShown: !!data.introShown,
        restedAtInn: !!data.restedAtInn,
        lastGoldTick: lastTick,
        economyRev: D.ECONOMY_REV,
        guildId: data.guildId && D.GUILDS[data.guildId] ? data.guildId : null,
        guildPoints: normalizeGuildPoints(data.guildPoints),
        arenaPoints: typeof data.arenaPoints === "number" ? Math.max(0, Math.floor(data.arenaPoints)) : 0,
        guildJoinedAt: typeof data.guildJoinedAt === "number" ? data.guildJoinedAt : 0,
        arenaSeasonStart: typeof data.arenaSeasonStart === "number" ? data.arenaSeasonStart : seasonStartAt(seasonIndexAt(Date.now())),
        arenaBoard: boardHasGuilds(data.arenaBoard) ? data.arenaBoard : generateArenaBoard(data.arenaSeasonStart || Date.now()),
        arenaPrizeNote: data.arenaPrizeNote || null,
        playerId: typeof data.playerId === "string" && data.playerId ? String(data.playerId).slice(0, 64) : makePlayerId(),
        playerName: typeof data.playerName === "string" ? String(data.playerName).slice(0, 16) : "",
        goldSpentThisSeason: typeof data.goldSpentThisSeason === "number" ? Math.max(0, data.goldSpentThisSeason) : 0,
        lastPrizeSeason: typeof data.lastPrizeSeason === "number" ? Math.floor(data.lastPrizeSeason) : null,
        seasonClock: data.seasonClock === "global" ? "global" : ""
      };
      return ret;
    } catch (e) {
      return null;
    }
  }

  function allocUnitId(classId, used) {
    used = used || {};
    if (!used[classId]) return classId;
    var n = 2, id;
    do {
      id = classId + "-" + n;
      n += 1;
    } while (used[id]);
    return id;
  }

  function resolveActiveId(activeId, party) {
    var i;
    if (!party || !party.length) return "";
    if (activeId) {
      for (i = 0; i < party.length; i++) if (party[i].id === activeId) return party[i].id;
      for (i = 0; i < party.length; i++) if (party[i].classId === activeId) return party[i].id;
    }
    return party[0].id;
  }

  function effectiveLevel(u) {
    var lv = u && u.level ? u.level : 1;
    if (u && u.promoted) lv += 20;
    return lv;
  }

  function partyGroups(list) {
    var src = list || (state && state.party) || [];
    var map = {};
    var i, u, cid, groups = [], seen = {};
    for (i = 0; i < src.length; i++) {
      u = src[i];
      cid = u.classId;
      if (!map[cid]) map[cid] = [];
      map[cid].push(u);
    }
    for (i = 0; i < D.PARTY_ORDER.length; i++) {
      cid = D.PARTY_ORDER[i];
      if (map[cid] && map[cid].length) {
        groups.push({ classId: cid, units: map[cid] });
        seen[cid] = true;
      }
    }
    for (cid in map) {
      if (Object.prototype.hasOwnProperty.call(map, cid) && !seen[cid]) {
        groups.push({ classId: cid, units: map[cid] });
      }
    }
    return groups;
  }

  function usesOf(u, weaponId) {
    var id = weaponId || (u && u.weaponId);
    if (!id) return 0;
    var max = D.weaponMaxUses(id);
    if (u && u.weaponUses && typeof u.weaponUses[id] === "number") {
      return C.clamp(Math.floor(u.weaponUses[id]), 0, max || Math.floor(u.weaponUses[id]));
    }
    return max;
  }

  function setUses(u, weaponId, n) {
    if (!u || !weaponId) return;
    if (!u.weaponUses) u.weaponUses = {};
    var max = D.weaponMaxUses(weaponId);
    u.weaponUses[weaponId] = C.clamp(Math.floor(n), 0, max || Math.floor(n));
  }

  function grantWeapon(u, weaponId) {
    if (!u || !D.WEAPONS[weaponId]) return false;
    if (u.weapons.indexOf(weaponId) === -1) {
      u.weapons.push(weaponId);
      setUses(u, weaponId, D.weaponMaxUses(weaponId));
    } else if (!u.weaponUses || u.weaponUses[weaponId] == null) {
      setUses(u, weaponId, D.weaponMaxUses(weaponId));
    }
    return true;
  }

  function isWeaponBroken(u, weaponId) {
    var id = weaponId || (u && u.weaponId);
    if (!u || !id) return false;
    return usesOf(u, id) <= 0;
  }

  function copyUnitWeapon(u, weaponId) {
    var id = weaponId || (u && u.weaponId);
    if (!id) return null;
    return D.copyWeapon(id, usesOf(u, id));
  }

  function assertUsableWeapon(u) {
    if (!u || !u.weaponId || !D.WEAPONS[u.weaponId]) {
      toast(t("toast.noWep"));
      return false;
    }
    if (isWeaponBroken(u)) {
      toast(t("toast.brokenWep"));
      return false;
    }
    return true;
  }

  function syncUsesFromFighter(person, fighter) {
    if (!person || !fighter || !fighter.weapon || !fighter.weapon.id) return;
    if (typeof fighter.weapon.uses !== "number") return;
    setUses(person, fighter.weapon.id, fighter.weapon.uses);
  }

  function partyMaxOf(party) {
    var m = 1, i;
    for (i = 0; i < party.length; i++) if (party[i].level > m) m = party[i].level;
    return m;
  }
  function active() {
    var i, u;
    if (!state || !state.party || !state.party.length) return null;
    for (i = 0; i < state.party.length; i++) {
      if (state.party[i].id === state.activeId) return state.party[i];
    }
    for (i = 0; i < state.party.length; i++) {
      if (state.party[i].classId === state.activeId) {
        state.activeId = state.party[i].id;
        return state.party[i];
      }
    }
    u = state.party[0];
    state.activeId = u.id;
    return u;
  }
  function partyMaxLevel() {
    return state ? partyMaxOf(state.party) : 1;
  }
  function formatGold(n) {
    var x = D.money(n);
    if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
    return x.toFixed(2);
  }
  function formatTick(n) {
    var x = Number(n);
    if (!isFinite(x) || x === 0) return "0";
    if (Math.abs(x) >= 1) return formatGold(x);
    var s = x.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    return s;
  }
  function goldBonus() {
    return 1 + (D.GOLD_BONUS || D.GUILD_GOLD_BONUS || 0.05);
    return 1;
  }
  function unitDaily(u) {
    return D.money(D.dailyIncome(effectiveLevel(u)) * goldBonus());
  }
  function unitTick(u) {
    return D.tickIncome(effectiveLevel(u)) * goldBonus();
  }
  function goldRate() {
    var n = 0, i;
    if (!state || !state.party) return 0;
    for (i = 0; i < state.party.length; i++) n += unitTick(state.party[i]);
    return n;
  }
  function goldPerDay() {
    var n = 0, i;
    if (!state || !state.party) return 0;
    for (i = 0; i < state.party.length; i++) n += unitDaily(state.party[i]);
    return D.money(n);
  }
  function paybackDays(level) {
    if (level >= (D.EFFECTIVE_LEVEL_CAP || 40)) return 0;
    var gain = (D.dailyIncome(level + 1) - D.dailyIncome(level)) * goldBonus();
    if (gain <= 0) return 0;
    return D.money(trainFee(level) / gain);
  }
  function trainFee(level) {
    return D.money(D.trainCost(level) * goldBonus());
  }
  function classBonusLine(classId) {
    var b = D.CLASSES[classId] && D.CLASSES[classId].bonus;
    var parts = [], i, k;
    if (!b) return "";
    for (i = 0; i < STAT_KEYS.length; i++) {
      k = STAT_KEYS[i];
      if (b[k]) parts.push(statLabel(k) + " +" + b[k]);
    }
    if (!parts.length) return "";
    return t("train.bonus", { bonus: parts.join("　") });
  }
  function applyClassBonusOnce(u) {
    var b, k, i;
    if (!u || u.classBonusApplied) return;
    b = D.CLASSES[u.classId] && D.CLASSES[u.classId].bonus;
    if (b) {
      for (i = 0; i < STAT_KEYS.length; i++) {
        k = STAT_KEYS[i];
        if (!b[k]) continue;
        if (k === "hp") {
          u.maxHp += b[k];
          u.hp += b[k];
        } else {
          u[k] += b[k];
        }
      }
    }
    u.classBonusApplied = true;
  }
  function healPartyFull() {
    var i, u;
    for (i = 0; i < state.party.length; i++) {
      u = state.party[i];
      u.hp = u.maxHp;
    }
  }
  function setActive(id) {
    var i, u;
    for (i = 0; i < state.party.length; i++) {
      u = state.party[i];
      if (u.id === id || u.classId === id) {
        state.activeId = u.id;
        renderHud();
        save();
        return;
      }
    }
  }

  /* ---------- 角色与日程 ---------- */
  function rollUnit(classId, level, roll, name, weaponId) {
    var cls = D.CLASSES[classId];
    var stats = {
      hp: cls.bases.hp,
      str: cls.bases.str,
      skill: cls.bases.skill,
      spd: cls.bases.spd,
      luck: cls.bases.luck,
      def: cls.bases.def
    };
    var lv;
    for (lv = 2; lv <= level; lv++) {
      var grown = C.applyLevelUp(stats, cls.growths, roll);
      stats = grown.after;
    }
    var wId = weaponId || cls.startingWeapon;
    return {
      name: name,
      classId: classId,
      className: cls.name,
      level: level,
      maxHp: stats.hp,
      hp: stats.hp,
      str: stats.str,
      skill: stats.skill,
      spd: stats.spd,
      luck: stats.luck,
      def: stats.def,
      weaponId: wId
    };
  }

  function shufflePick(arr, n, roll) {
    var copy = arr.slice();
    var i, j, t, out = [];
    for (i = copy.length - 1; i > 0; i--) {
      j = roll.int(0, i);
      t = copy[i];
      copy[i] = copy[j];
      copy[j] = t;
    }
    for (i = 0; i < n && i < copy.length; i++) out.push(copy[i]);
    return out;
  }

  function pickQuests(day) {
    var roll = C.createRng(C.seededRandom(day * 4243 + 3));
    return shufflePick(D.QUEST_POOL, 3, roll).map(function (q) {
      return {
        id: q.id,
        points: q.points,
        done: false
      };
    });
  }

  function steelFor(classId) {
    var t = D.CLASSES[classId].weaponType;
    if (t === "sword") return "steel-sword";
    if (t === "lance") return "steel-lance";
    if (t === "axe") return "steel-axe";
    return "steel-bow";
  }

  function generateGuildQuest(day, playerLevel) {
    var roll = C.createRng(C.seededRandom(day * 8191 + 99));
    var cid = D.CLASS_ORDER[roll.int(0, D.CLASS_ORDER.length - 1)];
    var lv = C.clamp(playerLevel + 1, 1, D.LEVEL_CAP);
    var names = D.ENEMY_NAMES[cid];
    var name = names[roll.int(0, names.length - 1)];
    var wId = lv >= 5 ? steelFor(cid) : D.CLASSES[cid].startingWeapon;
    var unit = rollUnit(cid, lv, roll, name, wId);
    return {
      points: D.GUILD_HUNT_POINTS,
      unit: unit,
      done: false
    };
  }

  function generateArenaRoster(day, playerLevel) {
    var roll = C.createRng(C.seededRandom(day * 10007 + 17));
    var levels = [
      Math.max(1, playerLevel - 1),
      playerLevel,
      Math.min(D.LEVEL_CAP, playerLevel + 1),
      Math.min(D.LEVEL_CAP, playerLevel + 2)
    ];
    var wagers = [50, 80, 110, 150];
    var used = {};
    var roster = [];
    var i;
    for (i = 0; i < 4; i++) {
      var cid = D.CLASS_ORDER[roll.int(0, D.CLASS_ORDER.length - 1)];
      var names = D.ENEMY_NAMES[cid];
      var name = names[roll.int(0, names.length - 1)];
      var guard = 0;
      while (used[name] && guard < 8) {
        name = names[roll.int(0, names.length - 1)];
        guard++;
      }
      used[name] = true;
      var lv = levels[i];
      var wId = lv >= 6 ? steelFor(cid) : D.CLASSES[cid].startingWeapon;
      var unit = rollUnit(cid, lv, roll, name, wId);
      var exp = C.clamp(50 + (lv - playerLevel) * 6, 40, 70);
      roster.push({ unit: unit, wager: wagers[i], exp: exp, fought: false });
    }
    return roster;
  }

  function generateArenaBoard(seed) {
    var roll = C.createRng(C.seededRandom((seed || Date.now()) + 7753));
    return D.GUILD_ORDER.map(function (id) {
      return { guildId: id, rate: 10 + roll.int(0, 10) };
    });
  }
  function boardHasGuilds(board) {
    return Array.isArray(board) && board.length === D.GUILD_ORDER.length &&
      board.every(function (n) { return n && n.guildId && D.GUILDS[n.guildId]; });
  }
  function emptyGuildPoints() {
    var o = {}, i;
    for (i = 0; i < D.GUILD_ORDER.length; i++) o[D.GUILD_ORDER[i]] = 0;
    return o;
  }
  function normalizeGuildPoints(src) {
    var o = emptyGuildPoints();
    var i, id;
    if (src && typeof src === "object") {
      for (i = 0; i < D.GUILD_ORDER.length; i++) {
        id = D.GUILD_ORDER[i];
        if (typeof src[id] === "number" && src[id] > 0) o[id] = Math.floor(src[id]);
      }
    }
    return o;
  }

  function startFresh() {
    state = emptyState();
    state.gold = D.START_GOLD;
    state.lastGoldTick = Date.now();
    save();
    enterTown(true);
  }

  function beginNewDay() {
    state.day += 1;
    state.period = 0;
    state.restedAtInn = false;
    state.quests = [];
    state.guildQuest = null;
    state.arenaRoster = generateArenaRoster(state.day, partyMaxLevel());
    renderHud();
    save();
  }

  function guildName(id) {
    return t("guild." + id + ".name");
  }
  function questName(id) {
    return t("quest." + id + ".name");
  }
  function questDesc(id) {
    return t("quest." + id + ".desc");
  }
  function currentGuildPoints() {
    if (!state || !state.guildId) return 0;
    if (!state.guildPoints) state.guildPoints = {};
    return state.guildPoints[state.guildId] || 0;
  }
  function currentPersonalPoints() {
    return state && typeof state.arenaPoints === "number" ? state.arenaPoints : 0;
  }
  function addGuildPoints(n) {
    if (!state || !state.guildId || !n) return 0;
    if (!state.guildPoints) state.guildPoints = {};
    state.guildPoints[state.guildId] = (state.guildPoints[state.guildId] || 0) + n;
    return n;
  }
  function addPersonalPoints(n) {
    if (!state || !n) return 0;
    state.arenaPoints = (state.arenaPoints || 0) + n;
    addGuildPoints(n);
    return n;
  }
  function guildSwitchLeft(now) {
    now = now || Date.now();
    if (!state || !state.guildId || !state.guildJoinedAt) return 0;
    var left = state.guildJoinedAt + (D.GUILD_LOCK_MS || 86400000) - now;
    return left > 0 ? left : 0;
  }
  function formatSeasonTime(ms) {
    if (ms < 0) ms = 0;
    var d = Math.floor(ms / 86400000);
    var h = Math.floor((ms % 86400000) / 3600000);
    var zh = I18n.getLang && String(I18n.getLang()).indexOf("zh") === 0;
    if (zh) {
      if (d <= 0) return h + " 小时";
      return d + " 天 " + h + " 小时";
    }
    if (d <= 0) return h + "h";
    return d + "d " + h + "h";
  }
  function npcPointsAt(npc, start, now) {
    var ms = now - start;
    if (ms < 0) ms = 0;
    if (ms > D.ARENA_SEASON_MS) ms = D.ARENA_SEASON_MS;
    return Math.floor((npc.rate || 0) * (ms / 86400000));
  }
  function guildNpcPoints(guildId, start, now) {
    var board = state.arenaBoard || [];
    var i, n, sum = 0;
    for (i = 0; i < board.length; i++) {
      n = board[i];
      if (n && n.guildId === guildId) sum += npcPointsAt(n, start, now);
    }
    return sum;
  }
  function leaderboardRows(atTime) {
    var now = atTime != null ? atTime : Date.now();
    var start = state.arenaSeasonStart || now;
    var rows = [];
    var i, id, pts;
    for (i = 0; i < D.GUILD_ORDER.length; i++) {
      id = D.GUILD_ORDER[i];
      pts = ((state.guildPoints && state.guildPoints[id]) || 0) + guildNpcPoints(id, start, now);
      rows.push({
        id: id,
        name: guildName(id),
        points: pts,
        you: state.guildId === id
      });
    }
    rows.sort(function (a, b) {
      if (b.points !== a.points) return b.points - a.points;
      if (a.you) return -1;
      if (b.you) return 1;
      return String(a.id).localeCompare(String(b.id));
    });
    return rows;
  }
  function playerRank(rows) {
    var i;
    if (!state || !state.guildId) return 0;
    for (i = 0; i < rows.length; i++) if (rows[i].you) return i + 1;
    return 0;
  }
  function playerDisplayName() {
    if (state && state.playerName && String(state.playerName).trim()) return String(state.playerName).trim();
    return t("board.defaultName");
  }
  function currentSeasonIndex() {
    return seasonIndexAt(Date.now());
  }
  function currentPlayerRecord(seasonIdx) {
    if (seasonIdx == null) seasonIdx = currentSeasonIndex();
    return {
      playerId: state.playerId,
      playerName: playerDisplayName(),
      personalPoints: currentPersonalPoints(),
      guildId: state.guildId || null,
      goldSpent: state.goldSpentThisSeason || 0,
      seasonIndex: seasonIdx,
      updatedAt: Date.now()
    };
  }
  var publishTimer = 0;
  function queuePublish() {
    if (!state) return;
    if (typeof Leaderboard === "undefined" || !Leaderboard.publish) return;
    clearTimeout(publishTimer);
    publishTimer = setTimeout(function () {
      if (!state) return;
      Leaderboard.publish(currentPlayerRecord());
    }, 1200);
  }
  function mergeSeasonRows(remoteRows, seasonIdx) {
    var rec = currentPlayerRecord(seasonIdx);
    var rows = [], i, found = false;
    remoteRows = remoteRows || [];
    for (i = 0; i < remoteRows.length; i++) {
      if (!remoteRows[i] || !remoteRows[i].playerId) continue;
      if (remoteRows[i].playerId === rec.playerId) {
        rows.push(rec);
        found = true;
      } else {
        rows.push(remoteRows[i]);
      }
    }
    if (!found) rows.push(rec);
    return rows;
  }
  function shareOfPot(pot, list, myId, ptsFn) {
    var total = 0, i, pts, raw, fl, rem, floors = [], bestI = 0, bestPts = -1, bestFrac = -1;
    pot = Math.max(0, Math.floor(pot));
    if (!list || !list.length || pot <= 0) return 0;
    for (i = 0; i < list.length; i++) total += Math.max(0, ptsFn(list[i]) || 0);
    if (total <= 0) return 0;
    rem = pot;
    for (i = 0; i < list.length; i++) {
      pts = Math.max(0, ptsFn(list[i]) || 0);
      raw = pot * pts / total;
      fl = Math.floor(raw);
      floors.push(fl);
      rem -= fl;
      if (pts > bestPts || (pts === bestPts && (raw - fl) > bestFrac)) {
        bestPts = pts;
        bestFrac = raw - fl;
        bestI = i;
      }
    }
    if (rem > 0) floors[bestI] += rem;
    for (i = 0; i < list.length; i++) if (list[i] && list[i].playerId === myId) return floors[i];
    return 0;
  }
  function computeSeasonPrizes(seasonIdx, remoteRows, remoteOk) {
    var rows = remoteOk ? mergeSeasonRows(remoteRows, seasonIdx) : [currentPlayerRecord(seasonIdx)];
    var my = currentPlayerRecord(seasonIdx);
    var personalGold = 0;
    var guildGold = 0;
    var pot = D.PERSONAL_PRIZE_POT || 1000000;
    var scorers = rows.filter(function (r) { return r && r.personalPoints > 0; });
    if (my.personalPoints > 0 && scorers.length) {
      personalGold = shareOfPot(pot, scorers, my.playerId, function (r) { return r.personalPoints; });
    }
    var spend = 0;
    rows.forEach(function (r) { if (r && r.goldSpent > 0) spend += r.goldSpent; });
    var gpot = Math.floor(spend * (D.GUILD_SPEND_RETURN || 0.9));
    var end = seasonStartAt(seasonIdx + 1);
    var guildRows = leaderboardRows(end);
    var rank = playerRank(guildRows);
    var joined = !!state.guildId;
    if (gpot > 0 && joined) {
      var shares = D.GUILD_PRIZE_SHARES || [0.7, 0.2, 0.1];
      var slice = rank >= 1 && rank <= 3 ? Math.floor(gpot * shares[rank - 1]) : 0;
      if (slice > 0) {
        var members = rows.filter(function (r) { return r && r.guildId === state.guildId; });
        if (members.length <= 1) guildGold = slice;
        else {
          var memPts = 0;
          members.forEach(function (r) { memPts += Math.max(0, r.personalPoints || 0); });
          if (memPts <= 0) guildGold = Math.floor(slice / members.length);
          else guildGold = shareOfPot(slice, members, my.playerId, function (r) { return r.personalPoints || 0; });
        }
      }
    }
    return { personalGold: personalGold, guildGold: guildGold, rank: rank, joined: joined };
  }
  function paySeasonAndReset(seasonIdx, prize) {
    if (prize.personalGold > 0) addGold(prize.personalGold, { prize: true });
    if (prize.guildGold > 0) addGold(prize.guildGold, { prize: true });
    state.arenaPrizeNote = {
      rank: prize.rank,
      joined: prize.joined,
      personalGold: prize.personalGold || 0,
      guildGold: prize.guildGold || 0
    };
    state.guildPoints = emptyGuildPoints();
    state.arenaPoints = 0;
    state.goldSpentThisSeason = 0;
    state.lastPrizeSeason = seasonIdx;
    var nextStart = seasonStartAt(seasonIdx + 1);
    state.arenaSeasonStart = nextStart;
    state.arenaBoard = generateArenaBoard(nextStart);
    state.seasonClock = "global";
  }
  var settleBusy = false;
  function settleArenaSeason(then) {
    if (!state) {
      if (then) then();
      return;
    }
    if (settleBusy) {
      if (then) then();
      return;
    }
    if (!boardHasGuilds(state.arenaBoard)) {
      state.arenaBoard = generateArenaBoard(state.arenaSeasonStart || Date.now());
    }
    state.guildPoints = normalizeGuildPoints(state.guildPoints);
    if (typeof state.arenaPoints !== "number") state.arenaPoints = 0;
    if (!state.playerId) state.playerId = makePlayerId();
    var now = Date.now();
    var idx = seasonIndexAt(now);
    var needLocalSettle = false;
    if (state.seasonClock !== "global") {
      if (typeof state.arenaSeasonStart === "number" && now - state.arenaSeasonStart >= D.ARENA_SEASON_MS) {
        needLocalSettle = true;
      }
      state.seasonClock = "global";
      if (typeof state.lastPrizeSeason !== "number") state.lastPrizeSeason = idx - 1;
    }
    if (typeof state.lastPrizeSeason !== "number") state.lastPrizeSeason = idx - 1;
    var payUntil = idx - 1;
    var due = [];
    if (needLocalSettle) due.push({ local: true, index: state.lastPrizeSeason + 1 });
    var k;
    for (k = state.lastPrizeSeason + 1; k <= payUntil; k++) due.push({ local: false, index: k });
    if (!due.length) {
      state.arenaSeasonStart = seasonStartAt(idx);
      if (then) then();
      return;
    }
    function settleNext() {
      if (!due.length) {
        state.arenaSeasonStart = seasonStartAt(seasonIndexAt(Date.now()));
        settleBusy = false;
        queuePublish();
        save();
        if (then) then();
        return;
      }
      var job = due.shift();
      var seasonIdx = job.index;
      function apply(rows, ok) {
        var prize = computeSeasonPrizes(seasonIdx, rows, ok);
        paySeasonAndReset(job.local ? idx - 1 : seasonIdx, prize);
        settleNext();
      }
      if (job.local) {
        apply([], false);
      } else if (typeof Leaderboard !== "undefined" && Leaderboard.fetchDoc) {
        Leaderboard.fetchDoc(function (doc, ok) {
          apply(Leaderboard.rowsForSeason(doc, seasonIdx), ok);
        });
      } else {
        apply([], false);
      }
    }
    settleBusy = true;
    settleNext();
  }
  function showArenaPrizeNote() {
    var note = state && state.arenaPrizeNote;
    if (!note) return false;
    state.arenaPrizeNote = null;
    save();
    var guildLine;
    if (note.guildGold > 0) {
      guildLine = (note.rank ? t("arena.prizeWin", { rank: note.rank, gold: formatGold(note.guildGold) }) + " " : "") +
        t("arena.prizeGuildShare", { gold: formatGold(note.guildGold) });
    } else if (note.joined === false || !note.rank) {
      guildLine = t("arena.prizeNone");
    } else {
      guildLine = t("arena.prizeMiss", { rank: note.rank });
    }
    var personalLine = (note.personalGold > 0)
      ? t("arena.prizePersonal", { gold: formatGold(note.personalGold) })
      : t("arena.prizePersonalNone");
    var body =
      "<p>" + t("arena.seasonOver") + "</p><p>" +
      personalLine +
      "</p><p>" +
      guildLine +
      "</p>" +
      actions({ "arena-after-prize": t("ui.ok") });
    openModal(panel(t("arena.board"), body, "narrow"));
    return true;
  }
  function makeArenaFoe() {
    var p = active();
    var roll = rng();
    var cid = D.CLASS_ORDER[roll.int(0, D.CLASS_ORDER.length - 1)];
    var names = D.ENEMY_NAMES[cid];
    var name = names[roll.int(0, names.length - 1)];
    var lv = C.clamp(p.level + roll.int(-1, 2), 1, D.LEVEL_CAP);
    var wId = lv >= 6 ? steelFor(cid) : D.CLASSES[cid].startingWeapon;
    return rollUnit(cid, lv, roll, name, wId);
  }

  /* ---------- 成长与物品 ---------- */
  function gainExp(amount) {
    return gainExpFor(active(), amount);
  }

  function gainExpFor(p, amount) {
    var events = [];
    if (!p || p.level >= D.LEVEL_CAP || amount <= 0) return events;
    p.exp += amount;
    var roll = rng();
    var growths = D.CLASSES[p.classId].growths;
    while (p.exp >= D.EXP_PER_LEVEL && p.level < D.LEVEL_CAP) {
      p.exp -= D.EXP_PER_LEVEL;
      p.level += 1;
      var unit = { hp: p.maxHp, str: p.str, skill: p.skill, spd: p.spd, luck: p.luck, def: p.def };
      var r = C.applyLevelUp(unit, growths, roll);
      r.unitId = p.id || p.classId;
      p.maxHp = r.after.hp;
      p.hp += r.hpGain;
      p.str = r.after.str;
      p.skill = r.after.skill;
      p.spd = r.after.spd;
      p.luck = r.after.luck;
      p.def = r.after.def;
      events.push(r);
    }
    if (p.level >= D.LEVEL_CAP) p.exp = 0;
    return events;
  }

  function addGold(n, opts) {
    var before = state.gold;
    var g = before + n;
    if (g < 0) g = 0;
    state.gold = g;
    var actual = g - before;
    if (actual < 0 && !(opts && (opts.prize || opts.skipSpend))) {
      state.goldSpentThisSeason = (state.goldSpentThisSeason || 0) + (-actual);
    }
    return actual;
  }

  function grantOneLevel() {
    var p = active();
    if (p.level >= D.LEVEL_CAP) return [];
    p.level += 1;
    var unit = { hp: p.maxHp, str: p.str, skill: p.skill, spd: p.spd, luck: p.luck, def: p.def };
    var r = C.applyLevelUp(unit, D.CLASSES[p.classId].growths, rng());
    p.maxHp = r.after.hp;
    p.hp += r.hpGain;
    p.str = r.after.str;
    p.skill = r.after.skill;
    p.spd = r.after.spd;
    p.luck = r.after.luck;
    p.def = r.after.def;
    if (p.level >= D.LEVEL_CAP) p.exp = 0;
    return [r];
  }

  function canUseWeapon(weaponId, unit) {
    var w = D.WEAPONS[weaponId];
    var who = unit || active();
    var cls = who && D.CLASSES[who.classId];
    return !!(w && cls && w.type === cls.weaponType);
  }

  function currentWeapon() {
    var p = active();
    return copyUnitWeapon(p, p.weaponId);
  }

  function fighterFrom(person) {
    var w = person.weapon ? person.weapon : copyUnitWeapon(person, person.weaponId);
    var bonuses = { hit: 0, avoid: 0 };
    return {
      name: person.name,
      classId: person.classId || "",
      className: promotedNameOf(person) || person.className || (person.classId ? D.CLASSES[person.classId].name : ""),
      hp: person.hp,
      maxHp: person.maxHp,
      str: person.str,
      skill: person.skill,
      spd: person.spd,
      luck: person.luck,
      def: person.def,
      weapon: w,
      bonuses: bonuses
    };
  }

  function playerFighter(hpOverride) {
    var f = fighterFrom(active());
    if (hpOverride != null) f.hp = hpOverride;
    return f;
  }

  /* ---------- 地下城战败锁定（真实日历，Asia/Shanghai） ---------- */
  function shanghaiParts(ms) {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date(ms));
    var o = {};
    var i;
    for (i = 0; i < parts.length; i++) o[parts[i].type] = parts[i].value;
    return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, min: +o.minute };
  }

  /** 08:00 Asia/Shanghai = 00:00 UTC of the same calendar date (no DST). */
  function nextUnlockMs(fromMs) {
    var p = shanghaiParts(fromMs);
    var utcMidnight = Date.UTC(p.y, p.m - 1, p.d, 0, 0, 0);
    if (p.h < 8) return utcMidnight;
    return utcMidnight + 86400000;
  }

  function timeMap(u, key) {
    if (!u) return emptyDungeonTimes();
    if (!u[key] || typeof u[key] !== "object" || typeof u[key] === "number") {
      u[key] = migrateDungeonTimes(u[key]);
    }
    return u[key];
  }
  function timeAt(u, key, dungeonId) {
    var map = timeMap(u, key);
    return (map && dungeonId && typeof map[dungeonId] === "number") ? map[dungeonId] : 0;
  }
  function setTimeAt(u, key, dungeonId, ms) {
    var map = timeMap(u, key);
    if (!dungeonId) return;
    map[dungeonId] = ms;
  }
  function currentDungeonId() {
    if (dungeonRun && dungeonRun.dungeonId) return dungeonRun.dungeonId;
    return pendingDungeonId || "d1";
  }

  function clearLockIfDue(u, now) {
    if (!u) return false;
    now = now || Date.now();
    var map = timeMap(u, "dungeonLockUntil");
    var changed = false, healed = false, id;
    for (id in map) {
      if (!Object.prototype.hasOwnProperty.call(map, id)) continue;
      if (typeof map[id] === "number" && map[id] > 0 && map[id] <= now) {
        map[id] = 0;
        changed = true;
        healed = true;
      }
    }
    if (healed) u.hp = u.maxHp;
    return changed;
  }

  function clearFoughtIfDue(u, now) {
    if (!u) return false;
    now = now || Date.now();
    var map = timeMap(u, "dungeonFoughtUntil");
    var changed = false, id;
    for (id in map) {
      if (!Object.prototype.hasOwnProperty.call(map, id)) continue;
      if (typeof map[id] === "number" && map[id] > 0 && map[id] <= now) {
        map[id] = 0;
        changed = true;
      }
    }
    if (typeof u.arenaFoughtUntil === "number" && u.arenaFoughtUntil > 0 && u.arenaFoughtUntil <= now) {
      u.arenaFoughtUntil = 0;
      changed = true;
    }
    return changed;
  }

  function refreshLocks(now) {
    now = now || Date.now();
    var changed = false, i;
    if (!state || !state.party) return false;
    for (i = 0; i < state.party.length; i++) {
      if (clearLockIfDue(state.party[i], now)) changed = true;
      if (clearFoughtIfDue(state.party[i], now)) changed = true;
    }
    return changed;
  }

  function isArenaFought(u, now) {
    now = now || Date.now();
    if (!u) return false;
    clearFoughtIfDue(u, now);
    return !!(typeof u.arenaFoughtUntil === "number" && u.arenaFoughtUntil > now);
  }

  function markArenaFought(u, now) {
    if (!u) return;
    now = now || Date.now();
    u.arenaFoughtUntil = nextUnlockMs(now);
  }

  function clearArenaFought(u) {
    if (!u) return;
    u.arenaFoughtUntil = 0;
  }

  function isDungeonLocked(u, now, dungeonId) {
    now = now || Date.now();
    clearLockIfDue(u, now);
    dungeonId = dungeonId || currentDungeonId();
    return !!(u && timeAt(u, "dungeonLockUntil", dungeonId) > now);
  }

  function isDungeonFought(u, now, dungeonId) {
    now = now || Date.now();
    clearFoughtIfDue(u, now);
    dungeonId = dungeonId || currentDungeonId();
    return !!(u && timeAt(u, "dungeonFoughtUntil", dungeonId) > now);
  }

  function canDungeonFight(u, now, dungeonId) {
    now = now || Date.now();
    dungeonId = dungeonId || currentDungeonId();
    return !!(u && u.hp > 0 && !isDungeonLocked(u, now, dungeonId) && !isDungeonFought(u, now, dungeonId));
  }

  function lockUnit(u, now, dungeonId) {
    if (!u) return;
    now = now || Date.now();
    dungeonId = dungeonId || currentDungeonId();
    setTimeAt(u, "dungeonLockUntil", dungeonId, nextUnlockMs(now));
  }

  function markDungeonFought(u, now, dungeonId) {
    if (!u) return;
    now = now || Date.now();
    dungeonId = dungeonId || currentDungeonId();
    setTimeAt(u, "dungeonFoughtUntil", dungeonId, nextUnlockMs(now));
  }

  function lockoutLabel(u, dungeonId) {
    dungeonId = dungeonId || currentDungeonId();
    if (!isDungeonLocked(u, Date.now(), dungeonId)) return "";
    var until = timeAt(u, "dungeonLockUntil", dungeonId);
    var p = shanghaiParts(until);
    var nowP = shanghaiParts(Date.now());
    if (p.y === nowP.y && p.m === nowP.m && p.d === nowP.d) return t("lock.today");
    return t("lock.tomorrow");
  }

  function dungeonLimitLabel(u, dungeonId) {
    dungeonId = dungeonId || currentDungeonId();
    if (isDungeonLocked(u, Date.now(), dungeonId)) return lockoutLabel(u, dungeonId);
    if (isDungeonFought(u, Date.now(), dungeonId)) return t("lock.fought");
    if (u && u.hp <= 0) return t("lock.noHp");
    return "";
  }

  function dungeonTip(u) {
    var parts = [], i, id, ids = dungeonIds(), lab;
    for (i = 0; i < ids.length; i++) {
      id = ids[i];
      lab = dungeonLimitLabel(u, id);
      if (lab) parts.push(t("dungeon." + id) + " " + lab);
    }
    if (isArenaFought(u)) parts.push(t("arena.fought"));
    return parts.join("　");
  }

  function unitById(id) {
    var i;
    if (!state) return null;
    for (i = 0; i < state.party.length; i++) {
      if (state.party[i].id === id) return state.party[i];
    }
    for (i = 0; i < state.party.length; i++) {
      if (state.party[i].classId === id) return state.party[i];
    }
    return null;
  }

  /* ---------- 时间、昏厥 ---------- */
  function periodName() {
    return t("period." + ((state && state.period) || 0));
  }

  function advancePeriod(then) {
    if (state.period >= 2) {
      beginNewDay();
      toast(t("day.wrap"));
    } else {
      state.period += 1;
      save();
      renderHud();
    }
    if (then) then();
  }

  function faint(reason, goldPenalty) {
    closeBattle();
    var p = active();
    var penalty = 0;
    if (goldPenalty) {
      penalty = Math.min(state.gold, Math.max(30, Math.floor(state.gold * 0.15)));
      addGold(-penalty);
    }
    p.hp = Math.max(1, Math.ceil(p.maxHp / 2));
    beginNewDay();
    lastFaint = { reason: reason, penalty: penalty, day: state.day };
    renderFaint();
    save();
  }

  /* ---------- 界面：HUD / 面板 ---------- */
  function renderHud() {
    if (!state) return;
    if (refreshLocks()) save();
    var p = active();
    var cls = D.CLASSES[p.classId];
    var hpPct = Math.round((p.hp / Math.max(1, p.maxHp)) * 100);
    var expLine =
      p.level >= D.LEVEL_CAP
        ? t("hud.levelCap")
        : "EXP " + p.exp + "/" + D.EXP_PER_LEVEL;
    var rate = goldRate();
    var dayGold = goldPerDay();
    var incomeLine = t("hud.income", { rate: formatTick(rate) }) + "　" + t("hud.incomeDay", { day: formatGold(dayGold) });
    var roster = partyGroups(state.party).map(function (g) {
      var cells = g.units.map(function (u) {
        var tip = dungeonTip(u);
        var down = u.hp <= 0;
        var tag = down ? t("hud.defeated") : "";
        var hpLabel = tag ? tag : (u.hp + "/" + u.maxHp);
        return (
          '<button type="button" class="hud-mug' +
          (u.id === p.id ? " selected" : "") +
          (down || fought ? " locked" : "") +
          '" data-act="select-unit" data-id="' +
          esc(u.id) +
          '" title="' +
          esc(displayName(u)) +
          "　" + esc(classNameOf(u)) +
          "　Lv." + u.level +
          "　" + u.hp + "/" + u.maxHp +
          (tip ? "　" + tip : "") +
          '">' +
          mugTag(u, false, "mug") +
          '<span class="lv">Lv.' + u.level + (u.promoted ? "★" : "") + "</span>" +
          '<span class="hp' + (tag ? " lock" : "") + '">' +
          esc(hpLabel) +
          "</span></button>"
        );
      }).join("");
      return (
        '<div class="hud-party-group"><div class="hud-party-head"><span>' +
        esc(t("class." + g.classId)) +
        '</span><span class="cnt">×' +
        g.units.length +
        '</span></div><div class="hud-mug-grid">' +
        cells +
        "</div></div>"
      );
    }).join("");
    $("#hud").innerHTML =
      '<div class="hud-unit">' +
      mugTag(p, false) +
      '<div class="hud-unit-info"><div class="hud-name">' +
      esc(displayName(p)) +
      '</div><div class="hud-class">' +
      classNameOf(p) +
      "　Lv." +
      p.level +
      '</div><div class="hud-bar hp' +
      (hpPct <= 30 ? " warn" : "") +
      '"><span>HP</span>' +
      hpTrack(p.hp, p.maxHp) +
      "<span>" +
      p.hp +
      "/" +
      p.maxHp +
      '</span></div><div class="hud-exp">' +
      expLine +
      "</div></div></div>" +
      '<div class="hud-cmd">' +
      '<button type="button" class="fe-cmd" data-act="bag">' +
      t("ui.bag") +
      '</button>' +
      '<button type="button" class="fe-cmd" data-act="stats">' +
      t("ui.stats") +
      '</button></div>' +
      '<div class="hud-side"><div class="hud-meta"><div class="place">' +
      (TownMap.currentMap && TownMap.currentMap() === "wilds" ? t("place.wildsMap") : t("place.town")) +
      "</div><div>" +
      t("hud.day", { day: pDay() }) +
      "　" +
      periodName() +
      '</div><div class="gold">' +
      t("hud.gold") +
      "　" +
      formatGold(state.gold) +
      '</div><div class="income">' +
      incomeLine +
      '</div><div>' +
      t("hud.personal", { points: currentPersonalPoints() }) +
      '</div><div>' +
      (state.guildId
        ? t("hud.points", { points: currentGuildPoints() })
        : t("hud.noGuild")) +
      '</div>' +
      langSwitcher(true) +
      '<span id="gold-pop" class="gold-pop" hidden></span></div>' +
      '<div class="hud-party" title="' +
      esc(t("hud.pickUnit")) +
      '"><div class="hud-party-title">' +
      esc(t("hud.party")) +
      "</div><div class=\"hud-party-list\">" +
      roster +
      "</div></div></div>";
  }

  function showGoldPop(amount) {
    var el = $("#gold-pop");
    if (!el) return;
    el.hidden = false;
    el.textContent = amount > 0 ? "+" + formatGold(amount) : "+" + formatGold(0);
    el.classList.remove("show");
    void el.offsetWidth;
    el.classList.add("show");
    clearTimeout(goldPopTimer);
    goldPopTimer = setTimeout(function () {
      if (el) {
        el.classList.remove("show");
        el.hidden = true;
      }
    }, 1300);
  }

  function incomePaused() {
    if (!state) return true;
    var town = $("#screen-town");
    if (!town || !town.classList.contains("active")) return true;
    if (battleBusy) return true;
    var battle = $("#battle");
    if (battle && !battle.classList.contains("hidden")) return true;
    var modal = $("#modal");
    if (modal && !modal.classList.contains("hidden") && modal.dataset.lock === "1") return true;
    return false;
  }

  function applyIncomeTicks(ticks, showPop) {
    if (!state || ticks <= 0) return 0;
    var gained = addGold(goldRate() * ticks);
    renderHud();
    if (showPop && gained > 0) showGoldPop(gained);
    var view = $("#modal") && $("#modal").dataset.view;
    if (view === "statue") openStatue(false);
    else if (view === "bank") openBank();
    save();
    return gained;
  }

  function catchUpIncome() {
    if (!state) return;
    var now = Date.now();
    var last = typeof state.lastGoldTick === "number" ? state.lastGoldTick : now;
    if (last > now) last = now;
    var ticks = Math.floor((now - last) / D.GOLD_TICK_MS);
    if (ticks <= 0) return;
    var capped = ticks > D.TICKS_PER_DAY;
    if (capped) ticks = D.TICKS_PER_DAY;
    applyIncomeTicks(ticks, ticks > 0);
    state.lastGoldTick = capped ? now : last + ticks * D.GOLD_TICK_MS;
    save();
  }

  function incomeLoop() {
    if (!state) return;
    settleArenaSeason();
    var now = Date.now();
    if (incomePaused()) {
      if (incomePauseAt) state.lastGoldTick += now - incomePauseAt;
      incomePauseAt = now;
      return;
    }
    if (incomePauseAt) {
      state.lastGoldTick += now - incomePauseAt;
      incomePauseAt = 0;
    }
    var last = typeof state.lastGoldTick === "number" ? state.lastGoldTick : now;
    var ticks = Math.floor((now - last) / D.GOLD_TICK_MS);
    if (ticks <= 0) return;
    if (ticks > D.TICKS_PER_DAY) ticks = D.TICKS_PER_DAY;
    applyIncomeTicks(ticks, true);
    state.lastGoldTick = last + ticks * D.GOLD_TICK_MS;
    save();
  }

  function startIncomeTimer() {
    if (incomeTimer) return;
    incomeTimer = setInterval(incomeLoop, 250);
  }

  function pDay() {
    return state.day;
  }

  function panel(title, body, extraClass) {
    return (
      '<div class="panel' +
      (extraClass ? " " + extraClass : "") +
      '"><h3>' +
      title +
      "</h3>" +
      body +
      "</div>"
    );
  }

  function actions(map) {
    var html = '<div class="actions">';
    Object.keys(map).forEach(function (act) {
      var label = map[act];
      var disabled = false;
      var text = label;
      if (typeof label === "object") {
        text = label.label;
        disabled = !!label.disabled;
      }
      html +=
        '<button type="button" class="btn' +
        (act === "close" || act === "leave" ? " btn-ghost" : act.indexOf("confirm") === 0 || act === "fight" || act === "enter-town" || act === "train-up" ? " btn-gold" : "") +
        '" data-act="' +
        esc(act) +
        '"' +
        (disabled ? " disabled" : "") +
        ">" +
        text +
        "</button>";
    });
    html += "</div>";
    return html;
  }

  function openModal(html, locked) {
    var el = $("#modal");
    el.innerHTML = html;
    el.classList.remove("hidden");
    el.dataset.lock = locked ? "1" : "0";
  }
  function closeModal() {
    var el = $("#modal");
    el.classList.add("hidden");
    el.innerHTML = "";
    el.dataset.lock = "0";
    el.dataset.view = "";
    activeUi = null;
    statueHealNote = false;
  }
  function closeBattle() {
    clearBattleTimers();
    var el = $("#battle");
    el.classList.add("hidden");
    el.classList.remove("fighting");
    el.innerHTML = "";
    battleBusy = false;
    pendingBattle = null;
  }

  /* ---------- 地点 ---------- */
  function openPlace(place) {
    if (!state) return;
    if (place === "guild") openGuild();
    else if (place === "board") openBoard();
    else if (place === "shop") openShop();
    else if (place === "statue") openStatue(true);
    else if (place === "inn") openBank();
    else if (place === "training") openTraining();
    else if (place === "arena") openArena();
    else if (place === "wilds") {
      TownMap.switchMap("wilds", { x: 12, y: 2 });
      renderHud();
    } else if (place === "town") {
      TownMap.switchMap("town", { x: 12, y: 13 });
      renderHud();
    } else if (place === "dungeon") {
      openDungeonPick();
    }
  }

  function randomIronWeaponId(roll) {
    var list = D.IRON_WEAPONS || ["iron-sword", "iron-lance", "iron-axe", "iron-bow"];
    return list[(roll || rng()).int(0, list.length - 1)];
  }

  function dungeonDef(dungeonId) {
    dungeonId = dungeonId || currentDungeonId();
    if (D.DUNGEONS && D.DUNGEONS[dungeonId]) return D.DUNGEONS[dungeonId];
    var waves = D.DUNGEON_WAVES || [D.DUNGEON_BOSS];
    if (dungeonId === "d2") return waves[1] || waves[0];
    return waves[0];
  }

  function makeMonster(dungeonId, hp, weaponId) {
    if (typeof dungeonId === "number") dungeonId = dungeonId >= 1 ? "d2" : "d1";
    var b = dungeonDef(dungeonId || currentDungeonId());
    var wId = weaponId;
    if (!wId && dungeonRun && dungeonRun.boss && dungeonRun.boss.weapon && dungeonRun.boss.weapon.id &&
        dungeonRun.dungeonId === (dungeonId || currentDungeonId())) {
      wId = dungeonRun.boss.weapon.id;
    }
    if (!wId) {
      if (b.weaponPool === "iron") wId = randomIronWeaponId();
      else wId = b.weaponId;
    }
    var id = b.id || dungeonId || "d1";
    return {
      name: id === "d2" ? "石门魔物 II" : "石门魔物 I",
      dungeonId: id,
      artId: b.artId || (id === "d2" ? "axefiend" : "stonegate"),
      classId: b.classId,
      className: b.className,
      level: b.level,
      hp: hp != null ? hp : b.hp,
      maxHp: b.maxHp,
      str: b.str,
      skill: b.skill,
      spd: b.spd,
      luck: b.luck,
      def: b.def,
      weapon: D.copyWeapon(wId)
    };
  }

  function makeBossFighter(hp, weaponId) {
    return makeMonster(currentDungeonId(), hp, weaponId);
  }

  function deployRowHtml(u) {
    var limit = dungeonLimitLabel(u);
    var disabled = !canDungeonFight(u);
    var broken = isWeaponBroken(u);
    return (
      '<label class="deploy-row' +
      (disabled || broken ? " is-locked" : "") +
      '"><input type="checkbox" data-deploy="' +
      esc(u.id) +
      '" ' +
      (disabled || broken ? "disabled" : "checked") +
      " />" +
      mugTag(u, false, "mug") +
      '<div class="info"><h4>' +
      esc(displayName(u)) +
      "　Lv." +
      u.level +
      (u.promoted ? "★" : "") +
      "</h4><p>HP " +
      u.hp +
      "/" +
      u.maxHp +
      "　" +
      esc(u.weaponId ? weaponName(u.weaponId) : "") +
      (u.weaponId ? " " + usesText({ id: u.weaponId, uses: usesOf(u, u.weaponId), maxUses: D.weaponMaxUses(u.weaponId) }) : "") +
      (broken ? "　" + t("wep.broken") : "") +
      (limit ? "　" + limit : "") +
      "</p></div></label>"
    );
  }

  function groupedPickerHtml(list, rowFn) {
    return partyGroups(list).map(function (g) {
      return (
        '<div class="deploy-group"><div class="deploy-group-head"><span>' +
        esc(t("class." + g.classId)) +
        "</span><span>×" +
        g.units.length +
        '</span></div><div class="deploy-grid">' +
        g.units.map(rowFn).join("") +
        "</div></div>"
      );
    }).join("");
  }

  function openDungeonPick() {
    refreshLocks();
    pendingDungeonId = pendingDungeonId || "d1";
    var cards = dungeonIds().map(function (id) {
      return (
        '<div class="guild-card dungeon-pick-card"><h4>' +
        esc(t("dungeon." + id)) +
        "</h4><p>" +
        esc(t("dungeon.blurb." + id)) +
        '</p><button type="button" class="btn btn-gold" data-act="dungeon-choose" data-id="' +
        id +
        '">' +
        t("dungeon.enter." + id) +
        "</button></div>"
      );
    }).join("");
    var body =
      "<p class='lead'>" + t("dungeon.chooseLead") + "</p>" +
      "<p class='muted'>" + t("dungeon.lead") + "</p>" +
      '<div class="guild-pick dungeon-pick">' + cards + "</div>" +
      actions({ leave: t("ui.leave") });
    openModal(panel(t("dungeon.chooseTitle"), body, "wide"));
    setView("dungeon-pick");
  }

  function openDungeonDeploy(dungeonId) {
    if (dungeonId) pendingDungeonId = dungeonId;
    pendingDungeonId = pendingDungeonId || "d1";
    refreshLocks();
    var rows = groupedPickerHtml(state.party, deployRowHtml);
    var body =
      "<p>" + t("dungeon.blurb." + pendingDungeonId) + "</p>" +
      "<p class='muted'>" + t("dungeon.note") + "</p>" +
      '<div class="deploy-list">' +
      rows +
      "</div>" +
      actions({
        "dungeon-enter": t("dungeon.enter." + pendingDungeonId),
        "dungeon-pick": t("ui.back"),
        leave: t("ui.leave")
      });
    openModal(panel(t("dungeon." + pendingDungeonId), body, "wide"));
    setView("dungeon-deploy");
  }

  function collectedDeployIds() {
    var boxes = document.querySelectorAll("#modal [data-deploy]");
    var ids = [], i, el, u;
    for (i = 0; i < boxes.length; i++) {
      el = boxes[i];
      if (!el.checked || el.disabled) continue;
      u = unitById(el.getAttribute("data-deploy"));
      if (u && canDungeonFight(u) && !isWeaponBroken(u)) ids.push(u.id);
    }
    return ids;
  }

  function startDungeonRun(ids) {
    if (!ids || !ids.length) {
      toast(t("dungeon.needUnit"));
      return;
    }
    var dungeonId = pendingDungeonId || "d1";
    var def = dungeonDef(dungeonId);
    var weaponId = def.weaponPool === "iron" ? randomIronWeaponId() : def.weaponId;
    dungeonRun = {
      ids: ids.slice(),
      living: ids.slice(),
      dungeonId: dungeonId,
      boss: makeMonster(dungeonId, null, weaponId),
      loot: {},
      lastAtk: null,
      phase: "player"
    };
    renderDungeonRoom();
  }

  function dungeonLivingUnits() {
    var out = [], i, u;
    if (!dungeonRun) return out;
    for (i = 0; i < dungeonRun.living.length; i++) {
      u = unitById(dungeonRun.living[i]);
      if (u && u.hp > 0 && !isDungeonLocked(u, Date.now(), dungeonRun.dungeonId)) out.push(u);
    }
    return out;
  }

  function renderDungeonRoom() {
    if (!dungeonRun) return;
    var living = dungeonLivingUnits();
    dungeonRun.living = living.map(function (u) { return u.id; });
    if (dungeonRun.boss.hp <= 0) {
      finishDungeonWin();
      return;
    }
    if (!living.length) {
      finishDungeonWipe();
      return;
    }
    var b = dungeonRun.boss;
    var dungeonId = dungeonRun.dungeonId || "d1";
    var ready = living.filter(function (u) { return canDungeonFight(u, Date.now(), dungeonId) && !isWeaponBroken(u); });
    var rows = groupedPickerHtml(living, function (u) {
      var can = canDungeonFight(u, Date.now(), dungeonId) && !isWeaponBroken(u);
      var broken = isWeaponBroken(u);
      return (
        '<div class="deploy-row' + (can ? "" : " is-locked") + '">' +
        mugTag(u, false, "mug") +
        '<div class="info"><h4>' +
        esc(displayName(u)) +
        "　Lv." +
        u.level +
        "</h4><p>HP " +
        u.hp +
        "/" +
        u.maxHp +
        "　" +
        esc(weaponName(u.weaponId)) +
        " " +
        usesText({ id: u.weaponId, uses: usesOf(u, u.weaponId), maxUses: D.weaponMaxUses(u.weaponId) }) +
        (can ? "" : broken ? "　" + t("wep.broken") : "　" + t("dungeon.foughtToday")) +
        "</p></div>" +
        (can
          ? '<button type="button" class="btn" data-act="dungeon-atk" data-id="' +
            esc(u.id) +
            '">' + t("dungeon.attack") + '</button>'
          : "") +
        "</div>"
      );
    });
    var body =
      "<p>" + t(dungeonId === "d2" ? "dungeon.roomLead2" : "dungeon.roomLead1") + "</p>" +
      (ready.length ? "" : "<p class='muted'>" + t("dungeon.allFought") + "</p>") +
      '<div class="boss-card">' +
      mugTag(b, true, "mug") +
      "<div><h4>" +
      esc(displayName(b)) +
      "　" +
      esc(classNameOf(b)) +
      "　Lv." +
      (b.level || dungeonDef(dungeonId).level) +
      "</h4><div class='hud-bar hp'><span>HP</span>" +
      hpTrack(b.hp, b.maxHp) +
      "<span>" +
      b.hp +
      "/" +
      b.maxHp +
      "</span></div><p class='muted'>" +
      esc(weaponName(b.weapon)) +
      "</p></div></div>" +
      "<p>" + t("dungeon.pick") + "</p>" +
      '<div class="list dungeon-party">' +
      rows +
      "</div>" +
      actions({ "dungeon-retreat": t("dungeon.retreat") });
    openModal(panel(t("dungeon." + dungeonId), body, "wide"), true);
    setView("dungeon-room");
  }

  function beginDungeonAttack(id) {
    var u = unitById(id);
    if (!dungeonRun || !u || !canDungeonFight(u, Date.now(), dungeonRun.dungeonId)) return;
    if (!assertUsableWeapon(u)) return;
    setActive(u.id);
    dungeonRun.lastAtk = u.id;
    dungeonRun.phase = "player";
    closeModal();
    showForecast({
      kind: "dungeon",
      atk: fighterFrom(u),
      def: makeBossFighter(dungeonRun.boss.hp),
      unitId: u.id,
      playerIsA: true
    });
  }

  function beginDungeonBossTurn() {
    var living = dungeonLivingUnits();
    if (!dungeonRun || !living.length || dungeonRun.boss.hp <= 0) {
      renderDungeonRoom();
      return;
    }
    var target = unitById(dungeonRun.lastAtk);
    if (!target || target.hp <= 0 || living.indexOf(target) === -1) {
      living.sort(function (a, b) { return a.hp - b.hp; });
      target = living[0];
    }
    setActive(target.id);
    dungeonRun.phase = "boss";
    closeModal();
    showForecast({
      kind: "dungeon",
      atk: makeBossFighter(dungeonRun.boss.hp),
      def: fighterFrom(target),
      unitId: target.id,
      playerIsA: false,
      noCancel: true
    });
  }

  function applyDungeonRound(ctx, result) {
    var unit = unitById(ctx.unitId);
    var boss = dungeonRun && dungeonRun.boss;
    if (!unit || !boss) return { unitDead: false, bossDead: false };
    if (ctx.playerIsA) {
      unit.hp = Math.max(0, result.aHp);
      boss.hp = Math.max(0, result.bHp);
    } else {
      boss.hp = Math.max(0, result.aHp);
      unit.hp = Math.max(0, result.bHp);
    }
    syncUsesFromFighter(unit, ctx.playerIsA ? ctx.atk : ctx.def);
    if (ctx.playerIsA) markDungeonFought(unit);
    var unitDead = unit.hp <= 0;
    if (unitDead) {
      lockUnit(unit);
      if (dungeonRun.living) {
        dungeonRun.living = dungeonRun.living.filter(function (id) { return id !== unit.id; });
      }
    }
    return { unitDead: unitDead, bossDead: boss.hp <= 0, unit: unit, boss: boss };
  }

  function showDungeonRoundResult(ctx, result) {
    var info = applyDungeonRound(ctx, result);
    renderHud();
    save();
    var note;
    var title;
    var next;
    if (info.bossDead) {
      title = t("dungeon.roundWin");
      note = t("dungeon.roundWinNote");
      next = "dungeon-win";
    } else if (info.unitDead && dungeonLivingUnits().length === 0) {
      title = t("dungeon.wipe");
      note = t("dungeon.wipeNote", { name: displayName(info.unit) });
      next = "dungeon-wipe";
    } else if (info.unitDead) {
      title = t("dungeon.down");
      note = t("dungeon.downNote", { name: displayName(info.unit), lock: lockoutLabel(info.unit) });
      next = "dungeon-room";
    } else if (ctx.playerIsA) {
      title = t("dungeon.roundOver");
      note = t("dungeon.roundOverNote", { name: displayName(info.unit) });
      next = "dungeon-boss-turn";
    } else {
      title = t("dungeon.endure");
      note = t("dungeon.endureNote");
      next = "dungeon-room";
    }
    var layer = document.createElement("div");
    layer.className = "result-layer";
    layer.innerHTML =
      '<div class="result-win fe-win"><h3>' +
      title +
      "</h3><p>" +
      note +
      '</p><p>' +
      t("dungeon.bossHp", { hp: info.boss.hp, max: info.boss.maxHp }) +
      (info.unitDead ? "" : "　" + esc(displayName(info.unit)) + " HP " + info.unit.hp + "/" + info.unit.maxHp) +
      '。</p><div class="actions"><button type="button" class="btn btn-gold" data-act="' +
      next +
      '">' + t("ui.confirm") + '</button></div></div>';
    var stage = $("#battle .fe-battle");
    if (stage) stage.appendChild(layer);
    else $("#battle").innerHTML = layer.innerHTML;
    pendingBattle = ctx;
    ctx.kindDone = true;
    ctx.dungeonNext = next;
  }

  function grantCopperReward(ids, forcedId) {
    var pool = D.COPPER_REWARDS;
    var pick = forcedId && D.WEAPONS[forcedId] ? forcedId : pool[rng().int(0, pool.length - 1)];
    var w = D.copyWeapon(pick);
    var living = [];
    var i, u, usable, target;
    ids = ids || [];
    for (i = 0; i < ids.length; i++) {
      u = unitById(ids[i]);
      if (u && u.hp > 0) living.push(u);
    }
    usable = [];
    for (i = 0; i < living.length; i++) {
      if (D.CLASSES[living[i].classId].weaponType === w.type) usable.push(living[i]);
    }
    target = usable[0] || living[0] || (ids[0] ? unitById(ids[0]) : state.party[0]);
    if (!target) return { weapon: w, unit: null };
    grantWeapon(target, pick);
    w = D.copyWeapon(pick, usesOf(target, pick));
    return { weapon: w, unit: target };
  }

  function grantSilverReward(ids, forcedId) {
    var pool = D.SILVER_REWARDS || ["silver-sword", "silver-lance", "silver-axe", "silver-bow"];
    return grantCopperReward(ids, forcedId && D.WEAPONS[forcedId] ? forcedId : pool[rng().int(0, pool.length - 1)]);
  }

  function finishDungeonWin(forcedSilver) {
    var ids = dungeonRun ? dungeonRun.ids : state.party.map(function (p) { return p.id; });
    var loot = (dungeonRun && dungeonRun.loot) ? dungeonRun.loot : {};
    var dungeonId = dungeonRun ? dungeonRun.dungeonId : pendingDungeonId;
    var def = dungeonDef(dungeonId);
    if (def.reward === "copper" || dungeonId === "d1") {
      if (!loot.copper) {
        loot.copper = grantCopperReward(ids, state._forceCopper || null);
        state._forceCopper = null;
      }
    } else {
      if (!loot.silver) {
        loot.silver = grantSilverReward(ids, forcedSilver || state._forceSilver || null);
        state._forceSilver = null;
        if (state._forceTome === true || (state._forceTome !== false && rng().int(0, 99) < 50)) {
          if (!state.items) state.items = {};
          state.items.promoBook = (state.items.promoBook || 0) + 1;
          loot.tome = true;
        }
        state._forceTome = null;
      }
    }
    pendingLevelUps = [];
    var endedId = dungeonId;
    dungeonRun = null;
    closeBattle();
    renderHud();
    save();
    lastVictory = { goldGain: 0, loot: loot, drop: loot.silver || loot.copper || null, dungeonId: endedId };
    renderDungeonWin();
  }

  function finishDungeonWipe() {
    dungeonRun = null;
    closeBattle();
    renderHud();
    save();
    renderDungeonWipe();
  }

  function retreatDungeon() {
    dungeonRun = null;
    closeModal();
    closeBattle();
    toast(t("dungeon.retreated"));
    advancePeriod();
    renderHud();
    save();
  }

  function closeDungeonRunToMap(spendPeriod) {
    closeModal();
    closeBattle();
    dungeonRun = null;
    if (spendPeriod) advancePeriod();
    renderHud();
    save();
  }

  function openGuildJoin() {
    var lockLeft = guildSwitchLeft();
    var cards = D.GUILD_ORDER.map(function (id) {
      var current = state.guildId === id;
      var canJoin = !current && !lockLeft;
      return (
        '<div class="guild-card"><h4>' +
        esc(guildName(id)) +
        (current ? "　" + t("guild.joined") : "") +
        "</h4><p>" +
        esc(t("guild." + id + ".blurb")) +
        "</p>" +
        (canJoin
          ? '<button type="button" class="btn" data-act="join-guild" data-id="' + id + '">' + t("guild.join") + "</button>"
          : current ? "" : "<p class='muted'>" + t("guild.lockWait", { time: formatSeasonTime(lockLeft) }) + "</p>") +
        "</div>"
      );
    }).join("");
    var body =
      "<p class='lead'>" + t("guild.joinLead") + "</p>" +
      (lockLeft ? "<p class='muted'>" + t("guild.lockWait", { time: formatSeasonTime(lockLeft) }) + "</p>" : "") +
      '<div class="guild-pick">' + cards + "</div>" +
      actions({ leave: t("ui.leave") });
    openModal(panel(t("guild.title"), body, "wide"));
    setView("guild-join");
  }

  function rankTableHtml() {
    var now = Date.now();
    var rows = leaderboardRows(now);
    var table = rows.map(function (row, i) {
      return (
        "<tr class='" + (row.you ? "you" : "") + "'><td>" +
        (i + 1) +
        "</td><td>" +
        esc(row.name) +
        (row.you ? "　" + t("arena.youMark") : "") +
        "</td><td>" +
        row.points +
        "</td></tr>"
      );
    }).join("");
    var left = D.ARENA_SEASON_MS - (now - (state.arenaSeasonStart || seasonStartAt(currentSeasonIndex())));
    if (left < 0) left = 0;
    return (
      "<p class='rank-prize'>" + t("arena.prizes") + "</p>" +
      "<p class='muted'>" + t("arena.seasonLeft", { time: formatSeasonTime(left) }) + "</p>" +
      '<p><button type="button" class="btn" data-act="personal-board">' + t("arena.openBoard") + "</button></p>" +
      "<table class='rank-table'><thead><tr><th>" +
      t("arena.rank") +
      "</th><th>" +
      t("arena.fighter") +
      "</th><th>" +
      t("arena.score") +
      "</th></tr></thead><tbody>" +
      table +
      "</tbody></table>"
    );
  }
  function openGuild() {
    settleArenaSeason(function () {
      openGuildAfterSettle();
    });
  }
  function openGuildAfterSettle() {
    if (!state.guildId) {
      openGuildJoin();
      return;
    }
    var lockLeft = guildSwitchLeft();
    var body =
      "<p>" + t("guild.lead") + "</p>" +
      "<p>" + t("guild.current", { name: guildName(state.guildId) }) + "　" +
      t("guild.points", { points: currentGuildPoints() }) + "　" +
      t("arena.points", { points: currentPersonalPoints() }) + "</p>" +
      (lockLeft ? "<p class='muted'>" + t("guild.lockWait", { time: formatSeasonTime(lockLeft) }) + "</p>" : "") +
      '<div class="tabs">' +
      '<button type="button" class="tab active" data-act="guild-job">' + t("guild.tabBoard") + '</button>' +
      '<button type="button" class="tab" data-act="guild-rules">' + t("guild.tabRules") + '</button>' +
      '<button type="button" class="tab" data-act="stats">' + t("guild.tabStats") + '</button>' +
      "</div>" +
      rankTableHtml() +
      actions({
        "guild-switch": { label: t("guild.switch"), disabled: lockLeft > 0 },
        leave: t("ui.leave")
      });
    openModal(panel(t("guild.title"), body, "wide"));
    setView("guild");
  }

  function openGuildRules() {
    var body =
      '<div class="tabs">' +
      '<button type="button" class="tab" data-act="guild">' + t("guild.tabBoard") + '</button>' +
      '<button type="button" class="tab active" data-act="guild-rules">' + t("guild.tabRules") + '</button>' +
      '<button type="button" class="tab" data-act="stats">' + t("guild.tabStats") + '</button></div>' +
      "<dl class='rules'>" +
      "<dt>" + t("guild.ruleAtk") + "</dt><dd>" + t("guild.ruleAtkBody") + "</dd>" +
      "<dt>" + t("guild.ruleHit") + "</dt><dd>" + t("guild.ruleHitBody") + "</dd>" +
      "<dt>" + t("guild.ruleTri") + "</dt><dd>" + t("guild.ruleTriBody") + "</dd>" +
      "<dt>" + t("guild.ruleAvo") + "</dt><dd>" + t("guild.ruleAvoBody") + "</dd>" +
      "<dt>" + t("guild.ruleAs") + "</dt><dd>" + t("guild.ruleAsBody") + "</dd>" +
      "<dt>" + t("guild.ruleClass") + "</dt><dd>" + t("guild.ruleClassBody") + "</dd>" +
      "</dl>" +
      actions({ leave: t("ui.leave") });
    openModal(panel(t("guild.title"), body, "wide"));
    setView("guild-rules");
  }

  function openBoard() {
    var body =
      "<p class='muted'>" + t("board.frame") + "</p>" +
      '<ul class="manifesto">' +
      "<li>" + t("board.l1") + "</li>" +
      "<li>" + t("board.l2") + "</li>" +
      "<li>" + t("board.l3") + "</li>" +
      "<li>" + t("board.l4") + "</li>" +
      "</ul>" +
      actions({ leave: t("ui.leave") });
    openModal(panel(t("place.board"), body, "narrow"));
    setView("board");
  }

  function completeQuest(id) {
    var q = null;
    state.quests.forEach(function (it) {
      if (it.id === id) q = it;
    });
    if (!q || q.done) return;
    if (!state.guildId) {
      toast(t("guild.needJoin"));
      return;
    }
    q.done = true;
    addGuildPoints(q.points);
    var lv = [];
    var html =
      "<p>" +
      t("quest.doneBody", { name: questName(q.id) }) +
      "</p><p>" +
      t("quest.doneReward", { points: q.points }) +
      "</p>" +
      actions({ "after-action": t("ui.ok") });
    pendingLevelUps = lv;
    pendingAfter = null;
    openModal(panel(t("quest.doneTitle"), html, "narrow"), true);
    setView("quest-done");
    renderHud();
    save();
  }

  var pendingLevelUps = [];
  var pendingAfter = null;

  function finishWithLevelsOr(then) {
    if (pendingLevelUps && pendingLevelUps.length) {
      pendingAfter = then;
      showNextLevelUp();
      return;
    }
    if (then) then();
  }

  function showNextLevelUp() {
    var ev = pendingLevelUps.shift();
    var p = (ev && ev.unitId && unitById(ev.unitId)) || active();
    var rows = STAT_KEYS.map(function (k) {
      return (
        "<div class='lv-row" +
        (ev.grew[k] ? " grew" : "") +
        "'><span class='lab'>" +
        statLabel(k) +
        "</span><span class='val'>" +
        ev.after[k] +
        "</span><span class='plus'>" +
        (ev.grew[k] ? "+1" : "") +
        "</span></div>"
      );
    }).join("");
    openModal(
      panel(
        t("lv.title"),
        '<div class="lv-wrap">' +
          mugTag(p, false) +
          "<div class='lv-list'><p class='lead'>" +
          esc(displayName(p)) +
          "　" +
          classNameOf(p) +
          "　Lv." +
          p.level +
          "</p>" +
          rows +
          "</div></div>" +
          actions({ "lv-next": t("ui.continue") }),
        "narrow"
      ),
      true
    );
    setView("levelup");
    renderHud();
  }

  function openShop() {
    var p = active();
    var irons = D.SHOP_WEAPONS || D.IRON_WEAPONS;
    var rows = irons.map(function (id) {
      var w = D.WEAPONS[id];
      if (!w) return "";
      var owned = p.weapons.indexOf(id) !== -1;
      var usable = canUseWeapon(id, p);
      var poor = state.gold < w.cost;
      var disabled = owned || !usable || poor;
      var why = owned ? t("shop.owned") : (!usable ? t("shop.cantUse") : (poor ? t("goldShort") : ""));
      return (
        '<div class="list-item shop-item"><div class="info"><h4>' +
        weaponName(w) +
        "</h4><p>" +
        wepLine(w, D.weaponMaxUses(id)) +
        (why ? "　" + why : "") +
        '</p></div><span class="price">' +
        w.cost +
        '</span>' +
        (disabled
          ? ""
          : '<button type="button" class="btn" data-act="buy-weapon" data-id="' +
            id +
            '">' + t("ui.ok") + "</button>") +
        "</div>"
      );
    }).join("");
    var writ = D.ITEMS.challengeWrit;
    var writPoor = state.gold < writ.cost;
    var writRow =
      '<div class="list-item shop-item"><div class="info"><h4>' +
      itemName("challengeWrit") +
      "</h4><p>" +
      t("shop.writLead") +
      (writPoor ? "　" + t("goldShort") : "") +
      '</p></div><span class="price">' +
      writ.cost +
      "</span>" +
      (writPoor
        ? ""
        : '<button type="button" class="btn" data-act="buy-item" data-id="challengeWrit">' +
          t("ui.ok") +
          "</button>") +
      "</div>";
    var body =
      "<p class='lead'>" + t("shop.lead") + "</p>" +
      "<p>" + esc(displayName(p)) + "　" + classNameOf(p) + "</p>" +
      '<div class="shop-list">' +
      rows +
      writRow +
      "</div>" +
      actions({ leave: t("ui.leave") });
    openModal(panel(t("shop.title"), body));
    setView("shop");
  }

  function openStatue(fromEnter, keepNote) {
    var loreIdx = (state.day - 1) % 4;
    var lore = t("statue.lore" + loreIdx);
    var rate = goldRate();
    var dayGold = goldPerDay();
    var healed = false;
    var i, u;
    if (fromEnter) {
      for (i = 0; i < state.party.length; i++) {
        u = state.party[i];
        if (u.hp < u.maxHp) healed = true;
      }
      healPartyFull();
      statueHealNote = healed;
      if (healed) {
        renderHud();
        save();
      }
    } else if (!keepNote) {
      statueHealNote = false;
    }
    healed = statueHealNote;
    var rows = state.party
      .map(function (u) {
        return (
          "<tr><td>" +
          esc(displayName(u)) +
          "</td><td>Lv." +
          u.level +
          "</td><td class='growth'>" +
          formatTick(unitTick(u)) +
          " / 10s</td><td>" +
          formatGold(unitDaily(u)) +
          "</td></tr>"
        );
      })
      .join("");
    var body =
      (healed ? "<p class='heal-note'>" + t("statue.heal") + "</p>" : "") +
      "<p class='lead'>" +
      lore +
      "</p>" +
      "<p>" + t("statue.lead") + "</p>" +
      "<p>" + t("statue.rules") + "</p>" +
      "<table class='stat-table'><thead><tr><th>" +
      t("statue.unit") +
      "</th><th>" +
      t("statue.level") +
      "</th><th>" +
      t("statue.perTick") +
      "</th><th>" +
      t("statue.perDay") +
      "</th></tr></thead><tbody>" +
      rows +
      "</tbody></table>" +
      "<p>" +
      t("statue.total", { rate: formatTick(rate), day: formatGold(dayGold) }) +
      "</p>" +
      "<p>" +
      t("statue.gold", { gold: formatGold(state.gold) }) +
      "</p>" +
      actions({ leave: t("ui.leave") });
    openModal(panel(t("statue.title"), body, "wide"));
    setView("statue");
  }

  function openBank() {
    var cost = D.REPAIR_COST || 5;
    var groups = partyGroups(state.party).map(function (g) {
      var blocks = g.units.map(function (u) {
        var rows = u.weapons.map(function (id) {
          if (!D.WEAPONS[id]) return "";
          var max = D.weaponMaxUses(id);
          var left = usesOf(u, id);
          var full = left >= max;
          var poor = state.gold < cost;
          var w = D.copyWeapon(id, left);
          return (
            '<div class="list-item"><div class="info"><h4>' +
            weaponName(id) +
            (u.weaponId === id ? t("ui.equipped") : "") +
            "</h4><p>" +
            wepLine(w, left) +
            (full ? "　" + t("smithy.full") : "") +
            '</p></div>' +
            (full || poor
              ? ""
              : '<button type="button" class="btn" data-act="repair" data-unit="' +
                esc(u.id) +
                '" data-id="' +
                id +
                '">' +
                t("smithy.repair") +
                "</button>") +
            "</div>"
          );
        }).join("");
        return (
          '<div class="repair-group"><div class="repair-group-head">' +
          esc(displayName(u)) +
          "　" +
          esc(classNameOf(u)) +
          "　Lv." +
          u.level +
          "</div>" +
          rows +
          "</div>"
        );
      }).join("");
      return blocks;
    }).join("");
    var body =
      "<p class='lead'>" + t("smithy.lead") + "</p>" +
      "<p>" + t("smithy.gold", { gold: formatGold(state.gold) }) + "</p>" +
      "<p class='muted'>" + t("smithy.repairCost", { cost: cost }) + "</p>" +
      '<div class="repair-list">' +
      (groups || "<p class='muted'>" + t("smithy.none") + "</p>") +
      "</div>" +
      actions({ leave: t("ui.leave") });
    openModal(panel(t("smithy.title"), body, "wide"));
    setView("bank");
  }

  function repairWeapon(unitId, weaponId) {
    var u = unitById(unitId);
    var cost = D.REPAIR_COST || 5;
    var max, left;
    if (!u || !weaponId || u.weapons.indexOf(weaponId) === -1) return;
    max = D.weaponMaxUses(weaponId);
    left = usesOf(u, weaponId);
    if (left >= max) return;
    if (state.gold < cost) {
      toast(t("smithy.poor"));
      return;
    }
    addGold(-cost);
    setUses(u, weaponId, max);
    toast(t("smithy.repaired", { name: displayName(u), weapon: weaponName(weaponId) }));
    renderHud();
    save();
    openBank();
  }

  function openTraining() {
    var p = active();
    var cls = D.CLASSES[p.classId];
    var atCap = p.level >= D.LEVEL_CAP;
    var cost = trainFee(effectiveLevel(p));
    var poor = !atCap && state.gold < cost;
    var rows = STAT_KEYS.map(function (k) {
      var val = k === "hp" ? p.maxHp : p[k];
      return (
        "<tr><td class='stat-name'>" +
        statLabel(k) +
        "</td><td>" +
        val +
        "</td><td class='growth'>" +
        cls.growths[k] +
        "%</td></tr>"
      );
    }).join("");
    var note = "";
    if (atCap) note = "<p class='warn-text'>" + t("train.cap") + "</p>";
    else if (poor) note = "<p class='warn-text'>" + t("train.poor") + "</p>";
    var costLine = atCap
      ? "<p>" + t("train.atCap", { cap: D.LEVEL_CAP }) + "</p>"
      : "<p>" + t("train.nextCostBonus", { lv: p.level, cost: formatGold(cost) }) + "</p>" +
        "<p>" + t("train.payback", { days: formatGold(paybackDays(effectiveLevel(p))) }) + "</p>" +
        "<p class='muted'>" + t("train.goldBonus") + "</p>";
    var body =
      "<p class='lead'>" + t("train.lead") + "</p>" +
      "<p>" +
      esc(displayName(p)) +
      "　" +
      classNameOf(p) +
      "　Lv." +
      p.level +
      (atCap ? t("ui.cap") : "") +
      "</p>" +
      (classBonusLine(p.classId) ? "<p>" + classBonusLine(p.classId) + "</p>" : "") +
      "<table class='stat-table'><thead><tr><th></th><th>" +
      t("train.current") +
      "</th><th>" +
      t("train.growth") +
      "</th></tr></thead><tbody>" +
      rows +
      "</tbody></table>" +
      costLine +
      "<p>" + t("train.goldOnHand", { gold: formatGold(state.gold) }) + "</p>" +
      "<p class='muted'>" + t("train.note") + "</p>" +
      note +
      actions({
        "train-up": { label: t("train.action"), disabled: atCap || poor },
        leave: t("ui.leave")
      });
    openModal(panel(t("train.title"), body));
    setView("training");
  }

  function trainingList() {
    var p = active();
    var coachLv = Math.max(1, p.level);
    var vetLv = Math.min(D.LEVEL_CAP, p.level + 2);
    return [
      {
        id: "dummy",
        name: t("arena.dummyName"),
        fee: 20,
        exp: 26,
        flavor: t("arena.dummyFlavor")
      },
      {
        id: "coach",
        name: t("arena.coachName", { lv: coachLv }),
        fee: 50,
        exp: 35,
        flavor: t("arena.coachFlavor")
      },
      {
        id: "veteran",
        name: t("arena.vetName", { lv: vetLv }),
        fee: 80,
        exp: C.clamp(45 + (vetLv - p.level) * 3, 40, 48),
        flavor: t("arena.vetFlavor")
      }
    ];
  }

  function makePartner(id) {
    var p = active();
    var roll = rng();
    if (id === "dummy") {
      return {
        id: "dummy",
        fee: 20,
        exp: 26,
        unit: {
          name: "木人",
          className: "训练器具",
          level: 1,
          maxHp: 12 + p.level * 2,
          hp: 12 + p.level * 2,
          str: 2,
          skill: 2,
          spd: 1,
          luck: 0,
          def: 1 + Math.floor(p.level / 5),
          weapon: { name: "木臂", mt: 1, hit: 60, wt: 4, type: "train" }
        }
      };
    }
    if (id === "coach") {
      var lv = Math.max(1, p.level);
      return { id: "coach", fee: 50, exp: 35, unit: rollUnit("sword", lv, roll, "教练", "iron-sword") };
    }
    var vLv = Math.min(D.LEVEL_CAP, p.level + 2);
    var w = p.level >= 6 ? "steel-lance" : "iron-lance";
    return {
      id: "veteran",
      fee: 80,
      exp: C.clamp(45 + (vLv - p.level) * 3, 40, 48),
      unit: rollUnit("cavalier", vLv, roll, "老兵", w)
    };
  }

  function openArena(skipPrize) {
    settleArenaSeason(function () {
      if (!skipPrize && showArenaPrizeNote()) return;
      var p = active();
      var used = isArenaFought(p);
      var body =
        "<p class='lead'>" + t("arena.leadFull") + "</p>" +
        "<p>" +
        t("arena.deployLine", { name: displayName(p) }) +
        "　" +
        classNameOf(p) +
        "　Lv." +
        p.level +
        "　HP " + p.hp + "/" + p.maxHp +
        "</p>" +
        "<p>" + t("arena.points", { points: currentPersonalPoints() }) +
        (state.guildId
          ? "　" + t("guild.current", { name: guildName(state.guildId) }) + "　" +
            t("guild.points", { points: currentGuildPoints() })
          : "　" + t("arena.needGuild")) +
        "</p>" +
        "<p>" + t(used ? "arena.unitUsed" : "arena.unitReady", { name: displayName(p) }) + "</p>" +
        "<p class='muted'>" + t("arena.noteFull") + "</p>" +
        rankTableHtml() +
        actions({
          "arena-fight": { label: t("arena.fightNow"), disabled: used || isWeaponBroken(p) || p.hp <= 0 },
          leave: t("ui.leave")
        });
      openModal(panel(t("arena.title"), body, "wide"));
      setView("arena");
    });
  }

  function openPersonalBoard(keepFetched) {
    personalBoardBack = (activeUi === "guild" || ($("#modal") && $("#modal").dataset.view === "guild")) ? "guild"
      : (activeUi === "arena" || ($("#modal") && $("#modal").dataset.view === "arena")) ? "arena"
      : (personalBoardBack || "arena");
    function render(rows, ok) {
      personalBoardRemote = { rows: rows || [], ok: !!ok };
      var rec = currentPlayerRecord();
      var list = mergeSeasonRows(rows || [], rec.seasonIndex);
      list.sort(function (a, b) {
        var pa = a.personalPoints || 0, pb = b.personalPoints || 0;
        if (pb !== pa) return pb - pa;
        if (a.playerId === rec.playerId) return -1;
        if (b.playerId === rec.playerId) return 1;
        return String(a.playerName || "").localeCompare(String(b.playerName || ""));
      });
      var table = list.map(function (row, i) {
        var you = row.playerId === rec.playerId;
        return (
          "<tr class='" + (you ? "you" : "") + "'><td>" +
          (i + 1) +
          "</td><td>" +
          esc(row.playerName || t("board.defaultName")) +
          (you ? "　" + t("arena.youMark") : "") +
          "</td><td>" +
          (row.personalPoints || 0) +
          "</td><td>" +
          (row.guildId && D.GUILDS[row.guildId] ? esc(guildName(row.guildId)) : "—") +
          "</td></tr>"
        );
      }).join("");
      var nameVal = state.playerName ? esc(state.playerName) : "";
      var status = ok
        ? (list.length > 1 ? t("board.synced") : t("board.noPlayers"))
        : t("board.localOnly");
      var now = Date.now();
      var left = D.ARENA_SEASON_MS - (now - seasonStartAt(currentSeasonIndex()));
      if (left < 0) left = 0;
      var body =
        "<p class='rank-prize'>" + t("arena.prizes") + "</p>" +
        "<p class='muted'>" + t("arena.seasonLeft", { time: formatSeasonTime(left) }) + "</p>" +
        "<p class='muted'>" + status + "</p>" +
        '<div class="create-name board-name"><label for="player-name">' +
        t("board.nameLabel") +
        '</label><input id="player-name" type="text" maxlength="16" value="' +
        nameVal +
        '" /><button type="button" class="btn" data-act="save-name">' +
        t("board.saveName") +
        "</button></div>" +
        "<p class='muted'>" + t("board.nameHint") + "</p>" +
        "<table class='rank-table'><thead><tr><th>" +
        t("arena.rank") +
        "</th><th>" +
        t("board.colName") +
        "</th><th>" +
        t("arena.score") +
        "</th><th>" +
        t("board.colGuild") +
        "</th></tr></thead><tbody>" +
        table +
        "</tbody></table>" +
        rankTableHtml() +
        actions({
          "personal-back": t("ui.back"),
          leave: t("ui.leave")
        });
      openModal(panel(t("arena.personalBoard"), body, "wide"));
      setView("personal-board");
    }
    if (keepFetched && personalBoardRemote) {
      render(personalBoardRemote.rows, personalBoardRemote.ok);
    }
    if (typeof Leaderboard !== "undefined" && Leaderboard.fetchDoc) {
      Leaderboard.fetchDoc(function (doc, ok) {
        var rows = Leaderboard.rowsForSeason(doc, currentSeasonIndex());
        render(rows, ok);
      });
    } else if (!(keepFetched && personalBoardRemote)) {
      render([], false);
    }
  }

  function savePlayerName() {
    var el = $("#player-name");
    var name = el && el.value ? String(el.value).trim() : "";
    if (!name) {
      toast(t("board.nameNeed"));
      return;
    }
    state.playerName = name.slice(0, 16);
    save();
    queuePublish();
    toast(t("board.nameSaved"));
    openPersonalBoard(true);
  }

  function openBag() {
    var p = active();
    var tonic = (state.items && state.items.tonic) || 0;
    var tomes = (state.items && state.items.promoBook) || 0;
    var writs = (state.items && state.items.challengeWrit) || 0;
    var wpn = p.weapons
      .map(function (id) {
        var w = D.copyWeapon(id, usesOf(p, id));
        if (!w) return "";
        var eq = p.weaponId === id;
        var left = usesOf(p, id);
        return (
          '<div class="list-item"><div class="info"><h4>' +
          weaponName(w) +
          (eq ? t("ui.equipped") : "") +
          (left <= 0 ? "　" + t("wep.broken") : "") +
          "</h4><p>" +
          wepLine(w, left) +
          "</p></div>" +
          (eq || !canUseWeapon(id, p)
            ? ""
            : '<button type="button" class="btn" data-act="equip" data-id="' + id + '">' + t("ui.equip") + "</button>") +
          "</div>"
        );
      })
      .join("");
    var promoDisabled = tomes <= 0 || p.promoted || p.level < 10;
    var body =
      "<p>" +
      t("bag.weaponsOf", { name: displayName(p), count: tonic }) +
      t("bag.shared") +
      "</p>" +
      "<h3 style='font-size:1em;letter-spacing:.12em;margin:.8em 0 .3em'>" + t("bag.itemsHeading") + "</h3>" +
      '<div class="actions" style="margin-top:.4em">' +
      '<button type="button" class="btn" data-act="use-item" data-id="tonic"' +
      (tonic <= 0 || p.hp >= p.maxHp ? " disabled" : "") +
      ">" + t("bag.useTonic") + " ×" + tonic + "</button>" +
      '<button type="button" class="btn" data-act="use-item" data-id="promoBook"' +
      (promoDisabled ? " disabled" : "") +
      ">" + t("bag.usePromo") + " ×" + tomes + "</button>" +
      '<button type="button" class="btn" data-act="use-item" data-id="challengeWrit"' +
      (writs <= 0 ? " disabled" : "") +
      ">" + t("bag.useWrit") + " ×" + writs + "</button>" +
      "</div>" +
      "<h3 style='font-size:1em;letter-spacing:.12em;margin:.8em 0 .3em'>" + t("bag.weaponsHeading") + "</h3>" +
      '<div class="list">' +
      wpn +
      "</div>" +
      actions({ leave: t("ui.close") });
    openModal(panel(t("bag.title"), body));
    setView("bag");
  }

  function openStats() {
    var p = active();
    var cls = D.CLASSES[p.classId];
    var w = currentWeapon();
    var snap = C.snapshot(playerFighter());
    var rows = STAT_KEYS.map(function (k) {
      var val = k === "hp" ? p.maxHp : p[k];
      return (
        "<tr><td class='stat-name'>" +
        statLabel(k) +
        "</td><td>" +
        val +
        "</td><td class='growth'>" +
        cls.growths[k] +
        "%</td></tr>"
      );
    }).join("");
    var body =
      "<p class='lead'>" +
      esc(displayName(p)) +
      "　" +
      classNameOf(p) +
      "　" +
      t("stats.level") +
      " " +
      p.level +
      (p.level >= D.LEVEL_CAP ? t("ui.cap") : "　" + t("stats.exp") + " " + p.exp + "/" + D.EXP_PER_LEVEL) +
      "</p>" +
      (classBonusLine(p.classId) ? "<p>" + classBonusLine(p.classId) + "</p>" : "") +
      "<table class='stat-table'><thead><tr><th></th><th>" +
      t("train.current") +
      "</th><th>" +
      t("train.growth") +
      "</th></tr></thead><tbody>" +
      rows +
      "</tbody></table>" +
      "<div class='kv' style='margin-top:.8em'>" +
      "<span class='k'>" + t("stats.weapon") + "</span><span>" +
      weaponName(w) +
      t("wep.paren", { mt: w.mt, hit: w.hit, wt: w.wt }) +
      (w && usesText(w) ? "　" + usesText(w) : "") +
      "</span>" +
      "<span class='k'>" + t("stats.atk") + "</span><span>" +
      snap.atk +
      "</span>" +
      "<span class='k'>" + t("stats.as") + "</span><span>" +
      snap.as +
      "</span>" +
      "<span class='k'>" + t("stats.avo") + "</span><span>" +
      snap.avo +
      "</span>" +
      "<span class='k'>" + t("stats.hpLife") + "</span><span>" +
      p.hp +
      " / " +
      p.maxHp +
      "</span>" +
      "<span class='k'>" + t("stats.partyGold") + "</span><span>" +
      formatGold(state.gold) +
      "</span></div>" +
      actions({ leave: t("ui.close") });
    openModal(panel(t("stats.title"), body));
    setView("stats");
  }

  /* ---------- 夜间 ---------- */
  /* ---------- 战斗 ---------- */
  function showForecast(ctx) {
    pendingBattle = ctx;
    var fc = C.forecast(ctx.atk, ctx.def);
    var el = $("#battle");
    el.classList.remove("fighting");
    el.innerHTML = renderForecast(ctx, fc);
    el.classList.remove("hidden");
  }

  function renderForecast(ctx, fc) {

    function col(info, unit, foe, right) {
      return (
        '<div class="fc-col' +
        (right ? " right" : "") +
        '">' +
        mugTag(unit, foe) +
        '<div class="fc-id"><div class="fc-name">' +
        esc(displayName(unit)) +
        '</div><div class="fc-class">' +
        esc(classNameOf(unit)) +
        '</div><div class="fc-wpn">' +
        esc(weaponName(unit.weapon)) +
        (info.triangle && info.triangle.side === "adv"
          ? " <span class='tag-tri adv'>" + t("tri.adv") + "</span>"
          : info.triangle && info.triangle.side === "dis"
          ? " <span class='tag-tri dis'>" + t("tri.dis") + "</span>"
          : "") +
        "</div></div>" +
        '<div class="fc-hp' +
        (right ? " right" : "") +
        '">' +
        (right ? "<span>" + info.hp + "/" + info.maxHp + "</span>" : "") +
        hpTrack(info.hp, info.maxHp) +
        (right ? "" : "<span>" + info.hp + "/" + info.maxHp + "</span>") +
        "</div></div>"
      );
    }
    function cell(n, follow) {
      return (
        "<td class='v'>" +
        n +
        (follow ? " <span class='follow'>×2</span><span class='tag-follow'>" + t("fc.follow") + "</span>" : "") +
        "</td>"
      );
    }
    var mid =
      "<table><tbody>" +
      "<tr>" +
      cell(fc.a.damage, fc.a.followUp) +
      "<td class='k'>" + t("fc.damage") + "</td>" +
      cell(fc.b.damage, fc.b.followUp) +
      "</tr>" +
      "<tr>" +
      cell(fc.a.hit, false) +
      "<td class='k'>" + t("fc.hit") + "</td>" +
      cell(fc.b.hit, false) +
      "</tr>" +
      "<tr>" +
      cell(fc.a.crit, false) +
      "<td class='k'>" + t("fc.crit") + "</td>" +
      cell(fc.b.crit, false) +
      "</tr></tbody></table>";
    return (
      '<div class="fc-win"><div class="fc-title">' +
      esc(forecastTitle(ctx)) +
      '</div><div class="fc-body">' +
      col(fc.a, ctx.atk, false, false) +
      '<div class="fc-mid">' +
      mid +
      "</div>" +
      col(fc.b, ctx.def, true, true) +
      '</div><div class="actions">' +
      '<button type="button" class="btn btn-gold" data-act="fight">' +
      (ctx.noCancel ? t("ui.engage") : t("ui.fight")) +
      "</button>" +
      (ctx.noCancel
        ? ""
        : '<button type="button" class="btn btn-ghost" data-act="cancel-fight">' + t("ui.back") + "</button>") +
      "</div></div>"
    );
  }

  function startPendingFight() {
    var ctx = pendingBattle;
    if (!ctx || battleBusy) return;
    var p = active();
    if (ctx.fee && state.gold < ctx.fee) {
      toast(t("goldShort"));
      return;
    }
    if (ctx.kind === "arena" || ctx.kind === "guild" || (ctx.kind === "dungeon" && ctx.playerIsA)) {
      if (!assertUsableWeapon(p)) return;
    }
    if (ctx.kind === "arena") {
      if (isArenaFought(p)) {
        toast(t("arena.noFights"));
        openArena();
        return;
      }
      markArenaFought(p);
    }
    if (ctx.fee) addGold(-ctx.fee);
    ctx.preHp = p.hp;
    ctx.preMax = p.maxHp;
    var result = C.resolveDuel(ctx.atk, ctx.def, rng(), {
      maxRounds: ctx.kind === "dungeon" ? 1 : 20,
      untilDown: ctx.kind === "arena" || ctx.kind === "guild"
    });
    ctx.result = result;
    renderHud();
    playBattle(ctx, result);
  }

  function mountBattle(ctx) {
    var field = ctx.kind === "arena" ? "sand" : ctx.kind === "dungeon" ? "cave" : "grass";
    var fc = C.forecast(ctx.atk, ctx.def);
    var el = $("#battle");
    el.classList.add("fighting");
    el.innerHTML =
      '<div class="fe-battle gba-battle field-' +
      field +
      '"><div class="fe-stage" id="b-stage">' +
      '<canvas class="fe-mapbg" id="b-mapbg"></canvas>' +
      '<div class="fe-platform-wrap"><div class="fe-platform-pad"></div>' +
      fighterBox("a", ctx.atk, false, "r") +
      fighterBox("b", ctx.def, true, "l") +
      "</div>" +
      '<div class="fe-slash" id="b-slash"></div><div class="fe-slash" id="b-slash2"></div><div class="fe-slash" id="b-slash3"></div>' +
      '<div class="fe-spark" id="b-spark"></div><div class="fe-arrow" id="b-arrow"></div>' +
      '<div class="fe-thrust" id="b-thrust"></div><div class="fe-shock" id="b-shock"></div>' +
      "</div>" +
      '<div class="fe-flash" id="b-flash"></div><div class="fe-crit-veil" id="b-crit-veil"></div>' +
      '<div class="fe-banner" id="b-banner">' + t("crit.splash") + "</div>" +
      '<div class="ba-name left" id="ba-name-a">' + esc(displayName(ctx.atk)) + "</div>" +
      '<div class="ba-name right" id="ba-name-b">' + esc(displayName(ctx.def)) + "</div>" +
      '<div class="ba-dock">' +
      baStats("a", fc.a, false) +
      '<div class="ba-weapons">' +
      baWeapon("a", ctx.atk, false) +
      '<div class="div"></div>' +
      baWeapon("b", ctx.def, true) +
      "</div>" +
      baStats("b", fc.b, true) +
      '<div class="ba-hpbar">' +
      baHp("a", ctx.atk, ctx.atk.hp, false) +
      baHp("b", ctx.def, ctx.def.hp, true) +
      "</div></div></div>";
    el.classList.remove("hidden");
    paintBattleMap(ctx.kind);
    requestAnimationFrame(function () { paintBattleMap(ctx.kind); });
  }

  function battleFocusTile(kind) {
    if (kind === "arena") return [19, 8];
    if (kind === "dungeon") return [13, 13];
    if (kind === "training") return [22, 12];
    return [13, 10];
  }

  function paintBattleMap(kind) {
    var dest = $("#b-mapbg");
    if (!dest) return;
    var host = dest.parentElement || dest;
    var w = Math.max(320, host.clientWidth || 640);
    var h = Math.max(180, host.clientHeight || 360);
    dest.width = w;
    dest.height = h;
    var g = dest.getContext("2d");
    g.imageSmoothingEnabled = false;
    var src = $("#town-map");
    if (src && src.width > 8) {
      var tm = typeof TownMap !== "undefined" ? TownMap : null;
      var px = tm && tm.TILE && tm.SCALE ? tm.TILE * tm.SCALE : 48;
      var f = battleFocusTile(kind);
      var zoom = 1.7;
      var sw = src.width / zoom;
      var sh = src.height / zoom;
      var sx = Math.max(0, Math.min(src.width - sw, f[0] * px - sw / 2));
      var sy = Math.max(0, Math.min(src.height - sh, f[1] * px - sh / 2));
      g.drawImage(src, sx, sy, sw, sh, 0, 0, w, h);
      g.fillStyle = kind === "dungeon" ? "rgba(8, 6, 10, 0.38)" : "rgba(12, 20, 8, 0.12)";
      g.fillRect(0, 0, w, h);
    } else {
      g.fillStyle = kind === "dungeon" ? "#2a2428" : kind === "arena" ? "#c4a868" : "#4a8a3a";
      g.fillRect(0, 0, w, h);
    }
  }

  function weaponIconClass(unit) {
    var kind = weaponKind(unit);
    if (kind === "axe" || kind === "lance" || kind === "bow" || kind === "sword") return kind;
    if (unit && unit.weapon && unit.weapon.type === "train") return "train";
    return "sword";
  }

  function baWeapon(id, unit, right) {
    return (
      '<div class="ba-wpn ' +
      (right ? "right" : "left") +
      '"><span class="wpn-ico ' +
      weaponIconClass(unit) +
      '"></span><span class="nm" id="ba-wpn-' +
      id +
      '">' +
      esc(weaponName(unit.weapon || unit.weaponId)) +
      (unit.weapon && usesText(unit.weapon) ? " " + usesText(unit.weapon) : "") +
      "</span></div>"
    );
  }

  function baStats(id, side, right) {
    var dmg = String(side.damage);
    if (side.followUp) dmg += "<span class='x2'>×2</span>";
    return (
      '<div class="ba-stats ' +
      (right ? "right" : "left") +
      '"><div class="row" id="ba-hit-' +
      id +
      '"><span class="lab">' +
      t("ba.hit") +
      '</span><span class="val">' +
      side.hit +
      '</span></div><div class="row" id="ba-dmg-' +
      id +
      '"><span class="lab">' +
      t("ba.dmg") +
      '</span><span class="val">' +
      dmg +
      '</span></div><div class="row" id="ba-crt-' +
      id +
      '"><span class="lab">' +
      t("ba.crt") +
      '</span><span class="val">' +
      side.crit +
      "</span></div></div>"
    );
  }

  function fighterBox(id, unit, foe, facing) {
    return (
      '<div class="fe-fighter ' +
      (id === "a" ? "left ally" : "right foe") +
      ' idle" id="b-f-' +
      id +
      '"><img class="stand-art" src="' +
      standSrc(unit, foe, facing) +
      '"' +
      artOnError(unit, foe, "stand", facing) +
      ' alt="" draggable="false" /><div class="fe-pop" id="b-pop-' +
      id +
      '"></div></div>'
    );
  }

  function baHp(id, unit, hp, right) {
    var pct = Math.round((hp / Math.max(1, unit.maxHp)) * 100);
    return (
      '<div class="ba-hp ' +
      (right ? "right" : "left") +
      '"><span class="num" id="hp-num-' +
      id +
      '">' +
      hp +
      '</span><div class="ba-pips"><span class="fill' +
      (pct <= 30 ? " low" : "") +
      '" id="hp-fill-' +
      id +
      '" style="width:' +
      pct +
      '%"></span></div></div>'
    );
  }

  function setBattleHp(id, hp, max) {
    var fill = $("#hp-fill-" + id);
    var num = $("#hp-num-" + id);
    var pct = Math.round((hp / Math.max(1, max)) * 100);
    if (fill) {
      fill.style.width = pct + "%";
      fill.classList.toggle("low", pct <= 30);
    }
    if (num) num.textContent = String(hp);
  }

  function showPop(id, text, kind) {
    var el = $("#b-pop-" + id);
    if (!el) return;
    el.className = "fe-pop " + kind;
    el.textContent = text;
    el.classList.remove("show");
    void el.offsetWidth;
    el.classList.add("show");
  }

  function restartAnim(el, cls) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function playCritEffect(atkEl, defEl, defId) {
    var stage = $("#b-stage") || $("#battle .fe-battle");
    if (stage) {
      stage.classList.remove("crit-shake");
      void stage.offsetWidth;
      stage.classList.add("crit-shake");
    }
    restartAnim($("#b-flash"), "crit");
    restartAnim($("#b-crit-veil"), "show");
    var slash = $("#b-slash");
    if (slash) {
      slash.className = "fe-slash side-" + defId;
      void slash.offsetWidth;
      slash.classList.add("show");
    }
    var banner = $("#b-banner");
    if (banner) {
      banner.textContent = t("crit.splash");
      restartAnim(banner, "show");
    }
  }

  function playBattle(ctx, result) {
    battleBusy = true;
    clearBattleTimers();
    mountBattle(ctx);
    var i = 0;
    function step() {
      if (i >= result.log.length) {
        later(function () {
          battleBusy = false;
          showBattleResult(ctx, result);
        }, 500);
        return;
      }
      playStrike(ctx, result.log[i], function () {
        i += 1;
        later(step, 160);
      });
    }
    later(step, 550);
  }

  function playHitFx(atkId, defId, kind, ev) {
    var spark = $("#b-spark");
    if (spark && ev.result !== "miss") {
      spark.className = "fe-spark side-" + defId + (ev.crit ? " crit" : "");
      void spark.offsetWidth;
      spark.classList.add("show");
    }
    if (kind === "bow") {
      var arrow = $("#b-arrow");
      if (arrow) {
        arrow.className = "fe-arrow from-" + atkId;
        void arrow.offsetWidth;
        arrow.classList.add("show");
      }
    } else if (kind === "lance") {
      var thrust = $("#b-thrust");
      if (thrust) {
        thrust.className = "fe-thrust from-" + atkId;
        void thrust.offsetWidth;
        thrust.classList.add("show");
      }
    } else {
      var slash = $("#b-slash");
      if (slash && ev.result !== "miss" && !ev.crit) {
        slash.className = "fe-slash side-" + defId + " hit";
        void slash.offsetWidth;
        slash.classList.add("show");
      }
    }
  }

  function setActing(el, on) {
    if (!el) return;
    el.classList.toggle("acting", !!on);
    if (!on && !el.classList.contains("down")) el.classList.add("idle");
    else el.classList.remove("idle");
  }

  function clearStrikeClasses(el) {
    if (!el) return;
    el.className = el.className
      .split(" ")
      .filter(function (c) {
        return (
          c &&
          c !== "lunge" &&
          c !== "lunge-bow" &&
          c !== "hurt" &&
          c !== "dodge" &&
          c !== "crit-hurt" &&
          c !== "crit-windup" &&
          c !== "crit-dash" &&
          c !== "crit-flourish" &&
          c !== "crit-recover" &&
          c !== "crit-fire" &&
          c !== "crit-sword" &&
          c !== "crit-axe" &&
          c !== "crit-lance" &&
          c !== "crit-bow" &&
          c !== "acting"
        );
      })
      .join(" ");
  }

  function flashSlash(id, defId, extra) {
    var el = $(id);
    if (!el) return;
    el.className = "fe-slash side-" + defId + (extra ? " " + extra : "");
    void el.offsetWidth;
    el.classList.add("show");
  }

  function flashShock(defId) {
    var el = $("#b-shock");
    if (!el) return;
    el.className = "fe-shock side-" + defId;
    void el.offsetWidth;
    el.classList.add("show");
  }

  function playStrike(ctx, ev, done) {
    var atkId = ev.side === "a" ? "a" : "b";
    var defId = ev.side === "a" ? "b" : "a";
    var atkEl = $("#b-f-" + atkId);
    var defEl = $("#b-f-" + defId);
    var defMax = ev.side === "a" ? ctx.def.maxHp : ctx.atk.maxHp;
    if (!atkEl || !defEl) {
      done();
      return;
    }
    var atkUnit = ev.side === "a" ? ctx.atk : ctx.def;
    var atkFacing = ev.side === "a" ? "r" : "l";
    var atkFoe = ev.side !== "a";
    var atkImg = atkEl.querySelector(".stand-art");
    var kind = weaponKind(atkUnit);
    if (ev.crit) {
      playCritStrike(ctx, ev, atkId, defId, atkEl, defEl, atkUnit, atkFacing, atkFoe, atkImg, kind, defMax, done);
      return;
    }
    setActing(atkEl, true);
    atkEl.classList.remove("lunge", "lunge-bow");
    void atkEl.offsetWidth;
    atkEl.classList.add(kind === "bow" ? "lunge-bow" : "lunge");
    if (atkImg) atkImg.src = standSrc(atkUnit, atkFoe, atkFacing, "atk");
    later(function () {
      defEl.classList.remove("hurt", "dodge");
      void defEl.offsetWidth;
      playHitFx(atkId, defId, kind, ev);
      if (ev.result === "miss" || ev.result === "broke") {
        showPop(defId, ev.result === "broke" ? t("battle.broke") : t("battle.miss"), "miss");
        defEl.classList.add("dodge");
      } else {
        showPop(defId, String(ev.damage), "hit");
        defEl.classList.add("hurt");
      }
      setBattleHp(defId, ev.defenderHp, defMax);
      if (ev.defenderHp <= 0) defEl.classList.add("down");
      later(function () {
        clearStrikeClasses(atkEl);
        defEl.classList.remove("hurt");
        defEl.classList.remove("dodge");
        if (atkImg) atkImg.src = standSrc(atkUnit, atkFoe, atkFacing);
        setActing(atkEl, false);
        done();
      }, 420);
    }, kind === "bow" ? 200 : 270);
  }

  function playCritStrike(ctx, ev, atkId, defId, atkEl, defEl, atkUnit, atkFacing, atkFoe, atkImg, kind, defMax, done) {
    var battle = $("#battle .fe-battle");
    var styleClass = kind === "bow" ? "crit-bow" : kind === "lance" ? "crit-lance" : kind === "axe" ? "crit-axe" : "crit-sword";
    setActing(atkEl, true);
    if (battle) battle.classList.add("crit-mode");
    atkEl.classList.add(styleClass, "crit-windup");
    if (kind === "bow" && atkImg) atkImg.src = standSrc(atkUnit, atkFoe, atkFacing, "atk");

    function landHit() {
      defEl.classList.remove("hurt", "dodge", "crit-hurt");
      void defEl.offsetWidth;
      playCritEffect(atkEl, defEl, defId);
      if (kind === "axe" || kind === "lance") flashShock(defId);
      showPop(defId, String(ev.damage), "crit");
      defEl.classList.add("hurt");
      defEl.classList.add("crit-hurt");
      setBattleHp(defId, ev.defenderHp, defMax);
      if (ev.defenderHp <= 0) defEl.classList.add("down");
    }

    function finish(delay) {
      later(function () {
        atkEl.classList.remove("crit-dash", "crit-flourish", "crit-fire");
        atkEl.classList.add("crit-recover");
        if (atkImg) atkImg.src = standSrc(atkUnit, atkFoe, atkFacing);
        later(function () {
          clearStrikeClasses(atkEl);
          defEl.classList.remove("hurt");
          defEl.classList.remove("crit-hurt");
          if (battle) battle.classList.remove("crit-mode");
          var stage = $("#b-stage");
          if (stage) stage.classList.remove("crit-shake");
          setActing(atkEl, false);
          done();
        }, 280);
      }, delay);
    }

    if (kind === "bow") {
      later(function () {
        atkEl.classList.remove("crit-windup");
        atkEl.classList.add("crit-fire");
        var arrow = $("#b-arrow");
        if (arrow) {
          arrow.className = "fe-arrow crit from-" + atkId;
          void arrow.offsetWidth;
          arrow.classList.add("show");
        }
        later(function () {
          var spark = $("#b-spark");
          if (spark) {
            spark.className = "fe-spark side-" + defId + " crit";
            void spark.offsetWidth;
            spark.classList.add("show");
          }
          landHit();
        }, 280);
      }, 480);
      finish(1100);
      return;
    }

    later(function () {
      if (atkImg) atkImg.src = standSrc(atkUnit, atkFoe, atkFacing, "atk");
      atkEl.classList.remove("crit-windup");
      atkEl.classList.add(kind === "sword" || kind === "axe" || kind === "lance" ? "crit-flourish" : "crit-dash");
      if (kind === "sword") {
        later(function () { flashSlash("#b-slash2", defId, "slash-2"); }, 200);
        later(function () {
          flashSlash("#b-slash3", defId, "slash-3");
          var spark = $("#b-spark");
          if (spark) {
            spark.className = "fe-spark side-" + defId + " crit";
            void spark.offsetWidth;
            spark.classList.add("show");
          }
        }, 340);
        later(landHit, 480);
      } else if (kind === "axe") {
        later(function () {
          flashSlash("#b-slash2", defId, "slash-3");
          flashShock(defId);
        }, 300);
        later(landHit, 420);
      } else {
        later(function () {
          var thrust = $("#b-thrust");
          if (thrust) {
            thrust.className = "fe-thrust crit from-" + atkId;
            void thrust.offsetWidth;
            thrust.classList.add("show");
          }
        }, 160);
        later(function () {
          var thrust = $("#b-thrust");
          if (thrust) {
            thrust.className = "fe-thrust crit from-" + atkId;
            void thrust.offsetWidth;
            thrust.classList.add("show");
          }
          flashShock(defId);
        }, 300);
        later(landHit, 400);
      }
    }, 360);
    finish(kind === "sword" ? 1200 : 1100);
  }

  function showBattleResult(ctx, result) {
    if (ctx.kind === "dungeon") {
      showDungeonRoundResult(ctx, result);
      return;
    }
    var p = active();
    p.hp = result.aHp;
    syncUsesFromFighter(p, ctx.atk);
    var win = result.winner === "a";
    var lost = result.aHp <= 0;
    var expGain = 0;
    var goldGain = 0;
    var note = "";

    var rewardLine = t("battle.noReward");
    if (ctx.kind === "train") {
      var hpGain = p.maxHp - ctx.preMax;
      p.hp = Math.min(p.maxHp, ctx.preHp + hpGain);
      expGain = lost ? Math.round(ctx.exp * 0.7) : ctx.exp;
      note = win
        ? t("train.win")
        : lost
        ? t("train.lose")
        : t("train.draw");
      rewardLine = t("battle.exp", { exp: expGain });
    } else if (ctx.kind === "arena") {
      if (p.hp < 0) p.hp = 0;
      if (win) {
        addPersonalPoints(D.ARENA_WIN_POINTS);
        queuePublish();
        note = t("arena.win");
        rewardLine = t("arena.pointsGain", {
          n: D.ARENA_WIN_POINTS,
          personal: currentPersonalPoints(),
          guild: currentGuildPoints()
        });
      } else {
        if (p.hp < 1) p.hp = 0;
        note = t("arena.lose");
        rewardLine = "";
      }
    } else if (ctx.kind === "guild") {
      if (win) {
        var pts = (ctx.points != null ? ctx.points : D.GUILD_HUNT_POINTS);
        addGuildPoints(pts);
        state.guildQuest.done = true;
        note = t("guild.win", { points: pts });
        rewardLine = t("quest.doneReward", { points: pts });
      } else {
        if (p.hp < 1) p.hp = 0;
        note = t("guild.lose");
        rewardLine = "";
      }
    }

    var lv = ctx.kind === "train" ? gainExp(expGain) : [];
    pendingLevelUps = lv;
    renderHud();
    save();

    var layer = document.createElement("div");
    layer.className = "result-layer";
    layer.innerHTML =
      '<div class="result-win fe-win"><h3>' +
      (win ? t("battle.win") : t("battle.lose")) +
      "</h3><p>" +
      note +
      "</p>" +
      (rewardLine ? "<p>" + rewardLine + "</p>" : "") +
      '<div class="actions"><button type="button" class="btn btn-gold" data-act="battle-done">' +
      t("ui.confirm") +
      "</button></div></div>";
    var stage = $("#battle .fe-battle");
    if (stage) stage.appendChild(layer);
    else $("#battle").innerHTML = layer.innerHTML;
    pendingBattle = ctx;
    ctx.lost = lost;
    ctx.kindDone = true;
  }

  function afterBattleDismiss() {
    var ctx = pendingBattle;
    closeBattle();
    if (!ctx) {
      renderHud();
      return;
    }
    var goOn = function () {
      if (ctx.kind === "arena" || ctx.kind === "guild") {
        advancePeriod();
        if (ctx.kind === "arena") openArena();
        else openGuild();
        return;
      }
      if (ctx.kind !== "train" && ctx.lost) {
        faint(t("faint.battle"), true);
        return;
      }
      advancePeriod();
    };
    finishWithLevelsOr(goOn);
  }

  /* ---------- 事件 ---------- */
  function onAct(act, btn) {
    var id = btn ? btn.getAttribute("data-id") : null;
    var p;

    if (act === "start") {
      startFresh();
      return;
    }
    if (act === "continue") {
      var loaded = loadSave();
      if (!loaded || !loaded.party || !loaded.party.length) {
        toast(t("noSave"));
        startFresh();
        return;
      }
      state = loaded;
      try {
        if (!localStorage.getItem(I18n.KEY) && (state.lang === "en" || state.lang === "zh")) {
          I18n.setLang(state.lang);
        }
      } catch (e) {}
      state.lang = I18n.getLang();
      save();
      applyLanguage();
      enterTown(false);
      return;
    }
    if (act === "select-unit") {
      if (id) setActive(id);
      return;
    }
    if (act === "close" || act === "leave") {
      closeModal();
      return;
    }
    if (act === "after-action") {
      finishWithLevelsOr(function () {
        closeModal();
        advancePeriod();
      });
      return;
    }
    if (act === "lv-next") {
      if (pendingLevelUps && pendingLevelUps.length) {
        showNextLevelUp();
        return;
      }
      var nxt = pendingAfter;
      pendingAfter = null;
      if (nxt) nxt();
      else closeModal();
      return;
    }

    if (act === "bag") {
      openBag();
      return;
    }
    if (act === "stats") {
      openStats();
      return;
    }
    if (act === "guild") {
      openGuild();
      return;
    }
    if (act === "guild-job") {
      openGuild();
      return;
    }
    if (act === "guild-rules") {
      openGuildRules();
      return;
    }
    if (act === "guild-switch") {
      if (guildSwitchLeft()) {
        toast(t("guild.lockToast", { time: formatSeasonTime(guildSwitchLeft()) }));
        return;
      }
      openGuildJoin();
      return;
    }
    if (act === "join-guild") {
      if (!id || !D.GUILDS[id] || state.guildId === id) return;
      if (state.guildId && guildSwitchLeft()) {
        toast(t("guild.lockToast", { time: formatSeasonTime(guildSwitchLeft()) }));
        return;
      }
      state.guildId = id;
      state.guildJoinedAt = Date.now();
      if (!state.guildPoints) state.guildPoints = {};
      if (state.guildPoints[id] == null) state.guildPoints[id] = 0;
      save();
      queuePublish();
      renderHud();
      openGuild();
      return;
    }
    if (act === "guild-fight") {
      p = active();
      if (!state.guildId) {
        toast(t("guild.needJoin"));
        return;
      }
      if (state.guildQuest.done) return;
      if (p.hp <= 0) {
        toast(t("toast.cantStand") || t("arena.noHp", { name: displayName(p) }));
        return;
      }
      if (!assertUsableWeapon(p)) return;
      closeModal();
      showForecast({
        kind: "guild",
        title: t("guild.huntName"),
        titleShort: t("guild.title"),
        atk: playerFighter(),
        def: fighterFrom(state.guildQuest.unit, false),
        fee: 0,
        points: state.guildQuest.points || D.GUILD_HUNT_POINTS,
        exp: 0
      });
      return;
    }
    if (act === "do-quest") {
      completeQuest(id);
      return;
    }
    if (act === "buy-item") {
      buyItem(id);
      return;
    }
    if (act === "buy-weapon") {
      buyWeapon(id);
      return;
    }
    if (act === "equip") {
      p = active();
      if (!canUseWeapon(id) || p.weapons.indexOf(id) === -1) return;
      p.weaponId = id;
      save();
      toast(t("equipOk", { name: weaponName(id) }));
      if ($("#modal") && $("#modal").dataset.view === "shop") openShop();
      else openBag();
      renderHud();
      return;
    }
    if (act === "use-item") {
      useItem(id);
      return;
    }
    if (act === "train-up") {
      p = active();
      if (p.level >= D.LEVEL_CAP) {
        toast(t("train.capToast"));
        return;
      }
      var fee = trainFee(effectiveLevel(p));
      if (state.gold < fee) {
        toast(t("train.poorToast"));
        return;
      }
      addGold(-fee);
      pendingLevelUps = grantOneLevel();
      renderHud();
      save();
      finishWithLevelsOr(function () {
        closeModal();
        advancePeriod();
      });
      return;
    }
    if (act === "arena-after-prize") {
      openArena(true);
      return;
    }
    if (act === "personal-board") {
      openPersonalBoard();
      return;
    }
    if (act === "personal-back") {
      if (personalBoardBack === "guild") openGuild();
      else openArena(true);
      return;
    }
    if (act === "save-name") {
      savePlayerName();
      return;
    }
    if (act === "dungeon-pick") {
      openDungeonPick();
      return;
    }
    if (act === "dungeon-choose") {
      if (id) openDungeonDeploy(id);
      return;
    }
    if (act === "arena" || act === "arena-fight") {
      p = active();
      if (act === "arena-fight") {
        if (p.hp <= 0) {
          toast(t("arena.noHp", { name: displayName(p) }));
          return;
        }
        if (isArenaFought(p)) {
          toast(t("arena.noFights"));
          return;
        }
        if (!assertUsableWeapon(p)) return;
        var foe = makeArenaFoe();
        closeModal();
        pendingBattle = {
          kind: "arena",
          title: t("arena.titleOf", { name: displayName(foe) }),
          atk: playerFighter(),
          def: fighterFrom(foe, false),
          fee: 0,
          exp: 0
        };
        startPendingFight();
        return;
      }
      if (p.hp <= 0) {
        toast(t("arena.noHp", { name: displayName(p) }));
        return;
      }
      openArena();
      return;
    }
    if (act === "fight") {
      startPendingFight();
      return;
    }
    if (act === "cancel-fight") {
      var wasDungeon = pendingBattle && pendingBattle.kind === "dungeon";
      closeBattle();
      if (wasDungeon) renderDungeonRoom();
      return;
    }
    if (act === "battle-done") {
      afterBattleDismiss();
      return;
    }
    if (act === "dungeon-enter") {
      startDungeonRun(collectedDeployIds());
      return;
    }
    if (act === "dungeon-atk") {
      beginDungeonAttack(id);
      return;
    }
    if (act === "dungeon-retreat") {
      retreatDungeon();
      return;
    }
    if (act === "dungeon-room") {
      closeBattle();
      pendingBattle = null;
      renderDungeonRoom();
      return;
    }
    if (act === "dungeon-boss-turn") {
      closeBattle();
      pendingBattle = null;
      beginDungeonBossTurn();
      return;
    }
    if (act === "dungeon-next-wave") {
      closeBattle();
      pendingBattle = null;
      if (dungeonRun && dungeonRun.boss && dungeonRun.boss.hp <= 0) finishDungeonWin();
      else renderDungeonRoom();
      return;
    }
    if (act === "repair") {
      repairWeapon(btn ? btn.getAttribute("data-unit") : null, id);
      return;
    }
    if (act === "dungeon-win") {
      closeBattle();
      pendingBattle = null;
      finishDungeonWin();
      return;
    }
    if (act === "dungeon-wipe") {
      closeBattle();
      pendingBattle = null;
      finishDungeonWipe();
      return;
    }
    if (act === "dungeon-close") {
      closeDungeonRunToMap(true);
      return;
    }
  }

  function buyItem(id) {
    var it = D.ITEMS[id];
    if (!it) return;
    if (state.gold < it.cost) {
      toast(t("goldShort"));
      return;
    }
    addGold(-it.cost);
    state.items[id] = (state.items[id] || 0) + 1;
    save();
    renderHud();
    toast(t("buyItem", { name: itemName(it) }));
    openShop();
  }

  function buyWeapon(id) {
    var w = D.WEAPONS[id];
    var p = active();
    if (!w || !canUseWeapon(id)) return;
    if (p.weapons.indexOf(id) !== -1) return;
    if (state.gold < w.cost) {
      toast(t("goldShort"));
      return;
    }
    addGold(-w.cost);
    grantWeapon(p, id);
    p.weaponId = id;
    save();
    renderHud();
    toast(t("buyWeapon", { name: weaponName(w) }));
    openShop();
  }

  function promoteUnit(u) {
    var promo = u && D.PROMOTIONS[u.classId];
    var k, i;
    if (!promo || u.promoted || u.level < 10) return false;
    for (i = 0; i < STAT_KEYS.length; i++) {
      k = STAT_KEYS[i];
      if (!promo[k]) continue;
      if (k === "hp") {
        u.maxHp += promo[k];
        u.hp += promo[k];
      } else {
        u[k] += promo[k];
      }
    }
    u.promoted = true;
    u.level = 1;
    u.exp = 0;
    return true;
  }

  function useItem(id, silent) {
    var p = active();
    var it = D.ITEMS[id];
    if (!it || !state.items) return;
    if (id === "challengeWrit") {
      if (!(state.items.challengeWrit > 0)) return;
      if (!isArenaFought(p)) {
        if (!silent) toast(t("bag.writFull", { name: displayName(p) }));
        return;
      }
      state.items.challengeWrit -= 1;
      clearArenaFought(p);
      if (!silent) toast(t("bag.writUsed", { name: displayName(p) }));
      save();
      renderHud();
      if (!silent && $("#modal") && $("#modal").dataset.view === "bag") openBag();
      return;
    }
    if (id === "promoBook") {
      if (!(state.items.promoBook > 0)) {
        if (!silent) toast(t("bag.noTome"));
        return;
      }
      if (p.promoted) {
        if (!silent) toast(t("bag.promoAlready"));
        return;
      }
      if (p.level < 10) {
        if (!silent) toast(t("bag.promoNeedLv"));
        return;
      }
      if (!promoteUnit(p)) return;
      state.items.promoBook -= 1;
      if (!silent) toast(t("bag.promoOk", { name: displayName(p), class: classNameOf(p) }));
      save();
      renderHud();
      if (!silent && $("#modal") && $("#modal").dataset.view === "bag") openBag();
      return;
    }
    if (id !== "tonic" || !state.items.tonic) return;
    if (p.hp >= p.maxHp) {
      if (!silent) toast(t("toast.hpFull"));
      return;
    }
    state.items.tonic -= 1;
    p.hp = Math.min(p.maxHp, p.hp + it.hp);
    if (!silent) toast(t("useTonic", { name: displayName(p), hp: it.hp }));
    save();
    renderHud();
    if (!silent) {
      if ($("#modal") && $("#modal").dataset.view === "bag") openBag();
    }
  }

  function renderTerrain(info) {
    var nameEl = $("#terrain-name");
    var subEl = $("#terrain-sub");
    var btn = $("#btn-enter-place");
    if (!nameEl || !info) return;
    nameEl.textContent = info.name;
    var sub = info.place ? (info.terrain || "") : (info.walk ? t("terrain.walk") : t("terrain.blocked"));
    if (info.place && info.terrain && info.terrain !== info.name) sub = info.terrain;
    subEl.textContent = sub;
    if (info.place) btn.removeAttribute("hidden");
    else btn.setAttribute("hidden", "");
  }

  function mapBlocked() {
    return !$("#modal").classList.contains("hidden") || !$("#battle").classList.contains("hidden");
  }

  function mountTownMap() {
    TownMap.mount(
      $("#town-map"),
      $("#map-wrap"),
      $("#map-labels"),
      {
        isBlocked: mapBlocked,
        onCursor: renderTerrain,
        onEnter: function (place) {
          if (mapBlocked()) return;
          openPlace(place);
        }
      }
    );
    TownMap.layoutLabels();
  }

  function enterTown(fresh) {
    showScreen("screen-town");
    renderHud();
    mountTownMap();
    startIncomeTimer();
    catchUpIncome();
    renderHud();
    settleArenaSeason(function () {
      renderHud();
      queuePublish();
      if (fresh && !state.introShown) {
        state.introShown = true;
        save();
        showWelcome();
        return;
      }
      if (state.arenaPrizeNote) showArenaPrizeNote();
    });
  }

  function refreshTitle() {
    var btn = $("#btn-continue");
    if (hasSave()) btn.removeAttribute("hidden");
    else btn.setAttribute("hidden", "");
  }

  function bind() {
    $("#btn-start").addEventListener("click", function () {
      onAct("start");
    });
    $("#btn-continue").addEventListener("click", function () {
      onAct("continue");
    });
    var enterBtn = $("#btn-enter-place");
    if (enterBtn) {
      enterBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (mapBlocked()) return;
        TownMap.tryConfirm();
      });
    }
    document.addEventListener("click", function (e) {
      var langBtn = e.target.closest("[data-lang]");
      if (langBtn) {
        e.preventDefault();
        setLanguage(langBtn.getAttribute("data-lang"));
        return;
      }
      var hudBtn = e.target.closest("#hud [data-act]");
      if (hudBtn && $("#modal").classList.contains("hidden") && $("#battle").classList.contains("hidden")) {
        onAct(hudBtn.getAttribute("data-act"), hudBtn);
        return;
      }
      var btn = e.target.closest("#modal [data-act], #battle [data-act], #class-row [data-act]");
      if (!btn || btn.disabled) return;
      if (battleBusy && btn.getAttribute("data-act") !== "battle-done") return;
      onAct(btn.getAttribute("data-act"), btn);
    });
    $("#modal").addEventListener("click", function (e) {
      if (e.target === $("#modal") && $("#modal").dataset.lock !== "1") closeModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (battleBusy) return;
        if (!$("#battle").classList.contains("hidden")) {
          if (pendingBattle && pendingBattle.kindDone) afterBattleDismiss();
          else if (pendingBattle && !pendingBattle.result) closeBattle();
          return;
        }
        if (!$("#modal").classList.contains("hidden") && $("#modal").dataset.lock !== "1") closeModal();
      }
    });
  }

  function init() {
    bind();
    I18n.onChange(applyLanguage);
    applyLanguage();
    refreshTitle();
    startIncomeTimer();
  }

  window.AshlampDebug = {
    tickIncome: function (n) {
      n = n || 1;
      if (!state) return null;
      var gained = applyIncomeTicks(n, true);
      state.lastGoldTick = Date.now();
      save();
      return { gold: state.gold, gained: gained, rate: goldRate(), perDay: goldPerDay() };
    },
    getState: function () {
      if (!state) return null;
      return {
        gold: state.gold,
        activeId: state.activeId,
        lastGoldTick: state.lastGoldTick,
        rate: goldRate(),
        perDay: goldPerDay(),
        day: state.day,
        period: state.period,
        map: TownMap.currentMap ? TownMap.currentMap() : "town",
        dungeon: dungeonRun
          ? { living: dungeonRun.living.slice(), bossHp: dungeonRun.boss.hp, ids: dungeonRun.ids.slice(), dungeonId: dungeonRun.dungeonId }
          : null,
        party: state.party.map(function (u) {
          return {
            id: u.id,
            name: u.name,
            classId: u.classId,
            className: classNameOf(u),
            promoted: !!u.promoted,
            level: u.level,
            effectiveLevel: effectiveLevel(u),
            hp: u.hp,
            maxHp: u.maxHp,
            weapon: u.weaponId,
            uses: usesOf(u, u.weaponId),
            dungeonLockUntil: u.dungeonLockUntil || emptyDungeonTimes(),
            dungeonFoughtUntil: u.dungeonFoughtUntil || emptyDungeonTimes(),
            arenaFoughtUntil: u.arenaFoughtUntil || 0,
            lockLabel: dungeonTip(u)
          };
        })
      };
    },
    setLastTickAgo: function (ms) {
      if (!state) return;
      state.lastGoldTick = Date.now() - ms;
      save();
    },
    setGold: function (n) {
      if (!state) return null;
      state.gold = Math.max(0, n);
      renderHud();
      save();
      return state.gold;
    },
    setPeriod: function (n) {
      if (!state) return null;
      state.period = C.clamp(n, 0, 2);
      renderHud();
      save();
      return { day: state.day, period: state.period, name: periodName() };
    },
    advancePeriod: function () {
      if (!state) return null;
      advancePeriod();
      return { day: state.day, period: state.period, name: periodName() };
    },
    goWilds: function () {
      openPlace("wilds");
      return TownMap.currentMap();
    },
    goTown: function () {
      openPlace("town");
      return TownMap.currentMap();
    },
    openDeploy: function (dungeonId) {
      openDungeonDeploy(dungeonId || "d1");
    },
    startDungeon: function (ids, dungeonId) {
      if (dungeonId) pendingDungeonId = dungeonId;
      if (!ids) ids = state.party.map(function (u) { return u.id; });
      startDungeonRun(ids);
      return dungeonRun && { living: dungeonRun.living.slice(), bossHp: dungeonRun.boss.hp, dungeonId: dungeonRun.dungeonId };
    },
    lockoutUnit: function (classId, atMs, dungeonId) {
      var u = unitById(classId);
      if (!u) return null;
      lockUnit(u, atMs || Date.now(), dungeonId || "d1");
      renderHud();
      save();
      return { classId: classId, until: timeAt(u, "dungeonLockUntil", dungeonId || "d1"), label: lockoutLabel(u, dungeonId || "d1") };
    },
    nextUnlockMs: nextUnlockMs,
    shanghaiParts: shanghaiParts,
    makeBoss: makeBossFighter,
    openShop: function () { openShop(); },
    openBoard: function () { openBoard(); },
    openBank: function () { openBank(); },
    openStatue: function (heal) { openStatue(heal !== false); },
    setHp: function (classId, hp) {
      var u = unitById(classId);
      if (!u) return null;
      u.hp = Math.max(0, Math.min(u.maxHp, hp));
      renderHud();
      save();
      return { classId: classId, hp: u.hp, maxHp: u.maxHp };
    },
    grantCopper: function (id, classIds) {
      var ids = classIds || state.party.map(function (u) { return u.id; });
      var drop = grantCopperReward(ids, id);
      save();
      return drop && drop.weapon ? { weapon: weaponName(drop.weapon), unit: drop.unit && displayName(drop.unit) } : null;
    },
    previewVictory: function (weaponId, dungeonId) {
      var id = dungeonId || (weaponId && String(weaponId).indexOf("copper") === 0 ? "d1" : "d2");
      pendingDungeonId = id;
      if (!dungeonRun) {
        dungeonRun = {
          ids: state.party.map(function (u) { return u.id; }),
          living: state.party.map(function (u) { return u.id; }),
          dungeonId: id,
          loot: {},
          boss: makeMonster(id, 0),
          lastAtk: state.activeId,
          phase: "player"
        };
        dungeonRun.boss.hp = 0;
      }
      dungeonRun.dungeonId = id;
      if (weaponId && String(weaponId).indexOf("copper") === 0) {
        if (!dungeonRun.loot) dungeonRun.loot = {};
        dungeonRun.loot.copper = grantCopperReward(dungeonRun.ids, weaponId);
        finishDungeonWin();
      } else if (id === "d1") {
        finishDungeonWin();
      } else {
        finishDungeonWin(weaponId || "silver-axe");
      }
    },
    previewCrit: function () {
      var atk = fighterFrom(active());
      var def = makeBossFighter(80);
      pendingBattle = {
        kind: "arena",
        title: t("crit.splash"),
        atk: atk,
        def: def,
        unitId: atk.classId,
        playerIsA: true
      };
      var battle = $("#battle");
      battle.classList.remove("hidden");
      mountBattle(pendingBattle);
      battleBusy = true;
      playStrike(
        pendingBattle,
        { side: "a", result: "crit", crit: true, damage: 21, defenderHp: 79, hit: true },
        function () { battleBusy = false; }
      );
    }
  };

  document.addEventListener("DOMContentLoaded", init);
})();
