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
    alert("Error updating user availability");
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

export const addUserSkill = async (
  userId: string,
  skill: string,
  type: "teach" | "learn",
  embedding: number[]
) => {
  const { data, error } = await supabase.from("user_skills").insert([
    {
      user_id: userId,
      skill: skill,
      type: type,
      embedding: embedding,
    },
  ]);

  if (error) {
    console.error("Error adding user skill:", error);
    return { success: false, error };
  }

  return { success: true, data };
};

export const removeUserSkill = async (
  userId: string,
  skill: string,
  type: "teach" | "learn"
) => {
  const { error } = await supabase
    .from("user_skills")
    .delete()
    .eq("user_id", userId)
    .eq("skill", skill)
    .eq("type", type);

  if (error) {
    alert("Error removing user skill");
    return { success: false, error };
  }
  return { success: true };
};

export const uploadProfilePicture = async (userId: string, file: File) => {
  try {
    if (!file.type.startsWith("image/")) {
      return { success: false, error: "File must be an image" };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "Image size should be less than 5MB" };
    }

    const filePath = `${userId}/pfp/${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("profilepics")
      .upload(filePath, file, {
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      return { success: false, error: uploadError };
    }

    const { data: publicUrlData } = supabase.storage
      .from("profilepics")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("users")
      .update({ profile_pic_url: publicUrl })
      .eq("id", userId);

    if (updateError) {
      alert("Error updating user profile picture");
      return { success: false, error: updateError };
    }

    return { success: true, profilePicUrl: publicUrl };
  } catch (error) {
    alert("Error uploading profile picture");
    return { success: false, error };
  }
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
