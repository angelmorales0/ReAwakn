"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import createClient from "@/app/utils/supabase/client";

interface SkillLevel {
  skill: string;
  level: number;
}

interface QuestionnaireData {
  skillsToTeach: SkillLevel[];
  skillsToLearn: SkillLevel[];
  chronotype: string;
  availability: string[];
  communicationStyle: string;
  timeZone: string;
}

export default function NewUserQuestionnaire() {
  const router = useRouter();

  const [formData, setFormData] = useState<QuestionnaireData>({
    skillsToTeach: [],
    skillsToLearn: [],
    chronotype: "",
    availability: [],
    communicationStyle: "",
    timeZone: "",
  });

  const [newTeachSkill, setNewTeachSkill] = useState("");
  const [newLearnSkill, setNewLearnSkill] = useState("");

  const availabilityOptions = [
    "6:00 AM - 9:00 AM",
    "9:00 AM - 12:00 PM",
    "12:00 PM - 3:00 PM",
    "3:00 PM - 6:00 PM",
    "6:00 PM - 9:00 PM",
  ];

  const timeZones = [
    "Pacific Time (PT)",
    "Mountain Time (MT)",
    "Central Time (CT)",
    "Eastern Time (ET)",
    "Atlantic Time (AT)",
    "Hawaii Time (HT)",
    "Alaska Time (AKT)",
  ];

  const tzOffsets: { [key: string]: number } = {
    "Pacific Time (PT)": 8,
    "Mountain Time (MT)": 7,
    "Central Time (CT)": 6,
    "Eastern Time (ET)": 5,
    "Atlantic Time (AT)": 4,
    "Alaska Time (AKT)": 9,
    "Hawaii Time (HT)": 10,
  };

  const convertTo24Hour = (time12h: string): number => {
    const [time, modifier] = time12h.split(" ");
    let [hours] = time.split(":").map(Number);

    if (hours === 12) {
      hours = 0;
    }
    if (modifier === "PM") {
      hours += 12;
    }

    return hours;
  };

  const pad_zeros = (num: number): string => {
    return num.toString().padStart(2, "0");
  };

  const toUtcRange = (localRange: string, offset: number): string => {
    const [start, end] = localRange
      .split(" - ")
      .map((t) => convertTo24Hour(t.trim()));

    const startUtc = (start + offset) % 24;
    const endUtc = (end + offset) % 24;

    return `${pad_zeros(startUtc)}:00 - ${pad_zeros(endUtc)}:00`;
  };

  const convertAvailabilityToUTC = (
    availabilitySlots: string[],
    timezone: string
  ): string[] => {
    const offset = tzOffsets[timezone];
    if (!offset) return availabilitySlots;

    return availabilitySlots.map((slot) => toUtcRange(slot, offset));
  };

  const getEmbedding = async (skill: string) => {
    // Convert string to bytes array using TextEncoder
    const encoder = new TextEncoder();
    const bytes = encoder.encode(skill.toLowerCase());

    // Convert Uint8Array to a JSONB-compatible object
    const jsonbEmbedding: Record<string, number> = {};
    for (let i = 0; i < bytes.length; i++) {
      jsonbEmbedding[i.toString()] = bytes[i];
    }

    console.log(jsonbEmbedding);
    return jsonbEmbedding;
  };

  const handleAvailabilityChange = (option: string) => {
    setFormData((prev) => ({
      ...prev,
      availability: prev.availability.includes(option)
        ? prev.availability.filter((a) => a !== option)
        : [...prev.availability, option],
    }));
  };

  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (formData.skillsToTeach.length === 0) {
      errors.push("Please select at least one skill you can teach");
    }

    if (formData.skillsToLearn.length === 0) {
      errors.push("Please select at least one skill you want to learn");
    }

    if (!formData.chronotype) {
      errors.push("Please select whether you're an early bird or night owl");
    }

    if (formData.availability.length === 0) {
      errors.push("Please select at least one availability option");
    }

    if (!formData.communicationStyle) {
      errors.push("Please select your communication style preference");
    }

    if (!formData.timeZone) {
      errors.push("Please select your time zone");
    }

    for (const learningSkill of formData.skillsToLearn) {
      const teachingSkill = formData.skillsToTeach.find(
        (s) => s.skill === learningSkill.skill
      );
      if (teachingSkill && teachingSkill.level < learningSkill.level) {
        errors.push(
          `Your teaching level for ${learningSkill.skill} should be equal to or higher than your learning level`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  const isFormComplete = (): boolean => {
    return (
      formData.skillsToTeach.length > 0 &&
      formData.skillsToLearn.length > 0 &&
      formData.chronotype !== "" &&
      formData.availability.length > 0 &&
      formData.communicationStyle !== "" &&
      formData.timeZone !== ""
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validation = validateForm();
    if (!validation.isValid) {
      alert(
        "Please complete all required fields:\n\n" +
          validation.errors.join("\n")
      );
      return;
    }

    try {
      const supabase = createClient();

      // Get the current authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return;
      }

      // Convert availability to UTC based on selected timezone
      const utcAvailability = convertAvailabilityToUTC(
        formData.availability,
        formData.timeZone
      );

      // First, update the user's profile information
      const { error: userUpdateError } = await supabase
        .from("users")
        .update({
          communication_style: formData.communicationStyle,
          time_zone: formData.timeZone,
          chronotype: formData.chronotype,
          availability: utcAvailability,
          completed_onboarding: true,
        })
        .eq("id", user.id);

      if (userUpdateError) {
        alert("There was an error updating your profile. Please try again.");
        return;
      }

      // Delete existing skills for this user if present
      const { error: deleteError } = await supabase
        .from("user_skills")
        .delete()
        .eq("user_id", user.id);

      const teachSkillsWithEmbeddings = await Promise.all(
        formData.skillsToTeach.map(async (skill) => {
          const embedding = await getEmbedding(skill.skill);
          return {
            user_id: user.id,
            skill: skill.skill,
            level: skill.level,
            type: "teach",
            embedding: embedding,
          };
        })
      );

      const learnSkillsWithEmbeddings = await Promise.all(
        formData.skillsToLearn.map(async (skill) => {
          const embedding = await getEmbedding(skill.skill);
          return {
            user_id: user.id,
            skill: skill.skill,
            level: skill.level,
            type: "learn",
            embedding: embedding,
          };
        })
      );

      const skillsToInsert = [
        ...teachSkillsWithEmbeddings,
        ...learnSkillsWithEmbeddings,
      ];

      if (skillsToInsert.length > 0) {
        const { error: skillsError } = await supabase
          .from("user_skills")
          .insert(skillsToInsert);

        if (skillsError) {
          alert("There was an error saving your skills. Please try again.");
          return;
        }
      }

      alert("Profile completed successfully!");
      router.push("/home");
    } catch (error) {
      alert("There was an error saving your profile. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-black py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              Welcome! Let's Get to Know You
            </CardTitle>
            <CardDescription className="text-center">
              Please answer these questions to help us match you with the right
              learning partners
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-8">
              {/* Question 1: Skills to Teach */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">
                  1. What skills can you confidently teach? (5 MAX) *
                </Label>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter a skill you can teach"
                      value={newTeachSkill}
                      onChange={(e) => setNewTeachSkill(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (
                          newTeachSkill.trim() &&
                          !formData.skillsToTeach.some(
                            (s) => s.skill === newTeachSkill.trim()
                          )
                        ) {
                          setFormData((prev) => ({
                            ...prev,
                            skillsToTeach: [
                              ...prev.skillsToTeach,
                              { skill: newTeachSkill.trim(), level: 1 },
                            ],
                          }));
                          setNewTeachSkill("");
                        }
                      }}
                      disabled={
                        !newTeachSkill.trim() ||
                        formData.skillsToTeach.length >= 5
                      }
                    >
                      Add
                    </Button>
                  </div>

                  {formData.skillsToTeach.length > 0 && (
                    <div className="space-y-3">
                      {formData.skillsToTeach.map((skillObj, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-medium">
                              {skillObj.skill}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  skillsToTeach: prev.skillsToTeach.filter(
                                    (_, i) => i !== index
                                  ),
                                }));
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600 mb-2">
                              Your teaching level:
                            </p>
                            {[1, 2, 3].map((level) => (
                              <label
                                key={level}
                                className="flex items-center space-x-2 cursor-pointer"
                              >
                                <input
                                  type="radio"
                                  name={`teach-${index}`}
                                  value={level}
                                  checked={skillObj.level === level}
                                  onChange={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      skillsToTeach: prev.skillsToTeach.map(
                                        (s, i) =>
                                          i === index ? { ...s, level } : s
                                      ),
                                    }));
                                  }}
                                  className="w-3 h-3 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm">
                                  {level === 1 && "Beginner (1 pt)"}
                                  {level === 2 && "Know the basics (2 pts)"}
                                  {level === 3 && "Intermediate (3 pts)"}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Question 2: Skills to Learn */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">
                  2. What skills are you interested in learning? (5 MAX) *
                </Label>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter a skill you want to learn"
                      value={newLearnSkill}
                      onChange={(e) => setNewLearnSkill(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (
                          newLearnSkill.trim() &&
                          !formData.skillsToLearn.some(
                            (s) => s.skill === newLearnSkill.trim()
                          )
                        ) {
                          setFormData((prev) => ({
                            ...prev,
                            skillsToLearn: [
                              ...prev.skillsToLearn,
                              { skill: newLearnSkill.trim(), level: 1 },
                            ],
                          }));
                          setNewLearnSkill("");
                        }
                      }}
                      disabled={!newLearnSkill.trim()}
                    >
                      Add
                    </Button>
                  </div>

                  {formData.skillsToLearn.length > 0 && (
                    <div className="space-y-3">
                      {formData.skillsToLearn.map((skillObj, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-medium">
                              {skillObj.skill}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  skillsToLearn: prev.skillsToLearn.filter(
                                    (_, i) => i !== index
                                  ),
                                }));
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600 mb-2">
                              Your current level:
                            </p>
                            {[1, 2, 3].map((level) => (
                              <label
                                key={level}
                                className="flex items-center space-x-2 cursor-pointer"
                              >
                                <input
                                  type="radio"
                                  name={`learn-${index}`}
                                  value={level}
                                  checked={skillObj.level === level}
                                  onChange={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      skillsToLearn: prev.skillsToLearn.map(
                                        (s, i) =>
                                          i === index ? { ...s, level } : s
                                      ),
                                    }));
                                  }}
                                  className="w-3 h-3 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm">
                                  {level === 1 && "Complete beginner (1 pt)"}
                                  {level === 2 && "Know the basics (2 pts)"}
                                  {level === 3 && "Intermediate (3 pts)"}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Question 5: Chronotype Preference */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">
                  5. Night owl or early bird? *
                </Label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="chronotype"
                      value="early-bird"
                      checked={formData.chronotype === "early-bird"}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          chronotype: e.target.value,
                        }))
                      }
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Early bird</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="chronotype"
                      value="night-owl"
                      checked={formData.chronotype === "night-owl"}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          chronotype: e.target.value,
                        }))
                      }
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Night owl</span>
                  </label>
                </div>
              </div>

              {/* Question 6: Availability */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">
                  6. When are you usually available? (Pick all that apply) *
                </Label>
                <div className="grid grid-cols-1 gap-3">
                  {availabilityOptions.map((option) => (
                    <label
                      key={option}
                      className="flex items-center space-x-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.availability.includes(option)}
                        onChange={() => handleAvailabilityChange(option)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Question 7: Communication Style */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">
                  7. Communication Style - How do you prefer to communicate? *
                </Label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="communicationStyle"
                      value="casual"
                      checked={formData.communicationStyle === "casual"}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          communicationStyle: e.target.value,
                        }))
                      }
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Casual & conversational</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="communicationStyle"
                      value="direct"
                      checked={formData.communicationStyle === "direct"}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          communicationStyle: e.target.value,
                        }))
                      }
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Direct & to the point</span>
                  </label>
                </div>
              </div>

              {/* Question 8: Time Zone */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">
                  8. Which time zone are you in? *
                </Label>
                <select
                  value={formData.timeZone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      timeZone: e.target.value,
                    }))
                  }
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select your time zone</option>
                  {timeZones.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="submit"
                className="w-full py-3 text-lg"
                disabled={!isFormComplete()}
              >
                {isFormComplete()
                  ? "Complete Setup"
                  : "Please Complete All Fields"}
              </Button>

              {!isFormComplete() && (
                <div className="text-center text-sm text-red-600 mt-2">
                  All fields marked with * are required
                </div>
              )}
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
