// .github/scripts/generate-menu.js
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// 1) 仓库根目录
const repoRoot = path.join(__dirname, '..', '..');
const pagesDir = path.join(repoRoot, 'pages');

// 2) 主索引的链接列表
const mainLinks = [];

// 如果 pages/ 不存在就退出
if (!fs.existsSync(pagesDir)) {
  console.log('[Warn] pages/ 目录不存在，脚本跳过。');
  process.exit(0);
}

// 3) 收集pages/根下的 .html 文件 -> mainLinks
const topEntries = fs.readdirSync(pagesDir, { withFileTypes: true });

// 3.1) 顶层 .html 文件
for (const entry of topEntries) {
  if (entry.isFile() && entry.name.endsWith('.html')) {
    // e.g. pages/demo.html
    const filePath = path.join(pagesDir, entry.name);
    const linkRel = `pages/${entry.name}`; // 相对于仓库根
    const item = parseHtmlMeta(filePath, linkRel);
    if (item) {
      mainLinks.push(item);
    }
  }
}

// 3.2) 顶层子目录
for (const entry of topEntries) {
  if (entry.isDirectory()) {
    const subDirName = entry.name; // 例如 "xxxx" 或 "@collection"
    const subDirPath = path.join(pagesDir, subDirName);

    // 如果以 '@' 开头 => 生成子索引
    if (subDirName.startsWith('@')) {
      const subIndexInfo = generateSubIndex(subDirPath);
      if (subIndexInfo) {
        // 把子索引当一条链接加到主索引
        mainLinks.push({
          name: subIndexInfo.title,       // "子索引: @xxx"
          link: `pages/${subDirName}/`,   // 目录链接
          desc: subIndexInfo.desc
        });
      }
    } else {
      // 否则(非@开头)，只查看该目录下的 index.html
      const possibleIndex = path.join(subDirPath, 'index.html');
      if (fs.existsSync(possibleIndex)) {
        // 在主索引里加一条（名字取其 <title>，链接: pages/xxxx/index.html）
        const linkRel = path.relative(repoRoot, possibleIndex).replace(/\\/g, '/');
        const item = parseHtmlMeta(possibleIndex, linkRel);
        if (item) {
          mainLinks.push(item);
        }
      }
    }
  }
}

// 4) 覆盖生成“主索引” (仓库根) index.html
const indexHtmlPath = path.join(repoRoot, 'index.html');
ensureIndexHtml(indexHtmlPath, '目录索引', 'menu.js');

// 5) 覆盖生成“主索引”脚本 menu.js
const menuJsPath = path.join(repoRoot, 'menu.js');
generateMenuJs(menuJsPath, mainLinks);

// ----------------- 辅助函数们 -----------------

/**
 * 从HTML读取 <title>, <meta name="description">，返回 { name, link, desc }
 */
function parseHtmlMeta(filePath, relativeLink) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(raw);

  const title = $('title').text().trim() || path.basename(filePath);
  const desc = $('meta[name="description"]').attr('content') || '';

  return { name: title, link: relativeLink, desc };
}

/**
 * 生成子索引 (index.html + sub-menu.js) for `@xxx` 文件夹
 * 并收录该文件夹下所有 .html(排除本身的 index.html) 到 childLinks。
 * 返回 { title, desc } 供主索引使用。
 */
function generateSubIndex(subDirPath) {
  const allFiles = fs.readdirSync(subDirPath, { withFileTypes: true });
  const childLinks = [];

  for (const f of allFiles) {
    if (f.isFile() && f.name.endsWith('.html')) {
      // 跳过本子目录的index.html(避免自我链接套娃)
      if (f.name === 'index.html') {
        continue;
      }
      const filePath = path.join(subDirPath, f.name);
      
      // 注意为当前文件的相对目录而不是仓库的
      // 如当前位置为 pages/@collection/index.html, 其索引的应该不包含相同的pages/@collection/路由
      const linkRel = path.relative(subDirPath, filePath).replace(/\\/g, '/');
      // const linkRel = path.relative(repoRoot, filePath).replace(/\\/g, '/');
      const item = parseHtmlMeta(filePath, linkRel);
      if (item) childLinks.push(item);

    }
  }

  // 子索引标题，如 "子索引: @collection"
  const dirName = path.basename(subDirPath);
  const subIndexTitle = `子索引: ${dirName}`;
  const subIndexDesc = `收录 ${dirName} 下所有HTML`;

  // 生成/覆盖 subDirPath/index.html
  const subIndexPath = path.join(subDirPath, 'index.html');
  ensureIndexHtml(subIndexPath, subIndexTitle, 'sub-menu.js');

  // 生成/覆盖 subDirPath/sub-menu.js
  const subMenuPath = path.join(subDirPath, 'sub-menu.js');
  generateMenuJs(subMenuPath, childLinks);

  return {
    title: subIndexTitle,
    desc: subIndexDesc
  };
}

/**
 * 覆盖生成 JS (menu.js 或 sub-menu.js)，内含链接数组与渲染
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
 * 覆盖(或新建) index.html：基本结构 + 时间戳脚本
 */
function ensureIndexHtml(htmlPath, pageTitle, scriptName) {
  const ts = new Date().getTime();
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
