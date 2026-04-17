export default function StudentThemeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="theme-student min-h-full">{children}</div>;
}
