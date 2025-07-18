import { UserProfile } from "@/types/types";
import { useRouter } from "next/navigation";

interface ProfileHeaderProps {
  profile: UserProfile;
  isOwnProfile?: boolean;
}

export default function ProfileHeader({
  profile,
  isOwnProfile = false,
}: ProfileHeaderProps) {
  const router = useRouter();
  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-12">
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-6">
          {profile.profilePicture ? (
            <img
              src={profile.profilePicture}
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
          {profile.displayName}
        </h2>

        <p className="text-blue-100 text-lg mb-4">{profile.email}</p>

        {!isOwnProfile && (
          <button
            onClick={() =>
              router.push(`/schedule_meeting?userId=${profile.id}`)
            }
            className="px-6 py-2 bg-white text-purple-600 font-medium rounded-full hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-purple-600"
          >
            Schedule Meeting
          </button>
        )}
      </div>
    </div>
  );
}
