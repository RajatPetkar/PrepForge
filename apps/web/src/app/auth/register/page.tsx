"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { fetchApi } from "@/lib/api";
import { Loader2, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const fullName = formData.get("full_name") as string;
    const phone = formData.get("phone") as string;
    const college = formData.get("college") as string;
    const degree = formData.get("degree") as string;
    const gradYear = formData.get("graduation_year") as string;
    const cgpa = formData.get("current_cgpa") as string;
    const targetCompany = formData.get("target_company") as string;

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    try {
      await fetchApi("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          username,
          password,
          full_name: fullName,
          phone,
          college,
          degree,
          graduation_year: gradYear,
          current_cgpa: cgpa,
          target_company: targetCompany,
        }),
      });
      toast.success("Account created successfully! Please sign in.");
      router.push("/auth/login");
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground mt-1">Start your AI-powered interview preparation</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Core Auth Info */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" name="full_name" required placeholder="John Doe" className="h-10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" name="phone" placeholder="+1 234 567 8900" className="h-10" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" required placeholder="johndoe" className="h-10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" name="email" type="email" required placeholder="you@example.com" autoComplete="email" className="h-10" />
          </div>
        </div>

        {/* Academic Info */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
          <div className="space-y-2 col-span-2">
            <Label htmlFor="college">College / University</Label>
            <Input id="college" name="college" placeholder="E.g. Stanford University" className="h-10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="degree">Degree</Label>
            <Input id="degree" name="degree" placeholder="E.g. B.Tech CSE" className="h-10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="graduation_year">Grad Year</Label>
            <Input id="graduation_year" name="graduation_year" placeholder="2025" className="h-10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="current_cgpa">Current CGPA</Label>
            <Input id="current_cgpa" name="current_cgpa" placeholder="8.5" className="h-10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target_company">Target Company</Label>
            <Input id="target_company" name="target_company" placeholder="E.g. Google" className="h-10" />
          </div>
        </div>

        {/* Password Info */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required placeholder="Min 8 chars" autoComplete="new-password" className="h-10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required placeholder="Repeat password" autoComplete="new-password" className="h-10" />
          </div>
        </div>

        <Button className="w-full h-11 font-semibold glow mt-2" type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              Create account
            </>
          )}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
