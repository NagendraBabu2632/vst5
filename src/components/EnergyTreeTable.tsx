import { useMemo, useState } from "react";
import { BarChart3, ChevronRight, LineChart as LineChartIcon, TrendingUp, X } from "lucide-react";
import { HOUR_LABELS, energyTree, sumHourly, type EnergyTreeAsset, type EnergyTreeLine, type EnergyTreeUnit } from "@/data/energyTreeData";
import "./EnergyTreeTable.css";

export type EnergyPeriod = "today" | "yesterday" | "7days" | "30days" | "month";
type ViewMode = "hour" | "shift" | "day";

type Row =
  | { kind: "unit"; depth: 0; id: string; name: string; hourly: number[]; total: number; childCount: number; childLabel: string; expandable: true }
  | { kind: "line"; depth: 1; id: string; name: string; hourly: number[]; total: number; childCount: number; childLabel: string; expandable: true; parentId: string }
  | { kind: "asset"; depth: 2; id: string; name: string; hourly: number[]; total: number; expandable: false; parentId: string };

interface PreparedLine extends EnergyTreeLine { hourly: number[]; total: number }
interface PreparedUnit extends EnergyTreeUnit { hourly: number[]; total: number; preparedLines: PreparedLine[] }

const sumArr = (a: number[]) => +a.reduce((s, v) => s + v, 0).toFixed(1);
const sumRange = (a: number[], start: number, end: number) =>
  +a.slice(start, end).reduce((s, v) => s + v, 0).toFixed(1);

function prepare(tree: EnergyTreeUnit[]): PreparedUnit[] {
  return tree.map((unit) => {
    const preparedLines: PreparedLine[] = unit.lines.map((line) => {
      const h = sumHourly(line.assets);
      return { ...line, hourly: h, total: sumArr(h) };
    });
    const h = sumHourly(preparedLines);
    return { ...unit, preparedLines, hourly: h, total: sumArr(h) };
  });
}

const fmt = (v: number) => v.toFixed(1);

// --- column / value transforms by view mode ---

const SHIFT_LABELS = ["Shift A (06–14)", "Shift B (14–22)", "Shift C (22–06)"];

function toShiftValues(hourly: number[]): number[] {
  // hourly[0] = 06-07 ... hourly[23] = 05-06
  return [sumRange(hourly, 0, 8), sumRange(hourly, 8, 16), sumRange(hourly, 16, 24)];
}

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function dayCountFor(period: EnergyPeriod): number {
  if (period === "7days") return 7;
  if (period === "30days") return 30;
  if (period === "month") return 30;
  return 1;
}

function dayLabels(n: number): string[] {
  const labels: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    labels.push(d.toLocaleDateString(undefined, { month: "short", day: "2-digit" }));
  }
  return labels;
}

function toDayValues(id: string, hourly: number[], n: number): number[] {
  const dayTotal = sumArr(hourly);
  let s = hashString(id);
  return Array.from({ length: n }, () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const variance = 0.7 + (s / 0xffffffff) * 0.6; // 0.7–1.3
    return +(dayTotal * variance).toFixed(1);
  });
}

// Inline trend chart shown when an asset is selected (hourly trend)
const AssetTrendChart = ({ asset, onClose }: { asset: EnergyTreeAsset; onClose: () => void }) => {
  const [chartType, setChartType] = useState<"line" | "histogram">("line");
  const w = 760, h = 240;
  const m = { top: 16, right: 16, bottom: 32, left: 56 };
  const innerW = w - m.left - m.right;
  const innerH = h - m.top - m.bottom;
  const data = asset.hourly;
  const max = Math.max(...data) * 1.1 || 1;
  const min = 0;
  const xFor = (i: number) => (i / (data.length - 1)) * innerW;
  const yFor = (v: number) => innerH - ((v - min) / (max - min)) * innerH;
  const linePts = data.map((v, i) => `${xFor(i)},${yFor(v)}`).join(" ");
  const areaPts = `0,${innerH} ${linePts} ${innerW},${innerH}`;
  const yTicks = 4;
  const totalKwh = sumArr(data);
  const peakIdx = data.indexOf(Math.max(...data));
  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const avgVal = data.length ? totalKwh / data.length : 0;
  const barGap = 4;
  const barStep = innerW / data.length;
  const barW = Math.max(2, barStep - barGap);

  return (
    <div className="energy-trend-panel">
      <div className="energy-trend-head">
        <div>
          <div className="energy-trend-eyebrow"><TrendingUp size={12} /> Asset Trend</div>
          <h4 className="energy-trend-title">{asset.name}</h4>
          <div className="energy-trend-stats">
            <span><span className="energy-trend-stat-label">Min</span> <strong>{fmt(minVal)} kWh</strong></span>
            <span><span className="energy-trend-stat-label">Max</span> <strong>{fmt(maxVal)} kWh</strong></span>
            <span><span className="energy-trend-stat-label">Average</span> <strong>{fmt(avgVal)} kWh</strong></span>
            <span><span className="energy-trend-stat-label">Total</span> <strong>{fmt(totalKwh)} kWh</strong></span>
          </div>
        </div>
        <div className="energy-trend-actions">
          <div className="energy-trend-chart-toggle" role="tablist" aria-label="Chart type">
            <button
              type="button"
              role="tab"
              aria-selected={chartType === "line"}
              className={`energy-trend-chart-toggle-btn${chartType === "line" ? " is-active" : ""}`}
              onClick={() => setChartType("line")}
              aria-label="Line chart"
              title="Line chart"
            >
              <LineChartIcon size={14} />
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={chartType === "histogram"}
              className={`energy-trend-chart-toggle-btn${chartType === "histogram" ? " is-active" : ""}`}
              onClick={() => setChartType("histogram")}
              aria-label="Histogram"
              title="Histogram"
            >
              <BarChart3 size={14} />
            </button>
          </div>
          <button type="button" className="energy-trend-close" onClick={onClose} aria-label="Close trend">
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="energy-trend-chart-wrap">
        <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" className="energy-trend-svg">
          <defs>
            <linearGradient id="energyTrendFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g transform={`translate(${m.left},${m.top})`}>
            {Array.from({ length: yTicks + 1 }, (_, i) => {
              const v = (max / yTicks) * i;
              const y = yFor(v);
              return (
                <g key={i}>
                  <line x1={0} x2={innerW} y1={y} y2={y} stroke="var(--border)" strokeDasharray="3 3" />
                  <text x={-8} y={y} dy={4} fontSize={10} textAnchor="end" fill="var(--muted-foreground)">{v.toFixed(0)}</text>
                </g>
              );
            })}
            {chartType === "line" ? (
              <>
                <polygon points={areaPts} fill="url(#energyTrendFill)" />
                <polyline points={linePts} fill="none" stroke="var(--primary)" strokeWidth={2} />
                {data.map((v, i) => (
                  <circle key={i} cx={xFor(i)} cy={yFor(v)} r={i === peakIdx ? 4 : 2.5} fill="var(--primary)">
                    <title>{`${HOUR_LABELS[i]}: ${fmt(v)} kWh`}</title>
                  </circle>
                ))}
              </>
            ) : (
              <>
                {data.map((v, i) => {
                  const bx = i * barStep + (barStep - barW) / 2;
                  const by = yFor(v);
                  const bh = Math.max(0, innerH - by);
                  return (
                    <rect
                      key={i}
                      x={bx}
                      y={by}
                      width={barW}
                      height={bh}
                      rx={2}
                      fill="var(--primary)"
                      fillOpacity={i === peakIdx ? 1 : 0.75}
                    >
                      <title>{`${HOUR_LABELS[i]}: ${fmt(v)} kWh`}</title>
                    </rect>
                  );
                })}
              </>
            )}
            <line x1={0} x2={innerW} y1={innerH} y2={innerH} stroke="var(--border)" />
            <line x1={0} x2={0} y1={0} y2={innerH} stroke="var(--border)" />
            {HOUR_LABELS.map((label, i) => {
              if (i % 3 !== 0) return null;
              return (
                <text key={i} x={xFor(i)} y={innerH + 16} fontSize={10} textAnchor="middle" fill="var(--muted-foreground)">
                  {label.split(" - ")[0]}
                </text>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};

interface EnergyTreeTableProps {
  period?: EnergyPeriod;
}

const EnergyTreeTable = ({ period = "today" }: EnergyTreeTableProps) => {
  const data = useMemo(() => prepare(energyTree), []);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const isIntraday = period === "today" || period === "yesterday";
  const [intradayMode, setIntradayMode] = useState<"hour" | "shift">("hour");

  const viewMode: ViewMode = isIntraday ? intradayMode : "day";

  const columns = useMemo(() => {
    if (viewMode === "hour") return HOUR_LABELS;
    if (viewMode === "shift") return SHIFT_LABELS;
    return dayLabels(dayCountFor(period));
  }, [viewMode, period]);

  const valuesFor = (id: string, hourly: number[]): number[] => {
    if (viewMode === "hour") return hourly;
    if (viewMode === "shift") return toShiftValues(hourly);
    return toDayValues(id, hourly, columns.length);
  };

  const selectedAsset = useMemo(() => {
    if (!selectedAssetId) return null;
    for (const u of energyTree) for (const l of u.lines) {
      const a = l.assets.find((x) => x.id === selectedAssetId);
      if (a) return a;
    }
    return null;
  }, [selectedAssetId]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const unit of data) {
      const lineCount = unit.preparedLines.length;
      out.push({
        kind: "unit", depth: 0, id: unit.id, name: unit.name,
        hourly: unit.hourly, total: unit.total,
        childCount: lineCount, childLabel: `${lineCount} ${lineCount === 1 ? "Line" : "Lines"}`,
        expandable: true,
      });
      if (!expanded.has(unit.id)) continue;
      for (const line of unit.preparedLines) {
        const assetCount = line.assets.length;
        out.push({
          kind: "line", depth: 1, id: line.id, name: line.name,
          hourly: line.hourly, total: line.total,
          childCount: assetCount, childLabel: `${assetCount} ${assetCount === 1 ? "Asset" : "Assets"}`,
          expandable: true, parentId: unit.id,
        });
        if (!expanded.has(line.id)) continue;
        for (const asset of line.assets as EnergyTreeAsset[]) {
          out.push({
            kind: "asset", depth: 2, id: asset.id, name: asset.name,
            hourly: asset.hourly, total: sumArr(asset.hourly),
            expandable: false, parentId: line.id,
          });
        }
      }
    }
    return out;
  }, [data, expanded]);

  // Per-row column values + recompute total for the current view (so Total matches displayed columns)
  const rowsWithCols = useMemo(
    () =>
      rows.map((r) => {
        const cols = valuesFor(r.id, r.hourly);
        return { row: r, cols, total: sumArr(cols) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, viewMode, columns],
  );

  const maxTotal = Math.max(...rowsWithCols.filter((x) => x.row.kind === "unit").map((x) => x.total), 1);

  return (
    <>
      {isIntraday && (
        <div className="energy-view-toggle" role="tablist" aria-label="View mode">
          <button
            type="button"
            role="tab"
            aria-selected={intradayMode === "hour"}
            className={`energy-view-toggle-btn${intradayMode === "hour" ? " is-active" : ""}`}
            onClick={() => setIntradayMode("hour")}
          >
            Hourly
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={intradayMode === "shift"}
            className={`energy-view-toggle-btn${intradayMode === "shift" ? " is-active" : ""}`}
            onClick={() => setIntradayMode("shift")}
          >
            Shift Summary
          </button>
        </div>
      )}

      <div className="energy-tree-wrap">
        <div className="energy-tree-scroll">
          <table className="energy-tree-table">
            <thead>
              <tr>
                <th className="energy-tree-th energy-tree-col-item">Item</th>
                <th className="energy-tree-th energy-tree-col-total">Total (kWh)</th>
                {columns.map((label, i) => (
                  <th
                    key={label + i}
                    className={`energy-tree-th energy-tree-th-hour ${i % 2 === 0 ? "is-even" : "is-odd"}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsWithCols.map(({ row, cols, total }) => {
                const isOpen = expanded.has(row.id);
                const isSelected = row.kind === "asset" && row.id === selectedAssetId;
                const pct = Math.min(100, (total / maxTotal) * 100);
                return (
                  <tr
                    key={row.id}
                    className={`energy-tree-row energy-tree-row--${row.kind}${isSelected ? " is-selected" : ""}`}
                    onClick={() => row.kind === "asset" && setSelectedAssetId(row.id)}
                  >
                    <td className="energy-tree-td energy-tree-col-item">
                      <div className="energy-tree-item" style={{ paddingLeft: `${row.depth * 18}px` }}>
                        {row.expandable ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggle(row.id); }}
                            className={`energy-tree-caret${isOpen ? " is-open" : ""}`}
                            aria-label={isOpen ? "Collapse" : "Expand"}
                          >
                            <ChevronRight />
                          </button>
                        ) : (
                          <span className="energy-tree-caret energy-tree-caret--placeholder" />
                        )}
                        <span className="energy-tree-name">{row.name}</span>
                        {row.expandable && (
                          <span className="energy-tree-badge">{row.childLabel}</span>
                        )}
                      </div>
                    </td>
                    <td className="energy-tree-td energy-tree-col-total">
                      <div className="energy-tree-total">
                        <span className="energy-tree-total-val">{fmt(total)}</span>
                        <span className="energy-tree-total-bar" aria-hidden>
                          <span className="energy-tree-total-bar-fill" style={{ width: `${pct}%` }} />
                        </span>
                      </div>
                    </td>
                    {cols.map((v, i) => (
                      <td key={i} className={`energy-tree-td energy-tree-td-hour ${i % 2 === 0 ? "is-even" : "is-odd"}`}>
                        {fmt(v)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {selectedAsset && (
        <AssetTrendChart asset={selectedAsset} onClose={() => setSelectedAssetId(null)} />
      )}
    </>
  );
};

export default EnergyTreeTable;
