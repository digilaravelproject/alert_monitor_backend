const admin = require('firebase-admin');
const { getMessaging } = require('firebase-admin/messaging');
const path = require('path');
const fs = require('fs');

let fcmInitialized = false;

const serviceAccount = {
  type: "service_account",
  project_id: "panic-alert-monitoring",
  private_key_id: "72dd7145ba24b49fc5b14d0e4ab139df055cf9d4",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC+83i2+6aMqlR7\nYXhhKj6sMEv2ZZgmdna7OMQZpBzMlsJtoKXh7CVrLDb/AHRd+kmJopFby0AnZlqk\nqxMB0dgphIftq14kE041jQ5JVzTcbnRTGNE+QXIAovcqTNkcm7BDsohRu9bgNhDa\npCFn5SDcWfGjAXxWVLLwCXLxL2H8D4c9iEuaf67gJpjcdHvdC6KDuIdOWl4nisPr\n1Sv1kglWU7Ygv4hVzpJyErM53TZ5qJO6TyIOzC5nXTO+6bvGLYXQ/DF2tXdq+/a0\nR2fmj4FxyXr2/inOQpFCjw3ew/MTY2OewjYnzWPetKWiT1uAKs+BEJP5LhilO4LD\n8LhS4AufAgMBAAECggEAKNeHps+9iFG4PymSZ2nzPL4ZyUpimDt3WsUiAH//Hu1S\nCcO2J1PsjvdGjhVJTn6Fsxgf8hvPjX3Rfm4O4zFAhGTR9A5W1O2CKWcRurMZ3doM\nLGfe/WtfGG7C4fvM5lcQhPJPQPgl1hAKW9GGSaQS+r6MNfrP3uE/4qKKwLaLRS+o\nOmL7+B3ggHcpGZgK4tkECK4QmkzdAiu2zX6R4B0s3Y4V0vsPiguHIjMXVuJyLNNL\nd3/T0XZ88F4rbEr6MSA65WTPXoc8PtQ/wIzJFy4GmfUoAoShpkij+tZ9CnnZnB1L\nIrhwGSHoNNbJHosHrwvxHugGIwcQxr/5inMHHGiXxQKBgQDub5mhy12V51S069Rv\nr3IOZ1K84kDgIGWKrNDXPSVPJDpWLfyoVF1Xi1TbYTqTMpXGpf2rdz+Ttt6zaSz1\nFDCF+hjfo2avI2VwZPRuncStHId2DTxNAoX4WKQ2CJ50XP8lo4nrKx0tEHszIsSP\n4AhC/uL7yrN5GVW34GTHoVYVSwKBgQDNBGgWNOWU0MHdDy9+Z8TdH1O25H+O1ELN\nBDjNdk2SO3gIlilPqbl032n/Xhhi/MDQTCIjaItKhvGwa/lrGIuBF7xXghTm+nbD\nleQm6jA888i+vnG7I47Arns7UKo/Ds3QttehepMGGA1hMn9ZfX9B4UeJPdfw5uD0\n6cOPCK0yfQKBgCHsJsNqF4p4OwjydGrfXy7FbHQLDIfWlBvCsoOs4137HYGdUVDx\nj8YgwJXlo1vF2qFEhG6crKLrZYvI7uh/Utf82QUYTkeklY4EDvKd55lpcaxN/cJH\nFaBbnCFD4KdVg8drGPgoTiJXMe/4hlah3QsLEGgaUqZsAFIEztHIFmM5AoGBAMVk\nxML80z9hcAbjpBrU1psAmp2xi499l4PF2NsaWL2/PGcoDUaCZ+m7YldZxakpKoxj\ngUsOUW7EVthCXbdbvpXgwJqQyIdMCCVwoGdHfIJzRolA3EgOiFfEpyoJFKH6Ivgd\n06fKWNy5M8it0ifbyTcpLLNbNBricR3eJUgGVpwRAoGAFxGgFbJus31q6nBF/WL9\nzsH017N9OxbfHG9k1WQolF1ePh3O1kcdne7X8c1z8hqJgkHo+gCtYUxPF4OqjaEQ\nV4M+YMSP/dq0ZX8YBHr4K2k08xtq8mT/Ly2bcBchijTvYZwHtVpXvtHSE0S/mv5V\ncerzYv4LQtMKmwDNz6/OnRA=\n-----END PRIVATE KEY-----\n".replace(/\\n/g, "\n"),
  client_email: "firebase-adminsdk-fbsvc@panic-alert-monitoring.iam.gserviceaccount.com",
  client_id: "109272948743106306587",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40panic-alert-monitoring.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

function initializeFCM() {
    if (fcmInitialized) return true;

    if (admin.getApps().length > 0) {
        fcmInitialized = true;
        return true;
    }

    if (serviceAccount) {
        try {
            admin.initializeApp({
                credential: admin.cert(serviceAccount),
            });
            fcmInitialized = true;
            return true;
        } catch (error) {
            console.error('[FCM Service] Failed to initialize Firebase Admin:', error);
            return false;
        }
    }
    return false;
}

function initializeFCMOld() {
    if (fcmInitialized) return true;

    if (admin.getApps().length > 0) {
        fcmInitialized = true;
        return true;
    }

    try {
        // Option 1: Firebase service account JSON from environment variable (as string)
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            admin.initializeApp({
                credential: admin.cert(serviceAccount)
            });
            fcmInitialized = true;
            console.log('[FCM Service] Firebase Admin initialized from env JSON.');
            return true;
        }

        // Option 2: Path to credentials file from env
        const credentialsPath = process.env.FIREBASE_CREDENTIALS_PATH;
        if (credentialsPath && fs.existsSync(credentialsPath)) {
            admin.initializeApp({
                credential: admin.cert(credentialsPath)
            });
            fcmInitialized = true;
            console.log(`[FCM Service] Firebase Admin initialized from file: ${credentialsPath}`);
            return true;
        }

        // Option 3: Look for a firebase-service-account.json in config directory
        const defaultPath = path.join(__dirname, '..', 'config', 'firebase-service-account.json');
        if (fs.existsSync(defaultPath)) {
            admin.initializeApp({
                credential: admin.cert(defaultPath)
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

        const response = await getMessaging().sendEachForMulticast(message);
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
            const response = await getMessaging().sendMulticast(message);
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
