"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment-timezone";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/styles/calendar.css";
import { supabase } from "@/app/utils/supabase/client";
import MeetingConfirmationModal from "./MeetingConfirmationModal";
import {
  findOverlappingTimeSlots,
  convertToCalendarEvents,
} from "@/utility_methods/schedulingUtils";
import {
  filterAvailableEvents,
  prepareUserForRanking,
  prepareSlotsForRanking,
  markTopMeetingSlots,
} from "@/utility_methods/meetingUtils";
import { calculateUserSimilarityScores } from "@/utility_methods/memberCardUtils";
import { CalendarUser, RankedCalendarEvent } from "@/types/types";

import { getAuthUser } from "@/utility_methods/userUtils";
import { useUserTimezone } from "@/hooks/useUserTimezone";
const localizer = momentLocalizer(moment);

function ScheduleMeetingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get("userId");
  const [loggedInUser, setLoggedInUser] = useState<CalendarUser | null>(null);
  const [targetUser, setTargetUser] = useState<CalendarUser | null>(null);
  const [availableSlots, setAvailableSlots] = useState<
    RankedCalendarEvent[] | null
  >([]);
  const [selectedSlot, setSelectedSlot] = useState<RankedCalendarEvent | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [teachingHours, setTeachingHours] = useState<number>(0);
  const [matchingSkill, setMatchingSkill] = useState<string>("");

  const userTimeZone = useUserTimezone(loggedInUser);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);

      const user = await getAuthUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: loggedInUserData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      setLoggedInUser(loggedInUserData);

      if (targetUserId) {
        const { data: targetUserData } = await supabase
          .from("users")
          .select("*")
          .eq("id", targetUserId)
          .single();

        setTargetUser(targetUserData);

        if (loggedInUserData && targetUserData) {
          try {
            const result = await calculateUserSimilarityScores(
              loggedInUserData.id,
              targetUserData.id
            );

            const { teaching_hours, matching_skill } = result;

            if (
              teaching_hours !== undefined &&
              teaching_hours > 0 &&
              matching_skill
            ) {
              setTeachingHours(teaching_hours);
              setMatchingSkill(matching_skill);
            }
          } catch (error) {
            alert("Error getting teaching hours");
          }
        }
      }

      setIsLoading(false);
    };

    fetchUsers();
  }, [targetUserId, router]);

  useEffect(() => {
    const findAvailableSlots = async () => {
      if (!loggedInUser || !targetUser || !userTimeZone) {
        return;
      }

      const slots = await findAvailableMeetingSlots(
        loggedInUser.id,
        targetUser.id,
        teachingHours
      );
      setAvailableSlots(slots);
    };

    findAvailableSlots();
  }, [loggedInUser, targetUser, userTimeZone, teachingHours]);

  const findAvailableMeetingSlots = async (
    hostId: string,
    targetId: string,
    hours: number = teachingHours
  ) => {
    const { data: hostData } = await supabase
      .from("users")
      .select("*")
      .eq("id", hostId)
      .single();

    const { data: targetData } = await supabase
      .from("users")
      .select("*")
      .eq("id", targetId)
      .single();

    if (!hostData?.availability || !targetData?.availability) {
      return [];
    }

    try {
      const hostAvailabilityArray = JSON.parse(hostData.availability);
      const targetAvailabilityArray = JSON.parse(targetData.availability);

      const overlappingSlots = findOverlappingTimeSlots(
        hostAvailabilityArray,
        targetAvailabilityArray
      );

      const calendarEvents = convertToCalendarEvents(
        overlappingSlots,
        userTimeZone
      );

      const startDate = moment().startOf("day").toISOString();
      const endDate = moment().add(2, "months").endOf("month").toISOString();

      const { data: existingMeetings, error: meetingsError } = await supabase
        .from("meetings")
        .select("*")
        .or(
          `host_id.eq.${hostId},guest_id.eq.${hostId},host_id.eq.${targetId},guest_id.eq.${targetId}`
        )
        .gte("start_time", startDate)
        .lte("start_time", endDate);

      if (meetingsError) {
        alert("Error fetching existing meetings");
      }

      const availableEvents = filterAvailableEvents(
        calendarEvents,
        existingMeetings
      );

      if (availableEvents.length === 0) {
        return [];
      }

      const host = prepareUserForRanking(hostId, hostData);
      const target = prepareUserForRanking(targetId, targetData);

      const slotsForRanking = prepareSlotsForRanking(availableEvents);

      try {
        const response = await fetch("/meeting_ranker_api", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user1: host,
            user2: target,
            slots: slotsForRanking,
            existingMeetings: existingMeetings || [],
          }),
        });

        if (!response.ok) {
          return availableEvents;
        }

        const { top_slots } = await response.json();

        if (top_slots && top_slots.length > 0) {
          const numSlotsToShow = hours > 0 ? hours : 5;
          return markTopMeetingSlots(
            availableEvents,
            top_slots,
            numSlotsToShow
          ) as RankedCalendarEvent[];
        } else {
          return availableEvents as RankedCalendarEvent[];
        }
      } catch (error) {
        return availableEvents;
      }
    } catch (error) {
      alert(error);
      return [];
    }
  };

  const selectEvent = (event: {
    start: Date;
    end: Date;
    startUTC: string;
    endUTC: string;
  }) => {
    const oneHourSlot = {
      start: event.start,
      end: event.end,
      startUTC: event.startUTC,
      endUTC: event.endUTC,
      action: "click",
    };

    setSelectedSlot(oneHourSlot);
    setIsModalOpen(true);
  };

  const bookMeeting = async ({ title }: { title: string }) => {
    try {
      if (!loggedInUser || !targetUser || !selectedSlot) {
        throw new Error("Missing required information to book meeting");
      }

      const startTimeISO = selectedSlot.startUTC
        ? moment.utc(selectedSlot.startUTC).toISOString()
        : moment.utc(selectedSlot.start).toISOString();

      const { data: existingMeetings, error: conflictError } = await supabase
        .from("meetings")
        .select("*")
        .or(
          `host_id.eq.${loggedInUser.id},guest_id.eq.${loggedInUser.id},host_id.eq.${targetUser.id},guest_id.eq.${targetUser.id}`
        )
        .eq("start_time", startTimeISO);

      if (conflictError) {
        alert("Error checking for meeting conflicts");
        throw new Error("Error checking for meeting conflicts");
      }

      if (existingMeetings && existingMeetings.length > 0) {
        alert(
          "This time slot is no longer available. Please select another time."
        );
        return;
      }

      const { error: insertError } = await supabase.from("meetings").insert({
        host_id: loggedInUser.id,
        guest_id: targetUser.id,
        start_time: startTimeISO,
        title: title,
        is_confirmed: false,
      });

      if (insertError) {
        alert("Failed to schedule meeting");
        throw new Error("Failed to schedule meeting");
      }

      alert("Meeting scheduled successfully!");
      router.push("/");
    } catch (error) {
      alert("Failed to schedule meeting. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 calendar-container">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold calendar-page-text">
          Schedule a Meeting with {targetUser?.name || targetUser?.display_name}
        </h1>
        <button
          onClick={() => router.push("/")}
          className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-colors"
        >
          <span className="calendar-page-text">Back to Home</span>
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4 flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-blue-500 mr-2"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
            clipRule="evenodd"
          />
        </svg>
        <div>
          <p className="text-sm text-blue-700">
            <span className="font-medium">Your time zone:</span>{" "}
            {userTimeZone || "Local timezone"}
          </p>
        </div>
      </div>

      {teachingHours > 0 && matchingSkill && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-green-500 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-green-700 font-medium">
              Teaching Plan Information
            </p>
          </div>
          <div className="mt-2 text-sm text-green-700">
            <p>
              <span className="font-medium">Matching Skill:</span>{" "}
              {matchingSkill}
            </p>
            <p>
              <span className="font-medium">Teaching Hours Required:</span>{" "}
              {teachingHours} hours
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <p className="mb-4 calendar-page-text">
          Select an available time slot to schedule a 1-hour meeting. Available
          slots are shown in the calendar below, ranked by optimality.
        </p>

        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <h3 className="text-sm font-medium calendar-page-text mb-2">
            Meeting Time Legend
          </h3>
          <p className="text-xs calendar-page-text mb-2">
            The system has analyzed both users' preferences, chronotypes, and
            schedules to identify the optimal meeting time.
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-[#FF5722] mr-1 rounded border border-[#D84315]"></div>
              <span className="text-xs calendar-page-text">
                Best Meeting Time
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-[#78909C] mr-1 rounded"></div>
              <span className="text-xs calendar-page-text">Available Time</span>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-md relative">
          <div className="bg-white py-2 px-4 border-b border-gray-200 flex justify-between items-center">
            <span className="text-sm font-medium calendar-page-text">
              Available meeting times
            </span>
          </div>
          <div
            className="h-[700px] overflow-y-auto calendar-container"
            id="calendar-container"
          >
            {availableSlots && availableSlots.length > 0 ? (
              <>
                <Calendar
                  localizer={localizer}
                  events={availableSlots.map((slot) => ({
                    ...slot,
                    startUTC: slot.startUTC || "",
                    endUTC: slot.endUTC || "",
                  }))}
                  startAccessor="start"
                  endAccessor="end"
                  onSelectEvent={selectEvent}
                  step={60}
                  timeslots={1}
                  defaultView="week"
                  views={["week"]}
                  date={currentDate}
                  onNavigate={(date) => setCurrentDate(date)}
                  min={new Date(0, 0, 0, 6, 0)}
                  max={new Date(0, 0, 0, 23, 0)}
                  className="rounded-md text-black calendar-black-text"
                  eventPropGetter={(event: any) => {
                    if (event.resource?.isBestSlot) {
                      return {
                        style: {
                          backgroundColor: "#FF5722",
                          cursor: "pointer",
                          border: "2px solid #D84315",
                          boxShadow: "0 0 5px rgba(255, 87, 34, 0.5)",
                        },
                      };
                    }

                    return {
                      style: {
                        backgroundColor: "#78909C",
                        cursor: "pointer",
                      },
                    };
                  }}
                  formats={{
                    timeGutterFormat: (date: Date) =>
                      moment(date).format("h A"),
                    eventTimeRangeFormat: (range) => {
                      return `${moment(range.start).format(
                        "h:mm A"
                      )} - ${moment(range.end).format("h:mm A")}`;
                    },
                  }}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded-md p-8">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 text-gray-400 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="text-lg font-medium calendar-page-text mb-2">
                  No Availability Found
                </h3>
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && selectedSlot && targetUser && (
        <MeetingConfirmationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          selectedSlot={selectedSlot}
          targetUser={targetUser}
          onConfirm={bookMeeting}
          teachingHours={teachingHours}
          matchingSkill={matchingSkill}
        />
      )}
    </div>
  );
}

export default function ScheduleMeetingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      }
    >
      <ScheduleMeetingContent />
    </Suspense>
  );
}
