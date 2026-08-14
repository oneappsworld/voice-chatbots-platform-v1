import type { Language } from "@/lib/nlu";
import { reasonLabel, type EscalationReason } from "@/lib/escalation";

const LABELS: Record<Language, { title: string; connected: string; context: string }> = {
  "en-US": { title: "Transferred to a live agent", connected: "Connected", context: "Context passed to agent" },
  "es-ES": { title: "Transferido a un agente en vivo", connected: "Conectado", context: "Contexto enviado al agente" },
  "zh-CN": { title: "已转接人工客服", connected: "已连接", context: "已传递给客服的背景信息" },
};

export function HandoffCard({
  agentName,
  reason,
  contextSummary,
  language,
}: {
  agentName: string;
  reason: EscalationReason;
  contextSummary: string;
  language: Language;
}) {
  const t = LABELS[language];
  return (
    <div className="handoff-card">
      <div className="handoff-card-head">
        <span className="handoff-dot" />
        <div>
          <div className="handoff-title">{t.title}</div>
          <div className="handoff-subtitle">
            {t.connected} · {agentName} · {reasonLabel(reason, language)}
          </div>
        </div>
      </div>
      <div className="handoff-context">
        <div className="handoff-context-label">{t.context}</div>
        <pre className="handoff-context-body">{contextSummary}</pre>
      </div>
    </div>
  );
}
