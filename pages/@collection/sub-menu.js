/**
 * 自动生成的脚本, 包含链接数组 + 渲染逻辑
 */
(function() {
  const LINKS = [
  {
    "name": "ai搜索",
    "link": "ai-search.html",
    "desc": "网站目录索引"
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