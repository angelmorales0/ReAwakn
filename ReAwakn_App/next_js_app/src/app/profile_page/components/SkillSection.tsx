import SkillBadge from "./SkillBadge";

interface SkillSectionProps {
  title: string;
  skills: string[];
  icon: "teaching" | "learning";
  emptyMessage: string;
}

export default function SkillSection({
  title,
  skills,
  icon,
  emptyMessage,
}: SkillSectionProps) {
  const iconColors = {
    teaching:
      "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400",
    learning: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",
  };

  const teachingIcon = (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
    />
  );

  const learningIcon = (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <div
          className={`w-8 h-8 ${iconColors[icon]} rounded-full flex items-center justify-center`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {icon === "teaching" ? teachingIcon : learningIcon}
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
      </div>
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 min-h-[120px]">
        {skills.length > 0 ? (
          <div className="flex flex-wrap">
            {skills.map((skill, index) => (
              <SkillBadge key={index} skill={skill} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 italic">
            {emptyMessage}
          </p>
        )}
      </div>
    </div>
  );
}
