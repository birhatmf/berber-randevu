"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { clearSettingImage, uploadSettingImage } from "@/app/actions/content";

export function InlineImage({
  k,
  src,
  alt,
  editable,
  label,
  className = "",
  imgClassName = "h-full w-full object-cover",
  fallback,
  compact = false,
}: {
  k: string;
  src: string;
  alt: string;
  editable: boolean;
  label: string;
  className?: string;
  imgClassName?: string;
  fallback?: ReactNode;
  compact?: boolean;
}) {
  if (!editable) {
    if (!src) return <>{fallback ?? null}</>;
    return (
      <div className={className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={imgClassName} />
      </div>
    );
  }
  return (
    <InlineImageEditor
      k={k}
      src={src}
      alt={alt}
      label={label}
      className={className}
      imgClassName={imgClassName}
      fallback={fallback}
      compact={compact}
    />
  );
}

function InlineImageEditor({
  k,
  src,
  alt,
  label,
  className,
  imgClassName,
  fallback,
  compact,
}: {
  k: string;
  src: string;
  alt: string;
  label: string;
  className: string;
  imgClassName: string;
  fallback?: ReactNode;
  compact: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function upload(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    start(async () => {
      const result = await uploadSettingImage(k, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      router.refresh();
    });
  }

  return (
    <div className={`${className} group`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className={imgClassName} />
      ) : compact ? (
        <span className="grid h-full w-full place-items-center rounded border border-dashed border-brass/60 bg-brass-light/10 text-brass">
          {fallback ?? "+"}
        </span>
      ) : (
        <span className="block h-full w-full rounded border border-dashed border-brass/40 bg-brass-light/5" />
      )}

      <div
        className={
          compact
            ? "absolute -bottom-1 -right-1 z-10"
            : "absolute bottom-2 right-2 z-10 flex gap-1"
        }
      >
        {src && !compact && (
          <button
            type="button"
            className="rounded-md bg-white/90 px-2 py-1 text-[11px] font-semibold text-ink shadow"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await clearSettingImage(k);
                router.refresh();
              })
            }
          >
            Kaldır
          </button>
        )}
        <button
          type="button"
          title={label}
          className={
            compact
              ? "grid size-4 place-items-center rounded-full bg-brass text-[10px] font-bold leading-none text-white shadow"
              : "rounded-md bg-ink/85 px-2 py-1 text-[11px] font-semibold text-cream shadow"
          }
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? "…" : compact ? "+" : src ? `${label} değiştir` : `${label} ekle`}
        </button>
      </div>

      {error && (
        <p className="absolute bottom-11 right-2 z-10 rounded bg-white px-2 py-1 text-[11px] text-danger shadow">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label={`${label} yükle`}
        data-upload-key={k}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) upload(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
