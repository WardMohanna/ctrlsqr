"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import {
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
  FileTextOutlined,
} from "@ant-design/icons";
import PopupModal from "@/components/popUpModule";

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
  const t = useTranslations("production.tasks");
  const { data: session, status } = useSession();
  const [allTasks, setAllTasks] = useState<ProductionTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [messageApi, contextHolder] = message.useMessage();

  // Fetch tasks from the server
  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/production/tasks");
      const data: ProductionTask[] = await res.json();
      setAllTasks(data);
    } catch (err) {
      console.error(err);
      setError(t("errorFetchingTasks"));
      messageApi.error(t("errorFetchingTasks"));
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  if (status === "loading")
    return (
      <div
        style={{
          padding: "24px",
          background: "#f0f2f5",
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text>Loading...</Text>
      </div>
    );

  if (!session)
    return (
      <div
        style={{
          padding: "24px",
          background: "#f0f2f5",
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text>Please sign in to view tasks.</Text>
      </div>
    );

  const employeeId = session.user.id as string;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  // 2) collect the IDs of every task whose productionDate is _before_ today
  const expiredIds = new Set(
    allTasks
      .filter((t) => new Date(t.productionDate) < todayStart)
      .map((t) => t._id)
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
        (typeof log.endTime === "undefined" || log.endTime === null)
    );
  }

  // --------------------------
  // Server-Side Task Handling
  // --------------------------

  // Start or reopen a task
  const handleCardClick = async (task: ProductionTask) => {
    const action = task.employeeWorkLogs.some(
      (log) => log.employee === employeeId
    )
      ? "reopen"
      : "start";
    const label = action === "start" ? "Start" : "Reopen";
    const displayName =
      task.taskType === "Production"
        ? task.product?.itemName
        : task.taskName || t("task");

    Modal.confirm({
      title: `${label} ${t("workingOn")} "${displayName}"?`,
      onOk: async () => {
        try {
          const res = await fetch(`/api/production/tasks/${task._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ employee: employeeId, action }),
          });
          if (!res.ok) {
            throw new Error(`${t("errorActionTask", { action })}`);
          }
          messageApi.success(`${label} task successfully`);
          fetchTasks();
        } catch (err: any) {
          console.error(err);
          setError(err.message);
          messageApi.error(err.message);
        }
      },
    });
  };

  // Stop an active task
  const handleStop = async (task: ProductionTask) => {
    const displayName =
      task.taskType === "Production"
        ? task.product?.itemName
        : task.taskName || t("task");

    Modal.confirm({
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
          messageApi.success("Task stopped successfully");
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
    Modal.confirm({
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
          messageApi.success("Task unclaimed successfully");
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
    taskUpdates: Record<string, { produced: number; defected: number }>
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
        })
      );
      await Promise.all(updatePromises);

      // Finalize tasks.
      const taskIds = myTasks.map((t) => t._id);
      const finalizeRes = await fetch("/api/production/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds }),
      });
      if (!finalizeRes.ok) {
        const errorText = await finalizeRes.text();
        try {
          const errorJson = JSON.parse(errorText);
          messageApi.error(t("errorFinalizingTasks", { error: errorJson.error }));
        } catch (parseError) {
          messageApi.error(t("errorFinalizingTasks", { error: errorText || `Server Error: ${finalizeRes.status}` }));
        }
      } else {
        messageApi.success(t("summaryApproved"));
      }
      // Now, save the report for the current user.
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
          messageApi.error(t("errorGeneratingReport", { error: errorJson.error }));
        } catch (parseError) {
          console.error("Error generating report:", errorText || `Server Error: ${reportRes.status}`);
          messageApi.error(t("errorGeneratingReport", { error: errorText || `Server Error: ${reportRes.status}` }));
        }
      } else {
        console.log("Report generated successfully");
      }
      // Redirect to welcomePage after successful summary approval
      router.push("/welcomePage");
    } catch (err: any) {
      console.error(err);
      messageApi.error(t("errorFinalizingTasks", { error: err.message }));
    }
    setShowSummaryModal(false);
    fetchTasks();
  }

  // Create a constant task on the server
  const handleConstantTaskClick = async (task: {
    taskType: string;
    taskName: string;
  }) => {
    Modal.confirm({
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
            t("errorCreatingConstantTask", { error: err.message })
          );
        }
      },
    });
  };

  return (
    <div style={{ padding: "24px", background: "#f0f2f5", minHeight: "100vh" }}>
      {contextHolder}
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <Space style={{ marginBottom: "24px" }} size="middle">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
            {t("back")}
          </Button>

          <Button
            type="primary"
            icon={<FileTextOutlined />}
            onClick={handleEndAndSummarize}
          >
            {t("endAndSummarize")}
          </Button>
        </Space>

        <Title level={2} style={{ textAlign: "center", marginBottom: "32px" }}>
          {t("pageTitle")}
        </Title>

        {/* Constant Tasks Section */}
        <Card
          title={
            <Text strong style={{ fontSize: "16px" }}>
              {t("constantTasksTitle")}
            </Text>
          }
          style={{ marginBottom: "24px" }}
        >
          <Row gutter={[16, 16]}>
            {[
              {
                taskType: "Cleaning",
                taskName: t("cleaningTask"),
                color: "#1890ff",
              },
              {
                taskType: "Packaging",
                taskName: t("packagingTask"),
                color: "#52c41a",
              },
              { taskType: "Break", taskName: t("breakTask"), color: "#faad14" },
              {
                taskType: "Selling",
                taskName: t("sellingTask"),
                color: "#13c2c2",
              },
            ].map((task) => (
              <Col xs={24} sm={12} md={6} key={task.taskType}>
                <Card
                  hoverable
                  style={{
                    background: task.color,
                    borderColor: task.color,
                    textAlign: "center",
                  }}
                  onClick={() => handleConstantTaskClick(task)}
                >
                  <Space orientation="vertical" align="center">
                    <PlusOutlined style={{ fontSize: "24px", color: "#fff" }} />
                    <Text strong style={{ color: "#fff" }}>
                      {task.taskName}
                    </Text>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        {/* Task Pool Section */}
        <Card
          title={
            <Text strong style={{ fontSize: "16px" }}>
              {t("taskPoolTitle")}
            </Text>
          }
          extra={<Text type="secondary">{t("taskPoolInfo")}</Text>}
          style={{ marginBottom: "24px" }}
        >
          {pool.length === 0 ? (
            <Text type="secondary">{t("noTasksInPool")}</Text>
          ) : (
            <Row gutter={[16, 16]}>
              {pool.map((task, i) => (
                <Col xs={24} sm={12} md={8} lg={6} key={task._id}>
                  <Card
                    hoverable
                    style={{
                      background: pastelColors[i % pastelColors.length],
                      borderColor: pastelColors[i % pastelColors.length],
                    }}
                    onClick={() => handleCardClick(task)}
                  >
                    <Space orientation="vertical" style={{ width: "100%" }}>
                      <Text strong style={{ fontSize: "14px" }}>
                        {task.taskType === "Production"
                          ? task.product?.itemName
                          : task.taskName}
                      </Text>
                      <Text>
                        {t("quantityLabel")}: {task.plannedQuantity}
                      </Text>
                      <Text type="secondary">
                        {new Date(task.productionDate).toLocaleDateString()}
                      </Text>
                      <Tag color={getStatusColor(task.status)}>
                        {translateStatus(task.status)}
                      </Tag>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card>

        {/* My Tasks Section */}
        <Card
          title={
            <Text strong style={{ fontSize: "16px" }}>
              {t("myTasksTitle")}
            </Text>
          }
          extra={<Text type="secondary">{t("myTasksInfo")}</Text>}
        >
          {myTasks.length === 0 ? (
            <Text type="secondary">{t("noTasksYet")}</Text>
          ) : (
            <Table
              dataSource={myTasks}
              rowKey="_id"
              pagination={false}
              columns={[
                {
                  title: t("taskLabel"),
                  dataIndex: "product",
                  key: "task",
                  render: (product, record) => (
                    <Text strong>
                      {record.taskType === "Production"
                        ? product?.itemName
                        : record.taskName}
                    </Text>
                  ),
                },
                {
                  title: t("quantityLabel"),
                  dataIndex: "plannedQuantity",
                  key: "quantity",
                  width: 120,
                },
                {
                  title: t("dateLabel"),
                  dataIndex: "productionDate",
                  key: "date",
                  width: 150,
                  render: (date) => new Date(date).toLocaleDateString(),
                },
                {
                  title: t("activeLabel"),
                  key: "active",
                  width: 100,
                  render: (_, record) => (
                    <Tag color={isRecordingNow(record) ? "green" : "default"}>
                      {isRecordingNow(record) ? t("yes") : t("no")}
                    </Tag>
                  ),
                },
                {
                  title: t("actionsLabel"),
                  key: "actions",
                  width: 200,
                  render: (_, record) => {
                    const active = isRecordingNow(record);
                    return (
                      <Space>
                        {active ? (
                          <>
                            <Tooltip title={t("stop")}>
                              <Button
                                danger
                                icon={<StopOutlined />}
                                onClick={() => handleStop(record)}
                              >
                                {t("stop")}
                              </Button>
                            </Tooltip>
                            <Tooltip title={t("delete")}>
                              <Button
                                icon={<DeleteOutlined />}
                                onClick={() => handleUnclaimTask(record)}
                              />
                            </Tooltip>
                          </>
                        ) : (
                          <>
                            <Tooltip title={t("reopen")}>
                              <Button
                                type="primary"
                                icon={<PlayCircleOutlined />}
                                onClick={() => handleCardClick(record)}
                              >
                                {t("reopen")}
                              </Button>
                            </Tooltip>
                            <Tooltip title={t("delete")}>
                              <Button
                                icon={<DeleteOutlined />}
                                onClick={() => handleUnclaimTask(record)}
                              />
                            </Tooltip>
                          </>
                        )}
                      </Space>
                    );
                  },
                },
              ]}
            />
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

// Translate status to Hebrew
const translateStatus = (statusValue: string) => {
  const statusMap: { [key: string]: string } = {
    Pending: "ממתין",
    InProgress: "בתהליך",
    Completed: "הושלם",
    Cancelled: "בוטל",
  };
  return statusMap[statusValue] || statusValue;
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
    taskUpdates: Record<string, { produced: number; defected: number }>
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
      const prod = (t as any).producedQuantity ?? 0;
      const def = (t as any).defectedQuantity ?? 0;
      init[t._id] = { produced: prod, defected: def };
    });
    setTaskQuantities(init);
  }, [tasks]);

  const handleChange = (
    taskId: string,
    field: "produced" | "defected",
    value: number
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
    }
    setTaskQuantities((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], [field]: value },
    }));
  };

  const handleConfirmed = () => {
    if (!confirmState) return;
    setTaskQuantities((prev) => ({
      ...prev,
      [confirmState.taskId]: {
        ...prev[confirmState.taskId],
        produced: confirmState.newValue,
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
