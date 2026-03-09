"use client";

export function getCases() {
  const raw = localStorage.getItem("results");
  if (!raw) return null;

  const parsed = JSON.parse(raw);

  if (!parsed) return null;

  return parsed;
}
