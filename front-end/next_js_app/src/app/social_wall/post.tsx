"use client";
import React, { use, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import createClient from "@/app/utils/supabase/client";
import CommentModal from "./comment_modal";

type Post = {
  id: string;
  created_at: string;
  author_id: string;
  caption: string;
  title: string;
  author_name: string;
};

interface PostProps {
  post: Post;
  formatDate: (dateString: string) => string;
}

export default function PostCard({ post, formatDate }: PostProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentList, setCommentList] = useState<any>([]);
  const supabase = createClient();
  const [isAlreadyLiked, setIsAlreadyLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const getUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  };
  const handleSubmitComment = async () => {
    //make a supabase insert on comments table
    const user = await getUser();
    const { data, error } = await supabase.from("post_comments").upsert([
      {
        post_id: post.id,
        author_id: user?.id,
        post_content: commentText,
        author_name: user?.user_metadata.user_name,
      },
    ]);
    setIsModalOpen(false);
  };

  const getComments = async () => {
    const { data, error } = await supabase
      .from("post_comments")
      .select("author_name, post_content")
      .eq("post_id", post.id);
    setCommentList(data);
  };

  const alreadyLiked = async () => {
    const user = await getUser();
    const { data, error } = await supabase
      .from("post_likes")
      .select("*")
      .or(
        `and(user_id.eq.${user?.id},post_id.eq.${post.id}),and(post_id.eq.${post.id},user_id.eq.${user?.id})`
      )
      .limit(1);
    return data && data.length > 0; // return True if the post id userid pairing exists in the table
  };
  useEffect(() => {
    const checkIfLiked = async () => {
      const liked = await alreadyLiked();
      if (liked) {
        setIsAlreadyLiked(liked);
      } else {
        setIsAlreadyLiked(false);
      }
    };
    getLikeCount();
    checkIfLiked();
  }, []);

  const getLikeCount = async () => {
    const { count, error } = await supabase
      .from("post_likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", post.id);
    setLikeCount(count || 0);
  };
  const handleLike = async () => {
    const user = await getUser();

    if (isAlreadyLiked) {
      setIsAlreadyLiked(false);
      const { data, error } = await supabase
        .from("post_likes")
        .delete()
        .match({ user_id: user?.id, post_id: post.id });
    } else {
      if (user) {
        const { error } = await supabase
          .from("post_likes")
          .insert([{ user_id: user?.id, post_id: post.id }]);
      }
      setIsAlreadyLiked(true);
    }

    getLikeCount();
  };
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 transform hover:-translate-y-1">
      <div className="flex items-center p-4 border-b border-gray-100">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0 flex items-center justify-center text-white font-bold">
          {post.author_name.substring(0, 1).toUpperCase()}
        </div>
        <div className="ml-3">
          <p className="font-medium text-sm text-gray-700">
            {post.author_name.substring(0, 6)}
          </p>
          <p className="text-xs text-gray-400">{formatDate(post.created_at)}</p>
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
          <p className="text-gray-600 leading-relaxed">{post.caption}</p>
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-center">
        <div className="flex space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center space-x-1 text-gray-600 hover:text-blue-500"
            onClick={handleLike}
          >
            <span>{isAlreadyLiked ? "❤️" : "🤍"}</span>

            <span>Like</span>
            <span>{likeCount}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="flex items-center space-x-1 text-gray-600 hover:text-blue-500"
            onClick={() => {
              setIsModalOpen(true);
              getComments();
            }}
          >
            <span>💬</span>
            <span>Comment</span>
          </Button>
        </div>

        <span className="text-xs text-gray-400">
          {formatDate(post.created_at)}
        </span>
        <CommentModal
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          handleSubmitComment={handleSubmitComment}
          comment={commentText}
          setComment={setCommentText}
          comments={commentList}
        />
      </div>
    </div>
  );
}
