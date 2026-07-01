import './globals.css';

export const metadata = {
  title: 'SyncBoard — Real-time Collaborative Whiteboard',
  description: 'Draw, chat, and design together in real time.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#080C12] text-slate-100 antialiased">{children}</body>
    </html>
  );
}
