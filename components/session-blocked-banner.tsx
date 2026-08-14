import Link from "next/link";
import type { Language } from "@/lib/nlu";

const COPY: Record<"plan_gated" | "usage_cap", Record<Language, string>> = {
  plan_gated: {
    "en-US": "This bot isn't included in your current plan.",
    "es-ES": "Este bot no está incluido en tu plan actual.",
  },
  usage_cap: {
    "en-US": "You've reached this month's call limit for your plan.",
    "es-ES": "Has alcanzado el límite de llamadas de este mes para tu plan.",
  },
};

export function SessionBlockedBanner({
  reason,
  language,
}: {
  reason: "plan_gated" | "usage_cap";
  language: Language;
}) {
  return (
    <div className="upgrade-prompt">
      <p>{COPY[reason][language]}</p>
      <Link href="/billing" className="btn btn-primary btn-sm">
        {language === "en-US" ? "Upgrade to Pro" : "Mejorar a Pro"}
      </Link>
    </div>
  );
}
