"use client";

import { useState, useEffect } from "react";
import { User } from "@/lib/types";
import { useTheme } from "@/hooks/useTheme";
import { useNavigateUp } from "@/hooks/useNavigateUp";
import BackButton from "@/components/BackButton";
import {
  Table,
  Form,
  Input,
  Select,
  Button,
  Card,
  Space,
  Modal,
  message,
  Row,
  Col,
  Grid,
  Typography,
} from "antd";
import {
  UserAddOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useTranslations } from "next-intl";

const { Option } = Select;
const { Text: AntText } = Typography;

export default function ManageUsersPage() {
  const t = useTranslations("manager.userManagement");
  const { theme } = useTheme();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;
  const goUp = useNavigateUp();
  const [users, setUsers] = useState<User[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [addForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/users", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });
      const data: User[] = await response.json();
      setUsers(data);
    } catch (error) {
      messageApi.error(t("loadUsersError"));
    } finally {
      setLoading(false);
    }
  };

  const generateUserName = (name: string, lastname: string): string => {
    return `${name.toLowerCase()}.${lastname.toLowerCase()}`;
  };

  const handleAddUser = async (values: any) => {
    const userName = generateUserName(values.name, values.lastname);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, userName }),
      });

      if (response.ok) {
        messageApi.success(t("addUserSuccess"));
        addForm.resetFields();
        fetchUsers();
      } else {
        messageApi.error(t("addUserError"));
      }
    } catch (error) {
      messageApi.error(t("addUserError"));
    }
  };

  const handleEditClick = (user: User) => {
    setEditingUserId(user.id);
    form.setFieldsValue(user);
  };

  const handleSaveClick = async (userId: string) => {
    try {
      const values = await form.validateFields();
      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        messageApi.success(t("updateUserSuccess"));
        setEditingUserId(null);
        fetchUsers();
      } else {
        messageApi.error(t("updateUserError"));
      }
    } catch (error: any) {
      messageApi.error(error.message || t("updateUserError"));
    }
  };

  const handleDeleteClick = async (userId: string) => {
    Modal.confirm({
      title: t("deleteConfirm"),
      onOk: async () => {
        try {
          const response = await fetch(`/api/users/${userId}`, {
            method: "DELETE",
          });

          if (response.ok) {
            messageApi.success(t("deleteSuccess"));
            fetchUsers();
          } else {
            messageApi.error(t("deleteError"));
          }
        } catch (error) {
          messageApi.error(t("deleteError"));
        }
      },
    });
  };

  const columns: ColumnsType<User> = [
    {
      title: t("username"),
      dataIndex: "userName",
      key: "userName",
      width: 140,
    },
    {
      title: t("firstName"),
      dataIndex: "name",
      key: "name",
      width: 140,
      render: (text, record) =>
        editingUserId === record.id ? (
          <Form.Item name="name" noStyle>
            <Input />
          </Form.Item>
        ) : (
          text
        ),
    },
    {
      title: t("lastName"),
      dataIndex: "lastname",
      key: "lastname",
      width: 140,
      responsive: ["sm"],
      render: (text, record) =>
        editingUserId === record.id ? (
          <Form.Item name="lastname" noStyle>
            <Input />
          </Form.Item>
        ) : (
          text
        ),
    },
    {
      title: "Password",
      key: "password",
      width: 120,
      responsive: ["md"],
      render: (_, record) =>
        editingUserId === record.id ? (
          <Form.Item name="password" noStyle>
            <Input.Password placeholder="Leave empty to keep current" />
          </Form.Item>
        ) : (
          <AntText type="secondary">••••••••</AntText>
        ),
    },
    {
      title: t("role"),
      dataIndex: "role",
      key: "role",
      width: 140,
      responsive: ["sm"],
      render: (text, record) =>
        editingUserId === record.id ? (
          <Form.Item name="role" noStyle>
            <Select style={{ width: 140 }}>
              <Option value="user">{t("user")}</Option>
              <Option value="admin">{t("admin")}</Option>
              <Option value="employee">{t("employee")}</Option>
            </Select>
          </Form.Item>
        ) : (
          <span style={{ textTransform: "capitalize" }}>
            {text === "admin"
              ? t("admin")
              : text === "user"
                ? t("user")
                : text === "employee"
                  ? t("employee")
                  : text}
          </span>
        ),
    },
    {
      title: t("hourPrice") || "Hourly Cost",
      dataIndex: "hourPrice",
      key: "hourPrice",
      width: 120,
      responsive: ["md"],
      render: (text, record) =>
        editingUserId === record.id ? (
          <Form.Item name="hourPrice" noStyle>
            <Input type="number" step="0.01" />
          </Form.Item>
        ) : (
          <AntText>{record.hourPrice ? `$${record.hourPrice.toFixed(2)}` : "$0.00"}</AntText>
        ),
    },
    {
      title: t("actions"),
      key: "actions",
      width: isMobile ? 108 : 190,
      render: (_, record) =>
        editingUserId === record.id ? (
          <Space size="small">
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              onClick={() => handleSaveClick(record.id)}
            >
              {isMobile ? "" : t("save")}
            </Button>
            <Button size="small" onClick={() => setEditingUserId(null)}>
              {isMobile ? "" : t("cancel")}
            </Button>
          </Space>
        ) : (
          <Space size="small">
            <Button
              type="default"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditClick(record)}
            >
              {isMobile ? "" : t("edit")}
            </Button>
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteClick(record.id)}
            >
              {isMobile ? "" : t("delete")}
            </Button>
          </Space>
        ),
    },
  ];

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        background: theme === "dark" ? "#1f1f1f" : "#ffffff",
        padding: "24px",
      }}
    >
      {contextHolder}
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <BackButton onClick={goUp}>{t("back")}</BackButton>

          <Card
            title={
              <div style={{ fontSize: "24px", fontWeight: "bold" }}>
                👥 {t("pageTitle")}
              </div>
            }
            style={{
              borderRadius: "12px",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Form
              form={addForm}
              onFinish={handleAddUser}
              layout="vertical"
              style={{ marginBottom: "24px" }}
            >
              <Row gutter={16}>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item
                    name="name"
                    label={t("firstName")}
                    rules={[{ required: true, message: t("required") }]}
                  >
                    <Input placeholder={t("firstName")} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item
                    name="lastname"
                    label={t("lastName")}
                    rules={[{ required: true, message: t("required") }]}
                  >
                    <Input placeholder={t("lastName")} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item
                    name="password"
                    label={t("password")}
                    rules={[{ required: true, message: t("required") }]}
                  >
                    <Input.Password placeholder={t("password")} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={4}>
                  <Form.Item
                    name="hourPrice"
                    label={t("hourPrice") || "Hourly Cost"}
                    initialValue={0}
                    rules={[{ required: true, message: t("required") }]}
                  >
                    <Input type="number" placeholder="0" step="0.01" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={4}>
                  <Form.Item
                    name="role"
                    label={t("role")}
                    initialValue="user"
                    rules={[{ required: true }]}
                  >
                    <Select>
                      <Option value="user">{t("user")}</Option>
                      <Option value="admin">{t("admin")}</Option>
                      <Option value="employee">{t("employee")}</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col
                  xs={24}
                  sm={24}
                  md={2}
                  style={{ display: "flex", alignItems: "flex-end" }}
                >
                  <Form.Item style={{ marginBottom: 0, width: "100%" }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      block
                      icon={<UserAddOutlined />}
                    >
                      {t("add")}
                    </Button>
                  </Form.Item>
                </Col>
              </Row>
            </Form>

            <Form form={form}>
              <Table
                columns={columns}
                dataSource={users}
                rowKey="id"
                loading={loading}
                size={isMobile ? "small" : "middle"}
                scroll={{ x: 720 }}
                pagination={{ pageSize: 10 }}
              />
            </Form>
          </Card>
        </Space>
      </div>
    </div>
  );
}
