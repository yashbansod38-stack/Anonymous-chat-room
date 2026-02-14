import type { Metadata } from "next";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FriendChatSidebar from "@/components/chat/FriendChatSidebar";
import PresenceManager from "@/components/PresenceManager";
import "./globals.css";

export const metadata: Metadata = {
  title: "Safe Anon Chat – Secure Anonymous Messaging",
  description:
    "A privacy-first, anonymous real-time chat application built with modern web technologies.",
  keywords: ["anonymous chat", "secure messaging", "privacy", "real-time"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <ThemeProvider>
          <AuthProvider>
            <PresenceManager />
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <FriendChatSidebar />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

