"use client";
import React from "react";
import { useState, useEffect } from "react";
import createClient from "@/app/utils/supabase/client";

export default function ListMessages() {
  const supabase = createClient();
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("created_at, text, sent_by");

      if (error) {
        console.error("Error fetching messages:", error);
      } else {
        setMessages(data);
      }
    };

    fetchMessages();
  }, []);
  console.log("msg", messages); // Each message should have name, message

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto">
      <div className="flex-1"></div>
      <div className="space-y-7">
        {messages.map((message, index) => {
          return (
            <div key={index} className="flex gap-2">
              <div className="h-10 w-10 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <h1 className="font-bold">{message.sent_by}</h1>
                  <h1 className="text-sm text-gray-400">
                    {new Date(message.created_at).toDateString()}
                  </h1>
                </div>
                <p className="text-gray-300">{message.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
