// src/components/layout/MobileBottomNavigation.tsx
export const MobileBottomNavigation: React.FC<{ items: NavItem[] }> = ({ items }) => {
  const pathname = usePathname();
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
      <div className="flex justify-around">
        {items.slice(0, 5).map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center px-2 py-1 rounded",
              pathname === item.href ? "text-blue-600" : "text-gray-600"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};