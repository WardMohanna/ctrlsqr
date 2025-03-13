"use client";

import { useRouter } from "next/navigation";

export default function ManagerDashboardHome() {
  const router = useRouter();

  return (
    <div>
      <h1>Manager Dashboard 🏢</h1>
      <p>Welcome to your dashboard! Use the sidebar or click the cards below to navigate.</p>

      <div className="card-container">
        <div className="dashboard-card" onClick={() => router.push("/manager/userManagment")}>
          <h2>👥 Manage Users</h2>
          <p>Add, remove, or update users in the system.</p>
        </div>

        <div className="dashboard-card" onClick={() => router.push("/manager/reports")}>
          <h2>📊 View Reports</h2>
          <p>Access detailed logs and reports from your team.</p>
        </div>
      </div>
    </div>
  );
}
