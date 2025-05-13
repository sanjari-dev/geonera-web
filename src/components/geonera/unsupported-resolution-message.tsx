// src/components/geonera/unsupported-resolution-message.tsx
"use client";

import { Smartphone, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface UnsupportedResolutionMessageProps {
  minWidth: number;
  minHeight: number;
}

export function UnsupportedResolutionMessage({ minWidth, minHeight }: UnsupportedResolutionMessageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl text-destructive">Unsupported Screen Resolution</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-md text-muted-foreground">
            Geonera is designed for larger screens to provide the best experience.
          </CardDescription>
          <p className="mt-4 text-sm text-foreground">
            Please use a device or browser window with a minimum resolution of:
          </p>
          <p className="mt-1 text-sm font-semibold text-primary">
            {minWidth} pixels wide x {minHeight} pixels high.
          </p>
          <div className="mt-6 flex justify-center">
            <Smartphone className="h-10 w-10 text-muted-foreground opacity-75" />
          </div>
           <p className="mt-4 text-xs text-muted-foreground">
            Your current screen size does not meet these requirements. Adjusting your browser window size or switching to a larger display may help.
          </p>
        </CardContent>
      </Card>
       <footer className="mt-8 py-3 text-center text-sm text-muted-foreground border-t border-border w-full">
        © {new Date().getFullYear()} Geonera. All rights reserved.
      </footer>
    </div>
  );
}
