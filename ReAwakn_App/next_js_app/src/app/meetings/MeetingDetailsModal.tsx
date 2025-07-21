import React, { useEffect, useState } from "react";
import moment from "moment-timezone";
import { getAuthUser } from "@/utility_methods/userUtils";

interface MeetingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: {
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
  };
  onConfirm: (meetingId: string) => void;
  onCancel: (meetingId: string) => void;
}

export default function MeetingDetailsModal({
  isOpen,
  onClose: closeModal,
  meeting,
  onConfirm,
  onCancel,
}: MeetingDetailsModalProps) {
  const [userNeedsToAcceptMeeting, setUserNeedsToAcceptMeeting] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    const checkUserRole = async () => {
      const user = await getAuthUser();
      if (user) {
        setUserNeedsToAcceptMeeting(user.id === meeting.guest_id);
      }
    };

    checkUserRole();
  }, [meeting]);

  if (!isOpen) return null;

  const formatDate = (date: Date) => {
    return moment(date).format("dddd, MMMM D, YYYY");
  };

  const formatTime = (date: Date) => {
    return moment(date).format("h:mm A");
  };

  const hostName = meeting.host?.display_name;
  const guestName = meeting.guest?.display_name;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6 text-black">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold text-black">
              {meeting.title}
            </h2>
            <div
              className={`px-2 py-1 text-xs font-medium rounded-full ${
                meeting.is_confirmed
                  ? "bg-green-100 text-black"
                  : "bg-yellow-100 text-black"
              }`}
            >
              {meeting.is_confirmed ? "Confirmed" : "Pending"}
            </div>
          </div>

          <div className="mb-6">
            <p className="text-black mb-2">
              <span className="font-medium">Date:</span>{" "}
              {formatDate(meeting.start)}
            </p>
            <p className="text-black mb-2">
              <span className="font-medium">Time:</span>{" "}
              {formatTime(meeting.start)} - {formatTime(meeting.end)}
            </p>
            <p className="text-black mb-2">
              <span className="font-medium">Host:</span> {hostName}
            </p>
            <p className="text-black mb-2">
              <span className="font-medium">Guest:</span> {guestName}
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => onCancel(meeting.id)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Cancel Meeting
            </button>

            {userNeedsToAcceptMeeting && !meeting.is_confirmed && (
              <button
                type="button"
                onClick={() => {
                  onConfirm(meeting.id);
                  closeModal();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Confirm Meeting
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
