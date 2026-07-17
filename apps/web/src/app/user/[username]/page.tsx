"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, GraduationCap, Building2, Calendar, Target, Award, ArrowLeft, Clock, TrendingUp, Sparkles, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProfileStudyPlan {
  id: string;
  target_company: string;
  available_days: number;
  skill_level: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  college: string | null;
  degree: string | null;
  graduation_year: string | null;
  target_company: string | null;
  current_cgpa: string | null;
  study_plans: ProfileStudyPlan[];
}

const skillBadge: Record<string, string> = {
  Beginner: "secondary",
  Intermediate: "outline",
  Advanced: "destructive",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-48 bg-gradient-to-b from-primary/20 to-background" />
      <div className="max-w-5xl mx-auto px-4 -mt-24">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex flex-col items-center md:items-start">
            <Skeleton className="w-32 h-32 rounded-full border-4 border-background" />
            <Skeleton className="h-8 w-48 mt-4" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
          <div className="flex-1 space-y-4 mt-6">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserProfilePage() {
  const { username } = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetchApi(`/profile/${username}`);
        setProfile(res);
      } catch (e: any) {
        setError(e.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [username]);

  if (loading) return <ProfileSkeleton />;

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6 px-4">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <BookOpen className="w-10 h-10 text-destructive" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Profile Not Found</h2>
          <p className="text-muted-foreground">{error || "This user doesn't exist or their profile is private."}</p>
        </div>
        <Button onClick={() => router.push("/dashboard")} variant="outline" className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  const cgpa = profile.current_cgpa ? parseFloat(profile.current_cgpa) : null;
  const cgpaPercent = cgpa ? Math.min((cgpa / 10) * 100, 100) : 0;
  const planCount = profile.study_plans.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="relative h-48 md:h-56 bg-gradient-to-br from-primary/40 via-primary/20 to-background overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/30 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent" />
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="bg-background/50 backdrop-blur-sm hover:bg-background/80 gap-1.5 text-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Button>
        </div>
      </div>

      {/* Profile Header - overlaps banner */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-20 md:-mt-24 relative z-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 mb-8">
          <Avatar className="w-28 h-28 sm:w-32 sm:h-32 border-4 border-background shadow-xl ring-2 ring-primary/20">
            <AvatarFallback className="text-3xl sm:text-4xl font-bold bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
              {profile.full_name ? getInitials(profile.full_name) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="text-center sm:text-left sm:pb-2 flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">
              {profile.full_name || "Anonymous User"}
            </h1>
            <p className="text-sm text-muted-foreground">
              @{profile.username || "unknown"}
              {profile.target_company && (
                <span className="hidden sm:inline"> &middot; Targeting {profile.target_company}</span>
              )}
            </p>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <Card className="border-primary/10 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Target</p>
                <p className="font-semibold text-sm truncate">{profile.target_company || "Not set"}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/10 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">CGPA</p>
                <p className="font-semibold text-sm">{cgpa ? `${cgpa.toFixed(2)} / 10` : "N/A"}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/10 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Study Plans</p>
                <p className="font-semibold text-sm">{planCount} {planCount === 1 ? "Plan" : "Plans"}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/10 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Grad Year</p>
                <p className="font-semibold text-sm">{profile.graduation_year || "N/A"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - About */}
          <div className="space-y-6">
            {/* About Card */}
            <Card className="border-border/50 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70 mb-4 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> About
                </h2>
                <div className="space-y-3.5">
                  {profile.college && (
                    <div className="flex items-start gap-3 text-sm">
                      <Building2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{profile.college}</span>
                    </div>
                  )}
                  {profile.degree && (
                    <div className="flex items-start gap-3 text-sm">
                      <GraduationCap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <span className="text-muted-foreground">{profile.degree}</span>
                        {profile.graduation_year && (
                          <span className="text-muted-foreground/60 ml-1">
                            &middot; Class of {profile.graduation_year}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {profile.target_company && (
                    <div className="flex items-start gap-3 text-sm">
                      <Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <span className="text-muted-foreground">Preparing for </span>
                        <span className="font-medium text-foreground">{profile.target_company}</span>
                      </div>
                    </div>
                  )}
                  {profile.current_cgpa && (
                    <div className="flex items-start gap-3 text-sm">
                      <Award className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">CGPA</span>
                          <span className="font-semibold">{profile.current_cgpa} / 10</span>
                        </div>
                        <Progress value={cgpaPercent} className="h-1.5" />
                      </div>
                    </div>
                  )}
                  {!profile.college && !profile.degree && !profile.target_company && !profile.current_cgpa && (
                    <p className="text-muted-foreground/60 text-sm italic">No details added yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Info Card */}
            <Card className="border-border/50 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-amber-500/60 via-amber-500/30 to-transparent" />
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5" /> Overview
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-secondary/50">
                    <p className="text-2xl font-bold text-primary">{planCount}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Study Plans</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-secondary/50">
                    <p className="text-2xl font-bold text-primary">
                      {profile.study_plans.reduce((max, p) => Math.max(max, p.available_days), 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Max Days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Study Plans */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Study Plans & Milestones
              </h2>
              {planCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {planCount} {planCount === 1 ? "plan" : "plans"}
                </Badge>
              )}
            </div>

            {planCount === 0 ? (
              <Card className="border-dashed border-border/60">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-primary/40" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">No Study Plans Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    {profile.full_name?.split(" ")[0] || "This user"} hasn&apos;t created any study plans yet. Check back later!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {profile.study_plans.map((plan) => (
                  <Card
                    key={plan.id}
                    className="border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 group overflow-hidden"
                  >
                    <CardContent className="p-0">
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                              <TrendingUp className="w-5 h-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-base truncate">
                                {plan.target_company} Preparation
                              </h3>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Started {new Date(plan.created_at).toLocaleDateString("en-US", {
                                  year: "numeric", month: "short", day: "numeric"
                                })}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={skillBadge[plan.skill_level] as "secondary" | "destructive" | "default" | "outline"}
                            className="text-xs shrink-0 ml-2"
                          >
                            {plan.skill_level}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{plan.available_days} days</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {new Date(plan.created_at).toLocaleDateString("en-US", {
                                month: "short", day: "numeric", year: "numeric"
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Progress bar based on days */}
                      <div className="h-1 bg-secondary w-full">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-700"
                          style={{ width: `${Math.min((plan.available_days / 365) * 100, 100)}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
