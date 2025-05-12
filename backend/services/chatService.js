// backend/services/chatService.js
const { db } = require('../config/firebaseAdmin');
const { collection, query, where, getDocs, addDoc, doc, getDoc, orderBy, limit, serverTimestamp, Timestamp, writeBatch } = require('firebase/firestore');
const { sendToUser } = require('../server'); // For WebSocket updates
const userService = require('./user'); // To fetch user details

/**
 * Generates a consistent chat ID for two users.
 * @param {string} userId1
 * @param {string} userId2
 * @returns {string} The chat ID.
 */
function generateChatId(userId1, userId2) {
    return userId1 < userId2 ? `${userId1}_${userId2}` : `${userId2}_${userId1}`;
}

/**
 * Gets an existing chat session or creates a new one if it doesn't exist.
 * @param {string} currentUserId The ID of the user initiating.
 * @param {string} otherUserId The ID of the other participant.
 * @returns {Promise<object>} The chat session object.
 */
async function getOrCreateChatSession(currentUserId, otherUserId) {
    const chatId = generateChatId(currentUserId, otherUserId);
    const chatDocRef = doc(db, 'chats', chatId);

    let chatSnap = await getDoc(chatDocRef);

    if (!chatSnap.exists()) {
        console.log(`[Chat Service] Creating new chat session: ${chatId}`);
        // Fetch user details to store names
        const [currentUserProfile, otherUserProfile] = await Promise.all([
            userService.getUserProfileFromDb(currentUserId),
            userService.getUserProfileFromDb(otherUserId)
        ]);

        const participantNames = {
            [currentUserId]: currentUserProfile?.name || 'User',
            [otherUserId]: otherUserProfile?.name || 'User',
        };
        
        const isZetChatVerified = (currentUserProfile?.isZetChatUser && otherUserProfile?.isZetChatUser) || false; // Example logic

        const newChatData = {
            id: chatId,
            participants: [currentUserId, otherUserId],
            participantNames,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            unreadCounts: { [currentUserId]: 0, [otherUserId]: 0 },
            isZetChatVerified, // Store if both are ZetPay users (conceptual)
        };
        await chatDocRef.set(newChatData);
        chatSnap = await getDoc(chatDocRef); // Re-fetch to get server timestamp
    }
    return { id: chatSnap.id, ...chatSnap.data() };
}

/**
 * Creates a new message in a chat session and broadcasts it.
 * @param {string} chatId The ID of the chat session.
 * @param {string} senderId The ID of the message sender.
 * @param {string} receiverId The ID of the message receiver.
 * @param {object} messageData Content of the message (text, imageUrl, type, etc.).
 * @returns {Promise<object>} The created message object.
 */
async function createMessage(chatId, senderId, receiverId, messageData) {
    const chatDocRef = doc(db, 'chats', chatId);
    const messagesColRef = collection(chatDocRef, 'messages');

    // Fetch sender's name
    const senderProfile = await userService.getUserProfileFromDb(senderId);

    const newMessage = {
        chatId,
        senderId,
        senderName: senderProfile?.name || 'User', // Add sender name
        receiverId,
        ...messageData, // text, imageUrl, type
        timestamp: serverTimestamp(),
        isRead: false,
    };

    const messageDocRef = await addDoc(messagesColRef, newMessage);
    const createdMessageSnap = await getDoc(messageDocRef);
    const createdMessage = { id: createdMessageSnap.id, ...createdMessageSnap.data() };

    // Update chat session's last message and timestamp
    const chatUpdateData = {
        lastMessage: {
            id: createdMessage.id,
            text: createdMessage.text || (createdMessage.type === 'image' ? 'Photo' : 'Message'), // Snippet
            senderId: senderId,
            timestamp: createdMessage.timestamp,
        },
        updatedAt: createdMessage.timestamp,
        // Increment unread count for the receiver
        [`unreadCounts.${receiverId}`]: admin.firestore.FieldValue.increment(1)
    };
    await updateDoc(chatDocRef, chatUpdateData);


    // Broadcast message via WebSocket to the receiver
    // Ensure timestamp is converted to ISO string for WebSocket payload
    const wsPayload = {
        ...createdMessage,
        timestamp: (createdMessage.timestamp as Timestamp).toDate().toISOString(), // Convert to ISO string for WS
    };
    sendToUser(receiverId, { type: 'chat_message', payload: wsPayload });
    console.log(`[Chat Service] Sent WS message for new chat_message to ${receiverId}`);

    return wsPayload; // Return with ISO string date
}

/**
 * Fetches message history for a chat session.
 * @param {string} chatId The ID of the chat session.
 * @param {string} userId The ID of the user requesting history (for permission check).
 * @param {number} count Max number of messages to fetch.
 * @param {Date} [beforeDate] Optional: Fetch messages before this date (for pagination).
 * @returns {Promise<object[]>} Array of message objects.
 */
async function getMessageHistory(chatId, userId, count = 50, beforeDate) {
    const chatDocRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatDocRef);

    if (!chatSnap.exists() || !chatSnap.data().participants.includes(userId)) {
        throw new Error("Chat session not found or permission denied.");
    }

    const messagesColRef = collection(chatDocRef, 'messages');
    let q = query(messagesColRef, orderBy('timestamp', 'desc'));

    if (beforeDate) {
        q = query(q, where('timestamp', '<', Timestamp.fromDate(new Date(beforeDate))));
    }
    q = query(q, limit(count));

    const querySnapshot = await getDocs(q);
    const messages = querySnapshot.docs
        .map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data(),
            timestamp: (docSnap.data().timestamp as Timestamp).toDate().toISOString(), // Convert to ISO string
        }))
        .reverse(); // Reverse to show oldest first (chronological)
    return messages;
}

module.exports = {
    getOrCreateChatSession,
    createMessage,
    getMessageHistory,
};

// Import admin from firebaseAdmin for FieldValue
const admin = require('../config/firebaseAdmin').admin;
