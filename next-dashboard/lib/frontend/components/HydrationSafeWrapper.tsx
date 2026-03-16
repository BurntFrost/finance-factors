'use client';

import React, { useSyncExternalStore, ReactNode } from 'react';

interface HydrationSafeWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * HydrationSafeWrapper prevents hydration mismatches by only rendering
 * children after the component has mounted on the client side.
 * This is useful for components that access localStorage or other browser APIs.
 */
export default function HydrationSafeWrapper({
  children,
  fallback = null
}: HydrationSafeWrapperProps) {
  const isHydrated = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  // During SSR and before hydration, show fallback or nothing
  if (!isHydrated) {
    return <>{fallback}</>;
  }

  // After hydration, show the actual children
  return <>{children}</>;
}
