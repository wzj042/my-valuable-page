/**
 * 自动生成的脚本, 包含链接数组 + 渲染逻辑
 */
(function() {
  const LINKS = [
  {
    "name": "ai搜索",
    "link": "ai-search.html",
    "desc": ""
  },
  {
    "name": "概率论速成例题",
    "link": "gll-some-quiz.html",
    "desc": ""
  },
  {
    "name": "导出样式测试",
    "link": "test.html",
    "desc": ""
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