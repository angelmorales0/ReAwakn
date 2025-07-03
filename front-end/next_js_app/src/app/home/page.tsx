import { createClient } from "@supabase/supabase-js";

export default async function HomePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Welcome to your Home Page!
        </h1>

        <div className="space-y-4">
          <p className="text-gray-600">You are successfully logged in.</p>

          {user && (
            <div className="bg-blue-50 p-4 rounded-md">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">
                User Info:
              </h2>
              <p className="text-blue-800">
                <strong>Email:</strong> {user.email}
              </p>
              <p className="text-blue-800">
                <strong>ID:</strong> {user.id}
              </p>
              <p className="text-blue-800">
                <strong>Created:</strong>{" "}
                {new Date(user.created_at).toLocaleDateString()}
              </p>
              {user.user_metadata && (
                <div className="mt-2">
                  <strong>Metadata:</strong>
                  <pre className="text-sm bg-gray-100 p-2 rounded mt-1">
                    {JSON.stringify(user.user_metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          <form action="/" method="post">
            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
