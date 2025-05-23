// src/components/geonera/pips-input-card.tsx
"use client";

import type { ChangeEvent } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from 'lucide-react';
import type { PipsSettings } from '@/types';
import { cn } from '@/lib/utils';

interface PipsInputCardProps {
  pipsSettings: PipsSettings;
  onPipsSettingsChangeAction: (value: PipsSettings) => void;
  isLoading: boolean;
  className?: string;
}

export function PipsInputCard({
  pipsSettings,
  onPipsSettingsChangeAction, 
  isLoading,
  className,
}: PipsInputCardProps) {

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement>,
    type: 'profitPips' | 'lossPips',
    field: 'min' | 'max'
  ) => {
    const rawValue = e.target.value;
    const parsedValue = parseInt(rawValue, 10);
    
    // If rawValue is empty or becomes NaN after parsing, set to 0 or a defined minimum.
    // For this component, let's default to 0 if input is cleared or invalid.
    const valueToSet = rawValue === '' ? 0 : (!isNaN(parsedValue) ? parsedValue : 0);

    onPipsSettingsChangeAction({
      ...pipsSettings,
      [type]: {
        ...pipsSettings[type],
        [field]: valueToSet,
      },
    });
  };
  
  return (
    <Card className={cn("shadow-lg", className)}>
      <CardHeader className="px-2 pt-2 pb-1">
        <CardTitle className="text-sm font-semibold text-primary flex items-center">
          <Target className="h-4 w-4 mr-1.5" aria-hidden="true" />
          <span>Set PIPS Targets</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 pt-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
            <div>
              <Label htmlFor="min-profit-pips" className="text-xs font-medium mb-0.5 block">Min Profit</Label>
              <Input
                id="min-profit-pips"
                type="number"
                value={pipsSettings.profitPips.min}
                onChange={(e) => handleInputChange(e, 'profitPips', 'min')}
                placeholder="e.g., 10"
                className="text-xs py-1 h-8"
                min="0" // Allow 0, validation for >0 is handled in page.tsx
                disabled={isLoading}
                aria-label="Minimum Profit PIPS target"
              />
            </div>
            <div>
              <Label htmlFor="max-profit-pips" className="text-xs font-medium mb-0.5 block">Max Profit</Label>
              <Input
                id="max-profit-pips"
                type="number"
                value={pipsSettings.profitPips.max}
                onChange={(e) => handleInputChange(e, 'profitPips', 'max')}
                placeholder="e.g., 20"
                className="text-xs py-1 h-8"
                min="0"
                disabled={isLoading}
                aria-label="Maximum Profit PIPS target"
              />
            </div>
            <div>
              <Label htmlFor="min-loss-pips" className="text-xs font-medium mb-0.5 block">Min Loss</Label>
              <Input
                id="min-loss-pips"
                type="number"
                value={pipsSettings.lossPips.min}
                onChange={(e) => handleInputChange(e, 'lossPips', 'min')}
                placeholder="e.g., 5"
                className="text-xs py-1 h-8"
                min="0"
                disabled={isLoading}
                aria-label="Minimum Loss PIPS target"
              />
            </div>
            <div>
              <Label htmlFor="max-loss-pips" className="text-xs font-medium mb-0.5 block">Max Loss</Label>
              <Input
                id="max-loss-pips"
                type="number"
                value={pipsSettings.lossPips.max}
                onChange={(e) => handleInputChange(e, 'lossPips', 'max')}
                placeholder="e.g., 10"
                className="text-xs py-1 h-8"
                min="0"
                disabled={isLoading}
                aria-label="Maximum Loss PIPS target"
              />
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
