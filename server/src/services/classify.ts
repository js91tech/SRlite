import type { IssueCategory } from "../types.js";

const DISABLED_KEYWORDS = [
  "disabled",
  "stalled",
  "stall",
  "won't start",
  "wont start",
  "flat tire",
  "overheated",
  "out of gas",
  "shoulder",
  "blocking",
];

const ACCIDENT_KEYWORDS = [
  "accident",
  "crash",
  "collision",
  "wreck",
  "mvc",
];

export function classifyIssue(description: string): IssueCategory {
  const d = description.toLowerCase();
  if (DISABLED_KEYWORDS.some((k) => d.includes(k))) return "disabled";
  if (ACCIDENT_KEYWORDS.some((k) => d.includes(k))) return "accident";
  if (d.includes("tow")) return "tow";
  if (d.includes("jump") || d.includes("battery")) return "jump_start";
  if (d.includes("tire") || d.includes("flat")) return "tire";
  if (d.includes("fuel") || d.includes("gas")) return "fuel";
  if (d.includes("lock")) return "lockout";
  return "unknown";
}

export function estimateConfidence(description: string): number {
  const d = description.toLowerCase();
  if (d.includes("disabled") || d.includes("stalled")) return 0.85;
  if (d.includes("accident")) return 0.7;
  if (d.includes("stranded") || d.includes("need tow")) return 0.8;
  return 0.5;
}
