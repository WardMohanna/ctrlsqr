"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  startTransition,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { useNavigateUp } from "@/hooks/useNavigateUp";
import { useTheme } from "@/hooks/useTheme";
// import Quagga from "quagga"; // Removed for dynamic import
import { useTranslations } from "next-intl";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { RestoreFormModal } from "@/components/RestoreFormModal";
import {
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Card,
  Row,
  Col,
  Checkbox,
  Modal,
  Divider,
  Table,
  Space,
  message,
} from "antd";
import {
  SaveOutlined,
  ScanOutlined,
  PlusOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import BackButton from "@/components/BackButton";

interface InventoryItem {
  _id: string;
  itemName: string;
  category: string;
  unit?: string;
  currentCostPrice?: number;
}

interface ComponentLine {
  componentId: string;
  grams: number;
}

export default function AddInventoryItem() {
  const router = useRouter();
  const goUp = useNavigateUp();
  const t = useTranslations("inventory.add");
  const { theme } = useTheme();
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // State management
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Start as false for immediate interaction
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showBOMModal, setShowBOMModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [components, setComponents] = useState<ComponentLine[]>([]);
  const [autoAssignSKU, setAutoAssignSKU] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const quaggaRef = useRef<any>(null); // Ref to hold Quagga instance
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // Form persistence hook
  const {
    showRestoreModal,
    handleRestoreConfirm: handleRestore,
    handleRestoreCancel,
    saveFormData,
    clearSavedData,
  } = useFormPersistence({
    formKey: "inventory-add",
    form,
    additionalData: { components, selectedCategory, autoAssignSKU },
    onRestore: (data) => {
      if (data.components) setComponents(data.components);
      if (data.selectedCategory) setSelectedCategory(data.selectedCategory);
      if (data.autoAssignSKU !== undefined)
        setAutoAssignSKU(data.autoAssignSKU);
    },
  });

  // Load inventory only when user opens BOM component selector
  const loadRawMaterials = useCallback(() => {
    if (inventoryItems.length === 0 && !isLoading) {
      setIsLoading(true);
      fetch(
        "/api/inventory?category=ProductionRawMaterial,CoffeeshopRawMaterial,Packaging,SemiFinalProduct&fields=_id,itemName,category,currentCostPrice",
      )
        .then((res) => res.json())
        .then((data) => {
          setInventoryItems(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error(t("errorLoadingInventory"), err);
          setIsLoading(false);
        });
    }
  }, [inventoryItems.length, isLoading, t]);

  // Category + Unit options
  const categories = [
    {
      value: "ProductionRawMaterial",
      label: t("categoryOptions.ProductionRawMaterial"),
    },
    {
      value: "CoffeeshopRawMaterial",
      label: t("categoryOptions.CoffeeshopRawMaterial"),
    },
    {
      value: "WorkShopRawMaterial",
      label: t("categoryOptions.WorkShopRawMaterial"),
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

  // BOM raw materials: include all categories except Final products
  const rawMaterials = inventoryItems
    .filter((i) => i.category !== "FinalProduct")
    .map((i) => ({ value: i._id, label: i.itemName }));

  // Handle category change
  const handleCategoryChange = useCallback(
    (value: string) => {
      setSelectedCategory(value);
      setComponents([]);
      form.setFieldValue("standardBatchWeight", undefined);
    },
    [form],
  );

  // Add a new BOM line
  const handleComponentAdd = useCallback(
    (componentId: string) => {
      if (components.some((c) => c.componentId === componentId)) {
        messageApi.warning(t("errorComponentDuplicate"));
        return;
      }
      const isPackaging =
        inventoryItems.find((i) => i._id === componentId)?.category ===
        "Packaging";
      setComponents([
        ...components,
        { componentId, grams: isPackaging ? 1 : 0 },
      ]);
    },
    [components, inventoryItems, t, messageApi],
  );

  const handleGramsChange = (index: number, grams: number) => {
    const updated = [...components];
    updated[index].grams = grams || 0;
    setComponents(updated);
  };

  const handleRemoveLine = (index: number) => {
    const updated = [...components];
    updated.splice(index, 1);
    setComponents(updated);
  };

  // Sum only raw-material grams
  const totalBOMGrams = components.reduce((sum, c) => {
    const item = inventoryItems.find((i) => i._id === c.componentId);
    return item?.category === "Packaging" ? sum : sum + c.grams;
  }, 0);

  // Barcode scanner
  const handleScanBarcode = useCallback(async () => {
    if (!quaggaRef.current) {
      try {
        const mod = await import("quagga");
        const QuaggaMod = (mod as any).default ?? mod;
        if (!QuaggaMod || typeof QuaggaMod.init !== "function") {
          console.error("Quagga module is not valid", QuaggaMod);
          messageApi.error(t("scannerLoadError") || "Scanner failed to load");
          setCameraAvailable(false);
          setIsScannerOpen(true); // still open modal so user can upload image
          return;
        }
        quaggaRef.current = QuaggaMod;
      } catch (err) {
        console.error("Failed to load Quagga:", err);
        const txt =
          (err && (err.message || String(err))) || "Quagga load error";
        setScannerError(txt);
        messageApi.error(
          (t("scannerLoadError") || "Scanner failed to load") + ": " + txt,
        );
        setCameraAvailable(false);
        setIsScannerOpen(true);
        return;
      }
    }
    setIsScannerOpen(true);
  }, [messageApi, t]);

  useEffect(() => {
    if (!isScannerOpen) return;

    let mounted = true;

    const timer = setTimeout(async () => {
      // Wait for scanner element
      const waitForElement = async (selector: string, timeout = 2000) => {
        const start = Date.now();
        while (Date.now() - start < timeout) {
          const el = document.querySelector(selector);
          if (el) return el as HTMLElement;
          await new Promise((r) => setTimeout(r, 50));
        }
        return null;
      };

      const el = await waitForElement("#interactive", 2000);
      if (!el) {
        console.warn("Scanner element not found");
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

      // Feature detect camera availability by briefly requesting a stream (this may prompt permission)
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: true,
            });
            stream.getTracks().forEach((t) => t.stop());
            setCameraAvailable(true);
          } catch (err) {
            setCameraAvailable(false);
            setScannerError(mapGUMError(err));
          }
        } else {
          setCameraAvailable(false);
        }
      } catch (e) {
        setCameraAvailable(false);
        setScannerError(mapGUMError(e));
      }

      if (!cameraAvailable && cameraAvailable !== null) {
        // no camera - allow image upload fallback
        return;
      }

      if (!quaggaRef.current) return;
      const Quagga = quaggaRef.current;

      // Debug info about target element
      console.debug("Scanner target element:", el, {
        width: (el as HTMLElement).offsetWidth,
        height: (el as HTMLElement).offsetHeight,
      });

      // Create a dedicated container element for Quagga to attach to
      const quaggaContainer = document.createElement("div");
      quaggaContainer.style.width = "100%";
      quaggaContainer.style.height = "100%";
      // Ensure the target is empty and append our container
      el.innerHTML = "";
      el.appendChild(quaggaContainer);

      // Global error handlers to capture uncaught errors during init/start (capture stack)
      const onWindowError = (e: ErrorEvent) => {
        const txt = e?.message || String(e);
        const stack =
          e?.error?.stack ||
          `${e.filename || ""}:${e.lineno || ""}:${e.colno || ""}`;
        console.error("Global window error caught by scanner:", e, stack);
        setScannerError(
          `${txt}\n${String(stack).split("\n").slice(0, 3).join("\n")}`,
        );
        messageApi.error(
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
        messageApi.error(
          (t("scannerStartError") || "Scanner failed to start") + ": " + txt,
        );
      };
      window.addEventListener("error", onWindowError);
      window.addEventListener("unhandledrejection", onRejection);

      const onDetected = (result: any) => {
        const code = result?.codeResult?.code;
        if (code) {
          form.setFieldValue("barcode", code);
          setIsScannerOpen(false);
        }
      };

      try {
        if (!Quagga || typeof Quagga.init !== "function") {
          console.error("Quagga instance invalid before init:", Quagga);
          messageApi.error(
            t("scannerInitError") || "Scanner initialization failed",
          );
          setCameraAvailable(false);
          // cleanup handlers
          window.removeEventListener("error", onWindowError);
          window.removeEventListener("unhandledrejection", onRejection);
          return;
        }

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
            quaggaContainer.appendChild(video);

            if (
              !navigator.mediaDevices ||
              !navigator.mediaDevices.getUserMedia
            ) {
              throw new Error("getUserMedia not available");
            }

            let stream: MediaStream;
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
              });
            } catch (e) {
              console.warn("facingMode constraint failed, trying without:", e);
              stream = await navigator.mediaDevices.getUserMedia({
                video: true,
              });
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
                    setIsScannerOpen(false);
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
                  if (video.parentElement)
                    video.parentElement.removeChild(video);
                } catch (e) {
                  /* ignore */
                }
              },
            } as any;

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
            console.warn(
              "facingMode constraint failed for Quagga, trying any camera:",
              e,
            );
            localStream = await navigator.mediaDevices.getUserMedia({
              video: true,
            });
          }

          attachedVideo = document.createElement("video");
          attachedVideo.setAttribute("autoplay", "");
          attachedVideo.setAttribute("playsinline", "");
          attachedVideo.muted = true;
          attachedVideo.style.width = "100%";
          attachedVideo.style.height = "100%";
          attachedVideo.srcObject = localStream;
          quaggaContainer.appendChild(attachedVideo);

          // wait for the video to be ready
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
            Quagga.init(
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

          Quagga.onDetected(onDetected);
          Quagga.start();

          quaggaRef.current = {
            stop: () => {
              try {
                Quagga.stop();
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
          messageApi.error(
            (t("scannerStartError") || "Scanner failed to start") + ": " + txt,
          );
          setCameraAvailable(false);
          window.removeEventListener("error", onWindowError);
          window.removeEventListener("unhandledrejection", onRejection);
        }
      } catch (err) {
        console.error("Quagga start error:", err);
        const txt =
          (err && (err.message || String(err))) || "Quagga start error";
        setScannerError(txt);
        messageApi.error(
          (t("scannerStartError") || "Scanner failed to start") + ": " + txt,
        );
        setCameraAvailable(false);
        window.removeEventListener("error", onWindowError);
        window.removeEventListener("unhandledrejection", onRejection);
      }

      // If user has no camera, let them upload an image
    }, 100);

    return () => {
      clearTimeout(timer);

      // Defensive cleanup for Quagga / BarcodeDetector controller
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
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        console.warn("Error stopping Quagga:", e);
      }

      // Remove any global error handlers and cleanup container if present
      try {
        // handlers are in closure
        // @ts-ignore - they exist in closure if created
        if (typeof onWindowError === "function")
          window.removeEventListener("error", onWindowError as any);
        // @ts-ignore
        if (typeof onRejection === "function")
          window.removeEventListener("unhandledrejection", onRejection as any);
      } catch (e) {
        // ignore
      }

      // Also remove appended container if present inside the modal; stop child video tracks if any
      try {
        const interactive = document.querySelector("#interactive");
        if (interactive && interactive.firstElementChild) {
          const child = interactive.firstElementChild as HTMLElement & {
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
          interactive.removeChild(interactive.firstElementChild);
        }
      } catch (e) {
        // ignore
      }
    };
  }, [isScannerOpen, cameraAvailable, form]);

  // Preview BOM
  const handlePreviewBOM = () => {
    const itemName = form.getFieldValue("itemName");
    const standardBatchWeight = form.getFieldValue("standardBatchWeight");

    if (!itemName) {
      messageApi.error(t("errorNoItemName"));
      return;
    }
    if (!standardBatchWeight || standardBatchWeight <= 0) {
      messageApi.error(t("errorInvalidBatchWeight"));
      return;
    }
    if (components.length === 0) {
      messageApi.error(t("errorNoComponents"));
      return;
    }
    setShowBOMModal(true);
  };

  // Submit form
  const handleSubmit = async (values: any) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const catVal = values.category;
    if (["SemiFinalProduct", "FinalProduct"].includes(catVal)) {
      if (!values.standardBatchWeight || values.standardBatchWeight <= 0) {
        messageApi.error(t("errorBatchWeightRequired"));
        setIsSubmitting(false);
        return;
      }
      if (totalBOMGrams !== values.standardBatchWeight) {
        messageApi.error(
          t("errorBOMMismatch", {
            total: totalBOMGrams,
            batch: values.standardBatchWeight,
          }),
        );
        setIsSubmitting(false);
        return;
      }
    }

    let finalSKU = values.sku;
    if (autoAssignSKU) finalSKU = "AUTO-SKU-PLACEHOLDER";

    const convertedComponents = components.map((c) => {
      let pct = 0;
      const batchWeight = values.standardBatchWeight || 0;
      if (["SemiFinalProduct", "FinalProduct"].includes(catVal)) {
        pct = (c.grams / batchWeight) * 100;
      }
      return {
        componentId: c.componentId,
        percentage: pct,
        quantityUsed: c.grams,
      };
    });

    const dataToSend = {
      sku: finalSKU,
      barcode: values.barcode || "",
      itemName: values.itemName,
      category: catVal,
      quantity: values.quantity || 0,
      minQuantity: values.minQuantity || 0,
      unit: values.unit || "",
      currentCostPrice: values.currentCostPrice || 0,
      currentClientPrice: values.currentClientPrice || 0,
      currentBusinessPrice: values.currentBusinessPrice || 0,
      standardBatchWeight: values.standardBatchWeight || 0,
      components: convertedComponents,
    };

    const response = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataToSend),
    });
    const result = await response.json();
    if (response.ok) {
      // Clear localStorage on successful submission
      clearSavedData();
      setSuccessMessage(t(result.messageKey || "itemAddedSuccess"));
      setShowSuccessModal(true);
      setIsSubmitting(false);
    } else {
      // Handle specific error cases
      if (result.error === "duplicateSKU") {
        messageApi.error(t("duplicateSKU"), 5);
      } else if (result.error === "itemAddedFailure") {
        messageApi.error(t("itemAddedFailure"));
      } else {
        messageApi.error(t(result.error || "itemAddedFailure"));
      }
      setIsSubmitting(false);
    }
  };

  // Show conditional pricing fields
  const showCostPrice = [
    "ProductionRawMaterial",
    "CoffeeshopRawMaterial",
    "CleaningMaterial",
    "Packaging",
    "DisposableEquipment",
  ].includes(selectedCategory);

  const showBusinessClientPrices = selectedCategory === "FinalProduct";
  const showBOMSection = ["SemiFinalProduct", "FinalProduct"].includes(
    selectedCategory,
  );

  // Component table columns
  const componentColumns = [
    {
      title: t("componentLabel"),
      dataIndex: "componentId",
      key: "componentId",
      render: (componentId: string) => {
        const item = inventoryItems.find((inv) => inv._id === componentId);
        return item?.itemName || t("unknownComponent");
      },
    },
    {
      title: t("gramsLabel"),
      key: "grams",
      width: 150,
      render: (_: any, record: ComponentLine, index: number) => (
        <InputNumber
          min={0}
          step={0.01}
          value={record.grams}
          onChange={(value) => handleGramsChange(index, value || 0)}
          placeholder={t("gramsPlaceholder")}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: t("actionLabel"),
      key: "action",
      width: 100,
      render: (_: any, record: ComponentLine, index: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveLine(index)}
        >
          {t("removeBOMProduct")}
        </Button>
      ),
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme === "dark" ? "#1f1f1f" : "#ffffff",
        padding: "24px",
      }}
    >
      {contextHolder}
      <div style={{ maxWidth: "1200px", margin: "0 auto 16px" }}>
        <BackButton onClick={goUp}>{t("back")}</BackButton>
      </div>
      <Card
        style={{ maxWidth: "1200px", margin: "0 auto" }}
        title={
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>
            {t("title")}
          </div>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onValuesChange={saveFormData}
          initialValues={{
            quantity: 0,
            minQuantity: 0,
          }}
        >
          <Row gutter={16}>
            {/* SKU + Auto Assign */}
            <Col xs={24} md={12}>
              <Form.Item
                label={t("skuLabel")}
                name="sku"
                rules={[
                  {
                    required: !autoAssignSKU,
                    message: t("errorSKURequired"),
                  },
                ]}
              >
                <Space.Compact style={{ width: "100%" }}>
                  <Input
                    placeholder={t("skuPlaceholder")}
                    disabled={autoAssignSKU}
                    style={{ flex: 1 }}
                  />
                  <Checkbox
                    checked={autoAssignSKU}
                    onChange={(e) => setAutoAssignSKU(e.target.checked)}
                    style={{
                      padding: "0 11px",
                      display: "flex",
                      alignItems: "center",
                      border: "1px solid #d9d9d9",
                      borderLeft: 0,
                    }}
                  >
                    {t("autoAssign")}
                  </Checkbox>
                </Space.Compact>
              </Form.Item>
            </Col>

            {/* Barcode + Scan */}
            <Col xs={24} md={12}>
              <Form.Item label={t("barcodeLabel")} name="barcode">
                <Space.Compact style={{ width: "100%" }}>
                  <Input
                    placeholder={t("barcodePlaceholder")}
                    style={{ flex: 1 }}
                  />
                  <Button
                    type="primary"
                    icon={<ScanOutlined />}
                    onClick={handleScanBarcode}
                    style={{ background: "#52c41a", borderColor: "#52c41a" }}
                  >
                    {t("scan")}
                  </Button>
                </Space.Compact>
              </Form.Item>
            </Col>

            {/* Item Name */}
            <Col xs={24} md={12}>
              <Form.Item
                label={t("itemNameLabel")}
                name="itemName"
                rules={[
                  { required: true, message: t("errorItemNameRequired") },
                ]}
              >
                <Input placeholder={t("itemNamePlaceholder")} />
              </Form.Item>
            </Col>

            {/* Category */}
            <Col xs={24} md={12}>
              <Form.Item
                label={t("categoryLabel")}
                name="category"
                rules={[
                  { required: true, message: t("errorCategoryRequired") },
                ]}
              >
                <Select
                  placeholder={t("categoryPlaceholder")}
                  options={categories}
                  onChange={handleCategoryChange}
                  loading={isLoading}
                />
              </Form.Item>
            </Col>

            {/* Starting Quantity */}
            <Col xs={24} md={12}>
              <Form.Item label={t("quantityLabel")} name="quantity">
                <InputNumber
                  placeholder={t("quantityPlaceholder")}
                  style={{ width: "100%" }}
                  min={0}
                  step={0.01}
                />
              </Form.Item>
            </Col>

            {/* Unit */}
            <Col xs={24} md={12}>
              <Form.Item label={t("unitLabel")} name="unit">
                <Select
                  placeholder={t("unitPlaceholder")}
                  options={units}
                  loading={isLoading}
                />
              </Form.Item>
            </Col>

            {/* Min Quantity */}
            <Col xs={24} md={12}>
              <Form.Item label={t("minQuantityLabel")} name="minQuantity">
                <InputNumber
                  placeholder={t("minQuantityPlaceholder")}
                  style={{ width: "100%" }}
                  min={0}
                  step={0.01}
                />
              </Form.Item>
            </Col>

            {/* Cost Price for certain categories */}
            {showCostPrice && (
              <Col xs={24} md={12}>
                <Form.Item label={t("costPriceLabel")} name="currentCostPrice">
                  <InputNumber
                    placeholder={t("costPricePlaceholder")}
                    style={{ width: "100%" }}
                    min={0}
                    step={0.01}
                    prefix="₪"
                  />
                </Form.Item>
              </Col>
            )}

            {/* Business + Client Prices for Final Products */}
            {showBusinessClientPrices && (
              <>
                <Col xs={24} md={12}>
                  <Form.Item
                    label={t("businessPriceLabel")}
                    name="currentBusinessPrice"
                  >
                    <InputNumber
                      placeholder={t("businessPricePlaceholder")}
                      style={{ width: "100%" }}
                      min={0}
                      step={0.01}
                      prefix="₪"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label={t("clientPriceLabel")}
                    name="currentClientPrice"
                  >
                    <InputNumber
                      placeholder={t("clientPricePlaceholder")}
                      style={{ width: "100%" }}
                      min={0}
                      step={0.01}
                      prefix="₪"
                    />
                  </Form.Item>
                </Col>
              </>
            )}
          </Row>

          {/* BOM Section for Semi/Final Products */}
          {showBOMSection && (
            <>
              <Divider>{t("bomTitle")}</Divider>

              <Row gutter={16}>
                <Col xs={24}>
                  <Form.Item
                    label={t("standardBatchWeightLabel")}
                    name="standardBatchWeight"
                    rules={[
                      {
                        required: true,
                        message: t("errorBatchWeightRequired"),
                      },
                    ]}
                  >
                    <InputNumber
                      placeholder={t("standardBatchWeightPlaceholder")}
                      style={{ width: "100%" }}
                      min={0}
                      step={0.01}
                      addonAfter="g"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Card
                type="inner"
                title={t("bomTitle")}
                style={{ marginBottom: "16px" }}
              >
                <Space
                  direction="vertical"
                  style={{ width: "100%" }}
                  size="middle"
                >
                  <div>
                    <Select
                      showSearch
                      placeholder={t("bomSelectPlaceholder")}
                      options={rawMaterials}
                      onChange={handleComponentAdd}
                      onFocus={loadRawMaterials}
                      style={{ width: "100%", maxWidth: "400px" }}
                      filterOption={(input, option) => {
                        const label = option?.label as string;
                        return (
                          label?.toLowerCase().includes(input.toLowerCase()) ??
                          false
                        );
                      }}
                      loading={isLoading}
                    />
                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "12px",
                        color: "#8c8c8c",
                      }}
                    >
                      {t("bomAddMaterialNote")}
                    </div>
                  </div>

                  {components.length > 0 && (
                    <>
                      <Table
                        dataSource={components}
                        columns={componentColumns}
                        pagination={false}
                        rowKey="componentId"
                        size="small"
                      />

                      <div style={{ fontSize: "14px", fontWeight: "500" }}>
                        {t("totalBOMGramsLabel", {
                          bomtotal: totalBOMGrams.toString(),
                        })}
                      </div>

                      <Button
                        type="default"
                        icon={<EyeOutlined />}
                        onClick={handlePreviewBOM}
                      >
                        {t("bomPreview")}
                      </Button>
                    </>
                  )}
                </Space>
              </Card>
            </>
          )}

          {/* Submit Button */}
          <Form.Item style={{ marginTop: "24px" }}>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={isSubmitting}
              size="large"
              block
            >
              {isSubmitting ? t("Processing") : t("submit")}
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* SCANNER MODAL */}
      <Modal
        title={t("scanBarcodeTitle")}
        open={isScannerOpen}
        onCancel={() => setIsScannerOpen(false)}
        footer={null}
        width={600}
      >
        <div>
          <div
            id="interactive"
            style={{
              width: "100%",
              height: "320px",
              background: cameraAvailable === false ? "#f5f5f5" : undefined,
            }}
          />

          {scannerError && (
            <div
              style={{ color: "crimson", textAlign: "center", marginTop: 12 }}
            >
              {scannerError}
            </div>
          )}

          {cameraAvailable === false && (
            <div style={{ marginTop: 12 }}>
              <div style={{ marginBottom: 8, color: "#999" }}>
                {t("noCameraUpload") ||
                  "Camera not available — upload an image to scan or enter barcode manually"}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files && e.target.files[0];
                  if (!file) return;
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
                            "code_39_reader",
                          ],
                        },
                      },
                      (result: any) => {
                        if (
                          result &&
                          result.codeResult &&
                          result.codeResult.code
                        ) {
                          form.setFieldValue({
                            barcode: result.codeResult.code,
                          });
                          setIsScannerOpen(false);
                          setScannerError(null);
                        } else {
                          const txt =
                            t("noBarcodeInImage") ||
                            "No barcode detected in image";
                          setScannerError(txt);
                          message.error(txt);
                        }
                      },
                    );
                  } catch (err) {
                    console.error("Image decode error", err);
                    const txt =
                      (err && (err.message || String(err))) ||
                      t("imageDecodeError") ||
                      "Failed to decode image";
                    setScannerError(txt);
                    message.error(txt);
                  }
                }}
              />
            </div>
          )}

          <p
            style={{ textAlign: "center", marginTop: "16px", color: "#8c8c8c" }}
          >
            {t("scanInstructions")}
          </p>
        </div>
      </Modal>

      {/* RESTORE CONFIRMATION MODAL */}
      <RestoreFormModal
        open={showRestoreModal}
        onConfirm={handleRestore}
        onCancel={handleRestoreCancel}
        translationKey="inventory.add"
      />

      {/* BOM PREVIEW MODAL */}
      {showBOMModal && (
        <BOMPreviewModal
          open={showBOMModal}
          onClose={() => setShowBOMModal(false)}
          itemName={form.getFieldValue("itemName")}
          standardBatchWeight={form.getFieldValue("standardBatchWeight")}
          components={components}
          inventoryItems={inventoryItems}
        />
      )}

      {/* SUCCESS MODAL */}
      <Modal
        title={t("itemAddedSuccess")}
        open={showSuccessModal}
        onCancel={() => setShowSuccessModal(false)}
        footer={[
          <Button
            key="ok"
            type="primary"
            onClick={() => {
              setShowSuccessModal(false);
              router.push("/mainMenu");
            }}
          >
            {t("okMessage")}
          </Button>,
        ]}
      >
        <p>{successMessage}</p>
      </Modal>
    </div>
  );
}

// BOM PREVIEW MODAL – shows packaging cost and totals
function BOMPreviewModal({
  open,
  onClose,
  itemName,
  standardBatchWeight,
  components,
  inventoryItems,
}: {
  open: boolean;
  onClose: () => void;
  itemName: string;
  standardBatchWeight: number;
  components: ComponentLine[];
  inventoryItems: InventoryItem[];
}) {
  const t = useTranslations("inventory.add");
  const batchWeightNum = Number(standardBatchWeight) || 0;

  // Compute total cost including packaging
  const totalCost = components.reduce((acc, comp) => {
    const rm = inventoryItems.find((inv) => inv._id === comp.componentId);
    if (!rm) return acc;
    if (rm.category === "Packaging") {
      return acc + (rm.currentCostPrice || 0) * comp.grams;
    }
    return acc + ((rm.currentCostPrice || 0) / 1000) * comp.grams;
  }, 0);

  const columns = [
    {
      title: t("componentLabel"),
      dataIndex: "componentId",
      key: "componentId",
      render: (componentId: string) => {
        const rm = inventoryItems.find((inv) => inv._id === componentId);
        return <strong>{rm?.itemName || t("unknownComponent")}</strong>;
      },
    },
    {
      title: t("weightUsed"),
      key: "weightUsed",
      align: "center" as const,
      render: (_: any, record: ComponentLine) => {
        const rm = inventoryItems.find((inv) => inv._id === record.componentId);
        return rm?.category === "Packaging"
          ? `${record.grams} pc`
          : `${record.grams} g`;
      },
    },
    {
      title: t("percentage"),
      key: "percentage",
      align: "center" as const,
      render: (_: any, record: ComponentLine) => {
        const rm = inventoryItems.find((inv) => inv._id === record.componentId);
        if (rm?.category === "Packaging") return "—";
        const fraction = batchWeightNum ? record.grams / batchWeightNum : 0;
        return (fraction * 100).toFixed(2) + "%";
      },
    },
    {
      title: t("partialCost"),
      key: "partialCost",
      align: "center" as const,
      render: (_: any, record: ComponentLine) => {
        const rm = inventoryItems.find((inv) => inv._id === record.componentId);
        const cost = rm?.currentCostPrice || 0;
        const partialCost =
          rm?.category === "Packaging"
            ? cost * record.grams
            : (cost / 1000) * record.grams;
        return `₪${partialCost.toFixed(2)}`;
      },
    },
  ];

  return (
    <Modal
      title={
        <span>
          {t("bomFor")} <strong>{itemName || t("nA")}</strong>
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          {t("okMessage")}
        </Button>,
      ]}
      width={800}
    >
      <div style={{ marginBottom: "16px" }}>
        <span style={{ fontWeight: "600" }}>{t("productWeightLabel")}: </span>
        {batchWeightNum} g
      </div>
      <Table
        dataSource={components}
        columns={columns}
        pagination={false}
        rowKey="componentId"
        size="small"
        scroll={{ y: 300 }}
      />
      <div
        style={{
          marginTop: "16px",
          textAlign: "right",
          fontSize: "16px",
          fontWeight: "bold",
        }}
      >
        {t("bomTotalCost")} ₪{totalCost.toFixed(2)}
      </div>
    </Modal>
  );
}
