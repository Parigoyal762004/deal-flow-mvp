import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function statusColor(status: string) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    drafted: "bg-blue-100 text-blue-800",
    awaiting_approval: "bg-purple-100 text-purple-800",
    sent: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };
  return map[status] ?? "bg-gray-100 text-gray-800";
}
