import { useRouter } from "next/navigation";
import { MemberCardProps } from "@/types/types";
import { supabase } from "@/app/utils/supabase/client";
import { useState, useEffect } from "react";
import {
  addToSkillsArray as addToCorrectSkillsArray,
  findMaxLearnSimilarity,
  findMaxTeachSimilarity,
  checkFriendshipStatus,
  getSimilarityColor,
  getSimilarityLabel,
} from "@/utils/memberCardUtils";
import { getAuthUser } from "@/utils/userUtils";

export default function MemberCard({
  member,
  loggedInUserId = "",
  showSimilarityScore = false,
  loggedInUser,
}: MemberCardProps) {
  const [isDisabled, setIsDisabled] = useState(false);
  const [maxLearnScore, setMaxLearnScore] = useState<number>(0);
  const [maxTeachScore, setMaxTeachScore] = useState<number>(0);

  const router = useRouter();

  const [isFriends, setIsFriends] = useState(false);

  async function hasSimilarSkills(loggedInUserId: string, user2ID: string) {
    let max_learn_score = 0;
    let max_teach_score = 0;

    const { data: loggedInUserSkills } = await supabase
      .from("user_skills")
      .select("skill, type, embedding")
      .eq("user_id", loggedInUserId);
    const { data: user2Skills } = await supabase
      .from("user_skills")
      .select("skill, type, embedding")
      .eq("user_id", user2ID);

    let loggedInUserLearnSkills: number[][] = [];
    let loggedInUserTeachSkills: number[][] = [];
    let secondaryUserLearnSkills: number[][] = [];
    let secondaryUserTeachSkills: number[][] = [];

    loggedInUserSkills?.forEach((loggedInUserSkill) => {
      addToCorrectSkillsArray(
        loggedInUserSkill,
        loggedInUserLearnSkills,
        loggedInUserTeachSkills
      );
    });

    user2Skills?.forEach((user2Skill) => {
      addToCorrectSkillsArray(
        user2Skill,
        secondaryUserLearnSkills,
        secondaryUserTeachSkills
      );
    });

    max_learn_score = findMaxLearnSimilarity(
      loggedInUserLearnSkills,
      secondaryUserTeachSkills
    );

    max_teach_score = findMaxTeachSimilarity(
      loggedInUserTeachSkills,
      secondaryUserLearnSkills
    );

    return { max_learn_score, max_teach_score };
  }

  useEffect(() => {
    const calculateLearningTeachingScores = async () => {
      if (!loggedInUser || loggedInUserId === member.id) return;
      try {
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
    checkFriendshipStatus(member.id, setIsFriends, setIsDisabled);
  }, [loggedInUser, member.id]);

  const sendConnectionRequest = async () => {
    try {
      const user = await getAuthUser();
      await supabase
        .from("friends")
        .insert({ owner: user?.id, friend: member.id });

      await checkFriendshipStatus(member.id, setIsFriends, setIsDisabled);
    } catch (error) {
      alert(error);
    }
  };

  const viewProfile = (id: string) => {
    router.push(`/profile_page?id=${id}`);
  };

  const enterDM = async () => {
    try {
      const user = await getAuthUser();

      const { data } = await supabase
        .from("dm_conversations")
        .select("*")
        .or(
          `and(user1_id.eq.${user?.id},user2_id.eq.${member.id}),and(user1_id.eq.${member.id},user2_id.eq.${user?.id})`
        )
        .limit(1);

      let convoId = data?.[0]?.id;

      if (!data || data.length === 0) {
        const { data: newConvo, error: insertError } = await supabase
          .from("dm_conversations")
          .insert({ user1_id: user?.id, user2_id: member.id })
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
              onClick={enterDM}
              className="w-full px-4 py-2 text-white text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-blue-500 hover:bg-blue-600 focus:ring-blue-500"
            >
              DM
            </button>
          ) : (
            <button
              onClick={sendConnectionRequest}
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
