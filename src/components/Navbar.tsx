"use client";

import { useState, useMemo, useCallback, memo, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Layout, Menu, Dropdown, Avatar, Button, Switch } from "antd";
import {
  UserOutlined,
  MenuOutlined,
  LogoutOutlined,
  SettingOutlined,
  ProfileOutlined,
  SunOutlined,
  MoonOutlined,
  AppstoreOutlined,
  GlobalOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { useTheme } from "@/hooks/useTheme";
import { useLayoutMode } from "@/hooks/useTheme";
import { AppLocale, useLocale } from "@/hooks/useLocale";

const { Header } = Layout;

const Navbar = memo(function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const { locale, setLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const { layoutMode, toggleLayoutMode } = useLayoutMode();

  // Only access window on client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDesktop(window.innerWidth >= 768);
      const handleResize = () => setIsDesktop(window.innerWidth >= 768);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  const { data: session } = useSession();
  const pathname = usePathname();
  const t = useTranslations("main");

  const localeItems = [
    { key: "he", label: "עברית" },
    { key: "en", label: "English" },
    { key: "ar", label: "العربية" },
    { key: "ru", label: "Русский" },
  ] as const;

  const navLinks = useMemo(() => {
    const links: { href: string; label: string; key: string }[] = [];

    if (session?.user?.role === "user") {
      links.push({
        href: "/production/tasks",
        label: t("tasks"),
        key: "tasks",
      });
    }

    if (session?.user?.role === "admin") {
      links.push({ href: "/manager", label: t("manager"), key: "manager" });
    }

    return links;
  }, [session?.user?.role]);

  const handleSignOut = useCallback(() => {
    signOut({ redirect: true, callbackUrl: "/" });
  }, []);

  const userMenuItems: MenuProps["items"] = useMemo(
    () => [
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
        onClick: handleSignOut,
        danger: true,
      },
    ],
    [t, handleSignOut],
  );

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
        background: "var(--header-bg)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      {/* Logo/Brand */}
      <Link
        href="/"
        style={{
          color: "var(--primary-color)",
          fontSize: "20px",
          fontWeight: "bold",
          marginLeft: "16px",
        }}
      >
        CtrlSqr
      </Link>

      {/* Desktop Menu */}
      <div
        style={{ display: "flex", alignItems: "center", gap: "24px", flex: 1 }}
      >
        <Button
          type={layoutMode === "dashboard" ? "primary" : "default"}
          icon={<AppstoreOutlined />}
          onClick={toggleLayoutMode}
          style={{
            display: isDesktop ? "inline-flex" : "none",
            color:
              layoutMode === "dashboard"
                ? "var(--header-bg)"
                : "var(--primary-color)",
            borderColor:
              layoutMode === "dashboard"
                ? "transparent"
                : "rgba(255, 219, 83, 0.65)",
            background:
              layoutMode === "dashboard"
                ? "var(--primary-color)"
                : "transparent",
            marginInlineEnd: "8px",
          }}
        >
          {layoutMode === "dashboard"
            ? t("switchToClassic")
            : t("switchToDashboard")}
        </Button>

        <Menu
          className="navbar-menu"
          theme="dark"
          mode="horizontal"
          selectedKeys={[
            navLinks.find((link) => link.href === pathname)?.key || "",
          ]}
          style={{
            flex: 1,
            minWidth: 0,
            background: "transparent",
            border: "none",
            color: "var(--primary-color)",
          }}
          items={navLinks.map((link) => ({
            key: link.key,
            label: <Link href={link.href}>{link.label}</Link>,
          }))}
        />

        <Switch
          checked={theme === "dark"}
          onChange={toggleTheme}
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
          className="theme-knob-switch"
          style={{ display: isDesktop ? "inline-flex" : "none" }}
          aria-label={theme === "dark" ? "Dark Mode" : "Light Mode"}
        />

        <Dropdown
          trigger={["click"]}
          menu={{
            items: localeItems.map((item) => ({
              key: item.key,
              label: (
                <span className="locale-menu-label">
                  {item.label}
                  {locale === item.key && <CheckOutlined />}
                </span>
              ),
            })),
            onClick: ({ key }) => setLocale(key as AppLocale),
          }}
          placement="bottomLeft"
        >
          <Button
            className="language-icon-btn"
            icon={<GlobalOutlined />}
            style={{ display: isDesktop ? "inline-flex" : "none" }}
            aria-label={t("settings")}
          >
            {localeItems.find((item) => item.key === locale)?.label}
          </Button>
        </Dropdown>

        <div
          className="desktop-user"
          style={{ display: isDesktop ? "block" : "none" }}
        >
          {session ? (
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomLeft"
              trigger={["click"]}
            >
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
        <Switch
          checked={theme === "dark"}
          onChange={toggleTheme}
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
          className="theme-knob-switch"
          style={{ display: isDesktop ? "none" : "inline-flex" }}
          aria-label={theme === "dark" ? "Dark Mode" : "Light Mode"}
        />

        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            fontSize: "20px",
            color: "var(--primary-color)",
            display: isDesktop ? "none" : "inline-flex",
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
            className="navbar-menu"
            theme="dark"
            mode="vertical"
            selectedKeys={[
              navLinks.find((link) => link.href === pathname)?.key || "",
            ]}
            style={{ background: "transparent", border: "none" }}
            items={navLinks.map((link) => ({
              key: link.key,
              label: (
                <Link href={link.href} onClick={() => setMobileMenuOpen(false)}>
                  {link.label}
                </Link>
              ),
            }))}
          />

          <Button
            icon={<AppstoreOutlined />}
            onClick={() => {
              toggleLayoutMode();
              setMobileMenuOpen(false);
            }}
            block
            style={{
              marginTop: 8,
              color:
                layoutMode === "dashboard"
                  ? "var(--header-bg)"
                  : "var(--primary-color)",
              borderColor:
                layoutMode === "dashboard"
                  ? "transparent"
                  : "rgba(255, 219, 83, 0.65)",
              background:
                layoutMode === "dashboard"
                  ? "var(--primary-color)"
                  : "transparent",
            }}
          >
            {layoutMode === "dashboard"
              ? t("switchToClassic")
              : t("switchToDashboard")}
          </Button>

          <Dropdown
            trigger={["click"]}
            menu={{
              items: localeItems.map((item) => ({
                key: item.key,
                label: (
                  <span className="locale-menu-label">
                    {item.label}
                    {locale === item.key && <CheckOutlined />}
                  </span>
                ),
              })),
              onClick: ({ key }) => setLocale(key as AppLocale),
            }}
            placement="bottomLeft"
          >
            <Button
              className="language-icon-btn"
              icon={<GlobalOutlined />}
              block
              style={{ marginTop: 8 }}
            >
              {localeItems.find((item) => item.key === locale)?.label}
            </Button>
          </Dropdown>

          {session ? (
            <Menu
              theme="dark"
              mode="vertical"
              style={{
                background: "transparent",
                border: "none",
                marginTop: "8px",
              }}
              items={[
                {
                  key: "profile",
                  icon: <ProfileOutlined />,
                  label: (
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t("profile")}
                    </Link>
                  ),
                },
                {
                  key: "settings",
                  icon: <SettingOutlined />,
                  label: (
                    <Link
                      href="/settings"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t("settings")}
                    </Link>
                  ),
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
});

export default Navbar;
