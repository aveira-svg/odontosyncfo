"use client";

import { useMemo, useState } from "react";

// Paleta ejecutiva e institucional FOUNNE (UNNE)
const PALETTE = [
  "#003366", // Azul Institucional UNNE
  "#0284c7", // Azul Cielo / Cyan 600
  "#059669", // Esmeralda 600
  "#d97706", // Ámbar 600
  "#7c3aed", // Violeta 600
  "#e11d48", // Rosa/Rojo 600
  "#475569", // Pizarra 600
  "#0d9488", // Teal 600
  "#ca8a04", // Amarillo 600
  "#4f46e5"  // Índigo 600
];

interface TimeSeriesItem {
  key: string;
  label: string;
  value: number;
  secondaryValue?: number;
}

interface AnalyticsLineBarChartProps {
  data: TimeSeriesItem[];
  title: string;
  subtitle?: string;
  isCurrency?: boolean;
  valueLabel?: string;
  height?: number;
}

export function AnalyticsLineBarChart({
  data,
  title,
  subtitle,
  isCurrency = false,
  valueLabel = "Total",
  height = 260
}: AnalyticsLineBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const formatVal = (v: number) => {
    if (isCurrency) {
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0
      }).format(v);
    }
    return new Intl.NumberFormat("es-AR").format(v);
  };

  const maxValue = useMemo(() => {
    if (data.length === 0) return 100;
    const max = Math.max(...data.map((d) => d.value));
    return max > 0 ? max * 1.15 : 100;
  }, [data]);

  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const width = 600; // ViewBox width
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Compute points
  const points = useMemo(() => {
    if (data.length === 0) return [];
    return data.map((d, i) => {
      const x =
        data.length === 1
          ? padding.left + chartW / 2
          : padding.left + (i / (data.length - 1)) * chartW;
      const y = padding.top + chartH - (d.value / maxValue) * chartH;
      return { x, y, ...d, index: i };
    });
  }, [data, maxValue, chartW, chartH, padding.left, padding.top]);

  // Line path generator
  const linePath = useMemo(() => {
    if (points.length === 0) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    return points.reduce((acc, curr, idx) => {
      if (idx === 0) return `M ${curr.x} ${curr.y}`;
      // Smooth curve using cubic bezier control points
      const prev = points[idx - 1];
      const cpX1 = prev.x + (curr.x - prev.x) / 3;
      const cpY1 = prev.y;
      const cpX2 = curr.x - (curr.x - prev.x) / 3;
      const cpY2 = curr.y;
      return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
    }, "");
  }, [points]);

  // Area under line
  const areaPath = useMemo(() => {
    if (points.length === 0) return "";
    const bottomY = padding.top + chartH;
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [linePath, points, padding.top, chartH]);

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center text-sm text-slate-500">
        Sin datos cronológicos para el período seleccionado.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div className="rounded-md bg-slate-900 px-2.5 py-1 text-right text-xs font-bold text-white shadow-sm animate-in fade-in">
            <span className="text-slate-300 font-normal">{points[hoveredIndex].label}: </span>
            {formatVal(points[hoveredIndex].value)}
          </div>
        )}
      </div>

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="lineBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#003366" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#003366" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + chartH * (1 - ratio);
            const val = maxValue * ratio;
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray={ratio === 0 ? undefined : "3 3"}
                />
                <text
                  x={padding.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="9"
                  fill="#64748b"
                  fontWeight="600"
                >
                  {isCurrency
                    ? `$${Math.round(val / 1000) > 0 ? `${Math.round(val / 1000)}k` : Math.round(val)}`
                    : Math.round(val)}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill="url(#lineBarGrad)" />

          {/* Bars */}
          {points.map((p, i) => {
            const barW = Math.max(8, Math.min(28, (chartW / points.length) * 0.55));
            const barH = (p.value / maxValue) * chartH;
            const barY = padding.top + chartH - barH;
            const isHov = hoveredIndex === i;

            return (
              <g key={p.key} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
                <rect
                  x={p.x - barW / 2}
                  y={barY}
                  width={barW}
                  height={barH}
                  rx="3"
                  fill={isHov ? "#0284c7" : "#003366"}
                  opacity={isHov ? 0.95 : 0.7}
                  className="transition-all duration-200 cursor-pointer"
                />
              </g>
            );
          })}

          {/* Main trend line */}
          <path
            d={linePath}
            fill="none"
            stroke="#003366"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {points.map((p, i) => {
            const isHov = hoveredIndex === i;
            return (
              <g key={`pt-${p.key}`} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHov ? "5" : "3.5"}
                  fill="#ffffff"
                  stroke="#003366"
                  strokeWidth={isHov ? "2.5" : "2"}
                  className="transition-all duration-200 cursor-pointer"
                />
              </g>
            );
          })}

          {/* X Axis Labels */}
          {points.map((p, i) => {
            // Filter labels if too dense
            const skip = points.length > 12 ? Math.ceil(points.length / 8) : 1;
            if (i % skip !== 0 && i !== points.length - 1) return null;

            return (
              <text
                key={`lbl-${p.key}`}
                x={p.x}
                y={height - 12}
                textAnchor="middle"
                fontSize="9"
                fill="#475569"
                fontWeight="700"
              >
                {p.label.length > 12 ? `${p.label.slice(0, 10)}...` : p.label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

interface CategoryItem {
  id: string;
  label: string;
  value: number;
  count?: number;
}

interface AnalyticsHorizontalBarChartProps {
  data: CategoryItem[];
  title: string;
  subtitle?: string;
  isCurrency?: boolean;
  valueLabel?: string;
  maxItems?: number;
}

export function AnalyticsHorizontalBarChart({
  data,
  title,
  subtitle,
  isCurrency = false,
  valueLabel = "Monto",
  maxItems = 8
}: AnalyticsHorizontalBarChartProps) {
  const sorted = useMemo(() => {
    return [...data].sort((a, b) => b.value - a.value).slice(0, maxItems);
  }, [data, maxItems]);

  const maxVal = useMemo(() => {
    if (sorted.length === 0) return 1;
    return Math.max(...sorted.map((s) => s.value)) || 1;
  }, [sorted]);

  const totalSum = useMemo(() => {
    return sorted.reduce((acc, cur) => acc + cur.value, 0);
  }, [sorted]);

  const formatVal = (v: number) => {
    if (isCurrency) {
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0
      }).format(v);
    }
    return new Intl.NumberFormat("es-AR").format(v);
  };

  if (sorted.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center text-sm text-slate-500">
        Sin datos clasificados por categoría.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-400">
          Top {sorted.length} Servicios
        </span>
      </div>

      <div className="space-y-3">
        {sorted.map((item, idx) => {
          const pct = Math.round((item.value / maxVal) * 100);
          const totalPct = totalSum > 0 ? ((item.value / totalSum) * 100).toFixed(1) : "0";
          const color = PALETTE[idx % PALETTE.length];

          return (
            <div key={item.id} className="group">
              <div className="mb-1 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 max-w-[65%] truncate">
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-slate-800 truncate" title={item.label}>
                    {item.label}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900">{formatVal(item.value)}</span>
                  <span className="ml-1.5 text-3xs font-semibold text-slate-400">({totalPct}%)</span>
                </div>
              </div>

              {/* Progress track */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DonutItem {
  id: string;
  label: string;
  value: number;
}

interface AnalyticsDonutChartProps {
  data: DonutItem[];
  title: string;
  subtitle?: string;
  centerLabel?: string;
}

export function AnalyticsDonutChart({
  data,
  title,
  subtitle,
  centerLabel = "Total"
}: AnalyticsDonutChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = useMemo(() => data.filter((d) => d.value > 0), [data]);
  const total = useMemo(() => filtered.reduce((acc, cur) => acc + cur.value, 0), [filtered]);

  // Compute SVG arc slices
  const slices = useMemo(() => {
    if (total === 0) return [];
    let cumulative = 0;

    return filtered.map((item, idx) => {
      const startAngle = (cumulative / total) * 2 * Math.PI;
      cumulative += item.value;
      const endAngle = (cumulative / total) * 2 * Math.PI;
      const color = PALETTE[idx % PALETTE.length];
      const pct = ((item.value / total) * 100).toFixed(1);

      // SVG path calculation for donut (R_outer=80, R_inner=52)
      const rOut = 80;
      const rIn = 52;
      const cx = 100;
      const cy = 100;

      const x1 = cx + rOut * Math.sin(startAngle);
      const y1 = cy - rOut * Math.cos(startAngle);
      const x2 = cx + rOut * Math.sin(endAngle);
      const y2 = cy - rOut * Math.cos(endAngle);

      const x3 = cx + rIn * Math.sin(endAngle);
      const y3 = cy - rIn * Math.cos(endAngle);
      const x4 = cx + rIn * Math.sin(startAngle);
      const y4 = cy - rIn * Math.cos(startAngle);

      const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

      const d = [
        `M ${x1} ${y1}`,
        `A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${rIn} ${rIn} 0 ${largeArc} 0 ${x4} ${y4}`,
        "Z"
      ].join(" ");

      return {
        ...item,
        color,
        pct,
        d
      };
    });
  }, [filtered, total]);

  if (slices.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center text-sm text-slate-500">
        Sin datos demográficos registrados.
      </div>
    );
  }

  const activeSlice = slices.find((s) => s.id === hoveredId);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* Donut SVG Graphic */}
        <div className="relative flex items-center justify-center">
          <svg viewBox="0 0 200 200" className="w-40 h-40 select-none">
            {slices.map((slice) => {
              const isHov = hoveredId === slice.id;
              return (
                <path
                  key={slice.id}
                  d={slice.d}
                  fill={slice.color}
                  opacity={hoveredId === null || isHov ? 1 : 0.4}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredId(slice.id)}
                  onMouseLeave={() => setHoveredId(null)}
                />
              );
            })}
          </svg>

          {/* Center text */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {activeSlice ? activeSlice.label.slice(0, 14) : centerLabel}
            </span>
            <span className="text-lg font-black text-slate-900">
              {activeSlice ? `${activeSlice.pct}%` : total}
            </span>
            {activeSlice && (
              <span className="text-[10px] font-semibold text-slate-500">
                {activeSlice.value} pacientes
              </span>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-1.5 text-xs max-h-48 overflow-y-auto pr-1">
          {slices.map((slice) => {
            const isHov = hoveredId === slice.id;
            return (
              <div
                key={slice.id}
                onMouseEnter={() => setHoveredId(slice.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`flex items-center justify-between rounded-lg p-1.5 transition-colors cursor-pointer ${
                  isHov ? "bg-slate-100 font-bold" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2 truncate max-w-[70%]">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="truncate text-slate-700 font-medium" title={slice.label}>
                    {slice.label}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-slate-900">{slice.value}</span>
                  <span className="ml-1 text-3xs font-semibold text-slate-400">
                    ({slice.pct}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
