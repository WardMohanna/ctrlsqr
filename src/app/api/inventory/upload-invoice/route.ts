import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import connectMongo from "@/lib/db";
import Invoice from "@/models/Invoice";
import Supplier from "@/models/Supplier";

export const config = {
  api: {
    bodyParser: false, // נדרש כדי לעבוד עם FormData
  },
};

export const POST = async (req: NextRequest) => {
  try {
    await connectMongo();

    // ✅ קריאת ה-Body של הבקשה
    const data = await req.formData();
    console.log("📥 Received FormData:", data);

    // ✅ בדיקה אם הקובץ התקבל
    const file = data.get("file") as File;
    if (!file) {
      console.error("❌ No file received!");
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // ✅ בדיקה אם סוג המסמך התקבל
    const documentType = data.get("documentType") as string;
    if (!documentType) {
      console.error("❌ No document type received!");
      return NextResponse.json({ error: "Document type is required" }, { status: 400 });
    }

    console.log("✅ File and document type received:", file.name, documentType);

    let supplierId = data.get("supplierId") as string;
    let supplierName = data.get("supplierName") as string;
    
    console.log("📦 Supplier Info:", { supplierId, supplierName });

    if (!supplierId && supplierName) {
      let existingSupplier = await Supplier.findOne({ name: supplierName });
      if (!existingSupplier) {
        const newSupplier = new Supplier({ name: supplierName });
        await newSupplier.save();
        supplierId = newSupplier._id;
      } else {
        supplierId = existingSupplier._id;
      }
    }

    if (!supplierId) {
      console.error("❌ No supplier information received!");
      return NextResponse.json({ error: "Supplier is required" }, { status: 400 });
    }

    console.log("✅ Supplier ID resolved:", supplierId);

    // ✅ שמירת הקובץ
    const uploadDir = path.join(process.cwd(), "public/uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = path.join(uploadDir, fileName);
    await promisify(fs.writeFile)(filePath, fileBuffer);

    console.log(`✅ File saved successfully: ${filePath}`);

    // ✅ שליחת הקובץ לפענוח
    const extractedData = await sendImageForProcessing(`/uploads/${fileName}`);

    console.log("📊 Extracted Data:", extractedData);

    // ✅ שמירת המסמך בבסיס הנתונים
    const invoice = new Invoice({
      supplier: supplierId,
      documentId: fileName,
      filePath: `/uploads/${fileName}`,
      documentType,
      extractedData,
    });

    await invoice.save();

    console.log("✅ Invoice saved to DB!");

    return NextResponse.json({
      message: "File uploaded and processed successfully!",
      documentId: fileName,
      extractedData,
    }, { status: 200 });

  } catch (error) {
    console.error("❌ Processing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};

// // 📌 פונקציה לשליחת התמונה לפענוח
// async function sendImageForProcessing(imagePath: string) {
//   console.log(`📤 Sending ${imagePath} for AI processing...`);
//   console.log(`https://5d3f-176-106-230-168.ngrok-free.app/${imagePath}`);

//   const API_KEY = process.env.OPENAI_API_KEY;
//   const API_URL = "https://api.openai.com/v1/chat/completions";

//   if (!API_KEY) {
//     throw new Error("❌ Missing OpenAI API Key!");
//   }

//   const response = await fetch(API_URL, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       "Authorization": `Bearer ${API_KEY}`,
//     },
//     body: JSON.stringify({
//       model: "gpt-4-turbo",
//       messages: [
//         { role: "system", content: "Extract all text from this invoice image and return structured JSON." },
//         { role: "user", content: [{ type: "image_url", image_url: `https://5d3f-176-106-230-168.ngrok-free.app/${imagePath}` }] }
//       ],
//       max_tokens: 1000,
//     }),
//   });

//   if (!response.ok) {
//     throw new Error(`❌ OpenAI Vision API failed: ${response.statusText}`);
//   }

//   return response.json();
// }

async function sendImageForProcessing(imagePath: string) {
  const NGROK_URL = "https://5d3f-176-106-230-168.ngrok-free.app"; // Replace with your ngrok URL
  const IMAGE_URL = `${NGROK_URL}${imagePath}`;
  console.log(`📤 Sending Image URL: ${IMAGE_URL}`);

  const API_KEY = process.env.OPENAI_API_KEY;
  const API_URL = "https://api.openai.com/v1/chat/completions";

  if (!API_KEY) {
    throw new Error("❌ Missing OpenAI API Key!");
  }

  const requestBody = {
    model: "gpt-4-turbo",
    messages: [
      { role: "system", content: "Extract all text from this invoice image and return structured JSON." },
      { role: "user",
         content: [
        {
           type: "image_url",
            image_url: {url: IMAGE_URL}
           }
      ] }
    ],
    max_tokens: 1000,
  };

  console.log(`📡 Request to OpenAI:\n`, JSON.stringify(requestBody, null, 2));

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text(); // Read response even if failed
  console.log(`📩 OpenAI Response: ${response.status} - ${responseText}`);

  if (!response.ok) {
    throw new Error(`❌ OpenAI Vision API failed: ${response.status}`);
  }

  return JSON.parse(responseText);
}

