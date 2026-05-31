/**
 * WBA99 Claude - Digital Shadow V2 Clinical Suite
 */

import React from 'react';
import ClaudeWebView from '../../src/components/ClaudeWebView';

const HTML_SOURCE_URL = 'https://customer-assets.emergentagent.com/job_5871a3c5-4f99-4196-bbc7-bd1bdb34be19/artifacts/ytxq40dn_wba99-shadow-v3-final-2.html';

export default function DigitalShadowAltScreen() {
  return (
    <ClaudeWebView
      title="Digital Shadow V2"
      subtitle="Alternative Clinical Suite"
      sourceUrl={HTML_SOURCE_URL}
      accentColor="#00D4FF"
    />
  );
}
