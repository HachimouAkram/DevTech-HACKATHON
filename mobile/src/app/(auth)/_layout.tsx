import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 220,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        contentStyle: { backgroundColor: '#f0fdf4' },
      }}
    >
      <Stack.Screen
        name="welcome"
        options={{
          animation: 'fade',
          animationDuration: 250,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          animation: 'slide_from_left',
          animationDuration: 220,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          animation: 'slide_from_right',
          animationDuration: 220,
        }}
      />
      <Stack.Screen
        name="verify-sms"
        options={{
          animation: 'slide_from_right',
          animationDuration: 200,
        }}
      />
    </Stack>
  );
}
