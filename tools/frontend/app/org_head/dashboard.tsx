import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../src/utils/theme';

// org_head dashboard - redirects to organization dashboard
export default function OrgHeadDashboard() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to organization dashboard
    router.replace('/organization/dashboard');
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.accent} />
      <Text style={styles.text}>Loading Organization Dashboard...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.md,
  },
});
