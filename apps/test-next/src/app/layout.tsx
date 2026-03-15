export const metadata = { title: "Tokengate Next.js Test" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#0f1412", color: "#e8e8e8", padding: 40 }}>
        {children}
      </body>
    </html>
  );
}
