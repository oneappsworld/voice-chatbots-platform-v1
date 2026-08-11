import type { TopicSummary } from "@/lib/dashboard";

export function TopicsList({ topics }: { topics: TopicSummary[] }) {
  const maxCount = Math.max(...topics.map((t) => t.count), 1);

  return (
    <ul className="topics-list">
      {topics.map((t) => (
        <li key={t.topic} className="topic-row" title={`${t.topic}: ${t.count} calls (${t.pct}%)`}>
          <div className="topic-row-head">
            <span className="topic-name">{t.topic}</span>
            <span className="topic-count">
              {t.count} <span className="topic-pct">({t.pct}%)</span>
            </span>
          </div>
          <div className="topic-track">
            <div
              className="topic-fill"
              style={{ width: `${Math.max((t.count / maxCount) * 100, 3)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
