import { DefaultSession } from "next-auth";

export interface User {
    id: string;
    name: string;
    lastname: string;
    role: string;
    userName : string;
    password : string;
  }

  declare module "next-auth" {
    interface Session {
      user: {
        /** The user's unique identifier. */
        id: string;
        /** The user's role. */
        role?: string | null;
        // Note: The default session already includes "name", "email", and "image"
      } & DefaultSession["user"];
    }
}