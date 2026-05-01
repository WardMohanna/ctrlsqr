import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import connectMongo from "@/lib/db"; // Mongoose connection utility
import User from "@/models/User";       // Mongoose User model
import Tenant from "@/models/Tenant";
import bcrypt from "bcryptjs";

const LOGIN_ERRORS = {
  MISSING_CREDENTIALS: "LOGIN_MISSING_CREDENTIALS",
  USER_NOT_FOUND: "LOGIN_USER_NOT_FOUND",
  INCORRECT_PASSWORD: "LOGIN_INCORRECT_PASSWORD",
  USER_DISABLED: "LOGIN_USER_DISABLED",
  TENANT_DISABLED: "LOGIN_TENANT_DISABLED",
} as const;

export const authOptions: NextAuthOptions = {
  // Remove the MongoDBAdapter so that we use Mongoose for our user checks
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username?.trim();

        if (!username || !credentials?.password) {
          throw new Error(LOGIN_ERRORS.MISSING_CREDENTIALS);
        }

        // Ensure Mongoose is connected
        await connectMongo();

        // Find the user using the Mongoose model
        const user = await User.findOne({ userName: username });
        if (!user) {
          throw new Error(LOGIN_ERRORS.USER_NOT_FOUND);
        }

        // Compare the password with the stored hashed password
        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!passwordMatch) {
          throw new Error(LOGIN_ERRORS.INCORRECT_PASSWORD);
        }

        if (user.isActive === false) {
          throw new Error(LOGIN_ERRORS.USER_DISABLED);
        }

        if (user.tenantId) {
          const tenant = await Tenant.findOne({ _id: user.tenantId }).select("isActive").lean();
          if (tenant && (tenant as any).isActive === false) {
            throw new Error(LOGIN_ERRORS.TENANT_DISABLED);
          }
        }

        // Return the user object with the necessary properties.
        // tenantId is read from the DB; never trust it from the frontend.
        return {
          id: user.id,
          name: user.name,
          lastname: user.lastname,
          role: user.role,
          tenantId: user.tenantId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.name = user.name;
        token.lastname = user.lastname;
        token.tenantId = user.tenantId ?? null;
      }
      return token;
    },
    async session({ session, token }: any) {
      session.user.role = token.role;
      session.user.id = token.id;
      session.user.name = token.name;
      session.user.lastname = token.lastname;
      session.user.tenantId = token.tenantId ?? null;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
