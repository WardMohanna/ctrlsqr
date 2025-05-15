"use client";

import Link from "next/link";
import clsx from "clsx";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

interface NavLinksProps {
  onClick?: () => void;
}

export default function NavLinks({ onClick }: NavLinksProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <>
      {session?.user?.role === "user" && (
        <Link
          href="/logs"
          onClick={onClick}
          className={clsx(
            "hover:underline",
            pathname === "/logs" && "font-bold underline text-blue-400"
          )}
        >
          Logs
        </Link>
      )}

      {session?.user?.role === "admin" && (
        <Link
          href="/manager"
          onClick={onClick}
          className={clsx(
            "hover:underline",
            pathname === "/manager" && "font-bold underline text-blue-400"
          )}
        >
          Manager
        </Link>
      )}
    </>
  );
}
