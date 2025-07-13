"use client";
import React, { useState, useEffect } from "react";
import SearchBar from "./SearchBar";
import MemberCards from "./MemberCards";
import createClient from "@/app/utils/supabase/client";
import HomeButton from "@/components/homeButton";
import { Member } from "@/types/member";

interface MemberWithSimilarity extends Member {
  similarityScore?: number;
  similarityLoading?: boolean;
}

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [members, setMembers] = useState<MemberWithSimilarity[]>([]);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);
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
      } = await supabase.auth.getUser();
      if (user) {
        const { data: userData, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (!error && userData) {
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
    }
  };

  const calculateSimilarityScores = async (
    membersToCalculate: MemberWithSimilarity[]
  ) => {
    if (!loggedInUser || calculatingScores) return;

    setCalculatingScores(true);
    const newScores = new Map(similarityScores);

    for (const member of membersToCalculate) {
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

        const data = await response.json();

        if (response.ok && data.similarity !== undefined) {
          newScores.set(member.id, data.similarity);
        }
      } catch (error) {
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
          {loggedInUser && (
            <div className="mt-2 text-sm text-gray-500">
              Showing compatibility scores with{" "}
              <span className="font-semibold">{loggedInUser.displayName}</span>
            </div>
          )}
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
        />
      </div>
    </div>
  );
}
