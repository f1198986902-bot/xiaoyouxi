/**
 * 灰灯镇 · 职业、武器、物品与委托数据
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.GameData = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var CLASSES = {
    sword: {
      id: "sword",
      name: "剑士",
      icon: "⚔",
      weaponType: "sword",
      startingWeapon: "iron-sword",
      blurb: "以剑见长的游侠。技术与速度出众，容易打出必杀，却也身板单薄。",
      bases: { hp: 18, str: 5, skill: 7, spd: 8, luck: 5, def: 3 },
      growths: { hp: 70, str: 40, skill: 60, spd: 60, luck: 55, def: 20 }
    },
    cavalier: {
      id: "cavalier",
      name: "骑士",
      icon: "⚑",
      weaponType: "lance",
      startingWeapon: "iron-lance",
      blurb: "使枪的军士。力量成长优秀，攻守较为均衡，速度则稍显平庸。",
      bases: { hp: 20, str: 6, skill: 4, spd: 5, luck: 4, def: 5 },
      growths: { hp: 80, str: 60, skill: 35, spd: 40, luck: 35, def: 20 }
    },
    archer: {
      id: "archer",
      name: "弓箭手",
      icon: "🏹",
      weaponType: "bow",
      startingWeapon: "iron-bow",
      blurb: "擅使长弓。命中稳定，能把技术转化为可靠的输出。",
      bases: { hp: 18, str: 5, skill: 6, spd: 5, luck: 4, def: 4 },
      growths: { hp: 75, str: 50, skill: 50, spd: 40, luck: 40, def: 20 }
    },
    thief: {
      id: "thief",
      name: "盗贼",
      icon: "🗡",
      weaponType: "sword",
      startingWeapon: "iron-sword",
      blurb: "身手敏捷的求生者。速度极高，容易追击，但力量与守备都不足。",
      bases: { hp: 17, str: 3, skill: 5, spd: 9, luck: 6, def: 2 },
      growths: { hp: 75, str: 30, skill: 40, spd: 70, luck: 50, def: 25 }
    },
    armor: {
      id: "armor",
      name: "重甲兵",
      icon: "🛡",
      weaponType: "lance",
      startingWeapon: "iron-lance",
      blurb: "身披重甲的守御者。生命与守备成长惊人，却行动迟缓，难以追击。",
      bases: { hp: 22, str: 6, skill: 3, spd: 2, luck: 2, def: 9 },
      growths: { hp: 90, str: 40, skill: 30, spd: 30, luck: 35, def: 55 }
    },
    fighter: {
      id: "fighter",
      name: "战士",
      icon: "🪓",
      weaponType: "axe",
      startingWeapon: "iron-axe",
      blurb: "力大的斧手。力量与生命出众，技术稍逊，守备也并不厚实。",
      bases: { hp: 20, str: 7, skill: 4, spd: 5, luck: 3, def: 4 },
      growths: { hp: 85, str: 55, skill: 35, spd: 40, luck: 30, def: 25 }
    }
  };

  var CLASS_ORDER = ["sword", "cavalier", "archer", "thief", "armor", "fighter"];

  var WEAPONS = {
    "iron-sword": { id: "iron-sword", name: "铁剑", type: "sword", mt: 5, hit: 90, wt: 5, cost: 200 },
    "steel-sword": { id: "steel-sword", name: "钢剑", type: "sword", mt: 8, hit: 80, wt: 8, cost: 600 },
    "slim-sword": { id: "slim-sword", name: "细剑", type: "sword", mt: 3, hit: 100, wt: 2, cost: 280 },
    "iron-lance": { id: "iron-lance", name: "铁枪", type: "lance", mt: 7, hit: 80, wt: 8, cost: 240 },
    "steel-lance": { id: "steel-lance", name: "钢枪", type: "lance", mt: 10, hit: 75, wt: 10, cost: 720 },
    "long-lance": { id: "long-lance", name: "长枪", type: "lance", mt: 8, hit: 75, wt: 9, cost: 360 },
    "iron-axe": { id: "iron-axe", name: "铁斧", type: "axe", mt: 6, hit: 75, wt: 7, cost: 220 },
    "steel-axe": { id: "steel-axe", name: "钢斧", type: "axe", mt: 9, hit: 70, wt: 10, cost: 650 },
    "iron-bow": { id: "iron-bow", name: "铁弓", type: "bow", mt: 6, hit: 85, wt: 5, cost: 220 },
    "steel-bow": { id: "steel-bow", name: "钢弓", type: "bow", mt: 9, hit: 80, wt: 8, cost: 680 },
    "copper-sword": { id: "copper-sword", name: "铜剑", type: "sword", mt: 7, hit: 85, wt: 6, cost: 0 },
    "copper-lance": { id: "copper-lance", name: "铜枪", type: "lance", mt: 9, hit: 78, wt: 9, cost: 0 },
    "copper-axe": { id: "copper-axe", name: "铜斧", type: "axe", mt: 8, hit: 72, wt: 8, cost: 0 },
    "copper-bow": { id: "copper-bow", name: "铜弓", type: "bow", mt: 8, hit: 82, wt: 6, cost: 0 }
  };

  /** 地下城胜利时随机掉落的铜武器（不在商店出售）。 */
  var COPPER_REWARDS = ["copper-sword", "copper-axe", "copper-lance", "copper-bow"];

  var WEAPON_ORDER = [
    "iron-sword", "steel-sword", "slim-sword",
    "iron-lance", "steel-lance", "long-lance",
    "iron-axe", "steel-axe",
    "iron-bow", "steel-bow"
  ];

  var TYPE_NAMES = { sword: "剑", lance: "枪", axe: "斧", bow: "弓" };

  var ITEMS = {
    tonic: { id: "tonic", name: "休息药", cost: 80, hp: 10, desc: "恢复 10 点生命。药味苦，却能把人从边缘拉回来。" }
  };

  /** 名册显示顺序：剑士、弓箭手、重甲兵、骑士、盗贼、战士 */
  var PARTY_ORDER = ["sword", "archer", "armor", "cavalier", "thief", "fighter"];

  var QUEST_POOL = [
    { id: "escort", name: "护送行商", desc: "一位行商要在薄暮前离开灰灯镇，需要有人沿路照看。路不算远，风却不小。", gold: 42, exp: 22 },
    { id: "herbs", name: "采集药草", desc: "一位厨娘拜托你去墙外坡地采一把药草。小心别被荆棘刮破手。", gold: 28, exp: 16 },
    { id: "patrol", name: "巡查城墙", desc: "守墙的老兵希望有人替他走一趟北墙，看看有没有裂口或新脚印。", gold: 36, exp: 20 },
    { id: "lostkid", name: "寻找走失的孩子", desc: "广场边的妇人说孩子跟着一只花猫跑出了巷口，到傍晚还没回来。", gold: 30, exp: 18 },
    { id: "rats", name: "清理仓库老鼠", desc: "商店后院的木箱里又闹鼠患，店主愿意出一点酬金请人收拾干净。", gold: 24, exp: 14 },
    { id: "fence", name: "修缮训练场栅栏", desc: "训练场的木栅栏被撞松了好几根，需要帮手把钉子重新钉回去。", gold: 32, exp: 17 },
    { id: "letter", name: "送信到城门", desc: "公会执事托你把一封信送到城门卫兵手上，路上别拆开看。", gold: 26, exp: 15 },
    { id: "firewood", name: "劈柴备冬", desc: "天气渐冷，镇上需要更多木柴。斧头可以借用，力气得自己出。", gold: 34, exp: 18 },
    { id: "well", name: "疏通水井", desc: "西巷的井口积了落叶，几户人家打不上干净的水。", gold: 30, exp: 16 },
    { id: "watch", name: "夜市看摊", desc: "布商要去公会谈事，请人帮忙照看一阵摊位，别让人顺走布卷。", gold: 38, exp: 19 }
  ];

  var ENEMY_NAMES = {
    sword: ["雷蒙德", "希尔达", "奥斯瓦", "艾琳"],
    cavalier: ["罗兰", "伊冯", "加雷斯", "塞琳"],
    archer: ["雨果", "玛丽娜", "托尔", "莉芙"],
    thief: ["菲林", "娜莎", "科尔", "薇安"],
    armor: ["勃朗", "哈根", "伊达", "格伦"],
    fighter: ["加托", "贝恩", "卢卡", "朵拉"]
  };

  /** 镇外地下城初级首领：使长枪的骑士。 */
  var DUNGEON_BOSS = {
    id: "stone-gate-knight",
    name: "石门骑士 柯刚",
    classId: "cavalier",
    className: "骑士",
    level: 10,
    hp: 100,
    maxHp: 100,
    str: 11,
    skill: 8,
    spd: 8,
    luck: 7,
    def: 8,
    weaponId: "long-lance",
    rewardGold: 800,
    rewardExp: 40
  };

  var STATUE_LORE = [
    "这座雕像没有刻名字。有人说他是建镇时第一个守夜的卫兵，也有人说只是石匠按自己的兄长雕的。",
    "灰灯镇不产金银，墙外的田也薄。人们来这里，多半是因为别处更没法活。",
    "镇民说，只要灯火还在，石像脚下就会慢慢积起铜币。没有人说得清钱是从哪儿来的。",
    "底座侧面能摸到一行被风雨磨浅的字：愿灯火不灭。没有落款。"
  ];

  var PERIODS = ["上午", "下午", "傍晚"];

  var INN_COST = 40;
  var GOLD_CAP = 99999;
  var START_GOLD = 99999;
  var LEVEL_CAP = 20;
  var EXP_PER_LEVEL = 100;
  var GOLD_TICK_MS = 10000;
  var TICKS_PER_DAY = 100;

  function classList() {
    return CLASS_ORDER.map(function (id) { return CLASSES[id]; });
  }

  function copyWeapon(id) {
    var w = WEAPONS[id];
    return w ? { id: w.id, name: w.name, type: w.type, mt: w.mt, hit: w.hit, wt: w.wt, cost: w.cost } : null;
  }

  return {
    CLASSES: CLASSES,
    CLASS_ORDER: CLASS_ORDER,
    WEAPONS: WEAPONS,
    WEAPON_ORDER: WEAPON_ORDER,
    TYPE_NAMES: TYPE_NAMES,
    ITEMS: ITEMS,
    QUEST_POOL: QUEST_POOL,
    ENEMY_NAMES: ENEMY_NAMES,
    DUNGEON_BOSS: DUNGEON_BOSS,
    COPPER_REWARDS: COPPER_REWARDS,
    STATUE_LORE: STATUE_LORE,
    PERIODS: PERIODS,
    PARTY_ORDER: PARTY_ORDER,
    INN_COST: INN_COST,
    GOLD_CAP: GOLD_CAP,
    START_GOLD: START_GOLD,
    GOLD_TICK_MS: GOLD_TICK_MS,
    TICKS_PER_DAY: TICKS_PER_DAY,
    trainCost: function (level) { return 200 * level; },
    LEVEL_CAP: LEVEL_CAP,
    EXP_PER_LEVEL: EXP_PER_LEVEL,
    classList: classList,
    copyWeapon: copyWeapon
  };
});
