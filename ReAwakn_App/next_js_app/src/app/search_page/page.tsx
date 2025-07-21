"use client";
import React, { useState, useEffect } from "react";
import SearchBar from "./SearchBar";
import MemberCards from "./MemberCards";
import { supabase } from "@/app/utils/supabase/client";
import HomeButton from "@/components/homeButton";
import RefreshSimilarityButton from "./RefreshSimilarityButton";
import { MemberWithSimilarity, LoggedInUser } from "@/types/types";
import { getFormattedUser } from "@/utility_methods/userUtils";
import {
  findMaxLearnSimilarity,
  findMaxTeachSimilarity,
} from "@/utility_methods/memberCardUtils";
export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [members, setMembers] = useState<MemberWithSimilarity[]>([]);
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(null);
  const [similarityScores, setSimilarityScores] = useState<Map<string, number>>(
    new Map()
  );
  const [calculatingScores, setCalculatingScores] = useState(false);

  useEffect(() => {
    getFormattedUser(setLoggedInUser);
  }, []);

  useEffect(() => {
    const fetchMembers = async () => {
      let users = supabase
        .from("users")
        .select("*")
        .eq("completed_onboarding", true);

      if (searchTerm.trim() !== "") {
        users = users.ilike("display_name", `${searchTerm}%`);
      }

      const { data } = await users.limit(20);

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

  const calculateSimilarityScores = async (
    membersToCalculate: MemberWithSimilarity[]
  ) => {
    if (!loggedInUser || calculatingScores) return;

    setCalculatingScores(true);
    const newScores = new Map(similarityScores);

    const { data: loggedInUserData } = await supabase
      .from("users")
      .select("*")
      .eq("id", loggedInUser.id)
      .single();

    for (const member of membersToCalculate) {
      try {
        const { data: memberData, error: memberError } = await supabase
          .from("users")
          .select("*")
          .eq("id", member.id)
          .single();

        if (memberError) {
          alert(`Error fetching member data: ${memberError.message}`);
          continue;
        }

        if (loggedInUserData && memberData) {
          const max_learn_score = findMaxLearnSimilarity(
            loggedInUserData,
            memberData
          );
          const max_teach_score = findMaxTeachSimilarity(
            loggedInUserData,
            memberData
          );

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
          const response = await fetch("/similarity_api_route", {
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

          if (data.similarity !== undefined) {
            newScores.set(member.id, data.similarity);
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

  const membersWithScores = members.map((member) => ({
    ...member,
    similarityScore: similarityScores.get(member.id) || 0,
    similarityLoading: calculatingScores && !similarityScores.has(member.id),
  }));

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
