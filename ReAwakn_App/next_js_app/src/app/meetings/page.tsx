"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserTimezone } from "@/hooks/useUserTimezone";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment-timezone";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "@/app/utils/supabase/client";
import { getAuthUser } from "@/utility_methods/userUtils";
import MeetingDetailsModal from "./MeetingDetailsModal";
import { Meeting, CalendarMeeting } from "@/types/types";

const localizer = momentLocalizer(moment);

export default function MeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<CalendarMeeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] =
    useState<CalendarMeeting | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loggedInUserData, setLoggedInUserData] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const userTimezone = useUserTimezone(loggedInUserData);
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
          let timezone = userTimezone;

          if (meeting.scheduler_timezone && meeting.host_id === user?.id) {
            timezone = meeting.scheduler_timezone;
          }

          const startMoment = moment.tz(meeting.start_time, timezone);
          const endMoment = moment
            .tz(meeting.start_time, timezone)
            .add(1, "hour");

          const startTime = startMoment.toDate();
          const endTime = endMoment.toDate();

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
            scheduler_timezone: meeting.scheduler_timezone,
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
    const fetchUserData = async () => {
      try {
        const user = await getAuthUser();
        if (user) {
          const { data } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .single();

          setLoggedInUserData(data);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
    fetchMeetings();
  }, []);

  const selectMeeting = (event: CalendarMeeting) => {
    console.log(event);
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
      <h1 className="text-2xl font-bold mb-4 text-black">My Meetings</h1>

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
            <span className="font-medium">Your time zone:</span> {userTimezone}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-black">Meeting Calendar</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Back Home
            </button>
          </div>
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
              date={currentDate}
              onNavigate={(date) => setCurrentDate(date)}
              min={new Date(0, 0, 0, 6, 0)}
              max={new Date(0, 0, 0, 23, 0)}
              formats={{
                timeGutterFormat: (date: Date) =>
                  moment(date).tz(userTimezone).format("h A"),
                eventTimeRangeFormat: (range) => {
                  return `${moment(range.start)
                    .tz(userTimezone)
                    .format("h:mm A")} - ${moment(range.end)
                    .tz(userTimezone)
                    .format("h:mm A")}`;
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
