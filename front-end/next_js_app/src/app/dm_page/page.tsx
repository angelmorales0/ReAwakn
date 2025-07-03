import React from "react";
import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";
export default function DmPage() {
  return (
    <div className="max-w-3xl mx-auto md:py-10 h-screen">
      <div className=" h-full border rounded-md flex flex-col ">
        <ChatHeader />

        <ChatMessage />
        <ChatInput />
      </div>
    </div>
  );
}
