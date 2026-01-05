"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Layout, Menu, Dropdown, Avatar, Button } from "antd";
import { UserOutlined, MenuOutlined, LogoutOutlined, SettingOutlined, ProfileOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";

const { Header } = Layout;

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  const t = useTranslations("main");

  const navLinks: { href: string; label: string; key: string }[] = [
    { href: "/", label: "מסך ראשי", key: "home" }
  ];

  if (session?.user?.role === "user") {
    navLinks.push({ href: "/production/tasks", label: "משימות", key: "tasks" });
  }

  if (session?.user?.role === "admin") {
    navLinks.push({ href: "/manager", label: "מנהל", key: "manager" });
  }

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <ProfileOutlined />,
      label: <Link href="/profile">{t("profile")}</Link>,
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: <Link href="/settings">{t("settings")}</Link>,
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: t("signOut"),
      onClick: () => signOut({ redirect: true, callbackUrl: "/" }),
      danger: true,
    },
  ];

  return (
    <Header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: "#001529",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      {/* Logo/Brand */}
      <Link
        href="/"
        style={{
          color: "#fff",
          fontSize: "20px",
          fontWeight: "bold",
          marginLeft: "16px",
        }}
      >
        CtrlSqr
      </Link>

      {/* Desktop Menu */}
      <div style={{ display: "flex", alignItems: "center", gap: "24px", flex: 1 }}>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[navLinks.find(link => link.href === pathname)?.key || ""]}
          style={{
            flex: 1,
            minWidth: 0,
            background: "transparent",
            border: "none",
            display: window.innerWidth >= 768 ? "flex" : "none",
          }}
          className="desktop-menu"
          items={navLinks.map(link => ({
            key: link.key,
            label: <Link href={link.href}>{link.label}</Link>,
          }))}
        />

        {/* User Section */}
        <div className="desktop-user" style={{ display: window.innerWidth >= 768 ? "block" : "none" }}>
          {session ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomLeft" trigger={["click"]}>
              <Avatar
                size="large"
                icon={<UserOutlined />}
                style={{
                  backgroundColor: "#1677ff",
                  cursor: "pointer",
                }}
              />
            </Dropdown>
          ) : (
            <Link href="/login">
              <Button type="primary" size="middle">
                Login
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            fontSize: "20px",
            color: "#fff",
            display: window.innerWidth >= 768 ? "none" : "inline-flex",
          }}
          className="mobile-menu-button"
        />
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          style={{
            position: "absolute",
            top: "64px",
            right: 0,
            left: 0,
            background: "#001529",
            padding: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
          className="mobile-menu"
        >
          <Menu
            theme="dark"
            mode="vertical"
            selectedKeys={[navLinks.find(link => link.href === pathname)?.key || ""]}
            style={{ background: "transparent", border: "none" }}
            items={navLinks.map(link => ({
              key: link.key,
              label: <Link href={link.href} onClick={() => setMobileMenuOpen(false)}>{link.label}</Link>,
            }))}
          />
          
          {session ? (
            <Menu
              theme="dark"
              mode="vertical"
              style={{ background: "transparent", border: "none", marginTop: "8px" }}
              items={[
                {
                  key: "profile",
                  icon: <ProfileOutlined />,
                  label: <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>{t("profile")}</Link>,
                },
                {
                  key: "settings",
                  icon: <SettingOutlined />,
                  label: <Link href="/settings" onClick={() => setMobileMenuOpen(false)}>{t("settings")}</Link>,
                },
                {
                  key: "logout",
                  icon: <LogoutOutlined />,
                  label: t("signOut"),
                  onClick: () => {
                    setMobileMenuOpen(false);
                    signOut({ redirect: true, callbackUrl: "/" });
                  },
                  danger: true,
                },
              ]}
            />
          ) : (
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button type="primary" block style={{ marginTop: "8px" }}>
                Login
              </Button>
            </Link>
          )}
        </div>
      )}
    </Header>
  );
}
