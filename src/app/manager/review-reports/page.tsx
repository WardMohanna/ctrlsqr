"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Typography,
  message,
  Tabs,
  Descriptions,
  Collapse,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ArrowLeftOutlined,
  EditOutlined,
} from "@ant-design/icons";
import BackButton from "@/components/BackButton";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

interface TaskCompleted {
  taskId: string;
  taskName: string;
  productName?: string;
  quantityProduced: number;
  quantityDefected: number;
  timeWorked: number;
  startTime: Date;
  endTime: Date;
}

interface TimeAdjustment {
  taskId: string;
  originalTime: number;
  adjustedTime: number;
  reason: string;
}

interface EmployeeReport {
  _id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  tasksCompleted: TaskCompleted[];
  totalTimeWorked: number;
  approvedBy?: string;
  approvedAt?: Date;
  managerNotes?: string;
  adjustedTimeWorked?: number;
  timeAdjustments?: TimeAdjustment[];
  createdAt: Date;
  updatedAt: Date;
}

export default function ReviewEmployeeReportsPage() {
  const router = useRouter();
  const t = useTranslations("manager.reviewReports");
  const [reports, setReports] = useState<EmployeeReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<EmployeeReport | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState<string>("pending");

  useEffect(() => {
    fetchReports(activeTab);
  }, [activeTab]);

  const fetchReports = async (status?: string) => {
    setLoading(true);
    try {
      const query = status && status !== 'all' ? `?status=${status}` : '';
      const res = await fetch(`/api/employee-reports${query}`);
      if (!res.ok) throw new Error("Failed to fetch reports");
      const data = await res.json();
      setReports(data.reports);
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      messageApi.error(t("errorLoading"));
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const handleReviewClick = (report: EmployeeReport) => {
    setSelectedReport(report);
    setShowReviewModal(true);
    reviewForm.setFieldsValue({
      managerNotes: report.managerNotes || '',
      timeAdjustments: report.tasksCompleted.map(task => ({
        taskId: task.taskId,
        taskName: task.taskName,
        originalTime: task.timeWorked,
        adjustedTime: report.timeAdjustments?.find(adj => adj.taskId === task.taskId)?.adjustedTime || task.timeWorked,
        reason: report.timeAdjustments?.find(adj => adj.taskId === task.taskId)?.reason || '',
      }))
    });
  };

  const handleApprove = async (status: 'approved' | 'rejected') => {
    if (!selectedReport) return;

    try {
      const values = await reviewForm.validateFields();
      const timeAdjustments = values.timeAdjustments
        ?.filter((adj: any) => adj.adjustedTime !== adj.originalTime)
        .map((adj: any) => ({
          taskId: adj.taskId,
          originalTime: adj.originalTime,
          adjustedTime: adj.adjustedTime,
          reason: adj.reason || t("defaultAdjustmentReason"),
        }));

      const res = await fetch('/api/employee-reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReport._id,
          status,
          managerNotes: values.managerNotes,
          timeAdjustments,
        }),
      });

      if (!res.ok) throw new Error("Failed to update report");

      messageApi.success(
        status === 'approved' 
          ? t("approveSuccess") 
          : t("rejectSuccess")
      );
      setShowReviewModal(false);
      setSelectedReport(null);
      reviewForm.resetFields();
      fetchReports(activeTab);
    } catch (error: any) {
      console.error("Error updating report:", error);
      messageApi.error(t("errorUpdating"));
    }
  };

  const columns: ColumnsType<EmployeeReport> = [
    {
      title: t("date"),
      dataIndex: "date",
      key: "date",
      render: (date: string) => dayjs(date).format("DD/MM/YYYY"),
      sorter: (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    },
    {
      title: t("employeeName"),
      dataIndex: "employeeName",
      key: "employeeName",
    },
    {
      title: t("tasksCount"),
      key: "tasksCount",
      render: (_, record) => record.tasksCompleted.length,
    },
    {
      title: t("totalTime"),
      key: "totalTime",
      render: (_, record) => formatDuration(record.adjustedTimeWorked || record.totalTimeWorked),
    },
    {
      title: t("status"),
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const config = {
          pending: { color: "warning", icon: <ClockCircleOutlined />, text: t("pending") },
          approved: { color: "success", icon: <CheckCircleOutlined />, text: t("approved") },
          rejected: { color: "error", icon: <CloseCircleOutlined />, text: t("rejected") },
        };
        const { color, icon, text } = config[status as keyof typeof config];
        return <Tag color={color} icon={icon}>{text}</Tag>;
      },
    },
    {
      title: t("actions"),
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleReviewClick(record)}
            disabled={record.status !== 'pending'}
          >
            {t("review")}
          </Button>
        </Space>
      ),
    },
  ];

  const tabItems = [
    { key: 'pending', label: `${t("pending")} (${reports.filter(r => r.status === 'pending').length})` },
    { key: 'approved', label: t("approved") },
    { key: 'rejected', label: t("rejected") },
    { key: 'all', label: t("all") },
  ];

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "24px",
      }}
    >
      {contextHolder}
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <BackButton onClick={() => router.push("/manager")}>
            {t("back")}
          </BackButton>

          <Card
            style={{
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Title level={2}>{t("pageTitle")}</Title>
            <Text type="secondary">{t("pageDescription")}</Text>

            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
              style={{ marginTop: 24 }}
            />

            <Table
              columns={columns}
              dataSource={reports}
              rowKey="_id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Space>
      </div>

      {/* Review Modal */}
      <Modal
        title={`${t("reviewReport")} - ${selectedReport?.employeeName}`}
        open={showReviewModal}
        onCancel={() => {
          setShowReviewModal(false);
          setSelectedReport(null);
          reviewForm.resetFields();
        }}
        width={900}
        footer={[
          <Button key="cancel" onClick={() => setShowReviewModal(false)}>
            {t("cancel")}
          </Button>,
          <Button
            key="reject"
            danger
            onClick={() => handleApprove('rejected')}
          >
            {t("reject")}
          </Button>,
          <Button
            key="approve"
            type="primary"
            onClick={() => handleApprove('approved')}
          >
            {t("approve")}
          </Button>,
        ]}
      >
        {selectedReport && (
          <Form form={reviewForm} layout="vertical">
            <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label={t("date")}>
                {dayjs(selectedReport.date).format("DD/MM/YYYY")}
              </Descriptions.Item>
              <Descriptions.Item label={t("employee")}>
                {selectedReport.employeeName}
              </Descriptions.Item>
              <Descriptions.Item label={t("totalTime")}>
                {formatDuration(selectedReport.totalTimeWorked)}
              </Descriptions.Item>
              <Descriptions.Item label={t("tasksCompleted")}>
                {selectedReport.tasksCompleted.length}
              </Descriptions.Item>
            </Descriptions>

            <Title level={5}>{t("tasks")}</Title>
            <Collapse style={{ marginBottom: 24 }}>
              {selectedReport.tasksCompleted.map((task, index) => (
                <Panel
                  header={`${task.taskName} ${task.productName ? `- ${task.productName}` : ''}`}
                  key={task.taskId}
                >
                  <Descriptions bordered column={2} size="small">
                    <Descriptions.Item label={t("produced")}>
                      {task.quantityProduced}
                    </Descriptions.Item>
                    <Descriptions.Item label={t("defected")}>
                      {task.quantityDefected}
                    </Descriptions.Item>
                    <Descriptions.Item label={t("originalTime")}>
                      {formatDuration(task.timeWorked)}
                    </Descriptions.Item>
                  </Descriptions>

                  <Form.Item
                    label={t("adjustedTime")}
                    name={['timeAdjustments', index, 'adjustedTime']}
                    style={{ marginTop: 16 }}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      addonAfter="ms"
                      formatter={(value) => formatDuration(value || 0)}
                    />
                  </Form.Item>

                  <Form.Item
                    label={t("adjustmentReason")}
                    name={['timeAdjustments', index, 'reason']}
                  >
                    <Input placeholder={t("reasonPlaceholder")} />
                  </Form.Item>

                  <Form.Item name={['timeAdjustments', index, 'taskId']} hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item name={['timeAdjustments', index, 'taskName']} hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item name={['timeAdjustments', index, 'originalTime']} hidden>
                    <InputNumber />
                  </Form.Item>
                </Panel>
              ))}
            </Collapse>

            <Form.Item
              label={t("managerNotes")}
              name="managerNotes"
            >
              <TextArea rows={4} placeholder={t("notesPlaceholder")} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
