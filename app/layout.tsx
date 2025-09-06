export const metadata = {
  title: 'SmokeEat Admin',
  description: 'Panel administrativo y API',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: 'Inter, system-ui, Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}