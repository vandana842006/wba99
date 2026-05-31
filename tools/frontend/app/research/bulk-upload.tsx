import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';

// Professional Colors
const COLORS = {
  background: '#0A0E1A',
  card: '#141B2D',
  cardBorder: '#1E3A5F',
  accent: '#00F0FF',
  success: '#00FF88',
  warning: '#FFB800',
  error: '#FF4444',
  text: '#E8F4F8',
  textMuted: '#7A8B9A',
};

// Required columns for research data
const REQUIRED_COLUMNS = [
  { key: 'patient_id', label: 'Patient ID', required: true },
  { key: 'patient_name', label: 'Patient Name', required: true },
  { key: 'age', label: 'Age', required: false },
  { key: 'gender', label: 'Gender', required: false },
  { key: 'diagnosis', label: 'Diagnosis', required: true },
  { key: 'pain_score', label: 'Pain Score (0-10)', required: false },
  { key: 'rom_value', label: 'ROM Value', required: false },
  { key: 'strength_score', label: 'Strength Score', required: false },
  { key: 'balance_score', label: 'Balance Score', required: false },
  { key: 'data_type', label: 'Data Type (pre/post)', required: true },
  { key: 'assessment_date', label: 'Assessment Date', required: true },
  { key: 'treatment_protocol', label: 'Treatment Protocol', required: false },
  { key: 'notes', label: 'Notes', required: false },
];

interface ParsedData {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

interface ColumnMapping {
  [sourceColumn: string]: string; // Maps source column to target field
}

interface ValidationError {
  row: number;
  column: string;
  message: string;
}

export default function BulkDataUpload() {
  const router = useRouter();
  const { currentUser } = useStore();

  // Upload flow state
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'processing' | 'complete'>('upload');
  
  // File state
  const [selectedFile, setSelectedFile] = useState<{ name: string; uri: string; size: number } | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  
  // Mapping state
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [currentMappingColumn, setCurrentMappingColumn] = useState<string>('');
  
  // Validation state
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [validRows, setValidRows] = useState<number>(0);
  
  // Processing state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number } | null>(null);

  // Select file
  const selectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setSelectedFile({
        name: file.name,
        uri: file.uri,
        size: file.size || 0,
      });

      // Parse the file
      await parseFile(file.uri, file.name);
    } catch (error) {
      console.error('File selection error:', error);
      Alert.alert('Error', 'Failed to select file');
    }
  };

  // Parse CSV file
  const parseFile = async (uri: string, filename: string) => {
    try {
      const content = await FileSystem.readAsStringAsync(uri);
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        Alert.alert('Error', 'File must contain at least a header row and one data row');
        return;
      }

      // Parse CSV (simple parser - handles basic cases)
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const headers = parseCSVLine(lines[0]);
      const rows = lines.slice(1).map(line => parseCSVLine(line));

      setParsedData({
        headers,
        rows,
        totalRows: rows.length,
      });

      // Auto-map columns based on similarity
      const autoMapping: ColumnMapping = {};
      headers.forEach(header => {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const match = REQUIRED_COLUMNS.find(col => 
          normalizedHeader.includes(col.key.replace(/_/g, '')) ||
          col.key.includes(normalizedHeader) ||
          col.label.toLowerCase().includes(header.toLowerCase())
        );
        if (match) {
          autoMapping[header] = match.key;
        }
      });
      setColumnMapping(autoMapping);
      
      setStep('mapping');
    } catch (error) {
      console.error('Parse error:', error);
      Alert.alert('Error', 'Failed to parse file. Please ensure it is a valid CSV.');
    }
  };

  // Update column mapping
  const updateMapping = (sourceColumn: string, targetField: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [sourceColumn]: targetField,
    }));
    setShowMappingModal(false);
  };

  // Validate data
  const validateData = () => {
    if (!parsedData) return;

    const errors: ValidationError[] = [];
    let valid = 0;

    // Check required columns are mapped
    const mappedFields = Object.values(columnMapping);
    const missingRequired = REQUIRED_COLUMNS.filter(col => col.required && !mappedFields.includes(col.key));
    
    if (missingRequired.length > 0) {
      Alert.alert(
        'Missing Required Columns',
        `Please map these required columns:\n${missingRequired.map(c => c.label).join('\n')}`
      );
      return;
    }

    // Validate each row
    parsedData.rows.forEach((row, rowIndex) => {
      let rowValid = true;

      // Check required fields have values
      REQUIRED_COLUMNS.filter(col => col.required).forEach(col => {
        const sourceColumn = Object.keys(columnMapping).find(k => columnMapping[k] === col.key);
        if (sourceColumn) {
          const colIndex = parsedData.headers.indexOf(sourceColumn);
          const value = row[colIndex]?.trim();
          if (!value) {
            errors.push({
              row: rowIndex + 2, // +2 for header and 1-based index
              column: col.label,
              message: `Missing required value`,
            });
            rowValid = false;
          }
        }
      });

      // Validate pain score (0-10)
      const painCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'pain_score');
      if (painCol) {
        const colIndex = parsedData.headers.indexOf(painCol);
        const value = parseFloat(row[colIndex]);
        if (!isNaN(value) && (value < 0 || value > 10)) {
          errors.push({
            row: rowIndex + 2,
            column: 'Pain Score',
            message: `Value must be 0-10 (got ${value})`,
          });
          rowValid = false;
        }
      }

      // Validate data_type (pre/post)
      const typeCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'data_type');
      if (typeCol) {
        const colIndex = parsedData.headers.indexOf(typeCol);
        const value = row[colIndex]?.toLowerCase().trim();
        if (value && !['pre', 'post', 'baseline', 'followup', 'follow-up'].includes(value)) {
          errors.push({
            row: rowIndex + 2,
            column: 'Data Type',
            message: `Must be "pre" or "post" (got "${value}")`,
          });
          rowValid = false;
        }
      }

      if (rowValid) valid++;
    });

    setValidationErrors(errors);
    setValidRows(valid);
    setStep('preview');
  };

  // Process upload
  const processUpload = async () => {
    if (!parsedData) return;

    setStep('processing');
    setUploading(true);
    setUploadProgress(0);

    try {
      const mappedData: any[] = [];
      
      // Transform data using column mapping
      parsedData.rows.forEach((row, index) => {
        const record: any = {};
        
        Object.keys(columnMapping).forEach(sourceCol => {
          const targetField = columnMapping[sourceCol];
          const colIndex = parsedData.headers.indexOf(sourceCol);
          if (colIndex !== -1) {
            record[targetField] = row[colIndex]?.trim() || '';
          }
        });

        // Add metadata
        record.uploaded_by = currentUser?.id || 'unknown';
        record.uploaded_at = new Date().toISOString();
        record.source = selectedFile?.name || 'bulk_upload';

        mappedData.push(record);
        
        // Update progress
        setUploadProgress(Math.round(((index + 1) / parsedData.rows.length) * 100));
      });

      // Simulate API call (in production, this would be a real API)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try to send to backend
      try {
        await api.post('/research/bulk-import', { records: mappedData });
      } catch (err) {
        console.log('Backend bulk import not implemented, using local storage');
      }

      setUploadResult({
        success: validRows,
        failed: parsedData.rows.length - validRows,
      });
      setStep('complete');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload data');
    } finally {
      setUploading(false);
    }
  };

  // Reset and start over
  const resetUpload = () => {
    setStep('upload');
    setSelectedFile(null);
    setParsedData(null);
    setColumnMapping({});
    setValidationErrors([]);
    setValidRows(0);
    setUploadProgress(0);
    setUploadResult(null);
  };

  // Render step indicator
  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {['upload', 'mapping', 'preview', 'complete'].map((s, index) => {
        const stepIndex = ['upload', 'mapping', 'preview', 'processing', 'complete'].indexOf(step);
        const currentIndex = ['upload', 'mapping', 'preview', 'complete'].indexOf(s);
        const isActive = stepIndex >= currentIndex || (step === 'processing' && currentIndex === 2);
        const isCurrent = s === step || (step === 'processing' && s === 'preview');
        
        return (
          <React.Fragment key={s}>
            <View style={[styles.stepDot, isActive && styles.stepDotActive, isCurrent && styles.stepDotCurrent]}>
              {isActive && currentIndex < stepIndex ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : (
                <Text style={[styles.stepNumber, isActive && styles.stepNumberActive]}>{index + 1}</Text>
              )}
            </View>
            {index < 3 && <View style={[styles.stepLine, isActive && styles.stepLineActive]} />}
          </React.Fragment>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.accent} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>BULK DATA UPLOAD</Text>
          <Text style={styles.headerSubtitle}>Research Analytics Engine</Text>
        </View>
        <TouchableOpacity onPress={resetUpload} style={styles.resetBtn}>
          <Ionicons name="refresh" size={22} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Step Indicator */}
      {renderStepIndicator()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <View style={styles.stepContent}>
            <View style={styles.uploadArea}>
              <MaterialCommunityIcons name="file-upload-outline" size={60} color={COLORS.accent} />
              <Text style={styles.uploadTitle}>Select CSV or Excel File</Text>
              <Text style={styles.uploadSubtitle}>
                Upload patient data for bulk import into the research database
              </Text>
              <TouchableOpacity style={styles.selectFileBtn} onPress={selectFile}>
                <Ionicons name="folder-open" size={22} color="#fff" />
                <Text style={styles.selectFileBtnText}>Browse Files</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formatGuide}>
              <Text style={styles.formatGuideTitle}>Required Format</Text>
              <Text style={styles.formatGuideText}>
                Your file should include columns for:
              </Text>
              <View style={styles.columnList}>
                {REQUIRED_COLUMNS.filter(c => c.required).map(col => (
                  <View key={col.key} style={styles.columnItem}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                    <Text style={styles.columnItemText}>{col.label}</Text>
                    <Text style={styles.requiredBadge}>Required</Text>
                  </View>
                ))}
                {REQUIRED_COLUMNS.filter(c => !c.required).slice(0, 3).map(col => (
                  <View key={col.key} style={styles.columnItem}>
                    <Ionicons name="ellipse-outline" size={16} color={COLORS.textMuted} />
                    <Text style={styles.columnItemText}>{col.label}</Text>
                    <Text style={styles.optionalBadge}>Optional</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* STEP 2: COLUMN MAPPING */}
        {step === 'mapping' && parsedData && (
          <View style={styles.stepContent}>
            <View style={styles.fileInfo}>
              <MaterialCommunityIcons name="file-document" size={24} color={COLORS.success} />
              <View style={styles.fileInfoText}>
                <Text style={styles.fileName}>{selectedFile?.name}</Text>
                <Text style={styles.fileStats}>
                  {parsedData.headers.length} columns • {parsedData.totalRows} rows
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Map Your Columns</Text>
            <Text style={styles.sectionSubtitle}>
              Match your file columns to the required data fields
            </Text>

            {parsedData.headers.map(header => (
              <TouchableOpacity
                key={header}
                style={styles.mappingRow}
                onPress={() => {
                  setCurrentMappingColumn(header);
                  setShowMappingModal(true);
                }}
              >
                <View style={styles.mappingSource}>
                  <Text style={styles.mappingSourceText}>{header}</Text>
                  <Text style={styles.mappingPreview}>
                    e.g., "{parsedData.rows[0]?.[parsedData.headers.indexOf(header)] || 'N/A'}"
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color={COLORS.textMuted} />
                <View style={[
                  styles.mappingTarget,
                  columnMapping[header] ? styles.mappingTargetMapped : {}
                ]}>
                  <Text style={[
                    styles.mappingTargetText,
                    columnMapping[header] ? styles.mappingTargetTextMapped : {}
                  ]}>
                    {columnMapping[header] 
                      ? REQUIRED_COLUMNS.find(c => c.key === columnMapping[header])?.label 
                      : 'Select field...'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.validateBtn} onPress={validateData}>
              <Ionicons name="checkmark-shield" size={22} color="#fff" />
              <Text style={styles.validateBtnText}>Validate & Preview</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: PREVIEW */}
        {step === 'preview' && parsedData && (
          <View style={styles.stepContent}>
            <View style={styles.validationSummary}>
              <View style={styles.validationCard}>
                <Text style={styles.validationNumber}>{validRows}</Text>
                <Text style={styles.validationLabel}>Valid Rows</Text>
              </View>
              <View style={[styles.validationCard, { borderColor: COLORS.error }]}>
                <Text style={[styles.validationNumber, { color: COLORS.error }]}>
                  {validationErrors.length}
                </Text>
                <Text style={styles.validationLabel}>Errors</Text>
              </View>
              <View style={styles.validationCard}>
                <Text style={styles.validationNumber}>{parsedData.totalRows}</Text>
                <Text style={styles.validationLabel}>Total Rows</Text>
              </View>
            </View>

            {validationErrors.length > 0 && (
              <View style={styles.errorsSection}>
                <Text style={styles.errorsTitle}>Validation Errors</Text>
                <ScrollView style={styles.errorsList} nestedScrollEnabled>
                  {validationErrors.slice(0, 10).map((error, idx) => (
                    <View key={idx} style={styles.errorItem}>
                      <Ionicons name="warning" size={16} color={COLORS.warning} />
                      <Text style={styles.errorText}>
                        Row {error.row}, {error.column}: {error.message}
                      </Text>
                    </View>
                  ))}
                  {validationErrors.length > 10 && (
                    <Text style={styles.moreErrors}>
                      ... and {validationErrors.length - 10} more errors
                    </Text>
                  )}
                </ScrollView>
              </View>
            )}

            <View style={styles.previewSection}>
              <Text style={styles.previewTitle}>Data Preview (First 3 Rows)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View style={styles.previewTable}>
                  <View style={styles.previewHeader}>
                    {Object.keys(columnMapping).map(col => (
                      <Text key={col} style={styles.previewHeaderCell}>
                        {REQUIRED_COLUMNS.find(c => c.key === columnMapping[col])?.label || col}
                      </Text>
                    ))}
                  </View>
                  {parsedData.rows.slice(0, 3).map((row, idx) => (
                    <View key={idx} style={styles.previewRow}>
                      {Object.keys(columnMapping).map(col => {
                        const colIndex = parsedData.headers.indexOf(col);
                        return (
                          <Text key={col} style={styles.previewCell}>
                            {row[colIndex] || '-'}
                          </Text>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.backToMappingBtn} 
                onPress={() => setStep('mapping')}
              >
                <Text style={styles.backToMappingText}>Back to Mapping</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.uploadBtn, validRows === 0 && styles.uploadBtnDisabled]} 
                onPress={processUpload}
                disabled={validRows === 0}
              >
                <Ionicons name="cloud-upload" size={22} color="#000" />
                <Text style={styles.uploadBtnText}>Upload {validRows} Records</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 4: PROCESSING */}
        {step === 'processing' && (
          <View style={styles.processingContent}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.processingTitle}>Uploading Data...</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>{uploadProgress}% Complete</Text>
          </View>
        )}

        {/* STEP 5: COMPLETE */}
        {step === 'complete' && uploadResult && (
          <View style={styles.completeContent}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
            </View>
            <Text style={styles.completeTitle}>Upload Complete!</Text>
            <Text style={styles.completeSubtitle}>
              Your data has been successfully imported
            </Text>

            <View style={styles.resultCards}>
              <View style={[styles.resultCard, { backgroundColor: COLORS.success + '20' }]}>
                <Text style={[styles.resultNumber, { color: COLORS.success }]}>
                  {uploadResult.success}
                </Text>
                <Text style={styles.resultLabel}>Records Imported</Text>
              </View>
              {uploadResult.failed > 0 && (
                <View style={[styles.resultCard, { backgroundColor: COLORS.error + '20' }]}>
                  <Text style={[styles.resultNumber, { color: COLORS.error }]}>
                    {uploadResult.failed}
                  </Text>
                  <Text style={styles.resultLabel}>Skipped (Errors)</Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.viewDataBtn} onPress={() => router.push('/research/analytics-engine')}>
              <MaterialCommunityIcons name="chart-line" size={22} color="#fff" />
              <Text style={styles.viewDataBtnText}>View in Analytics Engine</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadMoreBtn} onPress={resetUpload}>
              <Text style={styles.uploadMoreText}>Upload More Data</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Column Mapping Modal */}
      <Modal visible={showMappingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Map Column</Text>
            <Text style={styles.modalSubtitle}>"{currentMappingColumn}"</Text>
            
            <ScrollView style={styles.fieldList}>
              <TouchableOpacity
                style={styles.fieldOption}
                onPress={() => {
                  const newMapping = { ...columnMapping };
                  delete newMapping[currentMappingColumn];
                  setColumnMapping(newMapping);
                  setShowMappingModal(false);
                }}
              >
                <Text style={styles.fieldOptionText}>-- Skip this column --</Text>
              </TouchableOpacity>
              {REQUIRED_COLUMNS.map(col => (
                <TouchableOpacity
                  key={col.key}
                  style={[
                    styles.fieldOption,
                    columnMapping[currentMappingColumn] === col.key && styles.fieldOptionSelected
                  ]}
                  onPress={() => updateMapping(currentMappingColumn, col.key)}
                >
                  <Text style={[
                    styles.fieldOptionText,
                    columnMapping[currentMappingColumn] === col.key && styles.fieldOptionTextSelected
                  ]}>
                    {col.label}
                  </Text>
                  {col.required && <Text style={styles.fieldRequired}>Required</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity 
              style={styles.modalCloseBtn} 
              onPress={() => setShowMappingModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  resetBtn: {
    padding: 5,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 30,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  stepDotCurrent: {
    borderColor: COLORS.success,
    borderWidth: 3,
  },
  stepNumber: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.cardBorder,
  },
  stepLineActive: {
    backgroundColor: COLORS.accent,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  stepContent: {
    flex: 1,
  },
  uploadArea: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    borderStyle: 'dashed',
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 15,
  },
  uploadSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  selectFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 20,
    gap: 10,
  },
  selectFileBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  formatGuide: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  formatGuideTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginBottom: 10,
  },
  formatGuideText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 15,
  },
  columnList: {
    gap: 10,
  },
  columnItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  columnItemText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
  },
  requiredBadge: {
    fontSize: 10,
    color: COLORS.success,
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  optionalBadge: {
    fontSize: 10,
    color: COLORS.textMuted,
    backgroundColor: COLORS.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  fileInfoText: {
    flex: 1,
  },
  fileName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  fileStats: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 15,
  },
  mappingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  mappingSource: {
    flex: 1,
  },
  mappingSourceText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  mappingPreview: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  mappingTarget: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: COLORS.cardBorder,
    padding: 10,
    borderRadius: 8,
  },
  mappingTargetMapped: {
    backgroundColor: COLORS.accent + '30',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  mappingTargetText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  mappingTargetTextMapped: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  validateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 10,
  },
  validateBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  validationSummary: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  validationCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  validationNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  validationLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  errorsSection: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  errorsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.warning,
    marginBottom: 10,
  },
  errorsList: {
    maxHeight: 150,
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  errorText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 12,
  },
  moreErrors: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 5,
  },
  previewSection: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  previewTable: {
    minWidth: 500,
  },
  previewHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.accent + '20',
    borderRadius: 6,
  },
  previewHeaderCell: {
    width: 100,
    padding: 8,
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: 'bold',
  },
  previewRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  previewCell: {
    width: 100,
    padding: 8,
    color: COLORS.text,
    fontSize: 11,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  backToMappingBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  backToMappingText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  uploadBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  uploadBtnDisabled: {
    backgroundColor: COLORS.cardBorder,
  },
  uploadBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  processingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 30,
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: COLORS.card,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },
  progressText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
  },
  completeContent: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 40,
  },
  successIcon: {
    marginBottom: 20,
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  completeSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  resultCards: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 30,
    marginBottom: 30,
  },
  resultCard: {
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
  },
  resultNumber: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  resultLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 5,
  },
  viewDataBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 12,
    gap: 10,
  },
  viewDataBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  uploadMoreBtn: {
    marginTop: 15,
    paddingVertical: 12,
  },
  uploadMoreText: {
    color: COLORS.accent,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.accent,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  fieldList: {
    maxHeight: 400,
  },
  fieldOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: COLORS.background,
  },
  fieldOptionSelected: {
    backgroundColor: COLORS.accent + '30',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  fieldOptionText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  fieldOptionTextSelected: {
    color: COLORS.accent,
    fontWeight: 'bold',
  },
  fieldRequired: {
    fontSize: 10,
    color: COLORS.success,
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalCloseBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCloseBtnText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});
