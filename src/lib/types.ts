// src/types.ts or src/types/index.ts

import { DefaultSession } from "next-auth";

// Existing User and Session types
export interface User {
  id: string;
  name: string;
  lastname: string;
  role: string;
  userName: string;
  password: string;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string | null;
    } & DefaultSession["user"];
  }
}

// ✅ Add these if not defined yet
export interface ComponentLine {
  componentId: string;
  grams: number;
}

export interface InventoryItem {
  _id: string;
  category: string;
  grams: number;
}
