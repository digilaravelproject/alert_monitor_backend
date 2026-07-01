const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let fcmInitialized = false;

function initializeFCM() {
    if (fcmInitialized) return true;

    try {
        // Option 1: Firebase service account JSON from environment variable (as string)
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            fcmInitialized = true;
            console.log('[FCM Service] Firebase Admin initialized from env JSON.');
            return true;
        }

        // Option 2: Path to credentials file from env
        const credentialsPath = process.env.FIREBASE_CREDENTIALS_PATH;
        if (credentialsPath && fs.existsSync(credentialsPath)) {
            admin.initializeApp({
                credential: admin.credential.cert(credentialsPath)
            });
            fcmInitialized = true;
            console.log(`[FCM Service] Firebase Admin initialized from file: ${credentialsPath}`);
            return true;
        }

        // Option 3: Look for a firebase-service-account.json in config directory
        const defaultPath = path.join(__dirname, '..', 'config', 'firebase-service-account.json');
        if (fs.existsSync(defaultPath)) {
            admin.initializeApp({
                credential: admin.credential.cert(defaultPath)
            });
            fcmInitialized = true;
            console.log('[FCM Service] Firebase Admin initialized from default config/firebase-service-account.json.');
            return true;
        }

        // Option 4: Fallback (dry run / mock mode if not configured)
        console.warn('[FCM Service] Firebase credentials not found. Push notifications will run in MOCK mode.');
        return false;
    } catch (error) {
        console.error('[FCM Service] Failed to initialize Firebase Admin SDK:', error);
        return false;
    }
}

async function sendPushNotification(tokens, payload) {
    const isInitialized = initializeFCM();

    if (!tokens || tokens.length === 0) {
        return { success: true, sentCount: 0 };
    }

    if (!isInitialized) {
        console.log(`[MOCK FCM] Sending push alert to ${tokens.length} token(s) [${tokens.join(', ')}]. Payload:`, JSON.stringify(payload, null, 2));
        return { success: true, mock: true, sentCount: tokens.length };
    }

    try {
        const message = {
            notification: {
                title: payload.title,
                body: payload.body,
            },
            data: payload.data || {},
            tokens: tokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`[FCM Service] Successfully sent ${response.successCount} messages; ${response.failureCount} failed.`);
        
        // Return details of invalid tokens so they can be cleaned up
        const tokensToRemove = [];
        response.responses.forEach((resp, idx) => {
            if (!resp.success) {
                const errCode = resp.error?.code;
                if (errCode === 'messaging/invalid-registration-token' || errCode === 'messaging/registration-token-not-registered') {
                    tokensToRemove.push(tokens[idx]);
                }
            }
        });

        return {
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount,
            tokensToRemove
        };
    } catch (error) {
        console.error('[FCM Service] Error sending multicast message:', error);
        
        // Fallback to sendMulticast if sendEachForMulticast is not supported (older sdk version)
        try {
            const message = {
                notification: {
                    title: payload.title,
                    body: payload.body,
                },
                data: payload.data || {},
                tokens: tokens
            };
            const response = await admin.messaging().sendMulticast(message);
            console.log(`[FCM Service] Successfully sent ${response.successCount} messages (fallback); ${response.failureCount} failed.`);
            const tokensToRemove = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errCode = resp.error?.code;
                    if (errCode === 'messaging/invalid-registration-token' || errCode === 'messaging/registration-token-not-registered') {
                        tokensToRemove.push(tokens[idx]);
                    }
                }
            });
            return {
                success: true,
                successCount: response.successCount,
                failureCount: response.failureCount,
                tokensToRemove
            };
        } catch (fallbackError) {
            console.error('[FCM Service] Error sending multicast message (fallback):', fallbackError);
            throw fallbackError;
        }
    }
}

module.exports = {
    sendPushNotification
};
