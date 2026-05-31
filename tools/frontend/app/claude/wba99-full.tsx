import React from 'react';
import ClaudeWebView from '../../src/components/ClaudeWebView';

const HTML_URL = 'https://customer-assets.emergentagent.com/job_5871a3c5-4f99-4196-bbc7-bd1bdb34be19/artifacts/yn81q0tm_wba99-full.jsx';

export default function WBA99FullScreen() {
  return (
    <ClaudeWebView
      title="WBA99 Full"
      subtitle="Complete Analysis"
      sourceUrl={HTML_URL}
      accentColor="#9C27B0"
    />
  );
}
