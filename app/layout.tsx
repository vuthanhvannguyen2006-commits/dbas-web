import { Playfair_Display } from "next/font/google";
import "./globals.css";

/* The stylesheets have always asked for Playfair Display, but nothing ever
   loaded it — so every heading on the site quietly fell back to the browser's
   default serif. Loading it here through next/font makes the headings render
   as the design intended. Exposed as a CSS variable so globals.css and the
   admin styles can both reach it. */
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-playfair",
});

export const metadata = {
  title: "DBAS — Deakin Business & Analytics Society",
  icons: {
    icon: "/dbas-logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={playfair.variable}>
      <body>{children}</body>
    </html>
  );
}
