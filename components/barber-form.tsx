"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveBarber } from "@/app/actions/panel";
import { clearBarberPhoto, uploadBarberPhoto } from "@/app/actions/content";
import type { ActionState } from "@/app/actions/types";

type Barber = {
  id: string;
  name: string;
  email: string;
  phone: string;
  title: string | null;
  bio: string | null;
  photo: string | null;
};

export function BarberForm({ barber }: { barber?: Barber }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveBarber, {});

  return (
    <form action={formAction} className="card space-y-3 p-4">
      <input type="hidden" name="id" value={barber?.id ?? ""} />
      <h2 className="font-display text-xl">{barber ? "Berberi düzenle" : "Yeni berber"}</h2>

      {barber ? (
        <PhotoField barberId={barber.id} photo={barber.photo} name={barber.name} />
      ) : (
        <p className="text-xs text-muted">Fotoğraf eklemek için önce berberi kaydedin.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="b-name">
            Ad soyad
          </label>
          <input id="b-name" name="name" className="field" defaultValue={barber?.name} required />
        </div>
        <div>
          <label className="label" htmlFor="b-title">
            Ünvan
          </label>
          <input
            id="b-title"
            name="title"
            className="field"
            defaultValue={barber?.title ?? ""}
            placeholder="Usta Berber"
          />
        </div>
        <div>
          <label className="label" htmlFor="b-email">
            E-posta (giriş)
          </label>
          <input
            id="b-email"
            name="email"
            type="email"
            className="field"
            defaultValue={barber?.email}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="b-phone">
            Telefon
          </label>
          <input
            id="b-phone"
            name="phone"
            className="field"
            inputMode="tel"
            defaultValue={barber?.phone.replace("+90", "0")}
            required
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="b-bio">
          Kısa tanıtım
        </label>
        <input
          id="b-bio"
          name="bio"
          className="field"
          defaultValue={barber?.bio ?? ""}
          placeholder="Fade ve modern kesimler."
        />
      </div>

      <div>
        <label className="label" htmlFor="b-pass">
          {barber ? "Yeni şifre (boş bırakılırsa değişmez)" : "Başlangıç şifresi"}
        </label>
        <input
          id="b-pass"
          name="password"
          type="password"
          className="field"
          autoComplete="new-password"
          placeholder={barber ? "••••••" : "en az 6 karakter"}
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.ok && <p className="text-sm text-emerald-700">{state.message}</p>}

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Kaydediliyor…" : "Kaydet"}
      </button>
    </form>
  );
}

function PhotoField({
  barberId,
  photo,
  name,
}: {
  barberId: string;
  photo: string | null;
  name: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(photo ?? "");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function upload(file: File) {
    const formData = new FormData();
    formData.set("barberId", barberId);
    formData.set("file", file);
    start(async () => {
      const result = await uploadBarberPhoto(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      setPreview(result.url ?? "");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3">
      <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-stone-100">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="font-display text-2xl text-stone-400">{name.charAt(0)}</span>
        )}
      </div>
      <div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? "Yükleniyor…" : preview ? "Fotoğrafı değiştir" : "Fotoğraf yükle"}
          </button>
          {preview && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await clearBarberPhoto(barberId);
                  setPreview("");
                  router.refresh();
                })
              }
            >
              Kaldır
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label="Berber fotoğrafı yükle"
        data-upload-key="barberPhoto"
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
