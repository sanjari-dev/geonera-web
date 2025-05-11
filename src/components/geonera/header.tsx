import { Brain, LogOut, LogIn as LogInIcon, Maximize, Minimize, Clock } from 'lucide-react';
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
import { format as formatDateFns } from 'date-fns'; // Renamed to avoid conflict with any potential 'format' variable

interface AppHeaderProps {
  user: User | null;
  onLogout: () => void;
}

export function AppHeader({ user, onLogout }: AppHeaderProps) {
  const router = useRouter();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  const formatCurrentTime = useCallback(() => {
    // Ensure Date is only created on client-side
    return formatDateFns(new Date(), "yyyy-MM-dd HH:mm:ss XXX");
  }, []);

  useEffect(() => {
    // Initialize time on client-side
    if (typeof window !== 'undefined') {
      setCurrentTime(formatCurrentTime());
      const timerId = setInterval(() => {
        setCurrentTime(formatCurrentTime());
      }, 1000);
      return () => clearInterval(timerId);
    }
  }, [formatCurrentTime]);


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
      // Initial check
      setIsFullScreen(!!document.fullscreenElement);
      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
      };
    }
  }, [handleFullscreenChange]);

  const toggleFullScreen = async () => {
    if (typeof document === 'undefined') return;

    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
         console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
         // Optionally, provide feedback to the user that fullscreen was blocked
      }
    } else {
      if (document.exitFullscreen) {
        try {
          await document.exitFullscreen();
        } catch (err) {
          console.error(`Error attempting to exit full-screen mode: ${err.message} (${err.name})`);
        }
      }
    }
  };
  
  const handleLogoutClick = () => {
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.error("Error exiting fullscreen during logout:", err))
      .finally(() => {
        onLogout(); // Call original logout after attempting to exit fullscreen
      });
    } else {
      onLogout(); // Call original logout if not in fullscreen
    }
  };


  return (
    <header className="py-1 border-b border-border" aria-label="Application Header">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <Brain className="h-8 w-8 text-primary mr-2" aria-hidden="true" />
          <h1 className="text-3xl font-bold text-primary">
            Geonera
          </h1>
        </div>

        <div className="flex items-center gap-2">
           {currentTime && (
            <div className="hidden md:flex items-center text-sm text-muted-foreground gap-1" aria-live="polite" aria-atomic="true">
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span>{currentTime}</span>
            </div>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleFullScreen} className="h-9 w-9" aria-label={isFullScreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
                  {isFullScreen ? <Minimize className="h-5 w-5" aria-hidden="true" /> : <Maximize className="h-5 w-5" aria-hidden="true" />}
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
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0" aria-label="User menu">
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
                <DropdownMenuItem onClick={handleLogoutClick} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={handleLoginRedirect} variant="outline">
              <LogInIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

