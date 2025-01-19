/**
 * 自动生成的脚本, 包含链接数组 + 渲染逻辑
 */
(function() {
  const LINKS = [
  {
    "name": "子索引: @collection",
    "link": "pages/@collection/",
    "desc": "收录 @collection 下所有HTML"
  },
  {
    "name": "透明背景 PNG 文本生成器",
    "link": "pages/get-font-text-img/index.html",
    "desc": "个人用于生成像素字体"
  }
];
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