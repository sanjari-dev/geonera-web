// src/components/geonera/notification-display.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NotificationMessage } from "@/types";
import { Bell, AlertTriangle, CheckCircle2, Info, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format as formatDateFns } from 'date-fns';

interface NotificationDisplayProps {
  notification: NotificationMessage | null;
  className?: string;
}

export function NotificationDisplay({ notification, className }: NotificationDisplayProps) {
  return (
    <Card className={cn("shadow-lg flex flex-col", className)} aria-labelledby="notification-title">
      <CardHeader className="px-2 pt-2 pb-1"> {/* Reduced bottom padding */}
        <CardTitle id="notification-title" className="text-sm font-semibold text-primary flex items-center">
          <Bell className="h-4 w-4 mr-1.5" aria-hidden="true" />
          <span>Latest Notification</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 pt-1 flex-grow overflow-hidden text-xs"> {/* Reduced top padding */}
        <ScrollArea className="h-full pr-1.5">
          {notification ? (
            <div className="space-y-0.5" role="alert" aria-live="polite">
              <div className="flex items-start">
                {notification.variant === "destructive" && <AlertTriangle className="h-4 w-4 text-destructive mr-1.5 mt-0.5 flex-shrink-0" aria-label="Error" />}
                {notification.variant === "success" && <CheckCircle2 className="h-4 w-4 text-green-500 mr-1.5 mt-0.5 flex-shrink-0" aria-label="Success" />}
                {(!notification.variant || notification.variant === "default") && <Info className="h-4 w-4 text-blue-500 mr-1.5 mt-0.5 flex-shrink-0" aria-label="Information" />}
                
                <p className={cn(
                    "font-semibold text-xs", 
                    notification.variant === "destructive" && "text-destructive",
                    notification.variant === "success" && "text-green-600",
                    (!notification.variant || notification.variant === "default") && "text-foreground"
                  )}
                >
                  {notification.title}
                </p>
              </div>
              <p className={cn(
                  "text-xs ml-[1.375rem]", 
                  notification.variant === "destructive" ? "text-destructive/90" : "text-muted-foreground"
                )}
              >
                {notification.description}
              </p>
              {notification.timestamp && (
                <div className="flex items-center text-[0.65rem] text-muted-foreground ml-[1.375rem] mt-0.5">
                  <Clock className="h-2.5 w-2.5 mr-1" aria-hidden="true" />
                  <span>{formatDateFns(new Date(notification.timestamp), "yyyy-MM-dd HH:mm:ss XXX")}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No new notifications.</p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

