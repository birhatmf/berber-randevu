import assert from "node:assert/strict";
import { computeSlots } from "./slots";
import { dateKey, localDateTime, minutesOfDay } from "./time";

const now = new Date("2026-11-03T08:00:00Z"); // 11:00 İstanbul
const base = {
  durationMin: 30,
  stepMin: 15,
  dateStr: "2026-11-04",
  now,
  minLeadMin: 120,
  maxDays: 60,
};
const segments = [
  { startMin: 540, endMin: 780 }, // 09:00-13:00
  { startMin: 810, endMin: 1200 }, // 13:30-20:00
];

// boş gün
assert.equal(computeSlots({ ...base, segments, busy: [] }).length, 40);
assert.equal(computeSlots({ ...base, segments, busy: [] })[0], 540);

// dolu randevu slotu kapatıyor
const busy = [{ startMin: 600, endMin: 630 }];
const slots = computeSlots({ ...base, segments, busy });
assert.ok(!slots.includes(600));
assert.ok(!slots.includes(585)); // 15 dk önce başlayan 30 dk'lık randevu çakışır
assert.ok(slots.includes(570));
assert.ok(slots.includes(630)); // bitişik randevu serbest

// hizmet kapanışa sığmıyorsa son slot yok
const long = computeSlots({ ...base, segments, busy: [], durationMin: 60 });
assert.ok(long.includes(1140)); // 19:00 + 60dk = 20:00 sınır, sığar
assert.ok(!long.includes(1155)); // 19:15 + 60dk kapanışı aşar
assert.ok(!long.includes(765)); // mola öncesi sığmaz (13:00 sınırı)

// izin günü
assert.deepEqual(computeSlots({ ...base, segments: [], busy: [] }), []);

// minimum süre: bugün 11:00, 120 dk lead → 13:00'ten önce slot yok
const today = computeSlots({ ...base, dateStr: "2026-11-03", segments, busy: [] });
assert.ok(today.every((s) => s >= 780));

// geçmiş gün
assert.deepEqual(computeSlots({ ...base, dateStr: "2026-11-02", segments, busy: [] }), []);

// 60 günden uzak
assert.deepEqual(computeSlots({ ...base, dateStr: "2027-01-05", segments, busy: [] }), []);

// zaman yardımcıları
assert.equal(dateKey(new Date("2026-11-03T22:30:00Z")), "2026-11-04");
assert.equal(minutesOfDay(localDateTime("2026-11-04", 555)), 555);
assert.equal(localDateTime("2026-11-04", 555).toISOString(), "2026-11-04T06:15:00.000Z");

console.log("slots.test.ts: tüm kontroller geçti");
