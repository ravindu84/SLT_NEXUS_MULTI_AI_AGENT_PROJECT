import "./globals.css";
import { Inter } from "next/font/google";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "SLT NEXUS — Multi-Agent AI Avatar | SLT-MOBITEL",
  description:
    "LIYA is SLT-MOBITEL's intelligent 3D AI avatar powered by LangGraph multi-agent system. Get package recommendations, troubleshoot internet issues, detect scams, and more.",
  keywords: [
    "SLT",
    "MOBITEL",
    "LIYA",
    "AI Avatar",
    "Multi-Agent",
    "LangGraph",
    "Customer Service",
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LanguageProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
