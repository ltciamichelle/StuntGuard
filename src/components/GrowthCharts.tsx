'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Anak, Pengukuran } from '@/types/database';
import {
  calculateReferenceValue,
  calculateAgeInMonthsExact,
  loadWhoReference,
  getTbuChartSentence,
  getBbuChartSentence,
} from '@/lib/growthChartUtils';
import { Ruler, Scale, Info, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';

interface GrowthChartsProps {
  child: Anak;
  measurements: Pengukuran[];
  selectedMeasurementId?: string;
  className?: string;
}

interface ChartDataPoint {
  month: number;
  sdMinus3: number;
  sdMinus2: number;
  sdMinus1: number;
  median: number;
  sdPlus1: number;
  sdPlus2: number;
  sdPlus3: number;
  childValue: number | null;
  measurement?: Pengukuran | null;
  isHighlighted?: boolean;
}

export function GrowthCharts({
  child,
  measurements,
  selectedMeasurementId,
  className = '',
}: GrowthChartsProps) {
  const [mounted, setMounted] = useState(false);
  const [tbuRef, setTbuRef] = useState<any[]>([]);
  const [bbuRef, setBbuRef] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active tab to switch or view both charts
  const [activeChart, setActiveChart] = useState<'tbu' | 'bbu'>('tbu');

  useEffect(() => {
    setMounted(true);
    async function loadData() {
      try {
        const [tbuData, bbuData] = await Promise.all([
          loadWhoReference('tbu', child.jenis_kelamin),
          loadWhoReference('bbu', child.jenis_kelamin),
        ]);
        setTbuRef(tbuData);
        setBbuRef(bbuData);
      } catch (err) {
        console.error('Error loading WHO growth reference:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [child.jenis_kelamin]);

  // Determine which measurement is highlighted (selected or latest)
  const highlightedMeasurement = useMemo(() => {
    if (!measurements || measurements.length === 0) return null;
    if (selectedMeasurementId) {
      const found = measurements.find((m) => m.id === selectedMeasurementId);
      if (found) return found;
    }
    // Default to latest measurement by date
    return [...measurements].sort(
      (a, b) => new Date(b.tgl_ukur).getTime() - new Date(a.tgl_ukur).getTime()
    )[0];
  }, [measurements, selectedMeasurementId]);

  // Prepare TB/U chart data (0 to 60 months)
  const tbuChartData = useMemo<ChartDataPoint[]>(() => {
    if (tbuRef.length < 61) return [];

    // Map each measurement to its nearest/exact month index for plotting
    const childPointsByMonth = new Map<number, { val: number; m: Pengukuran; isSelected: boolean }>();
    for (const m of measurements) {
      const ageMonths = calculateAgeInMonthsExact(child.tgl_lahir, m.tgl_ukur);
      const roundedMonth = Math.min(60, Math.max(0, Math.round(ageMonths)));
      const isSelected = highlightedMeasurement?.id === m.id;
      childPointsByMonth.set(roundedMonth, {
        val: m.tinggi_cm,
        m,
        isSelected,
      });
    }

    return tbuRef.map((ref) => {
      const month = ref.umur_bulan;
      const sdMinus3 = calculateReferenceValue(ref.l, ref.m, ref.s, -3);
      const sdMinus2 = calculateReferenceValue(ref.l, ref.m, ref.s, -2);
      const sdMinus1 = calculateReferenceValue(ref.l, ref.m, ref.s, -1);
      const median = calculateReferenceValue(ref.l, ref.m, ref.s, 0);
      const sdPlus1 = calculateReferenceValue(ref.l, ref.m, ref.s, 1);
      const sdPlus2 = calculateReferenceValue(ref.l, ref.m, ref.s, 2);
      const sdPlus3 = calculateReferenceValue(ref.l, ref.m, ref.s, 3);

      const childPoint = childPointsByMonth.get(month);

      return {
        month,
        sdMinus3: Math.round(sdMinus3 * 10) / 10,
        sdMinus2: Math.round(sdMinus2 * 10) / 10,
        sdMinus1: Math.round(sdMinus1 * 10) / 10,
        median: Math.round(median * 10) / 10,
        sdPlus1: Math.round(sdPlus1 * 10) / 10,
        sdPlus2: Math.round(sdPlus2 * 10) / 10,
        sdPlus3: Math.round(sdPlus3 * 10) / 10,
        childValue: childPoint ? childPoint.val : null,
        measurement: childPoint ? childPoint.m : null,
        isHighlighted: childPoint ? childPoint.isSelected : false,
      };
    });
  }, [tbuRef, measurements, child.tgl_lahir, highlightedMeasurement]);

  // Prepare BB/U chart data (0 to 60 months)
  const bbuChartData = useMemo<ChartDataPoint[]>(() => {
    if (bbuRef.length < 61) return [];

    const childPointsByMonth = new Map<number, { val: number; m: Pengukuran; isSelected: boolean }>();
    for (const m of measurements) {
      const ageMonths = calculateAgeInMonthsExact(child.tgl_lahir, m.tgl_ukur);
      const roundedMonth = Math.min(60, Math.max(0, Math.round(ageMonths)));
      const isSelected = highlightedMeasurement?.id === m.id;
      childPointsByMonth.set(roundedMonth, {
        val: m.berat_kg,
        m,
        isSelected,
      });
    }

    return bbuRef.map((ref) => {
      const month = ref.umur_bulan;
      const sdMinus3 = calculateReferenceValue(ref.l, ref.m, ref.s, -3);
      const sdMinus2 = calculateReferenceValue(ref.l, ref.m, ref.s, -2);
      const sdMinus1 = calculateReferenceValue(ref.l, ref.m, ref.s, -1);
      const median = calculateReferenceValue(ref.l, ref.m, ref.s, 0);
      const sdPlus1 = calculateReferenceValue(ref.l, ref.m, ref.s, 1);
      const sdPlus2 = calculateReferenceValue(ref.l, ref.m, ref.s, 2);
      const sdPlus3 = calculateReferenceValue(ref.l, ref.m, ref.s, 3);

      const childPoint = childPointsByMonth.get(month);

      return {
        month,
        sdMinus3: Math.round(sdMinus3 * 10) / 10,
        sdMinus2: Math.round(sdMinus2 * 10) / 10,
        sdMinus1: Math.round(sdMinus1 * 10) / 10,
        median: Math.round(median * 10) / 10,
        sdPlus1: Math.round(sdPlus1 * 10) / 10,
        sdPlus2: Math.round(sdPlus2 * 10) / 10,
        sdPlus3: Math.round(sdPlus3 * 10) / 10,
        childValue: childPoint ? childPoint.val : null,
        measurement: childPoint ? childPoint.m : null,
        isHighlighted: childPoint ? childPoint.isSelected : false,
      };
    });
  }, [bbuRef, measurements, child.tgl_lahir, highlightedMeasurement]);

  if (!mounted || loading) {
    return (
      <div className={`p-6 rounded-3xl bg-white border-2 border-slate-200 text-center ${className}`}>
        <div className="w-8 h-8 border-3 border-berry border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-[14px] font-bold text-slate-600">Memuat kurva pertumbuhan WHO...</p>
      </div>
    );
  }

  // Custom Dot Renderer for the Child's Line with Shape + Color accessibility
  const renderChildDot = (props: any, unit: string) => {
    const { cx, cy, payload } = props;
    if (payload.childValue === null || payload.childValue === undefined) {
      return null;
    }

    const isSelected = payload.isHighlighted;
    const status = payload.measurement?.status;

    let strokeColor = '#44636D';
    let fillColor = '#44636D';

    if (status === 'hijau') {
      strokeColor = '#10B981';
      fillColor = '#10B981';
    } else if (status === 'kuning') {
      strokeColor = '#F59E0B';
      fillColor = '#F59E0B';
    } else if (status === 'merah') {
      strokeColor = '#EF4444';
      fillColor = '#EF4444';
    }

    if (isSelected) {
      return (
        <g key={`dot-highlight-${payload.month}`}>
          {/* Outer glow ring */}
          <circle cx={cx} cy={cy} r={11} fill={fillColor} fillOpacity={0.25} />
          {/* Main circle dot */}
          <circle cx={cx} cy={cy} r={7} fill="#ffffff" stroke={strokeColor} strokeWidth={3.5} />
          <circle cx={cx} cy={cy} r={3.5} fill={fillColor} />
          {/* Value text above dot */}
          <text
            x={cx}
            y={cy - 14}
            textAnchor="middle"
            fill="#1E293B"
            fontSize={12}
            fontWeight="bold"
            className="select-none"
          >
            {payload.childValue} {unit}
          </text>
        </g>
      );
    }

    // Normal dot
    return (
      <g key={`dot-${payload.month}`}>
        <circle cx={cx} cy={cy} r={5} fill="#ffffff" stroke={strokeColor} strokeWidth={2.5} />
        <circle cx={cx} cy={cy} r={2} fill={fillColor} />
      </g>
    );
  };

  // Custom tooltip for inspecting points
  const renderCustomTooltip = ({ active, payload, label }: any, unit: string) => {
    if (!active || !payload || payload.length === 0) return null;
    const data: ChartDataPoint = payload[0].payload;

    return (
      <div className="bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl text-[12px] border border-slate-700 max-w-[220px]">
        <p className="font-extrabold text-[13px] border-b border-slate-700 pb-1 mb-1.5 text-slate-200">
          Usia {data.month} Bulan
        </p>

        {data.childValue !== null && (
          <div className="mb-2 p-1.5 rounded-xl bg-slateTeal/40 border border-slateTeal flex items-center justify-between">
            <span className="font-semibold text-teal-200">Pengukuran:</span>
            <span className="font-extrabold text-white text-[13px]">
              {data.childValue} {unit}
            </span>
          </div>
        )}

        <div className="space-y-0.5 text-slate-300 font-mono text-[11px]">
          <div className="flex justify-between">
            <span className="text-emerald-400">+2 SD:</span>
            <span>{data.sdPlus2} {unit}</span>
          </div>
          <div className="flex justify-between font-bold text-white">
            <span className="text-teal-300">Median:</span>
            <span>{data.median} {unit}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-400">-2 SD:</span>
            <span>{data.sdMinus2} {unit}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-rose-400">-3 SD:</span>
            <span>{data.sdMinus3} {unit}</span>
          </div>
        </div>
      </div>
    );
  };

  const highlightedAge = highlightedMeasurement
    ? calculateAgeInMonthsExact(child.tgl_lahir, highlightedMeasurement.tgl_ukur)
    : 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Tab Switcher: TB/U vs BB/U */}
      <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200">
        <button
          type="button"
          id="btn-tab-tbu"
          onClick={() => setActiveChart('tbu')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-[13px] font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeChart === 'tbu'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Ruler size={16} className={activeChart === 'tbu' ? 'text-berry' : ''} />
          <span>Tinggi / Umur (TB/U)</span>
        </button>

        <button
          type="button"
          id="btn-tab-bbu"
          onClick={() => setActiveChart('bbu')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-[13px] font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeChart === 'bbu'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Scale size={16} className={activeChart === 'bbu' ? 'text-slateTeal' : ''} />
          <span>Berat / Umur (BB/U)</span>
        </button>
      </div>

      {/* CHART 1: TINGGI MENURUT UMUR (TB/U) */}
      {activeChart === 'tbu' && (
        <div
          id="chart-card-tbu"
          className="p-5 rounded-3xl bg-white border-2 border-slate-200/90 shadow-soft space-y-4"
        >
          {/* Header & Highlighted Measurement Display */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[11px] font-extrabold text-slateTeal uppercase tracking-wider block">
                Kurva Baku WHO • {child.jenis_kelamin === 'L' ? 'Laki-Laki' : 'Perempuan'}
              </span>
              <h3 className="text-[17px] font-extrabold text-slate-900 leading-snug">
                Tinggi menurut Umur (TB/U)
              </h3>
            </div>

            {/* Highlighted Value (24px+, Bold) */}
            {highlightedMeasurement && (
              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-500 block">
                  Usia {highlightedAge} Bulan
                </span>
                <span className="text-[26px] font-black text-slateTeal tracking-tight leading-none">
                  {highlightedMeasurement.tinggi_cm}{' '}
                  <span className="text-[14px] font-bold text-slate-500">cm</span>
                </span>
              </div>
            )}
          </div>

          {/* Color Band Legend (Never color alone, text labels included) */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100/70 border border-emerald-300 text-emerald-900">
              <CheckCircle2 size={12} className="text-emerald-700" />
              <span>Normal (&gt; -1 SD)</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100/70 border border-amber-300 text-amber-900">
              <AlertTriangle size={12} className="text-amber-700" />
              <span>Waspada (-2 s/d -1 SD)</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100/70 border border-rose-300 text-rose-900">
              <AlertOctagon size={12} className="text-rose-700" />
              <span>Stunting (&lt; -2 SD)</span>
            </span>
          </div>

          {/* Chart Canvas with horizontal scroll wrapper for small mobile screens */}
          <div className="overflow-x-auto -mx-2 px-2">
            <div className="min-w-[320px] w-full h-[270px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={tbuChartData}
                  margin={{ top: 20, right: 15, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  
                  {/* Color Bands (Soft Tints) */}
                  {/* Top: Light Green (above -1 SD up to +3 SD) */}
                  <Area
                    type="monotone"
                    dataKey="sdPlus3"
                    fill="#DCFCE7"
                    fillOpacity={0.45}
                    stroke="none"
                    isAnimationActive={false}
                  />
                  {/* Middle: Light Yellow (between -2 SD and -1 SD) */}
                  <Area
                    type="monotone"
                    dataKey="sdMinus1"
                    fill="#FEF3C7"
                    fillOpacity={0.55}
                    stroke="none"
                    isAnimationActive={false}
                  />
                  {/* Bottom: Light Red (below -2 SD) */}
                  <Area
                    type="monotone"
                    dataKey="sdMinus2"
                    fill="#FEE2E2"
                    fillOpacity={0.55}
                    stroke="none"
                    isAnimationActive={false}
                  />

                  {/* Reference Lines (-3, -2, -1, Median, +1, +2, +3 SD) */}
                  <Line
                    type="monotone"
                    dataKey="sdPlus3"
                    stroke="#10B981"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                    dot={false}
                    name="+3 SD"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="sdPlus2"
                    stroke="#10B981"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                    name="+2 SD"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="sdPlus1"
                    stroke="#84CC16"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                    dot={false}
                    name="+1 SD"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="median"
                    stroke="#059669"
                    strokeWidth={2.5}
                    dot={false}
                    name="Median (0 SD)"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="sdMinus1"
                    stroke="#F59E0B"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                    dot={false}
                    name="-1 SD"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="sdMinus2"
                    stroke="#EF4444"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                    name="-2 SD"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="sdMinus3"
                    stroke="#B91C1C"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                    dot={false}
                    name="-3 SD"
                    isAnimationActive={false}
                  />

                  {/* Child's Line & Dots (Teal #44636D) */}
                  <Line
                    type="linear"
                    dataKey="childValue"
                    stroke="#44636D"
                    strokeWidth={3.5}
                    connectNulls
                    dot={(props: any) => renderChildDot(props, 'cm')}
                    activeDot={{ r: 8, stroke: '#44636D', strokeWidth: 3, fill: '#fff' }}
                    name="Pengukuran Anak"
                    isAnimationActive={false}
                  />

                  <XAxis
                    dataKey="month"
                    type="number"
                    domain={[0, 60]}
                    ticks={[0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60]}
                    stroke="#94A3B8"
                    tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                    unit=" bln"
                  />
                  <YAxis
                    domain={[45, 125]}
                    stroke="#94A3B8"
                    tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                    unit=" cm"
                  />
                  <Tooltip content={(props: any) => renderCustomTooltip(props, 'cm')} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Plain Indonesian sentence explaining status */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <p className="text-[13px] font-bold text-slate-800 leading-snug">
              {getTbuChartSentence(highlightedMeasurement?.z_tbu)}
            </p>
          </div>

          {/* Mandatory Visual Guide Note */}
          <p className="text-[11px] text-slate-500 font-medium text-center italic">
            * Pita warna hanya panduan visual. Status resmi dihitung sistem.
          </p>
        </div>
      )}

      {/* CHART 2: BERAT MENURUT UMUR (BB/U) */}
      {activeChart === 'bbu' && (
        <div
          id="chart-card-bbu"
          className="p-5 rounded-3xl bg-white border-2 border-slate-200/90 shadow-soft space-y-4"
        >
          {/* Header & Highlighted Measurement Display */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[11px] font-extrabold text-slateTeal uppercase tracking-wider block">
                Kurva Baku WHO • {child.jenis_kelamin === 'L' ? 'Laki-Laki' : 'Perempuan'}
              </span>
              <h3 className="text-[17px] font-extrabold text-slate-900 leading-snug">
                Berat menurut Umur (BB/U)
              </h3>
            </div>

            {/* Highlighted Value (24px+, Bold) */}
            {highlightedMeasurement && (
              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-500 block">
                  Usia {highlightedAge} Bulan
                </span>
                <span className="text-[26px] font-black text-slateTeal tracking-tight leading-none">
                  {highlightedMeasurement.berat_kg}{' '}
                  <span className="text-[14px] font-bold text-slate-500">kg</span>
                </span>
              </div>
            )}
          </div>

          {/* Color Band Legend (BB/U: weight alone never shows red) */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100/70 border border-emerald-300 text-emerald-900">
              <CheckCircle2 size={12} className="text-emerald-700" />
              <span>Normal (&gt; -2 SD)</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100/70 border border-amber-300 text-amber-900">
              <AlertTriangle size={12} className="text-amber-700" />
              <span>Berat Kurang (&lt; -2 SD)</span>
            </span>
          </div>

          {/* Chart Canvas with horizontal scroll wrapper */}
          <div className="overflow-x-auto -mx-2 px-2">
            <div className="min-w-[320px] w-full h-[270px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={bbuChartData}
                  margin={{ top: 20, right: 15, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />

                  {/* Color Bands (Soft Tints) */}
                  {/* Top: Light Green (above -2 SD up to +3 SD) */}
                  <Area
                    type="monotone"
                    dataKey="sdPlus3"
                    fill="#DCFCE7"
                    fillOpacity={0.45}
                    stroke="none"
                    isAnimationActive={false}
                  />
                  {/* Bottom: Light Yellow (below -2 SD, weight alone never shows red) */}
                  <Area
                    type="monotone"
                    dataKey="sdMinus2"
                    fill="#FEF3C7"
                    fillOpacity={0.65}
                    stroke="none"
                    isAnimationActive={false}
                  />

                  {/* Reference Lines (-3, -2, -1, Median, +1, +2, +3 SD) */}
                  <Line
                    type="monotone"
                    dataKey="sdPlus3"
                    stroke="#10B981"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                    dot={false}
                    name="+3 SD"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="sdPlus2"
                    stroke="#10B981"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                    name="+2 SD"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="sdPlus1"
                    stroke="#84CC16"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                    dot={false}
                    name="+1 SD"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="median"
                    stroke="#059669"
                    strokeWidth={2.5}
                    dot={false}
                    name="Median (0 SD)"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="sdMinus1"
                    stroke="#F59E0B"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                    dot={false}
                    name="-1 SD"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="sdMinus2"
                    stroke="#D97706"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                    name="-2 SD"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="sdMinus3"
                    stroke="#B45309"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                    dot={false}
                    name="-3 SD"
                    isAnimationActive={false}
                  />

                  {/* Child's Line & Dots (Teal #44636D) */}
                  <Line
                    type="linear"
                    dataKey="childValue"
                    stroke="#44636D"
                    strokeWidth={3.5}
                    connectNulls
                    dot={(props: any) => renderChildDot(props, 'kg')}
                    activeDot={{ r: 8, stroke: '#44636D', strokeWidth: 3, fill: '#fff' }}
                    name="Pengukuran Anak"
                    isAnimationActive={false}
                  />

                  <XAxis
                    dataKey="month"
                    type="number"
                    domain={[0, 60]}
                    ticks={[0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60]}
                    stroke="#94A3B8"
                    tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                    unit=" bln"
                  />
                  <YAxis
                    domain={[2, 26]}
                    stroke="#94A3B8"
                    tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                    unit=" kg"
                  />
                  <Tooltip content={(props: any) => renderCustomTooltip(props, 'kg')} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Plain Indonesian sentence explaining status */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <p className="text-[13px] font-bold text-slate-800 leading-snug">
              {getBbuChartSentence(highlightedMeasurement?.z_bbu)}
            </p>
          </div>

          {/* Mandatory Visual Guide Note */}
          <p className="text-[11px] text-slate-500 font-medium text-center italic">
            * Pita warna hanya panduan visual. Status resmi dihitung sistem.
          </p>
        </div>
      )}
    </div>
  );
}
