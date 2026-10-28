import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const readme = readFileSync(join(root, "README.md"), "utf8");

const ADDRESSES = {
  xmr: "85EogNCqzyce44HwxoJaWWPy8g45WENqgYHjHdwNVguTCb7oV8Wjh2vNkGFAGFtf4r67Wh2qHA8TnVJV6Toui9gvEempUZj",
  btc: "bc1qdgfj0rm0tguna4nk36lxmeq45h59hscusrthk2",
  bch: "qrnyczppcmxkj7r2ajddsvsh6el4s4v9fvfgs0wl9h",
  eth: "0x0Ad817F7Ca658B3D2D83Ab019F2AeA5645a5b672"
};

test("首页有独立的赞助区并接入导航", () => {
  assert.match(html, /<section[^>]+id="support"[^>]*data-section/, "缺少 #support 区块");
  assert.match(html, /data-target="support"/, "导航没有接入赞助区");
  assert.match(html, /赞助/, "赞助区没有标题");
});

test("四条链的地址在页面和 README 中都完整出现", () => {
  for (const [name, address] of Object.entries(ADDRESSES)) {
    assert.ok(html.includes(address), `页面缺少 ${name} 地址`);
    assert.ok(readme.includes(address), `README 缺少 ${name} 地址`);
  }
});

test("Monero 排在 BTC / BCH / ETH 前面", () => {
  const positions = ["xmr", "btc", "bch", "eth"].map((key) => html.indexOf(ADDRESSES[key]));
  assert.ok(positions.every((index) => index >= 0), "有地址没有渲染");
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, "地址顺序不是 Monero 优先");
});

test("每条地址都有对应的复制按钮", () => {
  for (const key of Object.keys(ADDRESSES)) {
    assert.match(html, new RegExp(`id="addr-${key}"`), `缺少 #addr-${key}`);
    assert.match(html, new RegExp(`data-copy-target="addr-${key}"`), `#addr-${key} 缺少复制按钮`);
  }
});

test("技术标签区新增虚拟货币分组", () => {
  const start = html.indexOf("虚拟货币");
  assert.ok(start >= 0, "缺少虚拟货币分组");
  const block = html.slice(start, html.indexOf("</div>", start));
  for (const coin of ["Monero", "Bitcoin", "Bitcoin Cash", "Ethereum"]) {
    assert.ok(block.includes(coin), `虚拟货币分组缺少 ${coin}`);
  }
});

test("赞助区使用本地 We accept Bitcoin 徽章", () => {
  assert.match(html, /assets\/we-accept-bitcoin\.svg/, "没有引用本地徽章");
  assert.ok(existsSync(join(root, "assets", "we-accept-bitcoin.svg")), "徽章文件不存在");
});
