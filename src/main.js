import './style.css'
import AgoraRTC from 'agora-rtc-sdk-ng'

// RTC client instance
let client = null

// Declare variables for local tracks
let localAudioTrack = null
let localVideoTrack = null

// Connection parameters
let appId = import.meta.env.VITE_AGORA_APP_ID // Use App ID from environment variable
let channel = "test" // Default channel name
// Use a temporary token generated from Agora Console
// This is a temporary solution - in production, you should generate tokens on your server
let tempToken = null // Will be set when joining
let uid = Math.floor(Math.random() * 1000000) // Random user ID for better identification

// Add debug info
console.log("App ID used:", appId ? "From environment" : "Fallback value");
console.log("Current base URL: ", window.location.href);

// For testing, return a temporary token - this should be replaced with your own token generation logic
// In production, tokens should be generated on your secure server
function getTemporaryToken(channelName) {
  // When using this in a real app, replace with a proper token generation mechanism
  // For now, we're returning null to indicate that we're not using token authentication
  console.log("Getting temporary token for channel:", channelName);
  
  // Return null - this will allow connections without token authentication
  // Only works if token authentication is disabled in the Agora Console
  return null;
}

// Initialize the AgoraRTC client
function initializeClient() {
    console.log("Initializing AgoraRTC client");
    client = AgoraRTC.createClient({ mode: "live", codec: "vp8", role: "host" })
    setupEventListeners()
}

// Handle client events
function setupEventListeners() {
    console.log("Setting up event listeners");
    
    // Handle when a remote user publishes a track
    client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType)
        console.log("Subscribed to user:", user.uid, "for", mediaType)
        
        if (mediaType === "video") {
            displayRemoteVideo(user)
        }
        if (mediaType === "audio") {
            user.audioTrack.play()
        }
    })
    
    // Handle when a remote user unpublishes a track
    client.on("user-unpublished", async (user, mediaType) => {
        console.log("User", user.uid, "has unpublished", mediaType)
        if (mediaType === "video") {
            const remotePlayerContainer = document.getElementById(user.uid)
            remotePlayerContainer && remotePlayerContainer.remove()
        }
    })
    
    // Handle when a user leaves the channel
    client.on("user-left", (user) => {
        console.log("User", user.uid, "left the channel")
        const remotePlayerContainer = document.getElementById(user.uid)
        remotePlayerContainer && remotePlayerContainer.remove()
    })
    
    // Handle connection state changes
    client.on("connection-state-change", (curState, prevState) => {
        console.log("Connection state changed from", prevState, "to", curState)
    })
}

// Create and publish local tracks
async function createLocalTracks() {
    console.log("Creating local tracks");
    try {
        localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack()
        localVideoTrack = await AgoraRTC.createCameraVideoTrack()
        return true
    } catch (error) {
        console.error("Error creating local tracks:", error)
        alert("Failed to access your camera or microphone. Please check your device permissions.")
        return false
    }
}

// Display local video
function displayLocalVideo() {
    console.log("Displaying local video");
    const localPlayerContainer = document.createElement("div")
    localPlayerContainer.id = uid
    localPlayerContainer.className = "video-container"
    localPlayerContainer.innerHTML = `<div class="user-info">Local user ${uid}</div>`
    document.body.append(localPlayerContainer)
    localVideoTrack.play(localPlayerContainer)
}

// Join as a host
async function joinAsHost() {
    console.log("Join as host clicked");
    try {
        // Get stream name from input
        const streamNameInput = document.getElementById("stream-name")
        const streamName = streamNameInput.value.trim() || `Stream-${uid}`
        
        // Use stream name as channel name if provided
        channel = streamName
        
        // Get a temporary token for this channel
        const token = getTemporaryToken(channel);
        console.log("Using token:", token);
        
        // Join with token (or null if token authentication is disabled)
        await client.join(appId, channel, token, uid)
        console.log("Successfully joined channel as host");
        
        // A host can both publish tracks and subscribe to tracks
        await client.setClientRole("host")
        
        // Create and publish local tracks
        const tracksCreated = await createLocalTracks()
        if (!tracksCreated) {
            await client.leave()
            enableJoinButtons()
            return
        }
        
        await publishLocalTracks()
        displayLocalVideo()
        disableJoinButtons()
        
        // Update UI to show we're streaming
        updateStreamStatus(`Broadcasting as: ${streamName}`)
        console.log("Host joined and published tracks.")
    } catch (error) {
        console.error("Error joining as host:", error);
        alert(`Failed to join as host: ${error.message || "Unknown error"}`)
        enableJoinButtons()
    }
}

// Join as audience
async function joinAsAudience() {
    console.log("Join as audience clicked");
    try {
        // Get stream name from input (which is used as channel)
        const streamNameInput = document.getElementById("stream-name")
        const streamName = streamNameInput.value.trim()
        
        if (!streamName) {
            alert("Please enter a stream name to join as audience")
            return
        }
        
        // Use stream name as channel
        channel = streamName
        
        // Get a temporary token for this channel
        const token = getTemporaryToken(channel);
        console.log("Using token:", token);
        
        // Join with token (or null if token authentication is disabled)
        await client.join(appId, channel, token, uid)
        console.log("Successfully joined channel as audience");
        
        // Set ultra-low latency level for best experience
        let clientRoleOptions = { level: 2 } // Level 2 is ultra low latency
        
        // Audience can only subscribe to tracks
        await client.setClientRole("audience", clientRoleOptions)
        disableJoinButtons()
        
        // Update UI to show which stream we're watching
        updateStreamStatus(`Watching: ${streamName}`)
        console.log("Audience joined.")
    } catch (error) {
        console.error("Error joining as audience:", error);
        alert(`Failed to join as audience: ${error.message || "Unknown error"}`)
        enableJoinButtons()
    }
}

// Publish local tracks
async function publishLocalTracks() {
    console.log("Publishing local tracks");
    try {
        await client.publish([localAudioTrack, localVideoTrack])
        console.log("Published local tracks successfully")
    } catch (error) {
        console.error("Failed to publish local tracks:", error)
        alert("Failed to publish your streams. Please try again.")
    }
}

// Display remote user's video
function displayRemoteVideo(user) {
    console.log("Displaying remote video for user:", user.uid);
    
    // Check if container already exists
    let remotePlayerContainer = document.getElementById(user.uid.toString())
    
    if (!remotePlayerContainer) {
        remotePlayerContainer = document.createElement("div")
        remotePlayerContainer.id = user.uid.toString()
        remotePlayerContainer.className = "video-container"
        remotePlayerContainer.innerHTML = `<div class="user-info">Remote user ${user.uid}</div>`
        document.body.append(remotePlayerContainer)
    }
    
    user.videoTrack.play(remotePlayerContainer)
}

// Update stream status in the UI
function updateStreamStatus(status) {
    let statusElement = document.getElementById("stream-status")
    
    if (!statusElement) {
        statusElement = document.createElement("div")
        statusElement.id = "stream-status"
        statusElement.className = "stream-status"
        
        // Insert after the stream form
        const streamForm = document.querySelector(".stream-form")
        streamForm.parentNode.insertBefore(statusElement, streamForm.nextSibling)
    }
    
    statusElement.textContent = status
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
        
        // Remove local player container
        const localPlayerContainer = document.getElementById(uid)
        localPlayerContainer && localPlayerContainer.remove()
        
        // Remove remote player containers
        client.remoteUsers.forEach((user) => {
            const playerContainer = document.getElementById(user.uid)
            playerContainer && playerContainer.remove()
        })
        
        // Leave the channel
        await client.leave()
        enableJoinButtons()
        
        // Clear stream status
        updateStreamStatus("")
        
        console.log("Left the channel.")
    } catch (error) {
        console.error("Error leaving channel:", error);
        alert(`Error leaving channel: ${error.message || "Unknown error"}`)
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
