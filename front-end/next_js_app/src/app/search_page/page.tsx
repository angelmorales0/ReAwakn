"use client";
import React, { useState, useEffect } from "react";
import SearchBar from "./SearchBar";
import MemberCards from "./MemberCards";
import createClient from "@/app/utils/supabase/client";

// Define the Member type
interface Member {
  id: string;
  name: string;
  email?: string;
  // Add other member properties as needed
}

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const supabase = createClient();

  // Fetch members from database on component mount
  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, display_name,email")
        .like("display_name", `${searchTerm}%`);
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
    <div className="max-w-3xl mx-auto md:py-10 h-screen">
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
