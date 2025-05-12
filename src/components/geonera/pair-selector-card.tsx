// src/components/geonera/pair-selector-card.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Bitcoin, Euro, Landmark, ChevronDown } from 'lucide-react';
import type { CurrencyPair, CurrencyOption } from '@/types';
import { cn } from '@/lib/utils';

interface PairSelectorCardProps {
  selectedCurrencyPairs: CurrencyPair[];
  onSelectedCurrencyPairsChange: (value: CurrencyPair[]) => void;
  isLoading: boolean;
  className?: string;
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

export function PairSelectorCard({
  selectedCurrencyPairs,
  onSelectedCurrencyPairsChange,
  isLoading,
  className,
}: PairSelectorCardProps) {

  const handleCurrencyToggle = (currencyValue: CurrencyPair) => {
    const newSelectedCurrencies = selectedCurrencyPairs.includes(currencyValue)
      ? selectedCurrencyPairs.filter(c => c !== currencyValue)
      : [...selectedCurrencyPairs, currencyValue];

    if (newSelectedCurrencies.length <= MAX_SELECTED_CURRENCIES) {
      onSelectedCurrencyPairsChange(newSelectedCurrencies);
    }
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
    <Card className={cn("shadow-lg h-full flex flex-col", className)}>
      <CardHeader className="p-2">
        <CardTitle className="text-sm font-semibold text-primary flex items-center">
          <Coins className="h-4 w-4 mr-1.5" aria-hidden="true" />
          <span>Select Currency Pair(s)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 pt-0 flex-grow flex flex-col justify-center">
        <div className="mt-auto">
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
      </CardContent>
    </Card>
  );
}
