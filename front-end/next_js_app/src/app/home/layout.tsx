import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: user } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }
  return <div>{children}</div>;
}
