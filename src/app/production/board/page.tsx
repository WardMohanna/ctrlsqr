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
} from "@ant-design/icons";
import BackButton from "@/components/BackButton";
import { TaskEditorModal } from "@/components/production/TaskEditorModal";
import {
  BOARD_COLUMN_ORDER,
  classifyTodayColumn,
  classifyWeekColumn,
  droppableIdToday,
  droppableIdWeek,
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
}

const TODAY_COL_ORDER = BOARD_COLUMN_ORDER;
const WEEK_COL_ORDER = BOARD_COLUMN_ORDER;

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

  const [boardMode, setBoardMode] = useState<"today" | "week">("today");
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

  const todayKey = useMemo(() => toLocalDateKey(new Date()), []);

  const weekDayKeys = useMemo(() => getSunThroughThuKeys(new Date()), []);

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
      const parsed = parseBoardDroppableId(String(over.id));
      if (!parsed) return;
      const task = tasks.find((x) => x._id === taskId);
      if (!task) return;

      const dateKey =
        parsed.mode === "week" && parsed.dateKey
          ? parsed.dateKey
          : todayKey;

      const currentCol =
        boardMode === "today"
          ? classifyTodayColumn(task)
          : classifyWeekColumn(task);
      const currentDayKey = getTaskProductionDateKey(task);
      if (currentCol === parsed.column && currentDayKey === dateKey) {
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
      fetchTasks,
      executeDeleteTask,
      isAdmin,
      messageApi,
      tasks,
      todayKey,
      t,
    ],
  );

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
      const k = getTaskProductionDateKey(task);
      if (k !== todayKey) continue;
      const col = classifyTodayColumn(task);
      map[col].push(task);
    }
    return map;
  }, [tasks, todayKey]);

  const weekByDay = useMemo(() => {
    const out: Record<string, Record<BoardColumnId, BoardTask[]>> = {};
    for (const dk of weekDayKeys) {
      out[dk] = {
        todo: [],
        inProgress: [],
        readyToFinalize: [],
        done: [],
      };
    }
    for (const task of tasks) {
      const dk = getTaskProductionDateKey(task);
      if (!dk || !out[dk]) continue;
      const col = classifyWeekColumn(task);
      out[dk][col].push(task);
    }
    return out;
  }, [tasks, weekDayKeys]);

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

  if (!session) {
    return (
      <div style={{ padding: 24 }}>
        <Text>{t("signIn")}</Text>
      </div>
    );
  }

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
            onChange={(v) => setBoardMode(v as "today" | "week")}
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

        {boardMode === "week" && (
          <Text
            type="secondary"
            style={{ display: "block", textAlign: "center", marginBottom: 12 }}
          >
            {weekLabel}
          </Text>
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
            <div style={{ overflowX: "auto", paddingBottom: 8 }}>
              <Flex gap={12} wrap="nowrap" style={{ minWidth: "min-content" }}>
                {weekDayKeys.map((dk, idx) => (
                  <div
                    key={dk}
                    style={{
                      flex: "0 0 260px",
                      minWidth: 240,
                    }}
                  >
                    <Text strong style={{ display: "block", marginBottom: 8 }}>
                      {dayShortLabels[idx]} · {dk}
                    </Text>
                    <Space orientation="vertical" style={{ width: "100%" }} size={10}>
                      {WEEK_COL_ORDER.map((wc) => (
                        <div key={wc}>
                          <Flex
                            justify="space-between"
                            align="center"
                            style={{ marginBottom: 4 }}
                          >
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {t(`week_${wc}`)}
                            </Text>
                            {wc === "todo" && (
                              <Button
                                type="link"
                                size="small"
                                icon={<PlusOutlined />}
                                loading={creatingDraft}
                                onClick={() => handleAddDraft(dk)}
                              />
                            )}
                          </Flex>
                          <TaskColumnDropZone
                            droppableId={droppableIdWeek(dk, wc)}
                            disabled={wc === "done" && !isAdmin}
                          >
                            <div
                              style={{
                                background: columnBg,
                                border: `1px solid ${columnBorder}`,
                                borderRadius: 8,
                                minHeight: 120,
                                padding: 6,
                              }}
                            >
                              {(weekByDay[dk]?.[wc] ?? []).length === 0 ? (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  —
                                </Text>
                              ) : (
                                <Space
                                  orientation="vertical"
                                  style={{ width: "100%" }}
                                  size={6}
                                >
                                  {weekByDay[dk][wc].map((task) => (
                                    <DraggableTaskShell
                                      key={task._id}
                                      taskId={task._id}
                                    >
                                      <TaskCard
                                        task={task}
                                        epics={epics}
                                        compact
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
                    </Space>
                  </div>
                ))}
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
  onEpicChange,
  onEditClick,
  t,
}: {
  task: BoardTask;
  epics: EpicRef[];
  compact?: boolean;
  onEpicChange: (taskId: string, epicId: string | null) => void;
  onEditClick: (task: BoardTask) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const openLog = hasOpenWorkLog(task);
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
        body: { padding: compact ? 8 : 8, cursor: "pointer" },
      }}
    >
      <Space orientation="vertical" style={{ width: "100%" }} size={6}>
        <Text strong ellipsis style={{ display: "block", maxWidth: "100%" }}>
          {taskTitle(task)}
          {task.isDraft ? (
            <Tag style={{ marginInlineStart: 6 }} color="gold">
              {t("draftBadge")}
            </Tag>
          ) : null}
        </Text>
        <Space size={4} wrap>
          <Tag>{task.taskType || "—"}</Tag>
          {task.epic && typeof task.epic === "object" && "title" in task.epic && (
            <Tag color="blue">{(task.epic as EpicRef).title}</Tag>
          )}
        </Space>
        <Flex justify="space-between" align="center" gap={8} style={{ width: "100%" }}>
          <Text
            type="secondary"
            style={{ fontSize: 11, flex: 1, minWidth: 0 }}
            ellipsis
          >
            {t("taskCreator")}: {formatUserMini(task.createdByUser)}
          </Text>
          <Text
            type="secondary"
            style={{ fontSize: 11, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}
            aria-label={t("taskTimeWorkedAria")}
            title={t("taskTimeWorkedAria")}
          >
            {workedLabel}
          </Text>
        </Flex>
        <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
          {t("taskOwner")}: {formatUserMini(task.ownerUser)}
        </Text>
        <Text type="secondary" style={{ fontSize: 11, display: "block" }} ellipsis>
          {t("taskAssignees")}:{" "}
          {task.assigneeUsers?.length
            ? task.assigneeUsers.map(formatUserMini).join(", ")
            : "—"}
        </Text>
        {!compact && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t("qty")}: {task.plannedQuantity ?? 0}
          </Text>
        )}
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
      </Space>
    </Card>
  );
}
