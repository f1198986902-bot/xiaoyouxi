/**
 * 灰灯镇 · 战斗公式断言（Node 可直接运行：node combat.test.js）
 */
"use strict";

const C = require("./js/combat.js");
const D = require("./js/data.js");
const assert = require("assert");

let passed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    passed += 1;
    results.push("PASS  " + name);
  } catch (err) {
    results.push("FAIL  " + name + "\n      " + err.message);
    throw err;
  }
}

function rngFrom(seq) {
  let i = 0;
  return {
    int: function (min, max) {
      if (i >= seq.length) {
        throw new Error("rng exhausted (asked " + min + ".." + max + ")");
      }
      return seq[i++];
    }
  };
}

test("攻击力 = 力量 + 武器威力", function () {
  assert.strictEqual(C.attackPower(5, 5), 10);
  assert.strictEqual(C.attackPower(6, 7), 13);
  assert.strictEqual(C.attackPower(3, 3), 6);
});

test("伤害 = max(0, 攻击力 - 守备)", function () {
  assert.strictEqual(C.damage(10, 3), 7);
  assert.strictEqual(C.damage(13, 9), 4);
});

test("伤害下限为 0（无法打出负伤）", function () {
  assert.strictEqual(C.damage(5, 10), 0);
  assert.strictEqual(C.damage(0, 0), 0);
  assert.strictEqual(C.damage(9, 9), 0);
});

test("必杀伤害为普通伤害的三倍", function () {
  assert.strictEqual(C.critDamage(7), 21);
  assert.strictEqual(C.critDamage(4), 12);
  assert.strictEqual(C.critDamage(0), 0);
});

test("攻速 = max(0, 速度 - 武器重量)", function () {
  assert.strictEqual(C.attackSpeed(8, 5), 3);
  assert.strictEqual(C.attackSpeed(9, 2), 7);
  assert.strictEqual(C.attackSpeed(2, 8), 0);
  assert.strictEqual(C.attackSpeed(5, 5), 0);
});

test("追击阈值：攻速差恰好 3 不追击，恰好 4 追击", function () {
  assert.strictEqual(C.hasFollowUp(10, 7), false);
  assert.strictEqual(C.hasFollowUp(10, 6), true);
  assert.strictEqual(C.hasFollowUp(10, 5), true);
  assert.strictEqual(C.hasFollowUp(3, 0), false);
  assert.strictEqual(C.hasFollowUp(4, 0), true);
  assert.strictEqual(C.hasFollowUp(0, 0), false);
  assert.strictEqual(C.hasFollowUp(0, 4), false);
});

test("回避率 = 攻速 × 2 + 幸运", function () {
  assert.strictEqual(C.avoid(3, 5), 11);
  assert.strictEqual(C.avoid(6, 4), 16);
  assert.strictEqual(C.avoid(0, 6), 6);
});

test("命中率保留幸运的 0.5 半点，不提前取整", function () {
  // 技术 7、幸运 5、武器命中 90、对方回避 11
  // 14 + 2.5 + 90 - 11 = 95.5
  assert.strictEqual(C.hitRate(7, 5, 90, 11), 95.5);
  // 仅幸运 1：0 + 0.5 + 0 - 0 = 0.5
  assert.strictEqual(C.hitRate(0, 1, 0, 0), 0.5);
  // 偶数幸运不产生小数
  assert.strictEqual(C.hitRate(6, 4, 80, 16), 12 + 2 + 80 - 16);
  assert.strictEqual(C.hitRate(6, 4, 80, 16), 78);
});

test("命中阈值先夹取再向下取整（floor），用于 roll < 阈值", function () {
  // 95.5 → floor 95
  assert.strictEqual(C.hitThreshold(7, 5, 90, 11), 95);
  // 0.5 → floor 0（几乎必失）
  assert.strictEqual(C.hitThreshold(0, 1, 0, 0), 0);
  // 超过 100 夹取为 100
  assert.strictEqual(C.hitThreshold(20, 10, 90, 0), 100);
  // 负值夹取为 0
  assert.strictEqual(C.hitThreshold(0, 0, 10, 80), 0);
  // 命中加成在取整前计入
  assert.strictEqual(C.hitThreshold(0, 1, 0, 0, 10), 10); // 10.5 → 10
});

test("必杀回避 = 幸运；必杀率 = floor(技术/2) - 对方必杀回避，夹取 0–100", function () {
  assert.strictEqual(C.critAvoid(6), 6);
  // floor(7/2)=3, 3-5=-2 → 0
  assert.strictEqual(C.critRate(7, 5), 0);
  // floor(10/2)=5, 5-2=3
  assert.strictEqual(C.critRate(10, 2), 3);
  // floor(9/2)=4
  assert.strictEqual(C.critRate(9, 0), 4);
  // 高技术也不会低于 0 或超过 100
  assert.strictEqual(C.critRate(0, 10), 0);
  assert.strictEqual(C.critRate(80, 0), 40);
  // 省略或为 0 的武器必杀不改变结果
  assert.strictEqual(C.critRate(10, 2, 0), 3);
  assert.strictEqual(C.critRate(10, 2, undefined), 3);
});

test("武器必杀会加进必杀率，结果仍夹取到 0–100", function () {
  // floor(10/2)=5，再 +30，减去对方必杀回避 2 → 33
  assert.strictEqual(C.critRate(10, 2, 30), 33);
  // 相对无武器必杀的 3，正好提高 30
  assert.strictEqual(C.critRate(10, 2, 30) - C.critRate(10, 2, 0), 30);
  // floor(7/2)=3，+30 - 5 = 28
  assert.strictEqual(C.critRate(7, 5, 30), 28);
  // 上夹：floor(80/2)+80 - 0 = 120 → 100
  assert.strictEqual(C.critRate(80, 0, 80), 100);
  // 下夹：floor(0/2)+0 - 10 = -10 → 0
  assert.strictEqual(C.critRate(0, 10, 0), 0);

  var striker = {
    name: "甲",
    hp: 20, maxHp: 20, str: 8, skill: 10, spd: 6, luck: 4, def: 4,
    weapon: { name: "必杀剑", mt: 9, hit: 75, wt: 7, crit: 30 }
  };
  var foe = {
    name: "乙",
    hp: 20, maxHp: 20, str: 6, skill: 4, spd: 5, luck: 2, def: 5,
    weapon: { name: "铁枪", mt: 7, hit: 80, wt: 8 }
  };
  // 必杀：floor(10/2)+30-2=33。无武器必杀时为 3
  var f = C.forecast(striker, foe);
  assert.strictEqual(f.a.crit, 33);
  var plain = {
    name: "甲",
    hp: 20, maxHp: 20, str: 8, skill: 10, spd: 6, luck: 4, def: 4,
    weapon: { name: "铁剑", mt: 5, hit: 90, wt: 5 }
  };
  assert.strictEqual(C.forecast(plain, foe).a.crit, 3);

  // 结算同样使用武器必杀：命中骰 0，必杀骰 10（10 < 33 为必杀；若无 +30 则 10 < 3 不暴）
  var r = C.resolveStrike(C.snapshot(striker), C.snapshot(foe), rngFrom([0, 10]));
  assert.strictEqual(r.result, "crit");
  var missCrit = C.resolveStrike(C.snapshot(plain), C.snapshot(foe), rngFrom([0, 10]));
  assert.strictEqual(missCrit.result, "hit");
});

test("成长判定边界：roll < 成长率才加一；70 时 69 成功、70 失败", function () {
  assert.strictEqual(C.didStatGrow(70, rngFrom([69])), true);
  assert.strictEqual(C.didStatGrow(70, rngFrom([70])), false);
  assert.strictEqual(C.didStatGrow(70, rngFrom([0])), true);
  assert.strictEqual(C.didStatGrow(70, rngFrom([99])), false);
  assert.strictEqual(C.didStatGrow(20, rngFrom([19])), true);
  assert.strictEqual(C.didStatGrow(20, rngFrom([20])), false);
  assert.strictEqual(C.didStatGrow(0, rngFrom([0])), false);
  assert.strictEqual(C.didStatGrow(100, rngFrom([99])), true);
});

test("升级时各项独立掷骰，HP 成长量单独给出", function () {
  // 顺序：hp, str, skill, spd, luck, def
  // 成长 70/40/60/60/55/20，骰 10, 40, 59, 60, 54, 19
  var unit = { hp: 18, str: 5, skill: 7, spd: 8, luck: 5, def: 3 };
  var growths = { hp: 70, str: 40, skill: 60, spd: 60, luck: 55, def: 20 };
  var result = C.applyLevelUp(unit, growths, rngFrom([10, 40, 59, 60, 54, 19]));
  assert.strictEqual(result.grew.hp, true);
  assert.strictEqual(result.grew.str, false); // 40 < 40? no
  assert.strictEqual(result.grew.skill, true); // 59 < 60
  assert.strictEqual(result.grew.spd, false); // 60 < 60? no
  assert.strictEqual(result.grew.luck, true); // 54 < 55
  assert.strictEqual(result.grew.def, true); // 19 < 20
  assert.strictEqual(result.after.hp, 19);
  assert.strictEqual(result.after.str, 5);
  assert.strictEqual(result.after.skill, 8);
  assert.strictEqual(result.after.spd, 8);
  assert.strictEqual(result.after.luck, 6);
  assert.strictEqual(result.after.def, 4);
  assert.strictEqual(result.hpGain, 1);
  // 原对象不被修改
  assert.strictEqual(unit.hp, 18);
});

test("交战预告：伤害、命中、必杀、追击与公式一致", function () {
  var swordsman = {
    name: "旅人",
    className: "剑士",
    hp: 18,
    maxHp: 18,
    str: 5,
    skill: 7,
    spd: 8,
    luck: 5,
    def: 3,
    weapon: { name: "铁剑", mt: 5, hit: 90, wt: 5 }
  };
  var dummy = {
    name: "木人",
    className: "训练器具",
    hp: 14,
    maxHp: 14,
    str: 2,
    skill: 2,
    spd: 1,
    luck: 0,
    def: 1,
    weapon: { name: "木臂", mt: 1, hit: 60, wt: 4 }
  };
  var f = C.forecast(swordsman, dummy);
  // 剑士 攻击 10，伤害 9；攻速 3；回避 11
  // 命中 7*2+2.5+90 - 木人回避0 = 106.5 → 夹取 100
  // 木人攻速 0，回避 0。剑士攻速差 3，不追击。必杀 floor(7/2)-0=3
  assert.strictEqual(f.a.damage, 9);
  assert.strictEqual(f.a.hit, 100);
  assert.strictEqual(f.a.crit, 3);
  assert.strictEqual(f.a.followUp, false);
  assert.strictEqual(f.a.as, 3);
  // 木人攻击 3，伤害 max(0,3-3)=0；命中 4+0+60-11=53；必杀 floor(2/2)-5=0
  assert.strictEqual(f.b.damage, 0);
  assert.strictEqual(f.b.hit, 53);
  assert.strictEqual(f.b.crit, 0);
  assert.strictEqual(f.b.followUp, false);
});

test("细剑让盗贼攻速足够追击木人", function () {
  var thief = {
    name: "盗贼",
    className: "盗贼",
    hp: 17,
    maxHp: 17,
    str: 3,
    skill: 5,
    spd: 9,
    luck: 6,
    def: 2,
    weapon: { name: "细剑", mt: 3, hit: 100, wt: 2 }
  };
  var dummy = {
    name: "木人",
    className: "训练器具",
    hp: 14,
    maxHp: 14,
    str: 2,
    skill: 2,
    spd: 1,
    luck: 0,
    def: 1,
    weapon: { name: "木臂", mt: 1, hit: 60, wt: 4 }
  };
  var f = C.forecast(thief, dummy);
  assert.strictEqual(f.a.as, 7);
  assert.strictEqual(f.a.followUp, true);
  assert.strictEqual(f.a.damage, 5); // 3+3-1
  assert.strictEqual(f.b.followUp, false);
});

test("对打回放：命中 / 失手 / 必杀，以及先手-反击顺序", function () {
  var a = {
    name: "甲",
    hp: 20,
    maxHp: 20,
    str: 8,
    skill: 10,
    spd: 6,
    luck: 4,
    def: 4,
    weapon: { name: "铁剑", mt: 5, hit: 90, wt: 5 }
  };
  var b = {
    name: "乙",
    hp: 20,
    maxHp: 20,
    str: 6,
    skill: 4,
    spd: 5,
    luck: 2,
    def: 5,
    weapon: { name: "铁枪", mt: 7, hit: 80, wt: 8 }
  };
  // 甲攻速 1，乙攻速 0，均不追击。伤害：甲 13-5=8，乙 13-4=9
  // 命中甲：10*2+2+90 - (0*2+2) = 110 → 100
  // 命中乙：4*2+1+80 - (1*2+4) = 89-6=83
  // 必杀甲：5-2=3；乙：2-4=0
  // 骰序：甲命中骰 0（必中），甲必杀骰 0（必杀，24 伤把乙打到 0？ 20-24=0，乙无法反击）
  var killed = C.resolveDuel(a, b, rngFrom([0, 0]));
  assert.strictEqual(killed.log.length, 1);
  assert.strictEqual(killed.log[0].result, "crit");
  assert.strictEqual(killed.log[0].damage, 24);
  assert.strictEqual(killed.bHp, 0);
  assert.strictEqual(killed.winner, "a");

  // 甲命中但不必杀（命中 0，必杀 99），乙失手（83，掷 83）
  var trade = C.resolveDuel(a, b, rngFrom([0, 99, 83]));
  assert.strictEqual(trade.log.length, 2);
  assert.strictEqual(trade.log[0].result, "hit");
  assert.strictEqual(trade.log[0].damage, 8);
  assert.strictEqual(trade.log[1].result, "miss");
  assert.strictEqual(trade.log[1].damage, 0);
  assert.strictEqual(trade.aHp, 20);
  assert.strictEqual(trade.bHp, 12);
  assert.strictEqual(trade.winner, "draw");
});

test("双方都可独立追击：顺序为 先手、反击、先手追击、防守追击", function () {
  var a = {
    name: "快手",
    hp: 30,
    maxHp: 30,
    str: 5,
    skill: 8,
    spd: 12,
    luck: 4,
    def: 3,
    weapon: { name: "细剑", mt: 3, hit: 100, wt: 2 }
  };
  var b = {
    name: "更快",
    hp: 30,
    maxHp: 30,
    str: 5,
    skill: 8,
    spd: 16,
    luck: 4,
    def: 3,
    weapon: { name: "细剑", mt: 3, hit: 100, wt: 2 }
  };
  // 甲攻速 10，乙攻速 14。乙比甲高 4，乙可追击；甲不可追击。
  // 顺序应为 a, b, b
  var onlyB = C.resolveDuel(a, b, rngFrom([0, 99, 0, 99, 0, 99]));
  assert.deepStrictEqual(
    onlyB.log.map(function (s) {
      return s.side + (s.followUp ? "*" : "") + ":" + s.result;
    }),
    ["a:hit", "b:hit", "b*:hit"]
  );

  // 互换速度：甲 16-2=14，乙 12-2=10，仅甲追击。顺序 a, b, a
  var aFast = {
    name: "快手",
    hp: 30,
    maxHp: 30,
    str: 5,
    skill: 8,
    spd: 16,
    luck: 4,
    def: 3,
    weapon: { name: "细剑", mt: 3, hit: 100, wt: 2 }
  };
  var bSlow = {
    name: "更快",
    hp: 30,
    maxHp: 30,
    str: 5,
    skill: 8,
    spd: 12,
    luck: 4,
    def: 3,
    weapon: { name: "细剑", mt: 3, hit: 100, wt: 2 }
  };
  var onlyA = C.resolveDuel(aFast, bSlow, rngFrom([0, 99, 0, 99, 0, 99]));
  assert.deepStrictEqual(
    onlyA.log.map(function (s) {
      return s.side + (s.followUp ? "*" : "") + ":" + s.result;
    }),
    ["a:hit", "b:hit", "a*:hit"]
  );

  // 双方都再快一些，都追击：甲 18-2=16，乙 16-2=14，差 2，都不够 4？需要双方都比对方高 4，不可能同时。
  // 除非比较的是各自相对……规则是「攻击方攻速比防守方高出 4 点或以上」，双方不可能同时满足（除非我理解错了）。
  // 对，双方同时追击在纯攻速比较下不可能（A-B>=4 与 B-A>=4 互斥）。
  // 用重量不同来构造：甲 速度 10 重量 0 → AS 10；乙 速度 10 重量 6 → AS 4。甲可追击（差 6），乙不可。
  // 已在上方覆盖。此断言记录该互斥性质。
  assert.strictEqual(C.hasFollowUp(16, 14) && C.hasFollowUp(14, 16), false);
});

test("命中骰等于阈值时失手（roll < 阈值才命中）", function () {
  var a = {
    name: "甲",
    hp: 10,
    maxHp: 10,
    str: 1,
    skill: 0,
    spd: 0,
    luck: 0,
    def: 0,
    weapon: { name: "x", mt: 1, hit: 50, wt: 0 }
  };
  var b = {
    name: "乙",
    hp: 10,
    maxHp: 10,
    str: 0,
    skill: 0,
    spd: 0,
    luck: 0,
    def: 0,
    weapon: { name: "x", mt: 0, hit: 0, wt: 0 }
  };
  // 甲命中阈值 50。掷 49 命中，掷 50 失手。乙阈值 0，必失（但仍会掷命中骰）。
  var hit = C.resolveDuel(a, b, rngFrom([49, 99, 0]));
  assert.strictEqual(hit.log[0].result, "hit");
  var miss = C.resolveDuel(a, b, rngFrom([50, 0]));
  assert.strictEqual(miss.log[0].result, "miss");
});

test("祝福的命中加成在取整前计入预告", function () {
  var a = {
    name: "甲",
    hp: 10,
    maxHp: 10,
    str: 5,
    skill: 0,
    spd: 0,
    luck: 1,
    def: 0,
    weapon: { name: "x", mt: 5, hit: 0, wt: 0 },
    bonuses: { hit: 10, avoid: 0 }
  };
  var b = {
    name: "乙",
    hp: 10,
    maxHp: 10,
    str: 0,
    skill: 0,
    spd: 0,
    luck: 0,
    def: 0,
    weapon: { name: "x", mt: 0, hit: 0, wt: 0 }
  };
  // 原始 0.5 + 10 = 10.5 → 显示/使用 10
  var f = C.forecast(a, b);
  assert.strictEqual(f.a.hit, 10);
});


test("多回合对打持续到一方倒下（游戏内竞技/训练）", function () {
  var a = {
    name: "旅人",
    hp: 18, maxHp: 18, str: 5, skill: 7, spd: 8, luck: 5, def: 3,
    weapon: { name: "铁剑", mt: 5, hit: 90, wt: 5 }
  };
  var dummy = {
    name: "木人",
    hp: 14, maxHp: 14, str: 2, skill: 2, spd: 1, luck: 0, def: 1,
    weapon: { name: "木臂", mt: 1, hit: 60, wt: 4 }
  };
  // 伤害 9，无追击。两轮即可击倒：P命中, E(可忽略), P命中。
  // 骰：轮1 甲命中0 必杀99；乙命中99（失手，不必杀骰）；轮2 甲命中0 必杀99
  var r = C.resolveDuel(a, dummy, rngFrom([0, 99, 99, 0, 99]), { maxRounds: 20 });
  assert.strictEqual(r.winner, "a");
  assert.strictEqual(r.bHp, 0);
  assert.strictEqual(r.aHp, 18);
  assert.ok(r.log.length >= 3);
  assert.strictEqual(r.log[0].damage, 9);
  assert.strictEqual(r.log[0].round, 0);
  var last = r.log[r.log.length - 1];
  assert.strictEqual(last.side, "a");
  assert.strictEqual(last.defenderHp, 0);
});

function triUnit(name, type, extras) {
  var u = {
    name: name,
    hp: 20,
    maxHp: 20,
    str: 10,
    skill: 5,
    spd: 0,
    luck: 0,
    def: 4,
    weapon: { name: name, type: type, mt: 5, hit: 50, wt: 0 }
  };
  if (extras) Object.assign(u, extras);
  return u;
}

test("武器三角：剑克斧，斧克枪，枪克剑", function () {
  var sw = { type: "sword" };
  var ax = { type: "axe" };
  var ln = { type: "lance" };
  var bw = { type: "bow" };
  assert.deepStrictEqual(C.triangleBonus(sw, ax), { mt: 1, hit: 15, side: "adv" });
  assert.deepStrictEqual(C.triangleBonus(ax, ln), { mt: 1, hit: 15, side: "adv" });
  assert.deepStrictEqual(C.triangleBonus(ln, sw), { mt: 1, hit: 15, side: "adv" });
  assert.deepStrictEqual(C.triangleBonus(ax, sw), { mt: -1, hit: -15, side: "dis" });
  assert.deepStrictEqual(C.triangleBonus(ln, ax), { mt: -1, hit: -15, side: "dis" });
  assert.deepStrictEqual(C.triangleBonus(sw, ln), { mt: -1, hit: -15, side: "dis" });
  assert.deepStrictEqual(C.triangleBonus(sw, sw), { mt: 0, hit: 0, side: null });
  assert.deepStrictEqual(C.triangleBonus(bw, sw), { mt: 0, hit: 0, side: null });
  assert.deepStrictEqual(C.triangleBonus(sw, bw), { mt: 0, hit: 0, side: null });
  assert.deepStrictEqual(C.triangleBonus(bw, ln), { mt: 0, hit: 0, side: null });
  assert.deepStrictEqual(C.triangleBonus({ name: "铁剑", mt: 5 }, ln), { mt: 0, hit: 0, side: null });
});

test("克制：+1 威力、+15 命中（剑对斧）", function () {
  var a = triUnit("剑", "sword");
  var b = triUnit("斧", "axe");
  var f = C.forecast(a, b);
  // 攻击力 10+5+1=16，伤害 16-4=12；无修正应为 11
  assert.strictEqual(f.a.damage, 12);
  assert.strictEqual(f.a.atk, 16);
  assert.strictEqual(f.a.triangle.side, "adv");
  assert.strictEqual(f.a.triangle.mt, 1);
  // 命中：技术×2 + 幸运×0.5 + 武器命中 +15 - 回避0 = 10+0+50+15 = 75
  assert.strictEqual(f.a.hit, 75);
  // 对方被克制
  assert.strictEqual(f.b.damage, 10);
  assert.strictEqual(f.b.hit, 45);
  assert.strictEqual(f.b.triangle.side, "dis");
});

test("被克制：−1 威力、−15 命中（斧对剑）", function () {
  var a = triUnit("斧", "axe");
  var b = triUnit("剑", "sword");
  var f = C.forecast(a, b);
  assert.strictEqual(f.a.damage, 10);
  assert.strictEqual(f.a.atk, 14);
  assert.strictEqual(f.a.hit, 45);
  assert.strictEqual(f.a.triangle.side, "dis");
  assert.strictEqual(f.b.damage, 12);
  assert.strictEqual(f.b.hit, 75);
  assert.strictEqual(f.b.triangle.side, "adv");
});

test("弓不参与三角，对剑枪斧皆无修正", function () {
  var bow = triUnit("弓", "bow");
  ["sword", "axe", "lance"].forEach(function (t) {
    var f = C.forecast(bow, triUnit(t, t));
    assert.strictEqual(f.a.damage, 11);
    assert.strictEqual(f.a.atk, 15);
    assert.strictEqual(f.a.hit, 60);
    assert.strictEqual(f.a.triangle.side, null);
    assert.strictEqual(f.b.damage, 11);
    assert.strictEqual(f.b.hit, 60);
    assert.strictEqual(f.b.triangle.side, null);
  });
});

test("同类型或缺少类型时三角无修正", function () {
  var a = triUnit("剑甲", "sword");
  var b = triUnit("剑乙", "sword");
  var f = C.forecast(a, b);
  assert.strictEqual(f.a.damage, 11);
  assert.strictEqual(f.a.hit, 60);
  assert.strictEqual(f.a.triangle.side, null);
  var typeless = triUnit("无名", undefined);
  typeless.weapon = { name: "铁剑", mt: 5, hit: 50, wt: 0 };
  var g = C.forecast(typeless, triUnit("枪", "lance"));
  assert.strictEqual(g.a.damage, 11);
  assert.strictEqual(g.a.hit, 60);
  assert.strictEqual(g.a.triangle.side, null);
});

test("三角命中在钳制前叠加：超过 100 钳为 100，低于 0 钳为 0", function () {
  var high = triUnit("剑", "sword", { skill: 10 });
  high.weapon.hit = 90;
  var axe = triUnit("斧", "axe");
  // 20 + 90 + 15 = 125 → 100
  assert.strictEqual(C.forecast(high, axe).a.hit, 100);
  var low = triUnit("斧", "axe", { skill: 0 });
  low.weapon.hit = 10;
  var sword = triUnit("剑", "sword");
  // 0 + 10 − 15 = −5 → 0
  assert.strictEqual(C.forecast(low, sword).a.hit, 0);
});

test("交锋结算同样套用三角修正", function () {
  var a = triUnit("剑", "sword");
  var b = triUnit("斧", "axe");
  // 命中阈值 75，骰 0 必中；必杀率 floor(5/2)-0=2，骰 99 不暴
  var r = C.resolveDuel(a, b, rngFrom([0, 99, 0, 99]));
  assert.strictEqual(r.log[0].damage, 12);
  assert.strictEqual(r.log[1].damage, 10);
});

test("无 uses 字段的武器不消耗耐久，默认仍只打 1 回合", function () {
  var a = {
    name: "甲",
    hp: 20,
    maxHp: 20,
    str: 8,
    skill: 10,
    spd: 6,
    luck: 4,
    def: 4,
    weapon: { name: "铁剑", type: "sword", mt: 5, hit: 90, wt: 5 }
  };
  var b = {
    name: "乙",
    hp: 20,
    maxHp: 20,
    str: 6,
    skill: 4,
    spd: 5,
    luck: 2,
    def: 5,
    weapon: { name: "铁枪", type: "lance", mt: 7, hit: 80, wt: 8 }
  };
  var r = C.resolveDuel(a, b, rngFrom([0, 99, 0, 99]));
  assert.strictEqual(r.log.length, 2);
  assert.strictEqual(a.weapon.uses, undefined);
  assert.strictEqual(b.weapon.uses, undefined);
});

test("有 uses 时每挥一次消耗 1 点；耗尽后无法再造成伤害", function () {
  var a = {
    name: "甲",
    hp: 30,
    maxHp: 30,
    str: 10,
    skill: 20,
    spd: 6,
    luck: 0,
    def: 0,
    weapon: { name: "铁剑", type: "sword", mt: 5, hit: 100, wt: 5, uses: 1 }
  };
  var b = {
    name: "乙",
    hp: 30,
    maxHp: 30,
    str: 1,
    skill: 1,
    spd: 1,
    luck: 0,
    def: 0,
    weapon: { name: "铁枪", type: "lance", mt: 1, hit: 100, wt: 8, uses: 5 }
  };
  var r = C.resolveDuel(a, b, rngFrom([0, 99, 0, 99, 0, 99, 0, 99]), { maxRounds: 2 });
  assert.strictEqual(a.weapon.uses, 0);
  assert.strictEqual(b.weapon.uses, 3);
  assert.strictEqual(r.log[0].result, "hit");
  assert.ok(r.log[0].damage > 0);
  var secondA = r.log.filter(function (ev) { return ev.side === "a"; })[1];
  assert.ok(secondA);
  assert.strictEqual(secondA.result, "broke");
  assert.strictEqual(secondA.damage, 0);
});

function wallUnit(name) {
  return {
    name: name,
    hp: 20,
    maxHp: 20,
    str: 0,
    skill: 20,
    spd: 0,
    luck: 0,
    def: 20,
    weapon: { name: "x", mt: 0, hit: 100, wt: 0 }
  };
}

function rngConst(v) {
  return {
    int: function () {
      return v;
    }
  };
}

test("重甲兵专属加成为生命 +2，基础值已计入", function () {
  assert.deepStrictEqual(D.CLASSES.armor.bonus, { hp: 2 });
  assert.deepStrictEqual(D.CLASSES.armor.bases, {
    hp: 24,
    str: 6,
    skill: 3,
    spd: 2,
    luck: 2,
    def: 9
  });
  assert.strictEqual(D.BATTLE_MAX_ROUNDS, 15);
  assert.strictEqual(C.BATTLE_MAX_ROUNDS, 15);
});

test("untilDown 在 15 回合双方仍存活时先手判定失败", function () {
  var a = wallUnit("甲");
  var b = wallUnit("乙");
  var r = C.resolveDuel(a, b, rngConst(0), { untilDown: true, maxRounds: 15 });
  assert.strictEqual(r.timeout, true);
  assert.strictEqual(r.winner, "b");
  assert.ok(r.aHp > 0);
  assert.ok(r.bHp > 0);
  assert.strictEqual(r.aHp, 20);
  assert.strictEqual(r.bHp, 20);
  var rounds = r.log.map(function (ev) { return ev.round; });
  assert.strictEqual(Math.max.apply(null, rounds), 14);
  assert.strictEqual(r.log.filter(function (ev) { return ev.round === 14; }).length > 0, true);
  assert.strictEqual(r.log.some(function (ev) { return ev.round === 15; }), false);
  assert.strictEqual(r.log.length, 30);
});

test("15 回合内击倒仍算先手获胜", function () {
  var a = {
    name: "旅人",
    hp: 18, maxHp: 18, str: 5, skill: 7, spd: 8, luck: 5, def: 3,
    weapon: { name: "铁剑", mt: 5, hit: 90, wt: 5 }
  };
  var dummy = {
    name: "木人",
    hp: 14, maxHp: 14, str: 2, skill: 2, spd: 1, luck: 0, def: 1,
    weapon: { name: "木臂", mt: 1, hit: 60, wt: 4 }
  };
  var r = C.resolveDuel(a, dummy, rngFrom([0, 99, 99, 0, 99]), { untilDown: true, maxRounds: 15 });
  assert.strictEqual(r.winner, "a");
  assert.strictEqual(r.timeout, false);
  assert.strictEqual(r.bHp, 0);
  assert.ok(r.aHp > 0);
  assert.ok(r.log.length < 30);
  assert.strictEqual(r.log.some(function (ev) { return ev.round >= 15; }), false);
});

test("省略 opts 时仍默认只打 1 回合，双方存活为平局", function () {
  var a = wallUnit("甲");
  var b = wallUnit("乙");
  var r = C.resolveDuel(a, b, rngConst(0));
  assert.strictEqual(r.log.length, 2);
  assert.strictEqual(r.log[0].round, 0);
  assert.strictEqual(r.log[1].round, 0);
  assert.strictEqual(r.log.some(function (ev) { return ev.round === 1; }), false);
  assert.strictEqual(r.winner, "draw");
  assert.strictEqual(r.timeout, false);
  assert.strictEqual(r.aHp, 20);
  assert.strictEqual(r.bHp, 20);
});


test("特效兵器：仅对 effectiveVs 中的 classId 将威力乘 3，再加力量与三角", function () {
  var slayer = {
    name: "甲",
    classId: "sword",
    hp: 30,
    maxHp: 30,
    str: 5,
    skill: 10,
    spd: 0,
    luck: 0,
    def: 4,
    weapon: { name: "破甲剑", type: "sword", mt: 8, hit: 80, wt: 11, effectiveVs: ["armor"] }
  };
  var armor = {
    name: "乙",
    classId: "armor",
    hp: 30,
    maxHp: 30,
    str: 6,
    skill: 3,
    spd: 0,
    luck: 0,
    def: 9,
    weapon: { name: "铁枪", type: "lance", mt: 7, hit: 80, wt: 8 }
  };
  var fighter = {
    name: "丙",
    classId: "fighter",
    hp: 30,
    maxHp: 30,
    str: 9,
    skill: 4,
    spd: 0,
    luck: 0,
    def: 4,
    weapon: { name: "铁斧", type: "axe", mt: 6, hit: 75, wt: 7 }
  };
  // 对重甲：威力 8×3=24，剑对枪被克制 −1，攻击力 5+24-1=28，伤害 28-9=19
  var vsArmor = C.forecast(slayer, armor);
  assert.strictEqual(C.isEffectiveVs(slayer.weapon, "armor"), true);
  assert.strictEqual(C.weaponMtOf(slayer.weapon, "armor"), 24);
  assert.strictEqual(vsArmor.a.atk, 28);
  assert.strictEqual(vsArmor.a.damage, 19);
  assert.strictEqual(vsArmor.a.triangle.side, "dis");

  // 对战士：不特效，剑克斧 +1，攻击力 5+8+1=14，伤害 14-4=10（与无 effectiveVs 时相同）
  var vsFighter = C.forecast(slayer, fighter);
  assert.strictEqual(C.isEffectiveVs(slayer.weapon, "fighter"), false);
  assert.strictEqual(C.weaponMtOf(slayer.weapon, "fighter"), 8);
  assert.strictEqual(vsFighter.a.atk, 14);
  assert.strictEqual(vsFighter.a.damage, 10);

  var plain = {
    name: "甲",
    classId: "sword",
    hp: 30, maxHp: 30, str: 5, skill: 10, spd: 0, luck: 0, def: 4,
    weapon: { name: "铁剑", type: "sword", mt: 8, hit: 80, wt: 11 }
  };
  var plainVsFighter = C.forecast(plain, fighter);
  assert.strictEqual(plainVsFighter.a.atk, vsFighter.a.atk);
  assert.strictEqual(plainVsFighter.a.damage, vsFighter.a.damage);

  // 已转职仍使用同一 classId，特效仍然生效
  var general = {
    name: "将军",
    classId: "armor",
    className: "将军",
    promoted: true,
    hp: 30, maxHp: 30, str: 6, skill: 3, spd: 0, luck: 0, def: 9,
    weapon: { name: "铁枪", type: "lance", mt: 7, hit: 80, wt: 8 }
  };
  var vsPromo = C.forecast(slayer, general);
  assert.strictEqual(vsPromo.a.atk, 28);
  assert.strictEqual(vsPromo.a.damage, 19);

  // 预告与实击一致：命中骰 0，必杀骰 99
  var r = C.resolveDuel(slayer, armor, rngFrom([0, 99, 0, 99]));
  assert.strictEqual(r.log[0].damage, 19);
  var r2 = C.resolveStrike(C.applyTriangle(C.snapshot(slayer), C.snapshot(armor)), C.snapshot(armor), rngFrom([0, 99]));
  assert.strictEqual(r2.damage, 19);
});

test("copyWeapon 带上 effectiveVs 与明示耐久；地下城二转职书掉率为 20%", function () {
  var w = D.copyWeapon("slayer-armor");
  assert.ok(w);
  assert.deepStrictEqual(w.effectiveVs, ["armor"]);
  assert.strictEqual(w.uses, 18);
  assert.strictEqual(w.maxUses, 18);
  assert.strictEqual(D.weaponMaxUses("slayer-armor"), 18);
  assert.strictEqual(D.weaponMaxUses("slayer-armor-lance"), 16);
  assert.strictEqual(D.TOME_DROP_CHANCE, 20);
  assert.ok(D.SLAYER_REWARDS.indexOf("slayer-armor") !== -1);
  assert.ok(D.D3_REWARDS.indexOf("killer-sword") !== -1);
  assert.ok(D.D3_REWARDS.indexOf("slayer-axe") !== -1);
  assert.ok(D.SHOP_WEAPONS.indexOf("slayer-armor") === -1);
  var iron = D.copyWeapon("iron-sword");
  assert.strictEqual(iron.effectiveVs, undefined);
});

console.log(results.join("\n"));
console.log("\n" + passed + " / " + results.length + " tests passed.");
