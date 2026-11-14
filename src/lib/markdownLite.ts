// محوّل Markdown خفيف لتقارير المساعدين (عناوين، قوائم، جداول، نص عريض، اقتباسات).
// يهرّب كل HTML أولاً، فهو آمن للعرض عبر dangerouslySetInnerHTML.

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function splitRow(line: string): string[] {
  let t = line.trim();
  if (t.startsWith("|")) t = t.slice(1);
  if (t.endsWith("|")) t = t.slice(0, -1);
  return t.split("|").map((c) => c.trim());
}

const isSeparator = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

export function markdownToHtml(md: string): string {
  const lines = String(md || "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  let para: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.map(inline).join("<br>")}</p>`);
      para = [];
    }
  };
  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { flushPara(); closeList(); i++; continue; }

    // جدول: سطر يبدأ بـ | وبعده سطر الفاصل
    if (trimmed.startsWith("|") && i + 1 < lines.length && isSeparator(lines[i + 1])) {
      flushPara(); closeList();
      const header = splitRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      out.push(
        '<div class="table-wrap"><table><thead><tr>' +
          header.map((h) => `<th>${inline(h)}</th>`).join("") +
          "</tr></thead><tbody>" +
          rows.map((r) => "<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>").join("") +
          "</tbody></table></div>"
      );
      continue;
    }

    const h = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushPara(); closeList();
      const level = Math.min(h[1].length + 1, 4); // # -> h2 ... (h1 محجوز لعنوان التقرير)
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++; continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmed)) { flushPara(); closeList(); out.push("<hr>"); i++; continue; }

    if (trimmed.startsWith(">")) {
      flushPara(); closeList();
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${quote.map(inline).join("<br>")}</blockquote>`);
      continue;
    }

    const ul = trimmed.match(/^[-*•]\s+(.*)$/);
    const ol = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      flushPara();
      const want = ul ? "ul" : "ol";
      if (listType !== want) { closeList(); out.push(`<${want}>`); listType = want; }
      out.push(`<li>${inline((ul || ol)![1])}</li>`);
      i++; continue;
    }

    closeList();
    para.push(trimmed);
    i++;
  }
  flushPara(); closeList();
  return out.join("\n");
}