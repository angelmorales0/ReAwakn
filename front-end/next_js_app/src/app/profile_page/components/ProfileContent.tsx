import { UserProfile } from "@/types/user";
import SkillSection from "./SkillSection";
import HomeButton from "@/components/homeButton";

interface ProfileContentProps {
  profile: UserProfile;
}

export default function ProfileContent({ profile }: ProfileContentProps) {
  return (
    <div className="px-8 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        <SkillSection
          title="Teaching Skills"
          skills={profile.teachingSkills}
          icon="teaching"
          emptyMessage="No teaching skills added yet"
        />

        <SkillSection
          title="Learning Skills"
          skills={profile.teachingSkills}
          icon="learning"
          emptyMessage="No learning skills added yet"
        />
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <HomeButton />
      </div>
    </div>
  );
}
