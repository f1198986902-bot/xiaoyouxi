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
      startingWeapon: "wood-sword",
      blurb: "以剑见长的游侠。技术与速度出众，容易打出必杀，却也身板单薄。",
      bases: { hp: 18, str: 5, skill: 9, spd: 8, luck: 5, def: 3 },
      bonus: { skill: 2 },
      growths: { hp: 70, str: 40, skill: 60, spd: 60, luck: 55, def: 20 }
    },
    cavalier: {
      id: "cavalier",
      name: "骑士",
      icon: "⚑",
      weaponType: "lance",
      startingWeapon: "wood-lance",
      blurb: "使枪的军士。力量成长优秀，攻守较为均衡，速度则稍显平庸。",
      bases: { hp: 20, str: 7, skill: 4, spd: 6, luck: 4, def: 5 },
      bonus: { str: 1, spd: 1 },
      growths: { hp: 80, str: 60, skill: 35, spd: 40, luck: 35, def: 20 }
    },
    archer: {
      id: "archer",
      name: "弓箭手",
      icon: "🏹",
      weaponType: "bow",
      startingWeapon: "wood-bow",
      blurb: "擅使长弓。命中稳定，能把技术转化为可靠的输出。",
      bases: { hp: 18, str: 5, skill: 6, spd: 7, luck: 4, def: 4 },
      bonus: { spd: 2 },
      growths: { hp: 75, str: 50, skill: 50, spd: 40, luck: 40, def: 20 }
    },
    thief: {
      id: "thief",
      name: "盗贼",
      icon: "🗡",
      weaponType: "sword",
      startingWeapon: "wood-sword",
      blurb: "身手敏捷的求生者。速度极高，容易追击，但力量与守备都不足。",
      bases: { hp: 17, str: 3, skill: 6, spd: 10, luck: 6, def: 2 },
      bonus: { skill: 1, spd: 1 },
      growths: { hp: 75, str: 30, skill: 40, spd: 70, luck: 50, def: 25 }
    },
    armor: {
      id: "armor",
      name: "重甲兵",
      icon: "🛡",
      weaponType: "lance",
      startingWeapon: "wood-lance",
      blurb: "身披重甲的守御者。生命与守备成长惊人，却行动迟缓，难以追击。",
      bases: { hp: 22, str: 6, skill: 3, spd: 2, luck: 2, def: 11 },
      bonus: { def: 2 },
      growths: { hp: 90, str: 40, skill: 30, spd: 30, luck: 35, def: 55 }
    },
    fighter: {
      id: "fighter",
      name: "战士",
      icon: "🪓",
      weaponType: "axe",
      startingWeapon: "wood-axe",
      blurb: "力大的斧手。力量与生命出众，技术稍逊，守备也并不厚实。",
      bases: { hp: 20, str: 9, skill: 4, spd: 5, luck: 3, def: 4 },
      bonus: { str: 2 },
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
    "copper-bow": { id: "copper-bow", name: "铜弓", type: "bow", mt: 8, hit: 82, wt: 6, cost: 0 },
    "wood-sword": { id: "wood-sword", name: "木剑", type: "sword", mt: 3, hit: 85, wt: 3, cost: 0 },
    "wood-lance": { id: "wood-lance", name: "木枪", type: "lance", mt: 4, hit: 80, wt: 5, cost: 0 },
    "wood-axe": { id: "wood-axe", name: "木斧", type: "axe", mt: 4, hit: 70, wt: 6, cost: 0 },
    "wood-bow": { id: "wood-bow", name: "木弓", type: "bow", mt: 4, hit: 80, wt: 4, cost: 0 },
    "silver-sword": { id: "silver-sword", name: "银剑", type: "sword", mt: 13, hit: 80, wt: 8, cost: 1200 },
    "silver-lance": { id: "silver-lance", name: "银枪", type: "lance", mt: 14, hit: 75, wt: 10, cost: 1200 },
    "silver-axe": { id: "silver-axe", name: "银斧", type: "axe", mt: 15, hit: 70, wt: 12, cost: 1000 },
    "silver-bow": { id: "silver-bow", name: "银弓", type: "bow", mt: 13, hit: 75, wt: 6, cost: 1200 }
  };

  /** 地下城一胜利时随机掉落的铜武器（不在商店出售）。 */
  var COPPER_REWARDS = ["copper-sword", "copper-axe", "copper-lance", "copper-bow"];
  /** 地下城二胜利时随机掉落的银武器（不在商店出售）。 */
  var SILVER_REWARDS = ["silver-sword", "silver-lance", "silver-axe", "silver-bow"];
  /** 地下城一的魔物每次进入时随机装备的铁级武器。 */
  var IRON_WEAPONS = ["iron-sword", "iron-lance", "iron-axe", "iron-bow"];
  /** 商店出售的铁质武器。 */
  var SHOP_WEAPONS = ["iron-sword", "iron-lance", "iron-axe", "iron-bow"];

  var WEAPON_ORDER = [
    "iron-sword", "steel-sword", "slim-sword",
    "iron-lance", "steel-lance", "long-lance",
    "iron-axe", "steel-axe",
    "iron-bow", "steel-bow"
  ];

  var TYPE_NAMES = { sword: "剑", lance: "枪", axe: "斧", bow: "弓" };

  var ITEMS = {
    tonic: { id: "tonic", name: "休息药", cost: 80, hp: 10, desc: "恢复 10 点生命。药味苦，却能把人从边缘拉回来。" },
    promoBook: { id: "promoBook", name: "转职书", cost: 500, desc: "等级达到 10 的下位职业可转职为上位职业。转职后等级变为 21，属性提升，金币产出也随之提高。" },
    challengeWrit: { id: "challengeWrit", name: "挑战书", cost: 100, desc: "若当前同伴今日已在竞技场出战，使用后可再战一次。" }
  };

  /** 名册显示顺序：剑士、弓箭手、重甲兵、骑士、盗贼、战士 */
  var PARTY_ORDER = ["sword", "archer", "armor", "cavalier", "thief", "fighter"];

  var QUEST_POOL = [
    { id: "escort", points: 42 },
    { id: "herbs", points: 28 },
    { id: "patrol", points: 36 },
    { id: "lostkid", points: 30 },
    { id: "rats", points: 24 },
    { id: "fence", points: 32 },
    { id: "letter", points: 26 },
    { id: "firewood", points: 34 },
    { id: "well", points: 30 },
    { id: "watch", points: 38 }
  ];

  var GUILD_ORDER = ["lampward", "wasteland", "ironoath"];
  var GUILDS = {
    lampward: { id: "lampward" },
    wasteland: { id: "wasteland" },
    ironoath: { id: "ironoath" }
  };

  var ARENA_WIN_POINTS = 10;
  var ARENA_SEASON_MS = 15 * 24 * 60 * 60 * 1000;
  var GUILD_LOCK_MS = 24 * 60 * 60 * 1000;
  /* Always on: training fees and gold production are both +5%. */
  var GOLD_BONUS = 0.05;
  var GUILD_GOLD_BONUS = 0.05;
  var ARENA_PRIZES = [100000, 50000, 20000];
  var PERSONAL_PRIZE_POT = 1000000;
  var GUILD_SPEND_RETURN = 0.9;
  var GUILD_PRIZE_SHARES = [0.7, 0.2, 0.1];
  /* 2026-01-01 00:00 Asia/Shanghai = 2025-12-31 16:00 UTC */
  var SEASON_EPOCH_MS = Date.UTC(2025, 11, 31, 16, 0, 0);
  var ARENA_NPC_COUNT = 8;
  var GUILD_HUNT_POINTS = 60;

  var ENEMY_NAMES = {
    sword: ["雷蒙德", "希尔达", "奥斯瓦", "艾琳"],
    cavalier: ["罗兰", "伊冯", "加雷斯", "塞琳"],
    archer: ["雨果", "玛丽娜", "托尔", "莉芙"],
    thief: ["菲林", "娜莎", "科尔", "薇安"],
    armor: ["勃朗", "哈根", "伊达", "格伦"],
    fighter: ["加托", "贝恩", "卢卡", "朵拉"]
  };

  /** 两座互不关联的地下城。显示名由界面文案提供，此处仅存数值。 */
  var DUNGEONS = {
    d1: {
      id: "d1",
      artId: "stonegate",
      classId: "cavalier",
      className: "骑士",
      level: 10,
      hp: 50,
      maxHp: 50,
      str: 12,
      skill: 7,
      spd: 10,
      luck: 7,
      def: 7,
      weaponPool: "iron",
      reward: "copper",
      rewardGold: 0,
      rewardExp: 0
    },
    d2: {
      id: "d2",
      artId: "axefiend",
      classId: "fighter",
      className: "战士",
      level: 15,
      hp: 80,
      maxHp: 80,
      str: 17,
      skill: 9,
      spd: 11,
      luck: 7,
      def: 8,
      weaponId: "steel-axe",
      reward: "silver",
      tomeChance: 50,
      rewardGold: 0,
      rewardExp: 0
    }
  };
  var DUNGEON_ORDER = ["d1", "d2"];
  /** 兼容旧调用：按顺序排列的地下城定义。 */
  var DUNGEON_WAVES = DUNGEON_ORDER.map(function (id) { return DUNGEONS[id]; });
  /** 兼容旧调用：地下城一。 */
  var DUNGEON_BOSS = DUNGEONS.d1;

  /** 转职加成（不含幸运/魔防/体格/移动）。 */
  var PROMOTIONS = {
    sword: { id: "swordmaster", hp: 5, str: 2, skill: 0, spd: 0, luck: 0, def: 2 },
    cavalier: { id: "paladin", hp: 2, str: 1, skill: 1, spd: 1, luck: 0, def: 2 },
    armor: { id: "general", hp: 4, str: 2, skill: 2, spd: 3, luck: 0, def: 2 },
    fighter: { id: "warrior", hp: 3, str: 1, skill: 2, spd: 0, luck: 0, def: 3 },
    archer: { id: "sniper", hp: 3, str: 1, skill: 2, spd: 2, luck: 0, def: 2 },
    thief: { id: "assassin", hp: 3, str: 1, skill: 0, spd: 0, luck: 0, def: 2 }
  };

  var CLASS_START_IRON = {
    sword: "iron-sword",
    cavalier: "iron-lance",
    archer: "iron-bow",
    thief: "iron-sword",
    armor: "iron-lance",
    fighter: "iron-axe"
  };

  var STATUE_LORE = [
    "这座雕像没有刻名字。有人说他是建镇时第一个守夜的卫兵，也有人说只是石匠按自己的兄长雕的。",
    "灰灯镇不产金银，墙外的田也薄。人们来这里，多半是因为别处更没法活。",
    "镇民说，只要灯火还在，石像脚下就会慢慢积起铜币。没有人说得清钱是从哪儿来的。",
    "底座侧面能摸到一行被风雨磨浅的字：愿灯火不灭。没有落款。"
  ];

  var PERIODS = ["上午", "下午", "傍晚"];

  var INN_COST = 40;
  /** No gold cap. Test builds start with a large purse. */
  var GOLD_CAP = 0;
  var START_GOLD = 999999;
  var LEVEL_CAP = 20;
  var EFFECTIVE_LEVEL_CAP = 40;
  var EXP_PER_LEVEL = 100;
  var REPAIR_COST = 5;
  var ARENA_FIGHTS_MAX = 5;
  var GOLD_TICK_MS = 10000;
  /** One income day is 24 real hours: 8,640 ticks of 10 seconds. */
  var TICKS_PER_DAY = 8640;
  var INCOME_SCALE = 2000;
  var INCOME_OFFSET = 20;
  var ECONOMY_REV = 2;

  function money(n) {
    var x = Math.round(Number(n) * 100) / 100;
    if (x === 0) return 0;
    return x;
  }

  /** 24h income at this effective level: 2000 × level / (level + 20). Cap 40 for promoted units. */
  function dailyIncome(level) {
    var lv = level;
    if (lv < 1) lv = 1;
    if (lv > EFFECTIVE_LEVEL_CAP) lv = EFFECTIVE_LEVEL_CAP;
    lv = Math.floor(lv);
    return money(INCOME_SCALE * lv / (lv + INCOME_OFFSET));
  }

  function weaponMaxUses(id) {
    if (!id || typeof id !== "string") return 0;
    if (id.indexOf("wood-") === 0) return 40;
    if (id.indexOf("copper-") === 0) return 25;
    if (id.indexOf("silver-") === 0) return 20;
    if (id.indexOf("steel-") === 0) return 30;
    return 35;
  }

  function tickIncome(level) {
    return dailyIncome(level) / TICKS_PER_DAY;
  }

  /** Cost to train from this level to the next equals current daily income. */
  function trainCost(level) {
    return dailyIncome(level);
  }

  function classList() {
    return CLASS_ORDER.map(function (id) { return CLASSES[id]; });
  }

  function copyWeapon(id, usesLeft) {
    var w = WEAPONS[id];
    if (!w) return null;
    var max = weaponMaxUses(id);
    var uses = max;
    if (typeof usesLeft === "number" && isFinite(usesLeft)) {
      uses = Math.max(0, Math.min(max, Math.floor(usesLeft)));
    }
    return {
      id: w.id,
      name: w.name,
      type: w.type,
      mt: w.mt,
      hit: w.hit,
      wt: w.wt,
      cost: w.cost,
      uses: uses,
      maxUses: max
    };
  }

  return {
    CLASSES: CLASSES,
    CLASS_ORDER: CLASS_ORDER,
    WEAPONS: WEAPONS,
    WEAPON_ORDER: WEAPON_ORDER,
    TYPE_NAMES: TYPE_NAMES,
    ITEMS: ITEMS,
    QUEST_POOL: QUEST_POOL,
    GUILDS: GUILDS,
    GUILD_ORDER: GUILD_ORDER,
    ARENA_WIN_POINTS: ARENA_WIN_POINTS,
    ARENA_SEASON_MS: ARENA_SEASON_MS,
    GUILD_LOCK_MS: GUILD_LOCK_MS,
    GOLD_BONUS: GOLD_BONUS,
    GUILD_GOLD_BONUS: GUILD_GOLD_BONUS,
    ARENA_PRIZES: ARENA_PRIZES,
    ARENA_NPC_COUNT: ARENA_NPC_COUNT,
    GUILD_HUNT_POINTS: GUILD_HUNT_POINTS,
    ENEMY_NAMES: ENEMY_NAMES,
    DUNGEON_BOSS: DUNGEON_BOSS,
    DUNGEON_WAVES: DUNGEON_WAVES,
    DUNGEONS: DUNGEONS,
    DUNGEON_ORDER: DUNGEON_ORDER,
    PERSONAL_PRIZE_POT: PERSONAL_PRIZE_POT,
    GUILD_SPEND_RETURN: GUILD_SPEND_RETURN,
    GUILD_PRIZE_SHARES: GUILD_PRIZE_SHARES,
    SEASON_EPOCH_MS: SEASON_EPOCH_MS,
    PROMOTIONS: PROMOTIONS,
    CLASS_START_IRON: CLASS_START_IRON,
    COPPER_REWARDS: COPPER_REWARDS,
    SILVER_REWARDS: SILVER_REWARDS,
    IRON_WEAPONS: IRON_WEAPONS,
    SHOP_WEAPONS: SHOP_WEAPONS,
    STATUE_LORE: STATUE_LORE,
    PERIODS: PERIODS,
    PARTY_ORDER: PARTY_ORDER,
    INN_COST: INN_COST,
    GOLD_CAP: GOLD_CAP,
    START_GOLD: START_GOLD,
    GOLD_TICK_MS: GOLD_TICK_MS,
    TICKS_PER_DAY: TICKS_PER_DAY,
    INCOME_SCALE: INCOME_SCALE,
    INCOME_OFFSET: INCOME_OFFSET,
    ECONOMY_REV: ECONOMY_REV,
    money: money,
    dailyIncome: dailyIncome,
    tickIncome: tickIncome,
    trainCost: trainCost,
    LEVEL_CAP: LEVEL_CAP,
    EFFECTIVE_LEVEL_CAP: EFFECTIVE_LEVEL_CAP,
    EXP_PER_LEVEL: EXP_PER_LEVEL,
    REPAIR_COST: REPAIR_COST,
    ARENA_FIGHTS_MAX: ARENA_FIGHTS_MAX,
    classList: classList,
    copyWeapon: copyWeapon,
    weaponMaxUses: weaponMaxUses
  };
});
