import { AdminLoginForm } from "@/components/admin/login-form";
import { redirect } from "next/navigation";
import { requireSuperAdminAction } from "@/lib/admin-auth";

export default async function AdminLoginPage() {
  const admin = await requireSuperAdminAction();
  if (admin) redirect("/admin/dashboard");

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <AdminLoginForm />
    </div>
  );
}
