// src/components/geonera/candlestick-display.tsx
"use client";

import type { PredictionLogItem, CurrencyPair } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, TrendingUp, LogIn, LogOut, ArrowUpCircle, ArrowDownCircle, BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface CandlestickDisplayProps {
  selectedPrediction: PredictionLogItem | null;
}

// Helper functions (moved from PredictionDetailsPanel or similar)
const formatPrice = (price?: number, currencyPair?: CurrencyPair) => {
    if (price === undefined || price === null) return "N/A";
    const fractionDigits = currencyPair === "BTC/USD" ? 0 : (currencyPair === "USD/JPY" ? 3 : 2);
    return price.toLocaleString(undefined, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
};

const formatVolume = (volume?: number) => {
    if (volume === undefined || volume === null) return "N/A";
    return volume.toLocaleString();
};


// Custom shape for the candlestick
const CandlestickShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload || !payload.ohlc) return null;

  const [low, open, close, high] = payload.ohlc;
  const isBullish = close >= open;
  
  const fillColor = isBullish ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-1))'; // Using HSL variables
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
  const marketDataAvailable = selectedPrediction && ohlcData && (
    ohlcData.openPrice !== undefined ||
    ohlcData.closePrice !== undefined ||
    ohlcData.highPrice !== undefined ||
    ohlcData.lowPrice !== undefined ||
    ohlcData.volume !== undefined
  );

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
      <CardContent className="p-4 flex-grow"> {/* Removed explicit height calculation, rely on flex-grow */}
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
      {marketDataAvailable && selectedPrediction && ohlcData && (
        <CardFooter className="p-3 border-t bg-secondary/20 rounded-b-lg">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-3 gap-y-1.5 text-xs w-full">
            {ohlcData.openPrice !== undefined && (
            <div className="flex items-center space-x-1.5 whitespace-nowrap">
                <LogIn className="h-3.5 w-3.5 text-primary opacity-80" />
                <span className="font-medium">Open:</span>
                <span>{formatPrice(ohlcData.openPrice, selectedPrediction.currencyPair)}</span>
            </div>
            )}
            {ohlcData.highPrice !== undefined && (
            <div className="flex items-center space-x-1.5 whitespace-nowrap">
                <ArrowUpCircle className="h-3.5 w-3.5 text-green-600" />
                <span className="font-medium">High:</span>
                <span>{formatPrice(ohlcData.highPrice, selectedPrediction.currencyPair)}</span>
            </div>
            )}
            {ohlcData.lowPrice !== undefined && (
            <div className="flex items-center space-x-1.5 whitespace-nowrap">
                <ArrowDownCircle className="h-3.5 w-3.5 text-red-600" />
                <span className="font-medium">Low:</span>
                <span>{formatPrice(ohlcData.lowPrice, selectedPrediction.currencyPair)}</span>
            </div>
            )}
            {ohlcData.closePrice !== undefined && (
            <div className="flex items-center space-x-1.5 whitespace-nowrap">
                <LogOut className="h-3.5 w-3.5 text-primary opacity-80" />
                <span className="font-medium">Close:</span>
                <span>{formatPrice(ohlcData.closePrice, selectedPrediction.currencyPair)}</span>
            </div>
            )}
            {ohlcData.volume !== undefined && (
            <div className="flex items-center space-x-1.5 whitespace-nowrap">
                <BarChart3 className="h-3.5 w-3.5 text-primary opacity-80" />
                <span className="font-medium">Volume:</span>
                <span>{formatVolume(ohlcData.volume)}</span>
            </div>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

