"use client";

import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Checkbox,
  Row,
  Col,
  Space,
} from "antd";
import { BarcodeOutlined } from "@ant-design/icons";
import { message } from "antd";
import { useRef } from "react";
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

  const quaggaRef = useRef<any>(null);
  const [msgApi, contextHolder] = message.useMessage();
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);
  const [imageScanning, setImageScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const categories = [
    {
      value: "ProductionRawMaterial",
      label: t("categoryOptions.ProductionRawMaterial"),
    },
    {
      value: "CoffeeshopRawMaterial",
      label: t("categoryOptions.CoffeeshopRawMaterial"),
    },
    { value: "CleaningMaterial", label: t("categoryOptions.CleaningMaterial") },
    { value: "Packaging", label: t("categoryOptions.Packaging") },
    {
      value: "DisposableEquipment",
      label: t("categoryOptions.DisposableEquipment"),
    },
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

    let mounted = true;

    async function startScanner() {
      // Dynamic import to avoid SSR issues
      let QuaggaLib: any;
      try {
        const mod = await import("quagga");
        QuaggaLib = mod.default ?? mod;
      } catch (err) {
        console.error("Failed to load Quagga:", err);
        const txt =
          (err && (err.message || String(err))) || "Quagga load error";
        setScannerError(txt);
        msgApi.error(
          (t("scannerLoadError") || "Scanner failed to load") + ": " + txt,
        );
        setScanning(false);
        return;
      }

      // helper to map common getUserMedia error names to user-facing text
      const mapGUMError = (err: any) => {
        const name = err?.name;
        switch (name) {
          case "NotAllowedError":
            return t("cameraPermissionDenied") || "Camera permission denied";
          case "NotFoundError":
            return t("cameraNotFound") || "No camera found";
          case "NotReadableError":
            return t("cameraNotReadable") || "Camera not readable or busy";
          case "OverconstrainedError":
            return (
              t("cameraConstraintsFailed") || "No camera matching constraints"
            );
          default:
            return (err && (err.message || String(err))) || "Camera error";
        }
      };

      // Feature detect camera availability by requesting a short stream (will prompt for permission)
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: true,
            });
            stream.getTracks().forEach((t) => t.stop());
            setCameraAvailable(true);
          } catch (err) {
            // Permission denied or not available
            setCameraAvailable(false);
            const msg = mapGUMError(err);
            setScannerError(msg);
          }
        } else {
          setCameraAvailable(false);
        }
      } catch (e) {
        setCameraAvailable(false);
        const msg = mapGUMError(e);
        setScannerError(msg);
      }

      // Wait for DOM element to be present (Modal may render asynchronously)
      const waitForElement = async (selector: string, timeout = 2000) => {
        const start = Date.now();
        while (Date.now() - start < timeout) {
          const el = document.querySelector(selector);
          if (el) return el as HTMLElement;
          await new Promise((r) => setTimeout(r, 50));
        }
        return null;
      };

      const el = await waitForElement("#scanner", 2000);
      if (!el) {
        msgApi.warning(
          t("scannerElementMissing") || "Scanner not available on this screen",
        );
        return;
      }

      // If no camera, prompt user to upload image (we still keep the UI)
      if (!cameraAvailable) {
        msgApi.warning(
          t("noCameraFallback") ||
            "No camera found. You can upload an image to scan.",
        );
        return;
      }

      // Create dedicated container for Quagga inside the scanner element
      const quaggaContainer = document.createElement("div");
      quaggaContainer.style.width = "100%";
      quaggaContainer.style.height = "100%";
      el.innerHTML = "";
      el.appendChild(quaggaContainer);

      // Global handlers to capture uncaught errors (capture stack)
      const onWindowError = (e: ErrorEvent) => {
        const txt = e?.message || String(e);
        const stack =
          e?.error?.stack ||
          `${e.filename || ""}:${e.lineno || ""}:${e.colno || ""}`;
        console.error("Global window error caught by scanner:", e, stack);
        setScannerError(
          `${txt}\n${String(stack).split("\n").slice(0, 3).join("\n")}`,
        );
        msgApi.error(
          (t("scannerStartError") || "Scanner failed to start") + ": " + txt,
        );
      };
      const onRejection = (e: PromiseRejectionEvent) => {
        const txt =
          (e.reason && (e.reason.message || String(e.reason))) ||
          String(e.reason);
        const stack = (e.reason && e.reason.stack) || String(e.reason);
        console.error(
          "Unhandled promise rejection caught by scanner:",
          e,
          stack,
        );
        setScannerError(
          `${txt}\n${String(stack).split("\n").slice(0, 3).join("\n")}`,
        );
        msgApi.error(
          (t("scannerStartError") || "Scanner failed to start") + ": " + txt,
        );
      };
      window.addEventListener("error", onWindowError);
      window.addEventListener("unhandledrejection", onRejection);

      // Prefer native BarcodeDetector when available. give it up to 12 seconds to
      // produce a code; if it either throws or the timer expires, fall back to
      // the live‑stream scanner below.
      let barcodeDetectorSuccess = false;
      if (typeof (window as any).BarcodeDetector === "function") {
        try {
          const supportedFormats = [
            "code_128",
            "ean_13",
            "ean_8",
            "upc_a",
            "code_39",
          ];
          const detector = new (window as any).BarcodeDetector({
            formats: supportedFormats,
          });

          const video = document.createElement("video");
          video.setAttribute("autoplay", "");
          video.setAttribute("playsinline", "");
          video.muted = true;
          video.style.width = "100%";
          video.style.height = "100%";
          el.appendChild(video);

          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("getUserMedia not available");
          }

          let stream: MediaStream;
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "environment" },
            });
          } catch (e) {
            console.warn("facingMode constraint failed, trying without:", e);
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          }
          video.srcObject = stream;

          let running = true;
          let rafId: number | null = null;
          let timeoutId: number | null = null;

          const scanLoop = async () => {
            if (!running) return;
            if (video.readyState < 2) {
              rafId = requestAnimationFrame(scanLoop);
              return;
            }
            try {
              const detections = await detector.detect(video as any);
              if (detections && detections.length > 0) {
                const code = detections[0].rawValue || detections[0].rawData;
                if (code) {
                  form.setFieldValue("barcode", code);
                  setScanning(false);
                  running = false;
                  if (rafId) cancelAnimationFrame(rafId);
                  if (timeoutId) clearTimeout(timeoutId);
                  stream.getTracks().forEach((t) => t.stop());
                  barcodeDetectorSuccess = true;
                }
              }
            } catch (err) {
              console.warn("BarcodeDetector detect error:", err);
              running = false;
              if (timeoutId) clearTimeout(timeoutId);
              stream.getTracks().forEach((t) => t.stop());
              video.remove();
              // fall through to Quagga init
              return;
            }
            rafId = requestAnimationFrame(scanLoop);
          };

          rafId = requestAnimationFrame(scanLoop);

          // timeout after 12s
          timeoutId = window.setTimeout(() => {
            if (running) {
              running = false;
              stream.getTracks().forEach((t) => t.stop());
              try {
                video.remove();
              } catch (_e) {
                /* ignore */
              }
            }
          }, 12000);

          quaggaRef.current = {
            detector,
            video,
            stream,
            stop: () => {
              running = false;
              if (rafId) cancelAnimationFrame(rafId);
              if (timeoutId) clearTimeout(timeoutId);
              stream.getTracks().forEach((t) => t.stop());
              try {
                if (video.parentElement) video.parentElement.removeChild(video);
              } catch (e) {
                /* ignore */
              }
            },
          } as any;

          // if the detector already found a code we bailed out above, otherwise
          // we simply return and let the user continue scanning; if the timeout
          // fires we mark success==false and fall through to Quagga below.
          if (barcodeDetectorSuccess) return;
        } catch (err) {
          console.warn("BarcodeDetector failed during init:", err);
        }
      }

      // still here? either BarcodeDetector isn't supported, threw during setup,
      // or it timed out without returning a code. try the Quagga live scanner.
      try {
        let localStream: MediaStream | null = null;
        let attachedVideo: HTMLVideoElement | null = null;

        try {
          localStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          });
        } catch (e) {
          // Map error if it's something more than constraint failure
          const mapped = mapGUMError(e);
          if (
            e &&
            (e.name === "NotAllowedError" ||
              e.name === "NotFoundError" ||
              e.name === "NotReadableError")
          ) {
            setScannerError(mapped);
          }
          console.warn(
            "facingMode constraint failed for Quagga, trying any camera:",
            e,
          );
          try {
            localStream = await navigator.mediaDevices.getUserMedia({
              video: true,
            });
          } catch (e2) {
            setCameraAvailable(false);
            const mapped2 = mapGUMError(e2);
            setScannerError(mapped2);
            throw e2; // bubble so outer catch handles
          }
        }

        attachedVideo = document.createElement("video");
        attachedVideo.setAttribute("autoplay", "");
        attachedVideo.setAttribute("playsinline", "");
        attachedVideo.muted = true;
        attachedVideo.style.width = "100%";
        attachedVideo.style.height = "100%";
        attachedVideo.srcObject = localStream;
        quaggaContainer.appendChild(attachedVideo);

        // wait briefly for video to load so Quagga has something to work with
        await new Promise<void>((resolve) => {
          if (!attachedVideo) return resolve();
          const onLoaded = () => {
            attachedVideo!.removeEventListener("loadedmetadata", onLoaded);
            resolve();
          };
          attachedVideo!.addEventListener("loadedmetadata", onLoaded);
          setTimeout(resolve, 1500);
        });

        await new Promise<void>((resolve, reject) => {
          QuaggaLib.init(
            {
              inputStream: {
                type: "LiveStream",
                target: quaggaContainer,
                constraints: { facingMode: "environment" },
              },
              decoder: {
                readers: [
                  "code_128_reader",
                  "ean_reader",
                  "ean_8_reader",
                  "upc_reader",
                  "code_39_reader",
                  "itf_reader",
                ],
              },
              locate: true,
            },
            (err: any) => {
              if (err) reject(err);
              else resolve();
            },
          );
        });

        QuaggaLib.onDetected((res: any) => {
          if (!mounted) return;
          try {
            const code = res?.codeResult?.code;
            if (code) {
              form.setFieldValue("barcode", code);
              setScanning(false);
            }
          } catch (e) {
            console.error("Error handling detection:", e);
          }
        });

        QuaggaLib.start();

        quaggaRef.current = {
          stop: () => {
            try {
              QuaggaLib.stop();
            } catch (_e) {
              /* ignore */
            }
            if (localStream) localStream.getTracks().forEach((t) => t.stop());
          },
          stream: localStream,
        } as any;
      } catch (err) {
        console.error("Quagga start error:", err);
        const txt =
          (err && (err.message || String(err))) || "Quagga start error";
        setScannerError(txt);
        msgApi.error(
          (t("scannerStartError") || "Scanner failed to start") + ": " + txt,
        );
        setCameraAvailable(false);
        window.removeEventListener("error", onWindowError);
        window.removeEventListener("unhandledrejection", onRejection);
      }
    }

    startScanner();

    return () => {
      mounted = false;
      try {
        if (quaggaRef.current) {
          try {
            if (typeof quaggaRef.current.offDetected === "function")
              quaggaRef.current.offDetected(() => {});
          } catch (e) {
            console.warn("Error calling offDetected:", e);
          }

          try {
            if (typeof quaggaRef.current.stop === "function") {
              quaggaRef.current.stop();
            } else if ((quaggaRef.current as any).stream) {
              const s = (quaggaRef.current as any).stream as
                | MediaStream
                | undefined;
              if (s && s.getTracks) s.getTracks().forEach((t) => t.stop());
            }
          } catch (e) {
            console.warn("Error stopping Quagga or stream:", e);
          }

          try {
            quaggaRef.current = null;
          } catch (e) {}
        }
      } catch (e) {
        console.warn("Error stopping Quagga:", e);
      }

      try {
        // @ts-ignore
        if (typeof onWindowError === "function")
          window.removeEventListener("error", onWindowError);
        // @ts-ignore
        if (typeof onRejection === "function")
          window.removeEventListener("unhandledrejection", onRejection);
      } catch (e) {
        // ignore
      }

      try {
        const sc = document.querySelector("#scanner");
        if (sc && sc.firstElementChild) {
          const child = sc.firstElementChild as HTMLElement & {
            srcObject?: MediaStream;
          };
          try {
            if (
              child &&
              (child as any).srcObject &&
              (child as any).srcObject.getTracks
            ) {
              ((child as any).srcObject as MediaStream)
                .getTracks()
                .forEach((t: any) => t.stop());
            }
          } catch (e) {
            // ignore
          }
          sc.removeChild(sc.firstElementChild);
        }
      } catch (e) {
        // ignore
      }
    };
  }, [scanning, form, msgApi, t, cameraAvailable]);

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
            <div style={{ marginTop: "8px" }}>
              <div
                id="scanner"
                style={{ width: "100%", height: "200px", background: "#000" }}
              />

              {/* Image fallback if camera not available */}
              {cameraAvailable === false && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ marginBottom: 8, color: "#999" }}>
                    {t("noCameraUpload") ||
                      "Camera not available — upload an image to scan or enter barcode manually"}
                  </div>
                  {scannerError && (
                    <div style={{ color: "crimson", marginBottom: 8 }}>
                      <strong>
                        {t("scannerErrorLabel") || "Scanner error"}:
                      </strong>{" "}
                      {scannerError}
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files && e.target.files[0];
                      if (!file) return;
                      setImageScanning(true);
                      try {
                        const mod = await import("quagga");
                        const QuaggaLib = (mod as any).default ?? mod;
                        QuaggaLib.decodeSingle(
                          {
                            src: URL.createObjectURL(file),
                            numOfWorkers: 0,
                            decoder: {
                              readers: [
                                "code_128_reader",
                                "ean_reader",
                                "upc_reader",
                              ],
                            },
                          },
                          (result: any) => {
                            if (
                              result &&
                              result.codeResult &&
                              result.codeResult.code
                            ) {
                              form.setFieldValue(
                                "barcode",
                                result.codeResult.code,
                              );
                              msgApi.success(
                                t("barcodeDetected") ||
                                  "Barcode detected from image",
                              );
                              setScanning(false);
                              setScannerError(null);
                            } else {
                              const txt =
                                t("noBarcodeInImage") ||
                                "No barcode detected in image";
                              setScannerError(txt);
                              msgApi.error(txt);
                            }
                            setImageScanning(false);
                          },
                        );
                      } catch (err) {
                        console.error("Image decode error:", err);
                        const txt =
                          (err && (err.message || String(err))) ||
                          t("imageDecodeError") ||
                          "Failed to decode image";
                        setScannerError(txt);
                        msgApi.error(txt);
                        setImageScanning(false);
                      }
                    }}
                  />
                </div>
              )}
            </div>
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
          <InputNumber
            style={{ width: "100%" }}
            min={0}
            step={0.01}
            precision={2}
          />
        </Form.Item>

        {category === "FinalProduct" && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="businessPrice" label={t("businessPriceLabel")}>
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  step={0.01}
                  precision={2}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="clientPrice" label={t("clientPriceLabel")}>
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  step={0.01}
                  precision={2}
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
          <Space>
            <Button onClick={onCancel}>{t("cancel")}</Button>
            <Button type="primary" htmlType="submit">
              {t("submit")}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
