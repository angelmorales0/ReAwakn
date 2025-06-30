"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signup } from "@/lib/auth-actions";
import { useState } from "react";
import supabase from "@/app/utils/supabase/client";

export function SignUpForm() {
  const [userData, setUserData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const supabaseClient = supabase();
    const { error } = await supabaseClient
      .from("users")
      .insert(userData)
      .single(); //updates database
    const { data: signUpData, error: signUpError } =
      await supabaseClient.auth.signUp({
        email: userData.email,
        password: userData.password,
      });

    if (signUpError) {
      alert(signUpError);
    } else {
      if (signUpData.user) {
        console.log("User ID:", signUpData.user.id);
        console.log("Email:", signUpData.user.email);
        console.log("Full Name:", signUpData.user.user_metadata.full_name);
        console.log(
          "Email Confirmed:",
          signUpData.user.email_confirmed_at !== null
        );
      }
      setShowVerificationMessage(true);
    }
  };

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Sign Up</CardTitle>
        <CardDescription>
          Enter your information to create an account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first-name">First name</Label>
                <Input
                  onChange={(e) =>
                    setUserData((prev) => ({
                      ...prev,
                      first_name: e.target.value,
                    }))
                  }
                  name="first-name"
                  id="first-name"
                  placeholder="Max"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last-name">Last name</Label>
                <Input  
                  onChange={(e) =>
                    setUserData((prev) => ({
                      ...prev,
                      last_name: e.target.value,
                    }))
                  }
                  name="last-name"
                  id="last-name"
                  placeholder="Robinson"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                onChange={(e) =>
                  setUserData((prev) => ({ ...prev, email: e.target.value }))
                }
                name="email"
                id="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                onChange={(e) =>
                  setUserData((prev) => ({ ...prev, password: e.target.value }))
                }
                name="password"
                id="password"
                type="password"
              />
            </div>
            <Button formAction={signup} type="submit" className="w-full">
              Create an account
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </form>
      {showVerificationMessage && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800 text-center">
            Please check your email for verification to complete your account
            setup.
          </p>
        </div>
      )}
    </Card>
  );
}
