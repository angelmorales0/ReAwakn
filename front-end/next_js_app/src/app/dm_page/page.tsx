import React from "react";
import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
export default function DmPage() {
  return (
    <div className="max-w-3x1 mx-auto md:py-10 h-screen">
      <div className=" h-full border rounded-md flex flex-col ">
        <ChatHeader />
        <div className="flex-1 flex flex-col h-full overflow-y-auto">
          <div className="flex-1"></div>
          <div className="space-y-7">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((_, index) => {
              return (
                <div key={index} className="flex gap-2">
                  <div className="h-10 w-10 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <h1 className="font-bold">Name</h1>
                      <h1 className="text-sm text-gray-400">
                        {new Date().toDateString()}
                      </h1>
                    </div>
                    <p className="text-gray-300">Message goes here</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <ChatInput />
      </div>
    </div>
  );
}
