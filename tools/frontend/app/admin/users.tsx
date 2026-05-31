import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { getUsers, deleteUser } from '../../src/utils/api';
import { User } from '../../src/store/useStore';

export default function AdminUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const response = await getUsers(filter || undefined);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(userId);
              fetchUsers();
              Alert.alert('Success', 'User deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return theme.colors.info;
      case 'physio':
        return theme.colors.success;
      case 'patient':
        return theme.colors.warning;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return 'settings';
      case 'physio':
        return 'medical';
      case 'patient':
        return 'person';
      default:
        return 'person';
    }
  };

  const FilterButton = ({ label, value }: { label: string; value: string | null }) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === value && styles.filterButtonActive]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.filterButtonText, filter === value && styles.filterButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FilterButton label="All" value={null} />
        <FilterButton label="Admins" value="admin" />
        <FilterButton label="Physios" value="physio" />
        <FilterButton label="Patients" value="patient" />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        }
      >
        <Text style={styles.countText}>{users.length} users found</Text>

        {users.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <View style={[styles.roleIndicator, { backgroundColor: getRoleColor(user.role) }]} />
            <View style={styles.userInfo}>
              <View style={styles.userHeader}>
                <Ionicons name={getRoleIcon(user.role) as any} size={20} color={getRoleColor(user.role)} />
                <Text style={styles.userName}>{user.name}</Text>
              </View>
              <Text style={styles.userEmail}>{user.email}</Text>
              <View style={styles.userMeta}>
                <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) + '20' }]}>
                  <Text style={[styles.roleBadgeText, { color: getRoleColor(user.role) }]}>
                    {user.role.toUpperCase()}
                  </Text>
                </View>
                {user.phone && (
                  <Text style={styles.userPhone}>
                    <Ionicons name="call" size={12} color={theme.colors.textMuted} /> {user.phone}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteUser(user.id, user.name)}
            >
              <Ionicons name="trash" size={20} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        ))}

        {users.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  filterButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.xs,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.accent,
  },
  filterButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  filterButtonTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.semibold,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  countText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  roleIndicator: {
    width: 4,
  },
  userInfo: {
    flex: 1,
    padding: theme.spacing.md,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  userName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  userEmail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  roleBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
  },
  userPhone: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  deleteButton: {
    padding: theme.spacing.md,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
});
