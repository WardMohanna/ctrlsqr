"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();

  const handleUsersClick = () => {
    router.push("/logs");
  };

  const handleProductionClick = () => {
    router.push("/mainMenu");
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Welcome to the Main Page</h1>
      <div style={{ marginTop: "20px" }}>
        <button onClick={handleUsersClick} style={buttonStyle}>
          Users
        </button>
        <Link href="/mainMenu">
        <button style={buttonStyle}>
          Production
        </button>
        </Link>
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  margin: "10px",
  padding: "10px 20px",
  fontSize: "16px",
  cursor: "pointer",
};
