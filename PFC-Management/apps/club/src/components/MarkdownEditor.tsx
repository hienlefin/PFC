"use client";

import { useRef } from "react";
import {
  isDirectVideo,
  renderMarkdown,
  videoEmbedSrc,
} from "@/lib/markdown";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
};

function wrapSelection(
  el: HTMLTextAreaElement,
  before: string,
  after: string,
  value: string,
  onChange: (v: string) => void,
) {
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const selected = value.slice(start, end) || "text";
  const next =
    value.slice(0, start) + before + selected + after + value.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(
      start + before.length,
      start + before.length + selected.length,
    );
  });
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 10,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function tool(before: string, after = "") {
    const el = ref.current;
    if (!el) return;
    wrapSelection(el, before, after, value, onChange);
  }

  function insertImage(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 1_500_000) {
      onChange(value + `\n\n![ảnh](https://placehold.co/800x450?text=Cover)\n`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      onChange(value + `\n\n![${file.name}](${dataUrl})\n`);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="md-editor">
      <div className="md-toolbar" role="toolbar" aria-label="Định dạng">
        <button type="button" className="md-tool" onClick={() => tool("**", "**")}>
          B
        </button>
        <button type="button" className="md-tool" onClick={() => tool("*", "*")}>
          <em>I</em>
        </button>
        <button type="button" className="md-tool" onClick={() => tool("## ")}>
          H
        </button>
        <button type="button" className="md-tool" onClick={() => tool("- ")}>
          •
        </button>
        <button type="button" className="md-tool" onClick={() => tool("> ")}>
          “
        </button>
        <label className="md-tool md-tool-file">
          Ảnh
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) insertImage(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <textarea
        ref={ref}
        className="field md-textarea"
        rows={rows}
        value={value}
        placeholder={placeholder ?? "Viết nội dung bài đăng…"}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function MarkdownPreview({
  bodyMd,
  videoUrl,
}: {
  bodyMd: string;
  videoUrl?: string | null;
}) {
  const embed = videoEmbedSrc(videoUrl);
  const direct = isDirectVideo(videoUrl);
  return (
    <div className="md-preview">
      {embed && (
        <div className="video-embed">
          <iframe
            src={embed}
            title="Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      {direct && videoUrl && (
        <video className="video-direct" src={videoUrl} controls playsInline />
      )}
      <div
        className="md-body"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(bodyMd) }}
      />
    </div>
  );
}
