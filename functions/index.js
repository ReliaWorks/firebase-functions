const functions = require('firebase-functions');

const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);

exports.newMessage = functions.database.ref('/conversations/{convId}/{messageId}').onWrite(event => {
  // Exit when the data is deleted.
  if (!event.data.exists()) {
    return;
  }
  // send notification when data was created firstly.
  if (event.data.previous.exists()) {
    return;
  }

  const original = event.data.val();
	const {convId} = event.params;
  const receiverId = original.otherUserId;
  const senderId = original.user._id;
  const senderName = original.user.name;

  //return admin.database().ref('/user_profiles/' + receiverId + '/notificationToken').once('value').then(snapshot => {
  return admin.database().ref('/user_profiles/' + receiverId).once('value').then(snapshot => {
    const {notificationToken} = snapshot.val();
    let {badgeNumber} = snapshot.val();
    badgeNumber = badgeNumber ? badgeNumber + 1 : 1;

    console.log(receiverId, ' : baadge : ', badgeNumber);

    const payload = {
      notification: {
        title: 'You have a new message from ' + senderName,
        body: original.text,
        sound: 'default',
        tag: 'newMessageNotif',
        badge: badgeNumber.toString()
      }
    };

    const updates = {};
    updates['/user_profiles/' + receiverId + '/badgeNumber'] = badgeNumber;
    return admin.database().ref().update(updates).then(() => {
      return admin.messaging().sendToDevice(notificationToken, payload, {collapseKey: 'newMessage'});
    });
  });
});

exports.newMatch = functions.database.ref('/user_matches/{uid}/{otherUid}').onWrite(event => {
  // Exit when the data is deleted.
  if (!event.data.exists()) {
    return;
  }

  const original = event.data.val();
	const {uid, otherUid} = event.params;

  if (original.matched === true) {
    if (event.data.previous.exists()) {
      const previous = event.data.previous.val();
      if (previous.matched === false) {
        admin.database().ref('user_profiles/' + uid).once('value')
					.then(snapshot => {
            const {notificationToken} = snapshot.val();
            let {badgeNumber} = snapshot.val();
            badgeNumber = badgeNumber ? badgeNumber + 1 : 1;

            const payload = {
              notification: {
                title: 'New connection!',
                body: original.otherUserName + ' connected with you.',
                sound: 'default',
                tag: 'newMessageNotif',
                badge: badgeNumber.toString()
              }
            };

            const updates = {};
            updates['/user_profiles/' + uid + '/badgeNumber'] = badgeNumber;
            return admin.database().ref().update(updates).then(() => {
              return admin.messaging().sendToDevice(notificationToken, payload, {collapseKey: 'newMessage'});
            });
					});
      } else {
        return;
      }
    } else {
      return;
    }
  } else {
    return;
  }
});
