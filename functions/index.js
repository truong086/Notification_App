const admin = require("firebase-admin");
const functions = require("firebase-functions");
admin.initializeApp();
const cors = require("cors")({origin: true});
const fetch = require("node-fetch");
const fs = require("fs");

const data = fs.readFileSync("emails.txt", "utf8");

const {onSchedule} = require("firebase-functions/v2/scheduler");
exports.saveUser = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      // Chỉ cho POST
      if (req.method !== "POST") {
        return res.status(405).json({
          success: false,
          message: "Method not allowed",
        });
      }

      const {userId, role, fcmToken, email, isLogout} = req.body;

      // Validate input
      if (!userId || !fcmToken) {
        return res.status(400).json({
          success: false,
          message: "Missing userId or fcmToken",
        });
      }

      console.log("Data received:", {userId, role, fcmToken, email, isLogout});
      // Lưu vào Firestore
      await admin.firestore()
          .collection("users")
          .doc(String(userId))
          .set(
              {
                userId: String(userId),
                role: role || "user",
                fcmToken: fcmToken,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                email: email,
                isLogout: isLogout || false,
              },
              {merge: true},
          );

      return res.status(200).json({
        success: true,
        message: "User saved successfully",
      });
    } catch (error) {
      console.error("saveUser error:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });
});

exports.logOut = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      // Chỉ cho POST
      if (req.method !== "POST") {
        return res.status(405).json({
          success: false,
          message: "Method not allowed",
        });
      }

      const dataJson = req.body;

      // Validate input
      if (!dataJson.userId) {
        return res.status(400).json({
          success: false,
          message: "Missing userId or fcmToken",
        });
      }

      // Lưu vào Firestore
      await admin.firestore()
          .collection("users")
          .doc(String(dataJson.userId))
          .set(
              {
                userId: String(dataJson.userId),
                isLogout: dataJson.isLogout || false,
              },
              {merge: true},
          );

      return res.status(200).json({
        success: true,
        message: "User saved successfully",
      });
    } catch (error) {
      console.error("saveUser error:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });
});

// exports.sendNotification = functions.https.onRequest(async (req, res) => {
//   cors(req, res, async () => {
//     try {
//       // 🔥 Fix body undefined
//       const {userId, title, body, type} = req.body || {};

//       if (!userId) {
//         return res.status(400).json({
//           success: false,
//           error: "Missing userId",
//         });
//       }

//       const userDoc = await admin.firestore()
//           .collection("users")
//           .doc(String(userId))
//           .get();

//       if (!userDoc.exists) {
//         return res.status(404).json({
//           success: false,
//           error: "User not found",
//         });
//       }

//       const data = userDoc.data() || {};
//       // console.log(title);
//       // console.log(body);
//       // return res.status(200).json({
//       //   success: true,
//       //   error: "Success",
//       //   data: data,
//       // });
//       // ========== MOBILE PUSH ==========
//       // if (data.fcmToken) {
//       //   await admin.messaging().send({
//       //     token: data.fcmToken,
//       //     notification: {
//       //       title: title || "No title",
//       //       body: body || "No body",
//       //     },
//       //   });
//       // }

//       if (data.fcmToken) {
//         const datatoken =
//             data.fcmToken.data === null ||
//             data.fcmToken.data === undefined ?
//               data.fcmToken :
//               data.fcmToken.data;

//         const testres = await sendExpoPush(
//             datatoken,
//             title,
//             body,
//             {
//               url: "https://your-web.com/order/123",
//             },
//             {
//               image: "https://i.pinimg.com/originals/33/0d/6a/330d6a77a01177d41773b999d98be7f4.jpg",
//             },
//         );

//         return res.status(200).json({
//           success: true,
//           error: "Success",
//           data: testres,
//         });
//       }
//       // ========== WEB PUSH ==========
//       if (data.webToken) {
//         await admin.messaging().send({
//           token: data.webToken,
//           webpush: {
//             notification: {
//               title: title || "No title",
//               body: body || "No body",
//             },
//           },
//         });
//       }

//       return res.json({
//         success: true,
//       });
//     } catch (error) {
//       console.error("SEND NOTIFICATION ERROR:", error);
//       return res.status(500).json({
//         success: false,
//         error: error.message,
//       });
//     }
//   });
// });

const dataUserAdmin = async (collectionData,
    search1, where, search2,
    type, userId) => {
  let userDoc;
  if (type === 2) {
    userDoc = await admin.firestore()
        .collection(collectionData)
        .where(search1, where, search2)
        .get();
  } else if (type === 1) {
    userDoc = await admin.firestore()
        .collection(collectionData)
        .doc(String(userId))
        .get();
  }


  return userDoc;
};

const dataUserSitter = async (collectionData,
    search1, where, search2) => {
  const userDoc = await admin.firestore()
      .collection(collectionData)
      .where(search1, where, search2)
      .limit(1)
      .get();

  return userDoc;
};

const senNotificationFunc = async (userDoc, title, body, type, url) => {
  if (type === 2) {
    for (const doc of userDoc.docs) {
      const data = doc.data() || {};
      if (data.fcmToken && data.isLogout === false) {
        const datatoken =
          data.fcmToken.data === null ||
            data.fcmToken.data === undefined ?
            data.fcmToken :
            data.fcmToken.data;

        const testres = await sendExpoPush(
            datatoken,
            title,
            body,
            {
              url: url,
            },
            {
              image: "https://i.pinimg.com/originals/33/0d/6a/330d6a77a01177d41773b999d98be7f4.jpg",
            },
        );

        if (testres.success === false) {
          return false;
        }
      } else return false;
    }

    return true;
  } else if (type === 1) {
    const data = userDoc.data() || {};
    if (data.fcmToken && data.isLogout === false) {
      const datatoken =
        data.fcmToken.data === null ||
          data.fcmToken.data === undefined ?
          data.fcmToken :
          data.fcmToken.data;
      const testres = await sendExpoPush(
          datatoken,
          title,
          body,
          {
            url: url,
          },
          {
            image: "https://i.pinimg.com/originals/33/0d/6a/330d6a77a01177d41773b999d98be7f4.jpg",
          },
      );
      if (testres.success === false) {
        return false;
      }
    }

    return true;
  }
};
exports.sendNotification = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      // 🔥 Fix body undefined
      let {userId, title, body, type, sitter, url} = req.body || {};

      if (!userId.id) {
        return res.status(400).json({
          success: false,
          error: "Missing userId",
        });
      }

      let senNotificationData;
      let senNotificationDataOneUser;
      let senNotificationDataOneUserSitter;
      let userDoc;
      let userOne;
      let userSitter;

      if (type === "pending") {
        userDoc = await dataUserAdmin("users", "role", "==",
            "admin", 2, "");
        userOne = await dataUserAdmin("users", "",
            "", "", 1, userId.id);

        userSitter = await dataUserSitter("users", "email",
            "==", sitter.id);

        // if (userDoc.empty && !userOne.exists && !userSitter.exists) {
        //   return res.status(404).json({
        //     success: false,
        //     error: "User not found 2",
        //     data1: userOne.data(),
        //     data2: userDoc.docs,
        //   });
        // }

        title = "通知";

        if (!userDoc.empty) {
          body = "有新的預約申請正在等待確認。";
          senNotificationData =
            await senNotificationFunc(userDoc, title, body, 2, url);
        }


        if (userOne.exists) {
          body = "已收到您的預約申請，目前正在等待確認中。";
          senNotificationDataOneUser =
            await senNotificationFunc(userOne, title, body, 1, userId.url);
        }

        if (!userSitter.empty) {
          body = "您有新的指定服務正在等待處理。";
          senNotificationDataOneUserSitter =
            await senNotificationFunc(userSitter.docs[0],
                title, body, 1, sitter.url);
        }


        if (senNotificationData ||
          senNotificationDataOneUser ||
          senNotificationDataOneUserSitter) {
          return res.status(200).json({
            success: true,
            error: "Success",
          });
        } else {
          return res.status(404).json({
            success: false,
            error: "Send Error",
            data1: senNotificationDataOneUser,
            data2: senNotificationData,
          });
        }
      } else if (type === "payment_pending") {
        userOne = await dataUserAdmin("users", "",
            "", "", 1, userId.id);

        if (userOne.exists) {
          body = "您的訂單已可付款，請於規定期限內完成付款";
          senNotificationDataOneUser =
            await senNotificationFunc(userOne, title, body, 1, userId.url);

          if (senNotificationDataOneUser) {
            return res.status(200).json({
              success: true,
              error: "Success",
            });
          }
        }
      } else if (type === "confirmed") {
        userOne = await dataUserAdmin("users", "",
            "", "", 1, userId.id);

        if (userOne.exists) {
          body = "已收到您的付款～您的預約訂單已成功建立！";
          senNotificationDataOneUser =
            await senNotificationFunc(userOne, title, body, 1, userId.url);

          if (senNotificationDataOneUser) {
            return res.status(200).json({
              success: true,
              error: "Success",
            });
          }
        }
      } else if (type === "cancelled") {
        userOne = await dataUserAdmin("users", "",
            "", "", 1, userId.id);

        if (userOne.exists) {
          body = "您的訂單已被取消";
          senNotificationDataOneUser =
            await senNotificationFunc(userOne, title, body, 1, userId.url);

          if (senNotificationDataOneUser) {
            return res.status(200).json({
              success: true,
              error: "Success",
            });
          }
        }
      }


      // ========== WEB PUSH ==========
      // if (data.webToken) {
      //   await admin.messaging().send({
      //     token: data.webToken,
      //     webpush: {
      //       notification: {
      //         title: title || "No title",
      //         body: body || "No body",
      //       },
      //     },
      //   });
      // }

      return res.json({
        success: true,
      });
    } catch (error) {
      console.error("SEND NOTIFICATION ERROR:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });
});
/**
 * Send Expo push notification
 * @param {string} token
 * @param {string} title
 * @param {string} body
 * @param {Object} data
 */
async function sendExpoPush(token, title, body, data = {}) {
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      to: token,
      title: title || "No title",
      body: body || "No body",
      mutableContent: true,
      data, // dùng để deep link
      sound: "default",
      image: "https://i.pinimg.com/originals/33/0d/6a/330d6a77a01177d41773b999d98be7f4.jpg",
    }),
  });
  return res;
}

const mapData = (booking) => {
  const cleanData = {};

  Object.keys(booking).forEach((key) => {
    if (
      booking[key] !== undefined &&
      booking[key] !== null
    ) {
      cleanData[key] = booking[key];
    }
  });

  // cleanData.updatedAt =
  //   admin.firestore.FieldValue.serverTimestamp();

  return cleanData;
};
exports.syncBooking =
  functions.https.onRequest(async (req, res) => {
    cors(req, res, async () => {
      try {
        if (req.method !== "POST") {
          return res.status(405).json({
            success: false,
            error: "Only POST allowed",
          });
        }

        const booking = req.body || {};

        if (!booking.id) {
          return res.status(400).json({
            success: false,
            error: "booking.id required",
          });
        }

        const bookingId = String(booking.id);

        const ref =
          admin
              .firestore()
              .collection("bookings")
              .doc(bookingId);

        const doc = await ref.get();

        // const cleanData = {};

        // Object.keys(booking).forEach((key) => {
        //   if (
        //     booking[key] !== undefined &&
        //     booking[key] !== null
        //   ) {
        //     cleanData[key] = booking[key];
        //   }
        // });

        // cleanData.updatedAt =
        //   admin.firestore.FieldValue.serverTimestamp();

        const cleanData = mapData(booking);

        if (cleanData.status === "payment_pending" ||
          cleanData.status === "deposit_paid" ||
          cleanData.status === "pending") cleanData.isSend = false;

        else if (cleanData.status === "confirmed") cleanData.isSend2 = false;

        cleanData.updatedAt =
          admin.firestore.FieldValue.serverTimestamp();
        if (!doc.exists) {
          cleanData.createdAt =
            admin.firestore.FieldValue.serverTimestamp();

          /* if (cleanData.status === "payment_pending" ||
            cleanData.status === "deposit_paid" ||
            cleanData.status === "pending")
              cleanData.isSend = false;

          else if (cleanData.status === "confirmed")
            cleanData.isSend2 = false;
          */
          await ref.set(cleanData);

          return res.status(200).json({
            success: true,
            action: "created",
            bookingId,
          });
        }


        await ref.update(cleanData);

        return res.status(200).json({
          success: true,
          action: "updated",
          bookingId,
        });
      } catch (error) {
        console.error(error);

        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });
  });

exports.syncAddUpdateData =
  functions.https.onRequest(async (req, res) => {
    cors(req, res, async () => {
      try {
        console.log("Đã vào: ", req.body);
        if (req.method !== "POST") {
          return res.status(405).json({
            success: false,
            error: "Only POST allowed",
          });
        }

        const booking = req.body || {};

        console.log("Data Booking: ", booking);
        if (!booking.id) {
          return res.status(400).json({
            success: false,
            error: "booking.id required",
          });
        }

        const bookingId = String(booking.id);

        const ref =
          admin
              .firestore()
              .collection(booking.connection)
              .doc(bookingId);

        const doc = await ref.get();

        // const cleanData = {};

        // Object.keys(booking).forEach((key) => {
        //   if (
        //     booking[key] !== undefined &&
        //     booking[key] !== null
        //   ) {
        //     cleanData[key] = booking[key];
        //   }
        // });

        // cleanData.updatedAt =
        //   admin.firestore.FieldValue.serverTimestamp();

        const cleanData = mapData(booking);

        cleanData.updatedAt =
          admin.firestore.FieldValue.serverTimestamp();
        if (!doc.exists) {
          cleanData.createdAt =
            admin.firestore.FieldValue.serverTimestamp();

          /* if (cleanData.status === "payment_pending" ||
            cleanData.status === "deposit_paid" ||
            cleanData.status === "pending")
              cleanData.isSend = false;

          else if (cleanData.status === "confirmed")
            cleanData.isSend2 = false;
          */
          await ref.set(cleanData);

          return res.status(200).json({
            success: true,
            action: "created",
            bookingId,
          });
        }

        console.log("Data Doc: ", doc.data());
        console.log("cleanData: ", cleanData);
        if (booking.connection === "notification") {
          if (((compareDateWithTaiwan(cleanData.start_date) === 0 ||
            compareDateWithTaiwan(cleanData.start_date) === 1) &&
            compareDateWithTaiwan(doc.data().start_date) === -1) ||
            (compareDateWithTaiwan(doc.data().start_date) === 0 &&
              compareDateWithTaiwan(cleanData.start_date) === 1)) {
            cleanData.isShowNotification = false;
          } else {
            cleanData.isShowNotification =
              doc.data().isShowNotification || false;
          }
        } else if (booking.connection === "Vaccination") {
          if (((compareDateWithTaiwan(cleanData.record_date) === 0 ||
            compareDateWithTaiwan(cleanData.record_date) === 1) &&
            compareDateWithTaiwan(doc.data().record_date) === -1) ||
            (compareDateWithTaiwan(doc.data().record_date) === 0 &&
              compareDateWithTaiwan(cleanData.record_date) === 1)) {
            cleanData.isShowNotification = false;
          } else {
            cleanData.isShowNotification =
              doc.data().isShowNotification || false;
          }
        }
        await ref.update(cleanData);

        return res.status(200).json({
          success: true,
          action: "updated",
          bookingId,
        });
      } catch (error) {
        console.error(error);

        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });
  });

exports.syncDeleteData =
  functions.https.onRequest(async (req, res) => {
    cors(req, res, async () => {
      try {
        console.log("Đã vào: ", req.body);
        if (req.method !== "POST") {
          return res.status(405).json({
            success: false,
            error: "Only POST allowed",
          });
        }

        const booking = req.body || {};

        console.log("Data Booking: ", booking);
        if (!booking.id) {
          return res.status(400).json({
            success: false,
            error: "booking.id required",
          });
        }

        const bookingId = String(booking.id);

        const ref =
          admin
              .firestore()
              .collection(booking.connection)
              .doc(bookingId)
              .delete();

        return res.status(200).json({
          success: true,
          action: ref,
        });
      } catch (error) {
        console.error(error);

        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });
  });

exports.autoSendEmail = onSchedule("every 1 minutes", async () => {
  const db = admin.firestore();

  let checkNumber = 0;
  let userDoc;
  let senNotificationData;
  let body;
  let title;

  const notifications =
    await db.collection("notification").get();

  for (const item of notifications.docs) {
    const data = item.data();
    console.log("Data: ", data);

    if (compareDateWithTaiwan(data.start_date) === 0 &&
      data.isShowNotification === false &&
      data.is_active === true) {
      title = data.title;
      if (data.priority === "normal") {
        body = "ℹ️ℹ️通知: ";
      } else if (data.priority === "important") {
        body = "🆘🛑🛑🛑重要通知: ";
      } else if (data.priority === "urgent") {
        body = "🆘🆘🆘🚨🚨🚨緊急通知: ";
      }
      body += data.content;

      if (data.target_role === "admin") {
        userDoc = await dataUserAdmin("users", "role", "==",
            "admin", 2, "");
        if (!userDoc.empty) {
          senNotificationData =
            await senNotificationFunc(userDoc, title, body, 2, data.link_url);

          checkNumber += 1;
        }
      } else if (data.target_role === "client") {
        userDoc = await dataUserAdmin("users", "role", "!=",
            "admin", 2, "");
        if (!userDoc.empty) {
          for (const itemUserData of userDoc.docs) {
            const dataUserItems = itemUserData.data();
            if (!checkEmailList().includes(dataUserItems.email)) {
              senNotificationData = await senNotificationFunc(
                  itemUserData,
                  title,
                  body,
                  1,
                  data.link_url,
              );
              checkNumber += 1;
            }
          }
        }
      } else if (data.target_role === "sitter") {
        userDoc = await dataUserAdmin("users", "role", "!=",
            "admin", 2, "");
        if (!userDoc.empty) {
          for (const itemUserData of userDoc.docs) {
            const dataUserItems = itemUserData.data();
            if (checkEmailList().includes(dataUserItems.email)) {
              senNotificationData = await senNotificationFunc(
                  itemUserData,
                  title,
                  body,
                  1,
                  data.link_url,
              );
              checkNumber += 1;
            }
          }
        }
      } else if (data.target_role === "all") {
        userDoc =
          await db.collection("users").get();

        if (!userDoc.empty) {
          senNotificationData =
            await senNotificationFunc(userDoc, title, body, 2, data.link_url);
          console.log("Data Send Notification: ", senNotificationData);
          checkNumber += 1;
        }
      }

      if (checkNumber > 0) {
        const ref =
          admin
              .firestore()
              .collection("notification")
              .doc(data.id);

        const cleanData = mapData({
          id: data.id,
          isShowNotification: true,
        });

        await ref.update(cleanData);

        checkNumber = 0;
      }
    }
  }

  return null;
});

exports.autoSendNotificationThuoc = onSchedule("every 1 minutes", async () => {
  const db = admin.firestore();

  let checkNumber = 0;
  let userDoc;
  let senNotificationData;
  let body;
  let title;

  const notifications =
    await db.collection("Medicine").get();

  for (const item of notifications.docs) {
    const data = item.data();
    console.log("Data: ", data);
    const numberDate = daysUntil(data.scheduled_date);
    if (numberDate <= 7 && numberDate > 0) {
      if (data.isShowNotification === false &&
        isCurrentTimeNear(data.scheduled_time, 3)
      ) {
        userDoc = await dataUserAdmin("users",
            "", "", "", 1, data.user_id);

        if (userDoc.exists) {
          title = "通知";
          body = `提醒您，您的藥物 ${data.medication_name} 將於 ` +
            `${data.scheduled_date} 到期，還有${numberDate}`+
            `天就到期了，請記得${data.scheduled_time}要吃藥喔，請及時處理。`;

          senNotificationData = await
          senNotificationFunc(userDoc,
              title, body, 1, "/Booking");

          console.log("Data Send Notification: ", senNotificationData);
          checkNumber += 1;
        }
      }

      if (checkNumber > 0) {
        const ref =
          admin
              .firestore()
              .collection("Medicine")
              .doc(data.id);

        const cleanData = mapData({
          id: data.id,
          isShowNotification: true,
          updatedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        });

        await ref.update(cleanData);

        checkNumber = 0;
      }
    } else if (numberDate === 0) {
      if ((data.isShowNotification === false &&
        isCurrentTimeNear(data.scheduled_time, 3)) ||
        (data.isShowNotification === true &&
        isCurrentTimeNear(data.scheduled_time, 3)&&
        getDayStatusFromTimestamp(data.updatedAt)
            .status === "expired")
      ) {
        userDoc = await dataUserAdmin("users",
            "", "", "", 1, data.user_id);

        if (userDoc.exists) {
          title = "通知";
          body = `今天 ${data.scheduled_time} 需要服藥。`;

          senNotificationData = await
          senNotificationFunc(userDoc,
              title, body, 1, "/Booking");

          console.log("Data Send Notification: ", senNotificationData);
          checkNumber += 1;
        }
      }

      if (checkNumber > 0) {
        const ref =
          admin
              .firestore()
              .collection("Medicine")
              .doc(data.id);

        const cleanData = mapData({
          id: data.id,
          isShowNotification: true,
          updatedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        });

        await ref.update(cleanData);

        checkNumber = 0;
      }
    }
  }

  return null;
});

exports.autoSendNotificationVaccin = onSchedule("every 1 minutes", async () => {
  const db = admin.firestore();

  let checkNumber = 0;
  let userDoc;
  let senNotificationData;
  let body;
  let title;

  const notifications =
    await db.collection("Vaccination").get();

  for (const item of notifications.docs) {
    const data = item.data();
    console.log("Data: ", data);
    const numberDate = daysUntil(data.next_due_date);
    if (numberDate <= 7 && numberDate > 0) {
      if (data.isShowNotification === false) {
        userDoc = await dataUserAdmin("users",
            "", "", "", 1, data.created_by_id);

        if (userDoc.exists) {
          title = "通知";
          body = `距離疫苗施打日期還有${numberDate}天`;

          senNotificationData = await
          senNotificationFunc(userDoc,
              title, body, 1, "/Booking");

          console.log("Data Send Notification: ", senNotificationData);
          checkNumber += 1;
        }
      }

      if (checkNumber > 0) {
        const ref =
          admin
              .firestore()
              .collection("Vaccination")
              .doc(data.id);

        const cleanData = mapData({
          id: data.id,
          isShowNotification: true,
          updatedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        });

        await ref.update(cleanData);

        checkNumber = 0;
      }
    } else if (numberDate === 0) {
      if (data.isShowNotification === false ||
        (data.isShowNotification === true &&
        getDayStatusFromTimestamp(data.updatedAt)
            .status === "expired")
      ) {
        userDoc = await dataUserAdmin("users",
            "", "", "", 1, data.created_by_id);

        if (userDoc.exists) {
          title = "通知";
          body = `今天是疫苗施打日期`;

          senNotificationData = await
          senNotificationFunc(userDoc,
              title, body, 1, "/Booking");

          console.log("Data Send Notification: ", senNotificationData);
          checkNumber += 1;
        }
      }

      if (checkNumber > 0) {
        const ref =
          admin
              .firestore()
              .collection("Vaccination")
              .doc(data.id);

        const cleanData = mapData({
          id: data.id,
          isShowNotification: true,
          updatedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        });

        await ref.update(cleanData);

        checkNumber = 0;
      }
    }
  }

  return null;
});

/**
* @param {string} timestamp Firestore Timestamp
* @return {Object}
*/
function getDayStatusFromTimestamp(timestamp) {
  const orderDate = timestamp.toDate();

  // Lấy thời gian hiện tại theo Đài Loan
  const today = new Date(
      new Date().toLocaleString("en-US", {
        timeZone: "Asia/Taipei",
      }),
  );

  // Đổi timestamp Firebase sang giờ Đài Loan
  const targetDate = new Date(
      orderDate.toLocaleString("en-US", {
        timeZone: "Asia/Taipei",
      }),
  );

  // Chỉ so sánh ngày
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor(
      (today.getTime() - targetDate.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return {
      status: "today",
      days: 0,
      message: "Hôm nay",
    };
  }

  if (diffDays > 0) {
    return {
      status: "expired",
      days: diffDays,
      message: `Đã quá ${diffDays} ngày`,
    };
  }

  return {
    status: "upcoming",
    days: Math.abs(diffDays),
    message: `Còn ${Math.abs(diffDays)} ngày`,
  };
}
/**
* @param {string} targetTime Firestore Timestamp
* @param {number} rangeMinutes
* @return {boolean}
*/
function isCurrentTimeNear(targetTime, rangeMinutes = 5) {
  const now = new Date(
      new Date().toLocaleString("en-US", {
        timeZone: "Asia/Taipei",
      }),
  );

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [hour, minute] = targetTime.split(":").map(Number);
  const targetMinutes = hour * 60 + minute;

  return (
    currentMinutes >= targetMinutes &&
    currentMinutes <= targetMinutes + rangeMinutes
  );
}

/**
* @param {string} dateString Firestore Timestamp
* @return {Number} Số ngày còn lại so với ngày hiện tại ở múi giờ Đài Loan
*/
function daysUntil(dateString) {
  const today = new Date(
      new Date().toLocaleString("en-US", {
        timeZone: "Asia/Taipei",
      }),
  );

  const target = new Date(dateString);

  // Chỉ so sánh ngày
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target.getTime() -
  today.getTime()) / (1000 * 60 * 60 * 24));
}
/**
* @param {string} dateString Firestore Timestamp
* @return {Array<string>}
*/
function checkEmailList() {
  // const emailList = data
  // .split("\n")
  // .map(email => email.trim().toLowerCase())
  // .filter(Boolean);

  const emailList = data
      .split("\n")
      .map((email) => email.trim())
      .filter(Boolean);

  return emailList;
}
/**
 * @param {string} dateString Firestore Timestamp
 * @return {number}
 */
function compareDateWithTaiwan(dateString) {
  const today = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Asia/Taipei",
  });

  if (dateString === today) return 0; // Hôm nay
  if (dateString > today) return 1; // Tương lai
  return -1; // Quá khứ
}
exports.sendNotificationProduct =
  functions.https.onRequest(async (req, res) => {
    cors(req, res, async () => {
      try {
        if (req.method !== "POST") {
          return res.status(405).json({
            success: false,
            error: "Only POST allowed",
          });
        }

        const product = req.body || {};

        if (!product.userId) {
          return res.status(400).json({
            success: false,
            error: "booking.id required",
          });
        }

        const productuserId = String(product.userId);

        const userDoc =
          await dataUserAdmin("users", "", "", "", 1, productuserId);

        let body;
        let senNotificationDataOneUserSitter;
        const title = "通知";
        let userAdmin;

        if (userDoc.exists) {
          if (product.status === "create") {
            userAdmin = await dataUserAdmin("users", "role", "==",
                "admin", 2, "");

            body = "您的商品訂單已確認！請於規定期限內完成付款。";

            senNotificationDataOneUserSitter =
              await senNotificationFunc(userDoc,
                  title, body, 1, product.url);
            if (!userAdmin.empty) {
              body = "您有一筆新的商品訂單！";

              await senNotificationFunc(userAdmin,
                  title, body, 2, "/ProductManagement");
            }
          } else if (product.status === "update") {
            if (product.statusProduct === "pending") {
              body = "您的商品訂單已確認！請於規定期限內完成付款。 ";
            } else if (product.statusProduct === "confirmed") {
              body = "已收到您的付款，商品訂單已成功建立！";
            } else if (product.statusProduct === "shipped") {
              body = "您的商品訂單已出貨！感謝您的購買～";
            } else if (product.statusProduct === "cancelled") {
              body = "您的商品訂單已取消，感謝您的理解。";
            }

            senNotificationDataOneUserSitter =
              await senNotificationFunc(userDoc,
                  title, body, 1, product.url);

            console.log("Data Send Product: ",
                senNotificationDataOneUserSitter);
          }
          return res.status(200).json({
            success: true,
            error: "Success",
          });
        }

        return res.status(404).json({
          success: false,
          error: "User Null",
        });
        // const cleanData = {};

        // Object.keys(booking).forEach((key) => {
        //   if (
        //     booking[key] !== undefined &&
        //     booking[key] !== null
        //   ) {
        //     cleanData[key] = booking[key];
        //   }
        // });

        // cleanData.updatedAt =
        //   admin.firestore.FieldValue.serverTimestamp();
      } catch (error) {
        console.error(error);

        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });
  });

exports.sendNotificationAllSitter =
  functions.https.onRequest(async (req, res) => {
    cors(req, res, async () => {
      const emails = req.body.emails;

      if (emails && emails.length > 0) {
        for (const i of emails) {
          const emailDocs = await dataUserSitter("users", "email", "==", i);

          if (!emailDocs.empty) {
            const body = "產品公告通知";

            await senNotificationFunc(
                emailDocs.docs[0], // hoặc .id tùy bạn cần
                "通知",
                body,
                1,
                "/Bookings",
            );
          }
        }

        return res.status(200).json({
          success: true,
          error: "Success",
        });
      }

      return res.status(404).json({
        success: false,
        error: "Sitter Null",
      });
    });
  });
/**
 * Kiểm tra theo phút
 */
async function updateBookingStatus() {
  const db = admin.firestore();

  const bookings =
    await db.collection("bookings").get();

  for (const item of bookings.docs) {
    const data = item.data();

    if (isCheckToDay(data.updatedAt)) continue;

    const ref =
      admin
          .firestore()
          .collection("bookings")
          .doc(data.id);

    const doc = await ref.get();
    if ((data.status === "payment_pending" ||
      data.status === "pending" ||
      data.status === "deposit_paid") && data.isSend === true) {
      if (doc.exists) {
        const cleanData = mapData({id: data.id, isSend: false});

        await ref.update(cleanData);
      }
    }

    if (data.status !== "payment_pending" &&
      data.status !== "pending" &&
      data.status !== "deposit_paid" &&
      data.status !== "completed" &&
      data.status !== "in_progress" &&
      data.isSend2 === true) {
      if (doc.exists) {
        const cleanData = mapData({id: data.id, isSend2: false});
        await ref.update(cleanData);
      }
    }
  }
}
/**
 * @param {Object} dateData Firestore Timestamp
 * @return {boolean}
 */
function isCheckToDay(dateData) {
  const orderDate = dateData.toDate();
  const now = new Date();

  const isToday =
    orderDate.getDate() === now.getDate() &&
    orderDate.getMonth() === now.getMonth() &&
    orderDate.getFullYear() === now.getFullYear();

  return isToday;
}
exports.autoCheck = onSchedule("every 1 minutes", async () => {
  // sendExpoPush("ExponentPushToken[0r0F0hDr-9MRHaCFjOBVBc]", "aa", "Ok", {
  //   url: "/Bookings",
  // });
  const db = admin.firestore();

  const bookings =
    await db.collection("bookings").get();

  if (isCurrentTimeInRange(0, 1, 0, 10)) {
    await updateBookingStatus();
  }
  for (const item of bookings.docs) {
    const data = item.data();
    console.log("Data: ", data);

    const userOne = await dataUserAdmin(
        "users",
        "",
        "",
        "",
        1,
        data.user_id,
    );

    // const userOne = await dataUserAdmin(
    //     "users",
    //     "",
    //     "",
    //     "",
    //     1,
    //     "69e83c9d77ed05dd6881f45e",
    // );


    if (userOne.exists) {
      const ref =
        admin
            .firestore()
            .collection("bookings")
            .doc(data.id);

      const doc = await ref.get();

      const dataDateCheck = getDayStatusFromString(data.start_date);

      console.log("Date dataDateCheck: ", dataDateCheck);
      // ------------------ Còn 3 ngày -------
      if (
        dataDateCheck.status === "UPCOMING" &&
        dataDateCheck.diffDays <= 3
      ) {
        if ((data.status === "payment_pending" ||
          data.status === "pending" ||
          data.status === "deposit_paid") && data.isSend === false) {
          if (doc.exists) {
            const body = `提醒您，目前距離服務開始僅剩${dataDateCheck.diffDays}，` +
              `但相關費用尚未完成支付。若未於期限內完成付款，` +
              `將無法安排員工前往提供服務`;
            const title = "通知";
            const {diffMinutes, absMinutes} =
              getDiffMinutesFromTimestamp(data.updatedAt);
            console.log("Data Time: ", diffMinutes);
            console.log("Data Time Số Phút: ", absMinutes);

            if (diffMinutes < -10) {
              const cleanData = mapData({id: data.id, isSend: true});
              cleanData.updatedAt =
                admin.firestore.FieldValue.serverTimestamp();
              const check = await senNotificationFunc(
                  userOne,
                  title,
                  body,
                  1,
                  "/Bookings",
              );

              await ref.update(cleanData);

              console.log("Data Check: ", check);
            }
          }
        }

        // ------ 1 Ngày ---------
        if (
          dataDateCheck.status === "UPCOMING" &&
          dataDateCheck.diffDays === 1
        ) {
          if (data.status !== "payment_pending" &&
            data.status !== "pending" &&
            data.status !== "deposit_paid" &&
            data.status !== "cancelled" &&
            data.status !== "completed" &&
            data.status !== "in_progress" &&
            data.isSend2 === false) {
            if (doc.exists) {
              let body = "親愛的飼主您好，提醒您，您預約的服務將於" +
                "明天開始，請留意相關安排。";
              const title = "通知";

              const userSite = await dataUserSitter("users", "email",
                  "==", data.emailSitter);
              const {diffMinutes, absMinutes} =
                getDiffMinutesFromTimestamp(data.updatedAt);
              console.log("Data Time: ", diffMinutes);
              console.log("Data Time Số Phút: ", absMinutes);

              if (diffMinutes < -10) {
                const cleanData = mapData({id: data.id, isSend2: true});
                cleanData.updatedAt =
                  admin.firestore.FieldValue.serverTimestamp();
                await senNotificationFunc(
                    userOne,
                    title,
                    body,
                    1,
                    "/Bookings",
                );

                const userDoc = await dataUserAdmin("users", "role", "==",
                    "admin", 2, "");

                if (!userDoc.empty) {
                  body = "明天有一項任務即將開始";
                  await senNotificationFunc(userDoc,
                      title, body, 2, "/Bookings");
                }


                if (!userSite.empty) {
                  body = "提醒您，明天有一項服務任務";
                  await senNotificationFunc(userSite.docs[0], title,
                      body, 1, "/MyAssignedBookings");
                }
                await ref.update(cleanData);
              }
            }
          }
        }
      } else if (dataDateCheck.status === "OVERDUE" &&
        dataDateCheck.diffDays > 1) {
        // ------------------- Quá hạn ----------
        if ((data.status === "payment_pending" ||
          data.status === "pending" ||
          data.status === "deposit_paid") && data.isSend === false) {
          const {diffMinutes, absMinutes} =
            getDiffMinutesFromTimestamp(data.updatedAt);
          console.log("Data Time: ", diffMinutes);
          console.log("Data Time Số Phút: ", absMinutes);

          if (diffMinutes < -10) {
            const cleanData = mapData({id: data.id, isSend: true});
            cleanData.updatedAt =
              admin.firestore.FieldValue.serverTimestamp();
            await senNotificationFunc(
                userOne,
                "通知",
                `已超過 ${Math.abs(dataDateCheck.diffDays)}天尚未付款。`,
                1,
                "/Bookings",
            );
            await ref.update(cleanData);
          }
        }
      }
    }
  }

  return null;
});

/**
 * ExponentPushToken[5mwWwJCPfAevs7R2p-YR3w]
 */
/**
 * @param {Object} timestamp Firestore Timestamp
 * @return {number}
 */
function getDiffMinutesFromTimestamp(timestamp) {
  const orderMs =
    timestamp._seconds * 1000 +
    timestamp._nanoseconds / 1e6;

  const diffMinutes = (orderMs - Date.now()) / 60000;

  return {
    diffMinutes: diffMinutes, // số phút (âm = quá hạn)
    absMinutes: Math.abs(diffMinutes), // số phút tuyệt đối
  };
}
// Kiểm tra theo ngày tháng năm kiểu String

/**
 * @param {String} dateString Ngày dạng string (YYYY-MM-DD)
 * @return {{diffDays: number, status: string}} Kết quả số ngày và trạng thái
 */
function getDayStatusFromString(dateString) {
  const now = new Date();

  const today =
    new Date(
        now.toLocaleString(
            "en-US",
            {timeZone: "Asia/Taipei"},
        ),
    );
  today.setHours(0, 0, 0, 0);

  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);

  const diffMs = target - today;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return {
      diffDays,
      status: "UPCOMING",
    };
  }

  if (diffDays < 0) {
    return {
      diffDays: Math.abs(diffDays),
      status: "OVERDUE",
    };
  }

  return {
    diffDays: 0,
    status: "TODAY",
  };
}

/**
 * @param {number} startHour Firestore Timestamp
 * @param {number} startMinute Firestore Timestamp
 * @param {number} endHour Firestore Timestamp
 * @param {number} endMinute Firestore Timestamp
 * @return {boolean}
 */
function isCurrentTimeInRange(
    startHour,
    startMinute,
    endHour,
    endMinute,
) {
  const now = new Date();
  const taipeiTime =
    new Date(
        now.toLocaleString(
            "en-US",
            {timeZone: "Asia/Taipei"},
        ),
    );
  console.log("Date Now: ", taipeiTime);
  const current =
    taipeiTime.getHours() * 60 + taipeiTime.getMinutes();

  const start =
    startHour * 60 + startMinute;

  const end =
    endHour * 60 + endMinute;

  return current >= start && current <= end;
}
// function isBetween0005And0010() {
//   const now = new Date();
//   const hours = now.getHours();
//   const minutes = now.getMinutes();

//   // phải là 00:05 đến 00:10
//   return hours === 0 && minutes >= 5 && minutes <= 10;
// }
/**
 * Kiểm tra theo ngày
 * @param {Object} timestamp Firestore Timestamp
 */
// function getDayDiffFromFirestoreTimestamp(timestamp) {
//   const orderMs =
//     timestamp._seconds * 1000 +
//     Math.floor(timestamp._nanoseconds / 1e6);

//   const now = Date.now();

//   // đổi sang số ngày
//   const diffDays = Math.ceil((orderMs - now) / (1000 * 60 * 60 * 24));

//   if (diffDays > 0) {
//     return {
//       diffDays,
//       status: "UPCOMING" // còn ngày
//     };
//   }

//   if (diffDays < 0) {
//     return {
//       diffDays,
//       status: "OVERDUE" // quá hạn (diffDays âm)
//     };
//   }

//   return {
//     diffDays: 0,
//     status: "TODAY"
//   };
// }

/**
 * Kiểm tra theo phút
 * @param {Object} timestamp Firestore Timestamp
 * @return {boolean}
 */
// function checkMinuteFromFirebaseTimestamp(timestamp) {
//   const orderMs =
//     timestamp._seconds * 1000 +
//     Math.floor(timestamp._nanoseconds / 1e6);

//   const diffMinutes = Math.ceil((orderMs - Date.now()) / (1000 * 60));

//   if (diffMinutes > 0) {
//     return {
//       diffMinutes,
//       status: "UPCOMING",
//     };
//   }

//   if (diffMinutes < 0) {
//     return {
//       diffMinutes,
//       status: "OVERDUE",
//     };
//   }

//   return {
//     diffMinutes: 0,
//     status: "NOW",
//   };
// }

/**
 * Kiểm tra đã quá 1 phút chưa
 * @param {Object} timestamp Firestore Timestamp
 * @param {number} dayData Firestore Number
 * @return {boolean}
 */
// const isOver3Days = (timestamp, dayData) => {
//   const createdMs =
//     timestamp._seconds * 1000 +
//     timestamp._nanoseconds / 1000000;

//   return (
//     Date.now() - createdMs
//   ) >= dayData * 24 * 60 * 60 * 1000;
// }

/**
 * Kiểm tra đã quá 1 phút chưa
 * @param {Object} timestamp Firestore Timestamp
 * @param {number} minutes Firestore Number
 * @return {boolean}
 */
// function isOverTime(timestamp, minutes) {
//   const createdMs =
//     timestamp._seconds * 1000 +
//     timestamp._nanoseconds / 1000000;

//   return Date.now() - createdMs >= minutes * 60 * 1000;
// }

// quá 1 phút
// isOverTime(time, 1)

// // quá 5 phút
// isOverTime(time, 5)

// const isOver3Days = (timestamp) => {
//   // nếu là Firestore Timestamp
//   const createdMs = timestamp.toMillis();

//   const nowMs = Date.now();

//   const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

//   return (nowMs - createdMs) >= threeDaysMs;
// }
