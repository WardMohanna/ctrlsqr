import mongoose from "mongoose";
import Epic from "@/models/Epic";

/** Canonical epic titles used for default assignment by task category */
export const DEFAULT_EPIC_TITLES = {
  production: "Production",
  customerOrder: "Customer order",
  businessCustomer: "Business customer",
} as const;

export async function getOrCreateEpicByTitle(
  title: string,
): Promise<mongoose.Types.ObjectId> {
  let doc = await Epic.findOne({ title });
  if (!doc) {
    doc = await Epic.create({ title, active: true });
  }
  return doc._id;
}

export async function getDefaultEpicIdForTaskType(
  taskType: string,
): Promise<mongoose.Types.ObjectId> {
  switch (taskType) {
    case "CustomerOrder":
      return getOrCreateEpicByTitle(DEFAULT_EPIC_TITLES.customerOrder);
    case "BusinessCustomer":
      return getOrCreateEpicByTitle(DEFAULT_EPIC_TITLES.businessCustomer);
    case "Production":
    default:
      return getOrCreateEpicByTitle(DEFAULT_EPIC_TITLES.production);
  }
}

export async function ensureAllDefaultEpics(): Promise<void> {
  await getOrCreateEpicByTitle(DEFAULT_EPIC_TITLES.production);
  await getOrCreateEpicByTitle(DEFAULT_EPIC_TITLES.customerOrder);
  await getOrCreateEpicByTitle(DEFAULT_EPIC_TITLES.businessCustomer);
}
