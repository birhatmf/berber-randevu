"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, Scissors } from "@/components/icons";
import { loginAction } from "@/app/actions/auth";
import type { ActionState } from "@/app/actions/types";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(loginAction, {});

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-ink p-12 text-cream lg:flex">
        <div className="flex items-center gap-3">
          <Scissors size={24} weight="bold" className="text-brass-light" aria-hidden="true" />
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-brass-light">
            Dükkân Berber
          </span>
        </div>
        <div>
          <h1 className="max-w-md text-5xl leading-[1.05]">
            Günün planı, <span className="text-brass-light">tek ekranda.</span>
          </h1>
          <p className="mt-6 max-w-sm text-stone-400">
            Randevuları yönet, gelmeyeni işaretle, günü kapat. Deftere gerek yok.
          </p>
        </div>
        <p className="text-xs text-stone-500">© {new Date().getFullYear()} Dükkân Berber</p>
      </section>

      <section className="flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-10 flex items-center gap-2 text-sm text-muted hover:text-ink">
            <Scissors size={18} weight="bold" aria-hidden="true" />
            Dükkân Berber
          </Link>

          <h2 className="text-4xl">Panele giriş</h2>
          <p className="mt-2 text-sm text-muted">
            Berber ve yönetici hesapları buradan giriş yapar.
          </p>

          <form action={formAction} className="mt-8 space-y-4">
            <div>
              <label className="label" htmlFor="identifier">
                E-posta veya telefon
              </label>
              <input
                id="identifier"
                name="identifier"
                className="field"
                autoComplete="username"
                placeholder="ahmet@berber.local"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Şifre
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="field"
                autoComplete="current-password"
                required
              />
            </div>

            {state.error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
                {state.error}
              </p>
            )}

            <button type="submit" className="btn btn-primary w-full" disabled={pending}>
              {pending ? "Giriş yapılıyor…" : "Giriş yap"}
              {!pending && <ArrowRight size={16} weight="bold" aria-hidden="true" />}
            </button>
          </form>

          <Link href="/" className="mt-8 inline-block text-sm text-muted underline-offset-4 hover:underline">
            ← Ana sayfaya dön
          </Link>
        </div>
      </section>
    </main>
  );
}
