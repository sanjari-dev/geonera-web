// src/components/geonera/candlestick-display.tsx
"use client";

import type { PredictionLogItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface CandlestickDisplayProps {
  selectedPrediction: PredictionLogItem | null;
}

// Custom shape for the candlestick
const CandlestickShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload || !payload.ohlc) return null;

  const [low, open, close, high] = payload.ohlc;
  const isBullish = close >= open;
  
  // Use CSS variables for theme-aware colors
  const fillColor = isBullish ? 'var(--color-bullish)' : 'var(--color-bearish)';
  const strokeColor = fillColor;


  const yAxisMin = payload.domainY[0];
  const yAxisMax = payload.domainY[1];
  const yRange = yAxisMax - yAxisMin;

  if (yRange === 0) return null; // Avoid division by zero

  const scaleY = (value: number) => y + ((yAxisMax - value) / yRange) * height;

  const highCoord = scaleY(high);
  const lowCoord = scaleY(low);
  const openCoord = scaleY(open);
  const closeCoord = scaleY(close);

  const bodyY = Math.min(openCoord, closeCoord);
  const bodyHeight = Math.max(1, Math.abs(openCoord - closeCoord)); // Min height of 1px for visibility

  const wickX = x + width / 2;

  return (
    <g>
      {/* Wick */}
      <line x1={wickX} y1={highCoord} x2={wickX} y2={lowCoord} stroke={strokeColor} strokeWidth={1.5} />
      {/* Body */}
      <rect x={x} y={bodyY} width={width} height={bodyHeight} fill={fillColor} />
    </g>
  );
};

const chartConfig = {
  price: { label: "Price" },
  bullish: { color: "hsl(var(--chart-2))" }, // Greenish
  bearish: { color: "hsl(var(--chart-1))" }, // Reddish
} satisfies ChartConfig;


export function CandlestickDisplay({ selectedPrediction }: CandlestickDisplayProps) {
  const ohlcData = selectedPrediction?.predictionOutcome;
  const chartData = ohlcData && ohlcData.openPrice !== undefined && ohlcData.highPrice !== undefined && ohlcData.lowPrice !== undefined && ohlcData.closePrice !== undefined
    ? [{
        name: selectedPrediction.currencyPair,
        currencyPair: selectedPrediction.currencyPair, // Pass for potential direct labeling in shape
        ohlc: [ohlcData.lowPrice, ohlcData.openPrice, ohlcData.closePrice, ohlcData.highPrice],
        // This 'value' dataKey is just to make the Bar component render. The shape does the real work.
        value: ohlcData.highPrice, 
        domainY: [ohlcData.lowPrice * 0.995, ohlcData.highPrice * 1.005] // slightly padded domain
      }]
    : [];

  const yDomain = chartData.length > 0 ? chartData[0].domainY : ['auto', 'auto'];


  return (
    <Card className="shadow-xl h-full">
      <CardHeader className="bg-secondary/30 p-4 rounded-t-lg">
        <CardTitle className="text-xl font-semibold text-primary flex items-center">
          <TrendingUp className="h-6 w-6 mr-2" />
          Candlestick View
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {selectedPrediction ? `Visual for ${selectedPrediction.currencyPair}` : "Select a prediction."}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 h-[calc(100%-theme(spacing.24))]">
        {!selectedPrediction || chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Info className="h-12 w-12 mb-3" />
            <p>No market data available for selected prediction or no prediction selected.</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="w-full h-full min-h-[300px]">
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 20, right: 10, left: -25, bottom: 5 }} // Adjusted left margin
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 10)}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tick={false} // Hide Y-axis ticks (numbers)
                domain={yDomain as [number, number]} 
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent 
                    labelFormatter={(label, payload) => {
                       if (payload && payload.length > 0 && payload[0].payload.ohlc) {
                         return `${payload[0].payload.name}`;
                       }
                       return label;
                    }}
                    formatter={(value, name, item) => {
                      if (item.payload.ohlc) {
                        const [l, o, c, h] = item.payload.ohlc;
                        return (
                          <div className="flex flex-col text-xs">
                            <span>Open: ${o.toFixed(selectedPrediction?.currencyPair === "BTC/USD" ? 0 : 2)}</span>
                            <span>High: ${h.toFixed(selectedPrediction?.currencyPair === "BTC/USD" ? 0 : 2)}</span>
                            <span>Low: ${l.toFixed(selectedPrediction?.currencyPair === "BTC/USD" ? 0 : 2)}</span>
                            <span>Close: ${c.toFixed(selectedPrediction?.currencyPair === "BTC/USD" ? 0 : 2)}</span>
                          </div>
                        );
                      }
                      return value;
                    }}
                  />
                }
              />
              <Bar dataKey="value" shape={<CandlestickShape />} barSize={50} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

