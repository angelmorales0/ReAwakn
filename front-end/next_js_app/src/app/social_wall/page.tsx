"use client";
import React, { useState, useEffect } from "react";
import createClient from "@/app/utils/supabase/client";

type Post = {
  created_at: string; // or Date
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
      .select("created_at,author_id, caption, title, author_name")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching posts:", error);
    } else {
      setPosts(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    getPosts();
  }, []);

  useEffect(() => {
    console.log("All posts:", posts);
    posts.forEach((post, index) => {
      console.log(`Post ${index}:`, post);
      console.log(`Post ${index} title:`, post.title);
      console.log(`Post ${index} title type:`, typeof post.title);
    });
  }, [posts]);
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
            <div
              key={index}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 transform hover:-translate-y-1"
            >
              <div className="flex items-center p-4 border-b border-gray-100">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0 flex items-center justify-center text-white font-bold">
                  {post.author_name.substring(0, 1).toUpperCase()}
                </div>
                <div className="ml-3">
                  <p className="font-medium text-sm text-gray-700">
                    {post.author_name.substring(0, 6)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDate(post.created_at)}
                  </p>
                </div>
              </div>

              {post.title && (
                <div className="px-4 pt-4">
                  <h2 className="font-bold text-xl text-gray-800 leading-tight">
                    {post.title}
                  </h2>
                  <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded mt-2"></div>
                </div>
              )}

              <div className="p-4">
                {post.caption && (
                  <p className="text-gray-600 leading-relaxed">
                    {post.caption}
                  </p>
                )}
              </div>

              <div className="px-4 py-3 bg-gray-50 text-sm text-gray-500">
                <span>{formatDate(post.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
