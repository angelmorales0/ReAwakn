"use client";
import React, { useState, useEffect } from "react";
import SearchBar from "./SearchBar";
import MemberCards from "./MemberCards";
import createClient from "@/app/utils/supabase/client";
import HomeButton from "@/components/homeButton";
import { Member } from "@/types/member";
import RefreshSimilarityButton from "./RefreshSimilarityButton";
interface MemberWithSimilarity extends Member {
  similarityScore?: number;
  similarityLoading?: boolean;
  maxLearnScore?: number;
  maxTeachScore?: number;
}
interface LoggedInUser {
  id: string;
  email?: string;
  displayName?: string;
  profilePicUrl?: string;
  completedOnboarding?: boolean;
  teachingSkills: string[];
  learningSkills: string[];
  communicationStyle?: string;
  timeZone?: string;
  chronotype?: string;
  availability: string[];
  // These are used in hasSimilarSkills function
  learning_embeddings?: number[][];
  teaching_embeddings?: number[][];
}

interface UserWithEmbeddings {
  learning_embeddings?: number[][];
  teaching_embeddings?: number[][];
}

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [members, setMembers] = useState<MemberWithSimilarity[]>([]);
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(null);
  const [similarityScores, setSimilarityScores] = useState<Map<string, number>>(
    new Map()
  );
  const [calculatingScores, setCalculatingScores] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    const fetchMembers = async () => {
      let query = supabase
        .from("users")
        .select("*")
        .eq("completed_onboarding", true);

      // If there's a search term, filter by it, otherwise get all users
      if (searchTerm.trim() !== "") {
        query = query.ilike("display_name", `${searchTerm}%`);
      }

      const { data, error } = await query.limit(20); // Limit to 20 results for performance

      if (error) {
        setMembers([]);
        return;
      }

      if (data) {
        const formattedData: MemberWithSimilarity[] = data.map((user) => ({
          id: user.id,
          name: user.display_name,
          email: user.email,
          similarityScore: similarityScores.get(user.id) || undefined,
          similarityLoading: false,
        }));

        const filteredData = loggedInUser
          ? formattedData.filter((member) => member.id !== loggedInUser.id)
          : formattedData;

        setMembers(filteredData);

        // Calculate similarity scores for new members
        if (loggedInUser && filteredData.length > 0) {
          calculateSimilarityScores(filteredData);
        }
      } else {
        setMembers([]);
      }
    };

    if (loggedInUser || searchTerm.trim() !== "") {
      fetchMembers();
    }
  }, [searchTerm, loggedInUser]);

  const getCurrentUser = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        alert(authError);
        return;
      }

      if (user) {
        const { data: userData, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          alert(error);
          return;
        }

        if (userData) {
          const formattedUser = {
            id: userData.id,
            email: userData.email,
            displayName: userData.display_name,
            profilePicUrl: userData.profile_pic_url,
            completedOnboarding: userData.completed_onboarding,
            teachingSkills: userData.teaching_skills || [],
            learningSkills: userData.learning_skills || [],
            communicationStyle: userData.communication_style,
            timeZone: userData.time_zone,
            chronotype: userData.chronotype,
            availability: userData.availability || [],
          };
          setLoggedInUser(formattedUser);
        }
      }
    } catch (error) {
      alert(error);
    }
  };
  /// VIABLE / NON VIABLE MATCH LOGIC FOR MATCH (NOT SEARCH) PAGE

  function cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  function hasSimilarSkills(
    userA: UserWithEmbeddings,
    userB: UserWithEmbeddings
  ) {
    // FROM USER A'S PERSPECTIVE = LOGGED IN
    let max_learn_score = 0;
    let max_teach_score = 0;

    for (const learnVec of userA.learning_embeddings || []) {
      for (const teachVec of userB.teaching_embeddings || []) {
        max_learn_score = Math.max(
          max_learn_score,
          cosineSimilarity(learnVec, teachVec)
        );
      }
    }

    for (const learnVec of userB.learning_embeddings || []) {
      for (const teachVec of userA.teaching_embeddings || []) {
        max_teach_score = Math.max(
          max_teach_score,
          cosineSimilarity(learnVec, teachVec)
        );
      }
    }

    return { max_learn_score, max_teach_score };
  }

  const calculateSimilarityScores = async (
    membersToCalculate: MemberWithSimilarity[]
  ) => {
    if (!loggedInUser || calculatingScores) return;

    setCalculatingScores(true);
    const newScores = new Map(similarityScores);

    // Get logged in user's full data with embeddings
    const { data: loggedInUserData } = await supabase
      .from("users")
      .select("*")
      .eq("id", loggedInUser.id)
      .single();

    for (const member of membersToCalculate) {
      try {
        // Get member's full data with embeddings
        const { data: memberData, error: memberError } = await supabase
          .from("users")
          .select("*")
          .eq("id", member.id)
          .single();

        if (memberError) {
          alert(`Error fetching member data: ${memberError.message}`);
          continue;
        }

        // Calculate learning/teaching scores
        if (loggedInUserData && memberData) {
          const { max_learn_score, max_teach_score } = hasSimilarSkills(
            loggedInUserData,
            memberData
          );

          // Update member with learning/teaching scores
          const memberIndex = members.findIndex((m) => m.id === member.id);
          if (memberIndex !== -1) {
            setMembers((prevMembers) => {
              const updatedMembers = [...prevMembers];
              updatedMembers[memberIndex] = {
                ...updatedMembers[memberIndex],
                maxLearnScore: max_learn_score,
                maxTeachScore: max_teach_score,
              };
              return updatedMembers;
            });
          }
        }

        try {
          const response = await fetch("/api/similarity", {
            //ORIGINAL REQ TO SIMILARITY SERVICE
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              loggedInUserId: loggedInUser.id,
              targetUserId: member.id,
              action: "similarity",
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${response.status} - ${errorText}`);
          }

          const data = await response.json();

          if (data.similarity !== undefined) {
            newScores.set(member.id, data.similarity);
          } else if (data.error) {
            throw new Error(`API returned error: ${data.error}`);
          }
        } catch (fetchError) {
          alert(`Error calculating similarity: ${fetchError}`);
          newScores.set(member.id, 0);
        }
      } catch (error) {
        alert(`Error processing member: ${error}`);
        newScores.set(member.id, 0);
      }
    }

    setSimilarityScores(newScores);
    setCalculatingScores(false);
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  // Update similarity scores
  const membersWithScores = members.map((member) => ({
    ...member,
    similarityScore: similarityScores.get(member.id) || 0,
    similarityLoading: calculatingScores && !similarityScores.has(member.id),
  }));

  // Sort by similarity scores
  const sortedMembers = membersWithScores.sort((a, b) => {
    if (a.similarityScore !== undefined && b.similarityScore !== undefined) {
      return b.similarityScore - a.similarityScore;
    }
    return 0;
  });

  return (
    <div className="max-w-6xl mx-auto md:py-10 h-screen relative">
      <div className="fixed top-4 left-4 z-10">
        <HomeButton />
      </div>

      <div className="h-full border rounded-md flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Search Members
          </h1>
          <p className="text-gray-600">
            Find and connect with other learners and teachers
          </p>

          <RefreshSimilarityButton
            onRefreshComplete={() => {
              // Clear existing similarity scores and recalculate
              setSimilarityScores(new Map());
              if (members.length > 0) {
                calculateSimilarityScores(members);
              }
            }}
          />
        </div>

        <SearchBar
          onSearchChange={handleSearchChange}
          searchTerm={searchTerm}
        />

        {searchTerm && (
          <div className="px-6 py-2 bg-gray-50 border-b">
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span>Found: {sortedMembers.length} members</span>
              {calculatingScores && (
                <span className="text-blue-600 animate-pulse">
                  Calculating compatibility scores...
                </span>
              )}
              {similarityScores.size > 0 && !calculatingScores && (
                <span className="text-green-600">
                  Compatibility scores loaded
                </span>
              )}
            </div>
          </div>
        )}

        <MemberCards
          members={sortedMembers}
          loggedInUserId={loggedInUser?.id || ""}
          showSimilarityScores={true}
          loggedInUser={
            loggedInUser
              ? { ...loggedInUser, name: loggedInUser.displayName || "" }
              : undefined
          }
        />
      </div>
    </div>
  );
}
