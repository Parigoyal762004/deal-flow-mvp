import { createClient } from "@supabase/supabase-js";
import type { Deal } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      deals: {
        Row: Deal;
        Insert: Omit<Deal, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Deal, "id" | "created_at">>;
      };
    };
  };
};

export async function uploadPitchDeck(file: File, dealId: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "pdf";
  const path = `pitch-decks/${dealId}.${ext}`;

  const { error } = await supabase.storage.from("pitch-decks").upload(path, file, {
    contentType: file.type,
    upsert: true,
  });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from("pitch-decks").getPublicUrl(path);
  return data.publicUrl;
}
