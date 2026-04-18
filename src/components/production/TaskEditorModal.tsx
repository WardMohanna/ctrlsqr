"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  Form,
  Radio,
  Select,
  InputNumber,
  DatePicker,
  Input,
  Button,
  Space,
  Upload,
  Typography,
  Alert,
  List,
  message,
  Divider,
  Flex,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";

const { Text } = Typography;

type UserMini = {
  id: string;
  name?: string;
  lastname?: string;
  userName?: string;
};

export type BoardTaskShape = {
  _id: string;
  product?: { _id: string; itemName: string };
  plannedQuantity: number;
  productionDate: string;
  status: string;
  taskName?: string;
  taskType?: string;
  epic?: { _id: string; title: string } | null;
  customerName?: string;
  businessCustomerName?: string;
  orderLines?: Array<{
    product?: { _id: string; itemName: string } | string;
    quantity: number;
    unitPrice?: number;
  }>;
  orderTotalPrice?: number;
  deliveryDate?: string;
  attachmentUrl?: string;
  attachmentOriginalName?: string;
  attachmentMimeType?: string;
  isDraft?: boolean;
  createdBy?: string;
  ownerId?: string;
  assigneeIds?: string[];
  createdByUser?: UserMini | null;
  ownerUser?: UserMini | null;
  assigneeUsers?: UserMini[];
};

type EpicRef = { _id: string; title: string };

type Props = {
  open: boolean;
  task: BoardTaskShape | null;
  epics: EpicRef[];
  onClose: () => void;
  onSaved: () => void;
  sessionUserId: string;
  sessionRole: string;
  /** i18n: production.board */
  t: (key: string, values?: Record<string, string | number>) => string;
};

function formatUser(u?: UserMini | null) {
  if (!u) return "—";
  const n = [u.name, u.lastname].filter(Boolean).join(" ").trim();
  return n || u.userName || u.id;
}

const SEARCH_DEBOUNCE_MS = 250;
const PAGE_SIZE = 15;

export function TaskEditorModal({
  open,
  task,
  epics,
  onClose,
  onSaved,
  sessionUserId,
  sessionRole,
  t,
}: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<UserMini[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<
    { _id: string; itemName: string }[]
  >([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [productPage, setProductPage] = useState(1);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [validationModal, setValidationModal] = useState<{
    issues: any;
    pendingValues: Record<string, unknown>;
  } | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const taskTypeWatch = Form.useWatch("taskType", form);

  const loadInventoryItems = useCallback(
    async (searchTerm = "", page = 1, append = false) => {
      if (itemsLoading) return;
      setItemsLoading(true);
      try {
        const params = new URLSearchParams({
          category: "FinalProduct,SemiFinalProduct",
          fields: "_id,itemName,category",
          paginated: "true",
          limit: String(PAGE_SIZE),
          page: String(page),
        });
        if (searchTerm.trim()) params.set("search", searchTerm.trim());
        const res = await fetch(`/api/inventory?${params.toString()}`);
        if (!res.ok) throw new Error("inventory");
        const data = await res.json();
        const nextItems = data.items ?? [];
        setInventoryItems((prev) => {
          if (!append) return nextItems;
          const map = new Map(prev.map((i) => [i._id, i]));
          for (const it of nextItems) map.set(it._id, it);
          return Array.from(map.values());
        });
        setProductPage(page);
        setProductSearchTerm(searchTerm);
        setHasMoreProducts(page * PAGE_SIZE < (data.total ?? 0));
      } catch {
        message.error(t("editorLoadProductsError"));
      } finally {
        setItemsLoading(false);
      }
    },
    [itemsLoading, t],
  );

  useEffect(() => {
    if (!open || !task) return;
    const lines =
      task.orderLines?.map((line) => ({
        product: typeof line.product === "object" && line.product?._id
          ? line.product._id
          : line.product,
        quantity: line.quantity ?? 1,
        unitPrice: line.unitPrice,
      })) ?? [];

    const ownerDefault =
      task.ownerId ||
      task.createdBy ||
      sessionUserId;
    const assigneeDefault =
      task.assigneeIds?.length ? task.assigneeIds : [ownerDefault];

    form.setFieldsValue({
      taskType: task.taskType || "Production",
      taskName: task.taskName,
      product: task.product?._id,
      plannedQuantity: task.plannedQuantity || 1,
      productionDate: task.productionDate
        ? dayjs(task.productionDate)
        : dayjs(),
      epicId: task.epic?._id,
      customerName: task.customerName,
      businessCustomerName: task.businessCustomerName,
      orderLines: lines.length ? lines : [{ product: undefined, quantity: 1 }],
      orderTotalPrice: task.orderTotalPrice ?? 0,
      deliveryDate: task.deliveryDate ? dayjs(task.deliveryDate) : undefined,
      attachmentUrl: task.attachmentUrl,
      attachmentOriginalName: task.attachmentOriginalName,
      attachmentMimeType: task.attachmentMimeType,
      ownerId: ownerDefault,
      assigneeIds: assigneeDefault,
    });

    if (task.product?._id) {
      setInventoryItems((prev) => {
        if (prev.some((p) => p._id === task.product!._id)) return prev;
        return [
          ...prev,
          { _id: task.product!._id, itemName: task.product!.itemName },
        ];
      });
    }

    setFileList(
      task.attachmentUrl
        ? [
            {
              uid: "-1",
              name: task.attachmentOriginalName || "file",
              status: "done",
              url: task.attachmentUrl,
            },
          ]
        : [],
    );
  }, [open, task, form, sessionUserId]);

  useEffect(() => {
    if (!open || !task) return;
    const canLoadList =
      sessionRole === "admin" ||
      task.ownerId === sessionUserId ||
      (!task.ownerId && task.createdBy === sessionUserId);
    if (!canLoadList) {
      setAssignableUsers([]);
      setUsersLoading(false);
      return;
    }
    let cancelled = false;
    setUsersLoading(true);
    fetch(`/api/production/tasks/${task._id}/assignable-users`)
      .then((r) => {
        if (!r.ok) throw new Error("users");
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setAssignableUsers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setAssignableUsers([]);
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, task, sessionRole, sessionUserId]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const buildPayload = (
    values: Record<string, unknown>,
    isDraft: boolean,
    skipValidation = false,
  ) => {
    const productionDate = (values.productionDate as Dayjs)?.format("YYYY-MM-DD");
    const deliveryDate = (values.deliveryDate as Dayjs)?.format("YYYY-MM-DD");
    const base: Record<string, unknown> = {
      action: "updateDetails",
      taskType: values.taskType,
      taskName: values.taskName,
      productionDate,
      isDraft,
      skipValidation,
    };
    if (values.epicId) {
      base.epicId = values.epicId;
    } else {
      base.syncEpicToTaskType = true;
    }
    const tt = values.taskType as string;
    if (tt === "Production") {
      base.product = values.product;
      base.plannedQuantity = values.plannedQuantity;
    }
    if (tt === "CustomerOrder") {
      base.customerName = values.customerName;
      base.orderLines = (values.orderLines as any[])?.filter(
        (l) => l?.product && l.quantity != null,
      );
      base.orderTotalPrice = values.orderTotalPrice;
      base.deliveryDate = deliveryDate;
      base.attachmentUrl = values.attachmentUrl;
      base.attachmentOriginalName = values.attachmentOriginalName;
      base.attachmentMimeType = values.attachmentMimeType;
    }
    if (tt === "BusinessCustomer") {
      base.businessCustomerName = values.businessCustomerName;
      base.orderLines = (values.orderLines as any[])?.filter(
        (l) => l?.product && l.quantity != null,
      );
    }

    const canEditAssignees = sessionRole === "admin";
    const canEditOwner =
      sessionRole === "admin" ||
      task?.ownerId === sessionUserId ||
      (!task?.ownerId && task?.createdBy === sessionUserId);
    if (canEditOwner) {
      base.ownerId = values.ownerId;
    }
    if (canEditAssignees) {
      base.assigneeIds = values.assigneeIds;
    }
    return base;
  };

  const submit = async (isDraft: boolean, skipVal = false) => {
    if (!task) return;
    try {
      const values = isDraft
        ? form.getFieldsValue()
        : await form.validateFields();
      setLoading(true);
      const payload = buildPayload(values as Record<string, unknown>, isDraft, skipVal);
      const res = await fetch(`/api/production/tasks/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.validationRequired && !skipVal) {
        setValidationModal({ issues: data.issues, pendingValues: values });
        setLoading(false);
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || "save failed");
      }
      message.success(isDraft ? t("editorDraftSaved") : t("editorSaved"));
      setValidationModal(null);
      onSaved();
      onClose();
    } catch (e: unknown) {
      if ((e as any)?.errorFields) return;
      message.error(e instanceof Error ? e.message : t("editorSaveError"));
    } finally {
      setLoading(false);
    }
  };

  const handleValidationConfirm = async () => {
    if (!task || !validationModal) return;
    setLoading(true);
    try {
      const values = validationModal.pendingValues;
      const payload = buildPayload(values as Record<string, unknown>, false, true);
      const res = await fetch(`/api/production/tasks/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "save failed");
      message.success(t("editorSaved"));
      setValidationModal(null);
      onSaved();
      onClose();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : t("editorSaveError"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = () => {
    if (!task || sessionRole !== "admin") return;
    Modal.confirm({
      title: t("deleteTaskConfirmTitle"),
      content: t("deleteTaskConfirmDesc"),
      okText: t("deleteTask"),
      okType: "danger",
      cancelText: t("cancel"),
      onOk: async () => {
        setDeleteLoading(true);
        try {
          const res = await fetch(`/api/production/tasks/${task._id}`, {
            method: "DELETE",
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(
              typeof data.error === "string" ? data.error : "delete failed",
            );
          }
          message.success(t("deleteTaskSuccess"));
          onSaved();
          onClose();
        } catch (e: unknown) {
          message.error(
            e instanceof Error ? e.message : t("deleteTaskError"),
          );
        } finally {
          setDeleteLoading(false);
        }
      },
    });
  };

  const isAllowedCustomerAttachment = (file: File) => {
    const name = (file.name || "").toLowerCase();
    const mime = (file.type || "").toLowerCase();
    if (name.endsWith(".pdf")) return true;
    if (name.endsWith(".canva")) return true;
    if (mime === "application/pdf" || mime === "application/x-pdf") return true;
    return false;
  };

  const handleUpload = async (file: File) => {
    if (!isAllowedCustomerAttachment(file)) {
      throw new Error(t("editorAttachmentInvalidType"));
    }
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/production/task-attachment", {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "upload failed");
    }
    const data = await res.json();
    form.setFieldsValue({
      attachmentUrl: data.url,
      attachmentOriginalName: data.originalName,
      attachmentMimeType: data.mimeType,
    });
    return data.url;
  };

  const isDraft = task?.isDraft === true;

  const canEditAssignees = sessionRole === "admin";
  const canEditOwner =
    sessionRole === "admin" ||
    task?.ownerId === sessionUserId ||
    (!task?.ownerId && task?.createdBy === sessionUserId);

  return (
    <>
      <Modal
        title={t("editorTitle")}
        open={open && !!task}
        onCancel={onClose}
        width={720}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ taskType: "Production" }}>
          <Form.Item name="attachmentUrl" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="attachmentOriginalName" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="attachmentMimeType" hidden>
            <Input />
          </Form.Item>

          <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
            {t("taskCreator")}: {formatUser(task?.createdByUser)}
          </Text>

          {canEditOwner ? (
            <Form.Item
              name="ownerId"
              label={t("taskOwner")}
              rules={[{ required: true, message: t("taskOwnerRequired") }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                loading={usersLoading}
                options={assignableUsers.map((u) => ({
                  label: formatUser(u),
                  value: u.id,
                }))}
              />
            </Form.Item>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">{t("taskOwner")}: </Text>
              <Text>{formatUser(task?.ownerUser)}</Text>
            </div>
          )}

          {canEditAssignees ? (
            <Form.Item
              name="assigneeIds"
              label={t("taskAssignees")}
              rules={[
                {
                  required: true,
                  type: "array",
                  min: 1,
                  message: t("taskAssigneesRequired"),
                },
              ]}
            >
              <Select
                mode="multiple"
                showSearch
                optionFilterProp="label"
                loading={usersLoading}
                options={assignableUsers.map((u) => ({
                  label: formatUser(u),
                  value: u.id,
                }))}
              />
            </Form.Item>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">{t("taskAssignees")}: </Text>
              <Text>
                {(task?.assigneeUsers?.length
                  ? task.assigneeUsers.map(formatUser).join(", ")
                  : "—")}
              </Text>
            </div>
          )}

          <Divider style={{ margin: "12px 0" }} />

          <Form.Item name="taskType" label={t("editorTaskType")}>
            <Radio.Group disabled={!isDraft}>
              <Radio.Button value="Production">{t("typeProduction")}</Radio.Button>
              <Radio.Button value="CustomerOrder">{t("typeCustomerOrder")}</Radio.Button>
              <Radio.Button value="BusinessCustomer">
                {t("typeBusinessCustomer")}
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="taskName" label={t("editorTaskName")}>
            <Input />
          </Form.Item>

          <Form.Item
            name="productionDate"
            label={t("editorProductionDate")}
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item name="epicId" label={t("assignEpic")}>
            <Select
              allowClear
              placeholder={t("assignEpic")}
              options={epics.map((e) => ({ label: e.title, value: e._id }))}
            />
          </Form.Item>

          {taskTypeWatch === "Production" && (
            <>
              <Form.Item
                name="product"
                label={t("editorProduct")}
                rules={
                  isDraft
                    ? []
                    : [{ required: true, message: t("editorProductRequired") }]
                }
              >
                <Select
                  showSearch
                  loading={itemsLoading}
                  placeholder={t("editorProduct")}
                  onFocus={() => {
                    if (inventoryItems.length === 0) loadInventoryItems("", 1, false);
                  }}
                  onSearch={(v) => {
                    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                    searchTimeoutRef.current = setTimeout(() => {
                      loadInventoryItems(v, 1, false);
                    }, SEARCH_DEBOUNCE_MS);
                  }}
                  filterOption={false}
                  options={inventoryItems.map((i) => ({
                    label: i.itemName,
                    value: i._id,
                  }))}
                />
              </Form.Item>
              <Form.Item
                name="plannedQuantity"
                label={t("editorPlannedQty")}
                rules={
                  isDraft
                    ? []
                    : [
                        { required: true, message: t("editorQtyRequired") },
                        { type: "number", min: 1, message: t("editorQtyRequired") },
                      ]
                }
              >
                <InputNumber min={isDraft ? 0 : 1} style={{ width: "100%" }} />
              </Form.Item>
            </>
          )}

          {taskTypeWatch === "CustomerOrder" && (
            <>
              <Form.Item
                name="customerName"
                label={t("editorCustomerName")}
                rules={[{ required: !isDraft }]}
              >
                <Input />
              </Form.Item>
              <Form.List name="orderLines">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field) => (
                      <Space key={field.key} align="start" style={{ display: "flex" }}>
                        <Form.Item
                          {...field}
                          name={[field.name, "product"]}
                          label={field.name === 0 ? t("editorProduct") : undefined}
                          rules={[{ required: !isDraft }]}
                        >
                          <Select
                            showSearch
                            style={{ minWidth: 200 }}
                            placeholder={t("editorProduct")}
                            onFocus={() => {
                              if (inventoryItems.length === 0) {
                                loadInventoryItems("", 1, false);
                              }
                            }}
                            onSearch={(v) => {
                              if (searchTimeoutRef.current) {
                                clearTimeout(searchTimeoutRef.current);
                              }
                              searchTimeoutRef.current = setTimeout(() => {
                                loadInventoryItems(v, 1, false);
                              }, SEARCH_DEBOUNCE_MS);
                            }}
                            filterOption={false}
                            options={inventoryItems.map((i) => ({
                              label: i.itemName,
                              value: i._id,
                            }))}
                          />
                        </Form.Item>
                        <Form.Item
                          {...field}
                          name={[field.name, "quantity"]}
                          label={field.name === 0 ? t("editorLineQty") : undefined}
                          rules={[{ required: !isDraft }]}
                        >
                          <InputNumber min={1} />
                        </Form.Item>
                        <Form.Item
                          {...field}
                          name={[field.name, "unitPrice"]}
                          label={field.name === 0 ? t("editorLinePrice") : undefined}
                        >
                          <InputNumber min={0} />
                        </Form.Item>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => remove(field.name)}
                          style={{ marginTop: field.name === 0 ? 30 : 0 }}
                        />
                      </Space>
                    ))}
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      {t("editorAddLine")}
                    </Button>
                  </>
                )}
              </Form.List>
              <Form.Item
                name="orderTotalPrice"
                label={t("editorOrderPrice")}
                rules={[{ required: !isDraft }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item
                name="deliveryDate"
                label={t("editorDeliveryDate")}
                rules={[{ required: !isDraft }]}
              >
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>
              <Form.Item label={t("editorAttachment")}>
                <Upload
                  accept=".pdf,.canva,application/pdf"
                  fileList={fileList}
                  beforeUpload={async (file) => {
                    try {
                      const url = await handleUpload(file);
                      setFileList([
                        {
                          uid: file.uid,
                          name: file.name,
                          status: "done",
                          url,
                        },
                      ]);
                    } catch (e: unknown) {
                      message.error(e instanceof Error ? e.message : "Upload failed");
                    }
                    return false;
                  }}
                  onRemove={() => {
                    setFileList([]);
                    form.setFieldsValue({
                      attachmentUrl: undefined,
                      attachmentOriginalName: undefined,
                      attachmentMimeType: undefined,
                    });
                  }}
                >
                  <Button icon={<UploadOutlined />}>{t("editorUpload")}</Button>
                </Upload>
                <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                  {t("editorAttachmentHint")}
                </Text>
              </Form.Item>
            </>
          )}

          {taskTypeWatch === "BusinessCustomer" && (
            <>
              <Form.Item
                name="businessCustomerName"
                label={t("editorBusinessCustomer")}
                rules={[{ required: !isDraft }]}
              >
                <Input />
              </Form.Item>
              <Form.List name="orderLines">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field) => (
                      <Space key={field.key} align="start">
                        <Form.Item
                          {...field}
                          name={[field.name, "product"]}
                          rules={[{ required: !isDraft }]}
                        >
                          <Select
                            showSearch
                            style={{ minWidth: 200 }}
                            placeholder={t("editorProduct")}
                            onFocus={() => {
                              if (inventoryItems.length === 0) {
                                loadInventoryItems("", 1, false);
                              }
                            }}
                            onSearch={(v) => {
                              if (searchTimeoutRef.current) {
                                clearTimeout(searchTimeoutRef.current);
                              }
                              searchTimeoutRef.current = setTimeout(() => {
                                loadInventoryItems(v, 1, false);
                              }, SEARCH_DEBOUNCE_MS);
                            }}
                            filterOption={false}
                            options={inventoryItems.map((i) => ({
                              label: i.itemName,
                              value: i._id,
                            }))}
                          />
                        </Form.Item>
                        <Form.Item
                          {...field}
                          name={[field.name, "quantity"]}
                          rules={[{ required: !isDraft }]}
                        >
                          <InputNumber min={1} />
                        </Form.Item>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => remove(field.name)}
                        />
                      </Space>
                    ))}
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      {t("editorAddLine")}
                    </Button>
                  </>
                )}
              </Form.List>
            </>
          )}

          <Flex justify="space-between" align="center" wrap="wrap" gap={8} style={{ marginTop: 16 }}>
            <Space wrap>
              <Button onClick={onClose}>{t("cancel")}</Button>
              <Button onClick={() => submit(true)} loading={loading}>
                {t("editorSaveDraft")}
              </Button>
              <Button type="primary" onClick={() => submit(false)} loading={loading}>
                {t("editorSave")}
              </Button>
            </Space>
            {sessionRole === "admin" && (
              <Button
                danger
                loading={deleteLoading}
                disabled={loading}
                icon={<DeleteOutlined />}
                onClick={handleDeleteTask}
              >
                {t("deleteTask")}
              </Button>
            )}
          </Flex>
        </Form>
      </Modal>

      <Modal
        open={!!validationModal}
        onCancel={() => setValidationModal(null)}
        onOk={handleValidationConfirm}
        title={t("validationTitle")}
        okText={t("proceedAnyway")}
      >
        {validationModal && (
          <Alert type="warning" message={t("validationWarning")} style={{ marginBottom: 12 }} />
        )}
        {validationModal?.issues?.missing?.length ? (
          <List
            size="small"
            header={t("materialsMissing")}
            dataSource={validationModal.issues.missing}
            renderItem={(item: any) => (
              <List.Item>
                {item.materialName} — {t("required")}: {item.required}
              </List.Item>
            )}
          />
        ) : null}
      </Modal>
    </>
  );
}
