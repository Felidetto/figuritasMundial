import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AdminProfile = {
  id: string;
  email: string;
  role: "admin" | "super_admin";
};

export async function requireSuperAdminAction(): Promise<AdminProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("admin_profiles")
    .select("id, email, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") return null;
  return profile as AdminProfile;
}
