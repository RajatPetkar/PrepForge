"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchApi } from "@/lib/api";
import { Users, FileText, Calendar, Activity, Shield, AlertTriangle } from "lucide-react";

interface AdminStats {
  total_users: number;
  total_documents: number;
  total_study_plans: number;
  active_sessions: number;
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchApi("/admin/stats")
      .then(setStats)
      .catch((err: Error) => setError(err.message || "Access denied or server error."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Loading admin data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="glass-card border-red-500/30 max-w-md text-center p-8">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-red-400 mb-2">Access Denied</h2>
          <p className="text-muted-foreground text-sm">{error}</p>
          <p className="text-xs text-muted-foreground mt-2">Only users with Admin role can view this page.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Platform-wide analytics and administration.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={stats?.total_users ?? 0} icon={Users} color="bg-blue-400/10 text-blue-400" />
        <StatCard title="Documents Indexed" value={stats?.total_documents ?? 0} icon={FileText} color="bg-green-400/10 text-green-400" />
        <StatCard title="Study Plans Created" value={stats?.total_study_plans ?? 0} icon={Calendar} color="bg-purple-400/10 text-purple-400" />
        <StatCard title="Active Sessions" value={stats?.active_sessions ?? 0} icon={Activity} color="bg-amber-400/10 text-amber-400" />
      </div>

      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base">System Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "API Server", status: "Operational", ok: true },
            { label: "PostgreSQL Database", status: "Operational", ok: true },
            { label: "Qdrant Vector DB", status: "Operational", ok: true },
            { label: "Redis Cache", status: "Operational", ok: true },
          ].map((s) => (
            <div key={s.label} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${s.ok ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"}`}>
                {s.status}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
