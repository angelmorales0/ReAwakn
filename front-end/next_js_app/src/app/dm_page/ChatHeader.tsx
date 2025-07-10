import React from "react";
import HomeButton from "../../components/homeButton";

const ChatHeader = ({ name }: any) => {
  return (
    <div className="h-20">
      <div className="p-5 border-b">
        <div className="flex items-center justify-between">
          <HomeButton />
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold">{name}</h1>
            <div className="flex items-center justify-center gap-1"></div>
          </div>
          <div className="w-32"></div>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
