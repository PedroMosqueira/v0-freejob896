import NextAuth from "next-auth"
import type { NextAuthOptions } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { getUserByEmail } from "@/lib/auth-users"
import type { Session } from "next-auth"
import { getServerSession } from "next-auth/next"
import { createClient } from "@supabase/supabase-js"

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<{ id: string; email: string } | null> {
        try {
          const email = credentials.email as string
          const password = credentials.password as string

          console.log("🔐 Auth attempt for email:", email)

          if (!email || !password) {
            console.log("❌ Missing email or password")
            return null
          }

          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          )

          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (authError || !authData.user) {
            console.log("❌ Supabase Auth failed:", authError?.message)
            return null
          }

          console.log("✅ Supabase Auth successful")

          const user = await getUserByEmail(email)
          console.log("👤 User found in custom table:", user ? "YES" : "NO")

          if (!user) {
            console.log("❌ User not found in custom table - may need to complete registration")
            return null
          }

          console.log("✅ Authentication successful")
          return {
            id: String(user.id),
            email: String(user.email),
          }
        } catch (error: any) {
          console.log("💥 Auth error:", error.message)
          return null
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
      }
      return token
    },
    session({ session, token }) {
      if (token && token.id && token.email) {
        const newSession: Session = {
          user: {
            id: String(token.id),
            email: String(token.email),
          },
          expires: session.expires,
        }
        return newSession
      }
      return session
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  debug: true,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

export const auth = () => getServerSession(authOptions)
