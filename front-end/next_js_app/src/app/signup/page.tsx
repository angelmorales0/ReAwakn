import { SignUpForm } from "./components/SignUpForm";

const signUpPage = () => {
  return (
    <div className="flex h-sch items-center">
      <SignUpForm />
    </div>
  );
};
export default signUpPage;

//NEED TO LEARN HOW THIS WORKS ?!?!?!?
/**
 * "use client";

import "./login.css";
import { createClient } from "@supabase/supabase-js";

export default function Login() {
  const handleGitHubLogin = async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error, data } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/home`,
      },
    });

    if (error) {
      console.error("Error logging in:", error);
    } else {
      console.log("Login initiated:", data);
    }
  };

  return (
    <div className="flex-1 flex min-h-screen justify-center items-center login-form">
      <button
        onClick={handleGitHubLogin}
        className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <img src="/google.png" alt="GitHub Login" className="w-6 h-6 mr-2" />
        Sign in with GitHub
      </button>
    </div>
  );
}
 */
