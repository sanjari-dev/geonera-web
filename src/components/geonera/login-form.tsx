// src/components/geonera/login-form.tsx
"use client";

import type { FormEvent } from 'react';
import { useState } from 'react';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn } from 'lucide-react';

interface LoginFormProps {
  onLogin: (user: User) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      // Basic validation, you might want to use toast for notifications
      alert("Please enter a username.");
      return;
    }
    
    const trimmedUsername = username.trim();
    let initials = "GU"; // Guest User default
    if (trimmedUsername) {
        const parts = trimmedUsername.split(' ');
        if (parts.length > 1 && parts[0] && parts[1]) {
            initials = `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        } else if (trimmedUsername.length >= 2) {
            initials = trimmedUsername.substring(0, 2).toUpperCase();
        } else if (trimmedUsername.length === 1) {
            initials = trimmedUsername[0].toUpperCase();
        }
    }


    const dummyUser: User = {
      id: `dummy-${Date.now()}`, // Simple unique ID
      username: trimmedUsername,
      initials: initials,
    };
    onLogin(dummyUser);
  };

  return (
    <div className="flex flex-col items-center justify-center flex-grow p-4">
      <Card className="w-full max-w-sm shadow-xl border border-border">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <LogIn className="h-10 w-10 text-primary" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">
            Login to Geonera
          </CardTitle>
          <CardDescription>Enter any username to access the platform (this is a dummy login).</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-md">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="e.g., John Doe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="text-base py-2.5 h-auto"
                required
                aria-required="true"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full text-base py-2.5 h-auto">
              Login
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
