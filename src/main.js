import './style.css'
// Import the Agora SDK without using the alias
import AgoraRTC from './agora-rtc-sdk.js'

// RTC client instance
let client = null

// Declare variables for local tracks
let localAudioTrack = null
let localVideoTrack = null

// Connection parameters
let appId = import.meta.env.VITE_AGORA_APP_ID || "fbb5b55989034029abac412d655d05ae" // Fallback to hardcoded ID for demo
let channel = "test" // Consider making this configurable via UI
let token = null
let uid = 0 // User ID

// Add debug info
console.log("App ID used:", appId ? "From environment" : "Fallback value");
console.log("Current base URL: ", window.location.href);

// Initialize the AgoraRTC client
function initializeClient() {
    console.log("Initializing AgoraRTC client");
    client = AgoraRTC.createClient({ mode: "live", codec: "vp8", role: "host" })
    setupEventListeners()
}

// Handle client events
function setupEventListeners() {
    console.log("Setting up event listeners");
    client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType)
        console.log("subscribe success")
        if (mediaType === "video") {
            displayRemoteVideo(user)
        }
        if (mediaType === "audio") {
            user.audioTrack.play()
        }
    })
    client.on("user-unpublished", async (user) => {
        const remotePlayerContainer = document.getElementById(user.uid)
        remotePlayerContainer && remotePlayerContainer.remove()
    })
}

// Create and publish local tracks
async function createLocalTracks() {
    console.log("Creating local tracks");
    localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack()
    localVideoTrack = await AgoraRTC.createCameraVideoTrack()
}

// Display local video
function displayLocalVideo() {
    console.log("Displaying local video");
    const localPlayerContainer = document.createElement("div")
    localPlayerContainer.id = uid
    localPlayerContainer.textContent = `Local user ${uid}`
    localPlayerContainer.style.width = "640px"
    localPlayerContainer.style.height = "480px"
    document.body.append(localPlayerContainer)
    localVideoTrack.play(localPlayerContainer)
}

// Join as a host
async function joinAsHost() {
    console.log("Join as host clicked");
    try {
        await client.join(appId, channel, token, uid)
        console.log("Successfully joined channel as host");
        // A host can both publish tracks and subscribe to tracks
        client.setClientRole("host")
        // Create and publish local tracks
        await createLocalTracks()
        await publishLocalTracks()
        displayLocalVideo()
        disableJoinButtons()
        console.log("Host joined and published tracks.")
    } catch (error) {
        console.error("Error joining as host:", error);
    }
}

// Join as audience
async function joinAsAudience() {
    console.log("Join as audience clicked");
    try {
        await client.join(appId, channel, token, uid)
        console.log("Successfully joined channel as audience");
        // Set ultra-low latency level
        let clientRoleOptions = { level: 2 }
        // Audience can only subscribe to tracks
        client.setClientRole("audience", clientRoleOptions)
        disableJoinButtons()
        console.log("Audience joined.")
    } catch (error) {
        console.error("Error joining as audience:", error);
    }
}

// Publish local tracks
async function publishLocalTracks() {
    console.log("Publishing local tracks");
    await client.publish([localAudioTrack, localVideoTrack])
}

// Display remote user's video
function displayRemoteVideo(user) {
    console.log("Displaying remote video for user:", user.uid);
    const remotePlayerContainer = document.createElement("div")
    remotePlayerContainer.id = user.uid.toString()
    remotePlayerContainer.textContent = `Remote user ${user.uid}`
    remotePlayerContainer.style.width = "640px"
    remotePlayerContainer.style.height = "480px"
    document.body.append(remotePlayerContainer)
    user.videoTrack.play(remotePlayerContainer)
}

// Leave the channel
async function leaveChannel() {
    console.log("Leave clicked");
    try {
        if (localAudioTrack) {
            localAudioTrack.close()
            localAudioTrack = null
        }
        if (localVideoTrack) {
            localVideoTrack.close()
            localVideoTrack = null
        }
        const localPlayerContainer = document.getElementById(uid)
        localPlayerContainer && localPlayerContainer.remove()
        client.remoteUsers.forEach((user) => {
            const playerContainer = document.getElementById(user.uid)
            playerContainer && playerContainer.remove()
        })
        await client.leave()
        enableJoinButtons()
        console.log("Left the channel.")
    } catch (error) {
        console.error("Error leaving channel:", error);
    }
}

// Disable join buttons
function disableJoinButtons() {
    document.getElementById("host-join").disabled = true
    document.getElementById("audience-join").disabled = true
}

// Enable join buttons
function enableJoinButtons() {
    document.getElementById("host-join").disabled = false
    document.getElementById("audience-join").disabled = false
}

// Set up event listeners for buttons
function setupButtonHandlers() {
    console.log("Setting up button handlers");
    
    const hostButton = document.getElementById("host-join");
    const audienceButton = document.getElementById("audience-join");
    const leaveButton = document.getElementById("leave");
    
    console.log("Host button found:", Boolean(hostButton));
    console.log("Audience button found:", Boolean(audienceButton));
    console.log("Leave button found:", Boolean(leaveButton));
    
    if (hostButton) hostButton.onclick = joinAsHost;
    if (audienceButton) audienceButton.onclick = joinAsAudience;
    if (leaveButton) leaveButton.onclick = leaveChannel;
    
    // Add direct click listeners to debug
    document.addEventListener('click', function(event) {
        if (event.target && event.target.id === 'host-join') {
            console.log('Host button clicked via event listener');
        }
        if (event.target && event.target.id === 'audience-join') {
            console.log('Audience button clicked via event listener');
        }
        if (event.target && event.target.id === 'leave') {
            console.log('Leave button clicked via event listener');
        }
    });
}

// Start live streaming
function startBasicLiveStreaming() {
    console.log("Starting basic live streaming");
    initializeClient();
    
    // Change from window.onload to addEventListener to avoid conflicts
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupButtonHandlers);
    } else {
        setupButtonHandlers();
    }
}

// Call the function to start
startBasicLiveStreaming();
