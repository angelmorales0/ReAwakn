"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import createClient from "@/app/utils/supabase/client";

interface MatchUser {
  id: string;
  name: string;
  email?: string;
  maxLearnScore?: number;
  maxTeachScore?: number;
}

export default function TopMatchesSidebar() {
  const [topMatches, setTopMatches] = useState<MatchUser[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  // Cosine similarity calculation
  function cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Calculate learning/teaching similarity scores
  async function calculateSimilarityScores(
    loggedInUserId: string,
    targetUserId: string
  ) {
    let max_learn_score = 0;
    let max_teach_score = 0;

    const { data: loggedInUserData } = await supabase
      .from("user_skills")
      .select("skill, type, embedding")
      .eq("user_id", loggedInUserId);

    let loggedInUserLearnSkills: number[][] = [];
    let loggedInUserTeachSkills: number[][] = [];

    loggedInUserData?.forEach((skill) => {
      if (skill.type === "learn" && skill.embedding) {
        try {
          const embedding =
            typeof skill.embedding === "string"
              ? JSON.parse(skill.embedding)
              : skill.embedding;

          // Handle both array and object formats
          if (Array.isArray(embedding)) {
            loggedInUserLearnSkills.push(embedding);
          } else if (typeof embedding === "object" && embedding !== null) {
            // Convert object format {0: 102, 1: 111, ...} to array [102, 111, ...]
            const keys = Object.keys(embedding).sort(
              (a, b) => Number(a) - Number(b)
            );
            const embeddingArray = keys.map((key) => embedding[key]);
            loggedInUserLearnSkills.push(embeddingArray);
          }
        } catch (error) {
          alert(error);
        }
      } else if (skill.type === "teach" && skill.embedding) {
        try {
          const embedding =
            typeof skill.embedding === "string"
              ? JSON.parse(skill.embedding)
              : skill.embedding;

          // Handle both array and object formats
          if (Array.isArray(embedding)) {
            loggedInUserTeachSkills.push(embedding);
          } else if (typeof embedding === "object" && embedding !== null) {
            // Convert object format {0: 102, 1: 111, ...} to array [102, 111, ...]
            const keys = Object.keys(embedding).sort(
              (a, b) => Number(a) - Number(b)
            );
            const embeddingArray = keys.map((key) => embedding[key]);
            loggedInUserTeachSkills.push(embeddingArray);
          }
        } catch (error) {
          alert(error);
        }
      }
    });

    const { data: targetUserData } = await supabase
      .from("user_skills")
      .select("skill, type, embedding")
      .eq("user_id", targetUserId);

    let targetUserLearnSkills: number[][] = [];
    let targetUserTeachSkills: number[][] = [];

    targetUserData?.forEach((skill) => {
      if (skill.type === "learn" && skill.embedding) {
        try {
          const embedding =
            typeof skill.embedding === "string"
              ? JSON.parse(skill.embedding)
              : skill.embedding;

          // Handle both array and object formats
          if (Array.isArray(embedding)) {
            targetUserLearnSkills.push(embedding);
          } else if (typeof embedding === "object" && embedding !== null) {
            // Convert object format {0: 102, 1: 111, ...} to array [102, 111, ...]
            const keys = Object.keys(embedding).sort(
              (a, b) => Number(a) - Number(b)
            );
            const embeddingArray = keys.map((key) => embedding[key]);
            targetUserLearnSkills.push(embeddingArray);
          }
        } catch (error) {
          alert(error);
        }
      } else if (skill.type === "teach" && skill.embedding) {
        try {
          const embedding =
            typeof skill.embedding === "string"
              ? JSON.parse(skill.embedding)
              : skill.embedding;

          // Handle both array and object formats
          if (Array.isArray(embedding)) {
            targetUserTeachSkills.push(embedding);
          } else if (typeof embedding === "object" && embedding !== null) {
            // Convert object format {0: 102, 1: 111, ...} to array [102, 111, ...]
            const keys = Object.keys(embedding).sort(
              (a, b) => Number(a) - Number(b)
            );
            const embeddingArray = keys.map((key) => embedding[key]);
            targetUserTeachSkills.push(embeddingArray);
          }
        } catch (error) {
          alert(error);
        }
      }
    });

    // Calculate learning match score: logged-in user's learn skills vs target user's teach skills
    for (let i = 0; i < loggedInUserLearnSkills.length; i++) {
      for (let j = 0; j < targetUserTeachSkills.length; j++) {
        const similarity = cosineSimilarity(
          loggedInUserLearnSkills[i],
          targetUserTeachSkills[j]
        );
        if (similarity > max_learn_score) {
          max_learn_score = similarity;
        }
      }
    }

    // Calculate teaching match score: logged-in user's teach skills vs target user's learn skills
    for (let i = 0; i < loggedInUserTeachSkills.length; i++) {
      for (let j = 0; j < targetUserLearnSkills.length; j++) {
        const similarity = cosineSimilarity(
          loggedInUserTeachSkills[i],
          targetUserLearnSkills[j]
        );
        if (similarity > max_teach_score) {
          max_teach_score = similarity;
        }
      }
    }

    return { max_learn_score, max_teach_score };
  }

  useEffect(() => {
    const fetchTopMatches = async () => {
      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (!userData) return;

        // Get all other users who completed onboarding
        const { data: allUsers } = await supabase
          .from("users")
          .select("id, display_name, email")
          .eq("completed_onboarding", true)
          .neq("id", user.id)
          .limit(20); // Limit for performance

        if (!allUsers || allUsers.length === 0) {
          setLoading(false);
          return;
        }

        // Calculate similarity scores for each user
        const usersWithScores: MatchUser[] = [];

        for (const targetUser of allUsers) {
          const { max_learn_score, max_teach_score } =
            await calculateSimilarityScores(user.id, targetUser.id);

          // Only include users with good matches (>= 0.7)
          if (max_learn_score >= 0.7 || max_teach_score >= 0.7) {
            usersWithScores.push({
              id: targetUser.id,
              name: targetUser.display_name,
              email: targetUser.email,
              maxLearnScore: max_learn_score,
              maxTeachScore: max_teach_score,
            });
          }
        }

        // Sort by highest score (either learn or teach) and take top 5
        const sortedMatches = usersWithScores
          .sort((a, b) => {
            const maxScoreA = Math.max(
              a.maxLearnScore || 0,
              a.maxTeachScore || 0
            );
            const maxScoreB = Math.max(
              b.maxLearnScore || 0,
              b.maxTeachScore || 0
            );
            return maxScoreB - maxScoreA;
          })
          .slice(0, 5);

        setTopMatches(sortedMatches);
      } catch (error) {
        alert(error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopMatches();
  }, []);

  const viewProfile = (userId: string) => {
    try {
      router.push(`/profile_page?id=${userId}`);
    } catch (error) {
      alert(error);
    }
  };

  if (loading) {
    return (
      <div className="w-80 bg-black border-l border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Top Matches
        </h2>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (topMatches.length === 0) {
    return (
      <div className="w-80 bg-black border-l border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Top Matches
        </h2>
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-2">🔍</div>
          <p className="text-sm">No good matches found yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Try adding more skills to find better matches
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-black border-l border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-white-900 mb-4">Top Matches</h2>
      <div className="space-y-4">
        {topMatches.map((match) => (
          <div
            key={match.id}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => viewProfile(match.id)}
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {match.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white-900 truncate">
                  {match.name}
                </h3>
                {match.email && (
                  <p className="text-xs text-white-500 truncate">
                    {match.email}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              {match.maxLearnScore !== undefined &&
                match.maxLearnScore >= 0.7 && (
                  <div className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full inline-block mr-1">
                    🎓 Good to Learn From
                  </div>
                )}
              {match.maxTeachScore !== undefined &&
                match.maxTeachScore >= 0.7 && (
                  <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full inline-block">
                    👨‍🏫 Good to Teach
                  </div>
                )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={() => router.push("/search_page")}
          className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View All Members →
        </button>
      </div>
    </div>
  );
}
