/**
 * 自动生成的脚本, 包含链接数组 + 渲染逻辑
 */
(function() {
  const LINKS = [
  {
    "name": "子索引: @collection",
    "link": "pages/@collection/",
    "desc": "收录 @collection 下所有HTML"
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