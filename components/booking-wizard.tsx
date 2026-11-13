"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { bookAppointment } from "@/app/actions/public";
import type { ActionState } from "@/app/actions/types";
import { formatMin, formatMoney } from "@/lib/time";
import { formatPhone } from "@/lib/phone";
import { ArrowLeft, ArrowRight, CheckCircle, Clock, Scissors, User, WhatsappLogo } from "@/components/icons";

type Service = { id: string; name: string; durationMin: number; price: number };
type Barber = { id: string; name: string; title: string | null };

const DAY_SHORT = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

function dayList(today: string, count: number): string[] {
  const base = Date.parse(today + "T00:00:00Z");
  return Array.from({ length: count }, (_, i) =>
    new Date(base + i * 86_400_000).toISOString().slice(0, 10),
  );
}

export function BookingWizard({
  services,
  barbers,
  today,
  maxDays,
  phone,
}: {
  services: Service[];
  barbers: Barber[];
  today: string;
  maxDays: number;
  phone: string;
}) {
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<number[] | null>(null);
  const [startMin, setStartMin] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(bookAppointment, {});

  const service = services.find((s) => s.id === serviceId) ?? null;
  const barber = barbers.find((b) => b.id === barberId) ?? null;
  const dates = dayList(today, Math.min(maxDays, 14));

  useEffect(() => {
    if (step !== 3 || !serviceId || !barberId) return;
    let alive = true;
    setSlots(null);
    setLoading(true);
    fetch("/api/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barberId, serviceId, date }),
    })
      .then((res) => res.json() as Promise<{ slots?: number[] }>)
      .then((data) => {
        if (alive) setSlots(data.slots ?? []);
      })
      .catch(() => {
        if (alive) setSlots([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [step, serviceId, barberId, date]);

  if (state.appointment) {
    const appt = state.appointment;
    return (
      <div className="mx-auto max-w-lg text-center">
        <CheckCircle size={52} weight="duotone" className="mx-auto text-emerald-600" aria-hidden="true" />
        <h1 className="mt-4 font-display text-4xl">Randevun hazır</h1>
        <p className="mt-2 text-muted">
          {appt.name}, {appt.dateText} · {appt.barber}
        </p>

        <div className="card mt-6 space-y-2 p-5 text-left text-sm">
          <Row label="Hizmet" value={appt.service} />
          <Row label="Usta" value={appt.barber} />
          <Row label="Saat" value={`${appt.dateText} – ${appt.endText}`} />
          <Row label="Telefon" value={formatPhone(appt.phone)} />
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <a href={`/api/ics/${appt.id}`} className="btn btn-primary">
            Takvime ekle
          </a>
          <Link href="/randevum" className="btn btn-outline">
            Randevumu gör
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted">
          Değişiklik için {phone} numarasını arayabilir veya WhatsApp&apos;tan yazabilirsiniz.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
      <aside className="space-y-3">
        <p className="kicker">Randevu</p>
        <ol className="space-y-2">
          {[
            { n: 1, label: "Hizmet", value: service?.name },
            { n: 2, label: "Usta ve saat", value: barber ? barber.name.split(" ")[0] : undefined },
            { n: 3, label: "Bilgiler", value: startMin !== null ? formatMin(startMin) : undefined },
          ].map((item) => (
            <li key={item.n} className="flex items-start gap-3">
              <span
                className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  step === item.n
                    ? "bg-ink text-cream"
                    : step > item.n
                      ? "bg-emerald-600 text-white"
                      : "bg-stone-200 text-stone-500"
                }`}
              >
                {step > item.n ? "✓" : item.n}
              </span>
              <div>
                <p className={`text-sm font-semibold ${step === item.n ? "text-ink" : "text-stone-500"}`}>
                  {item.label}
                </p>
                {item.value && <p className="text-xs text-muted">{item.value}</p>}
              </div>
            </li>
          ))}
        </ol>

        {service && (
          <div className="card mt-4 p-3 text-sm">
            <p className="flex items-center gap-1.5 font-medium">
              <Scissors size={14} weight="bold" className="text-brass" aria-hidden="true" />
              {service.name}
            </p>
            <p className="mt-1 flex items-center justify-between text-xs text-muted">
              <span className="flex items-center gap-1">
                <Clock size={12} aria-hidden="true" /> {service.durationMin} dk
              </span>
              <span className="font-semibold text-ink">{formatMoney(service.price)}</span>
            </p>
          </div>
        )}

        <a
          href={`https://wa.me/${phone.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink"
        >
          <WhatsappLogo size={14} weight="bold" aria-hidden="true" />
          Yardım için yaz
        </a>
      </aside>

      <div>
        {step === 1 && (
          <section aria-labelledby="step-service">
            <h1 id="step-service" className="font-display text-3xl">Hangi hizmet?</h1>
            <p className="mt-1 text-sm text-muted">Süre ve fiyat baştan belli.</p>

            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {services.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setServiceId(item.id);
                      setStartMin(null);
                      setBarberId(null);
                      setStep(2);
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors ${
                      serviceId === item.id
                        ? "border-ink bg-white"
                        : "border-line bg-white hover:border-stone-400"
                    }`}
                  >
                    <span>
                      <span className="block font-medium">{item.name}</span>
                      <span className="text-xs text-muted">{item.durationMin} dk</span>
                    </span>
                    <span className="flex items-center gap-2 font-semibold">
                      {formatMoney(item.price)}
                      <ArrowRight size={16} weight="bold" className="text-brass" aria-hidden="true" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="step-barber">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
            >
              <ArrowLeft size={14} weight="bold" aria-hidden="true" /> Hizmet
            </button>
            <h1 id="step-barber" className="font-display text-3xl">Kiminle?</h1>
            <p className="mt-1 text-sm text-muted">
              {service?.name} için usta seçin.
            </p>

            <ul className="mt-5 grid gap-2 sm:grid-cols-3">
              {barbers.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setBarberId(item.id);
                      setStartMin(null);
                      setStep(3);
                    }}
                    className="flex h-full w-full flex-col items-center gap-2 rounded-xl border border-line bg-white p-4 text-center transition-colors hover:border-stone-400"
                  >
                    <span className="grid size-11 place-items-center rounded-full bg-ink font-display text-xl text-brass-light">
                      {item.name.charAt(0)}
                    </span>
                    <span className="font-medium leading-tight">{item.name}</span>
                    <span className="text-xs text-muted">{item.title ?? "Berber"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {step === 3 && (
          <section aria-labelledby="step-time">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
              >
                <ArrowLeft size={14} weight="bold" aria-hidden="true" /> Usta
              </button>
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <User size={14} weight="bold" aria-hidden="true" />
                {barber?.name}
              </p>
            </div>
            <h1 id="step-time" className="mt-2 font-display text-3xl">Ne zaman?</h1>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Gün seçimi">
              {dates.map((d) => {
                const dt = new Date(d + "T00:00:00Z");
                const active = d === date;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDate(d);
                      setStartMin(null);
                    }}
                    aria-pressed={active}
                    className={`flex min-w-[3.5rem] flex-col items-center rounded-lg border px-2 py-2 text-sm transition-colors ${
                      active
                        ? "border-ink bg-ink text-cream"
                        : "border-line bg-white hover:border-stone-400"
                    }`}
                  >
                    <span className={`text-[11px] ${active ? "text-brass-light" : "text-muted"}`}>
                      {DAY_SHORT[dt.getUTCDay()]}
                    </span>
                    <span className="font-semibold">{dt.getUTCDate()}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 min-h-[12rem]">
              {loading && <p className="text-sm text-muted" role="status">Uygun saatler aranıyor…</p>}

              {!loading && slots && slots.length === 0 && (
                <div className="card p-4 text-sm">
                  <p className="font-medium">Bu gün için uygun saat yok.</p>
                  <p className="mt-1 text-muted">Başka bir gün seçin veya dükkânı arayın.</p>
                </div>
              )}

              {!loading && slots && slots.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
                  {slots.map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => setStartMin(min)}
                      aria-pressed={startMin === min}
                      className={`rounded-lg border py-2.5 text-sm font-semibold tabular-nums transition-colors ${
                        startMin === min
                          ? "border-brass bg-brass text-white"
                          : "border-line bg-white hover:border-brass"
                      }`}
                    >
                      {formatMin(min)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {startMin !== null && (
              <form action={formAction} className="card mt-5 space-y-3 p-4">
                <h2 className="font-display text-xl">
                  {formatMin(startMin)} · {service?.name}
                </h2>
                <input type="hidden" name="serviceId" value={serviceId ?? ""} />
                <input type="hidden" name="barberId" value={barberId ?? ""} />
                <input type="hidden" name="date" value={date} />
                <input type="hidden" name="startMin" value={startMin} />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="cust-name">
                      Ad soyad
                    </label>
                    <input
                      id="cust-name"
                      name="name"
                      className="field"
                      autoComplete="name"
                      placeholder="Ad Soyad"
                      required
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="cust-phone">
                      Telefon
                    </label>
                    <input
                      id="cust-phone"
                      name="phone"
                      className="field"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="0532 123 45 67"
                      required
                    />
                  </div>
                </div>

                {state.error && (
                  <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
                    {state.error}
                  </p>
                )}

                <button type="submit" className="btn btn-brass w-full" disabled={pending}>
                  {pending ? "Oluşturuluyor…" : "Randevuyu onayla"}
                  {!pending && <ArrowRight size={16} weight="bold" aria-hidden="true" />}
                </button>
                <p className="text-xs text-muted">
                  Onay için WhatsApp&apos;tan mesaj alacaksınız. İptal etmek için randevunuzu
                  sorgulayabilirsiniz.
                </p>
              </form>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line pb-2 last:border-0 last:pb-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
