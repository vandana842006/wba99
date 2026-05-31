import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';
import { PaymentGateModal } from '../../src/utils/PaymentGateModal';

// Professional Colors
const COLORS = {
  background: '#0A0E1A',
  card: '#141B2D',
  cardBorder: '#1E3A5F',
  accent: '#00F0FF',
  success: '#00FF88',
  warning: '#FFB800',
  error: '#FF4444',
  purple: '#8B5CF6',
  text: '#E8F4F8',
  textMuted: '#7A8B9A',
};

// Report Sections
const REPORT_SECTIONS = [
  { id: 'abstract', label: 'Abstract', icon: 'document-text', description: 'Brief summary of the study' },
  { id: 'introduction', label: 'Introduction', icon: 'information-circle', description: 'Background and objectives' },
  { id: 'methodology', label: 'Methodology', icon: 'flask', description: 'Study design and procedures' },
  { id: 'results', label: 'Results', icon: 'analytics', description: 'Data analysis and findings' },
  { id: 'discussion', label: 'Discussion', icon: 'chatbubbles', description: 'Interpretation of results' },
  { id: 'conclusion', label: 'Conclusion', icon: 'checkmark-circle', description: 'Key takeaways and implications' },
  { id: 'references', label: 'References', icon: 'bookmark', description: 'Citations and sources' },
];

interface GeneratedSection {
  id: string;
  content: string;
  isEditing: boolean;
  isGenerating: boolean;
}

export default function AIReportGenerator() {
  const router = useRouter();
  const { currentUser } = useStore();

  // Study details
  const [studyTitle, setStudyTitle] = useState('');
  const [studyObjective, setStudyObjective] = useState('');
  const [sampleSize, setSampleSize] = useState('');
  const [studyDuration, setStudyDuration] = useState('');
  const [keyFindings, setKeyFindings] = useState('');
  const [methodology, setMethodology] = useState('');

  // Generated sections
  const [generatedSections, setGeneratedSections] = useState<{ [key: string]: GeneratedSection }>({});
  const [selectedSections, setSelectedSections] = useState<string[]>(['abstract', 'introduction', 'methodology', 'results', 'discussion', 'conclusion']);
  
  // UI state
  const [step, setStep] = useState<'input' | 'generate' | 'edit' | 'export'>('input');
  const [generating, setGenerating] = useState(false);
  const [currentGenerating, setCurrentGenerating] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Toggle section selection
  const toggleSection = (sectionId: string) => {
    setSelectedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Generate single section with AI
  const generateSection = async (sectionId: string): Promise<string> => {
    const section = REPORT_SECTIONS.find(s => s.id === sectionId);
    if (!section) return '';

    // Simulated AI generation (in production, this would call Claude API)
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    const templates: { [key: string]: string } = {
      abstract: `**Background:** This study investigates ${studyObjective || 'physiotherapy intervention outcomes'} in a cohort of ${sampleSize || 'N'} participants over ${studyDuration || 'a defined period'}.

**Objective:** To evaluate the effectiveness of the treatment protocol and identify key predictors of successful outcomes.

**Methods:** ${methodology || 'A prospective observational study design was employed with standardized assessment protocols.'}

**Results:** ${keyFindings || 'Significant improvements were observed in primary outcome measures.'}

**Conclusion:** The findings support the efficacy of the intervention and provide evidence-based guidelines for clinical practice.`,

      introduction: `## Introduction

Musculoskeletal disorders represent a significant burden on healthcare systems worldwide. ${studyTitle || 'This study'} addresses the critical need for evidence-based rehabilitation approaches.

### Background
The prevalence of musculoskeletal conditions has increased substantially in recent decades, necessitating effective, standardized treatment protocols.

### Objectives
The primary objective of this research was to ${studyObjective || 'evaluate treatment outcomes'}. Secondary objectives included identifying prognostic factors and developing clinical guidelines.

### Significance
This study contributes to the growing body of evidence supporting physiotherapy interventions and provides practical insights for clinicians.`,

      methodology: `## Methodology

### Study Design
${methodology || 'A prospective cohort study was conducted using standardized assessment protocols.'}

### Participants
- **Sample Size:** ${sampleSize || 'N participants'}
- **Duration:** ${studyDuration || 'Study period'}
- **Inclusion Criteria:** Patients presenting with the specified condition
- **Exclusion Criteria:** Contraindications to treatment, incomplete data

### Assessment Protocol
1. Baseline assessment including pain scales, ROM measurements, and functional tests
2. Intervention according to established clinical guidelines
3. Follow-up assessments at predetermined intervals
4. Data collection using validated outcome measures

### Statistical Analysis
- Descriptive statistics for demographic and clinical variables
- Paired t-tests for pre-post comparisons
- Regression analysis for predictive modeling
- Significance level set at p < 0.05`,

      results: `## Results

### Participant Characteristics
A total of ${sampleSize || 'N'} participants completed the study. The mean age was 45.3 ± 12.1 years.

### Primary Outcomes
${keyFindings || `Significant improvements were observed across all primary outcome measures:
- Pain reduction: 45.2% (p < 0.001)
- ROM improvement: 23.8° increase (p < 0.001)
- Functional scores: 34.5% improvement (p < 0.001)`}

### Secondary Outcomes
- Patient satisfaction: 87.3% rated outcomes as good or excellent
- Return to activity: 78% achieved pre-injury activity levels
- Adherence rate: 91% completed the prescribed intervention

### Adverse Events
No serious adverse events were reported. Minor discomfort was noted in 12% of participants.`,

      discussion: `## Discussion

### Key Findings
The results of ${studyTitle || 'this study'} demonstrate clinically meaningful improvements in patients receiving the standardized physiotherapy protocol.

### Clinical Implications
1. The treatment approach can be effectively implemented in clinical practice
2. Early intervention appears to correlate with better outcomes
3. Patient education and compliance are crucial factors

### Comparison with Literature
Our findings align with previous research showing the effectiveness of evidence-based physiotherapy interventions. The observed improvement rates are consistent with systematic reviews in this area.

### Limitations
- Single-center study design
- Potential selection bias
- Follow-up period may not capture long-term outcomes

### Future Research
Multicenter randomized controlled trials are needed to validate these findings and establish standardized treatment guidelines.`,

      conclusion: `## Conclusion

${studyTitle || 'This study'} provides compelling evidence for the effectiveness of the physiotherapy intervention. Key conclusions include:

1. **Efficacy:** Significant improvements in pain, function, and quality of life
2. **Safety:** Well-tolerated with minimal adverse events
3. **Practicality:** Feasible implementation in clinical settings

### Recommendations
- Implementation of standardized assessment protocols
- Patient-centered treatment planning
- Ongoing outcome monitoring and quality improvement

### Final Remarks
These findings support the continued use of evidence-based physiotherapy approaches and provide a foundation for future research and clinical guidelines.`,

      references: `## References

1. Smith et al. (2024). "Advances in Musculoskeletal Rehabilitation." Journal of Physiotherapy Research, 45(2), 112-128.

2. Johnson & Williams (2023). "Evidence-Based Practice in Physical Therapy." Clinical Rehabilitation, 38(4), 456-470.

3. World Health Organization. (2023). "Global Guidelines for Musculoskeletal Health."

4. American Physical Therapy Association. (2024). "Clinical Practice Guidelines for Rehabilitation."

5. Chen et al. (2023). "Outcome Measures in Physiotherapy: A Systematic Review." Physical Therapy Reviews, 28(3), 234-251.

6. Davis & Thompson (2024). "Patient-Centered Care in Rehabilitation." BMC Musculoskeletal Disorders, 25(1), 78.

*Note: This reference list is AI-generated and should be verified and updated with actual sources.*`,
    };

    return templates[sectionId] || `Content for ${section.label} section.`;
  };

  // Generate all selected sections
  const generateAllSections = async () => {
    if (!studyTitle.trim()) {
      Alert.alert('Required', 'Please enter a study title');
      return;
    }

    setStep('generate');
    setGenerating(true);

    const newSections: { [key: string]: GeneratedSection } = {};

    for (const sectionId of selectedSections) {
      setCurrentGenerating(sectionId);
      try {
        const content = await generateSection(sectionId);
        newSections[sectionId] = {
          id: sectionId,
          content,
          isEditing: false,
          isGenerating: false,
        };
        setGeneratedSections({ ...newSections });
      } catch (error) {
        console.error(`Error generating ${sectionId}:`, error);
      }
    }

    setGenerating(false);
    setCurrentGenerating(null);
    setStep('edit');
  };

  // Update section content
  const updateSectionContent = (sectionId: string, content: string) => {
    setGeneratedSections(prev => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], content },
    }));
  };

  // Toggle section editing
  const toggleSectionEditing = (sectionId: string) => {
    setGeneratedSections(prev => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], isEditing: !prev[sectionId].isEditing },
    }));
  };

  // Regenerate single section
  const regenerateSection = async (sectionId: string) => {
    setGeneratedSections(prev => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], isGenerating: true },
    }));

    try {
      const content = await generateSection(sectionId);
      setGeneratedSections(prev => ({
        ...prev,
        [sectionId]: { ...prev[sectionId], content, isGenerating: false },
      }));
    } catch (error) {
      console.error('Regenerate error:', error);
      setGeneratedSections(prev => ({
        ...prev,
        [sectionId]: { ...prev[sectionId], isGenerating: false },
      }));
    }
  };

  // Export to PDF
  const exportToPDF = async () => {
    setExporting(true);
    try {
      const date = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });

      const sectionsHtml = selectedSections.map(sectionId => {
        const section = REPORT_SECTIONS.find(s => s.id === sectionId);
        const generated = generatedSections[sectionId];
        if (!generated || !section) return '';

        return `
          <div class="section">
            <h2>${section.label}</h2>
            <div class="content">${generated.content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/##\s*(.*?)(<br>|$)/g, '<h3>$1</h3>').replace(/###\s*(.*?)(<br>|$)/g, '<h4>$1</h4>')}</div>
          </div>
        `;
      }).join('');

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Georgia', serif; color: #333; padding: 40px; line-height: 1.6; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px double #1E3A5F; padding-bottom: 30px; }
    .title { font-size: 24px; font-weight: bold; color: #1E3A5F; margin-bottom: 10px; }
    .meta { font-size: 12px; color: #666; margin-top: 15px; }
    .section { margin-bottom: 30px; page-break-inside: avoid; }
    h2 { font-size: 18px; color: #1E3A5F; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
    h3 { font-size: 16px; color: #333; margin: 15px 0 10px; }
    h4 { font-size: 14px; color: #555; margin: 12px 0 8px; }
    .content { font-size: 13px; text-align: justify; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 11px; color: #888; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${studyTitle}</div>
    <div class="meta">
      Generated by WBA99 AI Research Report Generator<br>
      ${date} | ${currentUser?.name || 'Researcher'}
    </div>
  </div>

  ${sectionsHtml}

  <div class="footer">
    <p>This report was generated using AI assistance. All content should be reviewed and verified before publication.</p>
    <p style="margin-top: 10px;">WBA99 Research Analytics Platform © 2024</p>
  </div>
</body>
</html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error('PDF export error:', error);
      Alert.alert('Error', 'Failed to export PDF');
    } finally {
      setExporting(false);
      setShowPaymentModal(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.accent} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>AI REPORT GENERATOR</Text>
          <Text style={styles.headerSubtitle}>Research Paper Assistant</Text>
        </View>
        <MaterialCommunityIcons name="robot" size={26} color={COLORS.purple} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* STEP 1: INPUT */}
        {step === 'input' && (
          <>
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Study Title *</Text>
              <TextInput
                style={styles.input}
                value={studyTitle}
                onChangeText={setStudyTitle}
                placeholder="Enter your research title"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.inputLabel}>Research Objective</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={studyObjective}
                onChangeText={setStudyObjective}
                placeholder="What was the main objective of your study?"
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
              />

              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Sample Size</Text>
                  <TextInput
                    style={styles.input}
                    value={sampleSize}
                    onChangeText={setSampleSize}
                    placeholder="e.g., 50 patients"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Study Duration</Text>
                  <TextInput
                    style={styles.input}
                    value={studyDuration}
                    onChangeText={setStudyDuration}
                    placeholder="e.g., 12 weeks"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Key Findings (Summary)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={keyFindings}
                onChangeText={setKeyFindings}
                placeholder="Briefly describe your main results"
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Methodology Overview</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={methodology}
                onChangeText={setMethodology}
                placeholder="Describe your study design and methods"
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.sectionsSelector}>
              <Text style={styles.sectionSelectorTitle}>Select Sections to Generate</Text>
              {REPORT_SECTIONS.map(section => (
                <TouchableOpacity
                  key={section.id}
                  style={[
                    styles.sectionOption,
                    selectedSections.includes(section.id) && styles.sectionOptionSelected
                  ]}
                  onPress={() => toggleSection(section.id)}
                >
                  <View style={[
                    styles.sectionCheckbox,
                    selectedSections.includes(section.id) && styles.sectionCheckboxSelected
                  ]}>
                    {selectedSections.includes(section.id) && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                  <Ionicons 
                    name={section.icon as any} 
                    size={20} 
                    color={selectedSections.includes(section.id) ? COLORS.accent : COLORS.textMuted} 
                  />
                  <View style={styles.sectionOptionText}>
                    <Text style={[
                      styles.sectionOptionLabel,
                      selectedSections.includes(section.id) && styles.sectionOptionLabelSelected
                    ]}>
                      {section.label}
                    </Text>
                    <Text style={styles.sectionOptionDesc}>{section.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.generateBtn} 
              onPress={generateAllSections}
              disabled={selectedSections.length === 0}
            >
              <MaterialCommunityIcons name="robot" size={24} color="#000" />
              <Text style={styles.generateBtnText}>Generate Report with AI</Text>
            </TouchableOpacity>
          </>
        )}

        {/* STEP 2: GENERATING */}
        {step === 'generate' && (
          <View style={styles.generatingContainer}>
            <MaterialCommunityIcons name="robot-outline" size={60} color={COLORS.accent} />
            <Text style={styles.generatingTitle}>Generating Report...</Text>
            <Text style={styles.generatingSubtitle}>
              AI is writing your research paper sections
            </Text>
            
            <View style={styles.generatingProgress}>
              {selectedSections.map(sectionId => {
                const section = REPORT_SECTIONS.find(s => s.id === sectionId);
                const isCompleted = !!generatedSections[sectionId];
                const isCurrent = currentGenerating === sectionId;
                
                return (
                  <View key={sectionId} style={styles.generatingItem}>
                    {isCompleted ? (
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                    ) : isCurrent ? (
                      <ActivityIndicator size="small" color={COLORS.accent} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={20} color={COLORS.textMuted} />
                    )}
                    <Text style={[
                      styles.generatingItemText,
                      isCompleted && { color: COLORS.success },
                      isCurrent && { color: COLORS.accent }
                    ]}>
                      {section?.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 3: EDIT */}
        {step === 'edit' && (
          <>
            <View style={styles.editHeader}>
              <Text style={styles.editTitle}>Review & Edit</Text>
              <Text style={styles.editSubtitle}>
                Click on any section to edit the AI-generated content
              </Text>
            </View>

            {selectedSections.map(sectionId => {
              const section = REPORT_SECTIONS.find(s => s.id === sectionId);
              const generated = generatedSections[sectionId];
              if (!generated || !section) return null;

              return (
                <View key={sectionId} style={styles.editSection}>
                  <View style={styles.editSectionHeader}>
                    <Ionicons name={section.icon as any} size={20} color={COLORS.accent} />
                    <Text style={styles.editSectionTitle}>{section.label}</Text>
                    <View style={styles.editSectionActions}>
                      <TouchableOpacity 
                        style={styles.editActionBtn}
                        onPress={() => regenerateSection(sectionId)}
                        disabled={generated.isGenerating}
                      >
                        {generated.isGenerating ? (
                          <ActivityIndicator size="small" color={COLORS.accent} />
                        ) : (
                          <Ionicons name="refresh" size={18} color={COLORS.accent} />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.editActionBtn}
                        onPress={() => toggleSectionEditing(sectionId)}
                      >
                        <Ionicons 
                          name={generated.isEditing ? "checkmark" : "pencil"} 
                          size={18} 
                          color={generated.isEditing ? COLORS.success : COLORS.textMuted} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {generated.isEditing ? (
                    <TextInput
                      style={styles.editTextArea}
                      value={generated.content}
                      onChangeText={(text) => updateSectionContent(sectionId, text)}
                      multiline
                      autoFocus
                    />
                  ) : (
                    <TouchableOpacity onPress={() => toggleSectionEditing(sectionId)}>
                      <Text style={styles.editContent}>{generated.content}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            <TouchableOpacity 
              style={styles.exportBtn}
              onPress={() => setShowPaymentModal(true)}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons name="download" size={24} color="#000" />
                  <Text style={styles.exportBtnText}>Export as PDF</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.backToInputBtn}
              onPress={() => setStep('input')}
            >
              <Text style={styles.backToInputText}>← Back to Input</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Payment Gate */}
      <PaymentGateModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentConfirmed={exportToPDF}
        reportType="ai_research_report"
        title="AI Research Report"
        patientName=""
        reportName={studyTitle}
        analysisData={{
          sections: selectedSections.length,
          title: studyTitle,
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  backBtn: {
    padding: 5,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.accent,
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  inputSection: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  inputLabel: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 14,
    color: COLORS.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 15,
  },
  inputHalf: {
    flex: 1,
  },
  sectionsSelector: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sectionSelectorTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  sectionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    gap: 12,
  },
  sectionOptionSelected: {
    backgroundColor: COLORS.accent + '10',
    marginHorizontal: -15,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  sectionCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCheckboxSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  sectionOptionText: {
    flex: 1,
  },
  sectionOptionLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionOptionLabelSelected: {
    color: COLORS.accent,
  },
  sectionOptionDesc: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: 18,
    borderRadius: 12,
    gap: 12,
  },
  generateBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  generatingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  generatingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 20,
  },
  generatingSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 8,
    marginBottom: 30,
  },
  generatingProgress: {
    width: '100%',
    gap: 12,
  },
  generatingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 15,
    borderRadius: 10,
    gap: 12,
  },
  generatingItemText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  editHeader: {
    marginBottom: 20,
  },
  editTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  editSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 5,
  },
  editSection: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  editSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  editSectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  editSectionActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editActionBtn: {
    padding: 8,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  editContent: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 20,
  },
  editTextArea: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 20,
    minHeight: 150,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: 18,
    borderRadius: 12,
    gap: 12,
    marginTop: 10,
  },
  exportBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backToInputBtn: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  backToInputText: {
    color: COLORS.accent,
    fontSize: 14,
  },
});
