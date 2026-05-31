import React from 'react';
import ClaudeWebView from '../../src/components/ClaudeWebView';

const HTML_URL = 'https://customer-assets.emergentagent.com/job_5871a3c5-4f99-4196-bbc7-bd1bdb34be19/artifacts/qd5kfstk_wba99-exercise-template-maker.html';

export default function ExerciseTemplateScreen() {
  return (
    <ClaudeWebView
      title="Exercise Template"
      subtitle="AI Exercise Maker"
      sourceUrl={HTML_URL}
      accentColor="#FF5722"
    />
  );
}
