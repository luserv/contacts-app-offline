import { useWindowDimensions } from 'react-native';

export const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
} as const;

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isMobile = width < BREAKPOINTS.mobile;
  const isTablet = width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
  const isDesktop = width >= BREAKPOINTS.tablet;
  const isLandscape = width > height;

  const r = <T,>(mobile: T, tablet: T, desktop: T): T => {
    if (isDesktop) return desktop;
    if (isTablet) return tablet;
    return mobile;
  };

  const numCols = r(1, 2, 3);
  const contentMaxWidth = 1200;

  return { width, height, isMobile, isTablet, isDesktop, isLandscape, r, numCols, contentMaxWidth };
}
