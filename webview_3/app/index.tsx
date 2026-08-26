import * as Notifications from "expo-notifications";
import { useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { registerPush } from "../src/Service/NotificationToken";
import { useUserStore } from "../src/store/userStore";

export default function App() {
  const setUser = useUserStore((state) => state.setUser)
  useEffect(() => {
    registerPush().then(e => {
      console.log("Data: ", e)
    })
  }, [])

  useEffect(() => {
  const subscription =
    Notifications.addNotificationResponseReceivedListener(
      (response) => {

        const data =
          response.notification.request.content.data;

        setUser("https://abmom.site" + (data.url || ""))
      }
    );

  return () => subscription.remove();
}, []);
  const url = useUserStore((state) => state.user)
  return (


    <WebView
  source={{ uri: url }}
      // style={{ padding: 20 }}
  javaScriptEnabled
  domStorageEnabled
  sharedCookiesEnabled
  thirdPartyCookiesEnabled
  allowsInlineMediaPlayback
  setSupportMultipleWindows={false}
  mediaPlaybackRequiresUserAction={false}
  onMessage={async (event) => {

    const data = JSON.parse(event.nativeEvent.data);

    if (data.type === "LOGIN_SUCCESS") {
      
      const token = await registerPush();

      await fetch("https://us-central1-truong-08062002.cloudfunctions.net/saveUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: data.userId,
          role: data.role,
          fcmToken: token,
          email: data.email,
          type: data.type,
          isLogout: data.isLogout || false
        })
      });
    }

    if (data.type === "LOGOUT_SUCCESS") {
      
      await fetch("https://us-central1-truong-08062002.cloudfunctions.net/logOut", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: data.userId,
          isLogout: data.isLogout || false
        })
      });
    }
  }}
/>
  );
}