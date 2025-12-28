// TikTalk Configuration
// IMPORTANT: Update SERVER_URL below with your actual Render server URL!

(function() {
    const hostname = window.location.hostname;
    let serverUrl;
    
    // ============================================
    // ⚠️ MANUAL CONFIGURATION - UPDATE THIS! ⚠️
    // ============================================
    // To get your server URL:
    // 1. Go to Render Dashboard: https://dashboard.render.com
    // 2. Click on "TikTalk-Server" service
    // 3. Copy the URL shown at the top (e.g., https://tiktalk-server-abc123.onrender.com)
    // 4. Paste it below (replace the empty string)
    // 
    // Leave empty ('') to use auto-detection (may not work if URLs have different suffixes)
    // ============================================
    const MANUAL_SERVER_URL = ''; // ✅ Paste your Render server URL here
    // Example: 'https://tiktalk-server-abc123.onrender.com'
    // ============================================
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        serverUrl = 'http://localhost:3000';
    }
    // Production - use manual URL or try auto-detect
    else {
        // First, try manual URL if it's been set
        if (MANUAL_SERVER_URL && MANUAL_SERVER_URL.trim() !== '') {
            serverUrl = MANUAL_SERVER_URL.trim();
        }
        // Auto-detect fallback
        else {
            const frontendUrl = window.location.origin;
            
            // Try to auto-detect based on common patterns
            if (frontendUrl.includes('tiktalk-busf')) {
                // Replace tiktalk-busf with tiktalk-server (handles both with and without random suffix)
                serverUrl = frontendUrl.replace(/tiktalk-busf[^.]*/i, 'tiktalk-server');
            } else if (frontendUrl.includes('onrender.com')) {
                // Generic pattern: replace service name with tiktalk-server
                // Extract service name and replace with tiktalk-server
                const match = frontendUrl.match(/https?:\/\/([^.]+)\.onrender\.com/i);
                if (match) {
                    // If it's already tiktalk-server, use it; otherwise try to replace
                    if (match[1].toLowerCase().includes('tiktalk')) {
                        serverUrl = frontendUrl.replace(/[^.]*(?=\.onrender\.com)/i, 'tiktalk-server');
                    } else {
                        serverUrl = frontendUrl.replace(match[1], 'tiktalk-server');
                    }
                } else {
                    serverUrl = 'https://tiktalk-server.onrender.com';
                }
            } else {
                // Final fallback - try common Render server name
                serverUrl = 'https://tiktalk-server.onrender.com';
            }
        }
    }
    
    const CONFIG = {
        // WebSocket Server URL
        WS_SERVER_URL: serverUrl,
        
        // App Settings
        MAX_MESSAGE_LENGTH: 500,
        TYPING_INDICATOR_DELAY: 2000, // ms
        RECONNECTION_ATTEMPTS: 5,
        RECONNECTION_DELAY: 1000, // ms
    };
    
    // Make config available globally
    window.TIKTALK_CONFIG = CONFIG;
    
    // Log for debugging - CHECK BROWSER CONSOLE (F12) TO SEE THIS!
    console.log('🔧 TikTalk Configuration:', {
        frontend: window.location.origin,
        server: serverUrl,
        '⚠️ Is server URL correct?': serverUrl.includes('tiktalk-server') ? '✅ Maybe' : '❌ Probably wrong!',
        config: CONFIG
    });
    
    // Show warning if using auto-detection (might fail if URLs have different suffixes)
    if (!MANUAL_SERVER_URL || MANUAL_SERVER_URL.trim() === '') {
        console.warn('⚠️ WARNING: Using auto-detected server URL.');
        console.warn('   If connection fails, manually set MANUAL_SERVER_URL in config.js');
        console.warn('   Get your URL from: Render Dashboard → TikTalk-Server → Copy URL');
    }
    
    // Test server connection immediately
    console.log('🔍 Testing server connection...');
    fetch(serverUrl.replace(/\/$/, '') + '/health')
        .then(response => response.json())
        .then(data => {
            console.log('✅ Server health check passed:', data);
        })
        .catch(error => {
            console.error('❌ Server health check failed:', error);
            console.error('   Server URL being used:', serverUrl);
            console.error('   💡 TIP: Update MANUAL_SERVER_URL in config.js with your actual Render server URL');
            console.error('   Make sure:');
            console.error('   1. Server is running on Render');
            console.error('   2. FRONTEND_URL is set in backend environment variables');
            console.error('   3. CORS is configured correctly');
        });
})();

