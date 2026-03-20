"use client";

import React, { useEffect } from "react";
import { Modal, message } from "antd";
import { useTranslations } from "next-intl";

interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onDetected: (barcode: string) => void;
}

const VIDEO_ELEMENT_ID = "inventory-add-scanner-video";

export default function BarcodeScannerModal({
  open,
  onClose,
  onDetected,
}: BarcodeScannerModalProps) {
  const t = useTranslations("inventory.add");

  useEffect(() => {
    let codeReader: any;

    if (!open) {
      return;
    }

    import("@zxing/library")
      .then((ZXing) => {
        codeReader = new ZXing.BrowserMultiFormatReader();

        return navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
          stream.getTracks().forEach((track) => track.stop());

          return codeReader.listVideoInputDevices().then((videoInputDevices: any[]) => {
            if (videoInputDevices.length === 0) {
              message.error(t("cameraInitError"));
              onClose();
              return;
            }

            const backCamera = videoInputDevices.find((device) =>
              device.label.toLowerCase().includes("back"),
            );

            const selectedDeviceId = backCamera
              ? backCamera.deviceId
              : videoInputDevices[0].deviceId;

            return codeReader.decodeFromVideoDevice(
              selectedDeviceId,
              VIDEO_ELEMENT_ID,
              (result: any, err: any) => {
                if (result?.text) {
                  codeReader.reset();
                  onDetected(result.text);
                  onClose();
                }

                if (err && !(err instanceof ZXing.NotFoundException)) {
                  console.error("Barcode scanner error:", err);
                }
              },
            );
          });
        });
      })
      .catch((err) => {
        console.error("Scanner initialization error:", err);
        message.error(t("cameraPermissionDenied"));
        onClose();
      });

    return () => {
      if (codeReader) {
        codeReader.reset();
      }
    };
  }, [open, onClose, onDetected, t]);

  return (
    <Modal
      title={t("scanBarcodeTitle")}
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <div
        style={{
          width: "100%",
          textAlign: "center",
          minHeight: "320px",
          display: "flex",
          justifyContent: "center",
          backgroundColor: "#000",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <video
          id={VIDEO_ELEMENT_ID}
          style={{ width: "100%", height: "320px", objectFit: "cover" }}
        />
      </div>
      <p style={{ textAlign: "center", marginTop: "16px", color: "#8c8c8c" }}>
        {t("scanInstructions")}
      </p>
    </Modal>
  );
}