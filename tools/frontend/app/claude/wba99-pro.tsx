import React from 'react';
import ClaudeWebView from '../../src/components/ClaudeWebView';

const HTML_URL = 'https://customer-assets.emergentagent.com/job_5871a3c5-4f99-4196-bbc7-bd1bdb34be19/artifacts/089cfpdm_wba99-pro-v5-final.html';

export default function WBA99ProScreen() {
  return (
    <ClaudeWebView
      title="WBA99 Pro"
      subtitle="Complete Analysis Suite"
      sourceUrl={HTML_URL}
      accentColor="#3b6df0"
    />
  );
}
