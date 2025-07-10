"use client";
import React, { useState, useEffect } from "react";
import createClient from "@/app/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Post = {
  created_at: string; // or Date
  author_id: string;
  title: string;
  caption: string;
};

export default function CreatePost() {
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const supabase = createClient();

  const getCurrentUser = async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    return user;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const user = await getCurrentUser();
    console.log(user, "!");
    if (!user) {
      alert("You must be logged in to create a post");
      router.push("/login");
      return;
    }

    const { data, error } = await supabase.from("posts").insert([
      {
        author_id: user.id,
        title: title,
        caption: caption,
        created_at: new Date().toISOString(),
        author_name: user.user_metadata.user_name,
      },
    ]);

    if (error) throw error;

    router.push("/");
  };

  useEffect(() => {
    getCurrentUser();
  }, []);

  return (
    <div className="container mx-auto py-8 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Create New Post
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter post title"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="caption" className="text-sm font-medium">
                Caption
              </label>
              <Textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write your post caption here..."
                rows={5}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Publishing..." : "Publish Post"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="outline" onClick={() => router.push("/")}>
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
