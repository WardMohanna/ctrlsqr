"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Dropdown, Empty, Switch, Tooltip } from "antd";
import {
  AppstoreOutlined,
  CustomerServiceOutlined,
  RightOutlined,
  LeftOutlined,
  MenuUnfoldOutlined,
  FileTextOutlined,
  HomeOutlined,
  ProfileOutlined,
  SettingOutlined,
  ShopOutlined,
  GlobalOutlined,
  HistoryOutlined,
  MoonOutlined,
  SunOutlined,
  CheckOutlined,
  UsergroupAddOutlined,
  TeamOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/hooks/useTheme";
import { useLayoutMode } from "@/hooks/useTheme";
import { AppLocale, useLocale } from "@/hooks/useLocale";
import {
  getRecentActivities,
  type RecentActivity,
} from "@/lib/recentActivities";

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

function ClassicModeIcon() {
  return (
    <span className="classic-layout-icon" aria-hidden="true">
      <span className="classic-layout-icon__bar classic-layout-icon__bar--top" />
      <span className="classic-layout-icon__bar classic-layout-icon__bar--bottom" />
    </span>
  );
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const t = useTranslations("dashboard");
  const tMain = useTranslations("main");
  const { locale, setLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const { setLayoutMode, isDashboardCollapsed, toggleDashboardCollapsed } =
    useLayoutMode();
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(
    [],
  );
  const [isRecentExpanded, setIsRecentExpanded] = useState(false);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const isDarkMode = theme === "dark";

  const sidebarClassName = useMemo(
    () =>
      isDashboardCollapsed
        ? "dashboard-sidebar dashboard-sidebar-collapsed"
        : "dashboard-sidebar",
    [isDashboardCollapsed],
  );

  const dashboardSections: NavSection[] = useMemo(
    () => [
      {
        title: undefined,
        items: [
          {
            label: t("items.welcome"),
            href: "/welcomePage",
            icon: <HomeOutlined />,
          },
          {
            label: t("items.mainMenu"),
            href: "/mainMenu",
            icon: <AppstoreOutlined />,
          },
          {
            label: t("items.tasks"),
            href: "/production/tasks",
            icon: <TeamOutlined />,
          },
          {
            label: t("items.createTasks"),
            href: "/production/tasks/create",
            icon: <ToolOutlined />,
          },
        ],
      },
      {
        title: t("sections.inventoryPages"),
        items: [
          {
            label: t("items.invoices"),
            href: "/invoice/list",
            icon: <FileTextOutlined />,
          },
          {
            label: t("items.inventory"),
            href: "/inventory",
            icon: <ShopOutlined />,
          },
          {
            label: t("items.addItem"),
            href: "/inventory/add",
            icon: <ProfileOutlined />,
          },
          {
            label: t("items.editItem"),
            href: "/inventory/edit",
            icon: <ProfileOutlined />,
          },
          {
            label: t("items.receiveStock"),
            href: "/inventory/receive",
            icon: <ProfileOutlined />,
          },
          {
            label: t("items.stockSnapshot"),
            href: "/inventory/snapshot",
            icon: <ProfileOutlined />,
          },
          {
            label: t("items.stockCount"),
            href: "/inventory/stock-count",
            icon: <ProfileOutlined />,
          },
          {
            label: t("items.deleteItem"),
            href: "/inventory/delete",
            icon: <ProfileOutlined />,
          },
          {
            label: t("items.showItems"),
            href: "/inventory/show",
            icon: <ProfileOutlined />,
          },
        ],
      },
      {
        title: t("sections.manager"),
        items: [
          {
            label: t("items.managerHome"),
            href: "/manager",
            icon: <SettingOutlined />,
          },
          {
            label: t("items.dashboard"),
            href: "/manager/dashboard",
            icon: <SettingOutlined />,
          },
          {
            label: t("items.dailyReport"),
            href: "/manager/daily-report",
            icon: <SettingOutlined />,
          },
          {
            label: t("items.reports"),
            href: "/manager/reports",
            icon: <SettingOutlined />,
          },
          {
            label: t("items.userManagement"),
            href: "/manager/userManagment",
            icon: <UsergroupAddOutlined />,
          },
        ],
      },
      {
        title: t("sections.supplier"),
        items: [
          {
            label: t("items.supplierList"),
            href: "/supplier/list",
            icon: <ShopOutlined />,
          },
          {
            label: t("items.addSupplier"),
            href: "/supplier/add",
            icon: <ShopOutlined />,
          },
          {
            label: t("items.editSupplier"),
            href: "/supplier/edit",
            icon: <ShopOutlined />,
          },
        ],
      },
      {
        title: t("sections.system"),
        items: [
          {
            label: t("items.support"),
            href: "/support",
            icon: <CustomerServiceOutlined />,
          },
          {
            label: t("items.contact"),
            href: "/contact",
            icon: <CustomerServiceOutlined />,
          },
          {
            label: t("items.terms"),
            href: "/terms",
            icon: <FileTextOutlined />,
          },
          {
            label: t("items.privacy"),
            href: "/privacy",
            icon: <FileTextOutlined />,
          },
        ],
      },
    ],
    [t],
  );

  const activityTitleMap = useMemo<Record<string, string>>(
    () => ({
      "/": tMain("home"),
      "/welcomePage": t("items.welcome"),
      "/mainMenu": t("items.mainMenu"),
      "/inventory": t("items.inventory"),
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
      "/manager/settings/account-categories": tMain(
        "recentLabels.accountCategoriesSettings",
      ),
      "/manager/settings/payment-terms": tMain(
        "recentLabels.paymentTermsSettings",
      ),
    }),
    [t, tMain],
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

  const localeItems = [
    { key: "he", label: "עברית" },
    { key: "en", label: "English" },
    { key: "ar", label: "العربية" },
    { key: "ru", label: "Русский" },
  ] as const;

  return (
    <div className="dashboard-shell">
      <aside className={sidebarClassName}>
        <div className="dashboard-corner-controls reveal-item">
          <Tooltip
            title={
              isDashboardCollapsed
                ? t("expandDashboard")
                : t("collapseDashboard")
            }
            placement="left"
          >
            <Button
              icon={isDashboardCollapsed ? <LeftOutlined /> : <RightOutlined />}
              className="dashboard-corner-collapse-btn"
              onClick={toggleDashboardCollapsed}
              aria-label={
                isDashboardCollapsed
                  ? t("expandDashboard")
                  : t("collapseDashboard")
              }
            />
          </Tooltip>
        </div>

        <Link
          href="/welcomePage"
          className="dashboard-brand dashboard-brand-link reveal-item"
          aria-label={tMain("home")}
        >
          <div className="dashboard-brand-mark">CS</div>
          <div className="dashboard-brand-meta">
            <div className="dashboard-brand-title">{t("hubTitle")}</div>
            <div className="dashboard-brand-subtitle">{t("hubSubtitle")}</div>
          </div>
        </Link>

        <div
          className="dashboard-classic-row reveal-item"
          style={{ animationDelay: "0.06s" }}
        >
          <Button
            type="primary"
            className="dashboard-header-switch"
            icon={<ClassicModeIcon />}
            onClick={() => setLayoutMode("classic")}
            aria-label={t("switchToClassic")}
          >
            {!isDashboardCollapsed && t("switchToClassic")}
          </Button>
        </div>

        <div
          className="dashboard-header-actions reveal-item"
          style={{ animationDelay: "0.08s" }}
        >
          <div className="dashboard-top-tools-row">
            <Link
              href="/manager"
              className="dashboard-header-action dashboard-header-action-admin"
            >
              <SettingOutlined /> {t("manager")}
            </Link>

            <Link
              href="/support"
              className="dashboard-support-link dashboard-support-inline"
            >
              {t("items.support")}
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
                className="dashboard-language-icon-btn"
                icon={<GlobalOutlined />}
                aria-label={t("language")}
              >
                {localeItems.find((item) => item.key === locale)?.label}
              </Button>
            </Dropdown>

            <Switch
              checked={isDarkMode}
              onChange={toggleTheme}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
              className="theme-knob-switch"
              aria-label={t("theme")}
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

            {latestActivity ? (
              <Link
                href={latestActivity.path}
                className="dashboard-recent-preview"
              >
                <span className="dashboard-recent-item-title">
                  {resolveActivityTitle(latestActivity.path)}
                </span>
                <span className="dashboard-recent-item-time">
                  {new Date(latestActivity.visitedAt).toLocaleString()}
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
                  >
                    <span className="dashboard-recent-item-title">
                      {resolveActivityTitle(activity.path)}
                    </span>
                    <span className="dashboard-recent-item-time">
                      {new Date(activity.visitedAt).toLocaleString()}
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
                    <Tooltip
                      key={item.href}
                      title={isDashboardCollapsed ? item.label : ""}
                      placement="left"
                    >
                      <Link
                        href={item.href}
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
                    </Tooltip>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </aside>

      <div className="dashboard-main">
        <main
          className="dashboard-content reveal-item"
          style={{ animationDelay: "0.2s" }}
        >
          {children}
        </main>
      </div>

      <Button
        type="primary"
        shape="circle"
        size="large"
        icon={<MenuUnfoldOutlined />}
        className={
          isDashboardCollapsed
            ? "dashboard-floating-open dashboard-floating-open-visible"
            : "dashboard-floating-open"
        }
        onClick={toggleDashboardCollapsed}
        aria-label="Open dashboard"
      />
    </div>
  );
}
