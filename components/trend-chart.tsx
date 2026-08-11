"use client";

import { useRef, useState } from "react";
import type { DailyVolume } from "@/lib/dashboard";
import { formatDayLabel } from "@/lib/dashboard";

const WIDTH = 760;
const HEIGHT = 220;
const PAD_LEFT = 36;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

function niceMax(value: number) {
  if (value <= 0) return 10;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const steps = [1, 2, 2.5, 5, 10];
  for (const step of steps) {
    const candidate = step * magnitude;
    if (candidate >= value) return candidate;
  }
  return Math.ceil(value / magnitude) * magnitude;
}

export function TrendChart({ data }: { data: DailyVolume[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const maxCount = niceMax(Math.max(...data.map((d) => d.count), 1));
  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const points = data.map((d, i) => {
    const x = PAD_LEFT + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
    const y = PAD_TOP + plotH - (d.count / maxCount) * plotH;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(2)},${(PAD_TOP + plotH).toFixed(2)} L${points[0].x.toFixed(2)},${(PAD_TOP + plotH).toFixed(2)} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxCount * f));

  // Show roughly 6 x-axis labels regardless of range length.
  const labelStride = Math.max(1, Math.round(data.length / 6));

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const localX = (e.clientX - rect.left) * scaleX;
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - localX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div>
      <div style={{ position: "relative" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="trend-svg"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
          role="img"
          aria-label="Daily call volume trend"
        >
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-2)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTicks.map((t) => {
            const y = PAD_TOP + plotH - (t / maxCount) * plotH;
            return (
              <g key={t}>
                <line
                  x1={PAD_LEFT}
                  x2={WIDTH - PAD_RIGHT}
                  y1={y}
                  y2={y}
                  stroke="var(--card-border)"
                  strokeWidth="1"
                />
                <text x={PAD_LEFT - 8} y={y + 4} textAnchor="end" className="trend-axis-label">
                  {t}
                </text>
              </g>
            );
          })}

          {points.map((p, i) =>
            i % labelStride === 0 || i === points.length - 1 ? (
              <text
                key={p.date}
                x={p.x}
                y={HEIGHT - 6}
                textAnchor="middle"
                className="trend-axis-label"
              >
                {formatDayLabel(p.date)}
              </text>
            ) : null
          )}

          <path d={areaPath} fill="url(#trendFill)" stroke="none" />
          <path d={linePath} fill="none" stroke="var(--accent-2)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="5"
            fill="var(--accent-2)"
            stroke="var(--card)"
            strokeWidth="2"
          />

          {hovered && (
            <g>
              <line
                x1={hovered.x}
                x2={hovered.x}
                y1={PAD_TOP}
                y2={PAD_TOP + plotH}
                stroke="var(--text-faint)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle cx={hovered.x} cy={hovered.y} r="5" fill="var(--accent-2)" stroke="var(--card)" strokeWidth="2" />
            </g>
          )}
        </svg>

        {hovered && (
          <div
            className="trend-tooltip"
            style={{
              left: `${(hovered.x / WIDTH) * 100}%`,
              top: `${(hovered.y / HEIGHT) * 100}%`,
            }}
          >
            <div className="trend-tooltip-value">{hovered.count} calls</div>
            <div className="trend-tooltip-label">{formatDayLabel(hovered.date)}</div>
          </div>
        )}
      </div>

      <button type="button" className="table-toggle" onClick={() => setShowTable((v) => !v)}>
        {showTable ? "Hide data table" : "View as table"}
      </button>

      {showTable && (
        <div className="trend-table-wrap">
          <table className="trend-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Calls</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date}>
                  <td>{formatDayLabel(d.date)}</td>
                  <td>{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
