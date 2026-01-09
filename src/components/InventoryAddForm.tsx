"use client";

import React, { useState, useEffect } from "react";
import { Modal, Form, Input, InputNumber, Select, Button, Checkbox, Row, Col, Space } from "antd";
import { BarcodeOutlined } from "@ant-design/icons";
import Quagga from "quagga";
import { useTranslations } from "next-intl";

const { Option } = Select;

interface InventoryItem {
  _id: string;
  sku: string;
  itemName: string;
  unit: string;
  currentCostPrice?: number;
}

interface InventoryAddFormProps {
  onCancel: () => void;
  onSuccess: (newItem: InventoryItem) => void;
}

export default function InventoryAddForm({
  onCancel,
  onSuccess,
}: InventoryAddFormProps) {
  const t = useTranslations("inventory.add");
  const [form] = Form.useForm();
  const [autoSKU, setAutoSKU] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

  const categories = [
    { value: "ProductionRawMaterial", label: t("categoryOptions.ProductionRawMaterial") },
    { value: "CoffeeshopRawMaterial", label: t("categoryOptions.CoffeeshopRawMaterial") },
    { value: "CleaningMaterial", label: t("categoryOptions.CleaningMaterial") },
    { value: "Packaging", label: t("categoryOptions.Packaging") },
    { value: "DisposableEquipment", label: t("categoryOptions.DisposableEquipment") },
    { value: "SemiFinalProduct", label: t("categoryOptions.SemiFinalProduct") },
    { value: "FinalProduct", label: t("categoryOptions.FinalProduct") },
  ];

  const units = [
    { value: "grams", label: t("unitOptions.grams") },
    { value: "kg", label: t("unitOptions.kg") },
    { value: "ml", label: t("unitOptions.ml") },
    { value: "liters", label: t("unitOptions.liters") },
    { value: "pieces", label: t("unitOptions.pieces") },
  ];

  useEffect(() => {
    if (!scanning) return;
    Quagga.init(
      {
        inputStream: {
          type: "LiveStream",
          constraints: { facingMode: "environment" },
          target: document.querySelector("#scanner"),
        },
        decoder: { readers: ["code_128_reader", "ean_reader", "upc_reader"] },
      },
      (err: any) => {
        if (!err) Quagga.start();
      }
    );
    Quagga.onDetected((res: any) => {
      form.setFieldValue("barcode", res.codeResult.code);
      setScanning(false);
    });
    return () => {
      Quagga.stop();
      Quagga.offDetected(() => {});
    };
  }, [scanning, form]);

  async function handleSubmit(values: any) {
    const payload = {
      sku: autoSKU ? undefined : values.sku,
      barcode: values.barcode,
      itemName: values.itemName,
      category: values.category,
      quantity: values.quantity || 0,
      minQuantity: values.minQuantity || 0,
      unit: values.unit,
      currentCostPrice: values.costPrice || 0,
      currentBusinessPrice: values.businessPrice || 0,
      currentClientPrice: values.clientPrice || 0,
    };

    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const newItem = await res.json();
      onSuccess(newItem.item);
    } else {
      const err = await res.json();
      Modal.error({
        title: "Error",
        content: err.error || t("itemAddedFailure"),
      });
    }
  }

  return (
    <Modal
      open={true}
      title={t("title")}
      onCancel={onCancel}
      width={800}
      footer={null}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          quantity: 0,
          minQuantity: 0,
          costPrice: 0,
          businessPrice: 0,
          clientPrice: 0,
        }}
      >
        <Form.Item label={t("skuLabel")}>
          <Space.Compact style={{ width: "100%" }}>
            <Form.Item name="sku" noStyle>
              <Input disabled={autoSKU} placeholder="SKU" />
            </Form.Item>
            <Checkbox
              checked={autoSKU}
              onChange={(e) => setAutoSKU(e.target.checked)}
            >
              {t("autoAssign")}
            </Checkbox>
          </Space.Compact>
        </Form.Item>

        <Form.Item label={t("barcodeLabel")}>
          <Space.Compact style={{ width: "100%" }}>
            <Form.Item name="barcode" noStyle>
              <Input placeholder="Barcode" />
            </Form.Item>
            <Button
              type="primary"
              icon={<BarcodeOutlined />}
              onClick={() => setScanning(true)}
            >
              {t("scan")}
            </Button>
          </Space.Compact>
          {scanning && (
            <div id="scanner" style={{ width: "100%", height: "200px", marginTop: "8px", background: "#000" }} />
          )}
        </Form.Item>

        <Form.Item
          name="itemName"
          label={t("itemNameLabel")}
          rules={[{ required: true, message: "Item name is required" }]}
        >
          <Input placeholder="Item name" />
        </Form.Item>

        <Form.Item name="category" label={t("categoryLabel")}>
          <Select
            placeholder="Select category"
            onChange={(value) => setCategory(value)}
          >
            {categories.map((cat) => (
              <Option key={cat.value} value={cat.value}>
                {cat.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="quantity" label={t("quantityLabel")}>
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="minQuantity" label={t("minQuantityLabel")}>
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="unit" label={t("unitLabel")}>
          <Select placeholder="Select unit">
            {units.map((u) => (
              <Option key={u.value} value={u.value}>
                {u.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="costPrice" label={t("costPriceLabel")}>
          <InputNumber style={{ width: "100%" }} min={0} step={0.01} precision={2} />
        </Form.Item>

        {category === "FinalProduct" && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="businessPrice" label={t("businessPriceLabel")}>
                <InputNumber style={{ width: "100%" }} min={0} step={0.01} precision={2} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="clientPrice" label={t("clientPriceLabel")}>
                <InputNumber style={{ width: "100%" }} min={0} step={0.01} precision={2} />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
          <Space>
            <Button onClick={onCancel}>
              {t("cancel")}
            </Button>
            <Button type="primary" htmlType="submit">
              {t("submit")}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
