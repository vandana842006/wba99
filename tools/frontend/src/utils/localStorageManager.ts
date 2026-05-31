import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';
import api from './api';

// Storage Keys
export const STORAGE_KEYS = {
  // User data
  USER_DATA: 'wba99_user_data',
  AUTH_TOKEN: 'wba99_auth_token',
  
  // Local analyses and assessments
  LOCAL_ANALYSES: 'wba99_local_analyses',
  LOCAL_ASSESSMENTS: 'wba99_local_assessments',
  LOCAL_PATIENTS: 'wba99_local_patients',
  LOCAL_REPORTS: 'wba99_local_reports',
  
  // Sync queues
  PENDING_SYNC: 'wba99_pending_sync',
  SYNC_HISTORY: 'wba99_sync_history',
  
  // App version tracking for migrations
  APP_VERSION: 'wba99_app_version',
  DATA_VERSION: 'wba99_data_version',
  
  // Research data
  RESEARCH_DRAFTS: 'wba99_research_drafts',
  DOWNLOADED_RESEARCH: 'wba99_downloaded_research',
  
  // Settings
  OFFLINE_MODE: 'wba99_offline_mode',
  AUTO_SYNC: 'wba99_auto_sync',
  LAST_SYNC_TIME: 'wba99_last_sync_time',
};

// Data types for sync
export type SyncDataType = 
  | 'assessment'
  | 'analysis'
  | 'patient'
  | 'report'
  | 'research'
  | 'pose_tagging';

export interface SyncItem {
  id: string;
  type: SyncDataType;
  data: any;
  userId: string;
  userName: string;
  userRole: string;
  organizationId?: string;
  organizationName?: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
  syncedAt?: string;
  retryCount: number;
}

export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  syncInProgress: boolean;
}

class LocalStorageManager {
  private static instance: LocalStorageManager;
  private syncInProgress = false;
  private networkListener: any = null;

  static getInstance(): LocalStorageManager {
    if (!LocalStorageManager.instance) {
      LocalStorageManager.instance = new LocalStorageManager();
    }
    return LocalStorageManager.instance;
  }

  // Initialize storage and check for APK upgrade
  async initialize(): Promise<void> {
    try {
      const currentVersion = '1.0.0'; // Use hardcoded version for now
      const storedVersion = await AsyncStorage.getItem(STORAGE_KEYS.APP_VERSION);
      
      if (storedVersion && storedVersion !== currentVersion) {
        // APK was upgraded - migrate data
        await this.migrateDataOnUpgrade(storedVersion, currentVersion);
      }
      
      // Store current version
      await AsyncStorage.setItem(STORAGE_KEYS.APP_VERSION, currentVersion);
      
      // Setup network listener for auto-sync
      this.setupNetworkListener();
      
      console.log('LocalStorageManager initialized, version:', currentVersion);
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }

  // Migrate data when APK is upgraded
  private async migrateDataOnUpgrade(oldVersion: string, newVersion: string): Promise<void> {
    console.log(`Migrating data from v${oldVersion} to v${newVersion}`);
    
    try {
      // Get all existing data
      const allKeys = await AsyncStorage.getAllKeys();
      const wba99Keys = allKeys.filter(key => key.startsWith('wba99_'));
      
      // Backup all data
      const backup: { [key: string]: any } = {};
      for (const key of wba99Keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          backup[key] = JSON.parse(value);
        }
      }
      
      // Store migration history
      const migrationHistory = await this.getItem('wba99_migration_history') || [];
      migrationHistory.push({
        fromVersion: oldVersion,
        toVersion: newVersion,
        migratedAt: new Date().toISOString(),
        dataKeys: wba99Keys,
      });
      await this.setItem('wba99_migration_history', migrationHistory);
      
      // Data is preserved - just log for now
      console.log('Data migration complete, preserved keys:', wba99Keys.length);
      
      // Force sync after upgrade to ensure server has latest
      await this.syncAllDataToServer();
    } catch (error) {
      console.error('Migration error:', error);
    }
  }

  // Setup network listener for auto-sync
  private setupNetworkListener(): void {
    if (this.networkListener) {
      this.networkListener();
    }
    
    this.networkListener = NetInfo.addEventListener(async (state) => {
      if (state.isConnected) {
        const autoSync = await this.getItem(STORAGE_KEYS.AUTO_SYNC);
        if (autoSync !== false) {
          await this.syncAllDataToServer();
        }
      }
    });
  }

  // Generic get/set methods
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error getting item:', key, error);
      return null;
    }
  }

  async setItem(key: string, value: any): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error setting item:', key, error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing item:', key, error);
    }
  }

  // Add item to sync queue
  async addToSyncQueue(item: Omit<SyncItem, 'synced' | 'retryCount'>): Promise<void> {
    try {
      const queue = await this.getItem<SyncItem[]>(STORAGE_KEYS.PENDING_SYNC) || [];
      
      const syncItem: SyncItem = {
        ...item,
        synced: false,
        retryCount: 0,
      };
      
      // Check if item already exists
      const existingIndex = queue.findIndex(q => q.id === item.id && q.type === item.type);
      if (existingIndex >= 0) {
        queue[existingIndex] = syncItem;
      } else {
        queue.push(syncItem);
      }
      
      await this.setItem(STORAGE_KEYS.PENDING_SYNC, queue);
      
      // Also store locally by type
      await this.storeLocalData(item.type, item.data, item.id);
      
      // Try to sync immediately if online
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        await this.syncAllDataToServer();
      }
    } catch (error) {
      console.error('Error adding to sync queue:', error);
    }
  }

  // Store data locally by type
  private async storeLocalData(type: SyncDataType, data: any, id: string): Promise<void> {
    let storageKey: string;
    
    switch (type) {
      case 'assessment':
        storageKey = STORAGE_KEYS.LOCAL_ASSESSMENTS;
        break;
      case 'analysis':
      case 'pose_tagging':
        storageKey = STORAGE_KEYS.LOCAL_ANALYSES;
        break;
      case 'patient':
        storageKey = STORAGE_KEYS.LOCAL_PATIENTS;
        break;
      case 'report':
        storageKey = STORAGE_KEYS.LOCAL_REPORTS;
        break;
      case 'research':
        storageKey = STORAGE_KEYS.RESEARCH_DRAFTS;
        break;
      default:
        storageKey = STORAGE_KEYS.LOCAL_ANALYSES;
    }
    
    const existing = await this.getItem<any[]>(storageKey) || [];
    const index = existing.findIndex(item => item.id === id);
    
    if (index >= 0) {
      existing[index] = { ...data, id, updatedAt: new Date().toISOString() };
    } else {
      existing.push({ ...data, id, createdAt: new Date().toISOString() });
    }
    
    await this.setItem(storageKey, existing);
  }

  // Sync all pending data to server
  async syncAllDataToServer(): Promise<{ success: boolean; syncedCount: number; failedCount: number }> {
    if (this.syncInProgress) {
      return { success: false, syncedCount: 0, failedCount: 0 };
    }
    
    this.syncInProgress = true;
    let syncedCount = 0;
    let failedCount = 0;
    
    try {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        this.syncInProgress = false;
        return { success: false, syncedCount: 0, failedCount: 0 };
      }
      
      const queue = await this.getItem<SyncItem[]>(STORAGE_KEYS.PENDING_SYNC) || [];
      const remainingQueue: SyncItem[] = [];
      
      for (const item of queue) {
        try {
          await this.syncItemToServer(item);
          syncedCount++;
          
          // Add to sync history
          await this.addToSyncHistory(item);
        } catch (error) {
          item.retryCount++;
          if (item.retryCount < 5) {
            remainingQueue.push(item);
          }
          failedCount++;
          console.error('Failed to sync item:', item.id, error);
        }
      }
      
      await this.setItem(STORAGE_KEYS.PENDING_SYNC, remainingQueue);
      await this.setItem(STORAGE_KEYS.LAST_SYNC_TIME, new Date().toISOString());
      
      return { success: true, syncedCount, failedCount };
    } catch (error) {
      console.error('Sync error:', error);
      return { success: false, syncedCount, failedCount };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync single item to server
  private async syncItemToServer(item: SyncItem): Promise<void> {
    const endpoint = this.getEndpointForType(item.type);
    
    await api.post(endpoint, {
      id: item.id,
      type: item.type,
      data: item.data,
      user_id: item.userId,
      user_name: item.userName,
      user_role: item.userRole,
      organization_id: item.organizationId,
      organization_name: item.organizationName,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      source: 'mobile_device',
    });
  }

  // Get API endpoint for data type
  private getEndpointForType(type: SyncDataType): string {
    switch (type) {
      case 'assessment':
        return '/admin/receive-assessment';
      case 'analysis':
      case 'pose_tagging':
        return '/admin/receive-analysis';
      case 'patient':
        return '/admin/receive-patient';
      case 'report':
        return '/admin/receive-report';
      case 'research':
        return '/admin/receive-research';
      default:
        return '/admin/receive-data';
    }
  }

  // Add to sync history
  private async addToSyncHistory(item: SyncItem): Promise<void> {
    const history = await this.getItem<any[]>(STORAGE_KEYS.SYNC_HISTORY) || [];
    history.push({
      id: item.id,
      type: item.type,
      syncedAt: new Date().toISOString(),
      userId: item.userId,
    });
    
    // Keep only last 100 items
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    await this.setItem(STORAGE_KEYS.SYNC_HISTORY, history);
  }

  // Get sync status
  async getSyncStatus(): Promise<SyncStatus> {
    const netInfo = await NetInfo.fetch();
    const queue = await this.getItem<SyncItem[]>(STORAGE_KEYS.PENDING_SYNC) || [];
    const lastSync = await this.getItem<string>(STORAGE_KEYS.LAST_SYNC_TIME);
    
    return {
      isOnline: netInfo.isConnected ?? false,
      pendingCount: queue.length,
      lastSyncTime: lastSync,
      syncInProgress: this.syncInProgress,
    };
  }

  // Get all local data for a user
  async getAllLocalData(userId?: string): Promise<{
    analyses: any[];
    assessments: any[];
    patients: any[];
    reports: any[];
    research: any[];
  }> {
    const analyses = await this.getItem<any[]>(STORAGE_KEYS.LOCAL_ANALYSES) || [];
    const assessments = await this.getItem<any[]>(STORAGE_KEYS.LOCAL_ASSESSMENTS) || [];
    const patients = await this.getItem<any[]>(STORAGE_KEYS.LOCAL_PATIENTS) || [];
    const reports = await this.getItem<any[]>(STORAGE_KEYS.LOCAL_REPORTS) || [];
    const research = await this.getItem<any[]>(STORAGE_KEYS.RESEARCH_DRAFTS) || [];
    
    if (userId) {
      return {
        analyses: analyses.filter(a => a.userId === userId),
        assessments: assessments.filter(a => a.userId === userId),
        patients: patients.filter(p => p.userId === userId),
        reports: reports.filter(r => r.userId === userId),
        research: research.filter(r => r.userId === userId),
      };
    }
    
    return { analyses, assessments, patients, reports, research };
  }

  // Export all data (for backup/transfer)
  async exportAllData(): Promise<string> {
    const allData = await this.getAllLocalData();
    const userData = await this.getItem(STORAGE_KEYS.USER_DATA);
    const syncHistory = await this.getItem(STORAGE_KEYS.SYNC_HISTORY);
    const currentVersion = '1.0.0';
    
    const exportData = {
      version: currentVersion,
      exportedAt: new Date().toISOString(),
      userData,
      ...allData,
      syncHistory,
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  // Import data (for restore/transfer)
  async importData(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.analyses) await this.setItem(STORAGE_KEYS.LOCAL_ANALYSES, data.analyses);
      if (data.assessments) await this.setItem(STORAGE_KEYS.LOCAL_ASSESSMENTS, data.assessments);
      if (data.patients) await this.setItem(STORAGE_KEYS.LOCAL_PATIENTS, data.patients);
      if (data.reports) await this.setItem(STORAGE_KEYS.LOCAL_REPORTS, data.reports);
      if (data.research) await this.setItem(STORAGE_KEYS.RESEARCH_DRAFTS, data.research);
      
      return true;
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  }

  // Clear all local data
  async clearAllData(): Promise<void> {
    const keys = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keys);
  }

  // Get storage usage
  async getStorageUsage(): Promise<{ used: number; items: number }> {
    const allKeys = await AsyncStorage.getAllKeys();
    const wba99Keys = allKeys.filter(key => key.startsWith('wba99_'));
    
    let totalSize = 0;
    for (const key of wba99Keys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        totalSize += value.length;
      }
    }
    
    return {
      used: totalSize,
      items: wba99Keys.length,
    };
  }
}

export const localStorageManager = LocalStorageManager.getInstance();
export default localStorageManager;
