import type { Stage } from "./config";

export type { Stage };

export type Category =
  | "sales_lead"
  | "pre_sales_question"
  | "support"
  | "refund"
  | "spam"
  | "job_seeker"
  | "minor"
  | "other";

export type Interest =
  | "Bootcamp"
  | "Fellowship"
  | "Corporate Training"
  | "Unknown";

export type Language = "bangla" | "banglish" | "english";

export type Urgency = "low" | "normal" | "high";

export type Priority = "low" | "normal" | "high" | "urgent" | "none";

export type ChannelGuess =
  | "WhatsApp"
  | "Facebook"
  | "Website"
  | "Phone"
  | "Unknown";

export interface ExtractedEnquiry {
  sender_name: string | null;
  phone: string | null;
  channel_guess: ChannelGuess | string;
  interest: Interest;
  category: Category;
  language: Language;
  company: string | null;
  headcount: number | null;
  urgency: Urgency;
  suggested_status: Stage;
  follow_up_hint: string | null;
  needs_human_review: boolean;
  review_reason: string | null;
  confidence: number;
  summary: string;
  suggested_reply: string | null;
  priority: Priority;
}

export interface Contact {
  id?: number | null;
  name: string | null;
  phone_normalized: string | null;
  phone_missing: boolean;
  first_seen: string;
}

export interface Enquiry {
  id?: number | null;
  contact_id: number;
  channel: string;
  received_at: string;
  raw_message: string;
  interest: Interest | string;
  category: Category | string | null;
  language: Language | string | null;
  urgency: Urgency | string | null;
  priority: Priority | string;
  status: Stage | string;
  summary: string | null;
  confidence: number | null;
  needs_review: boolean;
  review_reason: string | null;
  follow_up_due: string | null;
  reply_draft: string | null;
  company: string | null;
  headcount: number | null;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id?: number | null;
  enquiry_id: number;
  type: "created" | "status_change" | "note" | "reply_edited" | string;
  from_value: string | null;
  to_value: string | null;
  at: string;
}
