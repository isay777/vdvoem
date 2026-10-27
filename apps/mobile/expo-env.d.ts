/// <reference types="expo/types" />

declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
    EXPO_PUBLIC_INVITE_BASE_URL?: string;
    EXPO_PUBLIC_EAS_PROJECT_ID?: string;
    EXPO_PUBLIC_DEMO_MODE?: string;
  }
}
