"use client";

import Link from "next/link";
import { Brain, MessageSquare, LayoutDashboard, FileText, Building2, BookOpen, Shield, LogOut, ChevronRight, Code2, UserCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "AI Chat", url: "/dashboard/chat", icon: MessageSquare },
  { title: "Resume Analyzer", url: "/dashboard/resume", icon: FileText },
  { title: "Study Planner", url: "/dashboard/planner", icon: BookOpen },
  { title: "Code Workspace", url: "/dashboard/workspace", icon: Code2 },
];

const adminItems = [
  { title: "Admin Panel", url: "/dashboard/admin", icon: Shield },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  // const { useState, useEffect } = require("react");

  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUsername(data.username || data.id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchUser();
  }, []);

  const onLogout = () => {
    localStorage.removeItem("token");
    router.push("/auth/login");
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      {/* Header */}
      <SidebarHeader className="p-5 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center glow shrink-0">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-bold text-sm leading-none">Placement AI</p>
            <p className="text-xs text-muted-foreground mt-0.5">Interview Co-pilot</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {/* Main nav */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground/60 px-2 mb-1">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {navItems.map((item) => {
                const isActive = pathname === item.url || (item.url !== "/dashboard" && pathname.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      className={cn(
                        "relative h-9 px-3 rounded-lg text-sm font-medium transition-all duration-150",
                        isActive
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
                    >
                      <Link href={item.url} className="flex items-center gap-2.5">
                        <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "")} />
                        <span>{item.title}</span>
                        {isActive && <ChevronRight className="w-3 h-3 ml-auto text-primary" />}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs text-muted-foreground/60 px-2 mb-1">
            Administration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      className={cn(
                        "relative h-9 px-3 rounded-lg text-sm font-medium transition-all duration-150",
                        isActive
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
                    >
                      <Link href={item.url} className="flex items-center gap-2.5">
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {username && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs text-muted-foreground/60 px-2 mb-1">
              Public Profile
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="relative h-9 px-3 rounded-lg text-sm font-medium transition-all duration-150 text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  >
                    <Link href={`/user/${username}`} className="flex items-center gap-2.5 w-full">
                      <UserCircle className="w-4 h-4" />
                      <span>View My Profile</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onLogout}
              className="h-9 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
