"use client";

import { useFieldArray, Control } from "react-hook-form";
import { Plus, Trash2, Link } from "lucide-react";
import type { DealFormValues } from "@/lib/types";

interface Props {
  control: Control<DealFormValues>;
  errors: Record<string, unknown>;
}

export function AdditionalLinks({ control }: Props) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "additional_links",
  });

  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2 items-start">
          <div className="flex-1 grid grid-cols-2 gap-2">
            <input
              {...control.register(`additional_links.${index}.label`)}
              placeholder="Label (e.g. Demo Video)"
              className="form-input"
            />
            <input
              {...control.register(`additional_links.${index}.url`)}
              placeholder="https://"
              className="form-input"
              type="url"
            />
          </div>
          <button
            type="button"
            onClick={() => remove(index)}
            className="mt-0.5 p-2.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => append({ label: "", url: "" })}
        className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors group"
      >
        <div className="w-7 h-7 rounded-md border border-brand-200 bg-brand-50 group-hover:bg-brand-100 flex items-center justify-center transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </div>
        Add link
      </button>

      {fields.length === 0 && (
        <p className="text-sm text-slate-400 flex items-center gap-1.5">
          <Link className="w-3.5 h-3.5" />
          No additional links added
        </p>
      )}
    </div>
  );
}
