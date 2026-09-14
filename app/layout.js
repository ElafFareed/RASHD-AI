import {
  Cormorant_Garamond,
  DM_Sans,
} from "next/font/google";

import "./globals.css";
import { DemoProfileProvider } from "../components/DemoProfileProvider";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata = {
  title: "Rashd AI — Your Financial Compass",
  description:
    "AI-powered personal finance guidance",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${dmSans.variable}`}
    >
      <body>
        <DemoProfileProvider>
          {children}
        </DemoProfileProvider>
      </body>
    </html>
  );
}
