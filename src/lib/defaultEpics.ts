import mongoose, { Model } from "mongoose";

type EpicModel = Model<{
  _id: mongoose.Types.ObjectId;
  title: string;
  active: boolean;
  description?: string;
}>;

/** Canonical epic titles used for default assignment by task category */
export const DEFAULT_EPIC_TITLES = {
  production: "Production",
  customerOrder: "Customer order",
  businessCustomer: "Business customer",
} as const;

export async function getOrCreateEpicByTitle(
  title: string,
  Epic: EpicModel,
): Promise<mongoose.Types.ObjectId> {
  let doc = await Epic.findOne({ title });
  if (!doc) {
    doc = await Epic.create({ title, active: true });
  }
  return doc._id;
}

export async function getDefaultEpicIdForTaskType(
  taskType: string,
  Epic: EpicModel,
): Promise<mongoose.Types.ObjectId> {
  switch (taskType) {
    case "CustomerOrder":
      return getOrCreateEpicByTitle(DEFAULT_EPIC_TITLES.customerOrder, Epic);
    case "BusinessCustomer":
      return getOrCreateEpicByTitle(DEFAULT_EPIC_TITLES.businessCustomer, Epic);
    case "Production":
    default:
      return getOrCreateEpicByTitle(DEFAULT_EPIC_TITLES.production, Epic);
  }
}

export async function ensureAllDefaultEpics(Epic: EpicModel): Promise<void> {
  await getOrCreateEpicByTitle(DEFAULT_EPIC_TITLES.production, Epic);
  await getOrCreateEpicByTitle(DEFAULT_EPIC_TITLES.customerOrder, Epic);
  await getOrCreateEpicByTitle(DEFAULT_EPIC_TITLES.businessCustomer, Epic);
}
