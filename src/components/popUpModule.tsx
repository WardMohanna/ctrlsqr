// components/PopupModal.tsx
"use client";

import React from "react";
import { Modal } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined } from "@ant-design/icons";

interface PopupModalProps {
  message: string;
  onConfirm?: () => void;
  onCancel: () => void;
  type?: "success" | "error" | "info";
  confirmText?: string;
  cancelText?: string;
}

export default function PopupModal({
  message,
  onConfirm,
  onCancel,
  type = "info",
  confirmText = "OK",
  cancelText = "Cancel",
}: PopupModalProps) {
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircleOutlined style={{ color: "#52c41a", fontSize: "48px" }} />;
      case "error":
        return <CloseCircleOutlined style={{ color: "#ff4d4f", fontSize: "48px" }} />;
      default:
        return <InfoCircleOutlined style={{ color: "#1677ff", fontSize: "48px" }} />;
    }
  };

  return (
    <Modal
      open={true}
      onCancel={onCancel}
      onOk={
        onConfirm
          ? () => {
              onConfirm();
              onCancel();
            }
          : onCancel
      }
      okText={confirmText}
      cancelText={onConfirm ? cancelText : undefined}
      cancelButtonProps={onConfirm ? undefined : { style: { display: "none" } }}
      centered
      closable={false}
    >
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <div style={{ marginBottom: "16px" }}>{getIcon()}</div>
        <p style={{ fontSize: "16px", margin: 0 }}>{message}</p>
      </div>
    </Modal>
  );
}
