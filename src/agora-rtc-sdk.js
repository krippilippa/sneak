// This file is a wrapper to ensure proper import in production
// Use AgoraRTC from node_modules in development, or from CDN in production
let AgoraRTC;

// Check if we're running on GitHub Pages (look for '/sneak/' in the path)
if (window.location.href.includes('/sneak/') && !window.location.href.includes('localhost')) {
    // We're on GitHub Pages - use CDN
    const script = document.createElement('script');
    script.src = 'https://download.agora.io/sdk/release/AgoraRTC_N-4.23.2.js';
    script.async = false;
    document.head.appendChild(script);
    
    // Wait for script to load
    script.onload = () => {
        console.log('Agora SDK loaded from CDN');
        AgoraRTC = window.AgoraRTC;
    };
} else {
    // We're in development - use npm package
    import('agora-rtc-sdk-ng').then(module => {
        AgoraRTC = module.default;
        console.log('Agora SDK loaded from npm');
    });
}

export default AgoraRTC; 