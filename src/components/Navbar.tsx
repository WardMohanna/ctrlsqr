"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Button from "@/components/button";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, User } from "lucide-react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useClickOutside } from "@/hooks/useClickOutside";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);


  const { data: session } = useSession();
  const pathname = usePathname();

  useClickOutside(dropdownRef, () => setDropdownOpen(false));

  const toggleMenu = () => setMobileMenuOpen((open) => !open);

  // Base nav links visible to all logged-in users
  const navLinks = [
    { href: "/", label: "Home" },
  ];

  if (session?.user?.role === "user") {
    navLinks.push({ href: "/logs", label: "Logs" });
  }

  if (session?.user?.role === "admin") {
    navLinks.push({ href: "/manager", label: "Manager" });
  }

  return (
    <nav className="bg-gray-900 text-white px-4 py-3 shadow-md">
      <div className="gap-1 flex items-center justify-between max-w-7xl mx-auto">

        {/* Brand */}
        <Link href="/" className="text-xl font-semibold">
          CtrlSqr
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex space-x-6 items-center">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "hover:underline",
                pathname === href ? "font-bold underline text-blue-400" : ""
              )}
            >
              {label}
            </Link>
          ))}

          {/* User dropdown or login button */}
          {session ? (
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="p-2 rounded-full hover:bg-gray-700 focus:outline-none"
                aria-label="User menu"
              >
                <User className="w-5 h-5" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white text-black shadow-lg rounded z-50">
                  <Link
                    href="/profile"
                    className="block px-4 py-2 hover:bg-gray-100"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="block px-4 py-2 hover:bg-gray-100"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      signOut();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login">
              <Button variant="primary" size="sm">
                Login
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 space-y-3 px-4">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileMenuOpen(false)}
              className={clsx(
                "block px-3 py-2 rounded hover:bg-gray-700",
                pathname === href ? "font-bold underline text-blue-400" : ""
              )}
            >
              {label}
            </Link>
          ))}

          {session ? (
            <>
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded hover:bg-gray-700"
              >
                Profile
              </Link>
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded hover:bg-gray-700"
              >
                Settings
              </Link>
              <button
                onClick={() => {
                  signOut();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-gray-700"
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="primary" fullWidth size="sm">
                Login
              </Button>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
