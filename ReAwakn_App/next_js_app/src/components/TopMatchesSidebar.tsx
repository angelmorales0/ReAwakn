"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/app/utils/supabase/client";
import { MatchUser } from "@/types/types";
import { calculateUserSimilarityScores } from "@/utility_methods/memberCardUtils";
import { getAuthUser } from "@/utility_methods/userUtils";

const MATCH_THRESHOLD = 0.8;

export default function TopMatchesSidebar() {
  const [topMatches, setTopMatches] = useState<MatchUser[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchTopMatches = async () => {
      try {
        const user = await getAuthUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const { data: userData } = await supabase()
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (!userData) {
          setLoading(false);
          return;
        }

        const { data: allUsers } = await supabase()
          .from("users")
          .select("id, display_name, email, profile_pic_url")
          .eq("completed_onboarding", true)
          .neq("id", user.id)
          .limit(5);

        if (!allUsers || allUsers.length === 0) {
          setLoading(false);
          return;
        }

        const usersWithScores: MatchUser[] = [];

        for (const targetUser of allUsers) {
          try {
            const { max_learn_score, max_teach_score } =
              await calculateUserSimilarityScores(user.id, targetUser.id);

            if (
              max_learn_score >= MATCH_THRESHOLD ||
              max_teach_score >= MATCH_THRESHOLD
            ) {
              usersWithScores.push({
                id: targetUser.id,
                name: targetUser.display_name,
                email: targetUser.email,
                profilePicUrl: targetUser.profile_pic_url,
                maxLearnScore: max_learn_score,
                maxTeachScore: max_teach_score,
              });
            }
          } catch (error) {
            alert(error);
          }
        }

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
              {match.profilePicUrl ? (
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <img
                    src={match.profilePicUrl}
                    alt={`${match.name}'s profile`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {match.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
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
                match.maxLearnScore >= MATCH_THRESHOLD && (
                  <div className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full inline-block mr-1">
                    🎓 Good to Learn From
                  </div>
                )}
              {match.maxTeachScore !== undefined &&
                match.maxTeachScore >= MATCH_THRESHOLD && (
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
