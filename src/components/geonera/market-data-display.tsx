import React from 'react';
import { Briefcase, LogIn, ArrowUpCircle, ArrowDownCircle, LogOut, BarChart3 } from 'lucide-react';
import type { CurrencyPair, PipsPredictionOutcome, PredictionLogItem } from '@/types';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const formatPrice = (price?: number, currencyPair?: CurrencyPair) => {
  if (price === undefined || price === null) return "N/A";
  const fractionDigits = currencyPair === "BTC/USD" ? 0 : (currencyPair === "USD/JPY" ? 3 : 2);
  return price.toLocaleString(undefined, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
};

const formatVolume = (volume?: number) => {
  if (volume === undefined || volume === null) return "N/A";
  return volume.toLocaleString();
};

interface MarketDataDisplayProps {
  ohlcData: PipsPredictionOutcome; 
  selectedPrediction: PredictionLogItem; 
}

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

const MarketDataDisplay: React.FC<MarketDataDisplayProps> = ({ ohlcData, selectedPrediction }) => {
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
    <div className="w-full space-y-2">
      <div className="flex items-center space-x-2 mb-1">
        <Briefcase className="h-5 w-5 text-primary" />
        <span className="font-semibold text-primary whitespace-nowrap">Market Data:</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Column 1: Textual Market Data */}
        <div className="pl-2 space-y-1">
          {ohlcData.openPrice !== undefined && (
            <div className="flex items-center space-x-2">
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                <LogIn className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="font-medium whitespace-nowrap text-sm">Open:</span>
              <span className="text-sm whitespace-nowrap">
                {formatPrice(ohlcData.openPrice, selectedPrediction.currencyPair)}
              </span>
            </div>
          )}
          {ohlcData.highPrice !== undefined && (
            <div className="flex items-center space-x-2">
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="font-medium whitespace-nowrap text-sm">High:</span>
              <span className="text-sm whitespace-nowrap">
                {formatPrice(ohlcData.highPrice, selectedPrediction.currencyPair)}
              </span>
            </div>
          )}
          {ohlcData.lowPrice !== undefined && (
            <div className="flex items-center space-x-2">
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="font-medium whitespace-nowrap text-sm">Low:</span>
              <span className="text-sm whitespace-nowrap">
                {formatPrice(ohlcData.lowPrice, selectedPrediction.currencyPair)}
              </span>
            </div>
          )}
          {ohlcData.closePrice !== undefined && (
            <div className="flex items-center space-x-2">
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                <LogOut className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="font-medium whitespace-nowrap text-sm">Close:</span>
              <span className="text-sm whitespace-nowrap">
                {formatPrice(ohlcData.closePrice, selectedPrediction.currencyPair)}
              </span>
            </div>
          )}
          {ohlcData.volume !== undefined && (
            <div className="flex items-center space-x-2">
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="font-medium whitespace-nowrap text-sm">Volume:</span>
              <span className="text-sm whitespace-nowrap">
                {formatVolume(ohlcData.volume)}
              </span>
            </div>
          )}
        </div>
        {/* Column 2: Chart */}
        <div className="w-full h-48 md:h-auto md:min-h-[150px]">
            <ChartContainer config={chartConfig} className="w-full h-full aspect-auto"> {/* Removed aspect-video */}
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
                        if (payload && payload.length > 0 && payload[0].payload.ohlc) return `${payload[0].payload.name}`;
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
                <Bar dataKey="value" shape={<CandlestickShape />} barSize={30} /> {/* Reduced barSize */}
            </BarChart>
            </ChartContainer>
        </div>
      </div>
    </div>
  );
};

export default MarketDataDisplay;
