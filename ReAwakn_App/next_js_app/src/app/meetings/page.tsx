"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment-timezone";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "@/app/utils/supabase/client";
import { getAuthUser } from "@/utility_methods/userUtils";
import MeetingDetailsModal from "./MeetingDetailsModal";

const localizer = momentLocalizer(moment);

interface Meeting {
  id: string;
  host_id: string;
  guest_id: string;
  start_time: string;
  title: string;
  is_confirmed: boolean;
  host?: {
    display_name?: string;
    name?: string;
    email?: string;
  };
  guest?: {
    display_name?: string;
    name?: string;
    email?: string;
  };
}

interface CalendarMeeting {
  id: string;
  title: string;
  start: Date;
  end: Date;
  host_id: string;
  guest_id: string;
  is_confirmed: boolean;
  host?: {
    display_name?: string;
    name?: string;
    email?: string;
  };
  guest?: {
    display_name?: string;
    name?: string;
    email?: string;
  };
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<CalendarMeeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] =
    useState<CalendarMeeting | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();

  const fetchMeetings = async () => {
    setIsLoading(true);
    try {
      const user = await getAuthUser();

      const { data: meetingsData } = await supabase
        .from("meetings")
        .select(
          `
          *,
          host:host_id(display_name, email),
          guest:guest_id(display_name, email)
        `
        )
        .or(`host_id.eq.${user?.id},guest_id.eq.${user?.id}`);

      if (meetingsData) {
        const calendarMeetings = meetingsData.map((meeting: Meeting) => {
          const startTime = new Date(meeting.start_time);
          const endTime = new Date(startTime);
          endTime.setHours(startTime.getHours() + 1);

          return {
            id: meeting.id,
            title: meeting.title,
            start: startTime,
            end: endTime,
            host_id: meeting.host_id,
            guest_id: meeting.guest_id,
            is_confirmed: meeting.is_confirmed,
            host: meeting.host,
            guest: meeting.guest,
          };
        });

        setMeetings(calendarMeetings);
      }
    } catch (error) {
      alert("Error fetching meetings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const selectMeeting = (event: CalendarMeeting) => {
    setSelectedMeeting(event);
    setIsModalOpen(true);
  };

  const acceptMeeting = async (meetingId: string) => {
    try {
      const { error } = await supabase
        .from("meetings")
        .update({ is_confirmed: true })
        .eq("id", meetingId);

      if (error) {
        throw error;
      }

      await fetchMeetings();
      alert("Meeting confirmed successfully!");
    } catch (error) {
      alert("Failed to confirm meeting. Please try again.");
    }
  };

  const cancelMeeting = async (meetingId: string) => {
    if (!confirm("Are you sure you want to cancel this meeting?")) {
      return;
    }

    try {
      await supabase.from("meetings").delete().eq("id", meetingId);

      if (selectedMeeting && selectedMeeting.id === meetingId) {
        setIsModalOpen(false);
        setSelectedMeeting(null);
      }

      await fetchMeetings();

      alert("Meeting cancelled successfully!");
    } catch (error) {
      alert("Failed to cancel meeting");
    }
  };

  const calendarCSS = (event: CalendarMeeting) => {
    let backgroundColor = event.is_confirmed ? "#4CAF50" : "#FFC107";

    return {
      style: {
        backgroundColor,
        borderRadius: "5px",
        opacity: 0.8,
        color: "white",
        border: "0px",
        display: "block",
      },
    };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 text-black">
      <h1 className="text-2xl font-bold mb-6 text-black">My Meetings</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-black">Meeting Calendar</h2>
        </div>

        <div className="flex mb-4">
          <div className="flex items-center mr-4">
            <div className="w-4 h-4 bg-[#4CAF50] rounded-full mr-2"></div>
            <span className="text-sm text-black">Confirmed</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-[#FFC107] rounded-full mr-2"></div>
            <span className="text-sm text-black">Pending</span>
          </div>
        </div>

        <div className="border border-gray-200 rounded-md">
          <div className="h-[700px] text-black">
            <Calendar
              localizer={localizer}
              events={meetings}
              startAccessor="start"
              endAccessor="end"
              onSelectEvent={selectMeeting}
              eventPropGetter={calendarCSS}
              defaultView="week"
              views={["month", "week", "day"]}
              min={new Date(0, 0, 0, 6, 0)} // 6 AM
              max={new Date(0, 0, 0, 23, 0)} // 11 PM
              formats={{
                timeGutterFormat: (date: Date) => moment(date).format("h A"),
                eventTimeRangeFormat: (range) => {
                  return `${moment(range.start).format("h:mm A")} - ${moment(
                    range.end
                  ).format("h:mm A")}`;
                },
              }}
            />
          </div>
        </div>
      </div>

      {selectedMeeting && (
        <MeetingDetailsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          meeting={selectedMeeting}
          onConfirm={acceptMeeting}
          onCancel={cancelMeeting}
        />
      )}
    </div>
  );
}
