"use client";
import React, { useState } from "react";

interface RefreshSimilarityButtonProps {
  onRefreshComplete?: () => void;
}

export default function RefreshSimilarityButton({
  onRefreshComplete,
}: RefreshSimilarityButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/similarity/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        if (onRefreshComplete) {
          onRefreshComplete();
        }
      } else {
      }
    } catch (error) {
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          isRefreshing
            ? "bg-gray-400 text-white cursor-not-allowed"
            : "bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500"
        }`}
        title="Refresh similarity data to include new users"
      >
        {isRefreshing ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Refreshing...</span>
          </div>
        ) : (
          "Refresh Similarity Data"
        )}
      </button>
    </div>
  );
}
