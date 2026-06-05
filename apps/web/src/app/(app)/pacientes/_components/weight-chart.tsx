"use client";

import { useMemo } from "react";
import type { PetWeightRead } from "@/lib/pets-api";

type Point = { x: number; y: number; date: Date; kg: number };

const WIDTH = 640;
const HEIGHT = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };

export function WeightChart({ weights }: { weights: PetWeightRead[] }) {
  const sorted = useMemo(() => {
    return [...weights].sort(
      (a, b) =>
        new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime(),
    );
  }, [weights]);

  if (sorted.length === 0) return null;

  const dates = sorted.map((w) => new Date(w.measured_at).getTime());
  const kgs = sorted.map((w) => Number(w.weight_kg));
  const minT = Math.min(...dates);
  const maxT = Math.max(...dates);
  const minKg = Math.min(...kgs);
  const maxKg = Math.max(...kgs);

  const spanT = Math.max(1, maxT - minT);
  const spanKg = Math.max(0.1, maxKg - minKg);

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const points: Point[] = sorted.map((w, i) => {
    const t = new Date(w.measured_at).getTime();
    const kg = Number(w.weight_kg);
    const x =
      sorted.length === 1
        ? PAD.left + innerW / 2
        : PAD.left + ((t - minT) / spanT) * innerW;
    const y = PAD.top + innerH - ((kg - minKg) / spanKg) * innerH;
    return { x, y, date: new Date(w.measured_at), kg };
  });

  const path = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  const fillPath = `${path} L ${points[points.length - 1].x} ${PAD.top + innerH} L ${points[0].x} ${PAD.top + innerH} Z`;

  const ySteps = 4;
  const yTicks = Array.from({ length: ySteps + 1 }, (_, i) => {
    const v = minKg + (spanKg * i) / ySteps;
    return { v, y: PAD.top + innerH - (innerH * i) / ySteps };
  });

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full max-w-3xl"
        role="img"
        aria-label="Histórico de pesos"
      >
        {/* y-axis grid */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={t.y}
              y2={t.y}
              stroke="currentColor"
              className="text-border"
              strokeDasharray="2 4"
            />
            <text
              x={PAD.left - 6}
              y={t.y + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[10px]"
            >
              {t.v.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={fillPath} className="fill-primary/10" />

        {/* Line */}
        <path d={path} fill="none" className="stroke-primary" strokeWidth={2} />

        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3.5} className="fill-primary" />
            <title>
              {p.date.toLocaleDateString("es-PE")} — {p.kg.toFixed(2)} kg
            </title>
          </g>
        ))}

        {/* x-axis labels (first, mid, last) */}
        {[points[0], points[Math.floor(points.length / 2)], points[points.length - 1]]
          .filter((p, i, arr) => arr.indexOf(p) === i)
          .map((p, i) => (
            <text
              key={i}
              x={p.x}
              y={HEIGHT - 8}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {p.date.toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
            </text>
          ))}
      </svg>
    </div>
  );
}
