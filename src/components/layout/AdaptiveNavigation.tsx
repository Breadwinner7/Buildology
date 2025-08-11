'use client'

import React, { useState, useEffect } from 'react'
import { MobileBottomNavigation } from './MobileBottomNavigation'

export const AdaptiveNavigation: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (isMobile) {
    return <MobileBottomNavigation />
  }

  return null // Desktop navigation is handled by Topbar
}