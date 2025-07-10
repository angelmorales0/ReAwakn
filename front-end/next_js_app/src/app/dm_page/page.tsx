"use client";
import React, { useState, useEffect } from "react";
import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";
import createClient from "@/app/utils/supabase/client";
import { Message } from "@/types/types";

export default function DmPage() {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [convoId, setConvoId] = useState<string | null>(null);
  const [isListUpdated, setIsListUpdated] = useState(true);
  const [name, setName] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setConvoId(params.get("id"));
    setName(params.get("user") || "");
    const channel = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          setIsListUpdated(false); // This is the line that subrscribes to our database and is ran upon a new insert
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel); // Deletes our previous client before reloading page
    };
  }, []);

  const fetchMessages = async () => {
    if (!convoId) {
      return;
    }
    const { data, error } = await supabase
      .from("messages")
      .select("created_at, text, sent_by")
      .eq("conversation_id", convoId);

    if (error) {
      //Do nothing
    } else {
      setMessages(data);
      setIsListUpdated(true);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [convoId, isListUpdated]);

  const refreshMessages = () => {
    fetchMessages();
  };

  return (
    <div className="max-w-3xl mx-auto md:py-10 h-screen">
      <div className=" h-full border rounded-md flex flex-col ">
        <ChatHeader name={name} />
        <ChatMessage messages={messages} />
        <ChatInput onMessageSent={refreshMessages} />
      </div>
    </div>
  );
}
