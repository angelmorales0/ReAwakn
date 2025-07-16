"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import createClient from "@/app/utils/supabase/client";
import MeetingConfirmationModal from "./MeetingConfirmationModal";

// Setup the localizer for react-big-calendar
const localizer = momentLocalizer(moment);

export default function ScheduleMeetingPage() {
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
    const fetchUsers = async () => {
      setIsLoading(true);

      // Get current logged in user data
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

      // Get target user details
      if (targetUserId) {
        const { data: targetUserData } = await supabase
          .from("users")
          .select("*")
          .eq("id", targetUserId)
          .single();

        setTargetUser(targetUserData);

        // Find available meeting slots
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
  }, [targetUserId, router, supabase]);

  const findAvailableMeetingSlots = async (
    user1Id: string,
    user2Id: string
  ) => {
    console.log(`Need to implement lol`);
    return generateDummyAvailability();
  };

  const generateDummyAvailability = () => {
    const slots = [];
    const startDate = new Date();

    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);

      // Skip weekends
      if (day.getDay() === 0 || day.getDay() === 6) continue;

      // 9am to 5pm, 1-hour slots for now
      for (let hour = 9; hour < 17; hour++) {
        const start = new Date(day);
        start.setHours(hour, 0, 0, 0);

        const end = new Date(day);
        end.setHours(hour + 1, 0, 0, 0);

        slots.push({
          title: "Available",
          start,
          end,
          resource: { available: true },
        });
      }
    }

    return slots;
  };

  // Handle slot selection
  const handleSelectSlot = (slotInfo: any) => {
    // Enforce exactly one hour duration
    const start = new Date(slotInfo.start);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);

    // Create a new slot with exactly one hour duration
    const oneHourSlot = {
      ...slotInfo,
      start,
      end,
    };

    setSelectedSlot(oneHourSlot);
    setIsModalOpen(true);
  };

  // Handle event click (when user clicks on an available slot)
  const handleSelectEvent = (event: any) => {
    // Use the event's start and end time
    const oneHourSlot = {
      start: event.start,
      end: event.end,
      action: "click",
    };

    setSelectedSlot(oneHourSlot);
    setIsModalOpen(true);
  };

  // Book a meeting
  const handleBookMeeting = async (meetingDetails: any) => {
    if (!loggedInUser || !targetUser || !selectedSlot) return;

    try {
      // Create meeting
      const meeting = {
        organizer_id: loggedInUser.id,
        attendee_id: targetUser.id,
        start_time: selectedSlot.start.toISOString(),
        end_time: selectedSlot.end.toISOString(),
        title: meetingDetails.title,
        description: meetingDetails.description,
        status: "scheduled" as const,
      };

      console.log("Meeting booked:", meeting); // NEED TO SAVE TO DB

      return true;
    } catch (error) {
      console.error("Error booking meeting:", error);
      alert("Failed to book meeting. Please try again.");
      return false;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Schedule a Meeting</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          User not found. Please select a valid user to schedule a meeting with.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">
        Schedule a Meeting with {targetUser.name || targetUser.display_name}
      </h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <p className="mb-4">
          Select an available time slot to schedule a 1-hour meeting. Available
          slots are shown in the calendar below.
        </p>

        <div className="h-[600px]">
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
            views={["week", "day"]}
            min={new Date(0, 0, 0, 9, 0)} // 9am
            max={new Date(0, 0, 0, 17, 0)} // 5pm
            className="rounded-md"
            eventPropGetter={() => ({
              style: {
                backgroundColor: "#4CAF50",
                cursor: "pointer",
              },
            })}
          />
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
