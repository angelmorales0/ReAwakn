interface Member {
  name: string;
  email?: string;
}

interface MemberCardProps {
  member: Member;
  onConnect?: (member: Member) => void;
}

export default function MemberCard({ member, onConnect }: MemberCardProps) {
  const handleConnect = () => {
    if (onConnect) {
      onConnect(member);
    }
  };

  return (
    <div className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mb-4">
          <span className="text-white font-semibold text-xl">
            {member.name.charAt(0).toUpperCase()}
          </span>
        </div>

        <h3 className="font-semibold text-gray-900 text-lg mb-1">
          {member.name}
        </h3>

        {member.email && (
          <p className="text-sm text-gray-600 mb-4">{member.email}</p>
        )}

        <button
          onClick={handleConnect}
          className="w-full px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Connect
        </button>
      </div>
    </div>
  );
}
