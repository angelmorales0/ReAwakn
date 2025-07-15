export interface SkillLevel {
  skill: string;
  level: number;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  profilePicture?: string;
  teachingSkills: string[];
  learningSkills: string[];
}
