// Simple offline moderation utilities for demo mode
// Uses keyword matching to classify and decide actions.

import { ModerationResult } from "@/hooks/useAIModerator";

const CRITICAL_KEYWORDS = [
  // add a few representative terms; extend as needed
  "hate crime",
  "kill",
  "bomb",
  "nazi",
  "slur1",
  "slur2",
];

const SENSITIVE_KEYWORDS = [
  "nudity",
  "graphic",
  "violent",
  "self-harm",
  "drugs",
  "porn",
  "explicit",
  "nsfw",
];

export function offlineModerateText(content: string): ModerationResult {
  const text = content.toLowerCase();

  const criticalHit = CRITICAL_KEYWORDS.find((w) => text.includes(w));
  if (criticalHit) {
    return {
      flagged: true,
      action: "block",
      reason: `Blocked due to critical content: ${criticalHit}`,
      categories: { violence: true, hate: true },
    };
  }

  const sensitiveHit = SENSITIVE_KEYWORDS.find((w) => text.includes(w));
  if (sensitiveHit) {
    return {
      flagged: true,
      action: "warn",
      reason: `Sensitive content detected: ${sensitiveHit}`,
      categories: { sexual: true, violence: true },
    };
  }

  return { flagged: false, action: "allow" };
}
