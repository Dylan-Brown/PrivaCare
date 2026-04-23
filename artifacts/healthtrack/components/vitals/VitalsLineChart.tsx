import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Circle, Line, Rect, Text as SvgText, Defs, LinearGradient, Stop } from "react-native-svg";

type DataPoint = {
  value: number;
  label: string;
  timestamp: string;
};

type Props = {
  data: DataPoint[];
  width: number;
  height?: number;
  normalMin?: number;
  normalMax?: number;
  unit: string;
  color: string;
  colors: any;
  yMin?: number;
  yMax?: number;
  formatY?: (v: number) => string;
};

const PADDING = { top: 16, right: 12, bottom: 32, left: 44 };

export function VitalsLineChart({
  data,
  width,
  height = 180,
  normalMin,
  normalMax,
  color,
  colors,
  yMin: yMinProp,
  yMax: yMaxProp,
  formatY,
}: Props) {
  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  const { yMin, yMax, points } = useMemo(() => {
    if (data.length === 0) return { yMin: 0, yMax: 100, points: [] };

    const vals = data.map(d => d.value);
    const dataMin = Math.min(...vals);
    const dataMax = Math.max(...vals);

    const pad = (dataMax - dataMin) * 0.2 || 5;
    const rawMin = Math.min(dataMin - pad, normalMin !== undefined ? normalMin - pad : dataMin - pad);
    const rawMax = Math.max(dataMax + pad, normalMax !== undefined ? normalMax + pad : dataMax + pad);

    const yMin = yMinProp ?? Math.floor(rawMin);
    const yMax = yMaxProp ?? Math.ceil(rawMax);
    const range = yMax - yMin || 1;

    const xStep = data.length > 1 ? chartW / (data.length - 1) : chartW / 2;

    const points = data.map((d, i) => ({
      x: data.length > 1 ? i * xStep : chartW / 2,
      y: chartH - ((d.value - yMin) / range) * chartH,
      value: d.value,
      label: d.label,
      outOfRange:
        (normalMin !== undefined && d.value < normalMin) ||
        (normalMax !== undefined && d.value > normalMax),
    }));

    return { yMin, yMax, points };
  }, [data, chartW, chartH, normalMin, normalMax, yMinProp, yMaxProp]);

  const range = yMax - yMin || 1;

  const normalBandTop = normalMax !== undefined
    ? chartH - ((normalMax - yMin) / range) * chartH
    : null;
  const normalBandBottom = normalMin !== undefined
    ? chartH - ((normalMin - yMin) / range) * chartH
    : null;

  const yTicks = useMemo(() => {
    const count = 4;
    const step = (yMax - yMin) / count;
    return Array.from({ length: count + 1 }, (_, i) => yMin + step * i);
  }, [yMin, yMax]);

  const linePath = useMemo(() => {
    if (points.length < 2) return "";
    return points.reduce((acc, p, i) => {
      const px = PADDING.left + p.x;
      const py = PADDING.top + p.y;
      if (i === 0) return `M ${px} ${py}`;
      const prev = points[i - 1];
      const cpX = (PADDING.left + prev.x + px) / 2;
      return `${acc} C ${cpX} ${PADDING.top + prev.y}, ${cpX} ${py}, ${px} ${py}`;
    }, "");
  }, [points]);

  const fillPath = useMemo(() => {
    if (points.length < 2) return "";
    const base = PADDING.top + chartH;
    const start = `${PADDING.left + points[0].x} ${base}`;
    const end = `${PADDING.left + points[points.length - 1].x} ${base}`;
    return `${linePath} L ${end} L ${start} Z`;
  }, [linePath, points, chartH]);

  if (data.length === 0) {
    return (
      <View style={[styles.empty, { height, borderColor: colors.border }]}>
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No readings yet</Text>
      </View>
    );
  }

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={`grad_${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.18" />
          <Stop offset="1" stopColor={color} stopOpacity="0.0" />
        </LinearGradient>
      </Defs>

      {yTicks.map((tick, i) => {
        const y = PADDING.top + chartH - ((tick - yMin) / range) * chartH;
        return (
          <React.Fragment key={i}>
            <Line
              x1={PADDING.left}
              y1={y}
              x2={PADDING.left + chartW}
              y2={y}
              stroke={colors.border}
              strokeWidth={0.5}
              strokeDasharray="4,4"
            />
            <SvgText
              x={PADDING.left - 4}
              y={y + 4}
              fontSize={9}
              fill={colors.textTertiary}
              textAnchor="end"
              fontFamily="Inter_400Regular"
            >
              {formatY ? formatY(tick) : Math.round(tick)}
            </SvgText>
          </React.Fragment>
        );
      })}

      {normalBandTop !== null && normalBandBottom !== null && (
        <Rect
          x={PADDING.left}
          y={PADDING.top + normalBandTop}
          width={chartW}
          height={normalBandBottom - normalBandTop}
          fill={color}
          fillOpacity={0.08}
        />
      )}

      {points.length > 1 && (
        <>
          <Path d={fillPath} fill={`url(#grad_${color.replace("#", "")})`} />
          <Path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}

      {points.map((p, i) => {
        const cx = PADDING.left + p.x;
        const cy = PADDING.top + p.y;
        const dotColor = p.outOfRange ? "#FF6B6B" : color;
        return (
          <React.Fragment key={i}>
            <Circle cx={cx} cy={cy} r={5} fill={colors.card} stroke={dotColor} strokeWidth={2} />
            {data.length <= 8 && (
              <SvgText
                x={cx}
                y={PADDING.top + chartH + 14}
                fontSize={9}
                fill={colors.textTertiary}
                textAnchor="middle"
                fontFamily="Inter_400Regular"
              >
                {p.label}
              </SvgText>
            )}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: "dashed",
  },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
