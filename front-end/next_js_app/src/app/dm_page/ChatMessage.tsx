import React, { Suspense } from "react";
import ListMessages from "./ListMessages";
import supabaseServer from "@/app/utils/supabase/server";
export default async function ChatMessage() {
  const supabase = await supabaseServer(); //does server stuf

  const { data } = await supabase.from("messages").select("*");
  console.log(data, "DATA");
  return (
    <Suspense fallback={"loading..."}>
      <ListMessages />
    </Suspense>
  );
}
