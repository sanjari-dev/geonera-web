// src/app/login/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/geonera/login-form';
import type { CurrencyPair, RefreshIntervalValue, User } from '@/types';
import { AppHeader } from '@/components/geonera/header';
// import { useToast } from "@/hooks/use-toast"; // Removed useToast

export default function LoginPage() {
  const router = useRouter();
  // const { toast } = useToast(); // Removed useToast
  const [currentYear, setCurrentYear] = useState('');

  useEffect(() => {
    setCurrentYear(new Date().getFullYear().toString());
    // If user data already in localStorage, redirect to home
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('geoneraUser');
      if (storedUser) {
        router.replace('/'); // Use replace to avoid login page in history
      }
    }
  }, [router]);

  const handleLoginSuccess = (user: User) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('geoneraUser', JSON.stringify(user));
    }
    // toast({ title: `Welcome, ${user.username}!`, description: "You are now logged in." }); // Removed toast
    router.push('/'); // Navigate to home page after login
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader 
        user={null} 
        onLogout={function (): void {
          throw new Error('Function not implemented.');
        }}
        selectedCurrencyPairs={[]}
        onSelectedCurrencyPairsChange={function (value: CurrencyPair[]): void {
          throw new Error('Function not implemented.');
        }}
        isLoading={false} selectedRefreshInterval={''} 
        onRefreshIntervalChange={function (value: RefreshIntervalValue): void {
          throw new Error('Function not implemented.');
        }}
      />
      <main className="flex-grow container mx-auto px-4 py-4 flex items-center justify-center">
        <LoginForm loginAction={handleLoginSuccess} />
      </main>
      <footer className="py-3 text-center text-sm text-muted-foreground border-t border-border">
        © {currentYear} Geonera. All rights reserved.
      </footer>
    </div>
  );
}
