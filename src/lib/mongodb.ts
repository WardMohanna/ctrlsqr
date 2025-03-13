import { MongoClient , Db } from "mongodb";

declare global {
    var mongoClientPromise: Promise<MongoClient> | undefined;
  }

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = "textLogger";

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!global.mongoClientPromise) {
    client = new MongoClient(MONGO_URI);
    global.mongoClientPromise = client.connect();
}
clientPromise = global.mongoClientPromise;

export async function getDb(): Promise<Db> {    
    const client = await clientPromise;
    return client.db(DB_NAME);
}

export default clientPromise;
