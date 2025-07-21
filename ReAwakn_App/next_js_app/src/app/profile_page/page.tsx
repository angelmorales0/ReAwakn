"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabase/client";
import { getAuthUser } from "@/utility_methods/userUtils";
import { UserProfile } from "@/types/types";
import ProfileLayout from "./components/ProfileLayout";
import ProfileHeader from "./components/ProfileHeader";
import ProfileContent from "./components/ProfileContent";
import LoadingState from "./components/LoadingState";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [teachingSkillsData, setTeachingSkillsData] = useState<string[]>([]);
  const [learningSkillsData, setLearningSkillsData] = useState<string[]>([]);
  const [isOwnProfile, setIsOwnProfile] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserProfile = async () => {
      const user = await getAuthUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const searchParams = new URLSearchParams(window.location.search);
      const profileId = searchParams.get("id");
      const targetUserId = profileId || user.id;
      const isCurrentUserProfile = !profileId || profileId === user.id;
      setIsOwnProfile(isCurrentUserProfile);

      const { data: skillsData, error: skillsError } = await supabase
        .from("user_skills")
        .select("skill, type")
        .eq("user_id", targetUserId);

      if (skillsData && !skillsError) {
        const teachingSkills = skillsData
          .filter((skill) => skill.type === "teach")
          .map((skill) => skill.skill);

        const learningSkills = skillsData
          .filter((skill) => skill.type === "learn")
          .map((skill) => skill.skill);

        setTeachingSkillsData(teachingSkills);
        setLearningSkillsData(learningSkills);

        const { data: targetUserData, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", targetUserId)
          .single();

        if (targetUserData && !error) {
          setProfile({
            email: isCurrentUserProfile
              ? user.email || targetUserData.email || ""
              : targetUserData.email || "",
            displayName:
              targetUserData.display_name ||
              (isCurrentUserProfile ? user.user_metadata?.user_name : "") ||
              "User",
            profilePicture:
              targetUserData.profile_pic_url ||
              (isCurrentUserProfile
                ? user.user_metadata?.avatar_url
                : undefined),
            id: targetUserId,
            teachingSkills: teachingSkills,
            learningSkills: learningSkills,
          });
        }
      }
    };

    fetchUserProfile();
  }, []);

  if (!profile) {
    return <LoadingState />;
  }

  return (
    <ProfileLayout>
      <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />
      <ProfileContent profile={profile} />
    </ProfileLayout>
  );
}
