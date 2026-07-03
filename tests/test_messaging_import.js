try {
    const { getMessaging } = require('firebase-admin/messaging');
    console.log('Successfully imported getMessaging:', typeof getMessaging === 'function');
} catch (e) {
    console.error('Failed to import getMessaging:', e.message);
}
