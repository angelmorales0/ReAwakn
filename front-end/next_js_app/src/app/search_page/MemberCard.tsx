import { useRouter } from "next/navigation";
import { Member } from "@/types/member";
import createClient from "@/app/utils/supabase/client";
import { useState } from "react";
import { useEffect } from "react";

export default function MemberCard({ member }: { member: Member }) {
  const [isDisabled, setIsDisabled] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  const [isFriends, setIsFriends] = useState(false);

  const checkFriends = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: isMutualFriends, error } = await supabase.rpc("are_friends", {
      owner_id: user?.id,
      friend_id: member.id,
    });

    setIsFriends(isMutualFriends);

    const { data } = await supabase
      .from("friends")
      .select("*")
      .eq("owner", user?.id)
      .eq("friend", member.id);

    if ((!isFriends && data && data.length > 0) || user?.id == member.id) {
      setIsDisabled(true);
    } else {
      setIsDisabled(false);
    }
  };

  useEffect(() => {
    checkFriends();
  }, [isFriends]);
  useEffect(() => {}, [isFriends]);

  const handleConnect = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("friends")
      .insert({ owner: user?.id, friend: member.id });
    checkFriends();
  };

  const viewProfile = (id: string) => {
    router.push(`/profile_page?id=${id}`);
  };

  const handleDM = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("dm_conversations")
      .select("*")
      .or(
        `and(user1_id.eq.${user?.id},user2_id.eq.${member.id}),and(user1_id.eq.${member.id},user2_id.eq.${user?.id})`
        //THIS SELECTS THE CONVO ID IF THE PAIRING EXISTS REGARDLESS OF ORDERING
      )
      .limit(1);

    const convo = data?.[0];

    if (!convo) {
      //if convo doesn't exist, create it
      const { data, error } = await supabase
        .from("dm_conversations")
        .insert({ user1_id: user?.id, user2_id: member.id });
    }

    router.push(`/dm_page?id=${convo?.id}&user=${member.name}`);
  };

  return (
    <div className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
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
          <p className="text-sm text-gray-600 mb-4">{member.email}</p>
        )}

        {isFriends ? (
          <button
            onClick={handleDM}
            className="w-full px-4 py-2 text-white text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 mb-2 bg-blue-500 hover:bg-blue-600 focus:ring-blue-500"
          >
            DM
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isDisabled}
            className={`w-full px-4 py-2 text-white text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 mb-2 ${
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
          className="w-full px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          View Profile
        </button>
      </div>
    </div>
  );
}
