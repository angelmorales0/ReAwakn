import React, { useState } from "react";
import moment from "moment";
import { MeetingConfirmationModalProps } from "@/types/types";

export default function MeetingConfirmationModal({
  isOpen,
  onClose,
  selectedSlot,
  targetUser,
  onConfirm,
}: MeetingConfirmationModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onConfirm({
        title,
        description,
      });
      onClose();
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return moment(date).format("dddd, MMMM D, YYYY");
  };

  const formatTime = (date: Date) => {
    return moment(date).format("h:mm A");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Confirm Meeting</h2>

          <div className="mb-4">
            <p className="text-gray-600">
              <span className="font-medium">With:</span>{" "}
              {targetUser.name || targetUser.display_name}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Date:</span>{" "}
              {formatDate(selectedSlot.start)}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Time:</span>{" "}
              {formatTime(selectedSlot.start)} - {formatTime(selectedSlot.end)}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Meeting Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Coffee Chat, Mentoring Session"
                required
              />
            </div>

            <div className="mb-6">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description (Optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="What would you like to discuss?"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Booking...</span>
                  </div>
                ) : (
                  "Book Meeting"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
