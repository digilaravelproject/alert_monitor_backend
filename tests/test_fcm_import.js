const admin = require('firebase-admin');
console.log('admin object keys:', Object.keys(admin));
console.log('admin.credential:', admin.credential);
if (admin.credential) {
    console.log('admin.credential.cert:', admin.credential.cert);
}
