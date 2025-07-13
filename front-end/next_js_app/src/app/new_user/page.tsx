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
  const supabase = createClient();

  const [formData, setFormData] = useState<QuestionnaireData>({
    skillsToTeach: [],
    skillsToLearn: [],
    chronotype: "",
    availability: [],
    communicationStyle: "",
    timeZone: "",
  });

  const skillOptions = [
    "Fitness",
    "Cooking",
    "Professional Development",
    "Academics",
    "Music",
  ];

  const availabilityOptions = [
    "Weekday mornings",
    "Weekday evenings",
    "Weekends",
    "Varies week to week",
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

  const handleSkillToggle = (skill: string, type: "teach" | "learn") => {
    const field = type === "teach" ? "skillsToTeach" : "skillsToLearn";

    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].some((s) => s.skill === skill)
        ? prev[field].filter((s) => s.skill !== skill)
        : [...prev[field], { skill, level: 1 }],
    }));
  };

  const handleSkillLevelChange = (
    skill: string,
    level: number,
    type: "teach" | "learn"
  ) => {
    const field = type === "teach" ? "skillsToTeach" : "skillsToLearn";

    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].map((s) =>
        s.skill === skill ? { ...s, level } : s
      ),
    }));
  };

  const isSkillSelected = (skill: string, type: "teach" | "learn"): boolean => {
    const field = type === "teach" ? "skillsToTeach" : "skillsToLearn";
    return formData[field].some((s) => s.skill === skill);
  };

  const getSkillLevel = (skill: string, type: "teach" | "learn"): number => {
    const field = type === "teach" ? "skillsToTeach" : "skillsToLearn";
    const skillObj = formData[field].find((s) => s.skill === skill);
    return skillObj?.level || 1;
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("Please log in to complete your profile.");
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .update({
          teaching_skills: formData.skillsToTeach,
          learning_skills: formData.skillsToLearn,
          communication_style: formData.communicationStyle,
          time_zone: formData.timeZone,
          chronotype: formData.chronotype,
          availability: formData.availability,
          completed_onboarding: true,
        })
        .eq("id", user.id);
      if (error) {
        alert("There was an error saving your profile. Please try again.");
      } else {
        alert("Profile completed successfully!");
        router.push("/");
      }
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
              {/* Question 1: Skills to Teach with Individual Levels */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">
                  1. What skills can you confidently teach and at what level? *
                </Label>
                <div className="space-y-4">
                  {skillOptions.map((skill) => (
                    <div key={skill} className="border rounded-lg p-4">
                      <label className="flex items-center space-x-3 cursor-pointer mb-3">
                        <input
                          type="checkbox"
                          checked={isSkillSelected(skill, "teach")}
                          onChange={() => handleSkillToggle(skill, "teach")}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="font-medium">{skill}</span>
                      </label>

                      {isSkillSelected(skill, "teach") && (
                        <div className="ml-7 space-y-2">
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
                                name={`teach-${skill}`}
                                value={level}
                                checked={
                                  getSkillLevel(skill, "teach") === level
                                }
                                onChange={() =>
                                  handleSkillLevelChange(skill, level, "teach")
                                }
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
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Question 2: Skills to Learn with Individual Levels */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">
                  2. What skills are you interested in learning and at what
                  level are you currently? *
                </Label>
                <div className="space-y-4">
                  {skillOptions.map((skill) => (
                    <div key={skill} className="border rounded-lg p-4">
                      <label className="flex items-center space-x-3 cursor-pointer mb-3">
                        <input
                          type="checkbox"
                          checked={isSkillSelected(skill, "learn")}
                          onChange={() => handleSkillToggle(skill, "learn")}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="font-medium">{skill}</span>
                      </label>

                      {isSkillSelected(skill, "learn") && (
                        <div className="ml-7 space-y-2">
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
                                name={`learn-${skill}`}
                                value={level}
                                checked={
                                  getSkillLevel(skill, "learn") === level
                                }
                                onChange={() =>
                                  handleSkillLevelChange(skill, level, "learn")
                                }
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
                      )}
                    </div>
                  ))}
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
