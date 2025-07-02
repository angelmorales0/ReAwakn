"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import supabaseBrowser from "@/app/utils/supabase/client";

export default function ChatInput() {
  const supabase = supabaseBrowser();

  const sendMessage = (text: string) => {
    //TODO Call to supabase to insert message to database
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
