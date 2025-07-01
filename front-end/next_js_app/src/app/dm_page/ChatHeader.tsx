import React from "react";

const ChatHeader = () => {
  return (
    <div className="h-20">
      <div className="p-5 border-b">
        <div>
          <h1 className="text-xl font-bold">DM A USER</h1>
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 bg-green-500 rounded-full animate-pulse"></div>
            <h1 className="text-sm text-gray-400"> x online</h1>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
