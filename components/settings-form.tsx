"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSettings } from "@/app/actions/panel";
import { clearSettingImage, uploadSettingImage } from "@/app/actions/content";
import type { ActionState } from "@/app/actions/types";
import { groupFields, type Field, type Settings } from "@/lib/settings";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveSettings, {});
  const groups = groupFields();

  return (
    <form action={formAction} className="space-y-5">
      <div className="sticky top-0 z-20 flex items-center gap-3 rounded-xl border border-line bg-white/95 p-3 shadow-sm backdrop-blur">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Kaydediliyor…" : "Tümünü kaydet"}
        </button>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.ok && <p className="text-sm text-emerald-700">{state.message}</p>}
      </div>

      {groups.map((group) => (
        <section key={group.name} className="card p-5">
          <h2 className="font-display text-xl">{group.name}</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {group.fields.map((field) =>
              field.type === "image" || field.type === "video" ? (
                <MediaField key={field.key} field={field} value={settings[field.key]} />
              ) : (
                <FieldInput key={field.key} field={field} value={settings[field.key]} />
              ),
            )}
          </div>
        </section>
      ))}
    </form>
  );
}

function FieldInput({ field, value }: { field: Field; value: string }) {
  const wide = field.type === "textarea" || field.key === "address";
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="label" htmlFor={`set-${field.key}`}>
        {field.label}
      </label>
      {field.type === "textarea" ? (
        <textarea
          id={`set-${field.key}`}
          name={field.key}
          defaultValue={value}
          rows={3}
          className="field resize-y"
        />
      ) : (
        <input
          id={`set-${field.key}`}
          name={field.key}
          type={field.type === "number" ? "number" : field.type === "url" ? "url" : "text"}
          defaultValue={value}
          className="field"
        />
      )}
      {field.hint && <p className="mt-1 text-xs text-muted">{field.hint}</p>}
    </div>
  );
}

function MediaField({ field, value }: { field: Field; value: string }) {
  const isVideo = field.type === "video";
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState(value);

  function upload(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    start(async () => {
      const result = await uploadSettingImage(field.key, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      setPreview(result.url ?? "");
      router.refresh();
    });
  }

  function remove() {
    start(async () => {
      await clearSettingImage(field.key);
      setPreview("");
      router.refresh();
    });
  }

  return (
    <div className="sm:col-span-2">
      <p className="label">{field.label}</p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid h-20 w-32 place-items-center overflow-hidden rounded-lg border border-dashed border-line bg-stone-50">
          {preview ? (
            isVideo ? (
              <video src={preview} muted loop playsInline className="h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={field.label} className="h-full w-full object-cover" />
            )
          ) : (
            <span className="text-xs text-muted">{isVideo ? "Video yok" : "Görsel yok"}</span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? "Yükleniyor…" : preview ? "Değiştir" : "Yükle"}
          </button>
          {preview && (
            <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={remove}>
              Kaldır
            </button>
          )}
        </div>
      </div>
      {field.hint && <p className="mt-1 text-xs text-muted">{field.hint}</p>}
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={isVideo ? "video/mp4,video/webm" : "image/*"}
        data-upload-key={field.key}
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
