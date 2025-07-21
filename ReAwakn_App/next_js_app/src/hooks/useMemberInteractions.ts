import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabase/client";
import { checkFriendshipStatus } from "@/utility_methods/memberCardUtils";
import { getAuthUser } from "@/utility_methods/userUtils";

export function useMemberInteractions(memberId: string) {
  const [isDisabled, setIsDisabled] = useState(false);
  const [isFriends, setIsFriends] = useState(false);
  const [isPendingRequest, setIsPendingRequest] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkFriendshipStatus(
      memberId,
      setIsFriends,
      setIsDisabled,
      setIsPendingRequest
    );
  }, [memberId]);

  const sendConnectionRequest = async () => {
    try {
      const user = await getAuthUser();
      await supabase
        .from("friends")
        .insert({ owner: user?.id, friend: memberId });

      await checkFriendshipStatus(
        memberId,
        setIsFriends,
        setIsDisabled,
        setIsPendingRequest
      );
    } catch (error) {
      alert(error);
    }
  };

  const viewProfile = () => {
    router.push(`/profile_page?id=${memberId}`);
  };

  const enterDM = async (memberName: string) => {
    try {
      const user = await getAuthUser();

      const { data } = await supabase
        .from("dm_conversations")
        .select("*")
        .or(
          `and(user1_id.eq.${user?.id},user2_id.eq.${memberId}),and(user1_id.eq.${memberId},user2_id.eq.${user?.id})`
        )
        .limit(1);

      let convoId = data?.[0]?.id;

      if (!data || data.length === 0) {
        const { data: newConvo, error: insertError } = await supabase
          .from("dm_conversations")
          .insert({ user1_id: user?.id, user2_id: memberId })
          .select();

        if (insertError) {
          alert(insertError);
          return;
        }

        convoId = newConvo?.[0]?.id;
      }

      router.push(
        `/dm_page?id=${convoId}&user=${memberName}&userId=${memberId}`
      );
    } catch (error) {
      alert(error);
    }
  };

  const scheduleMeeting = () => {
    router.push(`/schedule_meeting?userId=${memberId}`);
  };

  return {
    isDisabled,
    isFriends,
    isPendingRequest,
    sendConnectionRequest,
    viewProfile,
    enterDM,
    scheduleMeeting,
  };
}
