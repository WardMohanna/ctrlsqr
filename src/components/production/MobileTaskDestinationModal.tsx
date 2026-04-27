"use client";

import { useState } from "react";
import { Modal, Button, Flex, Badge, Tooltip } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { type BoardColumnId, classifyTodayColumn } from "@/lib/productionBoard";

interface BoardTask {
  _id: string;
  status: string;
  taskType?: string;
  employeeWorkLogs?: Array<{
    employee: string;
    startTime: string;
    endTime?: string | null;
    accumulatedDuration?: number;
  }>;
  productionDate: string;
  product?: { _id: string; itemName: string };
  plannedQuantity: number;
  taskName?: string;
  customerName?: string;
  businessCustomerName?: string;
}

interface MobileTaskDestinationModalProps {
  open: boolean;
  task: BoardTask | null;
  boardMode: "today" | "week" | "month";
  currentColumn: BoardColumnId;
  currentDateKey: string;
  onSelect: (column: BoardColumnId, dateKey: string) => void;
  onCancel: () => void;
  todayKey: string;
  weekDayKeys: string[];
  monthDayKeys: string[];
  canMoveToDone: boolean;
  isRtl: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
}

const COLUMN_ICONS: Record<BoardColumnId, string> = {
  todo: "\uD83D\uDCCB", // 📋
  inProgress: "\u25B6\uFE0F", // ▶️
  readyToFinalize: "\u2705", // ✅
  done: "\uD83C\uDFC1", // 🏁
};

function getTaskTitle(task: BoardTask): string {
  if (task.taskType === "Production" && task.product?.itemName) {
    return task.product.itemName;
  }
  if (task.taskType === "CustomerOrder" && task.customerName?.trim()) {
    return task.customerName.trim();
  }
  if (task.taskType === "BusinessCustomer" && task.businessCustomerName?.trim()) {
    return task.businessCustomerName.trim();
  }
  return task.taskName || task.taskType || "Task";
}

function validateMove(
  task: BoardTask,
  currentColumn: BoardColumnId,
  targetColumn: BoardColumnId,
  canMoveToDone: boolean,
): { valid: boolean; reason?: string } {
  // Same column - no move needed
  if (currentColumn === targetColumn) {
    return { valid: false, reason: "sameColumn" };
  }

  // Can't move from readyToFinalize back to todo
  if (currentColumn === "readyToFinalize" && targetColumn === "todo") {
    return { valid: false, reason: "cannotMoveBackFromReady" };
  }

  // Can't move to done unless from readyToFinalize and has permission
  if (targetColumn === "done") {
    if (currentColumn !== "readyToFinalize") {
      return { valid: false, reason: "mustBeReadyToFinalize" };
    }
    if (!canMoveToDone) {
      return { valid: false, reason: "permissionRequired" };
    }
  }

  return { valid: true };
}

export function MobileTaskDestinationModal({
  open,
  task,
  boardMode,
  currentColumn,
  currentDateKey,
  onSelect,
  onCancel,
  todayKey,
  weekDayKeys,
  monthDayKeys,
  canMoveToDone,
  isRtl,
  t,
}: MobileTaskDestinationModalProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  if (!task) return null;

  const taskTitleText = getTaskTitle(task);

  // Column labels
  const columnLabels: Record<BoardColumnId, string> = {
    todo: t("column_todo") || "To Do",
    inProgress: t("column_inProgress") || "In Progress",
    readyToFinalize: t("column_readyToFinalize") || "Ready to Finalize",
    done: t("column_done") || "Done",
  };

  // Today mode: Just show 4 columns
  if (boardMode === "today") {
    return (
      <Modal
        open={open}
        onCancel={onCancel}
        footer={null}
        title={
          <Flex vertical gap={4}>
            <div style={{ fontSize: 14, fontWeight: "normal", opacity: 0.8 }}>
              {t("selectDestination") || "Select destination"}
            </div>
            <div style={{ fontSize: 16, fontWeight: "bold" }}>
              {taskTitleText}
            </div>
          </Flex>
        }
        centered
        width="90vw"
        styles={{
          body: { padding: "16px 12px" },
        }}
      >
        <Flex
          vertical
          gap={12}
          style={{
            direction: isRtl ? "rtl" : "ltr",
          }}
        >
          {(["todo", "inProgress", "readyToFinalize", "done"] as BoardColumnId[]).map(
            (col) => {
              const validation = validateMove(task, currentColumn, col, canMoveToDone);
              const isCurrent = currentColumn === col;
              const isValid = validation.valid;

              return (
                <Button
                  key={col}
                  size="large"
                  type={isCurrent ? "default" : isValid ? "primary" : "default"}
                  disabled={!isValid}
                  onClick={() => onSelect(col, currentDateKey)}
                  style={{
                    height: "auto",
                    minHeight: 56,
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    textAlign: isRtl ? "right" : "left",
                    border: isCurrent
                      ? "2px solid var(--ant-color-primary)"
                      : isValid
                        ? undefined
                        : "1px solid var(--ant-color-border)",
                    opacity: isValid || isCurrent ? 1 : 0.5,
                  }}
                >
                  <Flex align="center" gap={12}>
                    <span style={{ fontSize: 20 }}>{COLUMN_ICONS[col]}</span>
                    <Flex vertical align="start">
                      <div style={{ fontWeight: 600, fontSize: 15 }}>
                        {columnLabels[col]}
                      </div>
                      {isCurrent && (
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                          {t("currentLocation") || "Current"}
                        </div>
                      )}
                    </Flex>
                  </Flex>
                  {isCurrent ? (
                    <CheckCircleOutlined style={{ fontSize: 18 }} />
                  ) : !isValid ? (
                    <Tooltip title={t(validation.reason || "cannotMoveHere")}>
                      <InfoCircleOutlined style={{ fontSize: 18, opacity: 0.5 }} />
                    </Tooltip>
                  ) : null}
                </Button>
              );
            },
          )}
        </Flex>
        <Flex justify="center" style={{ marginTop: 16 }}>
          <Button onClick={onCancel} type="text">
            {t("cancel") || "Cancel"}
          </Button>
        </Flex>
      </Modal>
    );
  }

  // Week mode: First select day, then select column
  if (boardMode === "week") {
    // If no day selected yet, show day selector
    if (!selectedDay) {
      return (
        <Modal
          open={open}
          onCancel={() => {
            setSelectedDay(null);
            onCancel();
          }}
          footer={null}
          title={
            <Flex vertical gap={4}>
              <div style={{ fontSize: 14, fontWeight: "normal", opacity: 0.8 }}>
                {t("selectDay") || "Select day"}
              </div>
              <div style={{ fontSize: 16, fontWeight: "bold" }}>
                {taskTitleText}
              </div>
            </Flex>
          }
          centered
          width="90vw"
          styles={{
            body: { padding: "16px 12px" },
          }}
        >
          <Flex
            vertical
            gap={12}
            style={{
              direction: isRtl ? "rtl" : "ltr",
            }}
          >
            {weekDayKeys.map((dateKey) => {
              const isCurrent = dateKey === currentDateKey;
              const date = new Date(dateKey + "T12:00:00");
              const dayName = date.toLocaleDateString(isRtl ? "he-IL" : "en-US", {
                weekday: "short",
              });
              const dayMonth = date.toLocaleDateString(isRtl ? "he-IL" : "en-US", {
                month: "short",
                day: "numeric",
              });

              return (
                <Button
                  key={dateKey}
                  size="large"
                  type={isCurrent ? "default" : "primary"}
                  onClick={() => setSelectedDay(dateKey)}
                  style={{
                    height: "auto",
                    minHeight: 56,
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    textAlign: isRtl ? "right" : "left",
                    border: isCurrent
                      ? "2px solid var(--ant-color-primary)"
                      : undefined,
                  }}
                >
                  <Flex vertical align="start">
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{dayName}</div>
                    <div style={{ fontSize: 13, opacity: 0.7 }}>{dayMonth}</div>
                  </Flex>
                  {isCurrent && (
                    <Badge
                      count={t("currentLocation") || "Current"}
                      style={{
                        backgroundColor: "var(--ant-color-primary)",
                        fontSize: 11,
                      }}
                    />
                  )}
                </Button>
              );
            })}
          </Flex>
          <Flex justify="center" style={{ marginTop: 16 }}>
            <Button onClick={onCancel} type="text">
              {t("cancel") || "Cancel"}
            </Button>
          </Flex>
        </Modal>
      );
    }

    // Day selected, now show column selector
    return (
      <Modal
        open={open}
        onCancel={() => {
          setSelectedDay(null);
          onCancel();
        }}
        footer={null}
        title={
          <Flex vertical gap={4}>
            <div style={{ fontSize: 14, fontWeight: "normal", opacity: 0.8 }}>
              {t("selectDestination") || "Select destination"}
            </div>
            <div style={{ fontSize: 16, fontWeight: "bold" }}>
              {taskTitleText}
            </div>
            <Button
              type="link"
              size="small"
              onClick={() => setSelectedDay(null)}
              style={{
                padding: 0,
                height: "auto",
                fontSize: 12,
                textAlign: isRtl ? "right" : "left",
              }}
            >
              ← {t("changeDay") || "Change day"}
            </Button>
          </Flex>
        }
        centered
        width="90vw"
        styles={{
          body: { padding: "16px 12px" },
        }}
      >
        <Flex
          vertical
          gap={12}
          style={{
            direction: isRtl ? "rtl" : "ltr",
          }}
        >
          {(["todo", "inProgress", "readyToFinalize", "done"] as BoardColumnId[]).map(
            (col) => {
              const validation = validateMove(task, currentColumn, col, canMoveToDone);
              const isCurrent =
                currentColumn === col && currentDateKey === selectedDay;
              const isValid = validation.valid;

              return (
                <Button
                  key={col}
                  size="large"
                  type={isCurrent ? "default" : isValid ? "primary" : "default"}
                  disabled={!isValid}
                  onClick={() => {
                    onSelect(col, selectedDay);
                    setSelectedDay(null);
                  }}
                  style={{
                    height: "auto",
                    minHeight: 56,
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    textAlign: isRtl ? "right" : "left",
                    border: isCurrent
                      ? "2px solid var(--ant-color-primary)"
                      : isValid
                        ? undefined
                        : "1px solid var(--ant-color-border)",
                    opacity: isValid || isCurrent ? 1 : 0.5,
                  }}
                >
                  <Flex align="center" gap={12}>
                    <span style={{ fontSize: 20 }}>{COLUMN_ICONS[col]}</span>
                    <Flex vertical align="start">
                      <div style={{ fontWeight: 600, fontSize: 15 }}>
                        {columnLabels[col]}
                      </div>
                      {isCurrent && (
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                          {t("currentLocation") || "Current"}
                        </div>
                      )}
                    </Flex>
                  </Flex>
                  {isCurrent ? (
                    <CheckCircleOutlined style={{ fontSize: 18 }} />
                  ) : !isValid ? (
                    <Tooltip title={t(validation.reason || "cannotMoveHere")}>
                      <InfoCircleOutlined style={{ fontSize: 18, opacity: 0.5 }} />
                    </Tooltip>
                  ) : null}
                </Button>
              );
            },
          )}
        </Flex>
        <Flex justify="center" style={{ marginTop: 16 }}>
          <Button
            onClick={() => {
              setSelectedDay(null);
              onCancel();
            }}
            type="text"
          >
            {t("cancel") || "Cancel"}
          </Button>
        </Flex>
      </Modal>
    );
  }

  // Month mode: Similar to week mode (select day, then column)
  if (boardMode === "month") {
    // Month mode implementation (simplified for now - can use week mode logic)
    // For MVP, we can use similar approach to week mode
    if (!selectedDay) {
      return (
        <Modal
          open={open}
          onCancel={() => {
            setSelectedDay(null);
            onCancel();
          }}
          footer={null}
          title={
            <Flex vertical gap={4}>
              <div style={{ fontSize: 14, fontWeight: "normal", opacity: 0.8 }}>
                {t("selectDay") || "Select day"}
              </div>
              <div style={{ fontSize: 16, fontWeight: "bold" }}>
                {taskTitleText}
              </div>
            </Flex>
          }
          centered
          width="90vw"
          styles={{
            body: { padding: "16px 12px", maxHeight: "60vh", overflowY: "auto" },
          }}
        >
          <Flex
            wrap="wrap"
            gap={8}
            style={{
              direction: isRtl ? "rtl" : "ltr",
            }}
          >
            {monthDayKeys.map((dateKey) => {
              const isCurrent = dateKey === currentDateKey;
              const date = new Date(dateKey + "T12:00:00");
              const dayNum = date.getDate();

              return (
                <Button
                  key={dateKey}
                  size="middle"
                  type={isCurrent ? "primary" : "default"}
                  onClick={() => setSelectedDay(dateKey)}
                  style={{
                    width: "calc(14.28% - 8px)",
                    minWidth: 45,
                    height: 48,
                    padding: 4,
                  }}
                >
                  {dayNum}
                </Button>
              );
            })}
          </Flex>
          <Flex justify="center" style={{ marginTop: 16 }}>
            <Button onClick={onCancel} type="text">
              {t("cancel") || "Cancel"}
            </Button>
          </Flex>
        </Modal>
      );
    }

    // Column selector for month mode
    return (
      <Modal
        open={open}
        onCancel={() => {
          setSelectedDay(null);
          onCancel();
        }}
        footer={null}
        title={
          <Flex vertical gap={4}>
            <div style={{ fontSize: 14, fontWeight: "normal", opacity: 0.8 }}>
              {t("selectDestination") || "Select destination"}
            </div>
            <div style={{ fontSize: 16, fontWeight: "bold" }}>
              {taskTitleText}
            </div>
            <Button
              type="link"
              size="small"
              onClick={() => setSelectedDay(null)}
              style={{
                padding: 0,
                height: "auto",
                fontSize: 12,
                textAlign: isRtl ? "right" : "left",
              }}
            >
              ← {t("changeDay") || "Change day"}
            </Button>
          </Flex>
        }
        centered
        width="90vw"
        styles={{
          body: { padding: "16px 12px" },
        }}
      >
        <Flex
          vertical
          gap={12}
          style={{
            direction: isRtl ? "rtl" : "ltr",
          }}
        >
          {(["todo", "inProgress", "readyToFinalize", "done"] as BoardColumnId[]).map(
            (col) => {
              const validation = validateMove(task, currentColumn, col, canMoveToDone);
              const isCurrent =
                currentColumn === col && currentDateKey === selectedDay;
              const isValid = validation.valid;

              return (
                <Button
                  key={col}
                  size="large"
                  type={isCurrent ? "default" : isValid ? "primary" : "default"}
                  disabled={!isValid}
                  onClick={() => {
                    onSelect(col, selectedDay);
                    setSelectedDay(null);
                  }}
                  style={{
                    height: "auto",
                    minHeight: 56,
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    textAlign: isRtl ? "right" : "left",
                    border: isCurrent
                      ? "2px solid var(--ant-color-primary)"
                      : isValid
                        ? undefined
                        : "1px solid var(--ant-color-border)",
                    opacity: isValid || isCurrent ? 1 : 0.5,
                  }}
                >
                  <Flex align="center" gap={12}>
                    <span style={{ fontSize: 20 }}>{COLUMN_ICONS[col]}</span>
                    <Flex vertical align="start">
                      <div style={{ fontWeight: 600, fontSize: 15 }}>
                        {columnLabels[col]}
                      </div>
                      {isCurrent && (
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                          {t("currentLocation") || "Current"}
                        </div>
                      )}
                    </Flex>
                  </Flex>
                  {isCurrent ? (
                    <CheckCircleOutlined style={{ fontSize: 18 }} />
                  ) : !isValid ? (
                    <Tooltip title={t(validation.reason || "cannotMoveHere")}>
                      <InfoCircleOutlined style={{ fontSize: 18, opacity: 0.5 }} />
                    </Tooltip>
                  ) : null}
                </Button>
              );
            },
          )}
        </Flex>
        <Flex justify="center" style={{ marginTop: 16 }}>
          <Button
            onClick={() => {
              setSelectedDay(null);
              onCancel();
            }}
            type="text"
          >
            {t("cancel") || "Cancel"}
          </Button>
        </Flex>
      </Modal>
    );
  }

  return null;
}
