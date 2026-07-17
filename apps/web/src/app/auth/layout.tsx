"use client";

import { Brain } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen animated-bg flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center glow">
          <Brain className="w-6 h-6 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold">Placement AI</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-md glass-card rounded-2xl p-8 shadow-2xl">
        {children}
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        © 2026 Placement AI — Your AI Interview Co-pilot
      </p>
    </div>
  );
}
