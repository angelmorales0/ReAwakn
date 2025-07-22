import { UserSkill } from "@/types/types";
import { cosineSimilarity } from "@/hooks/userEmbeddings";
import { supabase } from "@/app/utils/supabase/client";
import { getAuthUser } from "@/utility_methods/userUtils";
import { toast } from "sonner";

export const addToSkillsArray = (
  skill: UserSkill,
  learnSkillsArray: number[][],
  teachSkillsArray: number[][]
) => {
  if (skill.type === "learn" && skill.embedding) {
    try {
      const embedding =
        typeof skill.embedding === "string"
          ? JSON.parse(skill.embedding)
          : skill.embedding;

      if (Array.isArray(embedding)) {
        learnSkillsArray.push(embedding);
      } else if (typeof embedding === "object" && embedding !== null) {
        const keys = Object.keys(embedding).sort(
          (a, b) => Number(a) - Number(b)
        );
        const embeddingArray = keys.map((key) => embedding[key]);
        learnSkillsArray.push(embeddingArray);
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

      if (Array.isArray(embedding)) {
        teachSkillsArray.push(embedding);
      } else if (typeof embedding === "object" && embedding !== null) {
        const keys = Object.keys(embedding).sort(
          (a, b) => Number(a) - Number(b)
        );
        const embeddingArray = keys.map((key) => embedding[key]);
        teachSkillsArray.push(embeddingArray);
      }
    } catch (error) {
      alert(error);
    }
  }
};

export const checkFriendshipStatus = async (
  memberId: string,
  setIsFriends: (value: boolean) => void,
  disableConnectionButton: (value: boolean) => void,
  setPendingRequest: (value: boolean) => void = () => {}
) => {
  try {
    const user = await getAuthUser();

    if (!user) {
      alert("No authenticated user found");
      return;
    }

    const { data: isMutualFriends, error: rpcError } = await supabase.rpc(
      "are_friends",
      {
        owner_id: user.id,
        friend_id: memberId,
      }
    );

    if (rpcError) {
      toast.error(rpcError.message);
      return;
    }

    const { data: otherUserRequestedMe } = await supabase
      .from("friends")
      .select("*")
      .eq("owner", memberId)
      .eq("friend", user.id)
      .single();

    const { data: iRequestedOtherUser } = await supabase
      .from("friends")
      .select("*")
      .eq("owner", user.id)
      .eq("friend", memberId)
      .single();

    const iHavePendingRequest = otherUserRequestedMe && !iRequestedOtherUser;

    setPendingRequest(iHavePendingRequest);

    setIsFriends(isMutualFriends);

    if (!iRequestedOtherUser) {
      disableConnectionButton(false);
    } else {
      disableConnectionButton(true);
    }
  } catch (error) {
    toast.error("Error checking friendship status");
  }
};

export const findMaxLearnSimilarity = (
  loggedInUserLearnSkills: number[][],
  secondaryUserTeachSkills: number[][]
): number => {
  let max_learn_score = 0;

  for (let i = 0; i < loggedInUserLearnSkills.length; i++) {
    const loggedInLearnEmbedding = loggedInUserLearnSkills[i];

    for (let j = 0; j < secondaryUserTeachSkills.length; j++) {
      const otherUserTeachEmbedding = secondaryUserTeachSkills[j];
      const similarity = cosineSimilarity(
        loggedInLearnEmbedding,
        otherUserTeachEmbedding
      );

      if (similarity > max_learn_score) {
        max_learn_score = similarity;
      }
    }
  }

  return max_learn_score;
};

export const findMaxTeachSimilarity = (
  loggedInUserTeachSkills: number[][],
  secondaryUserLearnSkills: number[][]
): number => {
  let max_teach_score = 0;
  for (let i = 0; i < loggedInUserTeachSkills.length; i++) {
    const loggedInTeachEmbedding = loggedInUserTeachSkills[i];

    for (let j = 0; j < secondaryUserLearnSkills.length; j++) {
      const otherUserLearnEmbedding = secondaryUserLearnSkills[j];
      const similarity = cosineSimilarity(
        loggedInTeachEmbedding,
        otherUserLearnEmbedding
      );

      if (similarity > max_teach_score) {
        max_teach_score = similarity;
      }
    }
  }

  return max_teach_score;
};

export const getSimilarityColor = (score: number): string => {
  if (score >= 0.8) return "bg-green-500";
  if (score >= 0.6) return "bg-blue-500";
  if (score >= 0.4) return "bg-yellow-500";
  if (score >= 0.2) return "bg-orange-500";
  return "bg-red-500";
};

export const getSimilarityLabel = (score: number): string => {
  if (score >= 0.8) return "Excellent Match";
  if (score >= 0.6) return "Great Match";
  if (score >= 0.4) return "Good Match";
  if (score >= 0.2) return "Fair Match";
  return "Low Match";
};

export const calculateUserSimilarityScores = async (
  loggedInUserId: string,
  targetUserId: string
) => {
  try {
    const { data: loggedInUserSkills } = await supabase
      .from("user_skills")
      .select("skill, type, embedding")
      .eq("user_id", loggedInUserId);

    const { data: targetUserSkills } = await supabase
      .from("user_skills")
      .select("skill, type, embedding")
      .eq("user_id", targetUserId);

    if (!loggedInUserSkills || !targetUserSkills) {
      return { max_learn_score: 0, max_teach_score: 0 };
    }

    let loggedInUserLearnSkills: number[][] = [];
    let loggedInUserTeachSkills: number[][] = [];
    let targetUserLearnSkills: number[][] = [];
    let targetUserTeachSkills: number[][] = [];

    loggedInUserSkills.forEach((skill) => {
      addToSkillsArray(skill, loggedInUserLearnSkills, loggedInUserTeachSkills);
    });

    targetUserSkills.forEach((skill) => {
      addToSkillsArray(skill, targetUserLearnSkills, targetUserTeachSkills);
    });

    const max_learn_score = findMaxLearnSimilarity(
      loggedInUserLearnSkills,
      targetUserTeachSkills
    );

    const max_teach_score = findMaxTeachSimilarity(
      loggedInUserTeachSkills,
      targetUserLearnSkills
    );

    return { max_learn_score, max_teach_score };
  } catch (error) {
    toast.error("Error calculating scores");
    return { max_learn_score: 0, max_teach_score: 0 };
  }
};
