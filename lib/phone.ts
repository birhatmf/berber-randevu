export function normalizePhone(input: string): string | null {
  const digits = (input ?? "").replace(/\D/g, "");
  let n = digits;
  if (n.startsWith("90") && n.length === 12) n = n.slice(2);
  if (n.startsWith("0") && n.length === 11) n = n.slice(1);
  if (n.length !== 10 || !n.startsWith("5")) return null;
  return "+90" + n;
}

export function formatPhone(phone: string): string {
  const n = phone.replace(/\D/g, "").replace(/^90/, "");
  if (n.length !== 10) return phone;
  return `0${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 8)} ${n.slice(8, 10)}`;
}

export function whatsappLink(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}
