import './style.css'
import AgoraRTC from 'agora-rtc-sdk-ng'
import { sendMessage, subscribeToMessages, loadMessageHistory, checkMessagesTableExists, supabase } from './supabase.js'

// Set Agora log level to ERROR only (reduces console noise)
AgoraRTC.setLogLevel(3) // 0:DEBUG, 1:INFO, 2:WARNING, 3:ERROR, 4:NONE

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

// Chat variables
let chatSubscription = null
let currentUserName = ""
let isInChannel = false

// Add debug info
// console.log("App ID used:", appId ? "From environment" : "Fallback value");
// console.log("Current base URL: ", window.location.href);

// For testing, return a temporary token - this should be replaced with your own token generation logic
// In production, tokens should be generated on your secure server
function getTemporaryToken(channelName) {
    // console.log("Getting temporary token for channel:", channelName);
    
    // In a real app, you would use a proper token generation mechanism
    // This is just for testing purposes
    // For now, we'll return null which only works if authentication is disabled in Agora Console
    return null;
}

// Initialize the AgoraRTC client
function initializeClient() {
    // console.log("Initializing AgoraRTC client");
    client = AgoraRTC.createClient({ mode: "live", codec: "vp8", role: "host" })
    setupEventListeners()
}

// Handle client events
function setupEventListeners() {
    // console.log("Setting up event listeners");
    
    // Handle when a remote user publishes a track
    client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType)
        // console.log("Subscribed to user:", user.uid, "for", mediaType)
        
        if (mediaType === "video") {
            displayRemoteVideo(user)
        }
        if (mediaType === "audio") {
            user.audioTrack.play()
        }
    })
    
    // Handle when a remote user unpublishes a track
    client.on("user-unpublished", async (user, mediaType) => {
        // console.log("User", user.uid, "has unpublished", mediaType)
        if (mediaType === "video") {
            const remotePlayerContainer = document.getElementById(user.uid)
            remotePlayerContainer && remotePlayerContainer.remove()
        }
    })
    
    // Handle when a user leaves the channel
    client.on("user-left", (user) => {
        // console.log("User", user.uid, "left the channel")
        const remotePlayerContainer = document.getElementById(user.uid)
        remotePlayerContainer && remotePlayerContainer.remove()
    })
    
    // Handle connection state changes
    client.on("connection-state-change", (curState, prevState) => {
        // console.log("Connection state changed from", prevState, "to", curState)
    })
}

// Create and publish local tracks
async function createLocalTracks() {
    // console.log("Creating local tracks");
    try {
        localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack()
        localVideoTrack = await AgoraRTC.createCameraVideoTrack()
        return true
    } catch (error) {
        // console.error("Error creating local tracks:", error)
        alert("Failed to access your camera or microphone. Please check your device permissions.")
        return false
    }
}

// Display local video
function displayLocalVideo() {
    // console.log("Displaying local video");
    const localPlayerContainer = document.createElement("div")
    localPlayerContainer.id = uid
    localPlayerContainer.className = "video-container"
    localPlayerContainer.style.width = "320px"
    localPlayerContainer.style.height = "240px"
    localPlayerContainer.style.marginRight = "10px"
    
    document.getElementById("video-section").append(localPlayerContainer)
    
    localVideoTrack.play(localPlayerContainer)
}

// Display remote video
function displayRemoteVideo(user) {
    // console.log("Displaying remote video for user:", user.uid);
    const remotePlayerContainer = document.createElement("div")
    remotePlayerContainer.id = user.uid
    remotePlayerContainer.className = "video-container"
    remotePlayerContainer.style.width = "320px"
    remotePlayerContainer.style.height = "240px"
    remotePlayerContainer.style.marginRight = "10px"
    
    document.getElementById("video-section").append(remotePlayerContainer)
    
    user.videoTrack.play(remotePlayerContainer)
}

// Join a channel as host
async function joinAsHost() {
    // console.log("Joining as host");
    
    // Initialize the client if not already done
    if (!client) {
        initializeClient()
    }
    
    // Set client role to host
    await client.setClientRole("host")
    
    // Get the stream name from the input field
    const streamNameInput = document.getElementById("stream-name")
    if (streamNameInput && streamNameInput.value) {
        channel = streamNameInput.value
    }
    
    // Get a token for the channel
    tempToken = getTemporaryToken(channel)
    
    try {
        // Join the channel
        await client.join(appId, channel, tempToken, uid)
        console.log("Joined channel:", channel, "as host with UID:", uid)
        isInChannel = true
        
        // Create local tracks
        const tracksCreated = await createLocalTracks()
        if (!tracksCreated) {
            await client.leave()
            isInChannel = false
            return
        }
        
        // Publish local tracks
        await client.publish([localAudioTrack, localVideoTrack])
        console.log("Published local tracks")
        
        // Display local video
        displayLocalVideo()
        
        // Update UI
        document.getElementById("host-join").disabled = true
        document.getElementById("audience-join").disabled = true
        document.getElementById("leave").disabled = false
        
        // Connect to chat
        connectToChat()
    } catch (error) {
        console.error("Error joining channel:", error)
        alert(`Failed to join the channel: ${error.message}`)
    }
}

// Join a channel as audience
async function joinAsAudience() {
    // console.log("Joining as audience");
    
    // Initialize the client if not already done
    if (!client) {
        initializeClient()
    }
    
    // Set client role to audience
    await client.setClientRole("audience")
    
    // Get the stream name from the input field
    const streamNameInput = document.getElementById("stream-name")
    if (streamNameInput && streamNameInput.value) {
        channel = streamNameInput.value
    }
    
    // Get a token for the channel
    tempToken = getTemporaryToken(channel)
    
    try {
        // Join the channel
        await client.join(appId, channel, tempToken, uid)
        // console.log("Joined channel:", channel, "as audience with UID:", uid)
        isInChannel = true
        
        // Update UI
        document.getElementById("host-join").disabled = true
        document.getElementById("audience-join").disabled = true
        document.getElementById("leave").disabled = false
        
        // Connect to chat
        connectToChat()
    } catch (error) {
        // console.error("Error joining channel:", error)
        alert(`Failed to join the channel: ${error.message}`)
    }
}

// Leave the channel
async function leaveChannel() {
    // console.log("Leaving channel");
    
    // Close and dispose local tracks
    if (localAudioTrack) {
        localAudioTrack.close()
        localAudioTrack = null
    }
    if (localVideoTrack) {
        localVideoTrack.close()
        localVideoTrack = null
    }
    
    // Leave the channel
    await client.leave()
    console.log("Left channel")
    isInChannel = false
    
    // Clear the video container
    document.getElementById("video-section").innerHTML = ""
    
    // Update UI
    document.getElementById("host-join").disabled = false
    document.getElementById("audience-join").disabled = false
    document.getElementById("leave").disabled = true
    
    // Disconnect from chat
    disconnectFromChat()
}

// ==================== Chat Functions ====================

// Connect to the chat system
async function connectToChat() {
    if (!isInChannel) {
        console.warn("Cannot connect to chat: Not in a channel");
        return;
    }
    
    console.log("Connecting to chat in channel:", channel);
    
    // Get the user's name
    const userNameInput = document.getElementById("user-name");
    if (userNameInput) {
        currentUserName = userNameInput.value.trim() || `User-${uid.toString().slice(-4)}`;
        userNameInput.value = currentUserName;
    }
    
    try {
        // Check if the messages table exists first
        const tableExists = await checkMessagesTableExists();
        console.log("Messages table exists:", tableExists);
        
        if (!tableExists) {
            // Table doesn't exist, show error
            const chatMessages = document.getElementById("chat-messages");
            if (chatMessages) {
                chatMessages.innerHTML = `
                    <div style="padding: 10px; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; margin-bottom: 10px;">
                        <strong>Chat Connection Issue</strong><br>
                        Could not connect to the chat system. The Supabase table might not exist or there might be a connection issue.
                        <br><br>
                        Check the console for more details.
                    </div>
                `;
            }
            
            // Display system message
            displayChatMessage("System", `You joined the chat in channel "${channel}"`, "system");
            displayChatMessage("System", "Chat functionality is not available. The messages table might not exist.", "system");
            return;
        }
        
        // Ensure we clean up any existing subscription
        if (chatSubscription) {
            console.log("Cleaning up existing subscription");
            chatSubscription.unsubscribe();
            chatSubscription = null;
        }
        
        // Clear previous messages
        const chatMessages = document.getElementById("chat-messages");
        if (chatMessages) {
            chatMessages.innerHTML = "";
        }
        
        // Display system message first
        displayChatMessage("System", `You joined the chat in channel "${channel}"`, "system");
        
        // Table exists, load message history
        const messages = await loadMessageHistory(channel);
        console.log(`Loaded ${messages.length} messages from history`);
        displayChatHistory(messages);
        
        // Subscribe to new messages
        console.log("Setting up new subscription for channel:", channel);
        chatSubscription = subscribeToMessages(channel, (message) => {
            console.log("Message callback triggered:", message);
            
            // Only display messages from others - our own messages are already displayed when sent
            if (message.sender_id !== uid.toString()) {
                displayChatMessage(message.sender_name, message.content, "received");
            }
        });
        
    } catch (error) {
        console.error("Error connecting to chat:", error);
        displayChatMessage("System", "Failed to connect to chat. Check console for details.", "system");
    }
}

// Disconnect from the chat system
function disconnectFromChat() {
    // Unsubscribe from messages
    if (chatSubscription) {
        chatSubscription.unsubscribe()
        chatSubscription = null
    }
    
    // Clear chat messages
    const chatMessages = document.getElementById("chat-messages")
    if (chatMessages) {
        chatMessages.innerHTML = ""
    }
    
    // Display system message
    displayChatMessage("System", "You left the chat", "system")
}

// Send a chat message
async function sendChatMessage() {
    if (!isInChannel) {
        alert("You must join a channel first");
        return;
    }
    
    const messageInput = document.getElementById("chat-message");
    if (!messageInput) return;
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Get user name
    const userNameInput = document.getElementById("user-name");
    currentUserName = userNameInput ? userNameInput.value.trim() || `User-${uid.toString().slice(-4)}` : `User-${uid.toString().slice(-4)}`;
    
    // Clear the input field immediately for better UX
    messageInput.value = "";
    
    // Display the message locally for immediate feedback
    // The subscription should also catch this message and display it formally
    displayChatMessage(currentUserName, message, "sent");
    
    // Send the message to Supabase
    const result = await sendMessage(channel, message, uid.toString(), currentUserName);
    
    if (!result.success) {
        console.error("Failed to send message:", result);
        displayChatMessage("System", "Failed to send message. Please try again.", "system");
    }
}

// Display a chat message in the UI
function displayChatMessage(sender, message, type = "received") {
    const chatMessages = document.getElementById("chat-messages")
    if (!chatMessages) return
    
    const messageElement = document.createElement("div")
    messageElement.className = `message ${type}`
    
    if (type === "system") {
        messageElement.innerHTML = `<strong>🔔 ${message}</strong>`
        messageElement.style.color = "#007bff"
    } else {
        messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`
    }
    
    chatMessages.appendChild(messageElement)
    
    // Scroll to the bottom
    chatMessages.scrollTop = chatMessages.scrollHeight
}

// Display chat history
function displayChatHistory(messages) {
    for (const message of messages) {
        const type = message.sender_id === uid.toString() ? "sent" : "received"
        displayChatMessage(message.sender_name, message.content, type)
    }
}

// Check Supabase connection and configuration
async function checkSupabaseConnection() {
    const chatMessages = document.getElementById("chat-messages")
    if (!chatMessages) return
    
    // Display status message
    chatMessages.innerHTML = `
        <div style="padding: 10px; background-color: #cce5ff; border: 1px solid #b8daff; border-radius: 4px; margin-bottom: 10px;">
            <strong>Checking Supabase connection...</strong>
        </div>
    `
    
    try {
        // Test basic Supabase connection
        const { data, error } = await supabase.from('_dummy_query_').select('*').limit(1).catch(() => ({ error: { message: "Connection failed" } }))
        
        // Check if messages table exists
        const tableExists = await checkMessagesTableExists()
        
        let statusHTML = `
            <div style="padding: 10px; background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; margin-bottom: 10px;">
                <strong>Supabase Connection Status:</strong><br>
                Connection: ${error ? '❌ Failed' : '✅ Success'}<br>
                Messages Table: ${tableExists ? '✅ Exists' : '❌ Not Found'}
            </div>
        `
        
        if (!tableExists) {
            statusHTML += `
                <div style="padding: 10px; background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 4px; margin-bottom: 10px;">
                    <strong>The messages table does not exist in your Supabase project.</strong><br>
                    Please create it using the SQL in the README.md file.
                </div>
            `
        } else {
            statusHTML += `
                <div style="padding: 10px; background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; margin-bottom: 10px;">
                    <strong>If chat messages aren't being received in real-time:</strong><br>
                    Go to your Supabase dashboard → Database → Realtime<br>
                    Make sure the messages table is enabled for realtime updates
                </div>
            `
        }
        
        chatMessages.innerHTML = statusHTML
    } catch (err) {
        chatMessages.innerHTML = `
            <div style="padding: 10px; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; margin-bottom: 10px;">
                <strong>Error checking Supabase:</strong><br>
                ${err.message || 'Unknown error'}
            </div>
        `
    }
}

// Initialize the application
function initializeApp() {
    // console.log("Initializing application");
    
    // Set up button event listeners
    document.getElementById("host-join").addEventListener("click", joinAsHost)
    document.getElementById("audience-join").addEventListener("click", joinAsAudience)
    document.getElementById("leave").addEventListener("click", leaveChannel)
    
    // Set up chat message send button
    const sendButton = document.getElementById("send-message")
    if (sendButton) {
        sendButton.addEventListener("click", sendChatMessage)
    }
    
    // Set up Supabase check button
    const checkSupabaseButton = document.getElementById("check-supabase")
    if (checkSupabaseButton) {
        checkSupabaseButton.addEventListener("click", checkSupabaseConnection)
    }
    
    // Set up chat message input Enter key
    const messageInput = document.getElementById("chat-message")
    if (messageInput) {
        messageInput.addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                event.preventDefault()
                sendChatMessage()
            }
        })
    }
    
    // Disable the leave button initially
    document.getElementById("leave").disabled = true
}

// Wait for the DOM to be fully loaded before initializing
window.onload = initializeApp
