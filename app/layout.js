import "./globals.css";

export const metadata = {
  title: "WaitLine",
  description: "Skip the physical line. Join the queue from your phone.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}