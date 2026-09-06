import NextAuth from 'next-auth/next';
import GoogleProvider from 'next-auth/providers/google';
import { connectMongoDB } from "@/lib/mongodb";
import User from "@/models/user";


let url = "https://club-management-app.vercel.app"
// let url = "http://localhost:3000"
export const authOptions: any = {
  
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    async signIn({ user, account }: { user: any, account: any }) {

      if (account.provider === "google") {
        const { name, email } = user;
        try {
          await connectMongoDB();
          const userExists = await User.findOne({ email });

          if (!userExists) {
            const res = await fetch(`${url}/api/user`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name,
                email,
              }),
            });
            console.log(res)
          }
        }
        catch (error) {
          console.log(error);
        }
        return user;
      }
    }
  }
}




const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };