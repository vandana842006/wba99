import React from 'react';
import ClaudeWebView from '../../src/components/ClaudeWebView';

const HTML_URL = 'https://customer-assets.emergentagent.com/job_5871a3c5-4f99-4196-bbc7-bd1bdb34be19/artifacts/tx5mdfr6_wba99-spineimu-projectx_1.html';

export default function SpineIMUProjectXScreen() {
  return (
    <ClaudeWebView
      title="SpineIMU Project X"
      subtitle="Advanced Spine Scanner"
      sourceUrl={HTML_URL}
      accentColor="#9C27B0"
    />
  );
}
