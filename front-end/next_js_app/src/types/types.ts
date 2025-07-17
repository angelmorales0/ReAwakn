export type Message = {
  created_at: string; // These need to be kept snake case for database parsing, will be refactored at a later date
  text: string;
  sent_by: string;
};

export interface ListOfMessages {
  messages: Message[];
}

export interface MeetingConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSlot: {
    start: Date;
    end: Date;
  };
  targetUser: {
    id: string;
    name?: string;
    display_name?: string;
    email?: string;
  };
  onConfirm: (meetingDetails: { title: string; description: string }) => void;
}

export interface MatchUser {
  id: string;
  name: string;
  email?: string;
  maxLearnScore?: number;
  maxTeachScore?: number;
}

export interface CommentModalProps {
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  handleSubmitComment: () => void;
  comment: string;
  setComment: (comment: string) => void;
  comments?: Array<{ author_name: string | null; post_content: string }>;
}

export interface SimilarUser {
  userId: string;
  score: number;
}

export interface CompatibilityScore {
  overall_similarity: number;
  feature_breakdown: Record<string, number>;
}

export interface UseSimilarityReturn {
  similarity: number | null;
  similarUsers: SimilarUser[];
  compatibility: CompatibilityScore | null;
  loading: boolean;
  error: string | null;
  calculateSimilarity: (
    loggedInUserId: string,
    targetUserId: string
  ) => Promise<void>;
  findSimilarUsers: (userId: string, topN?: number) => Promise<void>;
  getDetailedCompatibility: (
    loggedInUserId: string,
    targetUserId: string
  ) => Promise<void>;
  clearResults: () => void;
}

export interface SearchBarProps {
  onSearchChange: (searchTerm: string) => void;
  searchTerm: string;
}
export interface Member {
  id: string;
  name: string;
  email?: string;
}

export interface MemberWithSimilarity extends Member {
  similarityScore?: number;
  similarityLoading?: boolean;
  maxLearnScore?: number;
  maxTeachScore?: number;
}

export interface LoggedInUser {
  id: string;
  email?: string;
  displayName?: string;
  profilePicUrl?: string;
  completedOnboarding?: boolean;
  teachingSkills: string[];
  learningSkills: string[];
  communicationStyle?: string;
  timeZone?: string;
  chronotype?: string;
  availability: string[];
  learning_embeddings?: number[][];
  teaching_embeddings?: number[][];
}

export interface UserWithEmbeddings {
  learning_embeddings?: number[][];
  teaching_embeddings?: number[][];
}

export interface MemberWithSimilarity extends Member {
  similarityScore?: number;
  similarityLoading?: boolean;
}

export interface MemberCardsProps {
  members: MemberWithSimilarity[];
  loggedInUserId?: string;
  showSimilarityScores?: boolean;
  loggedInUser?: Member;
}

export interface MemberCardProps {
  member: MemberWithSimilarity;
  loggedInUserId?: string;
  showSimilarityScore?: boolean;
  loggedInUser?: Member;
}

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
export interface CalendarUser {
  id: string;
  display_name?: string;
  name?: string;
  email?: string;
  time_zone?: string;
  availability?: string;
}

export interface CalendarEvent {
  start: Date;
  end: Date;
  startUTC?: string;
  endUTC?: string;
  displayStartHour?: number;
  displayEndHour?: number;
  displayTime?: string;
  resource?: { available: boolean };
  action?: string;
}
