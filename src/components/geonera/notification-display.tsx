// src/components/geonera/notification-display.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NotificationMessage } from "@/types";
import { Bell, AlertTriangle, CheckCircle2, Info, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';

interface NotificationDisplayProps {
  notification: NotificationMessage | null;
  className?: string;
}

export function NotificationDisplay({ notification, className }: NotificationDisplayProps) {
  return (
    <Card className={cn("shadow-lg h-full flex flex-col", className)}>
      <CardHeader className="p-3">
        <CardTitle className="text-base font-semibold text-primary flex items-center">
          <Bell className="h-5 w-5 mr-2" />
          <span>Latest Notification</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 flex-grow overflow-hidden">
        <ScrollArea className="h-full pr-2">
          {notification ? (
            <div className="space-y-1">
              <div className="flex items-start">
                {notification.variant === "destructive" && <AlertTriangle className="h-5 w-5 text-destructive mr-2 mt-0.5 flex-shrink-0" aria-label="Error" />}
                {notification.variant === "success" && <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" aria-label="Success" />}
                {(!notification.variant || notification.variant === "default") && <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" aria-label="Information" />}
                
                <p className={cn(
                    "font-semibold",
                    notification.variant === "destructive" && "text-destructive",
                    notification.variant === "success" && "text-green-600",
                    (!notification.variant || notification.variant === "default") && "text-foreground"
                  )}
                >
                  {notification.title}
                </p>
              </div>
              <p className={cn(
                  "text-sm ml-7", // Indent description to align with title text
                  notification.variant === "destructive" ? "text-destructive/90" : "text-muted-foreground"
                )}
              >
                {notification.description}
              </p>
              {notification.timestamp && (
                <div className="flex items-center text-xs text-muted-foreground ml-7 mt-1">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>{format(new Date(notification.timestamp), "yyyy-MM-dd HH:mm:ss")}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No new notifications.</p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
