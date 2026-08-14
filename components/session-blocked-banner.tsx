import Link from "next/link";
import type { Language } from "@/lib/nlu";

const COPY: Record<"plan_gated" | "usage_cap", Record<Language, string>> = {
  plan_gated: {
    "en-US": "This bot isn't included in your current plan.",
    "es-ES": "Este bot no está incluido en tu plan actual.",
    "zh-CN": "您当前的套餐不包含此机器人。",
  },
  usage_cap: {
    "en-US": "You've reached this month's call limit for your plan.",
    "es-ES": "Has alcanzado el límite de llamadas de este mes para tu plan.",
    "zh-CN": "您本月的通话次数已达到套餐上限。",
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
        {language === "en-US" ? "Upgrade to Pro" : language === "es-ES" ? "Mejorar a Pro" : "升级到 Pro"}
      </Link>
    </div>
  );
}
