// src/components/geonera/pips-parameter-form.tsx
"use client";

import type { ChangeEvent, FormEvent } from 'react';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
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
import { Loader2, Coins, Bitcoin, Settings2 } from 'lucide-react';
import type { CurrencyPair, CurrencyOption, PipsTarget } from '@/types';
import { useToast } from "@/hooks/use-toast";

interface PipsParameterFormProps {
  onGeneratePrediction: (
    currencyPair: CurrencyPair,
    pipsTarget: PipsTarget,
    historicalData: string,
    marketNews: string
  ) => Promise<void>;
  isLoading: boolean;
  defaultCurrency?: CurrencyPair;
  defaultPipsTarget?: PipsTarget;
}

const currencyOptions: CurrencyOption[] = [
  { value: "XAU/USD", label: "Gold (XAU/USD)", icon: Coins },
  { value: "BTC/USD", label: "Bitcoin (BTC/USD)", icon: Bitcoin },
];

const defaultHistoricalDataTemplates: Record<CurrencyPair, string> = {
  "XAU/USD": "Historical data for XAU/USD (last 24h):\n- Price range: $2310 - $2335\n- Key support: $2305\n- Key resistance: $2340\n- Current trend: Mildly bullish on H1 chart.",
  "BTC/USD": "Historical data for BTC/USD (last 24h):\n- Price range: $62,500 - $64,800\n- Key support: $62,000\n- Key resistance: $65,000\n- Volume: Moderate, slight increase in last 4 hours.",
};

const defaultMarketNewsTemplates: Record<CurrencyPair, string> = {
  "XAU/USD": "Recent market news for XAU/USD:\n- US CPI data released: slightly higher than expected.\n- Geopolitical tensions in [Region] remain elevated.\n- Central bank statements: [Bank] maintained a hawkish stance.",
  "BTC/USD": "Recent market news for BTC/USD:\n- Upcoming halving event anticipation.\n- Regulatory news: [Country] considering new crypto framework.\n- ETF inflows/outflows: Net positive inflows reported yesterday.",
};


export function PipsParameterForm({
  onGeneratePrediction,
  isLoading,
  defaultCurrency = "XAU/USD",
  defaultPipsTarget = 10,
}: PipsParameterFormProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyPair>(defaultCurrency);
  const [pipsTarget, setPipsTarget] = useState<PipsTarget>(defaultPipsTarget);
  const [historicalData, setHistoricalData] = useState(defaultHistoricalDataTemplates[defaultCurrency]);
  const [marketNews, setMarketNews] = useState(defaultMarketNewsTemplates[defaultCurrency]);
  const { toast } = useToast();

  useEffect(() => {
    setHistoricalData(defaultHistoricalDataTemplates[selectedCurrency]);
    setMarketNews(defaultMarketNewsTemplates[selectedCurrency]);
  }, [selectedCurrency]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!historicalData.trim() || !marketNews.trim()) {
      toast({
        title: "Input Required",
        description: "Please provide historical data and market news summaries.",
        variant: "destructive",
      });
      return;
    }
    if (pipsTarget <= 0) {
      toast({
        title: "Invalid Pips Target",
        description: "Pips target must be a positive number.",
        variant: "destructive",
      });
      return;
    }
    await onGeneratePrediction(selectedCurrency, pipsTarget, historicalData, marketNews);
  };

  const handleCurrencyChange = (value: string) => {
    setSelectedCurrency(value as CurrencyPair);
  };
  
  const handlePipsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setPipsTarget(value);
    } else if (e.target.value === '') {
      setPipsTarget(0); // Or some other default/validation
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-card shadow-lg rounded-lg border border-border">
      <div className="flex items-center gap-2 text-xl font-semibold text-primary">
        <Settings2 className="h-6 w-6" />
        <span>Prediction Parameters</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="currency-pair" className="text-md font-medium mb-1 block">Currency Pair</Label>
          <Select onValueChange={handleCurrencyChange} value={selectedCurrency} name="currencyPair">
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
            onChange={handlePipsChange}
            placeholder="e.g., 10"
            className="text-base py-2.5 h-auto"
            min="1"
          />
        </div>
      </div>

       <div>
        <Label htmlFor="historical-data" className="text-md font-medium mb-1 block">Historical Data Summary</Label>
        <Textarea
          id="historical-data"
          value={historicalData}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setHistoricalData(e.target.value)}
          placeholder="Brief summary of recent price action, key levels..."
          className="min-h-[100px] text-sm bg-background/70 focus:ring-accent"
          rows={4}
        />
        <p className="text-xs text-muted-foreground mt-1">Provide concise summary for AI analysis.</p>
      </div>

      <div>
        <Label htmlFor="market-news" className="text-md font-medium mb-1 block">Market News Summary</Label>
        <Textarea
          id="market-news"
          value={marketNews}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMarketNews(e.target.value)}
          placeholder="Key news, events, or sentiment drivers..."
          className="min-h-[100px] text-sm bg-background/70 focus:ring-accent"
          rows={4}
        />
        <p className="text-xs text-muted-foreground mt-1">Include relevant news that could impact the pair.</p>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-3 rounded-md">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Generating Prediction...
          </>
        ) : (
          "Get AI Prediction"
        )}
      </Button>
    </form>
  );
}
