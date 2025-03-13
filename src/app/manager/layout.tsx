import Link from "next/link";
import "@/app/globals.css";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div style={{ width: "200px", backgroundColor: "#333", color: "#fff", padding: "20px" }}>
        <h2>Manager Panel</h2>
        <nav>
          <ul>
            <li><Link href="/manager">Dashboard Home</Link></li>
            <li><Link href="/manager/users">Manage Users</Link></li>
            <li><Link href="/manager/reports">View Reports</Link></li>
            <li><Link href="/manager/tasks">Manage Tasks</Link></li>
          </ul>
        </nav>
      </div>
      <div style={{ flex: 1, padding: "20px" }}>
        {children}
      </div>
    </div>
  );
}
