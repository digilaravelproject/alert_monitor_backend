const app = require('./app');
const env = require('./config/env');
const { startScheduler } = require('./jobs/pushNotificationJob');

app.listen(env.PORT, () => {
    console.log(`Server Running On Port ${env.PORT}`);
    
    // Start background alert push notification scheduler
    startScheduler(5000); // Check every 5 seconds
});

// Keep event loop active
setInterval(() => {}, 60000);
