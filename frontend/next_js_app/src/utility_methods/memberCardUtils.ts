import { UserSkill } from "@/types/types";
import { cosineSimilarity } from "@/hooks/userEmbeddings";
import { supabase } from "@/app/utils/supabase/client";
import { getAuthUser } from "@/utility_methods/userUtils";

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
  setIsDisabled: (value: boolean) => void
) => {
  try {
    const user = await getAuthUser();

    if (!user) {
      console.error("No authenticated user found");
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
      console.error("RPC error:", rpcError);
      return;
    }

    setIsFriends(isMutualFriends);

    if (!isMutualFriends || user.id === memberId) {
      setIsDisabled(true);
    } else {
      setIsDisabled(false);
    }
  } catch (error) {
    console.error("Error checking friendship status:", error);
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

/**
 * Returns a Tailwind CSS background color class based on the similarity score
 * @param score Similarity score between 0 and 1
 * @returns Tailwind CSS class for background color
 */
export const getSimilarityColor = (score: number): string => {
  if (score >= 0.8) return "bg-green-500";
  if (score >= 0.6) return "bg-blue-500";
  if (score >= 0.4) return "bg-yellow-500";
  if (score >= 0.2) return "bg-orange-500";
  return "bg-red-500";
};

/**
 * Returns a human-readable label for the similarity score
 * @param score Similarity score between 0 and 1
 * @returns Text label describing the match quality
 */
export const getSimilarityLabel = (score: number): string => {
  if (score >= 0.8) return "Excellent Match";
  if (score >= 0.6) return "Great Match";
  if (score >= 0.4) return "Good Match";
  if (score >= 0.2) return "Fair Match";
  return "Low Match";
};
