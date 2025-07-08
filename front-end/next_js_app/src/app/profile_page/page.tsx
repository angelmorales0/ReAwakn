"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import createClient from "@/app/utils/supabase/client";
import HomeButton from "@/components/homeButton";

interface UserProfile {
  email: string;
  display_name: string;
  profile_picture?: string;
  teaching_skills: string[];
  learning_skills: string[];
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
          display_name:
            queriedData.display_name ||
            (isOwnProfile ? user.user_metadata?.user_name : "") ||
            "User",
          profile_picture:
            queriedData.profile_pic_url ||
            (isOwnProfile ? user.user_metadata?.avatar_url : undefined),
          teaching_skills: queriedData.teaching_skills || [],
          learning_skills: queriedData.learning_skills || [],
        });
      }
    };

    fetchUserProfile();
  }, [router]);

  const SkillBadge = ({ skill }: { skill: string }) => (
    <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full dark:bg-blue-900 dark:text-blue-300 mr-2 mb-2">
      {skill}
    </span>
  );

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Failed to load profile</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Your Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your learning and teaching journey
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-12">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                {profile.profile_picture ? (
                  <img
                    src={profile.profile_picture}
                    alt="Profile"
                    className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <svg
                      className="w-16 h-16 text-gray-500 dark:text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>

              <h2 className="text-3xl font-bold text-white mb-2">
                {profile.display_name}
              </h2>

              <p className="text-blue-100 text-lg">{profile.email}</p>
            </div>
          </div>

          <div className="px-8 py-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Teaching Skills */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-green-600 dark:text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Teaching Skills
                  </h3>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 min-h-[120px]">
                  {profile.teaching_skills.length > 0 ? (
                    <div className="flex flex-wrap">
                      {profile.teaching_skills.map((skill, index) => (
                        <SkillBadge key={index} skill={skill} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">
                      No teaching skills added yet
                    </p>
                  )}
                </div>
              </div>

              {/* Learning Skills */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-blue-600 dark:text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Learning Skills
                  </h3>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 min-h-[120px]">
                  {profile.learning_skills.length > 0 ? (
                    <div className="flex flex-wrap">
                      {profile.learning_skills.map((skill, index) => (
                        <SkillBadge key={index} skill={skill} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">
                      No learning skills added yet
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <HomeButton />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
