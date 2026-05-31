/**
 * WBA99 Claude - PhysioScan Landmark Analyzer
 */

import React from 'react';
import ClaudeWebView from '../../src/components/ClaudeWebView';

const HTML_SOURCE_URL = 'https://customer-assets.emergentagent.com/job_5871a3c5-4f99-4196-bbc7-bd1bdb34be19/artifacts/ldz63t3d_wba99_physioscan_13.html';

export default function PhysioScanScreen() {
  return (
    <ClaudeWebView
      title="PhysioScan"
      subtitle="Bony Landmark Analyzer"
      sourceUrl={HTML_SOURCE_URL}
      accentColor="#A855F7"
    />
  );
}
