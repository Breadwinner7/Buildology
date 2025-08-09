// src/components/layout/AdaptiveNavigation.tsx
export const AdaptiveNavigation: React.FC = () => {
  const { userProfile, getNavigationItems } = useUKInsurancePermissions();
  const navigationItems = getNavigationItems();
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return <MobileBottomNavigation items={navigationItems} />;
  }

  return <DesktopSidebarNavigation items={navigationItems} />;
};