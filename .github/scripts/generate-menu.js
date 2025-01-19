// .github/scripts/generate-menu.js
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// 1) 定位仓库根目录
const repoRoot = path.join(__dirname, '..', '..');
const pagesDir = path.join(repoRoot, 'pages');

// 2) 准备收集主索引的链接列表: [{ name, link, desc }, ...]
const mainLinks = [];

// 3) 扫描 pages/ 下所有文件和文件夹
if (!fs.existsSync(pagesDir)) {
  console.log('[Warn] pages/ 目录不存在，脚本跳过。');
  process.exit(0); // 或者直接退出
}

// 3.1) 读取根层级下的条目
const entries = fs.readdirSync(pagesDir, { withFileTypes: true });

// 3.2) 处理顶层(非 @ 开头)的 .html 文件
for (const entry of entries) {
  if (entry.isFile() && entry.name.endsWith('.html')) {
    // 例: pages/demo.html
    const filePath = path.join(pagesDir, entry.name);
    const item = parseHtmlMeta(filePath, 'pages/' + entry.name);
    if (item) {
      mainLinks.push(item);
    }
  }
}

// 3.3) 处理以 @ 开头的子目录
for (const entry of entries) {
  if (entry.isDirectory() && entry.name.startsWith('@')) {
    const subDirPath = path.join(pagesDir, entry.name);
    const subIndexInfo = generateSubIndex(subDirPath);
    if (subIndexInfo) {
      // 将子目录索引也加入主索引
      mainLinks.push({
        name: subIndexInfo.title,
        link: `pages/${entry.name}/`,
        desc: subIndexInfo.desc
      });
    }
  }
}

// 4) 生成/更新主索引 (根目录) index.html
const indexHtmlPath = path.join(repoRoot, 'index.html');
ensureIndexHtml(indexHtmlPath, '目录索引', 'menu.js');

// 5) 生成/更新主索引脚本 menu.js
const menuJsPath = path.join(repoRoot, 'menu.js');
generateMenuJs(menuJsPath, mainLinks);

// ------ 辅助函数们 ------

/**
 * 解析HTML文件的 <title> 与 <meta name="description">，返回 { name, link, desc }
 * @param {string} filePath 绝对路径
 * @param {string} relativeLink 相对于仓库根的链接
 */
function parseHtmlMeta(filePath, relativeLink) {
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(raw);

  const title = $('title').text().trim() || path.basename(filePath);
  const desc = $('meta[name="description"]').attr('content') || '';

  return {
    name: title,
    link: relativeLink,
    desc
  };
}

/**
 * 为 @ 开头的子目录生成子索引 index.html 和 sub-menu.js
 * @param {string} subDirPath 绝对路径 (e.g. /.../pages/@collection)
 * @return { title, desc } 用于在主索引中引用
 */
function generateSubIndex(subDirPath) {
  if (!fs.existsSync(subDirPath)) return null;

  const allFiles = fs.readdirSync(subDirPath, { withFileTypes: true });
  const childLinks = [];

  // 收集所有 .html (排除自带 index.html）
  for (const f of allFiles) {
    if (f.isFile() && f.name.endsWith('.html')) {
      // if (f.name === 'index.html') continue;

      const filePath = path.join(subDirPath, f.name);
      const linkRel = path.relative(repoRoot, filePath).replace(/\\/g, '/');
      const item = parseHtmlMeta(filePath, linkRel);
      if (item) childLinks.push(item);
    }
  }

  // 目录名 (带@)
  const dirName = path.basename(subDirPath);
  // 例如: "子索引: @collection"
  const subIndexTitle = `子索引: ${dirName}`;
  const subIndexDesc = `收录 ${dirName} 下所有HTML`;

  // 覆盖生成 index.html
  const subIndexPath = path.join(subDirPath, 'index.html');
  ensureIndexHtml(subIndexPath, subIndexTitle, 'sub-menu.js');

  // 覆盖生成 sub-menu.js
  const subMenuPath = path.join(subDirPath, 'sub-menu.js');
  generateMenuJs(subMenuPath, childLinks);

  return {
    title: subIndexTitle,
    desc: subIndexDesc
  };
}

/**
 * 覆盖生成 JS 文件 (menu.js / sub-menu.js)，包含渲染逻辑
 * @param {string} jsFilePath 
 * @param {Array<{ name:string, link:string, desc:string }>} linkEntries 
 */
function generateMenuJs(jsFilePath, linkEntries) {
  const jsContent = `
/**
 * 自动生成的脚本, 包含链接数组 + 渲染逻辑
 */
(function() {
  const LINKS = ${JSON.stringify(linkEntries, null, 2)};
  window.addEventListener('DOMContentLoaded', () => {
    const fileList = document.getElementById('fileList');
    if (!fileList) return;
    LINKS.forEach(({ name, link, desc }) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = link;
      a.textContent = name;
      a.title = desc;
      li.appendChild(a);
      fileList.appendChild(li);
    });
  });
})();
`.trim();

  fs.writeFileSync(jsFilePath, jsContent, 'utf8');
  console.log(`Generated script: ${jsFilePath}`);
}

/**
 * 覆盖(或新建)一个 index.html
 * 内容是固定模板 + 时间戳脚本，原文件会被直接覆盖
 */
function ensureIndexHtml(htmlPath, pageTitle, scriptName) {
  const ts = new Date(); // 时间戳

  // 直接覆盖式写入
  const template = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
</head>
<body>
  <h1>${pageTitle}</h1>
  <ul id="fileList"></ul>
  <!-- 引入脚本, 带时间戳避免缓存 -->
  <script src="${scriptName}?ts=${ts}"></script>
</body>
</html>
`.trim();

  fs.writeFileSync(htmlPath, template, 'utf8');
  console.log(`(Re)Generated index.html => ${htmlPath}`);
}
