interface Member {
  name: string;
  email?: string;
}

interface MemberListProps {
  members: Member[];
}

export default function MemberList({ members }: MemberListProps) {
  if (members.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">No members found</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-3">
        {members.map((member) => (
          <div
            key={member.name}
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{member.name}</h3>
                {member.email && (
                  <p className="text-sm text-gray-600">{member.email}</p>
                )}
              </div>
              <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors">
                Connect
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
