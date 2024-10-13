import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "Map the Vote",
  description: "Interactive visualization of the 2024 U.S. Electoral College map, allowing users to explore different electoral scenarios.",
  icons: [
    { rel: 'icon', type: 'image/svg+xml', url: '/data/ballot_box.svg' },
    { rel: 'apple-touch-icon', url: '/data/ballot_box.svg' },
    { rel: 'shortcut icon', url: '/data/ballot_box.svg' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
