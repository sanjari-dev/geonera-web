import { Brain } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="py-6 mb-8 border-b border-border">
      <div className="container mx-auto flex items-center justify-center sm:justify-start">
        <Brain className="h-10 w-10 text-primary mr-3" />
        <h1 className="text-4xl font-bold text-primary">
          Forex Prophet
        </h1>
      </div>
    </header>
  );
}
