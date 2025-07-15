"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import createClient from "@/app/utils/supabase/client";
import { UserProfile } from "@/types/user";
import ProfileLayout from "./components/ProfileLayout";
import ProfileHeader from "./components/ProfileHeader";
import ProfileContent from "./components/ProfileContent";
import LoadingState from "./components/LoadingState";

const extractSkillNames = (skills: any[]): string[] => {
  if (!skills || !Array.isArray(skills)) return [];

  if (skills.length > 0 && typeof skills[0] === "object" && skills[0].skill) {
    return skills.map(
      (skillObj: any) => `${skillObj.skill}: ${skillObj.level}`
    );
  }

  return skills.filter((skill: any) => typeof skill === "string");
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [teachingSkillsData, setTeachingSkillsData] = useState<any[]>([]);
  const [learningSkillsData, setLearningSkillsData] = useState<any[]>([]);
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
      const isOwnProfile = !profileId || profileId === user.id;
      const { data: skillsData, error: skillsError } = await supabase
        .from("user_skills")
        .select("skill, type")
        .eq("user_id", targetUserId);

      console.log(skillsData, skillsError);

      if (skillsData && !skillsError) {
        setTeachingSkillsData(
          skillsData
            .filter((skill: any) => skill.type === "teach")
            .map((skill: any) => skill.skill)
        );

        setLearningSkillsData(
          skillsData
            .filter((skill: any) => skill.type === "learn")
            .map((skill: any) => skill.skill)
        );
        const { data: queriedData, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", targetUserId)
          .single();

        if (queriedData && !error) {
          setProfile({
            email: isOwnProfile
              ? user.email || queriedData.email || ""
              : queriedData.email || "",
            displayName:
              queriedData.display_name ||
              (isOwnProfile ? user.user_metadata?.user_name : "") ||
              "User",
            profilePicture:
              queriedData.profile_pic_url ||
              (isOwnProfile ? user.user_metadata?.avatar_url : undefined),
            teachingSkills: teachingSkillsData || [],
            learningSkills: learningSkillsData || [],
          });
        }
      }
    };

    fetchUserProfile();
  }, []);

  useEffect(() => {
    console.log(teachingSkillsData, learningSkillsData);
  }, [teachingSkillsData, learningSkillsData]);
  if (!profile) {
    return <LoadingState />;
  }

  return (
    <ProfileLayout>
      <ProfileHeader profile={profile} />
      <ProfileContent profile={profile} />
    </ProfileLayout>
  );
}
