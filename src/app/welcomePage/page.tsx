"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";

// Remove Later
// import { signOut } from "next-auth/react";
//import Button from "@/app/components/button";

export default function Main() {
  const router = useRouter();
  const t = useTranslations("main");

  const handleProductionTasksClick = () => {
    router.push("/production/tasks/create");
  };

  const handleLogsClick = () => {
    router.push("/production/tasks");
  };

  // Remove Later
  // const handleSignOut = async () => {
  //   // Signs the user out and redirects to the homepage (adjust callbackUrl as needed)
  //   await signOut({ redirect: true, callbackUrl: "/" });
  // };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center justify-center p-6 relative">
      {/* Main Heading */}
      <h1 className="text-4xl font-bold mb-6 text-gray-100 flex items-center">
        🎉 {t("mainHeading")} 🎉
      </h1>

      {/* Container for the grid of actions */}
      <div className="bg-gray-900 p-8 rounded-xl shadow-lg shadow-gray-900/50 w-full max-w-2xl border border-gray-700">
        <div className="grid grid-cols-3 gap-4">
          {/* Create Production Task */}
          <button
            onClick={handleProductionTasksClick}
            className="w-full aspect-square bg-violet-700 text-white rounded-lg hover:bg-violet-800 transition flex flex-col items-center justify-center text-lg font-semibold"
          >
            🛠️
            <span className="mt-1">{t("createProductionTask")}</span>
          </button>

          {/* Tasks */}
          <button
            onClick={handleLogsClick}
            className="w-full aspect-square bg-green-800 text-white rounded-lg hover:bg-green-900 transition flex flex-col items-center justify-center text-lg font-semibold"
          >
            👥
            <span className="mt-1">{t("tasks")}</span>
          </button>

          {/* Inventory Model */}
          <Link href="/mainMenu">
            <button className="w-full aspect-square bg-blue-900 text-white rounded-lg hover:bg-blue-950 transition flex flex-col items-center justify-center text-lg font-semibold">
              🏭
              <span className="mt-1">{t("inventoryModel")}</span>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
