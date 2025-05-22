import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import connectMongo from "@/lib/db"; // Mongoose connection utility
import User from "@/models/User";       // Mongoose User model
import bcrypt from "bcryptjs";

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
        if (!credentials?.username || !credentials?.password) {
          throw new Error("❌ Missing username or password");
        }

        // Ensure Mongoose is connected
        await connectMongo();

        // Find the user using the Mongoose model
        const user = await User.findOne({ userName: credentials.username });
        if (!user) {
          throw new Error("❌ User not found");
        }

        // Compare the password with the stored hashed password
        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!passwordMatch) {
          throw new Error("❌ Incorrect password");
        }

        // Return the user object with the necessary properties
        return { id: user.id, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }: any) {
      session.user.role = token.role;
      session.user.id = token.id;
      session.user.name = token.name;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
