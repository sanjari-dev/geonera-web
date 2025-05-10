import { Brain } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="py-4 mb-6 border-b border-border">
      <div className="container mx-auto flex items-center justify-center sm:justify-start">
        <Brain className="h-8 w-8 text-primary mr-2" />
        <h1 className="text-3xl font-bold text-primary">
          Geonera
        </h1>
      </div>
    </header>
  );
}
