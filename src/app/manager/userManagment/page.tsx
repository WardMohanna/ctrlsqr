"use client";

import { useState, useEffect } from "react";
import { User } from "@/lib/types";
import { Table, Form, Input, Select, Button, Card, Space, Modal, message, Row, Col } from "antd";
import { UserAddOutlined, EditOutlined, DeleteOutlined, SaveOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

const { Option } = Select;

export default function ManageUsersPage() {
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
      const response = await fetch("/api/users");
      const data: User[] = await response.json();
      setUsers(data);
    } catch (error) {
      messageApi.error("Failed to load users");
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
        messageApi.success("User added successfully");
        addForm.resetFields();
        fetchUsers();
      } else {
        messageApi.error("Failed to add user");
      }
    } catch (error) {
      messageApi.error("Error adding user");
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
        messageApi.success("User updated successfully");
        setEditingUserId(null);
        fetchUsers();
      } else {
        messageApi.error("Failed to update user");
      }
    } catch (error) {
      messageApi.error("Error updating user");
    }
  };

  const handleDeleteClick = async (userId: string) => {
    Modal.confirm({
      title: "Are you sure you want to delete this user?",
      onOk: async () => {
        try {
          const response = await fetch(`/api/users/${userId}`, {
            method: "DELETE",
          });

          if (response.ok) {
            messageApi.success("User deleted successfully");
            fetchUsers();
          } else {
            messageApi.error("Failed to delete user");
          }
        } catch (error) {
          messageApi.error("Error deleting user");
        }
      },
    });
  };

  const columns: ColumnsType<User> = [
    {
      title: "Username",
      dataIndex: "userName",
      key: "userName",
    },
    {
      title: "First Name",
      dataIndex: "name",
      key: "name",
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
      title: "Last Name",
      dataIndex: "lastname",
      key: "lastname",
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
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (text, record) =>
        editingUserId === record.id ? (
          <Form.Item name="role" noStyle>
            <Select style={{ width: 120 }}>
              <Option value="user">User</Option>
              <Option value="admin">Admin</Option>
            </Select>
          </Form.Item>
        ) : (
          <span style={{ textTransform: "capitalize" }}>{text}</span>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) =>
        editingUserId === record.id ? (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              onClick={() => handleSaveClick(record.id)}
            >
              Save
            </Button>
            <Button size="small" onClick={() => setEditingUserId(null)}>
              Cancel
            </Button>
          </Space>
        ) : (
          <Space>
            <Button
              type="default"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditClick(record)}
            >
              Edit
            </Button>
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteClick(record.id)}
            >
              Delete
            </Button>
          </Space>
        ),
    },
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
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Card
            title={
              <div style={{ fontSize: "24px", fontWeight: "bold" }}>
                👥 User Management
              </div>
            }
            style={{
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
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
                    label="First Name"
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <Input placeholder="First Name" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item
                    name="lastname"
                    label="Last Name"
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <Input placeholder="Last Name" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item
                    name="password"
                    label="Password"
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <Input.Password placeholder="Password" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={4}>
                  <Form.Item
                    name="role"
                    label="Role"
                    initialValue="user"
                    rules={[{ required: true }]}
                  >
                    <Select>
                      <Option value="user">User</Option>
                      <Option value="admin">Admin</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={24} md={2} style={{ display: "flex", alignItems: "flex-end" }}>
                  <Form.Item style={{ marginBottom: 0, width: "100%" }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      block
                      icon={<UserAddOutlined />}
                    >
                      Add
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
                pagination={{ pageSize: 10 }}
              />
            </Form>
          </Card>
        </Space>
      </div>
    </div>
  );
}
