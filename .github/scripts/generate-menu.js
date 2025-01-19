// generate-menu.js
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// ---------- 1) 找到所有子目录里的HTML ----------
/**
 * 假定你的子目录都在 "tools" 下面，每个子目录都有一个 index.html
 * 如果结构不一样，可自行修改。
 */
// __dirname => /home/runner/work/<repo>/<repo>/.github/scripts
// 那么两次 ../ 就能到达仓库根


// 仓库根目录 => 上两级
const repoRoot = path.join(__dirname, '..', '..');  

const baseDir = path.join(repoRoot, 'pages');

const htmlFiles = [];

function scanDir(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  files.forEach((f) => {
    const fullPath = path.join(dir, f.name);
    if (f.isDirectory()) {
      // 如果子目录里有 index.html，就直接记录下来
      const possibleIndex = path.join(fullPath, 'index.html');
      if (fs.existsSync(possibleIndex)) {
        htmlFiles.push(possibleIndex);
      }
      // 如果还要更深层次查找，可继续递归:
      // scanDir(fullPath);
    }
  });
}
scanDir(baseDir);

// ---------- 2) 解析每个HTML提取 <title> 和 <meta name="description"> ----------
const linkEntries = [];
htmlFiles.forEach((filePath) => {
  const raw = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(raw);

  // 取出 <title> 文本
  const title = $('title').text().trim() || 'Untitled';

  // 取出 <meta name="description" content="...">
  const desc = $('meta[name="description"]').attr('content') || '';

  // 生成相对链接，比如 tools/get-font-text-img/
  // 假设 filePath = /path/to/repo/tools/get-font-text-img/index.html
  // 我们要得到相对于仓库根目录的子路径 "tools/get-font-text-img/"
  const relativeDir = path
    .dirname(filePath) // => /path/to/repo/tools/get-font-text-img
    .replace(__dirname, '') // => /tools/get-font-text-img
    .replace(/^[/\\]/, ''); // => tools/get-font-text-img

  // push 到我们的数组
  linkEntries.push({
    name: title,
    link: relativeDir + '/', // 为了可以点击进目录
    desc: desc
  });
});


// ---------- 4) 生成 index.html (根目录) 的索引 ----------
const indexHtmlPath = path.join(repoRoot , 'index.html');

// 先定义一个基本模板，如果不存在就新建：
let indexHtmlTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>目录索引</title>
</head>
<body>
  <h1>索引</h1>
  <ul id="fileList"></ul>

  <!-- script, 根据数组渲染超链接列表 -->
  <script>
    const fileList = document.getElementById('fileList');
    const links = [
      // 这里用脚本插入
    ];
    links.forEach(([name, link, title]) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = link;
      a.textContent = name;
      a.title = title;
      li.appendChild(a);
      fileList.appendChild(li);
    });
  </script>
</body>
</html>
`;

if (!fs.existsSync(indexHtmlPath)) {
  fs.writeFileSync(indexHtmlPath, indexHtmlTemplate, 'utf8');
}

// 读入现有 index.html
let indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

// 找到 <script> 中的 `const links = [...]`
/**
 * 简单做法：用一个标志性正则去替换
 * 当然也可用 cheerio 操作 DOM，但涉及到动态 JS 部分时，字符串替换更直接
 */
const linksArrayStr = linkEntries
  .map((entry) => {
    // name, link, desc
    // 注意要转义内部引号
    // 获取 repo 下的相对链接
    // 如/wzj042/my-valuable-page/blob/main/home/runner/work/my-valuable-page/my-valuable-page/pages/get-font-text-img -> pages/get-font-text-img
    const relativeLink = entry.link.split('/my-valuable-page/my-valuable-page/')[1] || '';

    return `['${entry.name}', '${relativeLink}', '${entry.desc.replace(/'/g, "\\'")}']`;
  })
  .join(',\n      ');

const newScriptContent = `
    const fileList = document.getElementById('fileList');
    const links = [
      ${linksArrayStr}
    ];
    links.forEach(([name, link, title]) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = link;
      a.textContent = name;
      a.title = title;
      li.appendChild(a);
      fileList.appendChild(li);
    });
`;

// 用正则把原来的 <script> 替换掉，或在标志处插入
indexHtmlContent = indexHtmlContent.replace(
  /(<script>)([\s\S]*?)(<\/script>)/,
  `$1\n${newScriptContent}\n$3`
);

fs.writeFileSync(indexHtmlPath, indexHtmlContent, 'utf8');

console.log('index.html 已更新。');
