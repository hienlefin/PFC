/** Lightweight markdown → safe HTML (no HTML pass-through). */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineFormat(text: string): string {
  let s = escapeHtml(text);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt, url) => {
    const safe = String(url).startsWith("http") || String(url).startsWith("data:image/")
      ? String(url)
      : "#";
    return `<img src="${escapeHtml(safe)}" alt="${escapeHtml(alt)}" class="md-img" />`;
  });
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  return s;
}

export function renderMarkdown(md: string): string {
  const lines = (md || "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  };

  while (i < lines.length) {
    const line = lines[i]!;
    if (/^###\s+/.test(line)) {
      closeLists();
      out.push(`<h3>${inlineFormat(line.replace(/^###\s+/, ""))}</h3>`);
    } else if (/^##\s+/.test(line)) {
      closeLists();
      out.push(`<h2>${inlineFormat(line.replace(/^##\s+/, ""))}</h2>`);
    } else if (/^#\s+/.test(line)) {
      closeLists();
      out.push(`<h1>${inlineFormat(line.replace(/^#\s+/, ""))}</h1>`);
    } else if (/^>\s?/.test(line)) {
      closeLists();
      out.push(`<blockquote>${inlineFormat(line.replace(/^>\s?/, ""))}</blockquote>`);
    } else if (/^[-*]\s+/.test(line)) {
      if (!inUl) {
        closeLists();
        out.push("<ul>");
        inUl = true;
      }
      out.push(`<li>${inlineFormat(line.replace(/^[-*]\s+/, ""))}</li>`);
    } else if (/^\d+\.\s+/.test(line)) {
      if (!inOl) {
        closeLists();
        out.push("<ol>");
        inOl = true;
      }
      out.push(`<li>${inlineFormat(line.replace(/^\d+\.\s+/, ""))}</li>`);
    } else if (line.trim() === "") {
      closeLists();
      out.push("");
    } else {
      closeLists();
      out.push(`<p>${inlineFormat(line)}</p>`);
    }
    i += 1;
  }
  closeLists();
  return out.filter(Boolean).join("\n");
}

/** YouTube / Vimeo / TikTok → embeddable iframe src, or null. */
export function videoEmbedSrc(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (u.endsWith(".mp4") || u.startsWith("blob:") || u.startsWith("data:video")) {
    return null; // handled as <video>
  }
  const yt =
    u.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
    ) ?? null;
  if (yt?.[1]) return `https://www.youtube.com/embed/${yt[1]}`;
  const vim = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vim?.[1]) return `https://player.vimeo.com/video/${vim[1]}`;
  const tt = u.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (tt?.[1]) return `https://www.tiktok.com/embed/v2/${tt[1]}`;
  return null;
}

export function isDirectVideo(url: string | null | undefined): boolean {
  if (!url) return false;
  return (
    url.endsWith(".mp4") ||
    url.startsWith("blob:") ||
    url.startsWith("data:video")
  );
}
