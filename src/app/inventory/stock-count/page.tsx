"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Card,
  Form,
  Button,
  Collapse,
  Checkbox,
  InputNumber,
  Space,
  Spin,
  Alert,
  Table,
  message,
} from "antd";
import { SaveOutlined, ArrowLeftOutlined, ArrowRightOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

const { Panel } = Collapse;

interface InventoryItem {
  _id: string;
  itemName: string;
  category: string;
  quantity: number;
  unit?: string;
}

interface CountRow extends InventoryItem {
  doCount: boolean;
  newCount: number;
}

interface CategoryGroup {
  category: string;
  items: CountRow[];
}

export default function StockCountAccordion() {
  const router = useRouter();
  // Store initial state for change detection
  const initialGroupsRef = useRef<CategoryGroup[] | null>(null);
  // Track if there are changes
  const [hasChanges, setHasChanges] = useState(false);
  const t = useTranslations("inventory.stockcount");
  const tAdd = useTranslations("inventory.add");

  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loadedCategories, setLoadedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const [messageApi, contextHolder] = message.useMessage();

  // Load only category list initially
  useEffect(() => {
    fetch("/api/inventory?fields=category")
      .then((res) => res.json())
      .then((data: InventoryItem[]) => {
        const uniqueCategories = Array.from(new Set(data.map(item => item.category))).sort();
        setCategories(uniqueCategories);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading categories:", err);
        setError(t("errorLoadingInventory"));
        setLoading(false);
      });
  }, [t]);

  // Load items for a specific category when accordion opens
  const loadCategoryItems = (category: string) => {
    if (loadedCategories.has(category)) return;

    fetch(`/api/inventory?category=${category}&fields=_id,itemName,category,quantity,unit,sku`)
      .then((res) => res.json())
      .then((data: InventoryItem[]) => {
        const rows: CountRow[] = data.map((item) => ({
          ...item,
          doCount: false,
          newCount: item.quantity,
        }));

        rows.sort((a, b) => a.itemName.localeCompare(b.itemName));

        setGroups((prevGroups) => {
          const newGroups = [...prevGroups];
          const existingIndex = newGroups.findIndex(g => g.category === category);
          
          const newGroup = { category, items: rows };
          
          if (existingIndex >= 0) {
            newGroups[existingIndex] = newGroup;
          } else {
            newGroups.push(newGroup);
          }
          
          // Save to initial state for change detection
          if (!initialGroupsRef.current) {
            initialGroupsRef.current = JSON.parse(JSON.stringify(newGroups));
          } else {
            const initialCopy = [...initialGroupsRef.current];
            const initialIndex = initialCopy.findIndex(g => g.category === category);
            if (initialIndex >= 0) {
              initialCopy[initialIndex] = JSON.parse(JSON.stringify(newGroup));
            } else {
              initialCopy.push(JSON.parse(JSON.stringify(newGroup)));
            }
            initialGroupsRef.current = initialCopy;
          }
          
          return newGroups;
        });

        setLoadedCategories(prev => new Set([...prev, category]));
      })
      .catch((err) => {
        console.error(`Error loading category ${category}:`, err);
        messageApi.error(t("errorLoadingInventory"));
      });
  };

  // Handle accordion change
  const handleAccordionChange = (keys: string | string[]) => {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    setActiveKeys(keyArray);
    
    // Load data for newly opened categories
    keyArray.forEach(key => {
      if (!loadedCategories.has(key)) {
        loadCategoryItems(key);
      }
    });
  };

  const handleSubmit = () => {
    const allCounted: { _id: string; newCount: number }[] = [];
    for (const group of groups) {
      for (const row of group.items) {
        if (row.doCount) {
          allCounted.push({ _id: row._id, newCount: row.newCount });
        }
      }
    }

    if (allCounted.length === 0) {
      messageApi.error(t("errorNoCountItems"));
      return;
    }

    fetch("/api/inventory/stock-count", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(allCounted),
    })
      .then((res) => {
        if (!res.ok) throw new Error(t("errorUpdatingStockCount"));
        return res.json();
      })
      .then(() => {
        messageApi.success(t("stockCountUpdatedSuccess"));
        // Redirect to welcome page after short delay
        setTimeout(() => {
          router.push("/mainMenu");
        }, 800);
      })
      .catch((err) => {
        console.error("Error updating stock count:", err);
        messageApi.error(t("errorUpdatingStockCount"));
      });
  };

  const handleCheckboxChange = (groupCategory: string, itemId: string, checked: boolean) => {
    setGroups((prevGroups) => {
      const newGroups = prevGroups.map((group) => {
        if (group.category === groupCategory) {
          return {
            ...group,
            items: group.items.map((item) =>
              item._id === itemId ? { ...item, doCount: checked } : item
            ),
          };
        }
        return group;
      });
      return newGroups;
    });
  };

  const handleNewCountChange = (groupCategory: string, itemId: string, value: number | null) => {
    setGroups((prevGroups) => {
      const newGroups = prevGroups.map((group) => {
        if (group.category === groupCategory) {
          return {
            ...group,
            items: group.items.map((item) =>
              item._id === itemId ? { ...item, newCount: value || 0 } : item
            ),
          };
        }
        return group;
      });
      return newGroups;
    });
  };
  // Detect changes to enable/disable submit button
  useEffect(() => {
    if (!initialGroupsRef.current) {
      setHasChanges(false);
      return;
    }
    // Compare current groups to initial, but ignore doCount (checkbox)
    const initial = initialGroupsRef.current;
    let changed = false;
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const initialGroup = initial.find((g) => g.category === group.category);
      if (!initialGroup) continue;
      for (let j = 0; j < group.items.length; j++) {
        const item = group.items[j];
        const initialItem = initialGroup.items.find((it) => it._id === item._id);
        if (!initialItem) continue;
        // Only consider newCount changes
        if (item.newCount !== initialItem.quantity) {
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
    setHasChanges(changed);
  }, [groups]);

  const getColumns = (groupCategory: string): ColumnsType<CountRow> => [
    {
      title: t("table.count"),
      dataIndex: "doCount",
      key: "doCount",
      width: 80,
      align: "center",
      render: (checked: boolean, record: CountRow) => (
        <Checkbox
          checked={checked}
          onChange={(e) => handleCheckboxChange(groupCategory, record._id, e.target.checked)}
        />
      ),
    },
    {
      title: t("table.itemName"),
      dataIndex: "itemName",
      key: "itemName",
      width: "40%",
    },
    {
      title: t("table.currentQty"),
      dataIndex: "quantity",
      key: "quantity",
      align: "center",
      width: "20%",
    },
    {
      title: t("table.newCount"),
      dataIndex: "newCount",
      key: "newCount",
      align: "center",
      width: "20%",
      render: (value: number, record: CountRow) => (
        <InputNumber
          value={value}
          disabled={!record.doCount}
          min={0}
          style={{ width: 100 }}
          onFocus={(e) => e.target.select()}
          onChange={(val) => handleNewCountChange(groupCategory, record._id, val)}
        />
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: "24px", background: "#f0f2f5", minHeight: "100vh" }}>
        <Space direction="vertical" style={{ width: "100%", textAlign: "center", paddingTop: "20%" }}>
          <Spin size="large" />
          <div>{t("loadingInventory")}</div>
        </Space>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "24px", background: "#f0f2f5", minHeight: "100vh" }}>
        <Space direction="vertical" style={{ width: "100%", paddingTop: "20%" }}>
          <Alert message={error} type="error" showIcon />
        </Space>
      </div>
    );
  }

  // Build Collapse items array from all categories
  const collapseItems = categories.map((category) => {
    const categoryLabel = tAdd(`categoryOptions.${category}`, {
      defaultValue: category,
    });
    
    const group = groups.find(g => g.category === category);
    const isLoading = !loadedCategories.has(category) && activeKeys.includes(category);
    
    return {
      key: category,
      label: t("categoryTitle", { category: categoryLabel }),
      children: isLoading ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <Spin />
        </div>
      ) : group ? (
        <Table
          columns={getColumns(group.category)}
          dataSource={group.items}
          rowKey="_id"
          pagination={false}
          size="small"
          bordered
        />
      ) : null,
    };
  });

  return (
    <div style={{ padding: "24px", background: "#f0f2f5", minHeight: "100vh" }}>
      {contextHolder}
      <Card
        title={
          <Space direction="vertical" style={{ width: "100%" }}>
            <Button
              icon={<ArrowRightOutlined />}
              onClick={() => window.history.back()}
              type="default"
              style={{ direction: "rtl" }}
            >
              {t("back")}
            </Button>
            <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: 0, textAlign: "center" }}>
              {t("pageTitle")}
            </h1>
          </Space>
        }
        style={{ maxWidth: "1200px", margin: "0 auto" }}
      >
        <Form onFinish={handleSubmit}>
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            <Collapse
              items={collapseItems}
              activeKey={activeKeys}
              onChange={handleAccordionChange}
              bordered
            />
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              size="large"
              block
              disabled={!hasChanges}
            >
              {t("submitCount")}
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
