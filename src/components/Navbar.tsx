"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Button from "@/components/button";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, User } from "lucide-react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useTranslations } from "next-intl";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false),
        [dropdownOpen, setDropdownOpen] = useState(false),
        dropdownRef = useRef<HTMLDivElement>(null),
        { data: session } = useSession(),
        pathname = usePathname(),
        toggleMenu = () => setMobileMenuOpen((open) => !open),
        t = useTranslations("main"),
        navLinks = [{ href: "/", label: "מסך ראשי" }];

  useClickOutside(dropdownRef, () => setDropdownOpen(false));

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

        {/* Desktop nav links + user */}
        <div className="hidden md:flex items-center space-x-6">
          {/* Nav links */}
          <div className="flex items-center">
            {navLinks.map(({ href, label }, index) => (
              <div key={href} className="flex items-center">
                <Link
                  href={href}
                  className={clsx(
                    "px-3 hover:underline",
                    pathname === href ? "font-bold underline text-blue-400" : ""
                  )}
                >
                  {label}
                </Link>

                {/* Add divider except after last link */}
                {index < navLinks.length - 1 && (
                  <div className="h-5 border-l border-gray-500 mx-2"></div>
                )}
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="h-6 border-l border-gray-600 mx-3"></div>

          {/* User dropdown or login */}
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
                    {t("profile")}
                  </Link>
                  <Link
                    href="/settings"
                    className="block px-4 py-2 hover:bg-gray-100"
                    onClick={() => setDropdownOpen(false)}
                  >
                    {t("settings")}
                  </Link>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      signOut({ redirect: true, callbackUrl: "/" });
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    {t("signOut")}
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
