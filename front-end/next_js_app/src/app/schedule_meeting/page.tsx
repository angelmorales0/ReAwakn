"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment-timezone";
import "react-big-calendar/lib/css/react-big-calendar.css";
import createClient from "@/app/utils/supabase/client";
import MeetingConfirmationModal from "./MeetingConfirmationModal";

// Load timezone data
moment.tz.load({
  version: "latest",
  zones: [
    "America/Los_Angeles|PST PDT|80 70|0101|1Lzm0 1zb0 Op0",
    "America/Denver|MST MDT|70 60|0101|1Lzl0 1zb0 Op0",
    "America/Chicago|CST CDT|60 50|0101|1Lzk0 1zb0 Op0",
    "America/New_York|EST EDT|50 40|0101|1Lzj0 1zb0 Op0",
    "America/Halifax|AST ADT|40 30|0101|1Lzi0 1zb0 Op0",
    "Pacific/Honolulu|HST|a0|0|",
    "America/Anchorage|AKST AKDT|90 80|0101|1Lzn0 1zb0 Op0",
  ],
  links: [],
});

const timezoneMapping: { [key: string]: string } = {
  "Pacific Time (PT)": "America/Los_Angeles",
  "Mountain Time (MT)": "America/Denver",
  "Central Time (CT)": "America/Chicago",
  "Eastern Time (ET)": "America/New_York",
  "Atlantic Time (AT)": "America/Halifax",
  "Hawaii Time (HT)": "Pacific/Honolulu",
  "Alaska Time (AKT)": "America/Anchorage",
};

const getIANATimezone = (timezone: string): string => {
  return timezoneMapping[timezone] || timezone;
};

const calendarStyles = `
  .rbc-time-view {
    overflow: visible !important;
  }
  .rbc-time-content {
    overflow: visible !important;
  }
`;

const localizer = momentLocalizer(moment);

export default function ScheduleMeetingPage() {
  const [userTimeZone, setUserTimeZone] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get("userId");
  const supabase = createClient();
  const [loggedInUser, setLoggedInUser] = useState<any>(null);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.innerHTML = calendarStyles;
    document.head.appendChild(styleElement);

    const userTimezone = loggedInUser?.time_zone;

    const ianaTimezone = getIANATimezone(userTimezone);
    setUserTimeZone(ianaTimezone);
    return () => {
      document.head.removeChild(styleElement);
    };
  }, [loggedInUser]);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

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
      // Parse availability strings from both users
      const hostAvailabilityArray = JSON.parse(hostAvailability.availability);
      const targetAvailabilityArray = JSON.parse(
        targetAvailability.availability
      );

      // Find overlapping time slots
      const overlappingSlots = findOverlappingTimeSlots(
        hostAvailabilityArray,
        targetAvailabilityArray
      );

      return convertToCalendarEvents(overlappingSlots);
    } catch (error) {
      return [];
    }
  };

  const findOverlappingTimeSlots = (
    hostSlots: string[],
    targetSlots: string[]
  ) => {
    const overlappingSlots = [];

    for (const hostSlot of hostSlots) {
      for (const targetSlot of targetSlots) {
        const overlap = findOverlap(hostSlot, targetSlot);
        if (overlap) {
          overlappingSlots.push(overlap);
        }
      }
    }
    return overlappingSlots;
  };
  const findOverlap = (slot1: string, slot2: string) => {
    const [start1, end1] = slot1.split(" - ").map(timeToMinutes); //converts to mins
    const [start2, end2] = slot2.split(" - ").map(timeToMinutes);

    const overlapStart = Math.max(start1, start2); //overlap starts at latest start time
    const overlapEnd = Math.min(end1, end2); //overlap ends at earliest end time

    if (overlapStart < overlapEnd) {
      return `${minutesToTime(overlapStart)} - ${minutesToTime(overlapEnd)}`;
    }

    return null;
  };

  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}`;
  };

  const convertToCalendarEvents = (timeSlots: string[]) => {
    const events = [];
    const startDate = new Date();

    const timezone = getIANATimezone(userTimeZone);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);

      // Skips weekends
      if (day.getDay() === 0 || day.getDay() === 6) continue;

      for (const slot of timeSlots) {
        const [startTime, endTime] = slot.split(" - ");
        const [startHours, startMinutes] = startTime.split(":").map(Number);
        const [endHours, endMinutes] = endTime.split(":").map(Number);
        const utcStart = moment.utc({
          year: day.getFullYear(),
          month: day.getMonth(),
          date: day.getDate(),
          hour: startHours,
          minute: startMinutes,
          second: 0,
          millisecond: 0,
        });
        const utcEnd = moment.utc({
          year: day.getFullYear(),
          month: day.getMonth(),
          date: day.getDate(),
          hour: endHours,
          minute: endMinutes,
          second: 0,
          millisecond: 0,
        });

        // Converts UTC times to timezone
        const localStart = utcStart.clone().tz(timezone);
        const localEnd = utcEnd.clone().tz(timezone);

        let slotStart = localStart.clone();

        while (
          slotStart.isBefore(localEnd) &&
          slotStart.clone().add(1, "hour").isSameOrBefore(localEnd)
        ) {
          const slotEnd = slotStart.clone().add(1, "hour");

          const formattedStartTime = slotStart.format("h:mm A");
          const formattedEndTime = slotEnd.format("h:mm A");

          const slotStartUTC = slotStart.clone().utc();
          const slotEndUTC = slotEnd.clone().utc();

          const startHour = slotStart.hour();
          const startMinute = slotStart.minute();
          const endHour = slotEnd.hour();
          const endMinute = slotEnd.minute();

          const startDate = new Date(
            slotStart.year(),
            slotStart.month(),
            slotStart.date(),
            startHour,
            startMinute,
            0
          );

          const endDate = new Date(
            slotEnd.year(),
            slotEnd.month(),
            slotEnd.date(),
            endHour,
            endMinute,
            0
          );

          events.push({
            start: startDate,
            end: endDate,
            startUTC: slotStartUTC.format(),
            endUTC: slotEndUTC.format(),
            // Store the correct hours for display
            displayStartHour: startHour,
            displayEndHour: endHour,
            displayTime: `${formattedStartTime} - ${formattedEndTime}`,
            resource: { available: true },
          });

          // Move to next hour
          slotStart.add(1, "hour");
        }
      }
    }

    return events;
  };

  const handleSelectSlot = (slotInfo: any) => {
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

  const handleSelectEvent = (event: any) => {
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

  //Future Implementation
  const handleBookMeeting = async (meetingDetails: any) => {
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
        Schedule a Meeting with {targetUser.name || targetUser.display_name}
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
            {availableSlots.length > 0 ? (
              <Calendar
                localizer={localizer}
                events={availableSlots}
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

      {isModalOpen && selectedSlot && (
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
