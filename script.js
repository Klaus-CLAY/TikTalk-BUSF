// WebSocket Server Configuration
// Load from config.js or use default
const WS_SERVER_URL = (window.TIKTALK_CONFIG && window.TIKTALK_CONFIG.WS_SERVER_URL) || 'http://localhost:3000';
let socket = null;
let currentRoomId = null;
let typingTimeout = null;

// Application State
const state = {
    isConnected: false,
    isChatting: false,
    currentMatch: null,
    messages: [],
    reactions: {}, // messageId -> {emoji: count}
    blockedUsers: JSON.parse(localStorage.getItem('blockedUsers') || '[]'),
    connectionRetryCount: 0,
    maxRetries: 5,
    retryTimeout: null,
    chatStartTime: null,
    searchQuery: '',
    searchResults: [],
    currentSearchIndex: -1,
    editingMessageId: null,
    unreadCount: 0,
    originalTitle: document.title,
    isTabVisible: true,
    searchDebounceTimer: null,
    isWaitingForMatch: false,
    // Message rate limiting
    messageRateLimit: 10, // messages per minute
    messageTimestamps: [],
    lastMessageTime: 0,
    // Scroll management
    isScrolledUp: false,
    jumpToBottomBtn: null,
    placeholderSuggestions: [
        'Say BU(CAMPUS) if you\'re from Bicol University',
        'Try: "Hi! Which campus are you from?"',
        'Start with: "Hello! Are you a BU student?"',
        'Try: "BU Main Campus here! 🎓"',
        'Say: "Looking to chat with fellow BU students"'
    ],
    currentPlaceholderIndex: 0,
    settings: {
        theme: localStorage.getItem('theme') || 'dark',
        soundEnabled: localStorage.getItem('soundEnabled') !== 'false',
        autoScroll: localStorage.getItem('autoScroll') !== 'false',
        desktopNotifications: localStorage.getItem('desktopNotifications') === 'true',
        fontSize: localStorage.getItem('fontSize') || 'medium',
        contentFilter: localStorage.getItem('contentFilter') !== 'false'
    }
};

// Content Filter Word List
const filteredWords = [
    // Add common inappropriate words here (keeping minimal for example)
    // In production, use a comprehensive list
];

// DOM Elements
const elements = {
    chatMessages: document.getElementById('chatMessages'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    startChatBtn: document.getElementById('startChatBtn'),
    stopBtn: document.getElementById('stopBtn'),
    newMatchBtn: document.getElementById('newMatchBtn'),
    strangerStatus: document.getElementById('strangerStatus'),
    connectionStatus: document.getElementById('connectionStatus'),
    connectionText: document.getElementById('connectionText'),
    typingIndicator: document.getElementById('typingIndicator'),
    charCount: document.getElementById('charCount'),
    settingsModal: document.getElementById('settingsModal'),
    settingsBtn: document.getElementById('settingsBtn'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    themeSelect: document.getElementById('themeSelect'),
    soundToggle: document.getElementById('soundToggle'),
    autoScrollToggle: document.getElementById('autoScrollToggle'),
    desktopNotificationsToggle: document.getElementById('desktopNotificationsToggle'),
    imageBtn: document.getElementById('imageBtn'),
    imageInput: document.getElementById('imageInput'),
    emojiBtn: document.getElementById('emojiBtn'),
    emojiPicker: document.getElementById('emojiPicker'),
    closeEmojiPicker: document.getElementById('closeEmojiPicker'),
    emojiGrid: document.getElementById('emojiGrid'),
    reportBtn: document.getElementById('reportBtn'),
    reportModal: document.getElementById('reportModal'),
    closeReportBtn: document.getElementById('closeReportBtn'),
    reportBtnOption: document.getElementById('reportBtnOption'),
    blockBtnOption: document.getElementById('blockBtnOption'),
    reportForm: document.getElementById('reportForm'),
    reportReason: document.getElementById('reportReason'),
    reportDetails: document.getElementById('reportDetails'),
    cancelReportBtn: document.getElementById('cancelReportBtn'),
    submitReportBtn: document.getElementById('submitReportBtn'),
    toastContainer: document.getElementById('toastContainer'),
    searchBtn: document.getElementById('searchBtn'),
    searchModal: document.getElementById('searchModal'),
    closeSearchBtn: document.getElementById('closeSearchBtn'),
    searchInput: document.getElementById('searchInput'),
    searchResults: document.getElementById('searchResults'),
    searchResultsInfo: document.getElementById('searchResultsInfo'),
    statsBtn: document.getElementById('statsBtn'),
    statsModal: document.getElementById('statsModal'),
    closeStatsBtn: document.getElementById('closeStatsBtn'),
    statsGrid: document.getElementById('statsGrid'),
    exportBtn: document.getElementById('exportBtn'),
    shortcutsModal: document.getElementById('shortcutsModal'),
    showShortcutsBtn: document.getElementById('showShortcutsBtn'),
    closeShortcutsBtn: document.getElementById('closeShortcutsBtn'),
    shortcutsList: document.getElementById('shortcutsList'),
    fontSizeSelect: document.getElementById('fontSizeSelect'),
    contentFilterToggle: document.getElementById('contentFilterToggle'),
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    menuBtn: document.getElementById('menuBtn')
};

// Emoji Data
const emojiCategories = {
    frequent: ['👍', '❤️', '😂', '😊', '🎉', '👋', '🔥', '💯'],
    smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔'],
    gestures: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
    hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️', '🔯', '🕎'],
    objects: ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥅', '🏒', '🏑', '🏏', '🎣', '⛳', '🎯', '🎮', '🎲', '🎳', '🎰', '🎴']
};

// Initialize WebSocket Connection
function initWebSocket() {
    // Wait for Socket.io to load (it's included in HTML)
    if (typeof io === 'undefined') {
        console.warn('Socket.io not loaded. Retrying in 1 second...');
        setTimeout(initWebSocket, 1000);
        return;
    }
    
    connectWebSocket();
}

function connectWebSocket() {
    try {
        socket = io(WS_SERVER_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        // Connection events
        socket.on('connect', () => {
            console.log('Connected to WebSocket server');
            state.isConnected = true;
            updateConnectionStatus(true);
            state.connectionRetryCount = 0;
            showToast('Connected to chat server', 'success');
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
            state.isConnected = false;
            updateConnectionStatus(false);
            if (state.isChatting) {
                showToast('Connection lost. Attempting to reconnect...', 'warning');
            }
        });

        socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
            state.isConnected = false;
            updateConnectionStatus(false);
            showToast('Failed to connect to chat server. Make sure the server is running.', 'error');
        });

        // Match found
        socket.on('matched', (data) => {
            console.log('Match found:', data);
            state.isWaitingForMatch = false;
            currentRoomId = data.roomId;
            state.currentMatch = {
                id: data.partnerId,
                status: 'online'
            };
            updateStrangerStatus(true);
            addSystemMessage('Connected to a stranger. Say hi! 👋');
            playNotificationSound();
        });

        // Waiting for match
        socket.on('waiting', (data) => {
            console.log('Waiting for match:', data);
            state.isWaitingForMatch = true;
            addSystemMessage(data.message || 'Looking for a match...');
        });

        // New message received
        socket.on('new-message', (data) => {
            console.log('New message received:', data);
            const messageId = data.messageId || generateId();
            const message = {
                id: messageId,
                type: 'received',
                text: data.message || '',
                timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
                status: 'read',
                edited: false,
                deleted: false,
                editTimestamp: null,
                image: data.image || null
            };
            
            state.messages.push(message);
            const messageElement = createMessageElement(message, true);
            elements.chatMessages.appendChild(messageElement);
            
            if (state.settings.autoScroll) {
                scrollToBottom();
            }
            
            playNotificationSound();
            showDesktopNotification('New message', data.message || '[Image]');
            
            // Update tab title if tab is not visible
            if (!state.isTabVisible || document.hidden) {
                state.unreadCount++;
                updateTabTitle();
            }
        });

        // Message sent confirmation
        socket.on('message-sent', (data) => {
            console.log('Message sent:', data);
            // Update message status to delivered
            if (data.messageId) {
                updateMessageStatus(data.messageId, 'delivered');
            }
        });

        // Partner typing indicator
        socket.on('partner-typing', (data) => {
            if (data.isTyping) {
                showTypingIndicator();
            } else {
                hideTypingIndicator();
            }
        });

        // Partner disconnected
        socket.on('partner-disconnected', (data) => {
            addSystemMessage('Your partner disconnected. Click "New Match" to find someone else.');
            updateStrangerStatus(false);
            state.currentMatch = null;
            currentRoomId = null;
        });

        // Partner left
        socket.on('partner-left', (data) => {
            addSystemMessage('Your partner left. Looking for a new match...');
            updateStrangerStatus(false);
            state.currentMatch = null;
            currentRoomId = null;
        });

    } catch (error) {
        console.error('WebSocket connection error:', error);
        showToast('Failed to connect to chat server', 'error');
    }
}

// Register Service Worker for PWA
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('Service Worker registered:', registration);
                })
                .catch((error) => {
                    console.log('Service Worker registration failed:', error);
                });
        });
    }
}

// Initialize Application
function init() {
    registerServiceWorker(); // Register PWA service worker
    setupEventListeners();
    loadSettings();
    applyTheme(state.settings.theme);
    updateUI();
    initEmojiPicker();
    requestNotificationPermission();
    initTabVisibility();
    initMobileMenu();
    initWebSocket(); // Initialize WebSocket connection
    
    // Auto-resize textarea
    elements.messageInput.addEventListener('input', autoResizeTextarea);
    elements.messageInput.addEventListener('keydown', handleKeyDown);
    
    // Character counter
    elements.messageInput.addEventListener('input', updateCharCount);
    
    // Typing indicator
    let typingTimer;
    elements.messageInput.addEventListener('input', () => {
        if (!currentRoomId || !socket) return;
        
        // Send typing indicator
        socket.emit('typing', { roomId: currentRoomId });
        
        // Clear previous timeout
        clearTimeout(typingTimer);
        clearTimeout(typingTimeout);
        
        // Stop typing after 2 seconds of inactivity
        typingTimer = setTimeout(() => {
            if (socket && currentRoomId) {
                socket.emit('stop-typing', { roomId: currentRoomId });
            }
        }, 2000);
    });
    
    // Monitor connection
    monitorConnection();
    
    // Initialize title
    state.originalTitle = document.title;
    
    // Handle resize
    handleResize();
    window.addEventListener('resize', handleResize);
    
    // Monitor scroll position for jump to bottom button
    elements.chatMessages.addEventListener('scroll', checkScrollPosition);
    
    // Check scroll position periodically
    setInterval(checkScrollPosition, 500);
}

// Initialize Mobile Menu
function initMobileMenu() {
    if (elements.menuBtn && elements.sidebar && elements.sidebarOverlay) {
        elements.menuBtn.addEventListener('click', toggleMobileMenu);
        elements.sidebarOverlay.addEventListener('click', closeMobileMenu);
        
        // Close sidebar when clicking on links
        const sidebarLinks = elements.sidebar.querySelectorAll('a, button');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    closeMobileMenu();
                }
            });
        });
    }
}

function toggleMobileMenu() {
    if (elements.sidebar && elements.sidebarOverlay) {
        elements.sidebar.classList.toggle('open');
        elements.sidebarOverlay.classList.toggle('active');
    }
}

function closeMobileMenu() {
    if (elements.sidebar && elements.sidebarOverlay) {
        elements.sidebar.classList.remove('open');
        elements.sidebarOverlay.classList.remove('active');
    }
}

function handleResize() {
    const isMobile = window.innerWidth <= 768;
    if (elements.menuBtn) {
        elements.menuBtn.style.display = isMobile ? 'flex' : 'none';
    }
    
    // Close mobile menu on desktop
    if (!isMobile && elements.sidebar) {
        closeMobileMenu();
    }
}

// Initialize Tab Visibility Tracking
function initTabVisibility() {
    // Track when tab becomes visible/hidden
    document.addEventListener('visibilitychange', () => {
        state.isTabVisible = !document.hidden;
        if (state.isTabVisible && state.unreadCount > 0) {
            // Tab is visible, clear unread count
            state.unreadCount = 0;
            updateTabTitle();
        }
    });
}

// Setup Event Listeners
function setupEventListeners() {
    elements.startChatBtn.addEventListener('click', startChatting);
    elements.stopBtn.addEventListener('click', stopChatting);
    elements.newMatchBtn.addEventListener('click', newMatch);
    elements.sendBtn.addEventListener('click', sendMessage);
    
    // Settings Modal
    elements.settingsBtn.addEventListener('click', () => {
        elements.settingsModal.classList.add('show');
    });
    
    elements.closeSettingsBtn.addEventListener('click', () => {
        elements.settingsModal.classList.remove('show');
    });
    
    elements.settingsModal.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) {
            elements.settingsModal.classList.remove('show');
        }
    });
    
    // Settings Controls
    elements.themeSelect.addEventListener('change', (e) => {
        const theme = e.target.value;
        state.settings.theme = theme;
        applyTheme(theme);
        saveSettings();
    });
    
    elements.soundToggle.addEventListener('change', (e) => {
        state.settings.soundEnabled = e.target.checked;
        saveSettings();
    });
    
    elements.autoScrollToggle.addEventListener('change', (e) => {
        state.settings.autoScroll = e.target.checked;
        saveSettings();
    });
    
    elements.desktopNotificationsToggle.addEventListener('change', (e) => {
        state.settings.desktopNotifications = e.target.checked;
        saveSettings();
        if (e.target.checked) {
            requestNotificationPermission();
        }
    });
    
    elements.fontSizeSelect.addEventListener('change', (e) => {
        state.settings.fontSize = e.target.value;
        applyFontSize(e.target.value);
        saveSettings();
    });
    
    elements.contentFilterToggle.addEventListener('change', (e) => {
        state.settings.contentFilter = e.target.checked;
        saveSettings();
        // Re-render messages with new filter setting
        refreshAllMessages();
    });
    
    // Image Upload
    elements.imageBtn.addEventListener('click', () => {
        elements.imageInput.click();
    });
    
    elements.imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageUpload(file);
        }
        // Reset input
        elements.imageInput.value = '';
    });
    
    // Clear All Data button
    const clearDataBtn = document.createElement('button');
    clearDataBtn.className = 'btn-secondary btn-small';
    clearDataBtn.textContent = 'Clear All Data';
    clearDataBtn.style.cssText = 'margin-top: var(--spacing-md); width: 100%;';
    clearDataBtn.addEventListener('click', clearAllData);
    elements.settingsModal.querySelector('.modal-body').appendChild(clearDataBtn);
    
    // Input placeholder rotation
    rotatePlaceholder();
    setInterval(rotatePlaceholder, 5000); // Change every 5 seconds
    
    // Search
    elements.searchBtn.addEventListener('click', () => {
        elements.searchModal.classList.add('show');
        elements.searchInput.focus();
    });
    
    elements.closeSearchBtn.addEventListener('click', () => {
        elements.searchModal.classList.remove('show');
        elements.searchInput.value = '';
        clearSearch();
    });
    
    elements.searchInput.addEventListener('input', (e) => {
        // Debounce search - wait 300ms after user stops typing
        clearTimeout(state.searchDebounceTimer);
        state.searchDebounceTimer = setTimeout(() => {
            performSearch(e.target.value);
        }, 300);
    });
    
    elements.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            elements.searchModal.classList.remove('show');
            clearSearch();
        } else if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            navigateSearchResults(-1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            navigateSearchResults(1);
        }
    });
    
    // Stats
    elements.statsBtn.addEventListener('click', showStats);
    elements.closeStatsBtn.addEventListener('click', () => {
        elements.statsModal.classList.remove('show');
    });
    
    elements.statsModal.addEventListener('click', (e) => {
        if (e.target === elements.statsModal) {
            elements.statsModal.classList.remove('show');
        }
    });
    
    // Export
    elements.exportBtn.addEventListener('click', showExportOptions);
    
    // Shortcuts
    elements.showShortcutsBtn.addEventListener('click', () => {
        elements.shortcutsModal.classList.add('show');
        showKeyboardShortcuts();
    });
    
    elements.closeShortcutsBtn.addEventListener('click', () => {
        elements.shortcutsModal.classList.remove('show');
    });
    
    elements.shortcutsModal.addEventListener('click', (e) => {
        if (e.target === elements.shortcutsModal) {
            elements.shortcutsModal.classList.remove('show');
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                if (state.isChatting) {
                    elements.searchModal.classList.add('show');
                    elements.searchInput.focus();
                }
            }
            if (e.key === 'k' || e.key === 'K') {
                e.preventDefault();
                elements.shortcutsModal.classList.add('show');
                showKeyboardShortcuts();
            }
        }
    });
    
    // Emoji Picker
    elements.emojiBtn.addEventListener('click', toggleEmojiPicker);
    elements.closeEmojiPicker.addEventListener('click', closeEmojiPicker);
    
    // Close emoji picker when clicking outside
    document.addEventListener('click', (e) => {
        if (elements.emojiPicker.style.display !== 'none' && 
            !elements.emojiPicker.contains(e.target) && 
            !elements.emojiBtn.contains(e.target)) {
            closeEmojiPicker();
        }
    });
    
    // Report/Block Modal
    elements.reportBtn.addEventListener('click', () => {
        elements.reportModal.classList.add('show');
    });
    
    elements.closeReportBtn.addEventListener('click', () => {
        elements.reportModal.classList.remove('show');
        resetReportForm();
    });
    
    elements.reportModal.addEventListener('click', (e) => {
        if (e.target === elements.reportModal) {
            elements.reportModal.classList.remove('show');
            resetReportForm();
        }
    });
    
    elements.reportBtnOption.addEventListener('click', () => {
        elements.reportForm.style.display = 'block';
    });
    
    elements.blockBtnOption.addEventListener('click', blockUser);
    elements.submitReportBtn.addEventListener('click', submitReport);
    elements.cancelReportBtn.addEventListener('click', () => {
        resetReportForm();
        elements.reportForm.style.display = 'none';
    });
    
    // Prevent default form submission
    elements.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

// Load Settings from LocalStorage
function loadSettings() {
    elements.themeSelect.value = state.settings.theme;
    elements.soundToggle.checked = state.settings.soundEnabled;
    elements.autoScrollToggle.checked = state.settings.autoScroll;
    elements.desktopNotificationsToggle.checked = state.settings.desktopNotifications;
    elements.fontSizeSelect.value = state.settings.fontSize;
    elements.contentFilterToggle.checked = state.settings.contentFilter !== false;
    applyFontSize(state.settings.fontSize);
}

// Save Settings to LocalStorage
function saveSettings() {
    localStorage.setItem('theme', state.settings.theme);
    localStorage.setItem('soundEnabled', state.settings.soundEnabled);
    localStorage.setItem('autoScroll', state.settings.autoScroll);
    localStorage.setItem('desktopNotifications', state.settings.desktopNotifications);
    localStorage.setItem('fontSize', state.settings.fontSize);
    localStorage.setItem('contentFilter', state.settings.contentFilter);
}

// Apply Font Size
function applyFontSize(size) {
    document.documentElement.setAttribute('data-font-size', size);
}

// Apply Theme
function applyTheme(theme) {
    if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        theme = prefersDark ? 'dark' : 'light';
    }
    
    document.documentElement.setAttribute('data-theme', theme);
    state.settings.theme = theme;
}

// Auto-resize Textarea
function autoResizeTextarea() {
    const textarea = elements.messageInput;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

// Update Character Count
function updateCharCount() {
    const count = elements.messageInput.value.length;
    elements.charCount.textContent = count;
    
    if (count > 450) {
        elements.charCount.style.color = 'var(--accent-warning)';
    } else if (count > 490) {
        elements.charCount.style.color = 'var(--accent-danger)';
    } else {
        elements.charCount.style.color = 'var(--text-muted)';
    }
}

// Handle Keyboard Shortcuts
function handleKeyDown(e) {
    if (e.key === 'Escape') {
        if (elements.settingsModal.classList.contains('show')) {
            elements.settingsModal.classList.remove('show');
        }
    }
}

// Start Chatting
function startChatting() {
    if (state.isChatting) return;
    
    // Check WebSocket connection
    if (!socket || !socket.connected) {
        showToast('Not connected to server. Please wait...', 'warning');
        // Try to reconnect
        if (!socket) {
            initWebSocket();
        } else {
            socket.connect();
        }
        return;
    }
    
    state.isChatting = true;
    state.isWaitingForMatch = true;
    state.chatStartTime = new Date();
    
    // Start chat timer
    startChatTimer();
    
    // Hide welcome screen
    elements.welcomeScreen.style.display = 'none';
    
    // Clear previous messages
    state.messages = [];
    elements.chatMessages.innerHTML = '';
    
    // Add date separator for first message
    const firstDateSeparator = createDateSeparator(new Date());
    elements.chatMessages.appendChild(firstDateSeparator);
    
    // Request match from server
    socket.emit('find-match', {
            id: generateId(),
        campus: null // Optional: Add campus selection later
    });
    
    addSystemMessage('Looking for a match...');
    
    updateUI();
}

// Stop Chatting
function stopChatting() {
    if (!state.isChatting) return;
    
    state.isChatting = false;
    state.isWaitingForMatch = false;
    state.currentMatch = null;
    state.unreadCount = 0;
    currentRoomId = null;
    
    // Stop chat timer
    stopChatTimer();
    
    // Disconnect from current chat (if any)
    if (socket && socket.connected) {
        socket.disconnect();
        // Reconnect for future chats
        setTimeout(() => {
            if (!socket.connected) {
                socket.connect();
            }
        }, 1000);
    }
    
    updateConnectionStatus(false);
    updateStrangerStatus(false);
    hideTypingIndicator();
    updateTabTitle();
    
    // Clear messages
    elements.chatMessages.innerHTML = '';
    elements.welcomeScreen.style.display = 'flex';
    
    updateUI();
}

// New Match
function newMatch() {
    if (!state.isChatting || !socket || !socket.connected) return;
    
    // Clear current messages
    state.messages = [];
    elements.chatMessages.innerHTML = '';
    
    updateStrangerStatus(false);
    hideTypingIndicator();
    currentRoomId = null;
    state.currentMatch = null;
    
    addSystemMessage('Finding a new match...');
    
    // Request new match from server
    socket.emit('new-match');
    state.isWaitingForMatch = true;
}

// Check Message Rate Limit
function checkRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old timestamps (older than 1 minute)
    state.messageTimestamps = state.messageTimestamps.filter(timestamp => timestamp > oneMinuteAgo);
    
    // Check if limit exceeded
    if (state.messageTimestamps.length >= state.messageRateLimit) {
        const timeUntilNext = Math.ceil((state.messageTimestamps[0] + 60000 - now) / 1000);
        showToast(`Rate limit: Please wait ${timeUntilNext} second${timeUntilNext > 1 ? 's' : ''} before sending another message.`, 'warning');
        return false;
    }
    
    // Add current timestamp
    state.messageTimestamps.push(now);
    state.lastMessageTime = now;
    return true;
}

// Send Message
function sendMessage() {
    const message = elements.messageInput.value.trim();
    
    if (!message || !state.isChatting) return;
    
    // Check rate limit
    if (!checkRateLimit()) {
        return;
    }
    
    // Check if we have an active chat room
    if (!currentRoomId || !socket || !socket.connected) {
        showToast('Not connected to a chat. Please wait...', 'warning');
        return;
    }
    
    try {
        const messageId = generateId();
        
        // Create message object first
        const messageObj = {
            id: messageId,
            type: 'sent',
            text: message,
            timestamp: new Date(),
            status: 'sent',
            edited: false,
            deleted: false,
            editTimestamp: null,
            image: null
        };
        
        // Add message to chat (optimistic update)
        state.messages.push(messageObj);
        const messageElement = createMessageElement(messageObj, true);
        elements.chatMessages.appendChild(messageElement);
        
        // Send message via WebSocket
        socket.emit('send-message', {
            roomId: currentRoomId,
            message: message,
            messageId: messageId
        });
        
        // Stop typing indicator
        if (socket && currentRoomId) {
            socket.emit('stop-typing', { roomId: currentRoomId });
        }
        
        // Clear input
        elements.messageInput.value = '';
        elements.messageInput.style.height = 'auto';
        updateCharCount();
        
        // Auto-scroll
        if (state.settings.autoScroll && !state.isScrolledUp) {
            scrollToBottom();
        } else if (state.isScrolledUp) {
            showJumpToBottomButton();
        }
        
        // Simulate delivered status
        setTimeout(() => {
            updateMessageStatus(messageId, 'delivered');
        }, 500);
    } catch (error) {
        console.error('Error sending message:', error);
        showToast('Failed to send message. Please try again.', 'error');
    }
}

// Add Message
function addMessage(type, text, status = 'sent', image = null) {
    const message = {
        id: generateId(),
        type: type,
        text: text || '',
        timestamp: new Date(),
        status: status,
        edited: false,
        deleted: false,
        editTimestamp: null,
        image: image
    };
    
    state.messages.push(message);
    
    const messageElement = createMessageElement(message, true);
    elements.chatMessages.appendChild(messageElement);
    
    if (state.settings.autoScroll) {
        scrollToBottom();
    }
    
    if (type === 'received') {
        playNotificationSound();
        showDesktopNotification('New message', text);
        
        // Update tab title if tab is not visible
        if (!state.isTabVisible || document.hidden) {
            state.unreadCount++;
            updateTabTitle();
        }
        
        // Simulate read receipt after a delay
        setTimeout(() => {
            updateMessageStatus(message.id, 'read');
        }, 2000);
    } else {
        // Simulate delivered status
        if (type === 'sent') {
            setTimeout(() => {
                updateMessageStatus(message.id, 'delivered');
            }, 500);
        }
    }
}

// Add System Message
function addSystemMessage(text) {
    const systemMessage = document.createElement('div');
    systemMessage.className = 'system-message';
    systemMessage.style.cssText = `
        text-align: center;
        padding: var(--spacing-md);
        color: var(--text-muted);
        font-size: 0.875rem;
        font-style: italic;
    `;
    systemMessage.textContent = text;
    elements.chatMessages.appendChild(systemMessage);
    
    if (state.settings.autoScroll) {
        scrollToBottom();
    }
}

// Create Message Element
function createMessageElement(message, isNewMessage = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.type}`;
    messageDiv.setAttribute('data-message-id', message.id);
    
    // Check if we need a date separator
    if (isNewMessage && state.messages.length > 1) {
        const prevMessage = state.messages[state.messages.length - 2];
        if (!isSameDay(prevMessage.timestamp, message.timestamp)) {
            const dateSeparator = createDateSeparator(message.timestamp);
            messageDiv.insertAdjacentElement('beforebegin', dateSeparator);
        }
    }
    
    // Message Actions (Copy, Edit, Delete buttons)
    const actions = document.createElement('div');
    actions.className = 'message-actions';
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'message-action-btn';
    copyBtn.title = 'Copy message';
    copyBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor"/>
        </svg>
    `;
    copyBtn.addEventListener('click', () => copyMessage(message.id));
    
    const reactBtn = document.createElement('button');
    reactBtn.className = 'message-action-btn';
    reactBtn.title = 'Add reaction';
    reactBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
        </svg>
    `;
    reactBtn.addEventListener('click', () => showReactionPicker(message.id));
    
    actions.appendChild(copyBtn);
    actions.appendChild(reactBtn);
    
    // Edit and Delete buttons for sent messages
    if (message.type === 'sent' && !message.deleted) {
        const editBtn = document.createElement('button');
        editBtn.className = 'message-action-btn';
        editBtn.title = 'Edit message';
        editBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.12 5.12L18.87 8.87L20.71 7.04Z" fill="currentColor"/>
            </svg>
        `;
        editBtn.addEventListener('click', () => editMessage(message.id));
        actions.appendChild(editBtn);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'message-action-btn';
        deleteBtn.title = 'Delete message';
        deleteBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z" fill="currentColor"/>
            </svg>
        `;
        deleteBtn.addEventListener('click', () => deleteMessage(message.id));
        actions.appendChild(deleteBtn);
    }
    
    const bubble = document.createElement('div');
    bubble.className = message.editing ? 'message-bubble editing' : 'message-bubble';
    
    if (message.deleted) {
        bubble.textContent = 'This message was deleted';
        bubble.style.fontStyle = 'italic';
        bubble.style.opacity = '0.6';
    } else if (message.editing) {
        const editInput = document.createElement('textarea');
        editInput.className = 'message-edit-input';
        editInput.value = message.text;
        editInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveMessageEdit(message.id, editInput.value);
            } else if (e.key === 'Escape') {
                cancelMessageEdit(message.id);
            }
        });
        bubble.appendChild(editInput);
    } else if (message.image) {
        // Image message
        const imgContainer = document.createElement('div');
        imgContainer.className = 'message-image-container';
        
        const img = document.createElement('img');
        img.src = message.image;
        img.className = 'message-image';
        img.alt = 'Shared image';
        img.loading = 'lazy';
        
        // Image caption if provided
        if (message.text) {
            const caption = document.createElement('div');
            caption.className = 'message-image-caption';
            caption.innerHTML = parseMessageText(message.text);
            imgContainer.appendChild(img);
            imgContainer.appendChild(caption);
        } else {
            imgContainer.appendChild(img);
        }
        
        bubble.appendChild(imgContainer);
    } else {
        // Parse and render message with Markdown and link detection
        bubble.innerHTML = parseMessageText(message.text, true);
        
        // Add markdown preview toggle for sent messages
        if (message.type === 'sent' && !message.deleted && !message.editing) {
            const previewBtn = document.createElement('button');
            previewBtn.className = 'markdown-preview-btn';
            previewBtn.innerHTML = '👁️ Preview';
            previewBtn.style.cssText = `
                position: absolute;
                top: -20px;
                right: 0;
                font-size: 0.7rem;
                padding: 2px 6px;
                background: var(--bg-tertiary);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-sm);
                cursor: pointer;
                color: var(--text-secondary);
            `;
            previewBtn.addEventListener('click', () => {
                showMarkdownPreview(message.text);
            });
            bubble.style.position = 'relative';
            bubble.appendChild(previewBtn);
        }
    }
    
    const footer = document.createElement('div');
    footer.style.cssText = 'display: flex; align-items: center; gap: var(--spacing-xs);';
    
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = formatRelativeTime(message.timestamp);
    time.title = formatFullDateTime(message.timestamp);
    time.setAttribute('data-timestamp', message.timestamp.getTime());
    
    // Status indicator for sent messages
    if (message.type === 'sent' && !message.deleted) {
        const status = document.createElement('div');
        status.className = `message-status ${message.status || 'sent'}`;
        status.innerHTML = `
            <svg class="message-status-icon" viewBox="0 0 24 24" fill="currentColor">
                ${message.status === 'read' 
                    ? '<path d="M18 7L9.91 15.09L6 11.18L7.41 9.77L9.91 12.27L16.59 5.59L18 7Z"/>'
                    : '<path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"/>'}
            </svg>
        `;
        status.setAttribute('data-status', message.status || 'sent');
        footer.appendChild(status);
    }
    
    footer.appendChild(time);
    
    // Edited indicator
    if (message.edited && !message.deleted) {
        const edited = document.createElement('div');
        edited.className = 'message-edited';
        edited.textContent = 'edited';
        footer.appendChild(edited);
    }
    
    // Reactions container
    const reactionsContainer = document.createElement('div');
    reactionsContainer.className = 'message-reactions';
    reactionsContainer.setAttribute('data-message-id', message.id);
    updateReactionsDisplay(message.id, reactionsContainer);
    
    messageDiv.appendChild(actions);
    messageDiv.appendChild(bubble);
    messageDiv.appendChild(footer);
    messageDiv.appendChild(reactionsContainer);
    
    return messageDiv;
}

// Parse message text with Markdown and detect links
function parseMessageText(text, filterContent = false) {
    let processedText = text;
    
    // Content filtering
    if (filterContent && state.settings.contentFilter) {
        processedText = filterInappropriateWords(processedText);
    }
    
    // Escape HTML first to prevent XSS
    processedText = escapeHtml(processedText);
    
    // Markdown formatting
    // Code blocks (```code``` or `code`)
    processedText = processedText.replace(/```([^`]+)```/g, '<pre class="message-code-block"><code>$1</code></pre>');
    processedText = processedText.replace(/`([^`\n]+)`/g, '<code class="message-code">$1</code>');
    
    // Bold (**text** or __text__)
    processedText = processedText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    processedText = processedText.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    
    // Italic (*text* or _text_)
    processedText = processedText.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    processedText = processedText.replace(/_([^_]+)_/g, '<em>$1</em>');
    
    // Strikethrough (~~text~~)
    processedText = processedText.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    
    // Links (https://... or http://...)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    processedText = processedText.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="message-link">$1</a>');
    
    return processedText;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Content Filtering
function filterInappropriateWords(text) {
    if (!filteredWords || filteredWords.length === 0) return text;
    
    let filtered = text;
    filteredWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        filtered = filtered.replace(regex, '*'.repeat(word.length));
    });
    
    return filtered;
}

// Date separator
function createDateSeparator(date) {
    const separator = document.createElement('div');
    separator.className = 'date-separator';
    const text = document.createElement('span');
    text.className = 'date-separator-text';
    text.textContent = formatDate(date);
    separator.appendChild(text);
    return separator;
}

function isSameDay(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

function formatDate(date) {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (isSameDay(d, today)) return 'Today';
    if (isSameDay(d, yesterday)) return 'Yesterday';
    
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

function formatFullDateTime(date) {
    const d = new Date(date);
    return d.toLocaleString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Show Markdown Preview
function showMarkdownPreview(text) {
    const previewModal = document.createElement('div');
    previewModal.className = 'modal show';
    previewModal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>Markdown Preview</h2>
                <button class="btn-close" onclick="this.closest('.modal').remove()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <div style="background: var(--bg-tertiary); padding: var(--spacing-lg); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                    ${parseMessageText(text, false)}
                </div>
                <div style="margin-top: var(--spacing-md); padding: var(--spacing-sm); background: var(--bg-card); border-radius: var(--radius-md); font-size: 0.875rem; color: var(--text-secondary);">
                    <strong>Markdown Tips:</strong><br>
                    <code>**bold**</code> for <strong>bold</strong><br>
                    <code>*italic*</code> for <em>italic</em><br>
                    <code>\`code\`</code> for <code>code</code><br>
                    <code>~~strikethrough~~</code> for <del>strikethrough</del>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(previewModal);
    previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) {
            previewModal.remove();
        }
    });
}

// Note: simulateStrangerResponse is no longer used - messages now come from real users via WebSocket
// This function is kept for reference but not called

// Show Typing Indicator
function showTypingIndicator() {
    elements.typingIndicator.style.display = 'flex';
    if (state.settings.autoScroll) {
        setTimeout(scrollToBottom, 100);
    }
}

// Hide Typing Indicator
function hideTypingIndicator() {
    elements.typingIndicator.style.display = 'none';
}


// Update Connection Status
function updateConnectionStatus(isConnected) {
    if (isConnected) {
        elements.connectionStatus.classList.add('online');
        elements.connectionStatus.classList.remove('offline');
        elements.connectionText.textContent = 'Connected';
    } else {
        elements.connectionStatus.classList.remove('online');
        elements.connectionStatus.classList.add('offline');
        elements.connectionText.textContent = 'Disconnected';
    }
}

// Update Stranger Status
function updateStrangerStatus(isOnline) {
    if (isOnline) {
        elements.strangerStatus.classList.add('online');
        elements.strangerStatus.classList.remove('offline');
    } else {
        elements.strangerStatus.classList.remove('online');
        elements.strangerStatus.classList.add('offline');
    }
}

// Scroll to Bottom
function scrollToBottom() {
    elements.chatMessages.scrollTo({
        top: elements.chatMessages.scrollHeight,
        behavior: 'smooth'
    });
    state.isScrolledUp = false;
    hideJumpToBottomButton();
}

// Check if user is scrolled up
function checkScrollPosition() {
    const messagesContainer = elements.chatMessages;
    const threshold = 200; // pixels from bottom
    const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < threshold;
    
    state.isScrolledUp = !isNearBottom;
    
    if (state.isScrolledUp) {
        showJumpToBottomButton();
    } else {
        hideJumpToBottomButton();
    }
}

// Show Jump to Bottom Button
function showJumpToBottomButton() {
    if (!state.jumpToBottomBtn) {
        state.jumpToBottomBtn = document.createElement('button');
        state.jumpToBottomBtn.className = 'jump-to-bottom-btn';
        state.jumpToBottomBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z" fill="currentColor"/>
            </svg>
            <span>New messages</span>
        `;
        state.jumpToBottomBtn.addEventListener('click', () => {
            scrollToBottom();
        });
        elements.chatMessages.parentElement.style.position = 'relative';
        elements.chatMessages.parentElement.appendChild(state.jumpToBottomBtn);
    }
    state.jumpToBottomBtn.style.display = 'flex';
}

// Hide Jump to Bottom Button
function hideJumpToBottomButton() {
    if (state.jumpToBottomBtn) {
        state.jumpToBottomBtn.style.display = 'none';
    }
}

// Format Time
function formatTime(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
}

// Format Relative Time
function formatRelativeTime(date) {
    const now = new Date();
    const messageDate = new Date(date);
    const diffMs = now - messageDate;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 10) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    // For older messages, show date
    return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Update Relative Times (call periodically)
function updateRelativeTimes() {
    const timeElements = document.querySelectorAll('.message-time[data-timestamp]');
    timeElements.forEach(el => {
        const timestamp = parseInt(el.getAttribute('data-timestamp'));
        if (timestamp) {
            const date = new Date(timestamp);
            el.textContent = formatRelativeTime(date);
        }
    });
}

// Update relative times every minute
setInterval(updateRelativeTimes, 60000);

// Generate ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Play Notification Sound
function playNotificationSound() {
    if (!state.settings.soundEnabled) return;
    
    // Create a simple notification sound using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        // Fallback: do nothing if Web Audio API is not supported
        console.log('Audio notification not supported');
    }
}

// Emoji Picker Functions
function initEmojiPicker() {
    const categoryBtns = elements.emojiPicker.querySelectorAll('.emoji-category-btn');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const category = btn.getAttribute('data-category');
            renderEmojiCategory(category);
        });
    });
    
    // Initialize with frequent emojis
    renderEmojiCategory('frequent');
}

function renderEmojiCategory(category) {
    elements.emojiGrid.innerHTML = '';
    const emojis = emojiCategories[category] || emojiCategories.frequent;
    
    emojis.forEach(emoji => {
        const emojiBtn = document.createElement('button');
        emojiBtn.className = 'emoji-item';
        emojiBtn.textContent = emoji;
        emojiBtn.addEventListener('click', () => {
            insertEmoji(emoji);
            closeEmojiPicker();
        });
        elements.emojiGrid.appendChild(emojiBtn);
    });
}

function toggleEmojiPicker() {
    const isVisible = elements.emojiPicker.style.display !== 'none';
    if (isVisible) {
        closeEmojiPicker();
    } else {
        elements.emojiPicker.style.display = 'flex';
    }
}

function closeEmojiPicker() {
    elements.emojiPicker.style.display = 'none';
}

function insertEmoji(emoji) {
    const input = elements.messageInput;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    input.value = text.substring(0, start) + emoji + text.substring(end);
    input.selectionStart = input.selectionEnd = start + emoji.length;
    input.focus();
    autoResizeTextarea();
    updateCharCount();
}

// Copy Message Function
function copyMessage(messageId) {
    const message = state.messages.find(m => m.id === messageId);
    if (!message) return;
    
    navigator.clipboard.writeText(message.text).then(() => {
        showToast('Message copied to clipboard!', 'success');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = message.text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Message copied to clipboard!', 'success');
    });
}

// Message Reactions Functions
function showReactionPicker(messageId) {
    const quickReactions = ['👍', '❤️', '😂', '😊', '🎉', '🔥'];
    
    // Create temporary reaction picker
    const picker = document.createElement('div');
    picker.className = 'message-reactions-picker';
    picker.style.cssText = `
        position: absolute;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        padding: var(--spacing-xs);
        display: flex;
        gap: var(--spacing-xs);
        box-shadow: var(--shadow-lg);
        z-index: 100;
    `;
    
    quickReactions.forEach(emoji => {
        const btn = document.createElement('button');
        btn.textContent = emoji;
        btn.style.cssText = `
            background: transparent;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            padding: var(--spacing-xs);
            border-radius: var(--radius-md);
            transition: transform 0.2s;
        `;
        btn.addEventListener('click', () => {
            addReaction(messageId, emoji);
            document.body.removeChild(picker);
        });
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.3)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
        });
        picker.appendChild(btn);
    });
    
    const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
    const rect = messageEl.getBoundingClientRect();
    picker.style.top = `${rect.top - 50}px`;
    picker.style.left = `${rect.left}px`;
    
    document.body.appendChild(picker);
    
    setTimeout(() => {
        if (document.body.contains(picker)) {
            document.body.removeChild(picker);
        }
    }, 5000);
}

function addReaction(messageId, emoji) {
    if (!state.reactions[messageId]) {
        state.reactions[messageId] = {};
    }
    if (!state.reactions[messageId][emoji]) {
        state.reactions[messageId][emoji] = 0;
    }
    state.reactions[messageId][emoji]++;
    
    const reactionsContainer = document.querySelector(`.message-reactions[data-message-id="${messageId}"]`);
    if (reactionsContainer) {
        updateReactionsDisplay(messageId, reactionsContainer);
    }
}

function updateReactionsDisplay(messageId, container) {
    container.innerHTML = '';
    const reactions = state.reactions[messageId];
    
    if (reactions) {
        Object.entries(reactions).forEach(([emoji, count]) => {
            if (count > 0) {
                const reaction = document.createElement('div');
                reaction.className = 'reaction';
                reaction.innerHTML = `
                    <span>${emoji}</span>
                    <span class="reaction-count">${count}</span>
                `;
                reaction.addEventListener('click', () => {
                    if (state.reactions[messageId][emoji] > 1) {
                        state.reactions[messageId][emoji]--;
                    } else {
                        delete state.reactions[messageId][emoji];
                    }
                    updateReactionsDisplay(messageId, container);
                });
                container.appendChild(reaction);
            }
        });
    }
    
    // Add reaction button if there are no reactions or few reactions
    if (!reactions || Object.keys(reactions).length < 5) {
        const reactBtn = document.createElement('button');
        reactBtn.className = 'reaction-btn';
        reactBtn.textContent = '+';
        reactBtn.addEventListener('click', () => showReactionPicker(messageId));
        container.appendChild(reactBtn);
    }
}

// Update Message Status
function updateMessageStatus(messageId, status) {
    const message = state.messages.find(m => m.id === messageId);
    if (message) {
        message.status = status;
        const statusEl = document.querySelector(`[data-message-id="${messageId}"] .message-status`);
        if (statusEl) {
            statusEl.className = `message-status ${status}`;
            statusEl.setAttribute('data-status', status);
            statusEl.innerHTML = `
                <svg class="message-status-icon" viewBox="0 0 24 24" fill="currentColor">
                    ${status === 'read' 
                        ? '<path d="M18 7L9.91 15.09L6 11.18L7.41 9.77L9.91 12.27L16.59 5.59L18 7Z"/>'
                        : '<path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"/>'}
                </svg>
            `;
        }
    }
}

// Report/Block Functions
function resetReportForm() {
    elements.reportReason.value = '';
    elements.reportDetails.value = '';
    elements.reportForm.style.display = 'none';
}

function submitReport() {
    const reason = elements.reportReason.value;
    const details = elements.reportDetails.value;
    
    if (!reason) {
        showToast('Please select a reason', 'warning');
        return;
    }
    
    // In a real app, this would send to backend
    console.log('Report submitted:', { reason, details, matchId: state.currentMatch?.id });
    
    showToast('Report submitted successfully. Thank you!', 'success');
    elements.reportModal.classList.remove('show');
    resetReportForm();
    
    // Optionally disconnect
    newMatch();
}

function blockUser() {
    if (!state.currentMatch) return;
    
    // Add to blocked users list
    if (!state.blockedUsers.includes(state.currentMatch.id)) {
        state.blockedUsers.push(state.currentMatch.id);
        localStorage.setItem('blockedUsers', JSON.stringify(state.blockedUsers));
    }
    
    showToast('User blocked successfully', 'success');
    elements.reportModal.classList.remove('show');
    
    // Disconnect and find new match
    newMatch();
}

// Desktop Notifications
function requestNotificationPermission() {
    if (!('Notification' in window)) {
        return;
    }
    
    if (Notification.permission === 'default' && state.settings.desktopNotifications) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showToast('Notifications enabled!', 'success');
            }
        });
    }
}

function showDesktopNotification(title, body) {
    if (!state.settings.desktopNotifications || Notification.permission !== 'granted') {
        return;
    }
    
    if (document.hidden) {
        const notificationOptions = {
            body: body,
            tag: 'tiktalk-message',
            requireInteraction: false
        };
        
        // Try to add icon if available (graceful fallback if not found)
        try {
            notificationOptions.icon = window.location.origin + '/favicon.ico';
            notificationOptions.badge = window.location.origin + '/favicon.ico';
        } catch (e) {
            // Icon is optional, continue without it
        }
        
        new Notification(title, notificationOptions);
    }
}

// Toast Notifications
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ';
    
    toast.innerHTML = `
        <span class="toast-message">${icon} ${message}</span>
        <button class="toast-close">×</button>
    `;
    
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.remove();
    });
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastSlideIn 0.25s ease reverse';
        setTimeout(() => toast.remove(), 250);
    }, duration);
}

// Connection Retry
function monitorConnection() {
    // Simulate connection monitoring
    setInterval(() => {
        if (state.isChatting && !state.isConnected && state.connectionRetryCount < state.maxRetries) {
            showConnectionRetry();
        }
    }, 5000);
}

function showConnectionRetry() {
    // Check if retry banner already exists
    let retryBanner = document.querySelector('.connection-retry');
    if (retryBanner) return;
    
    retryBanner = document.createElement('div');
    retryBanner.className = 'connection-retry';
    retryBanner.innerHTML = `
        <span>Connection lost. Attempting to reconnect...</span>
        <button onclick="retryConnection()">Retry Now</button>
    `;
    
    elements.chatMessages.insertBefore(retryBanner, elements.chatMessages.firstChild);
    
    // Auto retry
    state.retryTimeout = setTimeout(() => {
        retryConnection();
    }, 3000);
}

function retryConnection() {
    if (state.retryTimeout) {
        clearTimeout(state.retryTimeout);
        state.retryTimeout = null;
    }
    
    const retryBanner = document.querySelector('.connection-retry');
    if (retryBanner) {
        retryBanner.remove();
    }
    
    state.connectionRetryCount++;
    
    if (state.connectionRetryCount < state.maxRetries) {
        // Simulate reconnection
        updateConnectionStatus(false);
        setTimeout(() => {
            state.isConnected = true;
            state.connectionRetryCount = 0;
            updateConnectionStatus(true);
            showToast('Reconnected successfully!', 'success');
        }, 1000);
    } else {
        showToast('Failed to reconnect. Please try again.', 'error');
        state.connectionRetryCount = 0;
    }
}

// Make retryConnection globally available
window.retryConnection = retryConnection;

// Update UI to show report button when chatting
function updateUI() {
    elements.startChatBtn.disabled = state.isChatting;
    elements.stopBtn.disabled = !state.isChatting;
    elements.newMatchBtn.disabled = !state.isChatting;
    elements.sendBtn.disabled = !state.isChatting;
    elements.messageInput.disabled = !state.isChatting;
    const isVisible = state.isChatting ? 'flex' : 'none';
    elements.reportBtn.style.display = isVisible;
    elements.searchBtn.style.display = isVisible;
    elements.statsBtn.style.display = isVisible;
    elements.exportBtn.style.display = isVisible;
    
    // Show/hide menu button on mobile
    if (elements.menuBtn) {
        const isMobile = window.innerWidth <= 768;
        elements.menuBtn.style.display = isMobile ? 'flex' : 'none';
    }
    
    if (!state.isChatting) {
        elements.messageInput.placeholder = 'Click "Start Chatting" to begin...';
    } else {
        elements.messageInput.placeholder = 'Type a message...';
        // Only auto-focus on desktop
        if (window.innerWidth > 768) {
            elements.messageInput.focus();
        }
    }
}

// Message Editing & Deletion
function editMessage(messageId) {
    const message = state.messages.find(m => m.id === messageId);
    if (!message || message.type !== 'sent' || message.deleted) return;
    
    // Check if message can still be edited (5 minute limit)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (new Date(message.timestamp) < fiveMinutesAgo) {
        showToast('Messages can only be edited within 5 minutes', 'warning');
        return;
    }
    
    state.editingMessageId = messageId;
    message.editing = true;
    refreshMessage(messageId);
}

function saveMessageEdit(messageId, newText) {
    const message = state.messages.find(m => m.id === messageId);
    if (!message || !newText.trim()) {
        cancelMessageEdit(messageId);
        return;
    }
    
    message.text = newText.trim();
    message.edited = true;
    message.editTimestamp = new Date();
    message.editing = false;
    state.editingMessageId = null;
    
    refreshMessage(messageId);
    showToast('Message edited', 'success');
}

function cancelMessageEdit(messageId) {
    const message = state.messages.find(m => m.id === messageId);
    if (message) {
        message.editing = false;
    }
    state.editingMessageId = null;
    refreshMessage(messageId);
}

function deleteMessage(messageId) {
    const message = state.messages.find(m => m.id === messageId);
    if (!message || message.type !== 'sent' || message.deleted) return;
    
    if (confirm('Are you sure you want to delete this message?')) {
        message.deleted = true;
        refreshMessage(messageId);
        showToast('Message deleted', 'success');
    }
}

function refreshMessage(messageId) {
    const message = state.messages.find(m => m.id === messageId);
    if (!message) return;
    
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
        const newElement = createMessageElement(message);
        messageElement.replaceWith(newElement);
    }
}

// Message Search
function performSearch(query) {
    state.searchQuery = query.toLowerCase().trim();
    
    if (!state.searchQuery) {
        clearSearch();
        return;
    }
    
    state.searchResults = state.messages.filter(m => 
        !m.deleted && m.text.toLowerCase().includes(state.searchQuery)
    );
    
    state.currentSearchIndex = -1;
    displaySearchResults();
    highlightSearchInMessages();
}

function displaySearchResults() {
    elements.searchResults.innerHTML = '';
    
    if (state.searchResults.length === 0) {
        elements.searchResultsInfo.textContent = 'No messages found';
        return;
    }
    
    elements.searchResultsInfo.textContent = 
        `Found ${state.searchResults.length} result${state.searchResults.length > 1 ? 's' : ''}`;
    
    state.searchResults.forEach((message, index) => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        if (index === state.currentSearchIndex) {
            item.classList.add('highlighted');
        }
        
        const text = document.createElement('div');
        text.className = 'search-result-text';
        const highlightedText = message.text.replace(
            new RegExp(`(${escapeRegex(state.searchQuery)})`, 'gi'),
            '<span class="highlight">$1</span>'
        );
        text.innerHTML = highlightedText;
        
        const time = document.createElement('div');
        time.className = 'search-result-time';
        time.textContent = formatFullDateTime(message.timestamp);
        
        item.appendChild(text);
        item.appendChild(time);
        
        item.addEventListener('click', () => {
            scrollToMessage(message.id);
            elements.searchModal.classList.remove('show');
        });
        
        elements.searchResults.appendChild(item);
    });
}

function navigateSearchResults(direction) {
    if (state.searchResults.length === 0) return;
    
    state.currentSearchIndex += direction;
    if (state.currentSearchIndex < 0) {
        state.currentSearchIndex = state.searchResults.length - 1;
    } else if (state.currentSearchIndex >= state.searchResults.length) {
        state.currentSearchIndex = 0;
    }
    
    displaySearchResults();
    const currentMessage = state.searchResults[state.currentSearchIndex];
    if (currentMessage) {
        scrollToMessage(currentMessage.id);
    }
}

function highlightSearchInMessages() {
    const messageElements = document.querySelectorAll('.message-bubble');
    messageElements.forEach(el => {
        const messageId = el.closest('.message').getAttribute('data-message-id');
        const message = state.messages.find(m => m.id === messageId);
        
        if (message && !message.deleted && state.searchQuery) {
            const text = el.textContent;
            if (text.toLowerCase().includes(state.searchQuery)) {
                const highlighted = text.replace(
                    new RegExp(`(${escapeRegex(state.searchQuery)})`, 'gi'),
                    '<mark style="background: var(--accent-warning);">$1</mark>'
                );
                el.innerHTML = parseMessageText(highlighted);
            }
        }
    });
}

function clearSearch() {
    state.searchQuery = '';
    state.searchResults = [];
    state.currentSearchIndex = -1;
    elements.searchResults.innerHTML = '';
    elements.searchResultsInfo.textContent = '';
    
    // Remove highlights
    const messageElements = document.querySelectorAll('.message-bubble');
    messageElements.forEach(el => {
        const messageId = el.closest('.message').getAttribute('data-message-id');
        const message = state.messages.find(m => m.id === messageId);
        if (message && !message.deleted) {
            el.innerHTML = parseMessageText(message.text);
        }
    });
}

function scrollToMessage(messageId) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageElement.style.animation = 'messageSlideIn 0.5s ease';
        setTimeout(() => {
            messageElement.style.animation = '';
        }, 500);
    }
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Chat Statistics
function showStats() {
    const messages = state.messages.filter(m => !m.deleted);
    const sentMessages = messages.filter(m => m.type === 'sent').length;
    const receivedMessages = messages.filter(m => m.type === 'received').length;
    const totalChars = messages.reduce((sum, m) => sum + m.text.length, 0);
    
    const chatDuration = state.chatStartTime 
        ? Math.floor((Date.now() - state.chatStartTime.getTime()) / 1000)
        : 0;
    
    const stats = [
        { label: 'Total Messages', value: messages.length, unit: '' },
        { label: 'Sent', value: sentMessages, unit: '' },
        { label: 'Received', value: receivedMessages, unit: '' },
        { label: 'Characters', value: totalChars, unit: '' },
        { label: 'Chat Duration', value: formatDuration(chatDuration), unit: '' },
        { label: 'Avg Message Length', value: messages.length > 0 ? Math.round(totalChars / messages.length) : 0, unit: ' chars' }
    ];
    
    elements.statsGrid.innerHTML = stats.map(stat => `
        <div class="stat-item">
            <div class="stat-value">${stat.value}${stat.unit}</div>
            <div class="stat-label">${stat.label}</div>
        </div>
    `).join('');
    
    elements.statsModal.classList.add('show');
}

function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes < 60) return `${minutes}m ${secs}s`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

// Export Chat - Multiple Formats
function exportChat(format = 'txt') {
    const messages = state.messages.filter(m => !m.deleted);
    if (messages.length === 0) {
        showToast('No messages to export', 'warning');
        return;
    }
    
    let content = '';
    let filename = '';
    let mimeType = '';
    
    const exportDate = new Date().toISOString().split('T')[0];
    
    switch (format) {
        case 'json':
            const jsonData = {
                exportDate: new Date().toISOString(),
                totalMessages: messages.length,
                messages: messages.map(m => ({
                    id: m.id,
                    type: m.type,
                    text: m.text,
                    timestamp: m.timestamp.toISOString(),
                    edited: m.edited,
                    image: m.image || null
                }))
            };
            content = JSON.stringify(jsonData, null, 2);
            filename = `tiktalk-chat-${exportDate}.json`;
            mimeType = 'application/json';
            break;
            
        case 'csv':
            content = 'Date,Time,Type,Sender,Message,Edited\n';
            messages.forEach(message => {
                const date = new Date(message.timestamp);
                const dateStr = date.toLocaleDateString();
                const timeStr = date.toLocaleTimeString();
                const sender = message.type === 'sent' ? 'You' : 'Stranger';
                const text = (message.text || '').replace(/"/g, '""'); // Escape quotes
                const edited = message.edited ? 'Yes' : 'No';
                content += `"${dateStr}","${timeStr}","${message.type}","${sender}","${text}","${edited}"\n`;
            });
            filename = `tiktalk-chat-${exportDate}.csv`;
            mimeType = 'text/csv';
            break;
            
        case 'html':
            content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TikTalk Chat Export</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; padding: 20px; background: #f5f5f5; }
        .header { background: #4f46e5; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .message { margin: 10px 0; padding: 10px; border-radius: 8px; }
        .sent { background: #e0e7ff; text-align: right; }
        .received { background: white; }
        .time { font-size: 0.8em; color: #666; margin-top: 5px; }
        .edited { font-style: italic; color: #999; }
    </style>
</head>
<body>
    <div class="header">
        <h1>TikTalk Chat Export</h1>
        <p>Exported on: ${new Date().toLocaleString()}</p>
        <p>Total Messages: ${messages.length}</p>
    </div>
`;
            let currentDateHtml = null;
            messages.forEach(message => {
                const messageDate = new Date(message.timestamp);
                const dateStr = messageDate.toLocaleDateString();
                
                if (dateStr !== currentDateHtml) {
                    content += `<h2 style="margin-top: 20px; color: #4f46e5;">${dateStr}</h2>\n`;
                    currentDateHtml = dateStr;
                }
                
                const time = formatTime(message.timestamp);
                const sender = message.type === 'sent' ? 'You' : 'Stranger';
                const edited = message.edited ? '<span class="edited">(edited)</span>' : '';
                content += `<div class="message ${message.type}">
                    <strong>${sender}</strong> ${edited}
                    <div>${escapeHtml(message.text)}</div>
                    <div class="time">${time}</div>
                </div>\n`;
            });
            content += `</body></html>`;
            filename = `tiktalk-chat-${exportDate}.html`;
            mimeType = 'text/html';
            break;
            
        default: // txt
            content = `TikTalk Chat Export\n`;
            content += `Exported on: ${new Date().toLocaleString()}\n`;
            content += `Total Messages: ${messages.length}\n`;
            content += `\n${'='.repeat(50)}\n\n`;
            
            let currentDateTxt = null;
            messages.forEach(message => {
                const messageDate = new Date(message.timestamp);
                const dateStr = messageDate.toLocaleDateString();
                
                if (dateStr !== currentDateTxt) {
                    content += `\n[${dateStr}]\n\n`;
                    currentDateTxt = dateStr;
                }
                
                const time = formatTime(message.timestamp);
                const sender = message.type === 'sent' ? 'You' : 'Stranger';
                const edited = message.edited ? ' (edited)' : '';
                content += `${time} - ${sender}${edited}:\n${message.text}\n\n`;
            });
            filename = `tiktalk-chat-${exportDate}.txt`;
            mimeType = 'text/plain';
    }
    
    try {
        // Download as file
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast(`Chat exported as ${format.toUpperCase()} successfully!`, 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Failed to export chat. Please try again.', 'error');
    }
}

// Show Export Options Modal
function showExportOptions() {
    const exportModal = document.createElement('div');
    exportModal.className = 'modal show';
    exportModal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h2>Export Chat</h2>
                <button class="btn-close" onclick="this.closest('.modal').remove()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <p style="margin-bottom: var(--spacing-lg); color: var(--text-secondary);">Choose export format:</p>
                <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                    <button class="btn-primary" data-format="txt">
                        📄 Export as TXT
                    </button>
                    <button class="btn-primary" data-format="json">
                        📊 Export as JSON
                    </button>
                    <button class="btn-primary" data-format="csv">
                        📈 Export as CSV
                    </button>
                    <button class="btn-primary" data-format="html">
                        🌐 Export as HTML
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners to buttons
    const buttons = exportModal.querySelectorAll('button[data-format]');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const format = btn.getAttribute('data-format');
            exportChat(format);
            exportModal.remove();
        });
    });
    
    document.body.appendChild(exportModal);
    exportModal.addEventListener('click', (e) => {
        if (e.target === exportModal) {
            exportModal.remove();
        }
    });
}

// Make exportChat globally accessible
window.exportChat = exportChat;

// Keyboard Shortcuts
function showKeyboardShortcuts() {
    const shortcuts = [
        { keys: ['Ctrl', 'F'], description: 'Search messages' },
        { keys: ['Ctrl', 'K'], description: 'Show keyboard shortcuts' },
        { keys: ['Enter'], description: 'Send message' },
        { keys: ['Shift', 'Enter'], description: 'New line in message' },
        { keys: ['Esc'], description: 'Close modals' }
    ];
    
    // Add markdown shortcuts section
    const markdownShortcuts = [
        { keys: ['**text**'], description: 'Bold text' },
        { keys: ['*text*'], description: 'Italic text' },
        { keys: ['`code`'], description: 'Inline code' },
        { keys: ['```code```'], description: 'Code block' },
        { keys: ['~~text~~'], description: 'Strikethrough' },
        { keys: ['URL'], description: 'Auto-detected links' }
    ];
    
    let html = '<h3 style="margin-bottom: var(--spacing-md); color: var(--text-primary); font-size: 1rem;">Keyboard Shortcuts</h3>';
    html += shortcuts.map(shortcut => `
        <div class="shortcut-item">
            <span class="shortcut-description">${shortcut.description}</span>
            <div class="shortcut-keys">
                ${shortcut.keys.map(key => `<kbd class="shortcut-key">${key}</kbd>`).join('')}
            </div>
        </div>
    `).join('');
    
    html += '<h3 style="margin-top: var(--spacing-lg); margin-bottom: var(--spacing-md); color: var(--text-primary); font-size: 1rem;">Text Formatting (Markdown)</h3>';
    html += markdownShortcuts.map(shortcut => `
        <div class="shortcut-item">
            <span class="shortcut-description">${shortcut.description}</span>
            <div class="shortcut-keys">
                <kbd class="shortcut-key" style="font-family: monospace;">${shortcut.keys[0]}</kbd>
            </div>
        </div>
    `).join('');
    
    elements.shortcutsList.innerHTML = html;
}

// Chat Timer Functions
function startChatTimer() {
    const timerElement = document.getElementById('chatTimer');
    const timerText = document.getElementById('chatTimerText');
    
    if (!timerElement || !timerText) return;
    
    timerElement.style.display = 'flex';
    
    state.chatTimerInterval = setInterval(() => {
        if (!state.chatStartTime) return;
        
        const now = new Date();
        const diffMs = now - state.chatStartTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);
        
        if (diffMins < 1) {
            timerText.textContent = `${diffSecs} seconds`;
        } else if (diffMins < 60) {
            timerText.textContent = `${diffMins} minute${diffMins > 1 ? 's' : ''} ${diffSecs > 0 ? diffSecs + 's' : ''}`;
        } else {
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            timerText.textContent = `${hours} hour${hours > 1 ? 's' : ''} ${mins > 0 ? mins + 'm' : ''}`;
        }
    }, 1000);
}

function stopChatTimer() {
    const timerElement = document.getElementById('chatTimer');
    if (timerElement) {
        timerElement.style.display = 'none';
    }
    
    if (state.chatTimerInterval) {
        clearInterval(state.chatTimerInterval);
        state.chatTimerInterval = null;
    }
}

// Clear All Data Function
function clearAllData() {
    if (!confirm('Are you sure you want to clear all data? This will:\n\n- Delete all chat history\n- Reset all settings\n- Clear blocked users\n- Remove all saved preferences\n\nThis action cannot be undone.')) {
        return;
    }
    
    // Clear localStorage
    localStorage.clear();
    
    // Reset state
    state.messages = [];
    state.reactions = {};
    state.blockedUsers = [];
    state.settings = {
        theme: 'dark',
        soundEnabled: true,
        autoScroll: true,
        desktopNotifications: false,
        fontSize: 'medium'
    };
    
    // Reload settings
    loadSettings();
    applyTheme('dark');
    applyFontSize('medium');
    
    // Clear UI
    elements.chatMessages.innerHTML = '';
    elements.welcomeScreen.style.display = 'flex';
    
    // Stop chat if active
    if (state.isChatting) {
        stopChatting();
    }
    
    showToast('All data cleared successfully', 'success');
}

// Handle Image Upload
function handleImageUpload(file) {
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        showToast('Image size must be less than 5MB', 'error');
        return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }
    
    // Read file as base64
    const reader = new FileReader();
    reader.onload = (e) => {
        const imageData = e.target.result;
        
        // Add message with image
        const caption = elements.messageInput.value.trim();
        const messageId = generateId();
        
        // Check rate limit
        if (!checkRateLimit()) {
            return;
        }
        
        // Check if we have an active chat room
        if (!currentRoomId || !socket || !socket.connected) {
            showToast('Not connected to a chat. Please wait...', 'warning');
            return;
        }
        
        // Create message object
        const messageObj = {
            id: messageId,
            type: 'sent',
            text: caption || '',
            timestamp: new Date(),
            status: 'sent',
            edited: false,
            deleted: false,
            editTimestamp: null,
            image: imageData
        };
        
        // Add message to chat (optimistic update)
        state.messages.push(messageObj);
        const messageElement = createMessageElement(messageObj, true);
        elements.chatMessages.appendChild(messageElement);
        
        // Send image message via WebSocket
        socket.emit('send-message', {
            roomId: currentRoomId,
            message: caption || '[Image]',
            messageId: messageId,
            image: imageData
        });
        
        // Stop typing indicator
        if (socket && currentRoomId) {
            socket.emit('stop-typing', { roomId: currentRoomId });
        }
        
        // Clear input
        elements.messageInput.value = '';
        elements.messageInput.style.height = 'auto';
        updateCharCount();
        
        // Auto-scroll
        if (state.settings.autoScroll && !state.isScrolledUp) {
            scrollToBottom();
        } else if (state.isScrolledUp) {
            showJumpToBottomButton();
        }
        
        // Simulate delivered status
        setTimeout(() => {
            updateMessageStatus(messageId, 'delivered');
        }, 500);
    };
    
    reader.onerror = () => {
        showToast('Error reading image file', 'error');
    };
    
    reader.readAsDataURL(file);
}

// Refresh All Messages (for content filter toggle)
function refreshAllMessages() {
    if (!state.isChatting) return;
    
    const messageElements = document.querySelectorAll('.message[data-message-id]');
    messageElements.forEach(el => {
        const messageId = el.getAttribute('data-message-id');
        const message = state.messages.find(m => m.id === messageId);
        if (message && !message.deleted && !message.image) {
            const bubble = el.querySelector('.message-bubble');
            if (bubble && !message.editing) {
                bubble.innerHTML = parseMessageText(message.text, true);
            }
        }
    });
}

// Rotate Placeholder Suggestions
function rotatePlaceholder() {
    if (!state.isChatting && elements.messageInput) {
        const placeholder = state.placeholderSuggestions[state.currentPlaceholderIndex];
        elements.messageInput.placeholder = placeholder;
        state.currentPlaceholderIndex = (state.currentPlaceholderIndex + 1) % state.placeholderSuggestions.length;
    }
}

// Listen for theme changes from system
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (state.settings.theme === 'auto') {
        applyTheme('auto');
    }
});

// Update Tab Title with Notification
function updateTabTitle() {
    if (state.unreadCount > 0) {
        document.title = `(${state.unreadCount}) ${state.originalTitle}`;
        // Flash effect - briefly change title to get attention
        if (state.unreadCount === 1) {
            setTimeout(() => {
                const flashTitle = `⚡ ${state.originalTitle}`;
                document.title = flashTitle;
                setTimeout(() => {
                    document.title = `(${state.unreadCount}) ${state.originalTitle}`;
                }, 500);
            }, 200);
        }
    } else {
        document.title = state.originalTitle;
    }
}

// Clear unread count when user focuses tab
window.addEventListener('focus', () => {
    if (state.unreadCount > 0) {
        state.unreadCount = 0;
        updateTabTitle();
    }
});

// Initialize on DOM Load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

