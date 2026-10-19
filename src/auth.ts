import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        })

        if (!user || !user.password) {
          // If the user doesn't exist, create a mock user automatically for local development
          const hashedPassword = await bcrypt.hash(credentials.password as string, 10)
          const userName = (credentials.name as string)?.trim() || (credentials.email as string).split("@")[0]
          const newUser = await prisma.user.create({
            data: {
              email: credentials.email as string,
              name: userName,
              password: hashedPassword
            }
          })
          return newUser
        }

        const passwordsMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (passwordsMatch) {
          return user
        }

        return null
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { name: true, email: true }
          })
          if (dbUser) {
            session.user.name = dbUser.name ?? undefined
            session.user.email = dbUser.email ?? ""
          }
        } catch (e) {
          console.error("Failed to fetch fresh user in session callback:", e)
        }
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.name = user.name ?? undefined
        token.email = user.email ?? undefined
      }
      return token
    }
  },
  pages: {
    signIn: '/login',
  }
})
