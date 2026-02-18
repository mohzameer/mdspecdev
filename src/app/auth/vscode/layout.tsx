export default function VscodeAuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Render without the global Header — this is a standalone browser-auth page
    return <>{children}</>;
}
