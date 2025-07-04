interface Member {
  id: string;
  name: string;
  email?: string;
}

interface MemberCardProps {
  member: Member;
  onConnect?: (member: Member) => void;
}
import { useRouter } from "next/navigation";

function MemberCard({ member, onConnect }: MemberCardProps) {
  const router = useRouter();

  const handleConnect = () => {
    if (onConnect) {
      onConnect(member);
    }
  };
  const viewProfile = async (props: { id: string }) => {
    router.push(`/profile_page?id=${props.id}`);
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
          className="w-full px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mb-2"
        >
          Connect
        </button>
        <button
          onClick={() => viewProfile({ id: member.id })}
          className="w-full px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          View Profile
        </button>
      </div>
    </div>
  );
}

interface MemberCardsProps {
  members: Member[];
  onConnect?: (member: Member) => void;
}

export default function MemberCards({ members, onConnect }: MemberCardsProps) {
  const router = useRouter();

  if (members.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">No members found</div>
      </div>
    );
  }

  const handleConnect = (member: Member) => {
    if (onConnect) {
      onConnect(member);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {members.map((member) => (
          <MemberCard
            key={member.name}
            member={member}
            onConnect={handleConnect}
          />
        ))}
      </div>
    </div>
  );
}
