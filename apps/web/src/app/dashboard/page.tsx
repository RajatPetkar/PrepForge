"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchApi } from "@/lib/api";
import { MessageSquare, FileText, BookOpen, Building2, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface User { email: string; }

const quickActions = [
  {
    title: "Ask AI Assistant",
    desc: "Practice DSA, DBMS, OS & more with cited answers",
    url: "/dashboard/chat",
    icon: MessageSquare,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    title: "Analyze Resume",
    desc: "Get ATS score and improvement suggestions",
    url: "/dashboard/resume",
    icon: FileText,
    color: "text-green-400",
    bg: "bg-green-400/10",
  },
  {
    title: "Generate Study Plan",
    desc: "Personalized daily roadmap for your target company",
    url: "/dashboard/planner",
    icon: BookOpen,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
];



export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [recentChats, setRecentChats] = useState<{id: string, title: string, created_at: string}[]>([]);

  useEffect(() => {
    fetchApi("/auth/me").then(setUser).catch(console.error);
    fetchApi("/chat/conversations").then((data) => {
      if (data.conversations) {
        setRecentChats(data.conversations.slice(0, 4));
      }
    }).catch(console.error);
  }, []);

  const firstName = user?.email?.split("@")[0] ?? "there";

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Good day, <span className="gradient-text capitalize">{firstName}</span> 👋
          </h1>
          <p className="text-muted-foreground mt-1.5">
            Ready to ace your next interview? Let&apos;s get started.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm">
          <Zap className="w-4 h-4" />
          AI Ready
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.url}>
              <Card className="glass-card border-border/50 hover:border-primary/30 transition-all duration-200 cursor-pointer group h-full">
                <CardHeader className="pb-3">
                  <div className={`w-10 h-10 rounded-lg ${action.bg} flex items-center justify-center mb-3`}>
                    <action.icon className={`w-5 h-5 ${action.color}`} />
                  </div>
                  <CardTitle className="text-sm font-semibold group-hover:text-primary transition-colors flex items-center justify-between">
                    {action.title}
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground leading-relaxed">{action.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Recent Activity */}
        <Card className="glass-card border-border/50 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>Your latest sessions with the AI assistant</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentChats.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No recent conversations yet. Start chatting!
              </div>
            ) : (
              recentChats.map((t, i) => (
                <Link href={`/dashboard/chat`} key={t.id}>
                  <div
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium group-hover:text-primary transition-colors max-w-sm truncate">{t.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Recently</p>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground font-medium">
                      AI Chat
                    </span>
                  </div>
                </Link>
              ))
            )}
            <Link href="/dashboard/chat" className="block pt-2">
              <Button variant="ghost" size="sm" className="w-full text-primary hover:text-primary hover:bg-primary/10">
                View all conversations
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Pro Tips
            </CardTitle>
            <CardDescription>Get the most out of Placement AI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Upload your resume for ATS scoring", done: false },
              { label: "Ask the AI specific DSA questions", done: false },
              { label: "Generate a custom study plan", done: false },
            ].map((task, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${task.done ? "bg-primary border-primary" : "border-muted-foreground/40"}`} />
                <p className={`text-sm ${task.done ? "line-through text-muted-foreground" : ""}`}>{task.label}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
