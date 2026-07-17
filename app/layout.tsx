import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "the only me is me",
  description: "A Windows 98-inspired archive of writing from Mostly Introspection.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
