(function (root) {
  "use strict";
  // A deliberately small Markdown subset. All untrusted content becomes text nodes;
  // no HTML parsing, executable URLs, images or embedded content are supported.
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function inline(parent, text) {
    const pattern = /(`+)([^`\n]+?)\1|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;
    let offset = 0;
    for (const match of text.matchAll(pattern)) {
      parent.append(document.createTextNode(text.slice(offset, match.index)));
      parent.append(element(match[2] !== undefined ? "code" : match[3] !== undefined ? "strong" : "em",
        "", match[2] ?? match[3] ?? match[4]));
      offset = match.index + match[0].length;
    }
    parent.append(document.createTextNode(text.slice(offset)));
  }
  function renderMarkdown(text, onCopy) {
    const container = element("div", "answer-body");
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    let index = 0;
    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) { index++; continue; }
      const fence = /^\s*(`{3,}|~{3,})(.*)$/.exec(line);
      if (fence) {
        const marker = fence[1][0];
        const length = fence[1].length;
        const language = fence[2].trim();
        const codeLines = [];
        index++;
        while (index < lines.length && !new RegExp(`^\\s*${marker}{${length},}\\s*$`).test(lines[index])) {
          codeLines.push(lines[index++]);
        }
        const code = codeLines.join("\n") + (index < lines.length && codeLines.length ? "\n" : "");
        if (index < lines.length) index++;
        const block = element("div", "code-block");
        const heading = element("div", "code-heading");
        const copy = element("button", "copy-button", "复制代码");
        copy.type = "button";
        copy.addEventListener("click", () => onCopy(code, copy));
        heading.append(element("span", "", language || "代码"), copy);
        const pre = element("pre");
        pre.tabIndex = 0;
        pre.setAttribute("aria-label", `${language || "代码"}代码块`);
        pre.append(element("code", "", code));
        block.append(heading, pre);
        container.append(block);
        continue;
      }
      const heading = /^(#{1,6})\s+(.+)$/.exec(line);
      if (heading) {
        const title = element(`h${Math.min(heading[1].length + 1, 4)}`);
        inline(title, heading[2]);
        container.append(title); index++; continue;
      }
      const list = /^\s*(?:([-+*])|([0-9]+)[.)、])\s+(.+)$/.exec(line);
      if (list) {
        const ordered = Boolean(list[2]);
        const listNode = element(ordered ? "ol" : "ul");
        if (ordered) listNode.start = Number(list[2]);
        while (index < lines.length) {
          const item = /^\s*(?:([-+*])|([0-9]+)[.)、])\s+(.+)$/.exec(lines[index]);
          if (!item || Boolean(item[2]) !== ordered) break;
          const li = element("li");
          inline(li, item[3]); listNode.append(li); index++;
        }
        container.append(listNode); continue;
      }
      const paragraph = [line]; index++;
      while (index < lines.length && lines[index].trim() &&
        !/^\s*(?:`{3,}|~{3,}|#{1,6}\s|[-+*]\s|\d+[.)、]\s)/.test(lines[index])) paragraph.push(lines[index++]);
      const p = element("p"); inline(p, paragraph.join("\n")); container.append(p);
    }
    return container;
  }
  root.TeachingRender = { element, renderMarkdown };
})(globalThis);
