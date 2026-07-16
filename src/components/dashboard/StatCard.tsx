type StatCardProps = {
  title: string;
  value: string;
  change?: string;
};

export default function StatCard({
  title,
  value,
  change,
}: StatCardProps) {
  return (
    <div
      className="
      bg-[#07132A]
      border
      border-[#F0E6D2]
      rounded-2xl
      p-4
      shadow-lg
      "
    >
      <h3
        className="
        text-[#F0E6D2]
        mb-3
        "
      >
        {title}
      </h3>

      <div
        className="
        text-white
        text-3xl
        font-bold
        mb-2
        "
      >
        {value}
      </div>

      {change && (
        <div
          className="
          text-green-400
          text-lg font-bold
          "
        >
          {change}
        </div>
      )}
    </div>
  );
}