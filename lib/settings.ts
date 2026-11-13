import { db } from "./db";

export const DEFAULTS = {
  // Marka
  shopName: "Dükkân Berber",
  tagline: "Klasik ustura, modern kesim.",
  faviconImage: "",

  // Hero
  heroVideo: "",
  heroImage: "",
  heroEyebrow: "",
  heroSubtitle: "Randevunu 30 saniyede al, beklemeden koltuğa otur.",
  heroPrimaryCta: "Randevu al",
  heroSecondaryCta: "Randevumu bul",
  availabilityTitle: "Bugünün durumu",

  // Bölümler
  servicesKicker: "Hizmetler",
  servicesTitle: "Fiyat listesi",
  barbersKicker: "Ustalar",
  barbersTitle: "Koltuğuna kim oturuyor?",
  step1Title: "Hizmeti seç",
  step1Text: "Saç, sakal ya da ikisi. Süre ve fiyat baştan belli.",
  step2Title: "Saatini seç",
  step2Text: "Sadece gerçekten boş olan saatler listelenir.",
  step3Title: "Adını yaz",
  step3Text: "Telefonunu bırak, randevun anında onaylanır.",
  ctaTitle: "Koltuğun hazır.",
  ctaText: "Birkaç dokunuş, gerisi bizde.",
  ctaButton: "Randevu al",

  // İletişim
  phone: "0555 000 00 00",
  address: "Merkez Mah. Ustura Sok. No: 1",
  instagram: "",
  mapsUrl: "",

  // Randevu kuralları
  slotStep: "15",
  minLeadMin: "120",
  maxDays: "60",
} as const;

export type Settings = Record<keyof typeof DEFAULTS, string>;
export type SettingKey = keyof typeof DEFAULTS;

export type FieldType = "text" | "textarea" | "number" | "url" | "image" | "video";

export type Field = {
  key: SettingKey;
  label: string;
  group: string;
  type?: FieldType;
  hint?: string;
};

export const FIELDS: Field[] = [
  { key: "shopName", label: "Firma adı", group: "Marka" },
  { key: "tagline", label: "Slogan", group: "Marka" },
  { key: "faviconImage", label: "Favicon (sekme ikonu)", group: "Marka", type: "image", hint: "Kare PNG önerilir (ör. 64×64). Boşsa varsayılan ikon kullanılır." },

  { key: "heroVideo", label: "Hero videosu (mp4)", group: "Ana ekran", type: "video", hint: "Sessiz, döngüde oynar. 720p mp4 önerilir, en fazla 20 MB." },
  { key: "heroImage", label: "Hero kapak fotoğrafı", group: "Ana ekran", type: "image", hint: "Video yokken arka plan olur; video varsa ilk kare olarak gösterilir." },
  { key: "heroEyebrow", label: "Üst satır", group: "Ana ekran", hint: "Boş bırakılırsa gün ve adres yazılır." },
  { key: "heroSubtitle", label: "Açıklama", group: "Ana ekran", type: "textarea" },
  { key: "heroPrimaryCta", label: "Ana buton", group: "Ana ekran" },
  { key: "heroSecondaryCta", label: "İkincil buton", group: "Ana ekran" },
  { key: "availabilityTitle", label: "Müsaitlik kartı başlığı", group: "Ana ekran" },

  { key: "servicesKicker", label: "Hizmetler üst başlık", group: "Bölümler" },
  { key: "servicesTitle", label: "Hizmetler başlık", group: "Bölümler" },
  { key: "barbersKicker", label: "Ustalar üst başlık", group: "Bölümler" },
  { key: "barbersTitle", label: "Ustalar başlık", group: "Bölümler" },
  { key: "step1Title", label: "1. adım başlık", group: "Adımlar" },
  { key: "step1Text", label: "1. adım açıklama", group: "Adımlar", type: "textarea" },
  { key: "step2Title", label: "2. adım başlık", group: "Adımlar" },
  { key: "step2Text", label: "2. adım açıklama", group: "Adımlar", type: "textarea" },
  { key: "step3Title", label: "3. adım başlık", group: "Adımlar" },
  { key: "step3Text", label: "3. adım açıklama", group: "Adımlar", type: "textarea" },
  { key: "ctaTitle", label: "Alt CTA başlık", group: "Bölümler" },
  { key: "ctaText", label: "Alt CTA açıklama", group: "Bölümler", type: "textarea" },
  { key: "ctaButton", label: "Alt CTA buton", group: "Bölümler" },

  { key: "phone", label: "Telefon", group: "İletişim" },
  { key: "address", label: "Adres", group: "İletişim" },
  { key: "instagram", label: "Instagram kullanıcı adı", group: "İletişim" },
  { key: "mapsUrl", label: "Harita linki", group: "İletişim", type: "url" },

  { key: "slotStep", label: "Slot aralığı (dk)", group: "Randevu kuralları", type: "number", hint: "Randevu saatleri kaç dakikada bir başlasın" },
  { key: "minLeadMin", label: "Minimum ön süre (dk)", group: "Randevu kuralları", type: "number", hint: "En erken kaç dakika sonrası için randevu alınabilir" },
  { key: "maxDays", label: "Maksimum ileri gün", group: "Randevu kuralları", type: "number", hint: "Kaç gün sonrasına kadar randevu alınabilir" },
];

export const IMAGE_KEYS: SettingKey[] = ["heroImage", "faviconImage"];
export const VIDEO_KEYS: SettingKey[] = ["heroVideo"];
export const MEDIA_KEYS: SettingKey[] = [...IMAGE_KEYS, ...VIDEO_KEYS];

export function isSettingKey(key: string): key is SettingKey {
  return Object.prototype.hasOwnProperty.call(DEFAULTS, key);
}

export async function getSettings(): Promise<Settings> {
  const rows = await db.setting.findMany();
  const map: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) {
    if (isSettingKey(row.key)) map[row.key] = row.value;
  }
  return map as Settings;
}

export async function getNumbers() {
  const s = await getSettings();
  return {
    slotStep: Math.max(5, Number(s.slotStep) || 15),
    minLeadMin: Math.max(0, Number(s.minLeadMin) || 0),
    maxDays: Math.max(1, Number(s.maxDays) || 60),
  };
}

export function groupFields(fields: Field[] = FIELDS) {
  const groups: { name: string; fields: Field[] }[] = [];
  for (const field of fields) {
    const existing = groups.find((g) => g.name === field.group);
    if (existing) existing.fields.push(field);
    else groups.push({ name: field.group, fields: [field] });
  }
  return groups;
}
