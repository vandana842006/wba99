/**
 * WBA99 Claude - Face Landmark Analyzer
 */

import React from 'react';
import ClaudeWebView from '../../src/components/ClaudeWebView';

const HTML_SOURCE_URL = 'https://customer-assets.emergentagent.com/job_5871a3c5-4f99-4196-bbc7-bd1bdb34be19/artifacts/ntrzj0ss_wba99-face-landmark-analyzer-1.html';

export default function FaceAnalyzerScreen() {
  return (
    <ClaudeWebView
      title="Face Landmark"
      subtitle="Facial Analysis"
      sourceUrl={HTML_SOURCE_URL}
      accentColor="#FBBF24"
    />
  );
}
