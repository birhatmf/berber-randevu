import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PasswordForm } from "@/components/password-form";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Hesap</p>
        <h1 className="font-display text-3xl">Hesabım</h1>
        <p className="mt-1 text-sm text-muted">
          Giriş bilgilerinizi görün ve şifrenizi değiştirin.
        </p>
      </div>

      <div className="card max-w-md space-y-1 p-4 text-sm">
        <p>
          <span className="text-muted">Ad soyad: </span>
          {user.name}
        </p>
        <p>
          <span className="text-muted">E-posta: </span>
          {user.email}
        </p>
        <p>
          <span className="text-muted">Rol: </span>
          {user.role === "admin" ? "Yönetici" : "Berber"}
        </p>
      </div>

      <PasswordForm />
    </div>
  );
}
