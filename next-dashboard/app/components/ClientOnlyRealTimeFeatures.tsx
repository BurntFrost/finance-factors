'use client';

import React, { useEffect, useState } from 'react';

interface ClientOnlyRealTimeFeaturesProps {
  enableRealTime: boolean;
  showRealTimeIndicator?: boolean;
}

export default function ClientOnlyRealTimeFeatures({
  enableRealTime,
  showRealTimeIndicator = true,
}: ClientOnlyRealTimeFeaturesProps) {
  // Temporarily disabled to fix SSR issues
  // TODO: Re-enable once WebSocket service is properly configured for SSR
  return enableRealTime && showRealTimeIndicator ? (
    <div className="text-sm text-blue-500 px-2 py-1 rounded bg-blue-50">
      🔄 Real-time (Coming Soon)
    </div>
  ) : null;
}
