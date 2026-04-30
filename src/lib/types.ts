import { DefaultSession } from "next-auth";

export interface User {
  id: string;
  name: string;
  lastname: string;
  role: string;
  userName: string;
  password: string;
  tenantId?: string | null;
  hourPrice?: number;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string | null;
      tenantId?: string | null;
    } & DefaultSession["user"];
  }
}
