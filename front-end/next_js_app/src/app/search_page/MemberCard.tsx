import { useRouter } from "next/navigation";
import { MemberCardProps } from "@/types/types";
import { supabase } from "@/app/utils/supabase/client";
import { useState, useEffect } from "react";

export default function MemberCard({
  member,
  loggedInUserId = "",
  showSimilarityScore = false,
  loggedInUser,
}: MemberCardProps) {
  const [isDisabled, setIsDisabled] = useState(false);
  const [maxLearnScore, setMaxLearnScore] = useState<number | undefined>(
    undefined
  );
  const [maxTeachScore, setMaxTeachScore] = useState<number | undefined>(
    undefined
  );

  const router = useRouter();

  const [isFriends, setIsFriends] = useState(false);

  function cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }
    return dotProduct / (magnitudeA * magnitudeB);
  }

  //can we use useCallback here? otherwise this function object will get recreated at every render of the component.

  async function hasSimilarSkills(loggedInUserId: string, user2ID: string) {
    let max_learn_score = 0;
    let max_teach_score = 0;

    const { data: loggedInUserData } = await supabase
      .from("user_skills")
      .select("skill, type, embedding")
      .eq("user_id", loggedInUserId);

    let loggedInUserLearnSkills: number[][] = [];
    let loggedInUserTeachSkills: number[][] = [];
    loggedInUserData?.forEach((loggedInUserSkill) => {
      if (loggedInUserSkill.type === "learn" && loggedInUserSkill.embedding) {
        try {
          const embedding =
            typeof loggedInUserSkill.embedding === "string"
              ? JSON.parse(loggedInUserSkill.embedding)
              : loggedInUserSkill.embedding;

          if (Array.isArray(embedding)) {
            loggedInUserLearnSkills.push(embedding);
          } else if (typeof embedding === "object" && embedding !== null) {
            const keys = Object.keys(embedding).sort(
              (a, b) => Number(a) - Number(b)
            );
            const embeddingArray = keys.map((key) => embedding[key]);
            loggedInUserLearnSkills.push(embeddingArray);
          }
        } catch (error) {
          alert(error);
        }
      } else if (
        loggedInUserSkill.type === "teach" &&
        loggedInUserSkill.embedding
      ) {
        const embedding =
          typeof loggedInUserSkill.embedding === "string"
            ? JSON.parse(loggedInUserSkill.embedding)
            : loggedInUserSkill.embedding;

        if (Array.isArray(embedding)) {
          loggedInUserTeachSkills.push(embedding);
        } else if (typeof embedding === "object" && embedding !== null) {
          const keys = Object.keys(embedding).sort(
            (a, b) => Number(a) - Number(b)
          );
          const embeddingArray = keys.map((key) => embedding[key]);
          loggedInUserTeachSkills.push(embeddingArray);
        }
      }
    });

    const { data: user2Data } = await supabase
      .from("user_skills")
      .select("skill, type, embedding")
      .eq("user_id", user2ID);

    let secondaryUserLearnSkills: number[][] = [];
    let secondaryUserTeachSkills: number[][] = [];

    user2Data?.forEach((user2Skill) => {
      if (user2Skill.type === "learn" && user2Skill.embedding) {
        try {
          const embedding =
            typeof user2Skill.embedding === "string"
              ? JSON.parse(user2Skill.embedding)
              : user2Skill.embedding;

          if (Array.isArray(embedding)) {
            secondaryUserLearnSkills.push(embedding);
          } else if (typeof embedding === "object" && embedding !== null) {
            const keys = Object.keys(embedding).sort(
              (a, b) => Number(a) - Number(b)
            );
            const embeddingArray = keys.map((key) => embedding[key]);
            secondaryUserLearnSkills.push(embeddingArray);
          }
        } catch (error) {
          alert(error);
        }
      } else if (user2Skill.type === "teach" && user2Skill.embedding) {
        try {
          const embedding =
            typeof user2Skill.embedding === "string"
              ? JSON.parse(user2Skill.embedding)
              : user2Skill.embedding;

          if (Array.isArray(embedding)) {
            secondaryUserTeachSkills.push(embedding);
          } else if (typeof embedding === "object" && embedding !== null) {
            const keys = Object.keys(embedding).sort(
              (a, b) => Number(a) - Number(b)
            );
            const embeddingArray = keys.map((key) => embedding[key]);
            secondaryUserTeachSkills.push(embeddingArray);
          }
        } catch (error) {
          alert(error);
        }
      }
    });

    for (let i = 0; i < loggedInUserLearnSkills.length; i++) {
      const loggedInLearnEmbedding = loggedInUserLearnSkills[i];

      for (let j = 0; j < secondaryUserTeachSkills.length; j++) {
        const otherUserTeachEmbedding = secondaryUserTeachSkills[j];

        const similarity = cosineSimilarity(
          loggedInLearnEmbedding,
          otherUserTeachEmbedding
        );

        // Update max learning score if this similarity is higher
        if (similarity > max_learn_score) {
          max_learn_score = similarity;
        }
      }
    }

    for (let i = 0; i < loggedInUserTeachSkills.length; i++) {
      for (let j = 0; j < secondaryUserLearnSkills.length; j++) {
        const otherUserLearnEmbedding = secondaryUserLearnSkills[j];
        const loggedInTeachEmbedding = loggedInUserTeachSkills[i];
        const similarity = cosineSimilarity(
          loggedInTeachEmbedding,
          otherUserLearnEmbedding
        );
        if (similarity > max_teach_score) {
          max_teach_score = similarity;
        }
      }
    }

    return { max_learn_score, max_teach_score };
  }

  const checkFriends = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        alert(authError);
        return;
      }

      const { data: isMutualFriends, error: rpcError } = await supabase.rpc(
        "are_friends",
        {
          owner_id: user?.id,
          friend_id: member.id,
        }
      );

      if (rpcError) {
        alert(rpcError);
        return;
      }

      setIsFriends(isMutualFriends);

      const { data, error: queryError } = await supabase
        .from("friends")
        .select("*")
        .eq("owner", user?.id)
        .eq("friend", member.id);

      if (queryError) {
        alert(queryError);
        return;
      }

      if ((!isFriends && data && data.length > 0) || user?.id == member.id) {
        setIsDisabled(true);
      } else {
        setIsDisabled(false);
      }
    } catch (error) {
      alert(error);
    }
  };

  useEffect(() => {
    checkFriends();
  }, [isFriends]);

  // Calculate learning/teaching scores when component mounts
  useEffect(() => {
    const calculateLearningTeachingScores = async () => {
      if (!loggedInUser || loggedInUserId === member.id) return;

      try {
        // Get member's full data with embeddings
        const { data: memberData } = await supabase
          .from("users")
          .select("*")
          .eq("id", member.id)
          .single();

        if (memberData && loggedInUser) {
          const { max_learn_score, max_teach_score } = await hasSimilarSkills(
            loggedInUser.id,
            memberData.id
          );

          setMaxLearnScore(max_learn_score);
          setMaxTeachScore(max_teach_score);
        }
      } catch (error) {
        alert(error);
      }
    };

    calculateLearningTeachingScores();
  }, [loggedInUser, member.id]);

  const handleConnect = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        alert(authError);
        return;
      }

      if (!user?.id) {
        alert("User not authenticated");
        return;
      }

      const { error: insertError } = await supabase
        .from("friends")
        .insert({ owner: user.id, friend: member.id });

      if (insertError) {
        alert(insertError);
        return;
      }

      checkFriends();
    } catch (error) {
      alert(error);
    }
  };

  const viewProfile = (id: string) => {
    router.push(`/profile_page?id=${id}`);
  };

  const handleDM = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        alert(authError);
        return;
      }

      if (!user?.id) {
        alert("User not authenticated");
        return;
      }

      const { data, error: queryError } = await supabase
        .from("dm_conversations")
        .select("*")
        .or(
          `and(user1_id.eq.${user.id},user2_id.eq.${member.id}),and(user1_id.eq.${member.id},user2_id.eq.${user.id})`
        )
        .limit(1);

      if (queryError) {
        alert(queryError);
        return;
      }

      let convoId = data?.[0]?.id;

      if (!data || data.length === 0) {
        const { data: newConvo, error: insertError } = await supabase
          .from("dm_conversations")
          .insert({ user1_id: user.id, user2_id: member.id })
          .select();

        if (insertError) {
          alert(insertError);
          return;
        }

        convoId = newConvo?.[0]?.id;
      }

      router.push(`/dm_page?id=${convoId}&user=${member.name}`);
    } catch (error) {
      alert(error);
    }
  };

  const getSimilarityColor = (score: number) => {
    if (score >= 0.8) return "bg-green-500";
    if (score >= 0.6) return "bg-blue-500";
    if (score >= 0.4) return "bg-yellow-500";
    if (score >= 0.2) return "bg-orange-500";
    return "bg-red-500";
  };

  const getSimilarityLabel = (score: number) => {
    if (score >= 0.8) return "Excellent Match";
    if (score >= 0.6) return "Great Match";
    if (score >= 0.4) return "Good Match";
    if (score >= 0.2) return "Fair Match";
    return "Low Match";
  };

  return (
    <div className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-6 relative">
      {showSimilarityScore &&
        member.similarityScore !== undefined &&
        loggedInUserId !== member.id && (
          <div className="absolute top-3 right-3 z-10">
            <div
              className={`${getSimilarityColor(
                member.similarityScore
              )} text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg`}
            >
              {Math.round(member.similarityScore * 100)}%
            </div>
          </div>
        )}

      {showSimilarityScore && member.similarityLoading && (
        <div className="absolute top-3 right-3 z-10">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}

      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mb-4">
          <span className="text-white font-semibold text-xl">
            {member.name.charAt(0).toUpperCase()}
          </span>
        </div>

        <h3 className="font-semibold text-gray-900 text-lg mb-1">
          {member.name}
        </h3>

        {member.email && (
          <p className="text-sm text-gray-600 mb-2">{member.email}</p>
        )}

        {showSimilarityScore &&
          member.similarityScore !== undefined &&
          loggedInUserId !== member.id && (
            <div className="mb-3">
              <span className="text-xs text-gray-600 font-medium">
                {getSimilarityLabel(member.similarityScore)}
              </span>
            </div>
          )}

        {loggedInUserId !== member.id && (
          <div className="mb-3 space-y-1">
            {maxLearnScore !== undefined && maxLearnScore >= 0.7 && (
              <div className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                🎓 Good Learning Match
              </div>
            )}
            {maxTeachScore !== undefined && maxTeachScore >= 0.7 && (
              <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                👨‍🏫 Good Teaching Match
              </div>
            )}
          </div>
        )}

        <div className="w-full space-y-2">
          {isFriends ? (
            <button
              onClick={handleDM}
              className="w-full px-4 py-2 text-white text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-blue-500 hover:bg-blue-600 focus:ring-blue-500"
            >
              DM
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isDisabled}
              className={`w-full px-4 py-2 text-white text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isDisabled
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600 focus:ring-blue-500"
              }`}
            >
              Connect
            </button>
          )}
          <button
            onClick={() => viewProfile(member.id)}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            View Profile
          </button>
          <button
            onClick={() => router.push(`/schedule_meeting?userId=${member.id}`)}
            className="w-full px-4 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-md hover:bg-green-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Schedule Meeting
          </button>
        </div>
      </div>
    </div>
  );
}
