"use server";

import { createClient } from "@/lib/supabase/server";

export async function crearUsuarioAction(data: any) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userToken = session?.access_token ?? "";

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://uwvcabgrndthgcueutbw.supabase.co";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3dmNhYmdybmR0aGdjdWV1dGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NDE1NjcsImV4cCI6MjA4ODAxNzU2N30.vg_2zlHxLomla0hMQR2s5CBw1cGkaS4jhWJX3hqlEo4";

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/crear-usuario`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
        "X-User-Token": userToken,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errText = await res.text();
      let errObj;
      try {
        errObj = JSON.parse(errText);
      } catch {
        errObj = { error: errText };
      }
      return { error: errObj.error || "Error al crear usuario" };
    }

    const result = await res.json();
    return { data: result };
  } catch (error: any) {
    return { error: error.message || "Error de red" };
  }
}
