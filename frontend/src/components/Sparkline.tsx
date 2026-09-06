import { useMemo } from "react";

interface SparklineProps {
  open: number;
  high: number;
  low: number;
  close: number;
  isUp: boolean;
  width?: number;
  height?: number;
}

export default function Sparkline({
  open,
  high,
  low,
  close,
  isUp,
  width = 100,
  height = 32,
}: SparklineProps) {
  // Generate realistic intraday points between open, high, low, close
  const points = useMemo(() => {
    if (!open || !close) {
      return `M 0,${height / 2} L ${width},${height / 2}`;
    }

    const min = Math.min(open, low || open * 0.98, close);
    const max = Math.max(open, high || open * 1.02, close);
    const range = max - min || 1;

    // 8 pseudo-intraday data points
    const rawValues = [
      open,
      open + (high - open) * 0.4,
      open + (low - open) * 0.7,
      open + (close - open) * 0.3 + (high - low) * 0.2,
      open + (close - open) * 0.6 - (high - low) * 0.15,
      open + (close - open) * 0.8 + (high - low) * 0.1,
      close + (Math.sin(open) * 0.05 * range),
      close,
    ];

    const padding = 3;
    const innerH = height - padding * 2;
    const stepX = width / (rawValues.length - 1);

    const coords = rawValues.map((v, i) => {
      const x = i * stepX;
      // Invert Y because SVG 0 is at the top
      const normalized = (v - min) / range;
      const y = height - padding - normalized * innerH;
      return { x, y: Math.max(padding, Math.min(height - padding, y)) };
    });

    // Build smooth cubic bezier curve
    let d = `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      d += ` C ${cpX.toFixed(1)},${p0.y.toFixed(1)} ${cpX.toFixed(1)},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
    }
    return d;
  }, [open, high, low, close, width, height]);

  const strokeColor = isUp ? "#22c55e" : "#ef4444";
  const gradientId = `spark-grad-${isUp ? "up" : "dn"}-${Math.floor(open)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="sparkline-svg"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      {/* Area under curve */}
      <path
        d={`${points} L ${width},${height} L 0,${height} Z`}
        fill={`url(#${gradientId})`}
      />
      {/* Stroke line */}
      <path
        d={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
