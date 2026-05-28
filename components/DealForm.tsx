"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2, User, Mail, Globe, Linkedin, FileText,
  Tag, Layers, Calendar, CheckCircle, Loader2, ChevronRight
} from "lucide-react";
import { AdditionalLinks } from "./AdditionalLinks";
import { FileUpload } from "./FileUpload";
import { supabase, uploadPitchDeck } from "@/lib/supabase";
import type { DealFormValues } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

const schema = z.object({
  startup_name: z.string().min(2, "Startup name is required"),
  founder_name: z.string().min(2, "Founder name is required"),
  founder_email: z.string().email("Valid email required"),
  website_url: z.string().url("Must be a valid URL").or(z.literal("")),
  linkedin_url: z.string().url("Must be a valid URL").or(z.literal("")),
  additional_links: z.array(
    z.object({
      label: z.string().min(1, "Label required"),
      url: z.string().url("Valid URL required"),
    })
  ),
  notes: z.string(),
  source: z.enum(["Backrr", "LinkedIn", "Referral", "Cold Outreach", "Event", "Other"]),
  industry: z.string().min(1, "Industry is required"),
  stage: z.enum(["pre-seed", "seed", "series-a", "series-b", "growth", "other"]),
  pitch_deck: z.any().optional(),
});

const INDUSTRIES = [
  "Fintech", "Healthtech", "Edtech", "SaaS", "AI/ML", "E-commerce",
  "Proptech", "Logistics", "Agritech", "Cleantech", "Consumer", "Enterprise",
  "Cybersecurity", "Web3/Crypto", "Media", "Gaming", "Other",
];

const STAGES = [
  { value: "pre-seed", label: "Pre-Seed" },
  { value: "seed", label: "Seed" },
  { value: "series-a", label: "Series A" },
  { value: "series-b", label: "Series B" },
  { value: "growth", label: "Growth" },
  { value: "other", label: "Other" },
];

const SOURCES = ["Backrr", "LinkedIn", "Referral", "Cold Outreach", "Event", "Other"];

export function DealForm() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<DealFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      source: "Backrr",
      stage: "seed",
      additional_links: [],
      pitch_deck: null,
    },
  });

  async function onSubmit(data: DealFormValues) {
    setSubmitting(true);
    setError(null);

    try {
      const dealId = uuidv4();

      // 1. Upload pitch deck to Supabase Storage (optional)
      const fileList = data.pitch_deck as FileList | null | undefined;
      const file = fileList && fileList.length > 0 ? (fileList[0] as File) : null;
      const pitchDeckUrl = file ? await uploadPitchDeck(file, dealId) : null;

      // 2. POST to our API route (which saves to Supabase + triggers n8n)
      const payload = {
        id: dealId,
        startup_name: data.startup_name,
        founder_name: data.founder_name,
        founder_email: data.founder_email,
        website_url: data.website_url || null,
        linkedin_url: data.linkedin_url || null,
        additional_links: data.additional_links,
        notes: data.notes || null,
        source: data.source,
        industry: data.industry,
        stage: data.stage,
        pitch_deck_url: pitchDeckUrl,
      };

      const res = await fetch("/api/submit-deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Submission failed");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Deal Submitted</h2>
          <p className="text-slate-500 max-w-sm">
            The pitch deck is being analyzed. Your team will receive an internal
            approval email shortly with the AI-drafted response.
          </p>
        </div>
        <button
          onClick={() => setSubmitted(false)}
          className="btn-secondary"
        >
          Submit another deal
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* ─── Startup Information ─────────────────────────────── */}
      <section className="card p-6">
        <h2 className="section-title">
          <Building2 className="w-4 h-4 text-brand-600" />
          Startup Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="form-label">Startup Name *</label>
            <input
              {...register("startup_name")}
              placeholder="Acme Inc."
              className="form-input"
            />
            {errors.startup_name && <p className="form-error">{errors.startup_name.message}</p>}
          </div>

          <div>
            <label className="form-label">Industry *</label>
            <select {...register("industry")} className="form-input">
              <option value="">Select industry…</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
            {errors.industry && <p className="form-error">{errors.industry.message}</p>}
          </div>

          <div>
            <label className="form-label">Stage *</label>
            <select {...register("stage")} className="form-input">
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {errors.stage && <p className="form-error">{errors.stage.message}</p>}
          </div>

          <div>
            <label className="form-label">Source *</label>
            <select {...register("source")} className="form-input">
              {SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">
              <Globe className="inline w-3.5 h-3.5 mr-1 text-slate-400" />
              Website URL
            </label>
            <input
              {...register("website_url")}
              placeholder="https://acme.com"
              type="url"
              className="form-input"
            />
            {errors.website_url && <p className="form-error">{errors.website_url.message}</p>}
          </div>

          <div>
            <label className="form-label">
              <Linkedin className="inline w-3.5 h-3.5 mr-1 text-slate-400" />
              LinkedIn URL
            </label>
            <input
              {...register("linkedin_url")}
              placeholder="https://linkedin.com/company/acme"
              type="url"
              className="form-input"
            />
            {errors.linkedin_url && <p className="form-error">{errors.linkedin_url.message}</p>}
          </div>
        </div>
      </section>

      {/* ─── Founder Information ─────────────────────────────── */}
      <section className="card p-6">
        <h2 className="section-title">
          <User className="w-4 h-4 text-brand-600" />
          Founder Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="form-label">Founder Name *</label>
            <input
              {...register("founder_name")}
              placeholder="Jane Smith"
              className="form-input"
            />
            {errors.founder_name && <p className="form-error">{errors.founder_name.message}</p>}
          </div>

          <div>
            <label className="form-label">
              <Mail className="inline w-3.5 h-3.5 mr-1 text-slate-400" />
              Founder Email *
            </label>
            <input
              {...register("founder_email")}
              placeholder="jane@acme.com"
              type="email"
              className="form-input"
            />
            {errors.founder_email && <p className="form-error">{errors.founder_email.message}</p>}
          </div>
        </div>
      </section>

      {/* ─── Additional Links ────────────────────────────────── */}
      <section className="card p-6">
        <h2 className="section-title">
          <Tag className="w-4 h-4 text-brand-600" />
          Additional Links
          <span className="ml-auto text-xs font-normal text-slate-400">Optional</span>
        </h2>
        <AdditionalLinks control={control} errors={errors} />
      </section>

      {/* ─── Pitch Deck ──────────────────────────────────────── */}
      <section className="card p-6">
        <h2 className="section-title">
          <FileText className="w-4 h-4 text-brand-600" />
          Pitch Deck
          <span className="ml-auto text-xs font-normal text-slate-400">Optional</span>
        </h2>
        <p className="text-xs text-slate-400 mb-3 -mt-1">
          Not required — we can begin with a conversation and build from there.
        </p>
        <FileUpload
          register={register}
          setValue={setValue}
          error={errors.pitch_deck}
        />
      </section>

      {/* ─── Notes ───────────────────────────────────────────── */}
      <section className="card p-6">
        <h2 className="section-title">
          <Layers className="w-4 h-4 text-brand-600" />
          Internal Notes
          <span className="ml-auto text-xs font-normal text-slate-400">Optional</span>
        </h2>
        <textarea
          {...register("notes")}
          placeholder="Add any context, first impressions, or sourcing notes here…"
          rows={4}
          className="form-input resize-none"
        />
      </section>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pb-8">
        <p className="text-xs text-slate-400">
          <Calendar className="inline w-3 h-3 mr-1" />
          Submitted deals are immediately queued for AI analysis.
        </p>
        <button type="submit" disabled={submitting} className="btn-primary min-w-[140px]">
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              Submit Deal
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
