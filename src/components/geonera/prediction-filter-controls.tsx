// src/components/geonera/prediction-filter-controls.tsx
"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


interface PredictionFilterControlsProps {
  showExpired: boolean;
  onShowExpiredChange: (checked: boolean) => void;
  className?: string;
}

export function PredictionFilterControls({
  showExpired,
  onShowExpiredChange,
  className,
}: PredictionFilterControlsProps) {
  return (
    <Card className={cn("shadow-lg h-full flex flex-col", className)}>
      <CardHeader className="px-2 pt-2 pb-1">
        <CardTitle className="text-sm font-semibold text-primary flex items-center">
          <Filter className="h-4 w-4 mr-1.5" aria-hidden="true" />
          <span>Display Options</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 pt-0 flex-grow flex flex-col justify-center">
        <div className="flex items-center space-x-1 mt-auto col-span-2 justify-self-start">
          <Switch
            id="show-expired"
            checked={showExpired}
            onCheckedChange={onShowExpiredChange}
            aria-label={showExpired ? "Hide expired predictions" : "Show expired predictions"}
          />
          <Label htmlFor="show-expired" className="text-xs font-medium">Show Expired Logs</Label>
        </div>
      </CardContent>
    </Card>
  );
}