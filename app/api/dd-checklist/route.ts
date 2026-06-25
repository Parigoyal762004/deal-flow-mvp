import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// GET /api/dd-checklist?deal_id=xxx  - fetch all items for a deal
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const deal_id = searchParams.get("deal_id");
  if (!deal_id) {
    return NextResponse.json({ error: "deal_id required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("dd_checklist")
    .select("*")
    .eq("deal_id", deal_id)
    .order("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data });
}

// PATCH /api/dd-checklist  - update a single item's status and/or notes
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { deal_id, item_key, status, notes } = body as {
      deal_id: string;
      item_key: string;
      status?: string;
      notes?: string;
    };

    if (!deal_id || !item_key) {
      return NextResponse.json({ error: "deal_id and item_key required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes || null;

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("dd_checklist")
      .update(updates)
      .eq("deal_id", deal_id)
      .eq("item_key", item_key)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
