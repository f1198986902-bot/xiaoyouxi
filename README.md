# xiaoyouxi

**Ashlamp Town** (灰灯镇) is a browser HTML5 game. This repository is the game itself: open `index.html` and play. There is no build step and no bundler.

Stylesheets, scripts, and images use paths relative to the repository root (`css/`, `js/`, `assets/`). Keep `index.html` at the root so those paths resolve.

The game starts in **English**. Switch to **简体中文** with the **English / 中文** control on the title screen (and again in the town HUD). The choice is remembered in the browser.

## Play

1. Clone or download this repository.
2. Open `index.html` in a modern browser. You can double-click the file, or serve this folder with any static file server.
3. Choose **New Journey**. Use **Continue Journey** after the browser has a saved game.

`combat.test.js` checks combat formulas with Node (`node combat.test.js`). It is not required to play.

---

# xiaoyouxi

**灰灯镇**（Ashlamp Town）是一款浏览器 HTML5 游戏。本仓库就是游戏本体：打开 `index.html` 即可游玩。无需构建，也没有打包工具。

样式、脚本和图片都使用相对于仓库根目录的路径（`css/`、`js/`、`assets/`）。请把 `index.html` 放在仓库根目录，这样这些路径才能正确找到文件。

游戏默认语言是**英文**。在标题画面（以及小镇界面）用 **English / 中文** 切换到**简体中文**。选择会保存在浏览器里。

## 游玩

1. 克隆或下载本仓库。
2. 用现代浏览器打开 `index.html`。可以直接双击该文件，也可以用任意静态文件服务器托管这个目录。
3. 选择**新的旅程**。浏览器里已有存档时，可以使用**继续旅程**。

`combat.test.js` 用 Node 检查战斗公式（`node combat.test.js`）。游玩时不需要运行它。
