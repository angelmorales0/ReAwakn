"use client";
import React, { useState, useEffect } from "react";
import SearchBar from "./SearchBar";
import MemberCards from "./MemberCards";
import createClient from "@/app/utils/supabase/client";
import HomeButton from "@/components/homeButton";
import { Member } from "@/types/member";

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, display_name,email")
        .ilike("display_name", `${searchTerm}%`);
      if (data) {
        const formattedData = data.map((user) => ({
          id: user.id,
          name: user.display_name,
          email: user.email,
        }));
        setMembers(formattedData);
      } else {
        setMembers([]);
      }
    };

    fetchMembers();
  }, [searchTerm]);

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  return (
    <div className="max-w-3xl mx-auto md:py-10 h-screen relative">
      <div className="fixed top-4 left-4 z-10">
        <HomeButton />
      </div>

      <div className="h-full border rounded-md flex flex-col">
        <SearchBar
          onSearchChange={handleSearchChange}
          searchTerm={searchTerm}
        />
        <MemberCards members={members} />
      </div>
    </div>
  );
}
