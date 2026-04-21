"use client";

import {
  ReactNode,
  useState,
  useMemo,
  useCallback,
  memo,
  useEffect,
} from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Layout,
  Menu,
  Dropdown,
  Avatar,
  Button,
  Switch,
  Drawer,
  Empty,
} from "antd";
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
  CustomerServiceOutlined,
  FileTextOutlined,
  HomeOutlined,
  ShopOutlined,
  TeamOutlined,
  ToolOutlined,
  UsergroupAddOutlined,
  HistoryOutlined,
  BookOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { getThemeToggleOrigin, useTheme } from "@/hooks/useTheme";
import { useLayoutMode } from "@/hooks/useTheme";
import { AppLocale, useLocale } from "@/hooks/useLocale";
import {
  getRecentActivities,
  type RecentActivity,
} from "@/lib/recentActivities";
import { formatDateTime24 } from "@/lib/dateTime";
import { useTenantInfo } from "@/hooks/useTenantInfo";

const { Header } = Layout;

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

const Navbar = memo(function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [mobileDrawerSize, setMobileDrawerSize] = useState(320);
  const [isScrolled, setIsScrolled] = useState(false);
  const { locale, setLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const { layoutMode, toggleLayoutMode } = useLayoutMode();
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(
    [],
  );
  const [isRecentExpanded, setIsRecentExpanded] = useState(false);

  // Only access window on client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResize = () => {
        setIsDesktop(window.innerWidth >= 768);
        setMobileDrawerSize(Math.round(window.innerWidth * 0.75));
      };
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { data: session } = useSession();
  const pathname = usePathname();
  const tMain = useTranslations("main");
  const tDashboard = useTranslations("dashboard");
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const tenantInfo = useTenantInfo();

  const localeItems = [
    { key: "he", label: "עברית" },
    { key: "en", label: "English" },
    { key: "ar", label: "العربية" },
    { key: "ru", label: "Русский" },
  ] as const;

  const navLinks = useMemo(() => {
    const links: { href: string; label: string; key: string }[] = [];

    links.push({
      href: "/about-us",
      label: tDashboard("items.aboutUs"),
      key: "aboutUs",
    });

    if (session?.user?.role === "user") {
      links.push({
        href: "/production/tasks",
        label: tMain("tasks"),
        key: "tasks",
      });
    }

    if (session?.user?.role === "admin") {
      links.push({ href: "/manager", label: tMain("manager"), key: "manager" });
    }

    if ((session?.user as any)?.role === "super_admin") {
      links.push({ href: "/super-admin", label: tMain("tenants"), key: "tenants" });
    }

    return links;
  }, [session?.user?.role, tDashboard, tMain]);

  const dashboardSections: NavSection[] = useMemo(
    () => [
      {
        title: undefined,
        items: [
          {
            label: tDashboard("items.welcome"),
            href: "/welcomePage",
            icon: <HomeOutlined />,
          },
          {
            label: tDashboard("items.mainMenu"),
            href: "/mainMenu",
            icon: <AppstoreOutlined />,
          },
          {
            label: tDashboard("items.tasks"),
            href: "/production/tasks",
            icon: <TeamOutlined />,
          },
          {
            label: tDashboard("items.createTasks"),
            href: "/production/tasks/create",
            icon: <ToolOutlined />,
          },
        ],
      },
      {
        title: tDashboard("sections.inventoryPages"),
        items: [
          {
            label: tDashboard("items.invoices"),
            href: "/invoice/list",
            icon: <FileTextOutlined />,
          },
          {
            label: tDashboard("items.inventory"),
            href: "/inventory",
            icon: <ShopOutlined />,
          },
          {
            label: tDashboard("items.addItem"),
            href: "/inventory/add",
            icon: <ProfileOutlined />,
          },
          {
            label: tDashboard("items.editItem"),
            href: "/inventory/edit",
            icon: <ProfileOutlined />,
          },
          {
            label: tDashboard("items.receiveStock"),
            href: "/inventory/receive",
            icon: <ProfileOutlined />,
          },
          {
            label: tDashboard("items.stockSnapshot"),
            href: "/inventory/snapshot",
            icon: <ProfileOutlined />,
          },
          {
            label: tDashboard("items.stockCount"),
            href: "/inventory/stock-count",
            icon: <ProfileOutlined />,
          },
          {
            label: tDashboard("items.deleteItem"),
            href: "/inventory/delete",
            icon: <ProfileOutlined />,
          },
          {
            label: tDashboard("items.showItems"),
            href: "/inventory/show",
            icon: <ProfileOutlined />,
          },
        ],
      },
      {
        title: tDashboard("sections.manager"),
        items: [
          {
            label: tDashboard("items.managerHome"),
            href: "/manager",
            icon: <SettingOutlined />,
          },
          {
            label: tDashboard("items.dashboard"),
            href: "/manager/dashboard",
            icon: <SettingOutlined />,
          },
          {
            label: tDashboard("items.dailyReport"),
            href: "/manager/daily-report",
            icon: <SettingOutlined />,
          },
          {
            label: tDashboard("items.reports"),
            href: "/manager/reports",
            icon: <SettingOutlined />,
          },
          {
            label: tDashboard("items.userManagement"),
            href: "/manager/userManagment",
            icon: <UsergroupAddOutlined />,
          },
        ],
      },
      {
        title: tDashboard("sections.supplier"),
        items: [
          {
            label: tDashboard("items.supplierList"),
            href: "/supplier/list",
            icon: <ShopOutlined />,
          },
          {
            label: tDashboard("items.addSupplier"),
            href: "/supplier/add",
            icon: <ShopOutlined />,
          },
          {
            label: tDashboard("items.editSupplier"),
            href: "/supplier/edit",
            icon: <ShopOutlined />,
          },
        ],
      },
      {
        title: tDashboard("sections.system"),
        items: [
          {
            label: tDashboard("items.support"),
            href: "/support",
            icon: <CustomerServiceOutlined />,
          },
          {
            label: tDashboard("items.contact"),
            href: "/contact",
            icon: <CustomerServiceOutlined />,
          },
          {
            label: tDashboard("items.terms"),
            href: "/terms",
            icon: <FileTextOutlined />,
          },
          {
            label: tDashboard("items.privacy"),
            href: "/privacy",
            icon: <FileTextOutlined />,
          },
        ],
      },
    ],
    [tDashboard],
  );

  const activityTitleMap = useMemo<Record<string, string>>(
    () => ({
      "/": tMain("home"),
      "/welcomePage": tDashboard("items.welcome"),
      "/mainMenu": tDashboard("items.mainMenu"),
      "/inventory": tDashboard("items.inventory"),
      "/about-us": tDashboard("items.aboutUs"),
      "/login": tMain("recentLabels.login"),
      "/support": tMain("recentLabels.support"),
      "/admin": tMain("recentLabels.admin"),
      "/manager": tMain("recentLabels.admin"),
      "/production/tasks/create": tMain("createProductionTask"),
      "/production/tasks": tMain("tasks"),
      "/inventory/sell": tMain("sellItems"),
      "/inventory/add": tMain("recentLabels.addInventoryItem"),
      "/inventory/receive": tMain("recentLabels.receiveInventory"),
      "/inventory/show": tMain("recentLabels.showInventoryList"),
      "/inventory/stock-count": tMain("recentLabels.stockCount"),
      "/inventory/snapshot": tMain("recentLabels.snapshot"),
      "/inventory/edit": tMain("recentLabels.editInventoryItem"),
      "/inventory/delete": tMain("recentLabels.deleteInventoryItem"),
      "/supplier/add": tMain("recentLabels.addSupplier"),
      "/supplier/list": tMain("recentLabels.showSuppliers"),
      "/supplier/edit": tMain("recentLabels.editSupplier"),
      "/invoice/list": tMain("recentLabels.showInvoiceList"),
      "/accounts/add": tMain("recentLabels.addAccount"),
      "/accounts/list": tMain("recentLabels.showAccounts"),
      "/b2b-sell": tMain("recentLabels.b2bSell"),
      "/sales/dashboard": tMain("recentLabels.salesDashboard"),
      "/manager/dashboard": tMain("recentLabels.managerDashboard"),
      "/manager/reports": tMain("recentLabels.managerReports"),
      "/manager/review-reports": tMain("recentLabels.reviewEmployeeReports"),
      "/manager/daily-report": tMain("recentLabels.dailyProductionReport"),
      "/manager/userManagment": tMain("recentLabels.userManagement"),
      "/manager/activity-archive": tMain("recentLabels.activityArchive"),
      "/manager/settings/account-categories": tMain(
        "recentLabels.accountCategoriesSettings",
      ),
      "/manager/settings/payment-terms": tMain(
        "recentLabels.paymentTermsSettings",
      ),
    }),
    [tDashboard, tMain],
  );

  useEffect(() => {
    if (!userId) {
      setRecentActivities([]);
      return;
    }

    setRecentActivities(getRecentActivities(userId, 10));
  }, [userId, pathname]);

  const normalizeRecentPath = (rawPath: string) => {
    const [withoutHash] = rawPath.split("#");
    const [withoutQuery] = withoutHash.split("?");
    if (!withoutQuery) return rawPath;
    if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
      return withoutQuery.slice(0, -1);
    }
    return withoutQuery;
  };

  const resolveActivityTitle = (path: string) => {
    const normalizedPath = normalizeRecentPath(path);
    return (
      activityTitleMap[normalizedPath] ??
      activityTitleMap[path] ??
      normalizedPath
    );
  };

  const latestActivity = recentActivities[0];

  const handleSignOut = useCallback(() => {
    signOut({ redirect: true, callbackUrl: "/" });
  }, []);

  const userMenuItems: MenuProps["items"] = useMemo(
    () => [
      {
        key: "profile",
        icon: <ProfileOutlined />,
        label: <Link href="/profile">{tMain("profile")}</Link>,
      },
      {
        key: "settings",
        icon: <SettingOutlined />,
        label: <Link href="/settings">{tMain("settings")}</Link>,
      },
      {
        type: "divider",
      },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: tMain("signOut"),
        onClick: handleSignOut,
        danger: true,
      },
    ],
    [tMain, handleSignOut],
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
        justifyContent: isDesktop ? "space-between" : "flex-start",
        gap: isDesktop ? 0 : "12px",
        padding: "0 24px",
        background:
          !isDesktop && !isScrolled
            ? "transparent"
            : theme === "dark" && layoutMode === "classic"
              ? "#000000"
              : "var(--header-bg)",
        boxShadow:
          !isDesktop && !isScrolled ? "none" : "0 2px 8px rgba(0,0,0,0.15)",
        transition: "background 0.35s ease, box-shadow 0.35s ease",
      }}
    >
      {/* Mobile Header Controls */}
      <div
        style={{
          display: isDesktop ? "none" : "inline-flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            fontSize: "20px",
            color: "var(--primary-color)",
            display: "inline-flex",
          }}
          className="mobile-menu-button"
        />

        <Switch
          checked={theme === "dark"}
          onChange={(_, event) =>
            toggleTheme(getThemeToggleOrigin(event as unknown as Event))
          }
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
          className="theme-knob-switch"
          style={{ display: "inline-flex" }}
          aria-label={theme === "dark" ? "Dark Mode" : "Light Mode"}
        />
      </div>

      {/* Logo/Brand */}
      <Link
        href="/"
        style={{
          color: "var(--primary-color)",
          fontSize: "20px",
          fontWeight: "bold",
          marginLeft: isDesktop ? "16px" : 0,
          position: isDesktop ? "static" : "absolute",
          left: isDesktop ? "auto" : "50%",
          transform: isDesktop ? "none" : "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {tenantInfo?.logo ? (
          <img
            src={tenantInfo.logo}
            alt={tenantInfo.name}
            style={{ height: 32, objectFit: "contain", borderRadius: 4 }}
          />
        ) : (
          tenantInfo?.name ?? "CtrlSqr"
        )}
      </Link>

      {/* Desktop Menu */}
      <div
        style={{
          display: isDesktop ? "flex" : "none",
          alignItems: "center",
          gap: "24px",
          flex: 1,
        }}
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
            ? tMain("switchToClassic")
            : tMain("switchToDashboard")}
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
          onChange={(_, event) =>
            toggleTheme(getThemeToggleOrigin(event as unknown as Event))
          }
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
            aria-label={tMain("settings")}
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
      </div>

      <Drawer
        placement="right"
        size={mobileDrawerSize}
        rootClassName="dashboard-mobile-drawer-root"
        open={!isDesktop && mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        closable={false}
        destroyOnClose
        styles={{
          header: { display: "none" },
          body: {
            padding: 0,
            background: "transparent",
          },
        }}
      >
        <aside
          className="dashboard-sidebar mobile-dashboard-drawer"
          style={{
            width: "100%",
            height: "100%",
            borderLeft: "none",
            borderRight: "none",
            borderRadius: 0,
            boxShadow: "none",
            maxHeight: "100%",
            overflow: "auto",
            padding: "18px 14px",
          }}
        >
          <Link
            href="/welcomePage"
            className="dashboard-brand dashboard-brand-link reveal-item"
            aria-label={tMain("home")}
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="dashboard-brand-mark">CS</div>
            <div className="dashboard-brand-meta">
              <div className="dashboard-brand-title">
                {tDashboard("hubTitle")}
              </div>
              <div className="dashboard-brand-subtitle">
                {tDashboard("hubSubtitle")}
              </div>
            </div>
          </Link>

          <div
            className="dashboard-header-actions reveal-item"
            style={{ animationDelay: "0.08s" }}
          >
            <div className="dashboard-top-tools-row">
              <Link
                href="/manager"
                className="dashboard-header-action dashboard-header-action-admin mobile-drawer-icon-action"
                onClick={() => setMobileMenuOpen(false)}
                aria-label={tDashboard("manager")}
                title={tDashboard("manager")}
              >
                <SettingOutlined />
              </Link>

              <Link
                href="/support"
                className="dashboard-support-link dashboard-support-inline mobile-drawer-icon-action"
                onClick={() => setMobileMenuOpen(false)}
                aria-label={tDashboard("items.support")}
                title={tDashboard("items.support")}
              >
                <CustomerServiceOutlined />
              </Link>

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
                  className="dashboard-language-icon-btn mobile-drawer-icon-action"
                  icon={<GlobalOutlined />}
                  aria-label={tDashboard("language")}
                  title={localeItems.find((item) => item.key === locale)?.label}
                ></Button>
              </Dropdown>

              <Switch
                checked={theme === "dark"}
                onChange={(_, event) =>
                  toggleTheme(getThemeToggleOrigin(event as unknown as Event))
                }
                checkedChildren={<MoonOutlined />}
                unCheckedChildren={<SunOutlined />}
                className="theme-knob-switch"
                aria-label={tDashboard("theme")}
              />
            </div>
          </div>

          <section
            className="dashboard-recent-shortcuts reveal-item"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="dashboard-recent-collapsible-row">
              <button
                type="button"
                className="dashboard-recent-toggle-btn"
                aria-label={tMain("recentActivities")}
                aria-expanded={isRecentExpanded}
                onClick={() => setIsRecentExpanded((prev) => !prev)}
              >
                <HistoryOutlined />
              </button>

              {isRecentExpanded && (
                <Link
                  href="/manager/activity-archive"
                  className="dashboard-recent-archive-btn"
                  aria-label={tDashboard("items.activityArchive")}
                  title={tDashboard("items.activityArchive")}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <BookOutlined />
                </Link>
              )}

              {latestActivity ? (
                <Link
                  href={latestActivity.path}
                  className="dashboard-recent-preview"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="dashboard-recent-item-title">
                    {resolveActivityTitle(latestActivity.path)}
                  </span>
                  <span className="dashboard-recent-item-time">
                    {formatDateTime24(latestActivity.visitedAt)}
                  </span>
                </Link>
              ) : (
                <div className="dashboard-recent-preview">
                  <span className="dashboard-recent-item-title">
                    {tMain("noRecentActivities")}
                  </span>
                </div>
              )}
            </div>

            {isRecentExpanded &&
              (recentActivities.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={tMain("noRecentActivities")}
                />
              ) : (
                <div
                  className="dashboard-recent-list"
                  aria-label={tMain("recentActivities")}
                >
                  {recentActivities.map((activity) => (
                    <Link
                      key={`${activity.path}-${activity.visitedAt}`}
                      href={activity.path}
                      className="dashboard-recent-item"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="dashboard-recent-item-title">
                        {resolveActivityTitle(activity.path)}
                      </span>
                      <span className="dashboard-recent-item-time">
                        {formatDateTime24(activity.visitedAt)}
                      </span>
                    </Link>
                  ))}
                </div>
              ))}
          </section>

          <div className="dashboard-sidebar-scroll">
            {dashboardSections.map((section, sectionIndex) => (
              <section
                key={`${section.title ?? "untitled"}-${sectionIndex}`}
                className="dashboard-nav-section reveal-item"
                style={{ animationDelay: `${0.08 * (sectionIndex + 1)}s` }}
              >
                {section.title && (
                  <h3 className="dashboard-nav-title">{section.title}</h3>
                )}

                <div className="dashboard-nav-items">
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/" && pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={
                          isActive
                            ? "dashboard-nav-link dashboard-nav-link-active"
                            : "dashboard-nav-link"
                        }
                      >
                        <span className="dashboard-nav-icon">{item.icon}</span>
                        <span className="dashboard-nav-label">
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </aside>
      </Drawer>
    </Header>
  );
});

export default Navbar;
