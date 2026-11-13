import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.AUTH_SECRET ?? "dev-secret";
const MAX_AGE_MS = 30 * 60 * 1000;

export function signPhone(phone: string): string {
  const exp = Date.now() + MAX_AGE_MS;
  const sig = createHmac("sha256", SECRET).update(`${phone}.${exp}`).digest("hex");
  return `${exp}.${sig}`;
}

export function verifyPhoneProof(phone: string, proof?: string): boolean {
  if (!proof) return false;
  const [expRaw, sig] = proof.split(".");
  const exp = Number(expRaw);
  if (!exp || !sig || Date.now() > exp) return false;
  const expected = createHmac("sha256", SECRET).update(`${phone}.${exp}`).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
