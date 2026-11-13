"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import type { ActionState } from "./types";

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!identifier || !password) return { error: "E-posta/telefon ve şifre girin." };

  try {
    await signIn("credentials", { identifier, password, redirectTo: "/panel" });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Giriş bilgileri hatalı." };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
