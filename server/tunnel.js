const localtunnel = require('localtunnel');

(async () => {
    try {
        console.log("Starting secure tunnel for the frontend (port 5173)...");
        // We use the localtunnel API directly to bypass the Android CLI crash
        const tunnel = await localtunnel({ 
            port: 5173, 
            subdomain: 'sujan-expenses' // Change this if you want a different URL!
        });

        console.log('\n======================================================');
        console.log(' SUCCESS! Your Expense Tracker is securely online.');
        console.log(' Public URL: ' + tunnel.url);
        console.log('======================================================\n');
        console.log('Keep this terminal open to keep the link active.');

        tunnel.on('close', () => {
            console.log('Tunnel closed by the server.');
        });
        
        tunnel.on('error', (err) => {
            console.error('Tunnel error:', err);
        });
    } catch (err) {
        console.error("Failed to start tunnel:", err.message);
    }
})();
