import { createClient } from '@supabase/supabase-js'

// Initialize the Supabase client with environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || ''

// Check if environment variables are available
if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase URL or Key not found in environment variables. Chat functionality will not work.');
    console.warn('Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_KEY');
}

// Create client with explicit options to enable realtime
const supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: {
        enabled: true,
        params: {
            eventsPerSecond: 10
        }
    }
})

/**
 * Send a message to a channel
 * @param {string} channelName The channel to send the message to
 * @param {string} content The message content
 * @param {string} senderId The sender's ID
 * @param {string} senderName The sender's display name
 * @returns {Promise<{success: boolean, data: any}>} Result object with success status and data
 */
export async function sendMessage(channelName, content, senderId, senderName) {
    console.log(`Sending message to channel ${channelName} from ${senderName}:`, content);
    
    try {
        // Prepare the message object
        const message = { 
            channel: channelName, 
            content, 
            sender_id: senderId, 
            sender_name: senderName,
            created_at: new Date().toISOString()
        };
        
        // Insert the message - the realtime subscription should pick this up automatically
        const { data, error } = await supabase
            .from('messages')
            .insert([message])
            .select();
        
        if (error) {
            console.error('Error sending message:', error.message || 'Unknown error');
            return { success: false, error };
        }
        
        console.log('Message sent successfully:', data);
        return { success: true, data: data[0] };
    } catch (err) {
        console.error('Exception when sending message:', err.message || 'Unknown error');
        return { success: false, error: err };
    }
}

// Store active subscriptions
const activeSubscriptions = {};

/**
 * Subscribe to new messages in a channel
 * @param {string} channelName The channel to subscribe to
 * @param {function} onNewMessage Callback function for new messages
 * @returns {object} Subscription object
 */
export function subscribeToMessages(channelName, onNewMessage) {
    console.log(`Subscribing to messages in channel: ${channelName}`);
    
    // Unsubscribe from any existing subscription for this channel
    if (activeSubscriptions[channelName]) {
        console.log(`Removing existing subscription for channel: ${channelName}`);
        activeSubscriptions[channelName].unsubscribe();
        delete activeSubscriptions[channelName];
    }
    
    try {
        // Create a channel with a unique ID for this chat channel
        const channelString = `room:${channelName}`;
        console.log(`Creating Supabase channel: ${channelString}`);
        
        const channel = supabase
            .channel(channelString)
            .on('postgres_changes', 
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `channel=eq.${channelName}`
                }, 
                (payload) => {
                    console.log('Message event received:', payload);
                    if (payload && payload.new) {
                        console.log('New message received via subscription:', payload.new);
                        onNewMessage(payload.new);
                    }
                }
            )
            .subscribe((status) => {
                console.log(`Channel status for ${channelString}:`, status);
                if (status === 'SUBSCRIBED') {
                    console.log(`✅ Successfully subscribed to messages in channel: ${channelName}`);
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    console.error(`❌ Error with subscription for channel: ${channelName}, status: ${status}`);
                    
                    // Try to reconnect after a short delay
                    setTimeout(() => {
                        console.log('Attempting to reconnect subscription...');
                        channel.subscribe();
                    }, 2000);
                }
            });
        
        // Store the subscription
        activeSubscriptions[channelName] = channel;
        
        console.log(`Subscription created for channel ${channelName}:`, channelString);
        return channel;
    } catch (error) {
        console.error('Error creating subscription:', error);
        return null;
    }
}

/**
 * Load message history from a channel
 * @param {string} channelName The channel to load messages from
 * @param {number} limit Maximum number of messages to load
 * @returns {Promise<Array>} Array of messages
 */
export async function loadMessageHistory(channelName, limit = 50) {
    console.log(`Loading message history for channel: ${channelName}`);
    
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('channel', channelName)
            .order('created_at', { ascending: true })
            .limit(limit);
        
        if (error) {
            console.error('Error loading message history:', error.message || 'Unknown error');
            return [];
        }
        
        console.log(`Loaded ${data.length} messages from history`);
        return data;
    } catch (err) {
        console.error('Exception when loading message history:', err.message || 'Unknown error');
        return [];
    }
}

/**
 * Check if the messages table exists in Supabase
 * @returns {Promise<boolean>} Whether the table exists
 */
export async function checkMessagesTableExists() {
    try {
        // Try to get the definition/metadata of the messages table
        const { data, error } = await supabase
            .from('messages')
            .select('id')
            .limit(1);
        
        if (error) {
            console.error('Error checking messages table:', error.message || 'Unknown error');
            return false;
        }
        
        // If we get here without an error, the table exists
        console.log('Messages table exists in Supabase');
        return true;
    } catch (err) {
        console.error('Exception when checking messages table:', err.message || 'Unknown error');
        return false;
    }
}

export { supabase } 