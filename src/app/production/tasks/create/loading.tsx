"use client";

import { Skeleton, Card, Space } from "antd";

export default function Loading() {
  return (
    <div style={{ minHeight: "calc(100vh - 64px)", padding: "24px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Skeleton.Button active style={{ width: 80 }} />
          <Card
            style={{
              borderRadius: "12px",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        </Space>
      </div>
    </div>
  );
}
