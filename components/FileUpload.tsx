"use client";

import { useRef, useState } from "react";
import { UseFormRegister, UseFormSetValue } from "react-hook-form";
import { Upload, FileText, X } from "lucide-react";
import type { DealFormValues } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  register: UseFormRegister<DealFormValues>;
  setValue: UseFormSetValue<DealFormValues>;
  error?: { message?: string };
}

export function FileUpload({ setValue, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(f: File) {
    if (f.type !== "application/pdf") {
      alert("Only PDF files are accepted.");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      alert("File must be under 20 MB.");
      return;
    }
    setFile(f);
    const dt = new DataTransfer();
    dt.items.add(f);
    setValue("pitch_deck", dt.files, { shouldValidate: true });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function clear() {
    setFile(null);
    setValue("pitch_deck", null, { shouldValidate: true });
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      {file ? (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-green-200 bg-green-50">
          <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
            <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB · PDF</p>
          </div>
          <button
            type="button"
            onClick={clear}
            className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          className={cn(
            "relative flex flex-col items-center justify-center gap-3 p-8 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-150",
            dragging
              ? "border-brand-400 bg-brand-50"
              : "border-slate-200 bg-slate-50 hover:border-brand-300 hover:bg-brand-50/50"
          )}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
            dragging ? "bg-brand-100" : "bg-slate-200"
          )}>
            <Upload className={cn("w-5 h-5 transition-colors", dragging ? "text-brand-600" : "text-slate-500")} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700">Drop pitch deck here</p>
            <p className="text-xs text-slate-400 mt-0.5">PDF · Max 20 MB</p>
          </div>
          <span className="text-xs text-brand-600 font-medium">Browse files</span>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleChange}
          />
        </div>
      )}

      {error && <p className="form-error">{error.message}</p>}
    </div>
  );
}
