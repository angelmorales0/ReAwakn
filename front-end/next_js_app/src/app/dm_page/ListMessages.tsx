"use client";
import React, { useEffect, useState } from "react";
import { Message } from "@/types/types";

interface ListMessagesProps {
  messages: Message[];
}
import createClient from "../utils/supabase/client";

export default function ListMessages({ messages }: ListMessagesProps) {
  const supabase = createClient();
  const [userNames, setUserNames] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchUserNames = async () => {
      const userIds = messages.map((message) => message.sent_by);
      const { data, error } = await supabase
        .from("users")
        .select("id, display_name")
        .in("id", userIds);

      if (error) {
        return;
      }
      // Creates a hashmap mapping user id to their display names
      const namesMap = data.reduce((acc: { [key: string]: string }, user) => {
        acc[user.id] = user.display_name;
        return acc;
      }, {});

      setUserNames(namesMap);
    };

    fetchUserNames();
  }, [messages]);

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
                  <h1 className="font-bold">{userNames[message.sent_by]}</h1>

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
