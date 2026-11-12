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
  function classNameOf(person) {
    if (!person) return "";
    if (typeof person === "string") {
      if (D.CLASSES[person]) return t("class." + person);
      return person;
    }
    if (person.weapon && person.weapon.type === "train") return t("arena.dummy");
    if (person.className === "训练器具" || person.className === "Training Dummy") return t("arena.dummy");
    if (person.classId && D.CLASSES[person.classId]) return t("class." + person.classId);
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
    if (n === "石门骑士 柯刚" || n === "Stonegate Knight Kegang") return t("boss.name");
    if (n === "木人" || n === "Wooden Dummy" || n === "Training Dummy") return t("arena.dummyName");
    if (n === "教练" || n === "Instructor" || /^教练/.test(n) || /^Instructor\b/.test(n)) return t("arena.instructor");
    if (n === "老兵" || n === "Veteran" || /^老兵/.test(n) || /^Veteran\b/.test(n)) return t("arena.veteran");
    if (cid && D.CLASSES[cid]) {
      var zh = I18n.literal("zh", "class." + cid);
      var en = I18n.literal("en", "class." + cid);
      var raw = D.CLASSES[cid].name;
      if (n === zh || n === en || n === raw) return t("class." + cid);
    }
    return n;
  }
  function itemName(it) {
    if (!it) return "";
    var id = typeof it === "string" ? it : it.id;
    if (id === "tonic") return t("item.tonic");
    return (typeof it === "object" && it.name) ? it.name : String(it);
  }
  function wepLine(w) {
    if (!w) return "";
    return t("wep.line", { mt: w.mt, hit: w.hit, wt: w.wt });
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
    if (ctx.kind === "guild") return t("guild.questName");
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
      else if (view === "dungeon-deploy") openDungeonDeploy();
      else if (view === "dungeon-room") renderDungeonRoom();
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
        var nm = $("#hp-win-" + id + " .nm");
        var cl = $("#hp-win-" + id + " .cl");
        if (nm) nm.textContent = displayName(unit);
        if (cl) cl.textContent = classNameOf(unit);
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
    var v = lastVictory || { goldGain: 0, drop: null };
    var dropLine = "";
    if (v.drop && v.drop.weapon && v.drop.unit) {
      dropLine =
        "<p class='loot-note'>" +
        t("dungeon.loot", { weapon: weaponName(v.drop.weapon), name: displayName(v.drop.unit) }) +
        "</p>";
    }
    openModal(
      panel(
        t("dungeon.winTitle"),
        "<p>" +
          t("dungeon.winLead") +
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
  function artClass(person) {
    if (!person) return "dummy";
    if (person.classId && D.CLASSES[person.classId]) return person.classId;
    if (person.className === "训练器具" || person.className === "Training Dummy") return "dummy";
    if (person.weapon && person.weapon.type === "train") return "dummy";
    return "sword";
  }
  function mugSrc(person, foe) {
    var id = typeof person === "string" ? person : artClass(person);
    if (id === "dummy") return "assets/units/mug-dummy.png";
    return "assets/units/mug-" + id + (foe ? "-foe" : "") + ".png";
  }
  function standSrc(person, foe, facing) {
    var id = artClass(person);
    if (id === "dummy") return "assets/units/stand-dummy-" + facing + ".png";
    return "assets/units/stand-" + id + "-" + facing + (foe ? "-foe" : "") + ".png";
  }
  function mugTag(person, foe, clsName) {
    return (
      '<img class="' +
      (clsName || "mug") +
      '" src="' +
      mugSrc(person, foe) +
      '" alt="" draggable="false" />'
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

  function newUnit(name, classId) {
    var cls = D.CLASSES[classId];
    var b = cls.bases;
    return {
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
      weaponId: cls.startingWeapon,
      weapons: [cls.startingWeapon],
      dungeonLockUntil: 0
    };
  }

  function unitFromSave(raw, fallbackId) {
    var classId = raw && D.CLASSES[raw.classId] ? raw.classId : fallbackId;
    if (!classId || !D.CLASSES[classId]) return null;
    var cls = D.CLASSES[classId];
    var u = newUnit(cls.name, classId);
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
    if (u.maxHp < 1) u.maxHp = cls.bases.hp;
    if (u.hp > u.maxHp) u.hp = u.maxHp;
    if (u.level >= D.LEVEL_CAP) u.exp = 0;
    if (typeof raw.dungeonLockUntil === "number") u.dungeonLockUntil = raw.dungeonLockUntil;
    ensureLanceLoadout(u);
    return u;
  }

  function ensureLanceLoadout(u) {
    if (!u || (u.classId !== "cavalier" && u.classId !== "armor")) return;
    var w = D.WEAPONS[u.weaponId];
    if (w && w.type === "lance") return;
    var start = D.CLASSES[u.classId].startingWeapon;
    if (u.weapons.indexOf(start) === -1) u.weapons.push(start);
    u.weaponId = start;
  }

  function emptyState() {
    return {
      party: D.PARTY_ORDER.map(function (id) { return newUnit(D.CLASSES[id].name, id); }),
      activeId: D.PARTY_ORDER[0],
      gold: D.GOLD_CAP,
      items: { tonic: 0 },
      day: 1,
      period: 0,
      quests: pickQuests(1),
      guildQuest: generateGuildQuest(1, 1),
      arenaRoster: generateArenaRoster(1, 1),
      introShown: false,
      restedAtInn: false,
      lastGoldTick: Date.now()
    };
  }

  function migrateSave(data) {
    if (!data || typeof data !== "object") return null;
    try {
      var have = {};
      var party = [];
      var i, u, id;
      if (Array.isArray(data.party)) {
        for (i = 0; i < data.party.length; i++) {
          u = unitFromSave(data.party[i], data.party[i] && data.party[i].classId);
          if (u && !have[u.classId]) {
            have[u.classId] = u;
          }
        }
      }
      if (data.player && data.player.classId) {
        u = unitFromSave(data.player, data.player.classId);
        if (u) have[u.classId] = u;
      }
      for (i = 0; i < D.PARTY_ORDER.length; i++) {
        id = D.PARTY_ORDER[i];
        party.push(have[id] || newUnit(D.CLASSES[id].name, id));
      }
      if (!party.length) return null;
      for (i = 0; i < party.length; i++) ensureLanceLoadout(party[i]);

      var tonic = 0;
      if (data.items && typeof data.items.tonic === "number") tonic = data.items.tonic;
      else if (data.player && data.player.items && typeof data.player.items.tonic === "number") {
        tonic = data.player.items.tonic;
      }
      if (tonic < 0) tonic = 0;

      var activeId = data.activeId;
      if (!D.CLASSES[activeId]) {
        activeId = data.player && D.CLASSES[data.player.classId] ? data.player.classId : party[0].classId;
      }

      var day = typeof data.day === "number" ? Math.max(1, Math.floor(data.day)) : 1;
      var period = typeof data.period === "number" ? C.clamp(Math.floor(data.period), 0, 2) : 0;
      var lastTick = typeof data.lastGoldTick === "number" ? data.lastGoldTick : Date.now();

      return {
        party: party,
        activeId: activeId,
        gold: D.GOLD_CAP,
        items: { tonic: tonic },
        day: day,
        period: period,
        quests: Array.isArray(data.quests) ? data.quests : pickQuests(day),
        guildQuest: data.guildQuest || generateGuildQuest(day, partyMaxOf(party)),
        arenaRoster: Array.isArray(data.arenaRoster) ? data.arenaRoster : generateArenaRoster(day, partyMaxOf(party)),
        introShown: !!data.introShown,
        restedAtInn: !!data.restedAtInn,
        lastGoldTick: lastTick
      };
    } catch (e) {
      return null;
    }
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
      if (state.party[i].classId === state.activeId) return state.party[i];
    }
    u = state.party[0];
    state.activeId = u.classId;
    return u;
  }
  function partyMaxLevel() {
    return state ? partyMaxOf(state.party) : 1;
  }
  function goldRate() {
    var n = 0, i;
    if (!state || !state.party) return 0;
    for (i = 0; i < state.party.length; i++) n += state.party[i].level;
    return n;
  }
  function goldPerDay() {
    return goldRate() * D.TICKS_PER_DAY;
  }
  function healPartyFull() {
    var i, u;
    for (i = 0; i < state.party.length; i++) {
      u = state.party[i];
      u.hp = u.maxHp;
    }
  }
  function setActive(classId) {
    var i;
    for (i = 0; i < state.party.length; i++) {
      if (state.party[i].classId === classId) {
        state.activeId = classId;
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
        name: q.name,
        desc: q.desc,
        gold: q.gold,
        exp: q.exp,
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
      name: "guild.questName",
      desc: "",
      gold: 100,
      exp: 52,
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
    state.quests = pickQuests(state.day);
    state.guildQuest = generateGuildQuest(state.day, partyMaxLevel());
    state.arenaRoster = generateArenaRoster(state.day, partyMaxLevel());
    renderHud();
    save();
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
      r.unitId = p.classId;
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

  function addGold(n) {
    var before = state.gold;
    var g = before + n;
    if (g < 0) g = 0;
    if (g > D.GOLD_CAP) g = D.GOLD_CAP;
    state.gold = g;
    return g - before;
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

  function canUseWeapon(weaponId) {
    var w = D.WEAPONS[weaponId];
    var cls = D.CLASSES[active().classId];
    return w && w.type === cls.weaponType;
  }

  function currentWeapon() {
    return D.copyWeapon(active().weaponId);
  }

  function fighterFrom(person) {
    var w = person.weapon ? person.weapon : D.copyWeapon(person.weaponId);
    var bonuses = { hit: 0, avoid: 0 };
    return {
      name: person.name,
      classId: person.classId || "",
      className: person.className || (person.classId ? D.CLASSES[person.classId].name : ""),
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

  function clearLockIfDue(u, now) {
    if (!u) return false;
    if (typeof u.dungeonLockUntil === "number" && u.dungeonLockUntil > 0 && u.dungeonLockUntil <= now) {
      u.dungeonLockUntil = 0;
      u.hp = u.maxHp;
      return true;
    }
    return false;
  }

  function refreshLocks(now) {
    now = now || Date.now();
    var changed = false, i;
    if (!state || !state.party) return false;
    for (i = 0; i < state.party.length; i++) {
      if (clearLockIfDue(state.party[i], now)) changed = true;
    }
    return changed;
  }

  function isDungeonLocked(u, now) {
    now = now || Date.now();
    clearLockIfDue(u, now);
    return !!(u && typeof u.dungeonLockUntil === "number" && u.dungeonLockUntil > now);
  }

  function lockUnit(u, now) {
    if (!u) return;
    now = now || Date.now();
    u.dungeonLockUntil = nextUnlockMs(now);
  }

  function lockoutLabel(u) {
    if (!isDungeonLocked(u)) return "";
    var p = shanghaiParts(u.dungeonLockUntil);
    var nowP = shanghaiParts(Date.now());
    if (p.y === nowP.y && p.m === nowP.m && p.d === nowP.d) return t("lock.today");
    return t("lock.tomorrow");
  }

  function unitById(classId) {
    var i;
    if (!state) return null;
    for (i = 0; i < state.party.length; i++) {
      if (state.party[i].classId === classId) return state.party[i];
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
    var full = state.gold >= D.GOLD_CAP;
    var incomeLine = full
      ? t("hud.goldFull")
      : t("hud.income", { rate: rate }) + "　" + t("hud.incomeDay", { day: rate * D.TICKS_PER_DAY });
    var roster = state.party
      .map(function (u) {
        var lock = lockoutLabel(u);
        return (
          '<button type="button" class="hud-mate' +
          (u.classId === p.classId ? " selected" : "") +
          (lock ? " locked" : "") +
          '" data-act="select-unit" data-id="' +
          u.classId +
          '" title="' +
          esc(displayName(u)) +
          (lock ? "　" + lock : "") +
          '">' +
          mugTag(u, false, "mug") +
          '<span class="nm">' +
          esc(classNameOf(u)) +
          '</span><span class="lv">Lv.' +
          u.level +
          "</span>" +
          (lock ? '<span class="lock-tag">' + t("hud.defeated") + "</span>" : "") +
          "</button>"
        );
      })
      .join("");
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
      '<div class="hud-party" title="' +
      esc(t("hud.pickUnit")) +
      '">' +
      roster +
      "</div>" +
      '<div class="hud-meta"><div class="place">' +
      (TownMap.currentMap && TownMap.currentMap() === "wilds" ? t("place.wildsMap") : t("place.town")) +
      "</div><div>" +
      t("hud.day", { day: pDay() }) +
      "　" +
      periodName() +
      '</div><div class="gold">' +
      t("hud.gold") +
      "　" +
      state.gold +
      '</div><div class="income">' +
      incomeLine +
      '</div>' +
      langSwitcher(true) +
      '<span id="gold-pop" class="gold-pop" hidden></span></div>';
  }

  function showGoldPop(amount) {
    var el = $("#gold-pop");
    if (!el) return;
    el.hidden = false;
    el.textContent = amount > 0 ? "+" + amount : t("hud.goldFull");
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
    if (state.gold >= D.GOLD_CAP) return 0;
    var gained = addGold(goldRate() * ticks);
    renderHud();
    if (showPop && gained > 0) showGoldPop(gained);
    else if (showPop && state.gold >= D.GOLD_CAP) showGoldPop(0);
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
      openDungeonDeploy();
    }
  }

  function makeBossFighter(hp) {
    var b = D.DUNGEON_BOSS;
    return {
      name: b.name,
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
      weapon: D.copyWeapon(b.weaponId)
    };
  }

  function openDungeonDeploy() {
    refreshLocks();
    var rows = state.party.map(function (u) {
      var lock = lockoutLabel(u);
      var down = u.hp <= 0;
      var disabled = !!(lock || down);
      return (
        '<label class="deploy-row' +
        (disabled ? " is-locked" : "") +
        '"><input type="checkbox" data-deploy="' +
        u.classId +
        '" ' +
        (disabled ? "disabled" : "checked") +
        " />" +
        mugTag(u, false, "mug") +
        '<div class="info"><h4>' +
        esc(displayName(u)) +
        "　" +
        esc(classNameOf(u)) +
        "　Lv." +
        u.level +
        "</h4><p>HP " +
        u.hp +
        "/" +
        u.maxHp +
        "　" +
        esc(u.weaponId ? weaponName(u.weaponId) : "") +
        (lock ? "　" + lock : down ? "　" + t("lock.noHp") : "") +
        "</p></div></label>"
      );
    }).join("");
    var body =
      "<p>" + t("dungeon.lead") + "</p>" +
      "<p class='muted'>" + t("dungeon.note") + "</p>" +
      '<div class="deploy-list">' +
      rows +
      "</div>" +
      actions({
        "dungeon-enter": t("dungeon.enter"),
        leave: t("ui.leave")
      });
    openModal(panel(t("dungeon.title"), body, "wide"));
    setView("dungeon-deploy");
  }

  function collectedDeployIds() {
    var boxes = document.querySelectorAll("#modal [data-deploy]");
    var ids = [], i, el, u;
    for (i = 0; i < boxes.length; i++) {
      el = boxes[i];
      if (!el.checked || el.disabled) continue;
      u = unitById(el.getAttribute("data-deploy"));
      if (u && !isDungeonLocked(u) && u.hp > 0) ids.push(u.classId);
    }
    return ids;
  }

  function startDungeonRun(ids) {
    if (!ids || !ids.length) {
      toast(t("dungeon.needUnit"));
      return;
    }
    dungeonRun = {
      ids: ids.slice(),
      living: ids.slice(),
      boss: makeBossFighter(),
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
      if (u && u.hp > 0 && !isDungeonLocked(u)) out.push(u);
    }
    return out;
  }

  function renderDungeonRoom() {
    if (!dungeonRun) return;
    var living = dungeonLivingUnits();
    dungeonRun.living = living.map(function (u) { return u.classId; });
    if (dungeonRun.boss.hp <= 0) {
      finishDungeonWin();
      return;
    }
    if (!living.length) {
      finishDungeonWipe();
      return;
    }
    var b = dungeonRun.boss;
    var rows = living.map(function (u) {
      return (
        '<div class="list-item"><div class="info">' +
        mugTag(u, false, "mug") +
        "<h4>" +
        esc(displayName(u)) +
        "　" +
        esc(classNameOf(u)) +
        "</h4><p>HP " +
        u.hp +
        "/" +
        u.maxHp +
        "　" +
        esc(weaponName(u.weaponId)) +
        "</p></div>" +
        '<button type="button" class="btn" data-act="dungeon-atk" data-id="' +
        u.classId +
        '">' + t("dungeon.attack") + '</button></div>'
      );
    }).join("");
    var body =
      "<p>" + t("dungeon.roomLead") + "</p>" +
      '<div class="boss-card">' +
      mugTag(b, true, "mug") +
      "<div><h4>" +
      esc(displayName(b)) +
      "　" +
      esc(classNameOf(b)) +
      "　Lv." +
      (b.level || D.DUNGEON_BOSS.level) +
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
    openModal(panel(t("dungeon.room"), body, "wide"), true);
    setView("dungeon-room");
  }

  function beginDungeonAttack(classId) {
    var u = unitById(classId);
    if (!dungeonRun || !u || u.hp <= 0) return;
    setActive(classId);
    dungeonRun.lastAtk = classId;
    dungeonRun.phase = "player";
    closeModal();
    showForecast({
      kind: "dungeon",
      atk: fighterFrom(u),
      def: makeBossFighter(dungeonRun.boss.hp),
      unitId: classId,
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
    setActive(target.classId);
    dungeonRun.phase = "boss";
    closeModal();
    showForecast({
      kind: "dungeon",
      atk: makeBossFighter(dungeonRun.boss.hp),
      def: fighterFrom(target),
      unitId: target.classId,
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
    var unitDead = unit.hp <= 0;
    if (unitDead) {
      lockUnit(unit);
      if (dungeonRun.living) {
        dungeonRun.living = dungeonRun.living.filter(function (id) { return id !== unit.classId; });
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
    if (target.weapons.indexOf(pick) === -1) target.weapons.push(pick);
    return { weapon: w, unit: target };
  }

  function finishDungeonWin(forcedCopper) {
    var b = D.DUNGEON_BOSS;
    var goldGain = addGold(b.rewardGold);
    var events = [];
    var i, u, ids, drop, dropLine;
    ids = dungeonRun ? dungeonRun.ids : state.party.map(function (p) { return p.classId; });
    for (i = 0; i < ids.length; i++) {
      u = unitById(ids[i]);
      if (!u) continue;
      if (u.hp > 0) events = events.concat(gainExpFor(u, b.rewardExp));
      else events = events.concat(gainExpFor(u, Math.round(b.rewardExp * 0.5)));
    }
    drop = grantCopperReward(ids, forcedCopper || state._forceCopper || null);
    state._forceCopper = null;
    pendingLevelUps = events;
    dungeonRun = null;
    closeBattle();
    renderHud();
    save();
    lastVictory = { goldGain: goldGain, drop: drop };
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

  function openGuild() {
    var g = state.guildQuest;
    var unit = g.unit || {};
    var body =
      "<p>" + t("guild.lead") + "</p>" +
      '<div class="tabs">' +
      '<button type="button" class="tab active" data-act="guild-job">' + t("guild.tabJob") + '</button>' +
      '<button type="button" class="tab" data-act="guild-rules">' + t("guild.tabRules") + '</button>' +
      '<button type="button" class="tab" data-act="stats">' + t("guild.tabStats") + '</button>' +
      "</div>" +
      '<div class="list-item' +
      (g.done ? " done" : "") +
      '"><div class="info"><h4>' +
      esc(t("guild.questName")) +
      "</h4><p>" +
      esc(t("guild.questDesc", { name: unit.name || "", className: classNameOf(unit) })) +
      "</p><div class='meta'>" +
      t("guild.reward", { gold: g.gold, exp: g.exp }) +
      (g.done ? "　" + t("guild.done") : "　" + t("guild.needFight")) +
      "</div></div>" +
      (g.done
        ? ""
        : '<button type="button" class="btn" data-act="guild-fight">' + t("ui.accept") + "</button>") +
      "</div>" +
      actions({ leave: t("ui.leave") });
    openModal(panel(t("guild.title"), body, "wide"));
    setView("guild");
  }

  function openGuildRules() {
    var body =
      '<div class="tabs">' +
      '<button type="button" class="tab" data-act="guild">' + t("guild.tabJob") + '</button>' +
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
    q.done = true;
    addGold(q.gold);
    var lv = gainExp(q.exp);
    var html =
      "<p>" +
      t("quest.doneBody", { name: q.name }) +
      "</p><p>" +
      t("quest.doneReward", { gold: q.gold, exp: q.exp }) +
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
    var body =
      "<p class='lead'>" + t("shop.lead") + "</p>" +
      '<div class="empty-shelf">' + t("shop.empty") + "</div>" +
      actions({ leave: t("ui.leave") });
    openModal(panel(t("shop.title"), body));
    setView("shop");
  }

  function openStatue(fromEnter, keepNote) {
    var loreIdx = (state.day - 1) % 4;
    var lore = t("statue.lore" + loreIdx);
    var rate = goldRate();
    var dayGold = rate * D.TICKS_PER_DAY;
    var full = state.gold >= D.GOLD_CAP;
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
          u.level +
          " / 10s</td><td>" +
          (u.level * D.TICKS_PER_DAY) +
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
      t("statue.total", { rate: rate, day: dayGold }) +
      "</p>" +
      "<p>" +
      t("statue.gold", { gold: state.gold, cap: D.GOLD_CAP }) +
      "</p>" +
      (full ? "<p class='warn-text'>" + t("statue.full") + "</p>" : "") +
      actions({ leave: t("ui.leave") });
    openModal(panel(t("statue.title"), body, "wide"));
    setView("statue");
  }

  function openBank() {
    var rate = goldRate();
    var dayGold = rate * D.TICKS_PER_DAY;
    var full = state.gold >= D.GOLD_CAP;
    var body =
      "<p class='lead'>" + t("bank.lead") + "</p>" +
      "<p>" + t("bank.gold", { gold: state.gold, cap: D.GOLD_CAP }) + "</p>" +
      "<p>" + t("bank.income", { rate: rate, day: dayGold }) + "</p>" +
      (full ? "<p class='warn-text'>" + t("statue.full") + "</p>" : "") +
      actions({ leave: t("ui.leave") });
    openModal(panel(t("bank.title"), body, "narrow"));
    setView("bank");
  }

  function openTraining() {
    var p = active();
    var cls = D.CLASSES[p.classId];
    var atCap = p.level >= D.LEVEL_CAP;
    var cost = D.trainCost(p.level);
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
      : "<p>" + t("train.nextCost", { lv: p.level, cost: cost }) + "</p>";
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
      "<table class='stat-table'><thead><tr><th></th><th>" +
      t("train.current") +
      "</th><th>" +
      t("train.growth") +
      "</th></tr></thead><tbody>" +
      rows +
      "</tbody></table>" +
      costLine +
      "<p>" + t("train.goldOnHand", { gold: state.gold }) + "</p>" +
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

  function openArena() {
    var p = active();
    var items = state.arenaRoster
      .map(function (slot, idx) {
        var u = slot.unit;
        var w = D.WEAPONS[u.weaponId];
        return (
          '<div class="list-item' +
          (slot.fought ? " done" : "") +
          '"><div class="info"><h4>' +
          esc(displayName(u)) +
          "　" +
          classNameOf(u) +
          " Lv." +
          u.level +
          "</h4><p>" +
          t("arena.weapon", { name: w ? weaponName(w) : "?" }) +
          "　" +
          t("arena.wagerLine", { gold: slot.wager, exp: slot.exp }) +
          "</p>" +
          (slot.fought ? "<div class='meta'>" + t("arena.fought") + "</div>" : "") +
          "</div>" +
          (slot.fought
            ? ""
            : '<button type="button" class="btn" data-act="arena" data-id="' +
              idx +
              '"' +
              (state.gold < slot.wager ? " disabled" : "") +
              ">" + t("ui.engage") + "</button>") +
          "</div>"
        );
      })
      .join("");
    var body =
      "<p class='lead'>" + t("arena.leadFull") + "</p>" +
      "<p>" +
      t("arena.deployLine", { name: displayName(p) }) +
      "　" +
      classNameOf(p) +
      "　Lv." +
      p.level +
      "</p>" +
      "<p class='muted'>" + t("arena.noteFull") + "</p>" +
      '<div class="list">' +
      items +
      "</div>" +
      actions({ leave: t("ui.leave") });
    openModal(panel(t("arena.title"), body, "wide"));
    setView("arena");
  }

  function openBag() {
    var p = active();
    var tonic = state.items.tonic || 0;
    var wpn = p.weapons
      .map(function (id) {
        var w = D.WEAPONS[id];
        if (!w) return "";
        var eq = p.weaponId === id;
        return (
          '<div class="list-item"><div class="info"><h4>' +
          weaponName(w) +
          (eq ? t("ui.equipped") : "") +
          "</h4><p>" +
          wepLine(w) +
          "</p></div>" +
          (eq || !canUseWeapon(id)
            ? ""
            : '<button type="button" class="btn" data-act="equip" data-id="' + id + '">' + t("ui.equip") + "</button>") +
          "</div>"
        );
      })
      .join("");
    var body =
      "<p>" +
      t("bag.weaponsOf", { name: displayName(p), count: tonic }) +
      t("bag.shared") +
      "</p>" +
      '<div class="actions" style="margin-top:.4em">' +
      '<button type="button" class="btn" data-act="use-item" data-id="tonic"' +
      (tonic <= 0 || p.hp >= p.maxHp ? " disabled" : "") +
      ">" + t("bag.useTonic") + "</button>" +
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
      state.gold +
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
    if (ctx.fee) addGold(-ctx.fee);
    ctx.preHp = p.hp;
    ctx.preMax = p.maxHp;
    var result = C.resolveDuel(ctx.atk, ctx.def, rng(), { maxRounds: ctx.kind === "dungeon" ? 1 : 20 });
    ctx.result = result;
    renderHud();
    playBattle(ctx, result);
  }

  function mountBattle(ctx) {
    var field = ctx.kind === "arena" ? "sand" : "grass";
    var sky = state && state.period === 2 ? "dusk" : state && state.period === 1 ? "day" : "morn";
    var el = $("#battle");
    el.classList.add("fighting");
    el.innerHTML =
      '<div class="fe-battle sky-' +
      sky +
      " field-" +
      field +
      '"><div class="fe-sky"></div><div class="fe-horizon"></div><div class="fe-ground"></div>' +
      '<div class="fe-flash" id="b-flash"></div><div class="fe-crit-veil" id="b-crit-veil"></div>' +
      '<div class="fe-slash" id="b-slash"></div><div class="fe-banner" id="b-banner">' + t("crit.splash") + "</div>" +
      fighterBox("a", ctx.atk, false, "r") +
      fighterBox("b", ctx.def, true, "l") +
      '<div class="fe-dock">' +
      hpWin("a", ctx.atk, ctx.atk.hp, false) +
      hpWin("b", ctx.def, ctx.def.hp, true) +
      "</div></div>";
    el.classList.remove("hidden");
  }

  function fighterBox(id, unit, foe, facing) {
    return (
      '<div class="fe-fighter ' +
      (id === "a" ? "left" : "right") +
      '" id="b-f-' +
      id +
      '"><div class="fe-platform"></div><img class="stand-art" src="' +
      standSrc(unit, foe, facing) +
      '" alt="" draggable="false" /><div class="fe-pop" id="b-pop-' +
      id +
      '"></div></div>'
    );
  }

  function hpWin(id, unit, hp, right) {
    return (
      '<div class="hp-win' +
      (right ? " right" : "") +
      '" id="hp-win-' +
      id +
      '"><div class="who"><span class="nm">' +
      esc(displayName(unit)) +
      '</span><span class="cl">' +
      esc(classNameOf(unit)) +
      '</span></div><div class="hp-row"><span class="lbl">HP</span><span class="hp-track"><span class="hp-fill" id="hp-fill-' +
      id +
      '" style="width:' +
      Math.round((hp / Math.max(1, unit.maxHp)) * 100) +
      '%"></span></span><span id="hp-num-' +
      id +
      '">' +
      hp +
      "/" +
      unit.maxHp +
      "</span></div></div>"
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
    if (num) num.textContent = hp + "/" + max;
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
    var stage = $("#battle .fe-battle");
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
    atkEl.classList.remove("lunge");
    void atkEl.offsetWidth;
    atkEl.classList.add("lunge");
    later(function () {
      defEl.classList.remove("hurt");
      void defEl.offsetWidth;
      if (ev.result === "miss") {
        showPop(defId, t("battle.miss"), "miss");
      } else if (ev.crit) {
        playCritEffect(atkEl, defEl, defId);
        showPop(defId, String(ev.damage), "crit");
        defEl.classList.add("hurt");
        defEl.classList.add("crit-hurt");
      } else {
        showPop(defId, String(ev.damage), "hit");
        defEl.classList.add("hurt");
      }
      setBattleHp(defId, ev.defenderHp, defMax);
      if (ev.defenderHp <= 0) defEl.classList.add("down");
      later(function () {
        atkEl.classList.remove("lunge");
        defEl.classList.remove("hurt");
        defEl.classList.remove("crit-hurt");
        var stage = $("#battle .fe-battle");
        if (stage) stage.classList.remove("crit-shake");
        done();
      }, ev.crit ? 780 : 380);
    }, 270);
  }

  function showBattleResult(ctx, result) {
    if (ctx.kind === "dungeon") {
      showDungeonRoundResult(ctx, result);
      return;
    }
    var p = active();
    p.hp = result.aHp;
    var win = result.winner === "a";
    var lost = result.aHp <= 0;
    var expGain = 0;
    var goldGain = 0;
    var note = "";

    if (ctx.kind === "train") {
      var hpGain = p.maxHp - ctx.preMax;
      p.hp = Math.min(p.maxHp, ctx.preHp + hpGain);
      expGain = lost ? Math.round(ctx.exp * 0.7) : ctx.exp;
      note = win
        ? t("train.win")
        : lost
        ? t("train.lose")
        : t("train.draw");
    } else if (ctx.kind === "arena") {
      if (win) {
        goldGain = ctx.fee * 2;
        addGold(goldGain);
        expGain = ctx.exp;
        note = t("arena.win");
      } else {
        expGain = Math.round(ctx.exp * 0.5);
        note = lost
          ? t("arena.lose")
          : t("arena.draw");
      }
      if (ctx.slot) ctx.slot.fought = true;
    } else if (ctx.kind === "guild") {
      if (win) {
        goldGain = ctx.gold;
        addGold(goldGain);
        expGain = ctx.exp;
        state.guildQuest.done = true;
        note = t("guild.win");
      } else {
        expGain = Math.round(ctx.exp * 0.5);
        note = lost ? t("guild.lose") : t("guild.draw");
      }
    }

    var lv = gainExp(expGain);
    pendingLevelUps = lv;
    renderHud();
    save();

    var layer = document.createElement("div");
    layer.className = "result-layer";
    layer.innerHTML =
      '<div class="result-win fe-win"><h3>' +
      (win ? t("battle.win") : lost ? t("battle.lose") : t("battle.draw")) +
      "</h3><p>" +
      note +
      "</p><p>" +
      (goldGain > 0 ? t("battle.expGold", { exp: expGain, gold: goldGain }) : t("battle.exp", { exp: expGain })) +
      '</p><div class="actions"><button type="button" class="btn btn-gold" data-act="battle-done">' +
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
      if (ctx.kind !== "train" && ctx.lost) {
        faint(
          ctx.kind === "arena" ? t("faint.arena") : t("faint.battle"),
          ctx.kind !== "arena"
        );
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
    if (act === "guild-fight") {
      p = active();
      if (state.guildQuest.done) return;
      if (p.hp <= 0) {
        toast(t("toast.cantStand"));
        return;
      }
      closeModal();
      showForecast({
        kind: "guild",
        title: t("guild.questName"),
        titleShort: t("guild.titleShort"),
        atk: playerFighter(),
        def: fighterFrom(state.guildQuest.unit, false),
        fee: 0,
        gold: state.guildQuest.gold,
        exp: state.guildQuest.exp
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
      var fee = D.trainCost(p.level);
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
    if (act === "arena") {
      var slot = state.arenaRoster[Number(id)];
      if (!slot || slot.fought) return;
      if (state.gold < slot.wager) {
        toast(t("arena.noGold"));
        return;
      }
      if (active().hp <= 0) {
        toast(t("arena.noHp", { name: displayName(active()) }));
        return;
      }
      closeModal();
      showForecast({
        kind: "arena",
        title: t("arena.titleOf", { name: displayName(slot.unit) }),
        atk: playerFighter(),
        def: fighterFrom(slot.unit, false),
        fee: slot.wager,
        exp: slot.exp,
        slot: slot
      });
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
    p.weapons.push(id);
    p.weaponId = id;
    save();
    renderHud();
    toast(t("buyWeapon", { name: weaponName(w) }));
    openShop();
  }

  function useItem(id, silent) {
    var p = active();
    var it = D.ITEMS[id];
    if (!it || id !== "tonic" || !state.items.tonic) return;
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
    if (fresh && !state.introShown) {
      state.introShown = true;
      save();
      showWelcome();
    }
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
          ? { living: dungeonRun.living.slice(), bossHp: dungeonRun.boss.hp, ids: dungeonRun.ids.slice() }
          : null,
        party: state.party.map(function (u) {
          return {
            name: u.name,
            classId: u.classId,
            className: u.className,
            level: u.level,
            hp: u.hp,
            maxHp: u.maxHp,
            weapon: u.weaponId,
            dungeonLockUntil: u.dungeonLockUntil || 0,
            lockLabel: lockoutLabel(u)
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
      state.gold = Math.max(0, Math.min(D.GOLD_CAP, n));
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
    openDeploy: function () {
      openDungeonDeploy();
    },
    startDungeon: function (ids) {
      if (!ids) ids = state.party.map(function (u) { return u.classId; });
      startDungeonRun(ids);
      return dungeonRun && { living: dungeonRun.living.slice(), bossHp: dungeonRun.boss.hp };
    },
    lockoutUnit: function (classId, atMs) {
      var u = unitById(classId);
      if (!u) return null;
      lockUnit(u, atMs || Date.now());
      renderHud();
      save();
      return { classId: classId, until: u.dungeonLockUntil, label: lockoutLabel(u) };
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
      var ids = classIds || state.party.map(function (u) { return u.classId; });
      var drop = grantCopperReward(ids, id);
      save();
      return drop && drop.weapon ? { weapon: weaponName(drop.weapon), unit: drop.unit && displayName(drop.unit) } : null;
    },
    previewVictory: function (weaponId) {
      if (!dungeonRun) {
        dungeonRun = {
          ids: state.party.map(function (u) { return u.classId; }),
          living: state.party.map(function (u) { return u.classId; }),
          boss: makeBossFighter(0),
          lastAtk: state.activeId,
          phase: "player"
        };
        dungeonRun.boss.hp = 0;
      }
      finishDungeonWin(weaponId || "copper-axe");
    },
    previewCrit: function () {
      var atk = fighterFrom(active());
      var def = makeBossFighter(100);
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
