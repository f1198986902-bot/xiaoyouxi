/**
 * 灰灯镇 · 战斗与成长公式
 *
 * 命中判定：先将命中率夹取到 0–100（保留幸运带来的 0.5 小数），
 * 再向下取整得到判定阈值；掷出 0–99 的整数，若 roll < 阈值则命中。
 * 例如命中率 89.5 → 阈值为 89，掷出 89 为失手。
 *
 * 本文件可同时在浏览器与 Node（combat.test.js）中使用，无构建步骤。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.Combat = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var STAT_KEYS = ["hp", "str", "skill", "spd", "luck", "def"];

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function clampRate(rate) {
    return clamp(rate, 0, 100);
  }

  /**
   * 武器三角：剑克斧、斧克枪、枪克剑。
   * 克制 +1 威力、+15 命中；被克制 −1 威力、−15 命中。
   * 弓不参与；缺类型或双方同类型则无修正。
   */
  var TRIANGLE = { sword: "axe", axe: "lance", lance: "sword" };
  var TRIANGLE_TYPES = { sword: true, axe: true, lance: true };

  function weaponTypeOf(weapon) {
    return weapon && weapon.type ? weapon.type : "";
  }

  function triangleBonus(atkWeapon, defWeapon) {
    var a = weaponTypeOf(atkWeapon);
    var b = weaponTypeOf(defWeapon);
    if (!TRIANGLE_TYPES[a] || !TRIANGLE_TYPES[b]) {
      return { mt: 0, hit: 0, side: null };
    }
    if (a === b) return { mt: 0, hit: 0, side: null };
    if (TRIANGLE[a] === b) return { mt: 1, hit: 15, side: "adv" };
    if (TRIANGLE[b] === a) return { mt: -1, hit: -15, side: "dis" };
    return { mt: 0, hit: 0, side: null };
  }

  /** 攻击力 = 力量 + 武器威力 + 三角威力修正 */
  function attackPower(str, weaponMt, triangleMt) {
    return str + weaponMt + (triangleMt || 0);
  }

  /** 伤害 = max(0, 攻击力 - 对方守备) */
  function damage(atk, def) {
    return Math.max(0, atk - def);
  }

  /** 必杀伤害 = 伤害 × 3 */
  function critDamage(dmg) {
    return dmg * 3;
  }

  /** 攻速 = max(0, 速度 - 武器重量) */
  function attackSpeed(spd, weaponWt) {
    return Math.max(0, spd - weaponWt);
  }

  /** 回避率 = 攻速 × 2 + 幸运 */
  function avoid(as, luck) {
    return as * 2 + luck;
  }

  /**
   * 命中率（未夹取）= 技术×2 + 幸运×0.5 + 武器命中 - 对方回避率
   * 幸运的 0.5 项保留半点，不提前取整。
   */
  function hitRate(skill, luck, weaponHit, defenderAvoid) {
    return skill * 2 + luck * 0.5 + weaponHit - defenderAvoid;
  }

  /**
   * 实际用于投掷的命中阈值：先夹取到 0–100，再向下取整。
   * 判定：roll(0–99) < 该阈值则命中。
   */
  function hitThreshold(skill, luck, weaponHit, defenderAvoid, hitBonus) {
    var raw = hitRate(skill, luck, weaponHit, defenderAvoid) + (hitBonus || 0);
    return Math.floor(clampRate(raw));
  }

  /** 必杀回避 = 幸运 */
  function critAvoid(luck) {
    return luck;
  }

  /** 必杀率 = floor(技术 / 2) - 对方必杀回避，再夹取到 0–100 */
  function critRate(skill, defenderCritAvoid) {
    return clampRate(Math.floor(skill / 2) - defenderCritAvoid);
  }

  /** 攻速至少高出对方 4 点（差值 ≥ 4）时可追击；差 3 不可追击 */
  function hasFollowUp(attackerAS, defenderAS) {
    return attackerAS - defenderAS >= 4;
  }

  /**
   * 成长判定：掷 0–99，若 roll < 成长率则该项 +1。
   * 成长率 70 时，0–69 成功，70–99 失败。
   */
  function didStatGrow(growthPercent, rng) {
    var roll = rng.int(0, 99);
    return roll < growthPercent;
  }

  /**
   * 对一套属性做一次升级检定。
   * unit：{hp,str,skill,spd,luck,def}
   * growths：同键，值为百分数（如 70）
   * 返回 { before, after, grew, hpGain }
   * 若 HP 成长，调用方应将当前 HP 也增加 hpGain。
   */
  function applyLevelUp(unit, growths, rng) {
    var before = {};
    var after = {};
    var grew = {};
    var i, key;
    for (i = 0; i < STAT_KEYS.length; i++) {
      key = STAT_KEYS[i];
      before[key] = unit[key];
      after[key] = unit[key];
      grew[key] = false;
      if (didStatGrow(growths[key], rng)) {
        after[key] = unit[key] + 1;
        grew[key] = true;
      }
    }
    return {
      before: before,
      after: after,
      grew: grew,
      hpGain: after.hp - before.hp
    };
  }

  /** 默认掷骰：int 含端点；d100 为 0–99 */
  function createRng(randomFn) {
    var rnd = randomFn || Math.random;
    return {
      int: function (min, max) {
        return min + Math.floor(rnd() * (max - min + 1));
      },
      d100: function () {
        return this.int(0, 99);
      }
    };
  }

  function seededRandom(seed) {
    var s = seed >>> 0;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function bonusesOf(unit) {
    return unit.bonuses || { hit: 0, avoid: 0 };
  }

  /** 计算一名战斗者的衍生值（攻速、攻击力、回避等） */
  function snapshot(unit) {
    var w = unit.weapon;
    var as = attackSpeed(unit.spd, w.wt);
    var atk = attackPower(unit.str, w.mt);
    var bon = bonusesOf(unit);
    return {
      name: unit.name,
      className: unit.className || "",
      hp: unit.hp,
      maxHp: unit.maxHp != null ? unit.maxHp : unit.hp,
      str: unit.str,
      skill: unit.skill,
      spd: unit.spd,
      luck: unit.luck,
      def: unit.def,
      weapon: w,
      as: as,
      atk: atk,
      avo: avoid(as, unit.luck) + (bon.avoid || 0),
      hitBonus: bon.hit || 0
    };
  }

  function rawHit(attackerSnap, defenderSnap, triangleHit) {
    return (
      hitRate(
        attackerSnap.skill,
        attackerSnap.luck,
        attackerSnap.weapon.hit,
        defenderSnap.avo
      ) + attackerSnap.hitBonus + (triangleHit || 0)
    );
  }

  function applyTriangle(self, foe) {
    var t = triangleBonus(self.weapon, foe.weapon);
    var out = {};
    var k;
    for (k in self) if (Object.prototype.hasOwnProperty.call(self, k)) out[k] = self[k];
    out.atk = attackPower(self.str, self.weapon.mt, t.mt);
    out.triangle = t;
    return out;
  }

  function sideForecast(self, foe) {
    var t = triangleBonus(self.weapon, foe.weapon);
    var atk = attackPower(self.str, self.weapon.mt, t.mt);
    return {
      name: self.name,
      className: self.className,
      hp: self.hp,
      maxHp: self.maxHp,
      damage: damage(atk, foe.def),
      hit: Math.floor(clampRate(rawHit(self, foe, t.hit))),
      crit: critRate(self.skill, critAvoid(foe.luck)),
      followUp: hasFollowUp(self.as, foe.as),
      as: self.as,
      atk: atk,
      avo: self.avo,
      triangle: t
    };
  }

  /** 交战预告：双方伤害 / 命中 / 必杀 / 是否追击。a 为先手（玩家）。 */
  function forecast(unitA, unitB) {
    var a = snapshot(unitA);
    var b = snapshot(unitB);
    return { a: sideForecast(a, b), b: sideForecast(b, a) };
  }

  /**
   * 单次攻击检定。
   * 命中：rollA(0–99) < floor(clamp(命中率))
   * 若命中，再掷 rollB(0–99)，若 < 必杀率则为必杀（伤害×3）。
   */
  function resolveStrike(attacker, defender, rng) {
    var t = triangleBonus(attacker.weapon, defender.weapon);
    var atk = attacker.triangle ? attacker.atk : attackPower(attacker.str, attacker.weapon.mt, t.mt);
    var dmg = damage(atk, defender.def);
    var threshold = Math.floor(clampRate(rawHit(attacker, defender, t.hit)));
    var hitRoll = rng.int(0, 99);
    if (hitRoll >= threshold) {
      return { result: "miss", hit: false, crit: false, damage: 0, hitRoll: hitRoll, threshold: threshold };
    }
    var crit = critRate(attacker.skill, critAvoid(defender.luck));
    var critRoll = rng.int(0, 99);
    var isCrit = critRoll < crit;
    var dealt = isCrit ? critDamage(dmg) : dmg;
    return {
      result: isCrit ? "crit" : "hit",
      hit: true,
      crit: isCrit,
      damage: dealt,
      hitRoll: hitRoll,
      critRoll: critRoll,
      threshold: threshold
    };
  }

  /**
   * 回合顺序：先手先攻，防守方若仍存活则反击一次，
   * 然后各自若满足追击条件再追加一击。双方追击彼此独立。
   * 任一战斗者 HP 归零即停止。双方在展示对打中均可反击。
   *
   * 默认只进行 1 个交锋回合（便于单测）。游戏内传入
   * opts.maxRounds（如 20）以持续对打直到一方倒下。
   */
  function resolveDuel(unitA, unitB, rng, opts) {
    var a = applyTriangle(snapshot(unitA), snapshot(unitB));
    var b = applyTriangle(snapshot(unitB), snapshot(unitA));
    var log = [];
    var untilDown = !!(opts && opts.untilDown);
    var maxRounds = opts && opts.maxRounds != null ? opts.maxRounds : 1;
    var round, i, order, side, atk, def, strike, hpBefore, stale, lastHit;
    if (untilDown && maxRounds < 200) maxRounds = 200;

    stale = 0;
    lastHit = "a";
    for (round = 0; round < maxRounds; round++) {
      if (a.hp <= 0 || b.hp <= 0) break;
      hpBefore = a.hp + b.hp;
      order = ["a", "b"];
      if (hasFollowUp(a.as, b.as)) order.push("a");
      if (hasFollowUp(b.as, a.as)) order.push("b");

      for (i = 0; i < order.length; i++) {
        if (a.hp <= 0 || b.hp <= 0) break;
        side = order[i];
        atk = side === "a" ? a : b;
        def = side === "a" ? b : a;
        strike = resolveStrike(atk, def, rng);
        if (untilDown && strike.damage <= 0 && a.hp + b.hp === hpBefore && i === order.length - 1 && stale >= 1) {
          strike = {
            result: "hit",
            hit: true,
            crit: false,
            damage: 1,
            hitRoll: strike.hitRoll,
            critRoll: strike.critRoll,
            threshold: strike.threshold
          };
        }
        def.hp = Math.max(0, def.hp - strike.damage);
        if (strike.damage > 0) lastHit = side;
        log.push({
          side: side,
          actor: atk.name,
          target: def.name,
          result: strike.result,
          hit: strike.hit,
          crit: strike.crit,
          damage: strike.damage,
          followUp: i >= 2,
          round: round,
          attackerHp: atk.hp,
          defenderHp: def.hp,
          threshold: strike.threshold,
          hitRoll: strike.hitRoll
        });
      }
      if (a.hp <= 0 || b.hp <= 0) break;
      if (a.hp + b.hp === hpBefore) {
        stale += 1;
        if (!untilDown && stale >= 2) break;
      } else {
        stale = 0;
      }
    }

    var winner = null;
    if (a.hp <= 0 && b.hp <= 0) winner = untilDown ? lastHit : "draw";
    else if (b.hp <= 0) winner = "a";
    else if (a.hp <= 0) winner = "b";
    else winner = "draw";

    return {
      log: log,
      winner: winner,
      aHp: a.hp,
      bHp: b.hp,
      aMax: a.maxHp,
      bMax: b.maxHp
    };
  }

  return {
    STAT_KEYS: STAT_KEYS,
    clamp: clamp,
    clampRate: clampRate,
    attackPower: attackPower,
    damage: damage,
    critDamage: critDamage,
    attackSpeed: attackSpeed,
    avoid: avoid,
    hitRate: hitRate,
    hitThreshold: hitThreshold,
    critAvoid: critAvoid,
    critRate: critRate,
    hasFollowUp: hasFollowUp,
    didStatGrow: didStatGrow,
    applyLevelUp: applyLevelUp,
    createRng: createRng,
    seededRandom: seededRandom,
    snapshot: snapshot,
    triangleBonus: triangleBonus,
    applyTriangle: applyTriangle,
    forecast: forecast,
    resolveStrike: resolveStrike,
    resolveDuel: resolveDuel
  };
});
