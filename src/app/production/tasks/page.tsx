"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/hooks/useTheme";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import {
  App as AntApp,
  Card,
  Button,
  Progress,
  Tag,
  Modal,
  Space,
  Row,
  Col,
  Statistic,
  Typography,
  Table,
  Input,
  Tooltip,
  message,
  Spin,
} from "antd";
import {
  PlayCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  PlusOutlined,
  StopOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  DownOutlined,
  RightOutlined,
} from "@ant-design/icons";
import BackButton from "@/components/BackButton";
import PopupModal from "@/components/popUpModule";
import MagicBento from "@/components/MagicBento.jsx";

const { Title, Text } = Typography;

interface IEmployeeWorkLog {
  employee: string;
  startTime: string; // or Date
  endTime?: string;
  accumulatedDuration: number; // or Date
}

interface ProductionTask {
  _id: string;
  product?: {
    _id: string;
    itemName: string;
  };
  plannedQuantity: number;
  productionDate: string; // ISO date string
  status: "Pending" | "InProgress" | "Completed" | "Cancelled";
  employeeWorkLogs: IEmployeeWorkLog[];
  producedQuantity?: number;
  defectedQuantity?: number;
  taskName?: string;
  taskType?: string;
}

export default function ProductionTasksPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const t = useTranslations("production.tasks");
  const { data: session, status } = useSession();

  const handleBackToMain = React.useCallback(() => {
    router.push("/welcomePage");
  }, [router]);

  // if user presses the Enter/Return key anywhere on this view we want to
  // perform a hierarchical "up" navigation instead of letting the browser
  // fall back through its history stack (which often takes them back to the
  // previous page they visited, e.g. the manage-stock list). the back button
  // in the UI already calls `handleBackToMain` and this listener ensures the keyboard
  // behaves the same way.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.defaultPrevented) {
        // avoid hijacking enter presses inside inputs/forms
        const tag = (e.target as HTMLElement).tagName.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") {
          return;
        }
        e.preventDefault();
        handleBackToMain();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handleBackToMain]);
  const [allTasks, setAllTasks] = useState<ProductionTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [messageApi, contextHolder] = message.useMessage();
  const { modal } = AntApp.useApp();

  // Multi-select states (manager only)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskActionLoadingId, setTaskActionLoadingId] = useState<string | null>(null);

  // Collapsible section states – start collapsed, load data on first expand
  const [poolExpanded, setPoolExpanded] = useState(false);
  const [myTasksExpanded, setMyTasksExpanded] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Fetch tasks from the server
  const fetchTasks = async () => {
    setTasksLoading(true);
    try {
      const res = await fetch("/api/production/tasks");
      const data: ProductionTask[] = await res.json();
      setAllTasks(data);
      setDataLoaded(true);
    } catch (err) {
      console.error(err);
      setError(t("errorFetchingTasks"));
      messageApi.error(t("errorFetchingTasks"));
    } finally {
      setTasksLoading(false);
    }
  };

  // Load data when first section is expanded
  useEffect(() => {
    if ((poolExpanded || myTasksExpanded) && !dataLoaded) {
      fetchTasks();
    }
  }, [poolExpanded, myTasksExpanded]);

  if (status === "loading")
    return (
      <div
        style={{
          padding: "24px",
          background: theme === "dark" ? "#262626" : "#f0f2f5",
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: theme === "dark" ? "#ffffff" : undefined }}>
          {t("loading")}
        </Text>
      </div>
    );

  if (!session)
    return (
      <div
        style={{
          padding: "24px",
          background: theme === "dark" ? "#262626" : "#f0f2f5",
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: theme === "dark" ? "#ffffff" : undefined }}>
          {t("signInToViewTasks")}
        </Text>
      </div>
    );

  const employeeId = (session.user.id || session.user.email) as string;
  const userRole = (session.user as any).role || "user";
  const isManager = userRole === "admin";
  const themedConfirmClassName =
    theme === "dark"
      ? "task-confirm-modal task-confirm-modal-dark"
      : "task-confirm-modal task-confirm-modal-light";

  const openThemedConfirm = (config: any) => {
    const okClassName = [
      config?.okButtonProps?.className,
      "task-confirm-ok-btn",
    ]
      .filter(Boolean)
      .join(" ");
    const cancelClassName = [
      config?.cancelButtonProps?.className,
      "task-confirm-cancel-btn",
    ]
      .filter(Boolean)
      .join(" ");

    modal.confirm({
      centered: true,
      className: themedConfirmClassName,
      ...config,
      okButtonProps: {
        ...config?.okButtonProps,
        className: okClassName,
      },
      cancelButtonProps: {
        ...config?.cancelButtonProps,
        className: cancelClassName,
      },
    });
  };

  const translateStatus = (statusValue: string) => {
    const statusMap: Record<string, string> = {
      Pending: t("pending"),
      InProgress: t("inProgress"),
      Completed: t("completed"),
      Cancelled: t("cancelled"),
    };
    return statusMap[statusValue] || statusValue;
  };

  const rowSelection = isManager
    ? {
        selectedRowKeys,
        onChange: (selectedKeys: React.Key[]) => {
          setSelectedRowKeys(selectedKeys);
        },
      }
    : undefined;

  const handleBulkDelete = async () => {
    if (!isManager) {
      messageApi.error(t("onlyManagerCanDelete"));
      return;
    }

    if (selectedRowKeys.length === 0) {
      messageApi.warning(t("noItemsSelected"));
      return;
    }

    openThemedConfirm({
      title: t("confirmDelete"),
      content: t("confirmDeleteMessage", { count: selectedRowKeys.length }),
      okText: t("delete"),
      okType: "danger",
      cancelText: t("cancel"),
      onOk: async () => {
        setDeleteLoading(true);
        try {
          const deletePromises = selectedRowKeys.map((id) =>
            fetch(`/api/production/tasks/${id}`, { method: "DELETE" }),
          );

          const results = await Promise.all(deletePromises);
          const failedDeletes = results.filter((res) => !res.ok);

          if (failedDeletes.length > 0) {
            messageApi.error(t("deleteError"));
          } else {
            messageApi.success(
              t("deleteSuccess", { count: selectedRowKeys.length }),
            );
            await fetchTasks();
            setSelectedRowKeys([]);
          }
        } catch (error) {
          console.error("Error deleting tasks:", error);
          messageApi.error(t("deleteError"));
        } finally {
          setDeleteLoading(false);
        }
      },
    });
  };

  const handleDeleteSingleTask = async (taskId: string) => {
    if (!isManager) {
      messageApi.error(t("onlyManagerCanDelete"));
      return;
    }

    openThemedConfirm({
      title: t("confirmDelete"),
      content: t("confirmDeleteMessage", { count: 1 }),
      okText: t("delete"),
      okType: "danger",
      cancelText: t("cancel"),
      onOk: async () => {
        try {
          const response = await fetch(`/api/production/tasks/${taskId}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            messageApi.error(t("deleteError"));
          } else {
            messageApi.success(t("deleteSuccess", { count: 1 }));
            await fetchTasks();
          }
        } catch (error) {
          console.error("Error deleting task:", error);
          messageApi.error(t("deleteError"));
        }
      },
    });
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  // 2) collect the IDs of every task whose productionDate is _before_ today
  const expiredIds = new Set(
    allTasks
      .filter((t) => new Date(t.productionDate) < todayStart)
      .map((t) => t._id),
  );

  // then, when you compute `pool`:
  const pool = allTasks.filter((t) => {
    if (expiredIds.has(t._id)) {
      // see if there's any log by this user *today*:
      const workedToday = t.employeeWorkLogs.some((log) => {
        if (log.employee !== employeeId) return false;
        const logDate = new Date(log.startTime);
        return logDate >= todayStart && logDate < tomorrowStart;
      });
      // only re‐show the expired task if they *haven’t* worked on it today
      return !workedToday;
    }

    // otherwise, your usual “never claimed” test
    return (
      t.taskType === "Production" &&
      !t.employeeWorkLogs.some((log) => log.employee === employeeId)
    );
  });

  // 4) MY TASKS:
  //    • only include tasks claimed by me
  //    • exclude any expired tasks
  const myTasks = allTasks.filter((t) => {
    // 1) if this was “expired” and isn’t actively in progress,
    //    only include it if the user actually worked on it *today*.
    if (expiredIds.has(t._id) && t.status !== "InProgress") {
      const workedToday = t.employeeWorkLogs.some((log) => {
        if (log.employee !== employeeId) return false;
        const ts = new Date(log.startTime);
        return ts >= todayStart && ts < tomorrowStart;
      });
      if (!workedToday) return false;
    }

    // 2) finally, include any task the user has *ever* logged on
    return t.employeeWorkLogs.some((log) => log.employee === employeeId);
  });

  function isRecordingNow(task: ProductionTask): boolean {
    return task.employeeWorkLogs.some(
      (log) =>
        log.employee === employeeId &&
        (typeof log.endTime === "undefined" || log.endTime === null),
    );
  }

  // --------------------------
  // Server-Side Task Handling
  // --------------------------

  // Start or reopen a task
  const handleCardClick = async (task: ProductionTask) => {
    const action = task.employeeWorkLogs.some(
      (log) => log.employee === employeeId,
    )
      ? "reopen"
      : "start";
    const label = action === "start" ? "Start" : "Reopen";

    setTaskActionLoadingId(task._id);
    try {
      const res = await fetch(`/api/production/tasks/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee: employeeId, action }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.error || t("errorActionTask", { action: label }),
        );
      }

      messageApi.success(t("taskActionSuccess", { action: label }));
      await fetchTasks();
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      messageApi.error(err.message);
    } finally {
      setTaskActionLoadingId(null);
    }
  };

  // Stop an active task
  const handleStop = async (task: ProductionTask) => {
    const displayName =
      task.taskType === "Production"
        ? task.product?.itemName
        : task.taskName || t("task");

    openThemedConfirm({
      title: `${t("stopWorkingOn")} "${displayName}"?`,
      onOk: async () => {
        try {
          const res = await fetch(`/api/production/tasks/${task._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ employee: employeeId, action: "stop" }),
          });
          if (!res.ok) {
            throw new Error(t("errorStoppingTask"));
          }
          messageApi.success(t("taskStoppedSuccess"));
          fetchTasks();
        } catch (err: any) {
          console.error(err);
          setError(err.message);
          messageApi.error(err.message);
        }
      },
    });
  };

  const handleUnclaimTask = async (task: ProductionTask) => {
    openThemedConfirm({
      title: t("confirmUnclaimTask", {
        task:
          task.taskType === "Production"
            ? task.product?.itemName || t("task")
            : task.taskName || t("task"),
      }),
      onOk: async () => {
        try {
          const res = await fetch(`/api/production/tasks/${task._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            // Pass action "unclaim" to remove the current user's work log
            body: JSON.stringify({ employee: employeeId, action: "unclaim" }),
          });
          if (!res.ok) {
            throw new Error(t("errorUnclaimTask"));
          }
          messageApi.success(t("taskUnclaimedSuccess"));
          fetchTasks();
        } catch (err: any) {
          console.error(err);
          setError(err.message);
          messageApi.error(err.message);
        }
      },
    });
  };

  // "End & Summarize" + Modal Implementation
  function handleEndAndSummarize() {
    setShowSummaryModal(true);
  }

  function handleCancelSummary() {
    setShowSummaryModal(false);
  }

  // Approve summary and update quantities on the server
  async function handleApproveSummary(
    taskUpdates: Record<string, { produced: number; defected: number }>,
  ) {
    try {
      // Update quantities for each task.
      const updatePromises = Object.entries(taskUpdates).map(([taskId, vals]) =>
        fetch(`/api/production/tasks/${taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "setQuantities",
            producedQuantity: vals.produced,
            defectedQuantity: vals.defected,
          }),
        }),
      );
      await Promise.all(updatePromises);

      // Finalize tasks.
      const taskIds = myTasks.map((t) => t._id);
      const finalizeRes = await fetch("/api/production/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds }),
      });

      const finalizeData = await finalizeRes.json();

      if (!finalizeRes.ok) {
        // Show detailed error information
        let errorMsg = finalizeData.error || "Unknown error";
        if (finalizeData.details && finalizeData.details.length > 0) {
          errorMsg += "\n\nDetails:\n" + finalizeData.details.join("\n");
        }
        messageApi.error(
          t("errorFinalizingTasks", { error: errorMsg }),
          10, // Show for 10 seconds
        );
        setShowSummaryModal(false);
        return; // Don't proceed if finalization failed
      }

      // Handle partial success (status 207)
      if (finalizeRes.status === 207) {
        messageApi.warning(
          t("partialSuccessWarning", {
            successful: finalizeData.successful,
            failed: finalizeData.failed,
          }),
          8,
        );
        if (finalizeData.errors) {
          console.warn("Task finalization errors:", finalizeData.errors);
        }
      } else {
        // Full success (status 200)
        messageApi.success(
          t("allTasksSuccess", { successful: finalizeData.successful }),
          3,
        );
      }

      // For employees, create an EmployeeReport for manager approval
      // For admin/user, save the report directly
      if (session?.user?.role === "employee") {
        // Create employee report for manager approval
        const employeeReportRes = await fetch("/api/employee-reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskIds,
            date: new Date().toISOString().split("T")[0], // Today's date
          }),
        });

        if (!employeeReportRes.ok) {
          const errorText = await employeeReportRes.text();
          try {
            const errorJson = JSON.parse(errorText);
            console.error("Error creating employee report:", errorJson.error);
            messageApi.error(
              t("errorGeneratingReport", { error: errorJson.error }),
            );
          } catch (parseError) {
            console.error(
              "Error creating employee report:",
              errorText || `Server Error: ${employeeReportRes.status}`,
            );
            messageApi.error(
              t("errorGeneratingReport", {
                error: errorText || `Server Error: ${employeeReportRes.status}`,
              }),
            );
          }
          setShowSummaryModal(false);
          return;
        }
      } else {
        // Admin/User: save the report directly
        const reportRes = await fetch("/api/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskIds }),
        });
        if (!reportRes.ok) {
          const errorText = await reportRes.text();
          try {
            const errorJson = JSON.parse(errorText);
            console.error("Error generating report:", errorJson.error);
            messageApi.error(
              t("errorGeneratingReport", { error: errorJson.error }),
            );
          } catch (parseError) {
            console.error(
              "Error generating report:",
              errorText || `Server Error: ${reportRes.status}`,
            );
            messageApi.error(
              t("errorGeneratingReport", {
                error: errorText || `Server Error: ${reportRes.status}`,
              }),
            );
          }
          setShowSummaryModal(false);
          return; // Don't proceed if report generation failed
        }
      }

      // All operations completed successfully
      setShowSummaryModal(false);
      messageApi.success(t("summaryApproved"));

      // Wait a moment for the success message to be visible
      setTimeout(() => {
        router.push("/welcomePage");
      }, 300);
    } catch (err: any) {
      console.error(err);
      messageApi.error(t("errorFinalizingTasks", { error: err.message }));
      setShowSummaryModal(false);
    }
  }

  // Create a constant task on the server
  const handleConstantTaskClick = async (task: {
    taskType: string;
    taskName: string;
  }) => {
    openThemedConfirm({
      title: t("createConstantTaskPrompt", { taskName: task.taskName }),
      onOk: async () => {
        try {
          const res = await fetch("/api/production/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              taskType: task.taskType,
              productionDate: new Date().toISOString(),
              plannedQuantity: 0,
              taskName: task.taskName,
            }),
          });
          if (!res.ok) {
            throw new Error(t("errorCreatingConstantTask"));
          }
          messageApi.success(t("constantTaskCreated"));
          fetchTasks();
        } catch (err: any) {
          messageApi.error(
            t("errorCreatingConstantTask", { error: err.message }),
          );
        }
      },
    });
  };

  const menuGlowColor = theme === "dark" ? "255, 219, 83" : "19, 44, 75";
  const constantTaskItems = [
    {
      taskType: "Cleaning",
      taskName: t("cleaningTask"),
      accentColor: "#3cbf6e",
      glowRgb: hexToRgb("#3cbf6e"),
    },
    {
      taskType: "Packaging",
      taskName: t("packagingTask"),
      accentColor: "#4a90d9",
      glowRgb: hexToRgb("#4a90d9"),
    },
    {
      taskType: "Break",
      taskName: t("breakTask"),
      accentColor: "#c95bbf",
      glowRgb: hexToRgb("#c95bbf"),
    },
    {
      taskType: "Selling",
      taskName: t("sellingTask"),
      accentColor: "#5b5fd4",
      glowRgb: hexToRgb("#5b5fd4"),
    },
  ];

  const renderConstantTaskItem = (item: {
    taskType: string;
    taskName: string;
    accentColor: string;
    glowRgb: string;
  }) => (
    <>
      <div
        className="magic-menu-link"
        style={{ cursor: "pointer" }}
        onClick={() => handleConstantTaskClick(item)}
      />
      <div className="magic-menu-content">
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: item.accentColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 4px 14px ${item.accentColor}70`,
            marginBottom: "8px",
          }}
        >
          <PlusOutlined style={{ fontSize: "20px", color: "#ffffff" }} />
        </div>
        <div className="magic-menu-title" style={{ color: item.accentColor }}>
          {item.taskName}
        </div>
      </div>
    </>
  );

  return (
    <div
      className="production-tasks-page"
      style={{
        padding: "24px",
        paddingBottom: "96px",
        background: "var(--background-color)",
        minHeight: "100vh",
      }}
    >
      {contextHolder}
      <style>{`
        .production-section-card .ant-card-head {
          background: ${theme === "dark" ? "#000000" : "var(--header-bg)"} !important;
        }
        html[data-theme="dark"] .production-constant-section-card.ant-card {
          background: #242424 !important;
        }
        html[data-theme="dark"] .production-constant-section-card .ant-card-body {
          background: #242424 !important;
        }
        html[data-theme="dark"] .production-section-card:not(.production-constant-section-card).ant-card {
          background: #242424 !important;
        }
        html[data-theme="dark"] .production-section-card:not(.production-constant-section-card) .ant-card-body {
          background: #242424 !important;
        }
        html[data-theme="dark"] .production-section-card {
          color: rgba(229, 232, 238, 0.78) !important;
        }
        html[data-theme="dark"] .production-section-card .ant-typography {
          color: rgba(229, 232, 238, 0.78) !important;
        }
        html[data-theme="dark"] .production-section-card .ant-typography.ant-typography-secondary {
          color: rgba(229, 232, 238, 0.78) !important;
        }
        html[data-theme="dark"] .production-section-card .ant-card-extra .ant-typography {
          color: rgba(229, 232, 238, 0.78) !important;
        }
        .card-grid.magic-menu-grid.production-constant-task-grid {
          gap: 27px !important;
        }
        .production-constant-task-card {
          width: 238px !important;
          flex: 0 0 238px !important;
          height: 168px !important;
        }
        @media (max-width: 768px) {
          .production-tasks-page {
            padding: 16px 12px !important;
            padding-bottom: 84px !important;
            overflow-x: hidden;
          }
          .production-tasks-header {
            min-height: auto !important;
            margin-bottom: 32px !important;
            display: flex;
            flex-direction: column;
            gap: 22px;
          }
          .production-tasks-actions {
            position: static !important;
            width: auto !important;
            align-items: flex-start !important;
            align-self: flex-start;
            flex-direction: row !important;
            justify-content: flex-start;
            gap: 10px !important;
          }
          .production-tasks-actions .ant-btn {
            width: 40px;
            min-width: 40px;
            height: 40px;
            padding-inline: 0;
            justify-content: center;
            border-radius: 999px;
          }
          .production-finish-btn.ant-btn > span:not(.ant-btn-icon) {
            display: none;
          }
          .production-finish-btn.ant-btn .ant-btn-icon {
            margin-inline-end: 0 !important;
            font-size: 1rem;
          }
          .production-tasks-title {
            margin-bottom: 0 !important;
            text-align: center !important;
          }
          .production-section-card {
            margin-bottom: 40px !important;
          }
          .production-section-card .ant-card-head {
            margin-bottom: 10px !important;
          }
          .card-grid.magic-menu-grid.production-constant-task-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
            justify-content: stretch !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .card-grid.magic-menu-grid.production-constant-task-grid > * {
            min-width: 0 !important;
          }
          .card-grid.magic-menu-grid.production-constant-task-grid
            .magic-bento-card.magic-menu-card.production-constant-task-card {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            flex: 1 1 auto !important;
            justify-self: stretch !important;
            height: clamp(142px, 34vw, 172px) !important;
            min-height: clamp(142px, 34vw, 172px) !important;
          }
          .production-constant-task-card .magic-menu-title {
            font-size: clamp(12px, 2.9vw, 14px) !important;
            line-height: 1.25;
            max-width: 100%;
            word-break: break-word;
            text-wrap: balance;
          }
          .production-constant-task-card .magic-menu-content > div:first-child {
            width: clamp(38px, 8.8vw, 52px) !important;
            height: clamp(38px, 8.8vw, 52px) !important;
            margin-bottom: clamp(7px, 2.2vw, 12px) !important;
          }
          .task-pool-card .ant-card-body,
          .my-task-card .ant-card-body {
            padding: 16px !important;
          }
          .task-pool-card.ant-card,
          .my-task-card.ant-card {
            width: 100% !important;
            max-width: 100% !important;
          }
          .task-pool-card.ant-card:hover,
          .my-task-card.ant-card:hover {
            transform: none !important;
          }
          .my-task-actions {
            display: flex !important;
            width: 100%;
            align-items: stretch;
          }
          .my-task-actions .ant-btn {
            min-height: 38px;
          }
          .my-task-actions .ant-btn:not(.ant-btn-block) {
            min-width: 42px !important;
            width: 42px;
            padding-inline: 0;
          }
          .production-section-card .ant-card-body {
            padding: 16px 10px !important;
          }
        }
        @media (max-width: 430px) {
          .card-grid.magic-menu-grid.production-constant-task-grid {
            gap: 7px !important;
          }
          .production-constant-task-card {
            padding: 10px !important;
          }
        }
        @media (max-width: 360px) {
          .production-tasks-page {
            padding: 12px 8px !important;
          }
          .production-section-card .ant-card-body {
            padding: 16px 8px !important;
          }
          .card-grid.magic-menu-grid.production-constant-task-grid {
            gap: 8px !important;
          }
          .production-constant-task-card {
            padding: 8px !important;
            height: 132px !important;
            min-height: 132px !important;
          }
          .production-constant-task-card .magic-menu-title {
            font-size: 11px !important;
          }
        }
      `}</style>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div
          className="production-tasks-header"
          style={{
            position: "relative",
            minHeight: "108px",
            marginBottom: "28px",
          }}
        >
          <div
            className="production-tasks-actions"
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "14px",
            }}
          >
            <BackButton onClick={handleBackToMain}>{t("back")}</BackButton>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              className="production-finish-btn"
              onClick={handleEndAndSummarize}
            >
              {t("endAndSummarize")}
            </Button>
          </div>

          <Title
            className="production-tasks-title"
            level={2}
            style={{ textAlign: "center", marginBottom: "32px" }}
          >
            {t("pageTitle")}
          </Title>
        </div>

        {/* Constant Tasks Section */}
        <Card
          className="production-section-card production-constant-section-card"
          title={
            <Text strong style={{ fontSize: "16px" }}>
              {t("constantTasksTitle")}
            </Text>
          }
          style={{
            marginBottom: "64px",
            background: theme === "dark" ? "#242424" : "#ffffff",
          }}
          styles={{ body: { paddingTop: 40, paddingBottom: 40 } }}
        >
          <MagicBento
            items={constantTaskItems as any}
            renderItem={renderConstantTaskItem}
            gridClassName="magic-menu-grid production-constant-task-grid"
            cardClassName="magic-menu-card production-constant-task-card"
            textAutoHide={false}
            enableStars={false}
            enableSpotlight
            enableBorderGlow
            spotlightRadius={216}
            enableTilt
            enableMagnetism
            clickEffect
            glowColor={menuGlowColor}
            getCardStyle={(item: any) => ({
              backgroundColor: theme === "dark" ? "#111111" : "#ffffff",
              borderColor: "transparent",
              "--glow-color-rgb": item.glowRgb,
            })}
          />
        </Card>

        {/* Task Pool Section */}
        <Card
          className="production-section-card"
          title={
            <Space
              style={{
                width: "100%",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
              onClick={() => setPoolExpanded((prev) => !prev)}
            >
              <Space>
                {poolExpanded ? <DownOutlined /> : <RightOutlined />}
                <Text strong style={{ fontSize: "16px" }}>
                  {t("taskPoolTitle")}
                </Text>
              </Space>
              {isManager && selectedRowKeys.length > 0 && (
                <Space onClick={(e) => e.stopPropagation()}>
                  <span style={{ marginRight: 8 }}>
                    {t("selectedCount", {
                      defaultValue: `${selectedRowKeys.length} selected`,
                      count: selectedRowKeys.length,
                    })}
                  </span>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleBulkDelete}
                    loading={deleteLoading}
                  >
                    {t("delete", { defaultValue: "Delete" })}
                  </Button>
                </Space>
              )}
            </Space>
          }
          extra={<Text type="secondary">{t("taskPoolInfo")}</Text>}
          style={{ marginBottom: "64px" }}
          styles={{
            body: {
              paddingTop: poolExpanded ? 40 : 0,
              paddingBottom: poolExpanded ? 40 : 0,
            },
          }}
        >
          {poolExpanded && (
            <Spin spinning={tasksLoading}>
              {pool.length === 0 && !tasksLoading ? (
                <Text type="secondary">{t("noTasksInPool")}</Text>
              ) : (
                <Row gutter={[16, 16]}>
                  {pool.map((task, index) => {
                    const accentColor =
                      pastelColors[index % pastelColors.length];
                    const isDark = theme === "dark";
                    return (
                      <Col xs={24} sm={12} md={8} key={task._id}>
                        <Card
                          className={`task-pool-card pool-task-${index}`}
                          hoverable
                          style={{
                            background: accentColor,
                            borderColor: "transparent",
                            textAlign: "left",
                            boxShadow: `0 4px 15px ${accentColor}40`,
                            borderRadius: "12px",
                            transition:
                              "all 0.4s cubic-bezier(0.23, 1, 0.320, 1)",
                            position: "relative",
                            overflow: "visible",
                            perspectiveOrigin: "center",
                            perspective: "1000px",
                          }}
                          styles={{
                            body: {
                              padding: "20px",
                            },
                          }}
                          onClick={() => handleCardClick(task)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform =
                              "translateY(-8px) rotateX(5deg) rotateY(-5deg)";
                            e.currentTarget.style.boxShadow = `0 20px 40px ${accentColor}60, 0 0 30px ${accentColor}80`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform =
                              "translateY(0) rotateX(0deg) rotateY(0deg)";
                            e.currentTarget.style.boxShadow = `0 4px 15px ${accentColor}40`;
                          }}
                        >
                          <Space
                            direction="vertical"
                            style={{ width: "100%" }}
                            size="middle"
                          >
                            {isManager && (
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedRowKeys.includes(task._id)}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedRowKeys([
                                        ...selectedRowKeys,
                                        task._id,
                                      ]);
                                    } else {
                                      setSelectedRowKeys(
                                        selectedRowKeys.filter(
                                          (k) => k !== task._id,
                                        ),
                                      );
                                    }
                                  }}
                                  style={{
                                    width: "18px",
                                    height: "18px",
                                    cursor: "pointer",
                                  }}
                                />
                                <Tooltip
                                  title={t("delete", {
                                    defaultValue: "Delete",
                                  })}
                                >
                                  <Button
                                    danger
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSingleTask(task._id);
                                    }}
                                  />
                                </Tooltip>
                              </div>
                            )}
                            <div>
                              <Text
                                strong
                                style={{
                                  fontSize: "15px",
                                  display: "block",
                                  marginBottom: "4px",
                                  color: "#ffffff",
                                }}
                              >
                                {task.taskType === "Production"
                                  ? task.product?.itemName
                                  : task.taskName}
                              </Text>
                              <Text
                                type="secondary"
                                style={{
                                  fontSize: "12px",
                                  color: "rgba(255, 255, 255, 0.85)",
                                }}
                              >
                                {new Date(
                                  task.productionDate,
                                ).toLocaleDateString()}
                              </Text>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: "12px",
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <Text
                                  type="secondary"
                                  style={{
                                    fontSize: "11px",
                                    color: "rgba(255, 255, 255, 0.85)",
                                  }}
                                >
                                  {t("quantityLabel")}
                                </Text>
                                <Text
                                  strong
                                  style={{
                                    display: "block",
                                    fontSize: "14px",
                                    color: "#ffffff",
                                  }}
                                >
                                  {task.plannedQuantity}
                                </Text>
                              </div>
                              <div style={{ flex: 1 }}>
                                <Text
                                  type="secondary"
                                  style={{
                                    fontSize: "11px",
                                    color: "rgba(255, 255, 255, 0.85)",
                                  }}
                                >
                                  {t("statusLabel")}
                                </Text>
                                <Tag
                                  color={getStatusColor(task.status)}
                                  style={{ marginTop: "4px", display: "block" }}
                                >
                                  {translateStatus(task.status)}
                                </Tag>
                              </div>
                            </div>
                            <Button
                              type="primary"
                              block
                              style={{ position: "relative", zIndex: 1 }}
                              loading={taskActionLoadingId === task._id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCardClick(task);
                              }}
                            >
                              {t("start")}
                            </Button>
                          </Space>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              )}
            </Spin>
          )}
        </Card>
        {/* My Tasks Section */}
        <Card
          className="production-section-card"
          title={
            <Space
              style={{ cursor: "pointer" }}
              onClick={() => setMyTasksExpanded((prev) => !prev)}
            >
              {myTasksExpanded ? <DownOutlined /> : <RightOutlined />}
              <Text strong style={{ fontSize: "16px" }}>
                {t("myTasksTitle")}
              </Text>
            </Space>
          }
          extra={<Text type="secondary">{t("myTasksInfo")}</Text>}
          styles={{
            body: {
              paddingTop: myTasksExpanded ? 40 : 0,
              paddingBottom: myTasksExpanded ? 40 : 0,
            },
          }}
        >
          {myTasksExpanded && (
            <Spin spinning={tasksLoading}>
              {myTasks.length === 0 && !tasksLoading ? (
                <Text type="secondary">{t("noTasksYet")}</Text>
              ) : (
                <Row gutter={[16, 16]}>
                  {myTasks.map((task, index) => {
                    const accentColor =
                      pastelColors[index % pastelColors.length];
                    const isDark = theme === "dark";
                    const active = isRecordingNow(task);
                    const totalDurationMS = calculateTotalDurationHelper(
                      task,
                      employeeId,
                    );
                    const formattedDuration =
                      formatDurationHelper(totalDurationMS);

                    return (
                      <Col xs={24} sm={12} md={8} key={task._id}>
                        <Card
                          className={`my-task-card my-task-${index}`}
                          hoverable
                          style={{
                            background: accentColor,
                            borderColor: "transparent",
                            textAlign: "left",
                            boxShadow: `0 4px 15px ${accentColor}40`,
                            borderRadius: "12px",
                            transition:
                              "all 0.4s cubic-bezier(0.23, 1, 0.320, 1)",
                            position: "relative",
                            overflow: "visible",
                            perspectiveOrigin: "center",
                            perspective: "1000px",
                          }}
                          styles={{
                            body: {
                              padding: "20px",
                            },
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform =
                              "translateY(-8px) rotateX(5deg) rotateY(-5deg)";
                            e.currentTarget.style.boxShadow = `0 20px 40px ${accentColor}60, 0 0 30px ${accentColor}80`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform =
                              "translateY(0) rotateX(0deg) rotateY(0deg)";
                            e.currentTarget.style.boxShadow = `0 4px 15px ${accentColor}40`;
                          }}
                        >
                          <Space
                            direction="vertical"
                            style={{ width: "100%" }}
                            size="middle"
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: "8px",
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <Text
                                  strong
                                  style={{
                                    fontSize: "15px",
                                    display: "block",
                                    marginBottom: "4px",
                                    color: "#ffffff",
                                  }}
                                >
                                  {task.taskType === "Production"
                                    ? task.product?.itemName
                                    : task.taskName}
                                </Text>
                                <Text
                                  type="secondary"
                                  style={{
                                    fontSize: "12px",
                                    color: "rgba(255, 255, 255, 0.85)",
                                  }}
                                >
                                  {new Date(
                                    task.productionDate,
                                  ).toLocaleDateString()}
                                </Text>
                              </div>
                              <Tag
                                color={active ? "green" : "default"}
                                style={{ marginTop: "2px" }}
                              >
                                {active ? t("yes") : t("no")}
                              </Tag>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: "12px",
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <Text
                                  type="secondary"
                                  style={{
                                    fontSize: "11px",
                                    color: "rgba(255, 255, 255, 0.85)",
                                  }}
                                >
                                  {t("quantityLabel")}
                                </Text>
                                <Text
                                  strong
                                  style={{
                                    display: "block",
                                    fontSize: "14px",
                                    color: "#ffffff",
                                  }}
                                >
                                  {task.plannedQuantity}
                                </Text>
                              </div>
                              <div style={{ flex: 1 }}>
                                <Text
                                  type="secondary"
                                  style={{
                                    fontSize: "11px",
                                    color: "rgba(255, 255, 255, 0.85)",
                                  }}
                                >
                                  {t("timeWorked")}
                                </Text>
                                <Text
                                  strong
                                  style={{
                                    display: "block",
                                    fontSize: "14px",
                                    color: "#ffffff",
                                  }}
                                >
                                  {formattedDuration}
                                </Text>
                              </div>
                            </div>

                            <Space
                              className="my-task-actions"
                              style={{
                                width: "100%",
                                gap: "8px",
                                justifyContent: "space-between",
                              }}
                            >
                              {active ? (
                                <>
                                  <Button
                                    danger
                                    block
                                    icon={<StopOutlined />}
                                    onClick={() => handleStop(task)}
                                  >
                                    {t("stop")}
                                  </Button>
                                  <Button
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => handleUnclaimTask(task)}
                                    style={{ minWidth: "44px" }}
                                  />
                                </>
                              ) : (
                                <>
                                  <Button
                                    type="primary"
                                    block
                                    icon={<PlayCircleOutlined />}
                                    loading={taskActionLoadingId === task._id}
                                    onClick={() => handleCardClick(task)}
                                  >
                                    {t("reopen")}
                                  </Button>
                                  <Button
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => handleUnclaimTask(task)}
                                    style={{ minWidth: "44px" }}
                                  />
                                </>
                              )}
                            </Space>
                          </Space>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              )}
            </Spin>
          )}
        </Card>
      </div>

      {showSummaryModal && (
        <SummaryModal
          onClose={handleCancelSummary}
          onApprove={handleApproveSummary}
          tasks={myTasks}
          employeeId={employeeId}
        />
      )}
    </div>
  );
}

// Status color mapping
const getStatusColor = (status: string) => {
  switch (status) {
    case "Pending":
      return "orange";
    case "InProgress":
      return "blue";
    case "Completed":
      return "green";
    case "Cancelled":
      return "red";
    default:
      return "default";
  }
};

// Pastel colors for the pool cards
const pastelColors = [
  "#bae7ff",
  "#b7eb8f",
  "#ffe7ba",
  "#ffadd2",
  "#87e8de",
  "#d3adf7",
];

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
};

// Helper to calculate total time (in milliseconds) worked on a task by employeeId.
const calculateTotalDurationHelper = (
  task: ProductionTask,
  employeeId: string,
) => {
  let totalMS = 0;
  task.employeeWorkLogs.forEach((log) => {
    if (log.employee === employeeId && log.endTime) {
      const start = new Date(log.startTime).getTime();
      const end = new Date(log.endTime).getTime();
      totalMS += end - start;
    }
  });
  return totalMS;
};

// Helper to format milliseconds into a human-readable string.
const formatDurationHelper = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  let result = "";
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0 || hours > 0) result += `${minutes}m `;
  result += `${seconds}s`;
  return result.trim();
};

// ----------------------------
// SummaryModal Component
// ----------------------------
function SummaryModal({
  onClose,
  onApprove,
  tasks,
  employeeId,
}: {
  onClose: () => void;
  onApprove: (
    taskUpdates: Record<string, { produced: number; defected: number }>,
  ) => void;
  tasks: ProductionTask[];
  employeeId: string;
}) {
  const [taskQuantities, setTaskQuantities] = useState<
    Record<string, { produced: number; defected: number }>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    taskId: string;
    newValue: number;
    oldValue: number;
    planned: number;
  } | null>(null);

  const t = useTranslations("production.tasks");

  useEffect(() => {
    const init: Record<string, { produced: number; defected: number }> = {};
    tasks.forEach((t) => {
      // For production tasks, default produced to plannedQuantity if not already set
      const prod =
        (t as any).producedQuantity ??
        (t.taskType === "Production" ? t.plannedQuantity : 0);
      const def = (t as any).defectedQuantity ?? 0;
      init[t._id] = { produced: prod, defected: def };
    });
    setTaskQuantities(init);
  }, [tasks]);

  const handleChange = (
    taskId: string,
    field: "produced" | "defected",
    value: number,
  ) => {
    if (field === "produced") {
      const task = tasks.find((t) => t._id === taskId)!;
      const planned = task.plannedQuantity ?? 0;
      // if over 3× planned, delay actual update until user confirms
      if (value > planned * 3) {
        setConfirmState({
          taskId,
          newValue: value,
          oldValue: taskQuantities[taskId]?.produced ?? 0,
          planned,
        });
        return;
      }
      // Auto-calculate defected quantity: requiredQuantity - producedQuantity
      const autoDefected = Math.max(0, planned - value);
      setTaskQuantities((prev) => ({
        ...prev,
        [taskId]: { ...prev[taskId], produced: value, defected: autoDefected },
      }));
    } else {
      // For defected field, just update normally
      setTaskQuantities((prev) => ({
        ...prev,
        [taskId]: { ...prev[taskId], [field]: value },
      }));
    }
  };

  const handleConfirmed = () => {
    if (!confirmState) return;
    const task = tasks.find((t) => t._id === confirmState.taskId)!;
    const planned = task.plannedQuantity ?? 0;
    const autoDefected = Math.max(0, planned - confirmState.newValue);
    setTaskQuantities((prev) => ({
      ...prev,
      [confirmState.taskId]: {
        ...prev[confirmState.taskId],
        produced: confirmState.newValue,
        defected: autoDefected,
      },
    }));
    setConfirmState(null);
  };

  function handleApproveClick() {
    if (submitting) return;
    setSubmitting(true);
    onApprove(taskQuantities);
  }

  // Helper to calculate total time (in milliseconds) worked on a task by employeeId.
  const calculateTotalDuration = (task: ProductionTask, employeeId: string) => {
    let totalMS = 0;
    task.employeeWorkLogs.forEach((log) => {
      if (log.employee === employeeId && log.endTime) {
        const start = new Date(log.startTime).getTime();
        const end = new Date(log.endTime).getTime();
        totalMS += end - start;
      }
    });
    return totalMS;
  };

  // Helper to format milliseconds into a human-readable string.
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    let result = "";
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0 || hours > 0) result += `${minutes}m `;
    result += `${seconds}s`;
    return result.trim();
  };

  const columns = [
    {
      title: t("task"),
      dataIndex: "taskName",
      key: "task",
      render: (_: any, record: ProductionTask) => (
        <Text>
          {record.taskType === "Production"
            ? record.product?.itemName
            : record.taskName}
        </Text>
      ),
    },
    {
      title: t("quantityRequested"),
      dataIndex: "plannedQuantity",
      key: "plannedQuantity",
      width: 150,
      render: (qty: number) => <Text>{qty ?? 0}</Text>,
    },
    {
      title: t("producedQty"),
      key: "produced",
      width: 150,
      render: (_: any, record: ProductionTask) => {
        const rowVals = taskQuantities[record._id] || {
          produced: 0,
          defected: 0,
        };
        return record.taskType === "Production" ? (
          <Input
            type="number"
            value={rowVals.produced}
            onChange={(e) =>
              handleChange(record._id, "produced", Number(e.target.value))
            }
            style={{ width: "100px" }}
          />
        ) : (
          <Text type="secondary">N/A</Text>
        );
      },
    },
    {
      title: t("defectedQty"),
      key: "defected",
      width: 150,
      render: (_: any, record: ProductionTask) => {
        const rowVals = taskQuantities[record._id] || {
          produced: 0,
          defected: 0,
        };
        return record.taskType === "Production" ? (
          <Input
            type="number"
            value={rowVals.defected}
            onChange={(e) =>
              handleChange(record._id, "defected", Number(e.target.value))
            }
            style={{ width: "100px" }}
          />
        ) : (
          <Text type="secondary">N/A</Text>
        );
      },
    },
    {
      title: t("timeWorked"),
      key: "duration",
      width: 120,
      render: (_: any, record: ProductionTask) => {
        const totalDurationMS = calculateTotalDuration(record, employeeId);
        const formattedDuration = formatDuration(totalDurationMS);
        return <Text>{formattedDuration}</Text>;
      },
    },
  ];

  return (
    <>
      <Modal
        title={<Title level={3}>{t("finalizeTitle")}</Title>}
        open={true}
        onCancel={onClose}
        width={1000}
        footer={[
          <Button key="cancel" onClick={onClose} disabled={submitting}>
            {t("cancel")}
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={submitting}
            onClick={handleApproveClick}
          >
            {submitting ? t("submitting") : t("approveAndSend")}
          </Button>,
        ]}
      >
        <Text style={{ display: "block", marginBottom: "16px" }}>
          {t("finalizeInstruction")}
        </Text>
        {tasks.length === 0 ? (
          <Text type="secondary">{t("noTasksFound")}</Text>
        ) : (
          <Table
            dataSource={tasks}
            columns={columns}
            rowKey="_id"
            pagination={false}
            scroll={{ x: true }}
          />
        )}
      </Modal>

      {confirmState && (
        <PopupModal
          type="info"
          message={t("confirmTooLarge", {
            produced: confirmState.newValue,
            planned: confirmState.planned,
            threshold: confirmState.planned * 3,
          })}
          confirmText={t("yesContinue")}
          cancelText={t("noCancel")}
          onConfirm={handleConfirmed}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </>
  );
}
