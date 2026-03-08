"use client";

import { Card, Typography, Form, Input, Button, Space } from "antd";
import {
  MailOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";

const { Title, Paragraph, Text } = Typography;

type SupportFormValues = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export default function SupportPage() {
  const [form] = Form.useForm<SupportFormValues>();

  const handleSubmit = (values: SupportFormValues) => {
    const body = [
      `Name: ${values.name}`,
      `Email: ${values.email}`,
      "",
      values.message,
    ].join("\n");

    const mailtoUrl = `mailto:support@lachocolita.com?subject=${encodeURIComponent(
      values.subject,
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoUrl;
  };

  return (
    <div style={{ maxWidth: 980, margin: "24px auto", padding: "0 16px" }}>
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Card style={{ borderRadius: 14 }}>
          <Title level={2} style={{ marginTop: 0 }}>
            Support
          </Title>
          <Paragraph style={{ marginBottom: 16 }}>
            Need help with CtrlSqr? Contact our support team using the details
            below or send us a message.
          </Paragraph>

          <Space orientation="vertical" size={10} style={{ width: "100%" }}>
            <Text>
              <MailOutlined style={{ marginInlineEnd: 8 }} />
              support@lachocolita.com
            </Text>
            <Text>
              <PhoneOutlined style={{ marginInlineEnd: 8 }} />
              +972-50-000-0000
            </Text>
            <Text>
              <ClockCircleOutlined style={{ marginInlineEnd: 8 }} />
              Sunday - Thursday, 09:00 - 18:00
            </Text>
          </Space>
        </Card>

        <Card style={{ borderRadius: 14 }}>
          <Title level={4} style={{ marginTop: 0 }}>
            Send Email
          </Title>

          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              label="Full Name"
              name="name"
              rules={[{ required: true, message: "Please enter your name" }]}
            >
              <Input placeholder="Your name" />
            </Form.Item>

            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: "Please enter your email" },
                { type: "email", message: "Enter a valid email" },
              ]}
            >
              <Input placeholder="you@example.com" />
            </Form.Item>

            <Form.Item
              label="Subject"
              name="subject"
              rules={[{ required: true, message: "Please enter a subject" }]}
            >
              <Input placeholder="How can we help?" />
            </Form.Item>

            <Form.Item
              label="Message"
              name="message"
              rules={[{ required: true, message: "Please enter your message" }]}
            >
              <Input.TextArea rows={6} placeholder="Type your message..." />
            </Form.Item>

            <Button type="primary" htmlType="submit" icon={<MailOutlined />}>
              Open Email Draft
            </Button>
          </Form>
        </Card>
      </Space>
    </div>
  );
}
