import { connectToDatabase } from "@/lib/mongodb";
import ClientSettings from "@/models/ClientSettings";

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    let settings = await ClientSettings.findOne({});

    if (!settings) {
      // Create default settings if none exist
      settings = await ClientSettings.create({});
    }

    return Response.json(settings, { status: 200 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { 
      visibleFields, 
      mandatoryFields, 
      defaultVisibleFields,
      availableCustomFields,
      allowMultipleCategories,
      allowCustomCategories,
      allowCustomPaymentTerms,
    } = body;

    let settings = await ClientSettings.findOne({});

    if (!settings) {
      settings = await ClientSettings.create({});
    }

    if (visibleFields) settings.visibleFields = visibleFields;
    if (mandatoryFields) settings.mandatoryFields = mandatoryFields;
    if (defaultVisibleFields) settings.defaultVisibleFields = defaultVisibleFields;
    if (availableCustomFields) settings.availableCustomFields = availableCustomFields;
    if (allowMultipleCategories !== undefined) settings.allowMultipleCategories = allowMultipleCategories;
    if (allowCustomCategories !== undefined) settings.allowCustomCategories = allowCustomCategories;
    if (allowCustomPaymentTerms !== undefined) settings.allowCustomPaymentTerms = allowCustomPaymentTerms;

    settings.updatedAt = new Date();
    await settings.save();

    return Response.json(settings, { status: 200 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
