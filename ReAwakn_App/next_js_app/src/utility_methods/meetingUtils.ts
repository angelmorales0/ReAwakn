import moment from "moment-timezone";
import { CalendarEvent } from "@/types/types";

export function hasConflict(
  event: { startUTC?: string; endUTC?: string },
  existingMeetings: Array<{ start_time: string }>
): boolean {
  if (!event.startUTC || !event.endUTC) {
    return false;
  }

  const eventStart = moment.utc(event.startUTC);
  const eventEnd = moment.utc(event.endUTC);

  return existingMeetings.some((meeting) => {
    const meetingStart = moment.utc(meeting.start_time);
    const meetingEnd = moment.utc(meeting.start_time).add(1, "hour");
    return eventStart.isBefore(meetingEnd) && meetingStart.isBefore(eventEnd);
  });
}
export function filterAvailableEvents(
  calendarEvents: CalendarEvent[],
  existingMeetings: Array<{ start_time: string }> | null
): CalendarEvent[] {
  if (!existingMeetings || existingMeetings.length === 0) {
    return calendarEvents;
  }

  return calendarEvents.filter(
    (event) => !hasConflict(event, existingMeetings)
  );
}

interface UserData {
  time_zone?: string;
  chronotype?: string;
}

export function prepareUserForRanking(
  userId: string,
  userData: UserData
): { user_id: string; timezone: string; chronotype: string } {
  return {
    user_id: userId,
    timezone: userData.time_zone || "America/Los_Angeles",
    chronotype: userData.chronotype || "early_bird",
  };
}

export function prepareSlotsForRanking(
  events: CalendarEvent[]
): Array<{ startUTC: string; endUTC: string }> {
  return events.map((event) => ({
    startUTC: event.startUTC || "",
    endUTC: event.endUTC || "",
  }));
}

export function markBestMeetingSlot(
  events: CalendarEvent[],
  bestSlot: { startUTC: string; endUTC: string; score: number } | null
): CalendarEvent[] {
  if (!bestSlot) return events;

  return events.map((event) => {
    if (
      event.startUTC === bestSlot.startUTC &&
      event.endUTC === bestSlot.endUTC
    ) {
      return {
        ...event,
        score: bestSlot.score,
        resource: {
          ...(event.resource || {}),
          available: true,
          isBestSlot: true,
          score: bestSlot.score,
        },
      };
    }

    return {
      ...event,
      resource: {
        ...(event.resource || {}),
        available: true,
        isBestSlot: false,
      },
    };
  });
}
