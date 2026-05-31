/**
 * WBA99 Claude - Digital Shadow Clinical Suite
 */

import React from 'react';
import ClaudeWebView from '../../src/components/ClaudeWebView';

const HTML_SOURCE_URL = 'https://customer-assets.emergentagent.com/job_5871a3c5-4f99-4196-bbc7-bd1bdb34be19/artifacts/s33ziom3_wba99-shadow-v3-biomech-report.html';

export default function DigitalShadowScreen() {
  return (
    <ClaudeWebView
      title="Digital Shadow"
      subtitle="Clinical Video Analysis"
      sourceUrl={HTML_SOURCE_URL}
      accentColor="#39FF8A"
    />
  );
}
