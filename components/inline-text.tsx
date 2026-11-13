"use client";

import { useEffect, useState, useTransition, type ElementType } from "react";
import { useRouter } from "next/navigation";
import { updateContent } from "@/app/actions/content";

export function InlineText({
  k,
  value,
  editable,
  as = "span",
  className = "",
  multiline = false,
  label,
}: {
  k: string;
  value: string;
  editable: boolean;
  as?: ElementType;
  className?: string;
  multiline?: boolean;
  label?: string;
}) {
  const Tag = as as ElementType;
  if (!editable) return <Tag className={className}>{value}</Tag>;
  return (
    <EditableText
      k={k}
      value={value}
      as={Tag}
      className={className}
      multiline={multiline}
      label={label}
    />
  );
}

function EditableText({
  k,
  value,
  as: Tag,
  className,
  multiline,
  label,
}: {
  k: string;
  value: string;
  as: ElementType;
  className: string;
  multiline: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  useEffect(() => {
    if (open) {
      setDraft(value);
      setError(undefined);
    }
  }, [open, value]);

  function save() {
    start(async () => {
      const result = await updateContent(k, draft);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Tag
        role="button"
        tabIndex={0}
        title={`Düzenle: ${label ?? k}`}
        onClick={(event: React.MouseEvent) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        onKeyDown={(event: React.KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={`${className} cursor-pointer rounded-sm outline-dashed outline-1 outline-offset-4 outline-brass/50 transition-colors hover:bg-brass-light/20`}
      >
        {value || (
          <span className="text-sm font-sans font-semibold uppercase tracking-[0.24em] opacity-60">
            {label ?? "Metin ekle"}
          </span>
        )}
      </Tag>

      {open && (
        <span
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/50 p-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <span
            className="block w-full max-w-md rounded-xl bg-white p-5 text-left shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={label ?? "Metni düzenle"}
          >
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
              {label ?? "Metni düzenle"}
            </span>

            {multiline ? (
              <textarea
                autoFocus
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={4}
                className="field mt-2 resize-y"
              />
            ) : (
              <input
                autoFocus
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") save();
                }}
                className="field mt-2"
              />
            )}

            {error && <span className="mt-2 block text-sm text-danger">{error}</span>}

            <span className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setOpen(false)}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={save}
                disabled={pending}
              >
                {pending ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </span>
          </span>
        </span>
      )}
    </>
  );
}
