import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "vox nihili — diary archive",
  description: "A Windows 98-inspired archive of writing from Mostly Introspection.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
