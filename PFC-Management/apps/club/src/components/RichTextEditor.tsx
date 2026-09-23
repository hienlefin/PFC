"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

function looksLikeHtml(s: string) {
  return /<\/?[a-z][\s\S]*>/i.test(s);
}

function toEditorHtml(value: string) {
  if (!value?.trim()) return "";
  if (looksLikeHtml(value)) return value;
  return value
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

export function RichTextEditor({ value, onChange, placeholder }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: "rte-img" },
      }),
    ],
    content: toEditorHtml(value),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "rte-content",
        "data-placeholder": placeholder ?? "Viết nội dung bài đăng…",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = toEditorHtml(value);
    if (next && next !== current && !editor.isFocused) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [value, editor]);

  function insertImageUrl() {
    if (!editor) return;
    const url = window.prompt("URL ảnh (https://…)");
    if (!url?.trim()) return;
    editor.chain().focus().setImage({ src: url.trim() }).run();
  }

  function insertImageFile(file: File) {
    if (!editor || !file.type.startsWith("image/")) return;
    if (file.size > 1_800_000) {
      window.alert("Ảnh inline tối đa ~1.8MB — dùng URL thay thế.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result ?? "");
      if (src) editor.chain().focus().setImage({ src }).run();
    };
    reader.readAsDataURL(file);
  }

  if (!editor) return <div className="rte-shell muted">Đang tải editor…</div>;

  return (
    <div className="rte-shell">
      <div className="rte-toolbar" role="toolbar" aria-label="Định dạng">
        <button
          type="button"
          className={`md-tool${editor.isActive("bold") ? " active" : ""}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button
          type="button"
          className={`md-tool${editor.isActive("italic") ? " active" : ""}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className={`md-tool${editor.isActive("heading", { level: 2 }) ? " active" : ""}`}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          H
        </button>
        <button
          type="button"
          className={`md-tool${editor.isActive("bulletList") ? " active" : ""}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          •
        </button>
        <button
          type="button"
          className={`md-tool${editor.isActive("blockquote") ? " active" : ""}`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          “
        </button>
        <button
          type="button"
          className="md-tool"
          title="Chèn ảnh (URL)"
          onClick={insertImageUrl}
        >
          🖼️
        </button>
        <label className="md-tool md-tool-file" title="Tải ảnh vào bài">
          Ảnh
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) insertImageFile(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
