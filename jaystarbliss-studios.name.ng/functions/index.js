const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Cloud Function to verify student access code and mint a custom token
exports.verifyStudentAccessCode = functions.https.onCall(async (data, context) => {
  const username = (data.username || "").trim();
  const accessCode = (data.accessCode || "").trim();

  if (!username || !accessCode) {
    throw new functions.https.HttpsError('invalid-argument', 'Username and access code are required.');
  }

  try {
    // Check the individualStudents collection for a matching record
    const snapshot = await admin.firestore()
      .collection('individualStudents')
      .where('username', '==', username)
      .where('accessCode', '==', accessCode)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid username or access code.');
    }

    const studentDoc = snapshot.docs[0];
    const studentId = studentDoc.id;
    const studentData = studentDoc.data();

    // Create a custom token for the student
    const customToken = await admin.auth().createCustomToken(studentId, { role: 'individualStudent' });

    return {
      success: true,
      token: customToken,
      studentName: studentData.fullName || studentData.name || studentData.username || ''
    };
  } catch (error) {
    console.error('Error in verifyStudentAccessCode:', error);
    throw new functions.https.HttpsError('internal', 'An error occurred while verifying access code.');
  }
});