var functions = require('firebase-functions');
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
  const senderId = original.user._id;

  return admin.database().ref('/user_profiles/' + original.receiverId + '/notificationToken').once('value').then( snapshot => {
    console.log('key: ', snapshot.key, ' val(): ', snapshot.val());
    console.log('receiverId:', original.receiverId, ' user._id: ', original.user._id, ' name:', original.user.name);
    const payload = {
      notification: {
          title: 'You have a new message from ' + original.user.name,
          body: original.text,
	        sound: 'default',
	        tag: 'newMessageNotif'
      }
    };
    return admin.messaging().sendToDevice(snapshot.val(), payload, {collapseKey: 'newMessage'});
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
        admin.database().ref('user_profiles/' + uid + '/notificationToken').once('value')
					.then( snapshot => {
						const payload = {
	            notification: {
                title: 'New connection!',
                body: original.otherUserName + ' connected with you.',
                sound: 'default',
				        tag: 'newMessageNotif'
	            }
		        };
            return admin.messaging().sendToDevice(snapshot.val(), payload, {collapseKey: 'newMessage'});
					})
        console.log('notification should be send');
      } else {
        console.log('already matched, no need to send notification');
        return;
      }
    } else {
      console.log('created for the first time');
      return;
    }
  } else {
    console.log('matched: false');
    return;
  }
})
