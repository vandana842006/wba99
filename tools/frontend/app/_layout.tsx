import React from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { theme } from '../src/utils/theme';
import { StoreProvider } from '../src/store/useStore';

export default function RootLayout() {
  const Wrapper = Platform.OS === 'web' ? View : GestureHandlerRootView;
  
  return (
    <StoreProvider>
      <Wrapper style={{ flex: 1 }}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.colors.primary,
            },
            headerTintColor: theme.colors.textPrimary,
            headerTitleStyle: {
              fontWeight: '600',
            },
            contentStyle: {
              backgroundColor: theme.colors.primary,
            },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="auth/login" options={{ title: 'Login', headerBackTitle: 'Home' }} />
          <Stack.Screen name="auth/signup" options={{ title: 'Sign Up', headerBackTitle: 'Home' }} />
          <Stack.Screen name="admin/dashboard" options={{ title: 'Admin Dashboard', headerBackTitle: 'Home' }} />
          <Stack.Screen name="admin/users" options={{ title: 'Manage Users', headerBackTitle: 'Back' }} />
          <Stack.Screen name="admin/user-management" options={{ title: 'User Management', headerBackTitle: 'Back' }} />
          <Stack.Screen name="physio/dashboard" options={{ title: 'Physio Dashboard', headerBackTitle: 'Home' }} />
          <Stack.Screen name="physio/patients" options={{ title: 'My Patients', headerBackTitle: 'Back' }} />
          <Stack.Screen name="physio/assign-exercise" options={{ title: 'Assign Exercise', headerBackTitle: 'Back' }} />
          <Stack.Screen name="physio/create-prescription" options={{ title: 'Create Prescription', headerBackTitle: 'Back' }} />
          <Stack.Screen name="physio/manual-prescription-upload" options={{ title: 'Manual Prescription', headerBackTitle: 'Back' }} />
          <Stack.Screen name="physio/research-dashboard" options={{ title: 'Research Dashboard', headerBackTitle: 'Back' }} />
          <Stack.Screen name="patient/dashboard" options={{ title: 'Patient Dashboard', headerBackTitle: 'Home' }} />
          <Stack.Screen name="patient/exercises" options={{ title: 'My Exercises', headerBackTitle: 'Back' }} />
          <Stack.Screen name="patient/history" options={{ title: 'Assessment History', headerBackTitle: 'Back' }} />
          <Stack.Screen name="assessment/posture" options={{ title: 'Posture Assessment', headerBackTitle: 'Back' }} />
          <Stack.Screen name="assessment/walking" options={{ title: 'Walking Assessment', headerBackTitle: 'Back' }} />
          <Stack.Screen name="assessment/running" options={{ title: 'Running Assessment', headerBackTitle: 'Back' }} />
          <Stack.Screen name="assessment/msk" options={{ title: 'M.S.K. Assessment', headerBackTitle: 'Back' }} />
          <Stack.Screen name="assessment/result" options={{ title: 'Assessment Result', headerBackTitle: 'Back' }} />
        </Stack>
      </Wrapper>
    </StoreProvider>
  );
}
