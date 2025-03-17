"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();

  const handleProductionTasksClick = () => {
    router.push("/production/tasks/create");
  };

  const handleLogsClick = () => {
    router.push("/production/tasks");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold text-white mb-8">
        Welcome to the Main Page 🎉
      </h1>
      <div className="flex gap-6">
        <button
          onClick={handleProductionTasksClick}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
        >
          🛠️ Create Production Task
        </button>
        <button
          onClick={handleLogsClick}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
        >
          👥 Tasks
        </button>
        <Link href="/mainMenu">
          <button className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
            🏭 Inventory Model
          </button>
        </Link>
      </div>
    </div>
  );
}
