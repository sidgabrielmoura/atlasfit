export default function PersonalClientsMigrateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-400 p-4 md:p-6 lg:p-8">
      {children}
    </div>
  );
}
