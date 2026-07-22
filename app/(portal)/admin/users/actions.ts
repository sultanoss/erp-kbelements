"use server";

import { adminSupabase } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function createUser(formData: FormData) {
  const name = (formData.get("name") as string).trim();
  const email = (formData.get("email") as string).trim();
  const password = formData.get("password") as string;
  const role = (formData.get("role") as string) || "user";

  if (!name || !email || !password) return { error: "Alle Felder sind Pflichtfelder." };
  if (password.length < 6) return { error: "Passwort muss mindestens 6 Zeichen lang sein." };

  const { error } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
    app_metadata: { role },
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { error: null };
}

export async function updateUserRole(userId: string, role: "admin" | "user") {
  const { error } = await adminSupabase.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { error: null };
}

export async function deleteUser(userId: string) {
  const { error } = await adminSupabase.auth.admin.deleteUser(userId);

  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { error: null };
}
