import { supabase } from "@/app/utils/supabase/client";
import { LoggedInUser } from "@/types/types";

export const getAuthUser = async () => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("Auth error:", authError);
    return null;
  }

  return user;
};

export const updateUserAvailability = async (
  userId: string,
  communicationStyle: string,
  timeZone: string,
  chronotype: string,
  availability: string[],
  completedOnboarding: boolean = true
) => {
  const { error } = await supabase
    .from("users")
    .update({
      communication_style: communicationStyle,
      time_zone: timeZone,
      chronotype: chronotype,
      availability: availability,
      completed_onboarding: completedOnboarding,
    })
    .eq("id", userId);

  if (error) {
    console.error("Error updating user availability:", error);
    return { success: false, error };
  }

  return { success: true };
};

export const deleteUserSkills = async (userId: string) => {
  const { error } = await supabase
    .from("user_skills")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting user skills:", error);
    return { success: false, error };
  }

  return { success: true };
};

export const getFormattedUser = async (
  setUser?: React.Dispatch<React.SetStateAction<LoggedInUser | null>>
) => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("Auth error:", authError);
      return null;
    }

    if (!user) {
      return null;
    }

    const { data: userData, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Database error:", error);
      return null;
    }

    if (!userData) {
      return null;
    }
    const formattedUser: LoggedInUser = {
      id: userData.id,
      email: userData.email,
      displayName: userData.display_name,
      profilePicUrl: userData.profile_pic_url,
      completedOnboarding: userData.completed_onboarding,
      teachingSkills: userData.teaching_skills || [],
      learningSkills: userData.learning_skills || [],
      communicationStyle: userData.communication_style,
      timeZone: userData.time_zone,
      chronotype: userData.chronotype,
      availability: userData.availability || [],
      learning_embeddings: userData.learning_embeddings,
      teaching_embeddings: userData.teaching_embeddings,
    };

    if (setUser) {
      setUser(formattedUser);
    }

    return formattedUser;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};
