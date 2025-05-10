// src/components/geonera/candlestick-display.tsx
"use client";

import type { PredictionLogItem, CurrencyPair } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface CandlestickDisplayProps {
  selectedPrediction: PredictionLogItem | null;
}

// Helper function for formatting price, kept here for potential future use or if shared
const formatPrice = (price?: number, currencyPair?: CurrencyPair) => {
    if (price === undefined || price === null) return "N/A";
    const fractionDigits = currencyPair === "BTC/USD" ? 0 : (currencyPair === "USD/JPY" ? 3 : 2);
    return price.toLocaleString(undefined, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
};


// Custom shape for the candlestick
const CandlestickShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload || !payload.ohlc) return null;

  const [low, open, close, high] = payload.ohlc;
  const isBullish = close >= open;
  
  const fillColor = isBullish ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-1))'; 
  const strokeColor = fillColor;


  const yAxisMin = payload.domainY[0];
  const yAxisMax = payload.domainY[1];
  const yRange = yAxisMax - yAxisMin;

  if (yRange === 0) return null; 

  const scaleY = (value: number) => y + ((yAxisMax - value) / yRange) * height;

  const highCoord = scaleY(high);
  const lowCoord = scaleY(low);
  const openCoord = scaleY(open);
  const closeCoord = scaleY(close);

  const bodyY = Math.min(openCoord, closeCoord);
  const bodyHeight = Math.max(1, Math.abs(openCoord - closeCoord)); 

  const wickX = x + width / 2;

  return (
    <g>
      <line x1={wickX} y1={highCoord} x2={wickX} y2={lowCoord} stroke={strokeColor} strokeWidth={1.5} />
      <rect x={x} y={bodyY} width={width} height={bodyHeight} fill={fillColor} />
    </g>
  );
};

const chartConfig = {
  price: { label: "Price" },
  bullish: { color: "hsl(var(--chart-2))" }, 
  bearish: { color: "hsl(var(--chart-1))" }, 
} satisfies ChartConfig;


export function CandlestickDisplay({ selectedPrediction }: CandlestickDisplayProps) {
  const ohlcData = selectedPrediction?.predictionOutcome;
  const chartData = ohlcData && ohlcData.openPrice !== undefined && ohlcData.highPrice !== undefined && ohlcData.lowPrice !== undefined && ohlcData.closePrice !== undefined
    ? [{
        name: selectedPrediction.currencyPair,
        currencyPair: selectedPrediction.currencyPair,
        ohlc: [ohlcData.lowPrice, ohlcData.openPrice, ohlcData.closePrice, ohlcData.highPrice],
        value: ohlcData.highPrice, 
        domainY: [ohlcData.lowPrice * 0.995, ohlcData.highPrice * 1.005] 
      }]
    : [];

  const yDomain = chartData.length > 0 ? chartData[0].domainY : ['auto', 'auto'];

  return (
    <Card className="shadow-xl h-full flex flex-col">
      <CardHeader className="bg-secondary/30 p-4 rounded-t-lg">
        <CardTitle className="text-xl font-semibold text-primary flex items-center">
          <TrendingUp className="h-6 w-6 mr-2" />
          Candlestick View
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {selectedPrediction ? `Visual for ${selectedPrediction.currencyPair}` : "Select a prediction."}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        {!selectedPrediction || chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Info className="h-12 w-12 mb-3" />
            <p>No market data available for selected prediction or no prediction selected.</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="w-full h-full min-h-[250px]">
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 20, right: 10, left: -25, bottom: 5 }} 
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
                tick={false} 
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
                            <span>Open: ${formatPrice(o, selectedPrediction?.currencyPair)}</span>
                            <span>High: ${formatPrice(h, selectedPrediction?.currencyPair)}</span>
                            <span>Low: ${formatPrice(l, selectedPrediction?.currencyPair)}</span>
                            <span>Close: ${formatPrice(c, selectedPrediction?.currencyPair)}</span>
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
      {/* Market data display removed from here */}
    </Card>
  );
}
