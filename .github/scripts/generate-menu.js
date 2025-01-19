// .github/scripts/generate-menu.js
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// 1) 定位仓库根目录
const repoRoot = path.join(__dirname, '..', '..');
const pagesDir = path.join(repoRoot, 'pages');

// 2) 准备收集主索引的链接列表
//    [{ name, link, desc }, ...]
const mainLinks = [];

// 3) 扫描 pages/ 下所有文件和文件夹
const entries = fs.readdirSync(pagesDir, { withFileTypes: true });

// 3.1) 处理顶部(非 @ 开头)的 HTML 文件
for (const entry of entries) {
  if (entry.isFile() && entry.name.endsWith('.html')) {
    // 这是 pages/ 下的一个HTML文件
    const filePath = path.join(pagesDir, entry.name);
    const item = parseHtmlMeta(filePath, 'pages/' + entry.name);
    if (item) {
      mainLinks.push(item);
    }
  }
}

// 3.2) 处理以 @ 开头的子目录
for (const entry of entries) {
  if (entry.isDirectory() && entry.name.startsWith('@')) {
    const subDirPath = path.join(pagesDir, entry.name);
    // 生成子索引
    const subIndex = generateSubIndex(subDirPath);
    // 同时把这个子索引也加入主索引
    if (subIndex) {
      mainLinks.push({
        name: subIndex.title,
        link: `pages/${entry.name}/`,  // 目录形式
        desc: subIndex.desc || ''
      });
    }
  }
}

// ------ 生成/更新 主索引 index.html ------
const indexHtmlPath = path.join(repoRoot, 'index.html');
ensureIndexHtml(indexHtmlPath, '目录索引', 'menu.js');

// ------ 生成主索引的脚本 menu.js ------
const menuJsPath = path.join(repoRoot, 'menu.js');
generateMenuJs(menuJsPath, mainLinks);

// ------ 辅助函数们 ------

/**
 * 解析HTML文件的 <title> 和 <meta name="description">，返回 { name, link, desc }
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
 * 为以 @ 开头的目录生成子索引
 * @param {string} subDirPath 绝对路径 (例如 .../pages/@collection)
 * @return { title, desc? } 方便主索引也能用
 */
function generateSubIndex(subDirPath) {
  // 读取此目录下所有 .html
  const allFiles = fs.readdirSync(subDirPath, { withFileTypes: true });
  const childLinks = [];

  // 逐个HTML文件解析
  for (const f of allFiles) {
    if (f.isFile() && f.name.endsWith('.html')) {
      // 跳过 index.html 本身（因为我们要生成新的 index.html)
      if (f.name === 'index.html') continue;

      const filePath = path.join(subDirPath, f.name);
      const item = parseHtmlMeta(
        filePath, 
        // 相对于仓库根 => pages/@something/xxx.html
        path.relative(repoRoot, filePath).replace(/\\/g, '/')
      );
      if (item) childLinks.push(item);
    }
  }

  // 生成子索引页面 => subDirPath/index.html
  // 你也可以自定义标题/描述，这里就以“子目录名”当标题
  const dirName = path.basename(subDirPath); // 例如 @collection
  const subIndexTitle = `子索引: ${dirName}`;
  const subIndexDesc = `收录 ${dirName} 下所有HTML`;

  // 确保 index.html 存在 (或覆盖)
  const subIndexPath = path.join(subDirPath, 'index.html');
  ensureIndexHtml(subIndexPath, subIndexTitle, 'sub-menu.js');

  // 生成/更新 sub-menu.js
  const subMenuPath = path.join(subDirPath, 'sub-menu.js');
  generateMenuJs(subMenuPath, childLinks);

  return {
    title: subIndexTitle,
    desc: subIndexDesc
  };
}

/**
 * 生成或更新 "menu.js"/"sub-menu.js" 脚本文件
 * 其中包含一个全局数组 LINKS，并且自动构造 DOM。
 * @param {string} jsFilePath 
 * @param {Array<{ name:string, link:string, desc:string }>} linkEntries 
 */
function generateMenuJs(jsFilePath, linkEntries) {
  let jsContent = `
/**
 * 自动生成的脚本，包含链接列表与渲染逻辑
 */
(function(){
  const LINKS = ${JSON.stringify(linkEntries, null, 2)};
  
  window.addEventListener('DOMContentLoaded', () => {
    const fileList = document.getElementById('fileList');
    if (!fileList) return;
    
    LINKS.forEach(({name, link, desc}) => {
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
 * 确保某个 index.html 存在，且引入特定脚本(带时间戳)。
 * 如果已经存在，就更新 <title>；并确保最后有 <script src="xxx?ts=xxx"></script>
 */
function ensureIndexHtml(htmlPath, pageTitle, scriptName) {
  let content = '';
  if (!fs.existsSync(htmlPath)) {
    // 新建一个基本模板
    content = `
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
</body>
</html>
    `.trim();
  } else {
    content = fs.readFileSync(htmlPath, 'utf8');
  }

  // 用 cheerio 更新 <title> & <h1> (可选)
  const $ = cheerio.load(content);

  $('title').text(pageTitle);
  // 如果 body 里第一个 h1 存在，就改；否则插入
  const firstH1 = $('body h1').first();
  if (firstH1.length > 0) {
    firstH1.text(pageTitle);
  } else {
    $('body').prepend(`<h1>${pageTitle}</h1>`);
  }

  // 确保脚本链接存在，带时间戳
  // 形如: <script src="menu.js?ts=123456"></script>
  const ts = Date.now();
  const scriptSrcRegex = new RegExp(`${scriptName}\\?ts=\\d+`);

  let foundScript = false;
  $('script').each((i, el) => {
    const src = $(el).attr('src');
    if (src && src.includes(scriptName)) {
      // 更新时间戳
      $(el).attr('src', `${scriptName}?ts=${ts}`);
      foundScript = true;
    }
  });

  if (!foundScript) {
    // 在 body 末尾插一个 script
    $('body').append(`\n<script src="${scriptName}?ts=${ts}"></script>\n`);
  }

  fs.writeFileSync(htmlPath, $.html(), 'utf8');
  console.log(`Updated index.html => ${htmlPath}`);
}
