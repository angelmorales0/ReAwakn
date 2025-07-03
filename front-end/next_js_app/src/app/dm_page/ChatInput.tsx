"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import createClient from "@/app/utils/supabase/client";
import { toast } from "sonner";
export default function ChatInput() {
  const supabase = createClient();

  const sendMessage = async (text: string) => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      toast.error("Authentication error");
      return;
    }

    if (!user) {
      toast.error("You must be logged in to send messages");
      return;
    }

    const { data, error } = await supabase.from("messages").insert({
      text,
      sent_by: user.id,
    });

    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      toast.success("Message sent!");
    }
  };
  return (
    <div className="p-5">
      <Input
        placeholder="send-msg"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            sendMessage(e.currentTarget.value);
            e.currentTarget.value = "";
          }
        }}
      />
    </div>
  );
}
