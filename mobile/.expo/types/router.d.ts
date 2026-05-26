/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(auth)` | `/(auth)/login` | `/(auth)/signup` | `/(buyer)` | `/(buyer)/` | `/(buyer)/checklist` | `/(buyer)/lease-extension` | `/(buyer)/property-report` | `/(buyer)/stamp-duty` | `/(owner)` | `/(owner)/` | `/(owner)/documents` | `/(owner)/epc-upgrade` | `/(owner)/maintenance` | `/(owner)/stamp-duty` | `/_sitemap` | `/checklist` | `/documents` | `/epc-upgrade` | `/lease-extension` | `/login` | `/maintenance` | `/property-report` | `/signup` | `/stamp-duty`;
      DynamicRoutes: never;
      DynamicRouteTemplate: never;
    }
  }
}
