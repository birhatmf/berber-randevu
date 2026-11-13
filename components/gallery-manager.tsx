"use client";

import { useActionState } from "react";
import {
  addGalleryImages,
  deleteGalleryImage,
  moveGalleryImage,
} from "@/app/actions/content";
import type { ActionState } from "@/app/actions/types";
import { ArrowDown, ArrowUp, Trash } from "@/components/icons";

type GalleryItem = { id: string; url: string; alt: string };

export function GalleryManager({ images }: { images: GalleryItem[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    addGalleryImages,
    {},
  );

  return (
    <div className="space-y-6">
      <form action={formAction} className="card space-y-3 p-4">
        <h2 className="font-display text-xl">Fotoğraf ekle</h2>
        <p className="-mt-1 text-sm text-muted">
          Birden fazla seçebilirsiniz. En fazla 4 MB / fotoğraf, toplam 80 fotoğraf.
        </p>
        <input
          type="file"
          name="files"
          multiple
          accept="image/*"
          className="field file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-cream"
          required
        />
        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
        {state.ok && <p className="text-sm text-emerald-700">{state.message}</p>}
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Yükleniyor…" : "Yükle"}
        </button>
      </form>

      {images.length === 0 ? (
        <div className="card px-6 py-12 text-center text-sm text-muted">
          Galeri boş. Ana sayfanın altındaki şeritte yüklediğiniz fotoğraflar görünür.
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <li key={image.id} className="card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.alt || `Galeri ${index + 1}`}
                className="h-32 w-full object-cover"
              />
              <div className="flex items-center justify-between gap-1 p-2">
                <span className="truncate text-xs text-muted">{index + 1}. {image.alt}</span>
                <div className="flex shrink-0 gap-0.5">
                  <form action={moveGalleryImage}>
                    <input type="hidden" name="id" value={image.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      className="btn btn-ghost btn-sm px-1.5"
                      aria-label="Yukarı taşı"
                      disabled={index === 0}
                    >
                      <ArrowUp size={14} weight="bold" aria-hidden="true" />
                    </button>
                  </form>
                  <form action={moveGalleryImage}>
                    <input type="hidden" name="id" value={image.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      className="btn btn-ghost btn-sm px-1.5"
                      aria-label="Aşağı taşı"
                      disabled={index === images.length - 1}
                    >
                      <ArrowDown size={14} weight="bold" aria-hidden="true" />
                    </button>
                  </form>
                  <form action={deleteGalleryImage}>
                    <input type="hidden" name="id" value={image.id} />
                    <button className="btn btn-ghost btn-sm px-1.5 text-danger" aria-label="Sil">
                      <Trash size={14} weight="bold" aria-hidden="true" />
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
