import "./globals.css";
export const metadata = { title: "AICTE Flow | Approval Workflow", description: "Connected approval workflow prototype" };
export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="tiranga">
      <body>{children}</body>
    </html>
  );
}
