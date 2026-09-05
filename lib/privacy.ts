import { Alert } from "react-native";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";

/** Set `extra.privacyPolicyUrl` in app.json. App Store review requires a live URL. */
export const privacyPolicyUrl =
  (Constants.expoConfig?.extra?.privacyPolicyUrl as string) ?? "";

export const privacyPolicyConfigured =
  Boolean(privacyPolicyUrl) && !privacyPolicyUrl.includes("REPLACE-WITH");

export async function openPrivacyPolicy() {
  if (!privacyPolicyConfigured) {
    Alert.alert("Privacy policy", "The privacy policy link isn't configured yet.");
    return;
  }
  try {
    await WebBrowser.openBrowserAsync(privacyPolicyUrl);
  } catch {
    // Nothing useful to tell the user if the browser won't open.
  }
}
