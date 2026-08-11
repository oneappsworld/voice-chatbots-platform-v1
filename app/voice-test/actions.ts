"use server";

import { createClient } from "@/lib/supabase/server";
import { classifyIntent, type Language } from "@/lib/nlu";

export async function classifyUtterance(text: string, language: Language) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  return classifyIntent(text, language);
}
