// import * as Notifications from "expo-notifications";

// export async function registerPush() {

//   const { status } =
//     await Notifications.requestPermissionsAsync();

//   if (status !== "granted") return null;

//   const token =
//     await Notifications.getExpoPushTokenAsync();

//   return token.data;
// }

// import messaging from '@react-native-firebase/messaging';

// export async function registerPush() {

//   await messaging().requestPermission();

//   const token = await messaging().getToken();

//   console.log("FCM TOKEN:", token);

//   return token;
// }

import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

export async function registerPush() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId;

  const token = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  console.log(token);
  return token;
}