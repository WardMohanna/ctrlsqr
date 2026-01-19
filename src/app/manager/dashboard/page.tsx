"use client";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { Card, Row, Col, Statistic, Table, Tag, Space } from "antd";
import { CheckCircleOutlined, ClockCircleOutlined, WarningOutlined, DollarOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

const fetcher = (url:string)=>fetch(url).then(r=>r.json());

export default function ManagerDashboard() {
  const t = useTranslations("manager.dashboard");
  const { data: kpis } = useSWR("/api/dashboard/kpis", fetcher, { refreshInterval: 15000 });
  const { data: tasks } = useSWR("/api/dashboard/tasks?status[]=Pending&status[]=InProgress&limit=30", fetcher, { refreshInterval: 15000 });
  const { data: low }   = useSWR("/api/dashboard/low-stock?limit=25", fetcher, { refreshInterval: 60000 });
  const { data: inv }   = useSWR("/api/dashboard/recent-invoices?limit=10", fetcher);
  const { data: qual }  = useSWR("/api/dashboard/quality-trend?days=14", fetcher);

  return (
    <div style={{ padding: "24px", background: "#f0f2f5", minHeight: "calc(100vh - 64px)" }}>
      <Space orientation="vertical" size="large" style={{ width: "100%" }}>
        {/* KPI cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t("openTasks")}
                value={kpis?.tasks.open ?? 0}
                prefix={<CheckCircleOutlined />}
                styles={{ content: { color: "#1677ff" } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t("inProgress")}
                value={kpis?.tasks.inProgress ?? 0}
                prefix={<ClockCircleOutlined />}
                styles={{ content: { color: "#52c41a" } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t("lowStockItems")}
                value={kpis?.lowStockCount ?? 0}
                prefix={<WarningOutlined />}
                styles={{ content: { color: "#ff4d4f" } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t("invoicesThisWeek")}
                value={kpis?.invoicesThisWeek?.totalNis?.toFixed(2) ?? 0}
                prefix={<DollarOutlined />}
                precision={2}
                styles={{ content: { color: "#faad14" } }}
              />
            </Card>
          </Col>
        </Row>

        {/* Two-column layout */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Card title={t("activeTasks")} style={{ height: "100%" }}>
              <TaskList tasks={tasks ?? []} t={t} />
            </Card>
          </Col>

          <Col xs={24} lg={16}>
            <Card title={t("lowInventory")} style={{ height: "100%" }}>
              <LowStockTable rows={low ?? []} t={t} />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Card title={t("recentInvoices")} style={{ height: "100%" }}>
              <InvoiceList rows={inv ?? []} t={t} />
            </Card>
          </Col>

          <Col xs={24} lg={16}>
            <Card title={t("qualityTrend")} style={{ height: "100%" }}>
              <QualityMiniChart data={qual ?? []} t={t} />
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
}
function TaskList({tasks, t}:{tasks:any[], t:any}) {
  if (!tasks || tasks.length === 0) {
    return <div style={{ color: "#999", textAlign: "center", padding: "20px" }}>{t("noTasks")}</div>;
  }

  return (
    <Space orientation="vertical" style={{ width: "100%" }} size="small">
      {tasks.map(task=>(
        <div key={task._id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
          <span>{task.taskName}</span>
          <Tag color="blue">{task.producedQuantity}/{task.plannedQuantity}</Tag>
        </div>
      ))}
    </Space>
  );
}

function LowStockTable({rows, t}:{rows:any[], t:any}) {
  const columns: ColumnsType<any> = [
    {
      title: t("item"),
      dataIndex: "itemName",
      key: "itemName",
    },
    {
      title: t("qty"),
      dataIndex: "quantity",
      key: "quantity",
      align: "right",
    },
    {
      title: t("min"),
      dataIndex: "minQuantity",
      key: "minQuantity",
      align: "right",
    },
    {
      title: t("delta"),
      key: "delta",
      align: "right",
      render: (_:any, record:any) => {
        const delta = (record.quantity ?? 0) - (record.minQuantity ?? 0);
        const color = delta <= 0 ? "red" : delta <= (record.minQuantity*0.25) ? "orange" : "green";
        return <Tag color={color}>{delta}</Tag>;
      },
    },
    {
      title: t("action"),
      key: "action",
      align: "right",
      render: (_:any, record:any) => (
        <a href={`/inventory/receive?itemId=${record._id}`} style={{ color: "#1677ff" }}>
          {t("order")}
        </a>
      ),
    },
  ];

  return <Table columns={columns} dataSource={rows} rowKey="_id" pagination={false} size="small" />;
}

function InvoiceList({rows, t}:{rows:any[], t:any}) {
  if (rows.length === 0) {
    return <div style={{ color: "#999", textAlign: "center", padding: "20px" }}>{t("noInvoices")}</div>;
  }

  return (
    <Space orientation="vertical" style={{ width: "100%" }} size="small">
      {rows.map((r:any)=>(
        <div key={r._id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
          <span>{r.supplier}</span>
          <Tag color="green">₪{Number(r.totalNis || 0).toFixed(2)}</Tag>
        </div>
      ))}
    </Space>
  );
}

function QualityMiniChart({data, t}:{data:any[], t:any}) {
  if (!data || data.length === 0) {
    return <div style={{ color: "#999", textAlign: "center", padding: "20px" }}>{t("noData")}</div>;
  }

  const max = Math.max(...data.map(d=>d.passRate||0));
  return (
    <div style={{ display: "flex", gap: "4px", height: "150px", alignItems: "flex-end" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              width: "100%",
              height: `${(d.passRate/max)*100}%`,
              backgroundColor: "#1677ff",
              borderRadius: "4px 4px 0 0",
            }}
          />
          <div style={{ fontSize: "10px", marginTop: "4px", color: "#999" }}>
            {d.date}
          </div>
        </div>
      ))}
    </div>
  );
}
