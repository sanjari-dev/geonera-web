// src/components/geonera/pips-parameter-form.tsx
"use client";

import type { ChangeEvent } from 'react';
import { useEffect } from 'react'; // Removed useState as it's now controlled
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Coins, Bitcoin, Settings2 } from 'lucide-react';
import type { CurrencyPair, CurrencyOption, PipsTarget } from '@/types';
import { useToast } from "@/hooks/use-toast";

interface PipsParameterFormProps {
  currencyPair: CurrencyPair;
  pipsTarget: PipsTarget;
  historicalData: string;
  marketNews: string;
  onCurrencyChange: (value: CurrencyPair) => void;
  onPipsChange: (value: PipsTarget) => void;
  onHistoricalDataChange: (value: string) => void;
  onMarketNewsChange: (value: string) => void;
  isLoading: boolean;
}

const currencyOptions: CurrencyOption[] = [
  { value: "XAU/USD", label: "Gold (XAU/USD)", icon: Coins },
  { value: "BTC/USD", label: "Bitcoin (BTC/USD)", icon: Bitcoin },
];

export function PipsParameterForm({
  currencyPair,
  pipsTarget,
  historicalData,
  marketNews,
  onCurrencyChange,
  onPipsChange,
  onHistoricalDataChange,
  onMarketNewsChange,
  isLoading,
}: PipsParameterFormProps) {
  const { toast } = useToast();

  const handlePipsInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      onPipsChange(value);
    } else if (e.target.value === '') {
      onPipsChange(0); // Or handle validation in parent
    }
  };
  
  // Note: The useEffect that auto-set historical/market data based on currency
  // has been moved to the parent (GeoneraPage) to keep this component fully controlled.

  return (
    <div className="space-y-6 p-6 bg-card shadow-lg rounded-lg border border-border">
      <div className="flex items-center gap-2 text-xl font-semibold text-primary">
        <Settings2 className="h-6 w-6" />
        <span>Prediction Parameters</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="currency-pair" className="text-md font-medium mb-1 block">Currency Pair</Label>
          <Select 
            onValueChange={(value) => onCurrencyChange(value as CurrencyPair)} 
            value={currencyPair} 
            name="currencyPair"
            disabled={isLoading}
          >
            <SelectTrigger id="currency-pair" className="w-full text-base py-2.5 h-auto">
              <SelectValue placeholder="Select pair" />
            </SelectTrigger>
            <SelectContent>
              {currencyOptions.map(option => {
                const IconComponent = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value} className="text-base py-2">
                    <div className="flex items-center">
                      {IconComponent && <IconComponent className="h-5 w-5 mr-2 text-muted-foreground" />}
                      {option.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="pips-target" className="text-md font-medium mb-1 block">Target Pips</Label>
          <Input
            id="pips-target"
            type="number"
            value={pipsTarget}
            onChange={handlePipsInputChange}
            placeholder="e.g., 10"
            className="text-base py-2.5 h-auto"
            min="1"
            disabled={isLoading}
          />
        </div>
      </div>

       <div>
        <Label htmlFor="historical-data" className="text-md font-medium mb-1 block">Historical Data Summary</Label>
        <Textarea
          id="historical-data"
          value={historicalData}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onHistoricalDataChange(e.target.value)}
          placeholder="Brief summary of recent price action, key levels..."
          className="min-h-[100px] text-sm bg-background/70 focus:ring-accent"
          rows={4}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground mt-1">Provide concise summary for AI analysis. AI will use this data for its minute-by-minute predictions.</p>
      </div>

      <div>
        <Label htmlFor="market-news" className="text-md font-medium mb-1 block">Market News Summary</Label>
        <Textarea
          id="market-news"
          value={marketNews}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onMarketNewsChange(e.target.value)}
          placeholder="Key news, events, or sentiment drivers..."
          className="min-h-[100px] text-sm bg-background/70 focus:ring-accent"
          rows={4}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground mt-1">Include relevant news. AI will use this data for its minute-by-minute predictions.</p>
      </div>

      {/* Button removed as predictions are automatic */}
       <p className="text-sm text-center text-muted-foreground pt-2">
        AI predictions will be generated automatically every minute based on the parameters above.
      </p>
    </div>
  );
}
