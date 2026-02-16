
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    providers: [
        Credentials({
            async authorize(credentials) {
                if (credentials?.email && credentials?.password) {
                    const user = await prisma.user.findUnique({
                        where: { email: credentials.email as string },
                    });
                    if (user && user.passwordHash) {
                        const passwordsMatch = await bcrypt.compare(credentials.password as string, user.passwordHash);
                        if (passwordsMatch) return user;
                    }
                }
                return null;
            },
        }),
    ],
})
