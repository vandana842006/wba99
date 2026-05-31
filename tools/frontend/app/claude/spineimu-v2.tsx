import React from 'react';
import ClaudeWebView from '../../src/components/ClaudeWebView';

const HTML_URL = 'https://customer-assets.emergentagent.com/job_5871a3c5-4f99-4196-bbc7-bd1bdb34be19/artifacts/e16y22dq_wba99-spineimu-v2.html';

export default function SpineIMUV2Screen() {
  return (
    <ClaudeWebView
      title="SpineIMU V2"
      subtitle="9-Axis Spinal Analysis"
      sourceUrl={HTML_URL}
      accentColor="#00BCD4"
    />
  );
}
