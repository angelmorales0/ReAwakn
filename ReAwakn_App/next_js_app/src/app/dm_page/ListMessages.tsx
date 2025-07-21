"use client";
import React, { useEffect, useState } from "react";
import { ListOfMessages } from "@/types/types";
import { supabase } from "@/app/utils/supabase/client";

export default function ListMessages({ messages }: ListOfMessages) {
  const [userNames, setUserNames] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchUserNamesForMessages = async () => {
      const userIds = messages.map((message) => message.sent_by);
      const { data, error } = await supabase
        .from("users")
        .select("id, display_name")
        .in("id", userIds);

      if (error) {
        alert("Error Fetching Usernames");

        return;
      }
      const namesMap = data.reduce((acc: { [key: string]: string }, user) => {
        acc[user.id] = user.display_name;
        return acc;
      }, {});

      setUserNames(namesMap);
    };

    fetchUserNamesForMessages();
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
