import { useState, useCallback } from "react";
import {
  SimilarUser,
  CompatibilityScore,
  UseSimilarityReturn,
} from "@/types/types";

export function useSimilarity(): UseSimilarityReturn {
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [similarUsers, setSimilarUsers] = useState<SimilarUser[]>([]);
  const [compatibility, setCompatibility] = useState<CompatibilityScore | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateSimilarity = useCallback(
    async (loggedInUserId: string, targetUserId: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/similarity", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            loggedInUserId,
            targetUserId,
            action: "similarity",
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to calculate similarity");
        }

        setSimilarity(data.similarity);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const findSimilarUsers = useCallback(
    async (userId: string, topN: number = 10) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/similarity", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            loggedInUserId: userId,
            targetUserId: "", //TODO ENSURE TAKING THIS OUT WONT BREAK IT
            action: "compatible_users",
            topN,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to find similar users");
        }

        setSimilarUsers(data.similarUsers || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getDetailedCompatibility = useCallback(
    async (loggedInUserId: string, targetUserId: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/similarity", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            loggedInUserId,
            targetUserId,
            action: "detailed_compatibility",
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to get detailed compatibility");
        }

        setCompatibility(data.compatibility);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearResults = useCallback(() => {
    setSimilarity(null);
    setSimilarUsers([]);
    setCompatibility(null);
    setError(null);
  }, []);

  return {
    similarity,
    similarUsers,
    compatibility,
    loading,
    error,
    calculateSimilarity,
    findSimilarUsers,
    getDetailedCompatibility,
    clearResults,
  };
}
