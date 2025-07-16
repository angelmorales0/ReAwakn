"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import createClient from "@/app/utils/supabase/client";
import { UserProfile } from "@/types/user";
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
  const supabase = createClient();

  useEffect(() => {
    const fetchUserProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
        setTeachingSkillsData(
          skillsData
            .filter((skill) => skill.type === "teach")
            .map((skill) => skill.skill)
        );

        setLearningSkillsData(
          skillsData
            .filter((skill) => skill.type === "learn")
            .map((skill) => skill.skill)
        );
        const { data: queriedData, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", targetUserId)
          .single();

        if (queriedData && !error) {
          setProfile({
            email: isCurrentUserProfile
              ? user.email || queriedData.email || ""
              : queriedData.email || "",
            displayName:
              queriedData.display_name ||
              (isCurrentUserProfile ? user.user_metadata?.user_name : "") ||
              "User",
            profilePicture:
              queriedData.profile_pic_url ||
              (isCurrentUserProfile
                ? user.user_metadata?.avatar_url
                : undefined),
            id: targetUserId,
            teachingSkills: teachingSkillsData || [],
            learningSkills: learningSkillsData || [],
          });
        }
      }
    };

    fetchUserProfile();
  }, []);

  useEffect(() => {
  }, [teachingSkillsData, learningSkillsData]);
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
