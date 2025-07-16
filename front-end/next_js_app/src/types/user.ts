export interface SkillLevel {
  skill: string;
  level: number;
}

export interface UserProfile {
  email: string;
  displayName: string;
  profilePicture?: string;
  teachingSkills: string[];
  learningSkills: string[];
}
