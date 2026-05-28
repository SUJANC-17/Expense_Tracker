const { spawn } = require('child_process');

function startServeo() {
    console.log('\n[Serveo] Starting SSH tunnel to serveo.net...');
    
    // We add ServerAlive options to quickly detect when WiFi drops
    // StrictHostKeyChecking=no prevents it from getting stuck asking (yes/no)
    const ssh = spawn('ssh', [
        '-o', 'ServerAliveInterval=20',
        '-o', 'ServerAliveCountMax=3',
        '-o', 'StrictHostKeyChecking=no',
        '-R', '80:localhost:5000',
        'serveo.net'
    ]);

    ssh.stdout.on('data', (data) => {
        process.stdout.write(`[Serveo]: ${data}`);
    });

    ssh.stderr.on('data', (data) => {
        // Some normal SSH output goes to stderr, so we just print it normally
        process.stdout.write(`[Serveo]: ${data}`);
    });

    ssh.on('close', (code) => {
        console.log(`\n[Serveo] Connection dropped (Code: ${code}). Reconnecting in 3 seconds...`);
        setTimeout(startServeo, 3000); // Automatically restart after 3 seconds
    });
    
    ssh.on('error', (err) => {
        console.log(`\n[Serveo] SSH Error: ${err.message}. Retrying...`);
    });
}

startServeo();
