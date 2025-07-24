import { redirect } from "next/navigation";

export default function ScheduleMeetingRedirect({
  searchParams,
}: {
  searchParams: { userId?: string };
}) {
  const userId = searchParams.userId;

  if (userId) {
    redirect(`/meetings?userId=${userId}`);
  } else {
    redirect("/meetings");
  }
}
