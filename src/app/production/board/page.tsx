"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/hooks/useTheme";
import {
  Button,
  Card,
  Empty,
  Flex,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import {
  AppstoreOutlined,
  CalendarOutlined,
  ReloadOutlined,
  PlusOutlined,
  UnorderedListOutlined,
  DeleteOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import BackButton from "@/components/BackButton";
import { TaskEditorModal } from "@/components/production/TaskEditorModal";
import {
  BOARD_COLUMN_ORDER,
  classifyTodayColumn,
  classifyWeekColumn,
  droppableIdToday,
  formatDurationCompact,
  getSunThroughThuKeys,
  getTaskProductionDateKey,
  hasOpenWorkLog,
  parseBoardDroppableId,
  parseLocalDateKey,
  toLocalDateKey,
  totalWorkDurationMs,
  type BoardColumnId,
} from "@/lib/productionBoard";

const { Text, Title } = Typography;

interface IEmployeeWorkLog {
  employee: string;
  startTime: string;
  endTime?: string | null;
  accumulatedDuration?: number;
}

interface EpicRef {
  _id: string;
  title: string;
}

function epicSelectValue(task: BoardTask): string | undefined {
  const e = task.epic as EpicRef | string | null | undefined;
  if (!e) return undefined;
  if (typeof e === "string") return e;
  return e._id;
}

interface OrderLine {
  product?: { _id: string; itemName: string } | string;
  quantity: number;
  unitPrice?: number;
}

type UserMini = {
  id: string;
  name?: string;
  lastname?: string;
  userName?: string;
};

interface BoardTask {
  _id: string;
  product?: { _id: string; itemName: string };
  plannedQuantity: number;
  productionDate: string;
  status: string;
  employeeWorkLogs: IEmployeeWorkLog[];
  taskName?: string;
  taskType?: string;
  epic?: EpicRef | null;
  isDraft?: boolean;
  customerName?: string;
  businessCustomerName?: string;
  orderLines?: OrderLine[];
  orderTotalPrice?: number;
  deliveryDate?: string;
  attachmentUrl?: string;
  attachmentOriginalName?: string;
  attachmentMimeType?: string;
  createdBy?: string;
  ownerId?: string;
  assigneeIds?: string[];
  createdByUser?: UserMini | null;
  ownerUser?: UserMini | null;
  assigneeUsers?: UserMini[];
  producedQuantity?: number;
  defectedQuantity?: number;
}

const TODAY_COL_ORDER = BOARD_COLUMN_ORDER;
const WEEK_DAY_DROP_PREFIX = "week-day:";
const WEEK_DELIVERIES_SENT_DROP_ID = "week-deliveries-sent";

/** Droppable id for drag-to-delete (managers only). */
const BOARD_TRASH_DROP_ID = "board-trash";

function taskTitle(task: BoardTask): string {
  if (task.taskType === "Production" && task.product?.itemName) {
    return task.product.itemName;
  }
  if (task.taskType === "CustomerOrder" && task.customerName?.trim()) {
    return task.customerName.trim();
  }
  if (task.taskType === "BusinessCustomer" && task.businessCustomerName?.trim()) {
    return task.businessCustomerName.trim();
  }
  return task.taskName || taskNameFallback(task);
}

function taskNameFallback(task: BoardTask): string {
  return task.taskType ?? "Task";
}

function isDeliveryTask(task: BoardTask): boolean {
  return task.taskType === "CustomerOrder" || task.taskType === "BusinessCustomer";
}

function formatUserMini(
  u?: { name?: string; lastname?: string; userName?: string; id?: string } | null,
) {
  if (!u) return "—";
  const n = [u.name, u.lastname].filter(Boolean).join(" ").trim();
  return n || u.userName || u.id || "—";
}

export default function ProductionBoardPage() {
  const router = useRouter();
  const t = useTranslations("production.board");
  const { theme } = useTheme();
  const { data: session, status } = useSession();
  const [messageApi, contextHolder] = message.useMessage();

  const [boardMode, setBoardMode] = useState<"today" | "week" | "weekDeliveries">("today");
  const [weekOffset, setWeekOffset] = useState(0);
  const [tasks, setTasks] = useState<BoardTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [epics, setEpics] = useState<EpicRef[]>([]);
  const [epicFilter, setEpicFilter] = useState<string>("all");
  const [newEpicOpen, setNewEpicOpen] = useState(false);
  const [newEpicTitle, setNewEpicTitle] = useState("");
  const [creatingEpic, setCreatingEpic] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [boardDragActive, setBoardDragActive] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editTask, setEditTask] = useState<BoardTask | null>(null);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [finalizeTask, setFinalizeTask] = useState<BoardTask | null>(null);
  const [finalizeDateKey, setFinalizeDateKey] = useState<string | null>(null);
  const [finalizeSubmitting, setFinalizeSubmitting] = useState(false);
  const [finalizeProduced, setFinalizeProduced] = useState<number>(0);
  const [finalizeDefected, setFinalizeDefected] = useState<number>(0);
  /** Draft produced/defected for Production tasks in day view "ready to finish" (before drop to done). */
  const [boardQtyDraft, setBoardQtyDraft] = useState<
    Record<string, { produced: number; defected: number }>
  >({});

  const todayKey = useMemo(() => toLocalDateKey(new Date()), []);

  const weekRefDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDayKeys = useMemo(() => getSunThroughThuKeys(weekRefDate), [weekRefDate]);

  const weekLabel = useMemo(() => {
    const [a, b] = [weekDayKeys[0], weekDayKeys[4]];
    return `${a} → ${b}`;
  }, [weekDayKeys]);

  const fetchEpics = useCallback(async () => {
    try {
      const res = await fetch("/api/production/epics");
      if (!res.ok) return;
      const data = await res.json();
      setEpics(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchTasks = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (!silent) setLoading(true);
      try {
        let from: string;
        let to: string;
        if (boardMode === "today") {
          from = todayKey;
          to = todayKey;
        } else {
          from = weekDayKeys[0];
          to = weekDayKeys[4];
        }
        const params = new URLSearchParams({ from, to });
        if (epicFilter === "none") {
          params.set("epicId", "none");
        } else if (epicFilter !== "all") {
          params.set("epicId", epicFilter);
        }
        const res = await fetch(`/api/production/board-tasks?${params.toString()}`);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      } catch {
        messageApi.error(t("fetchError"));
        setTasks([]);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [boardMode, todayKey, weekDayKeys, epicFilter, messageApi, t],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  useEffect(() => {
    fetchEpics();
  }, [fetchEpics]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (boardMode !== "today") return;
    setBoardQtyDraft((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const task of tasks) {
        if (getTaskProductionDateKey(task) !== todayKey) continue;
        if (classifyTodayColumn(task) !== "readyToFinalize") continue;
        if (task.taskType !== "Production") continue;
        if (next[task._id] !== undefined) continue;
        const prod = task.producedQuantity ?? task.plannedQuantity ?? 0;
        const planned = task.plannedQuantity ?? 0;
        next[task._id] = {
          produced: prod,
          defected: task.defectedQuantity ?? Math.max(0, planned - prod),
        };
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [boardMode, tasks, todayKey]);

  const employeeId = (session?.user?.id || session?.user?.email || "") as string;
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  const executeDeleteTask = useCallback(
    async (task: BoardTask) => {
      setDeleteLoadingId(task._id);
      try {
        const res = await fetch(`/api/production/tasks/${task._id}`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.error === "string" ? data.error : t("deleteTaskError"),
          );
        }
        messageApi.success(t("deleteTaskSuccess"));
        await fetchTasks({ silent: true });
        if (editTask?._id === task._id) {
          setEditorOpen(false);
          setEditTask(null);
        }
      } catch (e: unknown) {
        messageApi.error(
          e instanceof Error ? e.message : t("deleteTaskError"),
        );
      } finally {
        setDeleteLoadingId(null);
      }
    },
    [editTask, fetchTasks, messageApi, t],
  );

  const handleBoardDragStart = useCallback((event: DragStartEvent) => {
    setBoardDragActive(String(event.active.id).startsWith("task:"));
  }, []);

  const handleBoardDragEndOrCancel = useCallback(() => {
    setBoardDragActive(false);
  }, []);

  const performFinalize = useCallback(
    async (
      task: BoardTask,
      dateKey: string,
      produced: number,
      defected: number,
    ) => {
      const setReadyRes = await fetch(`/api/production/tasks/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "boardMove",
          targetColumn: "readyToFinalize",
          dateKey,
        }),
      });
      const readyData = await setReadyRes.json().catch(() => ({}));
      if (!setReadyRes.ok) {
        throw new Error(
          typeof readyData.error === "string" ? readyData.error : t("boardMoveError"),
        );
      }

      if (task.taskType === "Production") {
        const qRes = await fetch(`/api/production/tasks/${task._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "setQuantities",
            producedQuantity: Math.max(0, Number(produced) || 0),
            defectedQuantity: Math.max(0, Number(defected) || 0),
          }),
        });
        const qData = await qRes.json().catch(() => ({}));
        if (!qRes.ok) {
          throw new Error(
            typeof qData.error === "string" ? qData.error : t("finalizeError"),
          );
        }
      }

      const finalizeRes = await fetch("/api/production/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskIds: [task._id],
          executionDate: dateKey,
        }),
      });
      const finalizeData = await finalizeRes.json().catch(() => ({}));
      if (!finalizeRes.ok) {
        const details =
          Array.isArray(finalizeData.details) && finalizeData.details.length > 0
            ? `: ${String(finalizeData.details[0])}`
            : "";
        throw new Error(
          typeof finalizeData.error === "string"
            ? `${finalizeData.error}${details}`
            : t("finalizeError"),
        );
      }

      messageApi.success(t("finalizeSuccess"));
      await fetchTasks({ silent: true });
      setBoardQtyDraft((prev) => {
        if (!prev[task._id]) return prev;
        const { [task._id]: _, ...rest } = prev;
        return rest;
      });
    },
    [fetchTasks, messageApi, t],
  );

  const handleBoardDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      if (String(over.id) === BOARD_TRASH_DROP_ID) {
        if (!isAdmin) return;
        const taskId = String(active.id).replace(/^task:/, "");
        const task = tasks.find((x) => x._id === taskId);
        if (!task) return;
        void executeDeleteTask(task);
        return;
      }

      const taskId = String(active.id).replace(/^task:/, "");
      const task = tasks.find((x) => x._id === taskId);
      if (!task) return;
      const currentDayKey = getTaskProductionDateKey(task);
      const currentCol = classifyWeekColumn(task);

      const overId = String(over.id);
      if (
        boardMode === "weekDeliveries" &&
        overId === WEEK_DELIVERIES_SENT_DROP_ID
      ) {
        if (!isAdmin) return;
        const defaultProduced =
          task.producedQuantity ??
          (task.taskType === "Production" ? task.plannedQuantity ?? 0 : 0);
        setFinalizeTask(task);
        setFinalizeDateKey(currentDayKey ?? todayKey);
        setFinalizeProduced(Math.max(0, Number(defaultProduced) || 0));
        setFinalizeDefected(Math.max(0, Number(task.defectedQuantity ?? 0) || 0));
        return;
      }
      const weekDateDrop = overId.startsWith(WEEK_DAY_DROP_PREFIX)
        ? overId.slice(WEEK_DAY_DROP_PREFIX.length)
        : null;
      if (
        boardMode !== "today" &&
        weekDateDrop &&
        /^\d{4}-\d{2}-\d{2}$/.test(weekDateDrop)
      ) {
        if (currentDayKey === weekDateDrop) return;
        try {
          const res = await fetch(`/api/production/tasks/${taskId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "boardMove",
              targetColumn: currentCol,
              dateKey: weekDateDrop,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(
              typeof data.error === "string" ? data.error : "move failed",
            );
          }
          messageApi.success(t("boardMoveSuccess"));
          await fetchTasks({ silent: true });
        } catch (e: unknown) {
          messageApi.error(
            e instanceof Error ? e.message : t("boardMoveError"),
          );
        }
        return;
      }

      const parsed = parseBoardDroppableId(overId);
      if (!parsed) return;

      const dateKey =
        parsed.mode === "week" && parsed.dateKey
          ? parsed.dateKey
          : todayKey;

      const currentColForTarget =
        boardMode === "today"
          ? classifyTodayColumn(task)
          : classifyWeekColumn(task);
      if (currentColForTarget === parsed.column && currentDayKey === dateKey) {
        return;
      }

      if (parsed.column === "done") {
        if (!isAdmin || boardMode !== "today") return;
        const planned = task.plannedQuantity ?? 0;
        const draft = boardQtyDraft[task._id];
        const produced = Math.max(
          0,
          Number(
            draft?.produced ??
              task.producedQuantity ??
              (task.taskType === "Production" ? planned : 0),
          ) || 0,
        );
        const defected = Math.max(
          0,
          Number(
            draft?.defected ??
              task.defectedQuantity ??
              (task.taskType === "Production" ? Math.max(0, planned - produced) : 0),
          ) || 0,
        );
        try {
          await performFinalize(task, dateKey, produced, defected);
        } catch (e: unknown) {
          messageApi.error(
            e instanceof Error ? e.message : t("finalizeError"),
          );
        }
        return;
      }

      try {
        const res = await fetch(`/api/production/tasks/${taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "boardMove",
            targetColumn: parsed.column,
            dateKey,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.error === "string" ? data.error : "move failed",
          );
        }
        messageApi.success(t("boardMoveSuccess"));
        await fetchTasks({ silent: true });
        setEditTask((prev) => {
          if (prev?._id === taskId) {
            setEditorOpen(false);
            return null;
          }
          return prev;
        });
      } catch (e: unknown) {
        messageApi.error(
          e instanceof Error ? e.message : t("boardMoveError"),
        );
      }
    },
    [
      boardMode,
      boardQtyDraft,
      fetchTasks,
      executeDeleteTask,
      isAdmin,
      messageApi,
      performFinalize,
      tasks,
      todayKey,
      t,
    ],
  );

  const submitFinalizeTask = useCallback(async () => {
    if (!finalizeTask || !isAdmin || finalizeSubmitting) return;
    setFinalizeSubmitting(true);
    try {
      await performFinalize(
        finalizeTask,
        finalizeDateKey ?? todayKey,
        finalizeProduced,
        finalizeDefected,
      );
      setFinalizeTask(null);
      setFinalizeDateKey(null);
    } catch (e: unknown) {
      messageApi.error(e instanceof Error ? e.message : t("finalizeError"));
    } finally {
      setFinalizeSubmitting(false);
    }
  }, [
    finalizeDateKey,
    finalizeDefected,
    finalizeProduced,
    finalizeSubmitting,
    finalizeTask,
    isAdmin,
    messageApi,
    performFinalize,
    t,
    todayKey,
  ]);

  const setTaskEpic = async (taskId: string, epicId: string | null) => {
    try {
      const res = await fetch(`/api/production/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setEpic", epicId }),
      });
      if (!res.ok) throw new Error();
      messageApi.success(t("epicUpdated"));
      await fetchTasks();
      await fetchEpics();
    } catch {
      messageApi.error(t("epicUpdateError"));
    }
  };

  const handleAddDraft = async (productionDateKey: string) => {
    setCreatingDraft(true);
    try {
      const { start } = parseLocalDateKey(productionDateKey);
      const res = await fetch("/api/production/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          createDraft: true,
          taskType: "Production",
          productionDate: start.toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "draft failed");
      }
      await fetchTasks();
      await fetchEpics();
      if (data.task) {
        setEditTask(data.task as BoardTask);
        setEditorOpen(true);
      }
    } catch (e: unknown) {
      messageApi.error(e instanceof Error ? e.message : t("draftError"));
    } finally {
      setCreatingDraft(false);
    }
  };

  const openEditor = (task: BoardTask) => {
    setEditTask(task);
    setEditorOpen(true);
  };

  const handleCreateEpic = async () => {
    const title = newEpicTitle.trim();
    if (!title) {
      messageApi.warning(t("epicTitleRequired"));
      return;
    }
    setCreatingEpic(true);
    try {
      const res = await fetch("/api/production/epics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setNewEpicOpen(false);
      setNewEpicTitle("");
      messageApi.success(t("epicCreated"));
      await fetchEpics();
      if (created?._id) {
        setEpicFilter(created._id);
      }
    } catch {
      messageApi.error(t("epicCreateError"));
    } finally {
      setCreatingEpic(false);
    }
  };

  const todayColumns = useMemo(() => {
    const map: Record<BoardColumnId, BoardTask[]> = {
      todo: [],
      inProgress: [],
      readyToFinalize: [],
      done: [],
    };
    for (const task of tasks) {
      if (isDeliveryTask(task)) {
        continue;
      }
      const k = getTaskProductionDateKey(task);
      if (k !== todayKey) continue;
      const col = classifyTodayColumn(task);
      map[col].push(task);
    }
    return map;
  }, [tasks, todayKey]);

  const weekTasksByDay = useMemo(() => {
    const out: Record<string, BoardTask[]> = {};
    for (const dk of weekDayKeys) {
      out[dk] = [];
    }
    for (const task of tasks) {
      if (boardMode === "weekDeliveries" ? !isDeliveryTask(task) : isDeliveryTask(task)) {
        continue;
      }
      const dk = getTaskProductionDateKey(task);
      if (!dk || !out[dk]) continue;
      if (boardMode === "weekDeliveries" && classifyWeekColumn(task) === "done") continue;
      out[dk].push(task);
    }
    return out;
  }, [boardMode, tasks, weekDayKeys]);

  const weekDeliveriesSent = useMemo(() => {
    if (boardMode !== "weekDeliveries") return [];
    return tasks.filter((task) => isDeliveryTask(task) && classifyWeekColumn(task) === "done");
  }, [boardMode, tasks]);

  const dayShortLabels = useMemo(
    () => [
      t("daySun"),
      t("dayMon"),
      t("dayTue"),
      t("dayWed"),
      t("dayThu"),
    ],
    [t],
  );

  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--background-color)",
        }}
      >
        <Spin />
      </div>
    );
  }

  // TEMP: login gate disabled for board page.
  // if (!session) {
  //   return (
  //     <div style={{ padding: 24 }}>
  //       <Text>{t("signIn")}</Text>
  //     </div>
  //   );
  // }

  const isDark = theme === "dark";
  const columnBg = isDark ? "#1f1f1f" : "#ffffff";
  const columnBorder = isDark ? "#303030" : "#e5e7eb";

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "16px 16px 80px",
        background: "var(--background-color)",
      }}
    >
      {contextHolder}
      <div style={{ maxWidth: 1600, margin: "0 auto" }}>
        <Flex justify="space-between" align="flex-start" wrap="wrap" gap={12}>
          <Space orientation="vertical" size={4}>
            <BackButton onClick={() => router.push("/welcomePage")}>
              {t("back")}
            </BackButton>
            <Link href="/production/tasks">
              <Button type="link" icon={<UnorderedListOutlined />}>
                {t("openTasksList")}
              </Button>
            </Link>
          </Space>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => fetchTasks()}>
              {t("refresh")}
            </Button>
          </Space>
        </Flex>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleBoardDragStart}
          onDragCancel={handleBoardDragEndOrCancel}
          onDragEnd={(e) => {
            handleBoardDragEndOrCancel();
            void handleBoardDragEnd(e);
          }}
        >
          {isAdmin && (boardDragActive || deleteLoadingId !== null) ? (
            <Flex justify="center" style={{ width: "100%", marginBottom: 8 }}>
              <BoardTrashDropZone
                t={t}
                deleting={deleteLoadingId !== null}
                isDark={isDark}
              />
            </Flex>
          ) : null}

          <Title level={2} style={{ textAlign: "center", marginBottom: 16 }}>
            {t("pageTitle")}
          </Title>

        <Flex
          wrap="wrap"
          gap={12}
          justify="center"
          align="center"
          style={{ marginBottom: 16 }}
        >
          <Segmented
            value={boardMode}
            onChange={(v) => setBoardMode(v as "today" | "week" | "weekDeliveries")}
            options={[
              {
                label: (
                  <Space>
                    <AppstoreOutlined /> {t("modeToday")}
                  </Space>
                ),
                value: "today",
              },
              {
                label: (
                  <Space>
                    <CalendarOutlined /> {t("modeWeek")}
                  </Space>
                ),
                value: "week",
              },
              {
                label: (
                  <Space>
                    <CalendarOutlined /> {t("modeWeekDeliveries")}
                  </Space>
                ),
                value: "weekDeliveries",
              },
            ]}
          />
          <Select
            style={{ minWidth: 200 }}
            value={epicFilter}
            onChange={setEpicFilter}
            options={[
              { label: t("epicAll"), value: "all" },
              { label: t("epicNone"), value: "none" },
              ...epics.map((e) => ({ label: e.title, value: e._id })),
            ]}
          />
          <Button icon={<PlusOutlined />} onClick={() => setNewEpicOpen(true)}>
            {t("newEpic")}
          </Button>
        </Flex>

        {boardMode !== "today" && (
          <Flex justify="center" align="center" gap={8} style={{ marginBottom: 12 }}>
            <Button
              size="small"
              icon={<RightOutlined />}
              onClick={() => setWeekOffset((v) => v - 1)}
              aria-label={t("prevWeek")}
            />
            <Text type="secondary">{weekLabel}</Text>
            <Button
              size="small"
              icon={<LeftOutlined />}
              onClick={() => setWeekOffset((v) => v + 1)}
              aria-label={t("nextWeek")}
            />
          </Flex>
        )}

          <Spin spinning={loading}>
            {boardMode === "today" ? (
              <Flex gap={12} wrap="wrap" justify="center">
                {TODAY_COL_ORDER.map((colId) => (
                  <div
                    key={colId}
                    style={{
                      flex: "1 1 220px",
                      minWidth: 200,
                      maxWidth: 320,
                    }}
                  >
                    {colId === "todo" ? (
                      <Flex
                        justify="space-between"
                        align="center"
                        style={{ marginBottom: 8 }}
                      >
                        <Text strong>{t(`col_${colId}`)}</Text>
                        <Button
                          type="primary"
                          shape="circle"
                          size="small"
                          icon={<PlusOutlined />}
                          loading={creatingDraft}
                          onClick={() => handleAddDraft(todayKey)}
                          aria-label={t("addTask")}
                        />
                      </Flex>
                    ) : (
                      <Text strong style={{ display: "block", marginBottom: 8 }}>
                        {t(`col_${colId}`)}
                      </Text>
                    )}
                    <TaskColumnDropZone
                      droppableId={droppableIdToday(colId)}
                      disabled={colId === "done" && !isAdmin}
                    >
                      <div
                        style={{
                          background: columnBg,
                          border: `1px solid ${columnBorder}`,
                          borderRadius: 8,
                          minHeight: 280,
                          padding: 8,
                        }}
                      >
                        {todayColumns[colId].length === 0 ? (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={t("emptyColumn")}
                          />
                        ) : (
                          <Space orientation="vertical" style={{ width: "100%" }} size={8}>
                            {todayColumns[colId].map((task) => (
                              <DraggableTaskShell
                                key={task._id}
                                taskId={task._id}
                              >
                                <TaskCard
                                  task={task}
                                  epics={epics}
                                  onEpicChange={setTaskEpic}
                                  onEditClick={openEditor}
                                  t={t}
                                  readyQty={
                                    isAdmin &&
                                    colId === "readyToFinalize" &&
                                    task.taskType === "Production"
                                      ? {
                                          produced:
                                            boardQtyDraft[task._id]?.produced ??
                                            task.producedQuantity ??
                                            task.plannedQuantity ??
                                            0,
                                          defected:
                                            boardQtyDraft[task._id]?.defected ??
                                            task.defectedQuantity ??
                                            Math.max(
                                              0,
                                              (task.plannedQuantity ?? 0) -
                                                (boardQtyDraft[task._id]?.produced ??
                                                  task.producedQuantity ??
                                                  task.plannedQuantity ??
                                                  0),
                                            ),
                                          onProduced: (v) => {
                                            const next = Math.max(0, Number(v) || 0);
                                            const planned = task.plannedQuantity ?? 0;
                                            setBoardQtyDraft((p) => ({
                                              ...p,
                                              [task._id]: {
                                                produced: next,
                                                defected: Math.max(0, planned - next),
                                              },
                                            }));
                                          },
                                          onDefected: (v) => {
                                            const next = Math.max(0, Number(v) || 0);
                                            setBoardQtyDraft((p) => ({
                                              ...p,
                                              [task._id]: {
                                                produced:
                                                  p[task._id]?.produced ??
                                                  task.producedQuantity ??
                                                  task.plannedQuantity ??
                                                  0,
                                                defected: next,
                                              },
                                            }));
                                          },
                                        }
                                      : undefined
                                  }
                                />
                              </DraggableTaskShell>
                            ))}
                          </Space>
                        )}
                      </div>
                    </TaskColumnDropZone>
                  </div>
                ))}
              </Flex>
            ) : (
            <div style={{ paddingBottom: 8 }}>
              <Flex
                gap={boardMode === "weekDeliveries" ? 8 : 12}
                wrap={boardMode === "weekDeliveries" ? "nowrap" : "wrap"}
                justify="center"
              >
                {weekDayKeys.map((dk, idx) => (
                  <div
                    key={dk}
                    style={{
                      flex: boardMode === "weekDeliveries" ? "0 0 180px" : "1 1 260px",
                      minWidth: boardMode === "weekDeliveries" ? 170 : 240,
                      maxWidth: boardMode === "weekDeliveries" ? 200 : 320,
                    }}
                  >
                    <Text strong style={{ display: "block", marginBottom: 8 }}>
                      {dayShortLabels[idx]} · {dk}
                    </Text>
                    <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
                      {boardMode === "week" ? (
                        <Button
                          type="link"
                          size="small"
                          icon={<PlusOutlined />}
                          loading={creatingDraft}
                          onClick={() => handleAddDraft(dk)}
                        />
                      ) : null}
                    </Flex>
                    <TaskColumnDropZone droppableId={`${WEEK_DAY_DROP_PREFIX}${dk}`}>
                      <div
                        style={{
                          background: columnBg,
                          border: `1px solid ${columnBorder}`,
                          borderRadius: 8,
                          minHeight: boardMode === "weekDeliveries" ? 180 : 220,
                          padding: boardMode === "weekDeliveries" ? 4 : 6,
                        }}
                      >
                        {(weekTasksByDay[dk] ?? []).length === 0 ? (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            —
                          </Text>
                        ) : (
                          <Space orientation="vertical" style={{ width: "100%" }} size={6}>
                            {weekTasksByDay[dk].map((task) => (
                              <DraggableTaskShell key={task._id} taskId={task._id}>
                                <TaskCard
                                  task={task}
                                  epics={epics}
                                  compact
                                  weekOverview
                                  tiny={boardMode === "weekDeliveries"}
                                  onEpicChange={setTaskEpic}
                                  onEditClick={openEditor}
                                  t={t}
                                />
                              </DraggableTaskShell>
                            ))}
                          </Space>
                        )}
                      </div>
                    </TaskColumnDropZone>
                  </div>
                ))}
                {boardMode === "weekDeliveries" ? (
                  <div
                    style={{
                      flex: "0 0 180px",
                      minWidth: 170,
                      maxWidth: 200,
                    }}
                  >
                    <Text strong style={{ display: "block", marginBottom: 8 }}>
                      {t("week_sent")}
                    </Text>
                    <TaskColumnDropZone
                      droppableId={WEEK_DELIVERIES_SENT_DROP_ID}
                      disabled={!isAdmin}
                    >
                      <div
                        style={{
                          background: columnBg,
                          border: `1px solid ${columnBorder}`,
                          borderRadius: 8,
                          minHeight: 180,
                          padding: 4,
                        }}
                      >
                        {weekDeliveriesSent.length === 0 ? (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            —
                          </Text>
                        ) : (
                          <Space orientation="vertical" style={{ width: "100%" }} size={6}>
                            {weekDeliveriesSent.map((task) => (
                              <DraggableTaskShell key={task._id} taskId={task._id}>
                                <TaskCard
                                  task={task}
                                  epics={epics}
                                  compact
                                  weekOverview
                                  tiny
                                  onEpicChange={setTaskEpic}
                                  onEditClick={openEditor}
                                  t={t}
                                />
                              </DraggableTaskShell>
                            ))}
                          </Space>
                        )}
                      </div>
                    </TaskColumnDropZone>
                  </div>
                ) : null}
              </Flex>
            </div>
          )}
          </Spin>
        </DndContext>
      </div>

      <TaskEditorModal
        open={editorOpen}
        task={editTask}
        epics={epics}
        sessionUserId={employeeId}
        sessionRole={(session?.user as { role?: string })?.role ?? "user"}
        onClose={() => {
          setEditorOpen(false);
          setEditTask(null);
        }}
        onSaved={() => {
          fetchTasks();
          fetchEpics();
        }}
        t={t}
      />

      <Modal
        title={t("newEpic")}
        open={newEpicOpen}
        onCancel={() => {
          setNewEpicOpen(false);
          setNewEpicTitle("");
        }}
        onOk={handleCreateEpic}
        confirmLoading={creatingEpic}
        okText={t("create")}
      >
        <Input
          placeholder={t("epicTitlePlaceholder")}
          value={newEpicTitle}
          onChange={(e) => setNewEpicTitle(e.target.value)}
          onPressEnter={handleCreateEpic}
        />
      </Modal>

      <Modal
        title={t("finalizeTitle")}
        open={!!finalizeTask}
        onCancel={() => {
          if (finalizeSubmitting) return;
          setFinalizeTask(null);
          setFinalizeDateKey(null);
        }}
        onOk={submitFinalizeTask}
        okButtonProps={{ loading: finalizeSubmitting }}
        okText={t("finalizeSubmit")}
        cancelText={t("cancel")}
        destroyOnClose
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Text type="secondary">
            {t("finalizeCardInstruction", { title: finalizeTask ? taskTitle(finalizeTask) : "" })}
          </Text>
          <Text>
            {t("qty")}: {finalizeTask?.plannedQuantity ?? 0}
          </Text>
          {(finalizeTask?.taskType || "Production") === "Production" ? (
            <>
              <div>
                <Text style={{ display: "block", marginBottom: 6 }}>{t("producedQty")}</Text>
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  value={finalizeProduced}
                  onChange={(v) => {
                    const nextProduced = Math.max(0, Number(v) || 0);
                    const planned = finalizeTask?.plannedQuantity ?? 0;
                    setFinalizeProduced(nextProduced);
                    setFinalizeDefected(Math.max(0, planned - nextProduced));
                  }}
                />
              </div>
              <div>
                <Text style={{ display: "block", marginBottom: 6 }}>{t("defectedQty")}</Text>
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  value={finalizeDefected}
                  onChange={(v) => setFinalizeDefected(Math.max(0, Number(v) || 0))}
                />
              </div>
            </>
          ) : (
            <Text type="secondary">{t("finalizeNoQtyNeeded")}</Text>
          )}
        </Space>
      </Modal>
    </div>
  );
}

function BoardTrashDropZone({
  t,
  deleting,
  isDark,
}: {
  t: (key: string, values?: Record<string, string | number>) => string;
  deleting: boolean;
  isDark: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: BOARD_TRASH_DROP_ID });
  const borderColor = isOver
    ? "var(--ant-color-primary, #1677ff)"
    : isDark
      ? "#434343"
      : "#d9d9d9";
  return (
    <div
      ref={setNodeRef}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 80,
        minHeight: 52,
        padding: "6px 14px",
        borderRadius: 8,
        border: `2px dashed ${borderColor}`,
        background:
          isOver && !isDark
            ? "rgba(22, 119, 255, 0.08)"
            : isOver && isDark
              ? "rgba(22, 119, 255, 0.15)"
              : undefined,
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      {deleting ? (
        <Spin size="small" />
      ) : (
        <DeleteOutlined style={{ fontSize: 26, color: "#ff4d4f" }} />
      )}
      <Text type="secondary" style={{ fontSize: 11, marginTop: 4, textAlign: "center" }}>
        {t("boardTrashHint")}
      </Text>
    </div>
  );
}

function TaskColumnDropZone({
  droppableId,
  disabled,
  children,
}: {
  droppableId: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: droppableId, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: "100%",
        borderRadius: 8,
        transition: "outline 0.15s",
        outline:
          isOver && !disabled ? "2px dashed var(--ant-color-primary)" : undefined,
      }}
    >
      {children}
    </div>
  );
}

function DraggableTaskShell({
  taskId,
  children,
  dragDisabled,
}: {
  taskId: string;
  children: React.ReactNode;
  dragDisabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task:${taskId}`,
    disabled: dragDisabled,
  });
  const style: React.CSSProperties = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: dragDisabled ? "default" : "grab",
    touchAction: "none",
  };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
}

function TaskCard({
  task,
  epics,
  compact,
  weekOverview,
  tiny,
  readyQty,
  onEpicChange,
  onEditClick,
  t,
}: {
  task: BoardTask;
  epics: EpicRef[];
  compact?: boolean;
  weekOverview?: boolean;
  tiny?: boolean;
  readyQty?: {
    produced: number;
    defected: number;
    onProduced: (v: number | null) => void;
    onDefected: (v: number | null) => void;
  };
  onEpicChange: (taskId: string, epicId: string | null) => void;
  onEditClick: (task: BoardTask) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const openLog = hasOpenWorkLog(task);
  const column = classifyTodayColumn(task);
  const showReadyInlineQty = Boolean(readyQty);
  const isReadySummary =
    !weekOverview && column === "readyToFinalize" && !showReadyInlineQty;
  const showEpicSelect = !weekOverview && column !== "readyToFinalize";
  const [, setTimeTick] = useState(0);
  useEffect(() => {
    if (!openLog) return;
    const id = window.setInterval(() => setTimeTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [openLog, task._id]);

  const workedMs = totalWorkDurationMs(task, Date.now());
  const workedLabel = formatDurationCompact(workedMs);

  return (
    <Card
      size="small"
      onClick={() => onEditClick(task)}
      styles={{
        body: { padding: tiny ? 6 : 8, cursor: "pointer" },
      }}
    >
      <Space orientation="vertical" style={{ width: "100%" }} size={tiny ? 4 : 6}>
        <Text strong ellipsis style={{ display: "block", maxWidth: "100%" }}>
          {taskTitle(task)}
          {task.isDraft ? (
            <Tag style={{ marginInlineStart: 6 }} color="gold">
              {t("draftBadge")}
            </Tag>
          ) : null}
        </Text>
        {!weekOverview ? (
          <Space size={4} wrap>
            <Tag>{task.taskType || "—"}</Tag>
            {task.epic && typeof task.epic === "object" && "title" in task.epic && (
              <Tag color="blue">{(task.epic as EpicRef).title}</Tag>
            )}
          </Space>
        ) : null}
        <Flex justify="space-between" align="center" gap={8} style={{ width: "100%" }}>
          {!isReadySummary ? (
            <Text
              type="secondary"
              style={{ fontSize: tiny ? 10 : 11, flex: 1, minWidth: 0 }}
              ellipsis
            >
              {t("taskCreator")}: {formatUserMini(task.createdByUser)}
            </Text>
          ) : (
            <Text
              type="secondary"
              style={{ fontSize: tiny ? 10 : 11, flex: 1, minWidth: 0, color: "#1677ff" }}
              ellipsis
            >
              {t("readySummary")}
            </Text>
          )}
          <Text
            type="secondary"
            style={{ fontSize: tiny ? 10 : 11, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}
            aria-label={t("taskTimeWorkedAria")}
            title={t("taskTimeWorkedAria")}
          >
            {workedLabel}
          </Text>
        </Flex>
        {!weekOverview ? (
          <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
            {t("taskOwner")}: {formatUserMini(task.ownerUser)}
          </Text>
        ) : null}
        <Text type="secondary" style={{ fontSize: tiny ? 10 : 11, display: "block" }} ellipsis>
          {t("taskAssignees")}:{" "}
          {task.assigneeUsers?.length
            ? task.assigneeUsers.map(formatUserMini).join(", ")
            : "—"}
        </Text>
        {!compact && !weekOverview && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t("qty")}: {task.plannedQuantity ?? 0}
          </Text>
        )}
        {showReadyInlineQty && readyQty ? (
          <div
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Flex gap={8} wrap="wrap" style={{ width: "100%" }}>
              <div style={{ flex: "1 1 108px", minWidth: 0 }}>
                <Text type="secondary" style={{ fontSize: 10, display: "block", marginBottom: 2 }}>
                  {t("producedQty")}
                </Text>
                <InputNumber
                  min={0}
                  size="small"
                  style={{ width: "100%" }}
                  value={readyQty.produced}
                  onChange={(v) => readyQty.onProduced(v)}
                />
              </div>
              <div style={{ flex: "1 1 108px", minWidth: 0 }}>
                <Text type="secondary" style={{ fontSize: 10, display: "block", marginBottom: 2 }}>
                  {t("defectedQty")}
                </Text>
                <InputNumber
                  min={0}
                  size="small"
                  style={{ width: "100%" }}
                  value={readyQty.defected}
                  onChange={(v) => readyQty.onDefected(v)}
                />
              </div>
            </Flex>
          </div>
        ) : null}
        {showEpicSelect ? (
          <div
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Select
              size="small"
              style={{ width: "100%" }}
              placeholder={t("assignEpic")}
              allowClear
              value={epicSelectValue(task)}
              options={epics.map((e) => ({ label: e.title, value: e._id }))}
              onChange={(v) => onEpicChange(task._id, v ?? null)}
            />
          </div>
        ) : null}
      </Space>
    </Card>
  );
}
