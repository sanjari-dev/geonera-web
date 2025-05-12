// src/components/geonera/pips-parameter-form.tsx
"use client";

import type { ChangeEvent } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Added Card components
import { Coins, Bitcoin, Settings2, Euro, Landmark, ChevronDown } from 'lucide-react';
import type { CurrencyPair, CurrencyOption, PipsSettings } from '@/types';
import { cn } from '@/lib/utils';

interface PipsParameterFormProps {
  selectedCurrencyPairs: CurrencyPair[];
  pipsSettings: PipsSettings;
  onSelectedCurrencyPairsChange: (value: CurrencyPair[]) => void;
  onPipsSettingsChange: (value: PipsSettings) => void;
  isLoading: boolean;
}

const currencyOptions: CurrencyOption[] = [
  { value: "XAU/USD", label: "Gold (XAU/USD)", icon: Coins },
  { value: "BTC/USD", label: "Bitcoin (BTC/USD)", icon: Bitcoin },
  { value: "EUR/USD", label: "Euro/USD (EUR/USD)", icon: Euro },
  { value: "GBP/USD", label: "Pound/USD (GBP/USD)", icon: Landmark },
  { value: "USD/JPY", label: "USD/Yen (USD/JPY)", icon: Landmark },
  { value: "AUD/USD", label: "AUD/USD (AUD/USD)", icon: Landmark },
  { value: "USD/CAD", label: "USD/CAD (USD/CAD)", icon: Landmark },
];

const MAX_SELECTED_CURRENCIES = 5;

export function PipsParameterForm({
  selectedCurrencyPairs,
  pipsSettings,
  onSelectedCurrencyPairsChange,
  onPipsSettingsChange,
  isLoading,
}: PipsParameterFormProps) {

  const handleCurrencyToggle = (currencyValue: CurrencyPair) => {
    const newSelectedCurrencies = selectedCurrencyPairs.includes(currencyValue)
      ? selectedCurrencyPairs.filter(c => c !== currencyValue)
      : [...selectedCurrencyPairs, currencyValue];

    if (newSelectedCurrencies.length <= MAX_SELECTED_CURRENCIES) {
      onSelectedCurrencyPairsChange(newSelectedCurrencies);
    }
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement>,
    type: 'profitPips' | 'lossPips',
    field: 'min' | 'max'
  ) => {
    const value = parseInt(e.target.value, 10);
    const newValue = !isNaN(value) ? value : 0;
    onPipsSettingsChange({
      ...pipsSettings,
      [type]: {
        ...pipsSettings[type],
        [field]: newValue,
      },
    });
  };

  const getTriggerLabel = () => {
    if (selectedCurrencyPairs.length === 0) return "Select currencies...";
    if (selectedCurrencyPairs.length === 1) {
      const option = currencyOptions.find(opt => opt.value === selectedCurrencyPairs[0]);
      return option ? option.label : selectedCurrencyPairs[0];
    }
    if (selectedCurrencyPairs.length <= 3) return selectedCurrencyPairs.join(', ');
    return `${selectedCurrencyPairs.length} currencies selected`;
  };
  
  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader className="p-2">
        <CardTitle className="text-sm font-semibold text-primary flex items-center">
          <Settings2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
          <span>Prediction Parameters</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 pt-0 flex-grow flex flex-col">
        <div className="grid grid-cols-1 gap-1.5 mt-auto">
          <div>
            <Label htmlFor="currency-pair-multiselect" className="text-xs font-medium mb-0.5 block">
              Currency Pair(s)
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  id="currency-pair-multiselect"
                  variant="outline"
                  className={cn(
                    "w-full justify-between text-xs py-1 h-8",
                    selectedCurrencyPairs.length === 0 && "text-muted-foreground"
                  )}
                  disabled={isLoading}
                  aria-label={`Select currency pairs, currently selected: ${getTriggerLabel()}`}
                >
                  <span className="truncate">{getTriggerLabel()}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full min-w-[var(--radix-dropdown-menu-trigger-width)]">
                <DropdownMenuLabel className="text-xs">Select up to {MAX_SELECTED_CURRENCIES} currencies</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {currencyOptions.map(option => {
                  const IconComponent = option.icon;
                  const isSelected = selectedCurrencyPairs.includes(option.value);
                  const isDisabled = !isSelected && selectedCurrencyPairs.length >= MAX_SELECTED_CURRENCIES;
                  return (
                    <DropdownMenuCheckboxItem
                      key={option.value}
                      checked={isSelected}
                      onCheckedChange={() => handleCurrencyToggle(option.value)}
                      disabled={isDisabled || isLoading}
                      className="text-xs py-1"
                      aria-label={option.label}
                    >
                      <div className="flex items-center">
                        {IconComponent && <IconComponent aria-hidden="true" className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />}
                        {option.label}
                      </div>
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
              <div>
                <Label htmlFor="min-profit-pips" className="text-xs font-medium mb-0.5 block">Min Profit PIPS</Label>
                <Input
                  id="min-profit-pips"
                  type="number"
                  value={pipsSettings.profitPips.min}
                  onChange={(e) => handleInputChange(e, 'profitPips', 'min')}
                  placeholder="e.g., 10"
                  className="text-xs py-1 h-8"
                  min="1"
                  disabled={isLoading}
                  aria-label="Minimum Profit PIPS target"
                />
              </div>
              <div>
                <Label htmlFor="max-profit-pips" className="text-xs font-medium mb-0.5 block">Max Profit PIPS</Label>
                <Input
                  id="max-profit-pips"
                  type="number"
                  value={pipsSettings.profitPips.max}
                  onChange={(e) => handleInputChange(e, 'profitPips', 'max')}
                  placeholder="e.g., 20"
                  className="text-xs py-1 h-8"
                  min="1"
                  disabled={isLoading}
                  aria-label="Maximum Profit PIPS target"
                />
              </div>
              <div>
                <Label htmlFor="min-loss-pips" className="text-xs font-medium mb-0.5 block">Min Loss PIPS</Label>
                <Input
                  id="min-loss-pips"
                  type="number"
                  value={pipsSettings.lossPips.min}
                  onChange={(e) => handleInputChange(e, 'lossPips', 'min')}
                  placeholder="e.g., 5"
                  className="text-xs py-1 h-8"
                  min="1"
                  disabled={isLoading}
                  aria-label="Minimum Loss PIPS target"
                />
              </div>
              <div>
                <Label htmlFor="max-loss-pips" className="text-xs font-medium mb-0.5 block">Max Loss PIPS</Label>
                <Input
                  id="max-loss-pips"
                  type="number"
                  value={pipsSettings.lossPips.max}
                  onChange={(e) => handleInputChange(e, 'lossPips', 'max')}
                  placeholder="e.g., 10"
                  className="text-xs py-1 h-8"
                  min="1"
                  disabled={isLoading}
                  aria-label="Maximum Loss PIPS target"
                />
              </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}