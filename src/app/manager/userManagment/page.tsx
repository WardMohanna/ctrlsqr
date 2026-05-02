"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { User } from "@/lib/types";
import { useTheme } from "@/hooks/useTheme";
import { useNavigateUp } from "@/hooks/useNavigateUp";
import BackButton from "@/components/BackButton";
import {
  Card,
  Col,
  Empty,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  Button,
  message,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  SaveOutlined,
  SearchOutlined,
  TeamOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useTranslations } from "next-intl";

const { Option } = Select;
const { Text: AntText, Title } = Typography;

const ROLE_COLORS: Record<string, string> = {
  admin: "blue",
  employee: "purple",
  super_admin: "red",
  user: "default",
  production_admin: "orange",
};

export default function ManageUsersPage() {
  const t = useTranslations("manager.userManagement");
  const { theme } = useTheme();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;
  const goUp = useNavigateUp();
  const { data: session } = useSession();
  const isSuperAdmin = (session?.user as any)?.role === "super_admin";
  const isProductionAdmin = (session?.user as any)?.role === "production_admin";
  const currentUserId = (session?.user as any)?.id as string | undefined;

  const [users, setUsers] = useState<User[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [passwordModalUserId, setPasswordModalUserId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [userLimit, setUserLimit] = useState<number | null>(null);
  const [quotaCount, setQuotaCount] = useState<number | null>(null);
  const [isUserNameCustomized, setIsUserNameCustomized] = useState(false);

  const [form] = Form.useForm();
  const [addForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const userCount = quotaCount ?? users.length;
  const remainingSeats = userLimit === null ? null : Math.max(userLimit - userCount, 0);
  const isUserLimitReached = userLimit !== null && userCount >= userLimit;
  const seatUsagePercent =
    userLimit === null ? 0 : Math.min(Math.round((userCount / userLimit) * 100), 100);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return users;

    return users.filter((user) =>
      [user.name, user.lastname, user.userName, user.role]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [searchTerm, users]);

  const adminCount = users.filter((user) => user.role === "admin").length;
  const employeeCount = users.filter((user) => user.role === "employee").length;

  const getRoleLabel = (role: string) => {
    if (role === "admin") return t("admin");
    if (role === "employee") return t("employee");
    if (role === "user") return t("user");
    if (role === "production_admin") return t("production_admin");
    return role;
  };

  const getInitials = (user: User) => {
    const initials = `${user.name?.charAt(0) ?? ""}${user.lastname?.charAt(0) ?? ""}`;
    return initials.toUpperCase() || "U";
  };

  const formatHourlyCost = (value?: number) => `₪${Number(value ?? 0).toFixed(2)}`;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/users", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load users");
      }

      const data: User[] = await response.json();
      const usersLimitHeader = response.headers.get("X-Users-Limit");
      const usersCountHeader = response.headers.get("X-Users-Count");
      const nextUserLimit = usersLimitHeader ? Number(usersLimitHeader) : null;
      const nextQuotaCount = usersCountHeader ? Number(usersCountHeader) : data.length;

      setUsers(Array.isArray(data) ? data : []);
      setUserLimit(Number.isFinite(nextUserLimit) ? nextUserLimit : null);
      setQuotaCount(Number.isFinite(nextQuotaCount) ? nextQuotaCount : data.length);
    } catch {
      messageApi.error(t("loadUsersError"));
    } finally {
      setLoading(false);
    }
  }, [messageApi, t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const generateUserName = (name?: string, lastname?: string): string => {
    const firstName = String(name ?? "").trim().toLowerCase();
    const lastName = String(lastname ?? "").trim().toLowerCase();

    if (!firstName && !lastName) return "";
    if (!firstName) return lastName;
    if (!lastName) return firstName;

    return `${firstName}.${lastName}`;
  };

  const openCreateModal = () => {
    if (isUserLimitReached) {
      messageApi.warning(t("userLimitReached"));
      return;
    }

    addForm.resetFields();
    setIsUserNameCustomized(false);
    setIsCreateModalOpen(true);
  };

  const handleAddUser = async (values: any) => {
    if (isUserLimitReached) {
      messageApi.warning(t("userLimitReached"));
      return;
    }

    const payload = { ...values };
    delete payload.confirmPassword;

    setCreating(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          userName: String(payload.userName ?? "").trim().toLowerCase(),
        }),
      });
      const data = await response.json().catch(() => null);

      if (response.ok) {
        messageApi.success(t("addUserSuccess"));
        addForm.resetFields();
        setIsCreateModalOpen(false);
        await fetchUsers();
      } else if (data?.code === "USER_LIMIT_REACHED") {
        if (Number.isFinite(Number(data.limit))) setUserLimit(Number(data.limit));
        if (Number.isFinite(Number(data.usersCount))) setQuotaCount(Number(data.usersCount));
        messageApi.error(
          Number.isFinite(Number(data.limit))
            ? t("userLimitReachedWithLimit", { limit: Number(data.limit) })
            : t("userLimitReached"),
        );
      } else {
        messageApi.error(data?.error ?? t("addUserError"));
      }
    } catch {
      messageApi.error(t("addUserError"));
    } finally {
      setCreating(false);
    }
  };

  const handleEditClick = (user: User) => {
    setEditingUserId(user.id);
    form.setFieldsValue({
      name: user.name,
      lastname: user.lastname,
      role: user.role,
      hourPrice: user.hourPrice ?? 0,
    });
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
        form.resetFields();
        fetchUsers();
      } else {
        const data = await response.json().catch(() => null);
        messageApi.error(data?.error ?? t("updateUserError"));
      }
    } catch (error: any) {
      messageApi.error(error.message || t("updateUserError"));
    }
  };

  const handleDeleteClick = async (userId: string) => {
    Modal.confirm({
      title: t("deleteConfirm"),
      okText: t("delete"),
      cancelText: t("cancel"),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const response = await fetch(`/api/users/${userId}`, {
            method: "DELETE",
          });

          if (response.ok) {
            messageApi.success(t("deleteSuccess"));
            fetchUsers();
          } else {
            const data = await response.json().catch(() => null);
            messageApi.error(data?.error ?? t("deleteError"));
          }
        } catch {
          messageApi.error(t("deleteError"));
        }
      },
    });
  };

  const handleChangePassword = async (values: { newPassword: string }) => {
    if (!passwordModalUserId) return;
    try {
      const res = await fetch(`/api/users/${passwordModalUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: values.newPassword }),
      });
      if (res.ok) {
        messageApi.success(t("changePasswordSuccess"));
        passwordForm.resetFields();
        setPasswordModalUserId(null);
      } else {
        const data = await res.json().catch(() => null);
        messageApi.error(data?.error ?? t("changePasswordError"));
      }
    } catch {
      messageApi.error(t("changePasswordError"));
    }
  };

  const columns: ColumnsType<User> = [
    {
      title: t("username"),
      key: "user",
      width: 280,
      render: (_, record) =>
        editingUserId === record.id ? (
          <div className="user-management-edit-name">
            <Form.Item
              name="name"
              rules={[{ required: true, message: t("required") }]}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder={t("firstName")} />
            </Form.Item>
            <Form.Item
              name="lastname"
              rules={[{ required: true, message: t("required") }]}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder={t("lastName")} />
            </Form.Item>
          </div>
        ) : (
          <Space size={12} className="user-management-user-cell">
            <span className="user-management-avatar">{getInitials(record)}</span>
            <span className="user-management-user-meta">
              <strong>{`${record.name} ${record.lastname}`}</strong>
              <AntText type="secondary">@{record.userName}</AntText>
            </span>
          </Space>
        ),
    },
    {
      title: t("role"),
      dataIndex: "role",
      key: "role",
      width: 150,
      render: (role, record) =>
        editingUserId === record.id ? (
          <Form.Item name="role" noStyle rules={[{ required: true, message: t("required") }]}>
            <Select style={{ width: 150 }} disabled={record.id === currentUserId}>
              <Option value="user">{t("user")}</Option>
              {isSuperAdmin && <Option value="admin">{t("admin")}</Option>}
              <Option value="employee">{t("employee")}</Option>
              <Option value="production_admin">{t("production_admin")}</Option>
            </Select>
          </Form.Item>
        ) : (
          <Tag color={ROLE_COLORS[role] ?? "default"}>{getRoleLabel(role)}</Tag>
        ),
    },
    {
      title: t("hourPrice"),
      dataIndex: "hourPrice",
      key: "hourPrice",
      width: 140,
      responsive: ["md"],
      render: (value, record) =>
        editingUserId === record.id ? (
          <Form.Item name="hourPrice" noStyle>
            <InputNumber min={0} step={0.01} style={{ width: 120 }} />
          </Form.Item>
        ) : (
          <AntText>{formatHourlyCost(value)}</AntText>
        ),
    },
    {
      title: t("actions"),
      key: "actions",
      width: isMobile ? 136 : 260,
      fixed: isMobile ? undefined : "right",
      render: (_, record) =>
        editingUserId === record.id ? (
          <Space size="small" wrap>
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              onClick={() => handleSaveClick(record.id)}
            >
              {isMobile ? null : t("save")}
            </Button>
            <Button size="small" onClick={() => setEditingUserId(null)}>
              {isMobile ? null : t("cancel")}
            </Button>
          </Space>
        ) : (
          <Space size="small" wrap>
            <Tooltip title={t("edit")}>
              <Button
                type="default"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditClick(record)}
              >
                {isMobile ? null : t("edit")}
              </Button>
            </Tooltip>
            <Tooltip title={t("changePassword")}>
              <Button
                size="small"
                icon={<KeyOutlined />}
                onClick={() => setPasswordModalUserId(record.id)}
                disabled={record.id === currentUserId}
              >
                {isMobile ? null : t("changePassword")}
              </Button>
            </Tooltip>
            <Tooltip title={t("delete")}>
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteClick(record.id)}
                disabled={record.id === currentUserId || (isProductionAdmin && record.role === "admin")}
              >
                {isMobile ? null : t("delete")}
              </Button>
            </Tooltip>
          </Space>
        ),
    },
  ];

  return (
    <div className="user-management-page" data-user-management-theme={theme}>
      {contextHolder}
      <div className="user-management-shell">
        <BackButton onClick={goUp}>{t("back")}</BackButton>

        <section className="user-management-hero">
          <div className="user-management-title-row">
            <span className="user-management-title-icon">
              <TeamOutlined />
            </span>
            <div>
              <Title level={1} className="user-management-title">
                {t("pageTitle")}
              </Title>
            </div>
          </div>

          <div className="user-management-actions">
            <Input
              allowClear
              className="user-management-search"
              prefix={<SearchOutlined />}
              placeholder={t("searchPlaceholder")}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <Tooltip title={isUserLimitReached ? t("userLimitReached") : undefined}>
              <span>
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={openCreateModal}
                  disabled={isUserLimitReached}
                >
                  {t("addUser")}
                </Button>
              </span>
            </Tooltip>
          </div>
        </section>

        <section className="user-management-stat-grid">
          <div className="user-management-stat">
            <span>{t("totalUsers")}</span>
            <strong>{userCount}</strong>
          </div>
          <div className="user-management-stat">
            <span>{t("admins")}</span>
            <strong>{adminCount}</strong>
          </div>
          <div className="user-management-stat">
            <span>{t("employees")}</span>
            <strong>{employeeCount}</strong>
          </div>
          <div className={`user-management-stat user-management-seat-stat${isUserLimitReached ? " is-limit" : ""}`}>
            <span>{t("seatUsage")}</span>
            <strong>
              {userLimit === null ? t("unlimitedSeats") : `${userCount}/${userLimit}`}
            </strong>
            {userLimit !== null && (
              <>
                <Progress
                  percent={seatUsagePercent}
                  showInfo={false}
                  status={isUserLimitReached ? "exception" : "active"}
                  size="small"
                />
                <AntText type={isUserLimitReached ? "danger" : "secondary"}>
                  {isUserLimitReached
                    ? t("userLimitReached")
                    : t("seatsRemaining", { count: remainingSeats ?? 0 })}
                </AntText>
              </>
            )}
          </div>
        </section>

        <Card
          className="user-management-card"
          title={
            <Space>
              <TeamOutlined />
              <span>{t("usersList")}</span>
            </Space>
          }
          extra={
            <AntText>
              {filteredUsers.length}/{users.length}
            </AntText>
          }
        >
          <Form form={form} component={false}>
            <Table
              columns={columns}
              dataSource={filteredUsers}
              rowKey="id"
              loading={loading}
              size={isMobile ? "small" : "middle"}
              scroll={{ x: 760 }}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={t("noUsers")}
                  />
                ),
              }}
            />
          </Form>
        </Card>
      </div>

      <Modal
        open={isCreateModalOpen}
        title={
          <Space>
            <UserAddOutlined />
            {t("createUser")}
          </Space>
        }
        onCancel={() => {
          addForm.resetFields();
          setIsUserNameCustomized(false);
          setIsCreateModalOpen(false);
        }}
        footer={null}
        width={640}
        destroyOnHidden
      >
        {userLimit !== null && (
          <div className={`user-management-modal-quota${isUserLimitReached ? " is-limit" : ""}`}>
            <span>{t("seatUsage")}</span>
            <strong>{`${userCount}/${userLimit}`}</strong>
          </div>
        )}

        <Form
          form={addForm}
          onFinish={handleAddUser}
          onValuesChange={(changedValues, allValues) => {
            if (Object.prototype.hasOwnProperty.call(changedValues, "userName")) {
              setIsUserNameCustomized(true);
              return;
            }

            if (
              !isUserNameCustomized &&
              (Object.prototype.hasOwnProperty.call(changedValues, "name") ||
                Object.prototype.hasOwnProperty.call(changedValues, "lastname"))
            ) {
              addForm.setFieldValue(
                "userName",
                generateUserName(allValues.name, allValues.lastname),
              );
            }
          }}
          layout="vertical"
          autoComplete="off"
          initialValues={{ role: "user", hourPrice: 0, userName: "" }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="name"
                label={t("firstName")}
                rules={[{ required: true, message: t("required") }]}
              >
                <Input placeholder={t("firstName")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="lastname"
                label={t("lastName")}
                rules={[{ required: true, message: t("required") }]}
              >
                <Input placeholder={t("lastName")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="userName"
                label={t("username")}
                rules={[{ required: true, message: t("required") }]}
                normalize={(value) => String(value ?? "").trim().toLowerCase()}
              >
                <Input addonBefore="@" placeholder="first.last" autoComplete="username" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="password"
                label={t("password")}
                rules={[
                  { required: true, message: t("required") },
                  { min: 6, message: t("passwordMinLength") },
                ]}
              >
                <Input.Password placeholder={t("password")} autoComplete="new-password" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="confirmPassword"
                label={t("confirmPassword")}
                dependencies={["password"]}
                rules={[
                  { required: true, message: t("required") },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error(t("passwordMismatch")));
                    },
                  }),
                ]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="role"
                label={t("role")}
                rules={[{ required: true, message: t("required") }]}
              >
                <Select>
                  <Option value="user">{t("user")}</Option>
                  {isSuperAdmin && <Option value="admin">{t("admin")}</Option>}
                  <Option value="employee">{t("employee")}</Option>
                  <Option value="production_admin">{t("production_admin")}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="hourPrice"
                label={t("hourPrice")}
                rules={[{ required: true, message: t("required") }]}
              >
                <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item style={{ marginBottom: 0, textAlign: "end" }}>
            <Space>
              <Button onClick={() => setIsCreateModalOpen(false)}>{t("cancel")}</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={creating}
                icon={<UserAddOutlined />}
                disabled={isUserLimitReached}
              >
                {t("createUser")}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={passwordModalUserId !== null}
        title={t("changePassword")}
        onCancel={() => {
          passwordForm.resetFields();
          setPasswordModalUserId(null);
        }}
        onOk={() => passwordForm.submit()}
        okText={t("save")}
        cancelText={t("cancel")}
        destroyOnHidden
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
          autoComplete="off"
        >
          <Form.Item
            name="newPassword"
            label={t("newPassword")}
            rules={[
              { required: true, message: t("required") },
              { min: 6, message: t("passwordMinLength") },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label={t("confirmPassword")}
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: t("required") },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t("passwordMismatch")));
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
