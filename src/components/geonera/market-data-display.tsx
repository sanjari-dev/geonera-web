import React from 'react';
import { Briefcase, LogIn, ArrowUpCircle, ArrowDownCircle, LogOut, BarChart3 } from 'lucide-react';
import { CurrencyPair, PipsPredictionOutcome, PredictionLogItem } from '@/types';

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
  ohlcData: PipsPredictionOutcome; // Replace 'any' with a more specific type if you have one for your OHLC data
  selectedPrediction: PredictionLogItem; // Replace 'any' with a more specific type if you have one for your prediction data
  classHeight: string | undefined
}

const MarketDataDisplay: React.FC<MarketDataDisplayProps> = ({ ohlcData, selectedPrediction, classHeight }) => {
  return (
    <div className={"pt-2 space-y-2 " + classHeight}>
      <div className="flex items-center space-x-2 mb-1">
        <Briefcase className="h-5 w-5 text-primary" />
        <span className="font-semibold text-primary whitespace-nowrap">Market Data:</span>
      </div>
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
    </div>
  );
};

export default MarketDataDisplay;