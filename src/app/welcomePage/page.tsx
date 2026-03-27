"use client";

import { useRouter } from "next/navigation";
import {
  useMemo,
  useEffect,
  useState,
  useRef,
  useCallback,
  type MouseEvent,
  type WheelEvent,
} from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Card, Row, Col, Typography, Breadcrumb, Empty } from "antd";
import { Grid } from "antd";
import { gsap } from "gsap";
import { useTheme } from "@/hooks/useTheme";
import FloatingLines from "@/components/FloatingLines";
import ShapeBlur from "@/components/ShapeBlur.jsx";
import {
  ToolOutlined,
  TeamOutlined,
  ShopOutlined,
  HomeOutlined,
  HistoryOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";

import {
  getRecentActivities,
  type RecentActivity,
} from "@/lib/recentActivities";

const { Title, Text } = Typography;

export default function Main() {
  const router = useRouter();
  const t = useTranslations("main");
  const { theme } = useTheme();
  const { data: session } = useSession();
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(
    [],
  );
  const [isRecentOpen, setIsRecentOpen] = useState(false);
  const pageRootRef = useRef<HTMLDivElement | null>(null);
  const userRole = (session?.user as any)?.role || "user";
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  // Auto-redirect employees to tasks page
  useEffect(() => {
    if (userRole === "employee") {
      router.push("/production/tasks");
    }
  }, [userRole, router]);

  // Define menu items based on role
  const allMenuItems = [
    {
      title: t("createProductionTask"),
      description: t("createProductionTaskDesc"),
      icon: <ToolOutlined style={{ fontSize: "36px" }} />,
      onClick: () => router.push("/production/tasks/create"),
      roles: ["admin", "user"], // Not for employees
    },
    {
      title: t("tasks"),
      description: t("tasksDesc"),
      icon: <TeamOutlined style={{ fontSize: "36px" }} />,
      onClick: () => router.push("/production/tasks"),
      roles: ["admin", "user", "employee"], // All roles
    },
    {
      title: t("inventoryModel"),
      description: t("inventoryModelDesc"),
      icon: <ShopOutlined style={{ fontSize: "36px" }} />,
      onClick: () => router.push("/mainMenu"),
      roles: ["admin", "user"], // Not for employees
    },
    {
      title: t("sellItems"),
      description: t("sellItemsDesc"),
      icon: <ShoppingOutlined style={{ fontSize: "36px" }} />,
      color: "#059669",
      bgColor: "rgba(5, 150, 105, 0.1)",
      onClick: () => router.push("/inventory/sell"),
      roles: ["admin", "user"], // Not for employees
    },
  ];

  // Filter menu items by role
  const menuItems = allMenuItems.filter((item) =>
    item.roles.includes(userRole),
  );

  const activityTitleMap = useMemo(
    () => ({
      "/login": t("recentLabels.login"),
      "/support": t("recentLabels.support"),
      "/admin": t("recentLabels.admin"),
      "/manager": t("recentLabels.admin"),
      "/production/tasks/create": t("createProductionTask"),
      "/production/tasks": t("tasks"),
      "/inventory/sell": t("sellItems"),
      "/inventory/add": t("recentLabels.addInventoryItem"),
      "/inventory/receive": t("recentLabels.receiveInventory"),
      "/inventory/show": t("recentLabels.showInventoryList"),
      "/inventory/stock-count": t("recentLabels.stockCount"),
      "/inventory/snapshot": t("recentLabels.snapshot"),
      "/inventory/edit": t("recentLabels.editInventoryItem"),
      "/inventory/delete": t("recentLabels.deleteInventoryItem"),
      "/supplier/add": t("recentLabels.addSupplier"),
      "/supplier/list": t("recentLabels.showSuppliers"),
      "/supplier/edit": t("recentLabels.editSupplier"),
      "/invoice/list": t("recentLabels.showInvoiceList"),
      "/accounts/add": t("recentLabels.addAccount"),
      "/accounts/list": t("recentLabels.showAccounts"),
      "/b2b-sell": t("recentLabels.b2bSell"),
      "/sales/dashboard": t("recentLabels.salesDashboard"),
      "/contact": t("dashboard.items.contact"),
      "/terms": t("dashboard.items.terms"),
      "/privacy": t("dashboard.items.privacy"),
      "/profile": t("profile"),
      "/manager": t("manager"),
      "/manager/dashboard": t("recentLabels.managerDashboard"),
      "/manager/reports": t("recentLabels.managerReports"),
      "/manager/review-reports": t("recentLabels.reviewEmployeeReports"),
      "/manager/daily-report": t("recentLabels.dailyProductionReport"),
      "/manager/userManagment": t("recentLabels.userManagement"),
      "/manager/activity-archive": t("recentLabels.activityArchive"),
      "/manager/settings/account-categories": t(
        "recentLabels.accountCategoriesSettings",
      ),
      "/manager/settings/payment-terms": t("recentLabels.paymentTermsSettings"),
    }),
    [t],
  );

  useEffect(() => {
    if (!userId) {
      setRecentActivities([]);
      return;
    }

    setRecentActivities(getRecentActivities(userId, 10));
  }, [userId]);

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
  const firstRecentActivity = recentActivities[0];

  const floatingLineGradient = useMemo(
    () =>
      theme === "dark"
        ? ["#FFDB53", "#5E78DB", "#FFDB53"]
        : ["#E945F5", "#2F4BC0", "#E945F5"],
    [theme],
  );

  const enabledWaveLayers = useMemo(() => ["top", "middle", "bottom"], []);

  const floatingLinesNode = useMemo(
    () => (
      <FloatingLines
        linesGradient={floatingLineGradient}
        enabledWaves={enabledWaveLayers}
        lineCount={11}
        lineDistance={5}
        animationSpeed={1}
        interactive
        listenGlobalPointer
        bendRadius={5}
        bendStrength={-0.5}
        mouseDamping={0.05}
        parallax
        parallaxStrength={0.2}
        mixBlendMode={theme === "dark" ? "screen" : "normal"}
      />
    ),
    [enabledWaveLayers, floatingLineGradient, theme],
  );

  const hoverStrokeColor = theme === "dark" ? "#ffdb53" : "#132c4b";

  const handleWelcomeCardMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -5.1;
    const rotateY = ((x - centerX) / centerX) * 5.1;

    gsap.to(card, {
      rotateX,
      rotateY,
      y: -2.4,
      duration: 0.22,
      ease: "none",
      transformPerspective: 1000,
      overwrite: "auto",
    });
  };

  const handleWelcomeCardMouseEnter = (e: MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.boxShadow = "0 8px 22px rgba(0, 0, 0, 0.18)";
  };

  const handleWelcomeCardMouseLeave = (e: MouseEvent<HTMLDivElement>) => {
    gsap.to(e.currentTarget, {
      rotateX: 0,
      rotateY: 0,
      y: 0,
      duration: 0.18,
      ease: "none",
      overwrite: "auto",
    });
    e.currentTarget.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.08)";
  };

  const handleWheelChain = useCallback((e: WheelEvent<HTMLDivElement>) => {
    const root = pageRootRef.current;
    if (!root || e.deltaY === 0) return;

    let node = e.target as HTMLElement | null;
    while (node && node !== root) {
      const style = window.getComputedStyle(node);
      const canScrollY =
        (style.overflowY === "auto" || style.overflowY === "scroll") &&
        node.scrollHeight > node.clientHeight;

      if (canScrollY) {
        const atTop = node.scrollTop <= 0;
        const atBottom =
          node.scrollTop + node.clientHeight >= node.scrollHeight - 1;

        if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
          e.preventDefault();
          window.scrollBy({ top: e.deltaY, left: 0, behavior: "auto" });
        }
        return;
      }

      node = node.parentElement;
    }
  }, []);

  return (
    <div
      ref={pageRootRef}
      onWheelCapture={handleWheelChain}
      style={{
        minHeight: "100dvh",
        background: "var(--header-bg)",
        padding: 0,
        position: "relative",
        overflowX: "hidden",
        overflowY: "visible",
        overscrollBehaviorY: "auto",
        touchAction: "pan-y",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          opacity: 1,
        }}
      >
        {floatingLinesNode}
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "24px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Breadcrumb */}
        <Breadcrumb
          style={{
            marginBottom: "24px",
            padding: "8px 16px",
            background:
              theme === "light"
                ? "var(--primary-color)"
                : "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(10px)",
            borderRadius: "8px",
            border:
              theme === "light"
                ? "1px solid var(--primary-hover-color)"
                : "1px solid rgba(255, 255, 255, 0.2)",
          }}
          items={[
            {
              title: (
                <>
                  <HomeOutlined
                    style={{
                      marginInlineEnd: 4,
                      color:
                        theme === "light"
                          ? "var(--header-bg)"
                          : "var(--primary-color)",
                    }}
                  />
                  <span
                    style={{
                      color:
                        theme === "light"
                          ? "var(--header-bg)"
                          : "var(--primary-color)",
                    }}
                  >
                    {t("home")}
                  </span>
                </>
              ),
            },
          ]}
        />

        <Title
          level={2}
          style={{
            margin: isMobile ? "74px 0 6px" : "96px 0 8px",
            textAlign: "center",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "clamp(3.2rem, 7vw, 5rem)",
            lineHeight: 1,
            letterSpacing: "0.01em",
          }}
        >
          ברוכים הבאים
        </Title>

        <div
          style={{
            minHeight: isMobile
              ? "calc(100dvh - 140px)"
              : "calc(100dvh - 170px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            gap: isMobile ? "16px" : "24px",
            paddingTop: isMobile ? "12px" : "72px",
            paddingBottom: isMobile ? "140px" : "260px",
          }}
        >
          {/* Cards Grid */}
          <Row gutter={[24, 24]} style={{ width: "100%" }} justify="center">
            {menuItems.map((item, index) => (
              <Col
                key={index}
                xs={menuItems.length === 1 ? 24 : 12}
                sm={12}
                lg={8}
                style={{ display: "flex", justifyContent: "center" }}
              >
                <Card
                  className="welcome-main-card"
                  hoverable
                  onClick={item.onClick}
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    width: "100%",
                    maxWidth: "300px",
                    marginInline: "auto",
                    borderRadius: "8px",
                    border: "none",
                    background:
                      theme === "dark"
                        ? "rgba(12, 20, 34, 0.9)"
                        : "rgba(255, 255, 255, 0.9)",
                    backdropFilter: "blur(10px)",
                    height: "220px",
                    cursor: "pointer",
                    transition: "box-shadow 0.2s linear",
                    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.08)",
                    willChange: "transform, box-shadow",
                  }}
                  styles={{
                    body: {
                      position: "relative",
                      height: "100%",
                      padding: 0,
                    },
                  }}
                  onMouseMove={handleWelcomeCardMouseMove}
                  onMouseEnter={handleWelcomeCardMouseEnter}
                  onMouseLeave={handleWelcomeCardMouseLeave}
                >
                  <div
                    className="welcome-card-shape-layer"
                    style={{
                      position: "absolute",
                      inset: 0,
                      pointerEvents: "none",
                    }}
                  >
                    <ShapeBlur
                      className="welcome-card-shape-blur"
                      variation={0}
                      shapeSize={2.1}
                      roundness={0.15}
                      borderSize={0.03}
                      circleSize={0.18}
                      circleEdge={1.96}
                      color={hoverStrokeColor}
                    />
                  </div>
                  <div
                    style={{
                      position: "relative",
                      zIndex: 1,
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                      padding: "28px",
                    }}
                  >
                    <div
                      style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "8px",
                        background: "var(--header-bg)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--primary-color)",
                        marginBottom: "20px",
                        boxShadow: "0 4px 15px rgba(255, 219, 83, 0.25)",
                      }}
                    >
                      {item.icon}
                    </div>
                    <Title
                      level={4}
                      style={{
                        position: "relative",
                        zIndex: 1,
                        margin: 0,
                        marginBottom: "12px",
                        fontWeight: 700,
                        color:
                          theme === "dark" ? "#ffffff" : "var(--header-bg)",
                      }}
                    >
                      {item.title}
                    </Title>
                    <Text
                      style={{
                        position: "relative",
                        zIndex: 1,
                        color: "var(--text-color)",
                        fontSize: "14px",
                        lineHeight: 1.6,
                        fontWeight: 500,
                      }}
                    >
                      {item.description}
                    </Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          <div
            style={{
              alignSelf: "flex-start",
              width: "min(100%, 300px)",
              minHeight: "68px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "10px",
              marginTop: "30px",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={() => setIsRecentOpen((prev) => !prev)}
                className="welcome-recent-toggle-btn"
                style={{
                  width: "58px",
                  height: "58px",
                  borderRadius: "50%",
                  border: "none",
                  background:
                    theme === "dark"
                      ? "rgba(7, 16, 28, 0.92)"
                      : "rgba(255, 255, 255, 0.92)",
                  color: theme === "dark" ? "#ffdb53" : "var(--header-bg)",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  boxShadow: "0 8px 18px rgba(0, 0, 0, 0.2)",
                  backdropFilter: "blur(8px)",
                  flexShrink: 0,
                }}
                aria-label={t("recentActivities")}
                aria-expanded={isRecentOpen}
              >
                <HistoryOutlined style={{ fontSize: "22px" }} />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (firstRecentActivity) {
                    router.push(firstRecentActivity.path);
                  }
                }}
                disabled={!firstRecentActivity}
                className="welcome-recent-preview-btn"
                style={{
                  width: "calc(100% - 68px)",
                  minHeight: "58px",
                  borderRadius: "12px",
                  border: "none",
                  background:
                    theme === "dark"
                      ? "rgba(9, 20, 36, 0.9)"
                      : "rgba(255, 255, 255, 0.92)",
                  color: theme === "dark" ? "#ffffff" : "var(--header-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  textAlign: "start",
                  padding: "10px 12px",
                  boxShadow: "0 8px 18px rgba(0, 0, 0, 0.16)",
                  backdropFilter: "blur(8px)",
                  cursor: firstRecentActivity ? "pointer" : "default",
                  opacity: firstRecentActivity ? 1 : 0.75,
                }}
                aria-label={
                  firstRecentActivity
                    ? resolveActivityTitle(firstRecentActivity.path)
                    : t("noRecentActivities")
                }
              >
                <span
                  style={{
                    display: "block",
                    fontWeight: 600,
                    fontSize: "13px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "100%",
                  }}
                >
                  {firstRecentActivity
                    ? resolveActivityTitle(firstRecentActivity.path)
                    : t("noRecentActivities")}
                </span>
              </button>
            </div>

            <div
              style={{
                position: "absolute",
                top: "68px",
                insetInlineStart: "68px",
                width: "calc(100% - 68px)",
                zIndex: 2,
                opacity: isRecentOpen ? 1 : 0,
                pointerEvents: isRecentOpen ? "auto" : "none",
                transition: "opacity 0.18s linear",
              }}
            >
              <Card
                className={`recent-activities-section recent-activities-section-${theme}`}
                style={{
                  borderRadius: "8px",
                  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.08)",
                  border: "none",
                }}
                styles={{ body: { padding: "12px" } }}
              >
                {recentActivities.length === 0 ? (
                  <Empty
                    description={
                      <span
                        style={{
                          color:
                            theme === "light" ? "var(--text-color)" : "#ffffff",
                        }}
                      >
                        {t("noRecentActivities")}
                      </span>
                    }
                  />
                ) : (
                  <div>
                    <div
                      className={`recent-activities-scroll recent-activities-scroll-${theme}`}
                      style={{
                        maxHeight: "240px",
                        overflowY: "auto",
                        paddingInline: "2px",
                        overscrollBehaviorY: "auto",
                      }}
                    >
                      {recentActivities.map((activity) => (
                        <Card
                          className={`recent-activity-card recent-activity-card-${theme}`}
                          key={`${activity.path}-${activity.visitedAt}`}
                          hoverable
                          onClick={() => router.push(activity.path)}
                          style={{
                            borderRadius: "8px",
                            cursor: "pointer",
                            marginBottom: "8px",
                          }}
                          styles={{ body: { padding: "10px 12px" } }}
                        >
                          <div
                            style={{
                              color:
                                theme === "light"
                                  ? "var(--text-color)"
                                  : "#ffffff",
                              fontWeight: 600,
                              marginBottom: "2px",
                              fontSize: "13px",
                            }}
                          >
                            {resolveActivityTitle(activity.path)}
                          </div>
                          <Text
                            style={{
                              color:
                                theme === "light"
                                  ? "var(--text-color)"
                                  : "#ffffff",
                              fontSize: "11px",
                            }}
                          >
                            {new Date(activity.visitedAt).toLocaleString()}
                          </Text>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
