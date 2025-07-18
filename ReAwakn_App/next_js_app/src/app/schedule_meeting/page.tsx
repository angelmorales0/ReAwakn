"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment-timezone";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "@/app/utils/supabase/client";
import MeetingConfirmationModal from "./MeetingConfirmationModal";
import {
  getIANATimezone,
  findOverlappingTimeSlots,
  convertToCalendarEvents,
} from "@/utility_methods/schedulingUtils";
import { CalendarUser, CalendarEvent } from "@/types/types";
import { getAuthUser } from "@/utility_methods/userUtils";
const localizer = momentLocalizer(moment);

export default function ScheduleMeetingPage() {
  const [userTimeZone, setUserTimeZone] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get("userId");
  const [loggedInUser, setLoggedInUser] = useState<CalendarUser | null>(null);
  const [targetUser, setTargetUser] = useState<CalendarUser | null>(null);
  const [availableSlots, setAvailableSlots] = useState<CalendarEvent[] | null>(
    []
  );
  const [selectedSlot, setSelectedSlot] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userTimezone = loggedInUser?.time_zone || "";
    const ianaTimezone = getIANATimezone(userTimezone);
    setUserTimeZone(ianaTimezone);
  }, [loggedInUser]);

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
          const slots = await findAvailableMeetingSlots(
            loggedInUserData.id,
            targetUserData.id
          );
          setAvailableSlots(slots);
        }
      }

      setIsLoading(false);
    };

    fetchUsers();
  }, [targetUserId, router, supabase, userTimeZone]);

  const findAvailableMeetingSlots = async (
    hostId: string,
    targetId: string
  ) => {
    const { data: hostAvailability } = await supabase
      .from("users")
      .select("availability")
      .eq("id", hostId)
      .single();

    const { data: targetAvailability } = await supabase
      .from("users")
      .select("availability")
      .eq("id", targetId)
      .single();

    if (!hostAvailability?.availability || !targetAvailability?.availability) {
      return [];
    }

    try {
      const hostAvailabilityArray = JSON.parse(hostAvailability.availability);
      const targetAvailabilityArray = JSON.parse(
        targetAvailability.availability
      );

      const overlappingSlots = findOverlappingTimeSlots(
        hostAvailabilityArray,
        targetAvailabilityArray
      );

      return convertToCalendarEvents(overlappingSlots, userTimeZone);
    } catch (error) {
      alert(error);
      return [];
    }
  };

  const handleSelectSlot = (slotInfo: { start: Date }) => {
    const start = new Date(slotInfo.start);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);
    const oneHourSlot = {
      ...slotInfo,
      start,
      end,
    };

    setSelectedSlot(oneHourSlot);
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event: {
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

  const handleBookMeeting = async () => {
    //1. Need to check if time slot has any conflicts on other users end,
    // if no conflicts add
    //if yes conflicts dont add
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">
        Schedule a Meeting with {targetUser?.name || targetUser?.display_name}
      </h1>

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
            {loggedInUser?.time_zone || "Local timezone"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <p className="mb-4">
          Select an available time slot to schedule a 1-hour meeting. Available
          slots are shown in the calendar below.
        </p>

        <div className="border border-gray-200 rounded-md relative">
          <div className="bg-white py-2 px-4 border-b border-gray-200 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">
              Available meeting times
            </span>
          </div>
          <div className="h-[700px] overflow-y-auto" id="calendar-container">
            {availableSlots && availableSlots.length > 0 ? (
              <Calendar
                localizer={localizer}
                events={availableSlots.map((slot) => ({
                  ...slot,
                  startUTC: slot.startUTC || "",
                  endUTC: slot.endUTC || "",
                }))}
                startAccessor="start"
                endAccessor="end"
                selectable
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                step={60}
                timeslots={1}
                defaultView="week"
                views={["week"]}
                min={new Date(0, 0, 0, 6, 0)} // 6am
                max={new Date(0, 0, 0, 23, 0)} // 11pm
                className="rounded-md"
                eventPropGetter={() => ({
                  style: {
                    backgroundColor: "#4CAF50",
                    cursor: "pointer",
                  },
                })}
                formats={{
                  timeGutterFormat: (date: Date) => moment(date).format("h A"),
                  eventTimeRangeFormat: (range) => {
                    return `${moment(range.start).format("h:mm A")} - ${moment(
                      range.end
                    ).format("h:mm A")}`;
                  },
                }}
              />
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
                <h3 className="text-lg font-medium text-gray-700 mb-2">
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
          onConfirm={handleBookMeeting}
        />
      )}
    </div>
  );
}
