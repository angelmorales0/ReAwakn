"use client";
import React, { useState, useEffect } from "react";
import createClient from "@/app/utils/supabase/client";
import PostCard from "./post";

type Post = {
  id: string;
  created_at: string;
  author_id: string;
  caption: string;
  title: string;
  author_name: string;
};

export default function SocialWall() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const getPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .select("id,created_at,author_id, caption, title, author_name")
      .order("created_at", { ascending: false });

    if (error) {
    } else {
      setPosts(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    getPosts();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Social Wall</h1>

      {loading ? (
        <div className="flex justify-center">
          <p className="text-gray-500">Loading posts...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500">No posts yet. Be the first to share!</p>
        </div>
      ) : (
        <div className="flex flex-col space-y-8 max-w-2xl mx-auto">
          {posts.map((post, index) => (
            <PostCard key={index} post={post} formatDate={formatDate} />
            //NEEED TO FIX POST CARD INPUT 
          ))}
        </div>
      )}
    </div>
  );
}
