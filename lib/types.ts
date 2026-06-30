export type EmailStatus = "pending" | "drafted" | "awaiting_approval" | "sent" | "failed";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type DealStage = "pre-seed" | "seed" | "series-a" | "series-b" | "growth" | "other";
export type DealSource = "Backrr" | "LinkedIn" | "Referral" | "Cold Outreach" | "Event" | "Other";

export interface AdditionalLink {
  label: string;
  url: string;
}

export interface Deal {
  id: string;
  startup_name: string;
  founder_name: string;
  founder_email: string;
  website_url: string | null;
  linkedin_url: string | null;
  additional_links: AdditionalLink[];
  notes: string | null;
  pitch_deck_url: string | null;
  source: DealSource;
  industry: string | null;
  stage: DealStage | null;
  email_status: EmailStatus;
  approval_status: ApprovalStatus;
  draft_email: string | null;
  ai_summary: string | null;
  approval_token: string | null;
  owner: string | null; // username of the team member who owns this deal
  meeting_held: boolean;
  created_at: string;
  updated_at: string;
}

// ── DD Checklist ──────────────────────────────────────────────────────────
export type DDStatus = "received" | "pending" | "missing" | "na";

export interface DDChecklistItem {
  id: string;
  deal_id: string;
  item_key: string;
  item_label: string;
  applicable_to: "both" | "debt" | "equity";
  status: DDStatus;
  notes: string | null;
  updated_at: string;
}

export interface DealFormValues {
  startup_name: string;
  founder_name: string;
  founder_email: string;
  website_url: string;
  linkedin_url: string;
  additional_links: AdditionalLink[];
  notes: string;
  source: DealSource;
  industry: string;
  stage: DealStage;
  pitch_deck?: FileList | null;
}

export interface SubmitDealPayload {
  startup_name: string;
  founder_name: string;
  founder_email: string;
  website_url: string;
  linkedin_url: string;
  additional_links: AdditionalLink[];
  notes: string;
  source: DealSource;
  industry: string;
  stage: DealStage;
  pitch_deck_url: string;
}
