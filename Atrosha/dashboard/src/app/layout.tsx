import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import { UserProvider } from "./context/UserContext";


export const metadata: Metadata = {
  title: "Atrosha | Dashboard",
  description: "AI Agent Financial Security Control Center",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
          <div className="app">
            <Sidebar />
            <main className="main-content">{children}</main>
          </div>
        </UserProvider>
      </body>
    </html>
  );
}