import { Brain, LogOut, LogIn as LogInIcon, Maximize, Minimize } from 'lucide-react';
import type { User } from '@/types';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


interface AppHeaderProps {
  user: User | null;
  onLogout: () => void;
}

export function AppHeader({ user, onLogout }: AppHeaderProps) {
  const router = useRouter();
  const [isFullScreen, setIsFullScreen] = useState(false);

  const handleLoginRedirect = () => {
    router.push('/login');
  };

  const handleFullscreenChange = useCallback(() => {
    if (typeof document !== 'undefined') {
      setIsFullScreen(!!document.fullscreenElement);
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
      };
    }
  }, [handleFullscreenChange]);

  const toggleFullScreen = () => {
    if (typeof document === 'undefined') return;

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <header className="py-1 border-b border-border">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <Brain className="h-8 w-8 text-primary mr-2" />
          <h1 className="text-3xl font-bold text-primary">
            Geonera
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleFullScreen} className="h-9 w-9">
                  {isFullScreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                  <span className="sr-only">{isFullScreen ? 'Exit fullscreen' : 'Enter fullscreen'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isFullScreen ? 'Exit fullscreen' : 'Enter fullscreen'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{user.initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.username}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      Geonera User
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={handleLoginRedirect} variant="outline">
              <LogInIcon className="mr-2 h-4 w-4" />
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
