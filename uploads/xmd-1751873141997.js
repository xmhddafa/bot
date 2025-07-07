/* ========================================= */
/* === Core DOM Elements === */
/* ========================================= */
const chatInput = document.querySelector('#chat-input');
const sendButton = document.querySelector('#send-button');
const chatContainer = document.querySelector('#chat-container');
const welcomeMessage = document.querySelector('#welcome-message');
const currentChatTitle = document.querySelector('#current-chat-title');
const inputAreaWrapper = document.querySelector('.input-area-wrapper');
const micIcon = document.querySelector('.mic-icon');
const waveformIcon = document.querySelector('.waveform-icon');
const mainContent = document.querySelector('#main-content');

// Sidebar Elements
const sidebar = document.querySelector('#sidebar');
const menuButton = document.querySelector('#menu-btn');
const closeSidebarButton = document.querySelector('#close-sidebar-btn');
const overlay = document.querySelector('#overlay');
const newChatBtn = document.querySelector('#new-chat-btn');
const clearChatBtn = document.querySelector('#clear-chat-btn');
const themeToggleButton = document.querySelector('#theme-toggle-btn');
const attachmentIcon = document.querySelector('.attachment-icon');
const tuneIcon = document.querySelector('.tune-icon');

let userText = '';
let initialInputHeight;

// Inisialisasi Marked.js renderer sekali di awal
const customMarkedRenderer = {
    code(code, lang) {
        const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
        const highlightedCode = hljs.highlight(code, { language: language, ignoreIllegals: true }).value;
        return `
            <div class="code-block-container">
                <div class="code-block-header">
                    <span class="code-block-lang">${language.toUpperCase()}</span>
                    <button class="code-block-copy-btn" title="Salin kode">
                        <span class="material-symbols-rounded">content_copy</span> Salin
                    </button>
                </div>
                <pre><code class="language-${language}">${highlightedCode}</code></pre>
            </div>
        `;
    },
    // Tambahkan custom renderer untuk paragraph agar baris baru tetap dipertahankan
    // Default Marked.js 'breaks: true' sudah seharusnya menangani ini,
    // tapi ini sebagai fallback atau jika ada formatting khusus
    paragraph(text) {
        return `<p>${text}</p>\n`;
    },
    br() {
        return '<br>';
    }
};

// Gunakan renderer kustom
marked.use({ renderer: customMarkedRenderer });
// Atur opsi dasar Marked.js yang berlaku untuk semua parsing
marked.setOptions({
    gfm: true, // Enable GitHub Flavored Markdown
    breaks: true // Convert newlines to <br> tags in paragraphs
});


/* ========================================= */
/* === Utility Functions === */
/* ========================================= */

/**
 * Highlights code blocks within a given container using Highlight.js.
 * This function expects <pre><code> elements to be present.
 * @param {HTMLElement} container - The DOM element to search for code blocks.
 */
function highlightCodeBlocks(container) {
    container.querySelectorAll('pre code').forEach((block) => {
        // Pastikan hanya elemen yang belum di-highlight yang diproses
        if (!block.classList.contains('hljs')) {
            // Coba highlight elemen. Highlight.js akan mendeteksi bahasa secara otomatis
            // atau menggunakan kelas 'language-xyz' jika ada.
            hljs.highlightElement(block);
        }
    });
}

/**
 * Creates a chat bubble element with specified content and type.
 * @param {string} contentHtml - The HTML content for the chat bubble.
 * @param {string} type - The type of chat ('incoming' or 'outgoing').
 * @returns {HTMLElement} The created chat element.
 */
const createChatElement = (contentHtml, type) => {
    const chatElement = document.createElement('div');
    chatElement.classList.add('chat', type);
    chatElement.innerHTML = `
        <div class="chat-content-wrapper">
            ${contentHtml}
        </div>
    `;
    return chatElement;
};

/**
 * Simulates a typing effect for HTML content.
 * This version appends raw text, then replaces with parsed HTML.
 * @param {HTMLElement} element - The DOM element to type into (a temporary span/div).
 * @param {string} rawTextContent - The full raw text content to type character by character.
 * @param {function} callback - Function to call when typing is complete.
 * @param {number} charIndex - The current character index being typed.
 * @param {number} delay - Delay between each character in milliseconds.
 */
const typeWriter = (element, rawTextContent, charIndex, callback, delay = 3) => {
    if (charIndex < rawTextContent.length) {
        const nextChar = rawTextContent.charAt(charIndex);
        element.textContent += nextChar; // Append character as raw text

        // Scroll to bottom after each character for a smoother effect
        chatContainer.scrollTo(0, chatContainer.scrollHeight);

        setTimeout(() => typeWriter(element, rawTextContent, charIndex + 1, callback, delay), delay);
    } else if (callback) {
        callback();
    }
};


/* ========================================= */
/* === Welcome Message Management === */
/* ========================================= */

/** Hides the welcome message with a transition. */
const hideWelcomeMessage = () => {
    if (welcomeMessage && !welcomeMessage.classList.contains('hidden')) {
        welcomeMessage.classList.add('hidden');
    }
};

/** Shows the welcome message with a transition. */
const showWelcomeMessage = () => {
    if (!chatContainer.contains(welcomeMessage)) {
        chatContainer.insertBefore(welcomeMessage, chatContainer.firstChild);
    }
    if (welcomeMessage && welcomeMessage.classList.contains('hidden')) {
        welcomeMessage.classList.remove('hidden');
    }
};

/* ========================================= */
/* === Chat Logic Functions === */
/* ========================================= */

/**
 * Fetches AI response, handles displaying it with typing animation and Markdown parsing.
 * @param {HTMLElement} incomingChatElement - The chat element for the AI response.
 */
const getChatResponse = async (incomingChatElement) => {
    const responseContentWrapper = incomingChatElement.querySelector('.chat-content-wrapper');
    let typingAnimationElement = incomingChatElement.querySelector('.typing-animation');
    let rawApiResponse = ''; // Untuk menyimpan respons mentah dari API

    try {
        hideWelcomeMessage();

        // Call your API
        const response = await fetch("https://api.siputzx.my.id/api/ai/bard", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "query": userText
            })
        });

        if (!response.ok) {
            let errorBodyText = await response.text();
            console.error("API Error Response Body (HTTP non-OK):", errorBodyText); // Log respons error mentah
            throw new Error(
                `HTTP Error: ${response.status} ${response.statusText}. API Response: ${errorBodyText.substring(0, 200)}...`
            );
        }

        const data = await response.json();
        console.log("Raw API Response Data (JSON):", data); // Log seluruh data respons API

        // ====== EKSTRAKSI RESPONS API YANG LEBIH CERDAS ======
        // Prioritas: data.data (string) > data.data (objek dgn teks) > root properties (response/message/text)
        if (data && typeof data.data === 'string' && data.data.trim() !== '') {
            rawApiResponse = data.data;
            console.log("Extracted from data.data (string).");
        } else if (data && typeof data.data === 'object' && data.data !== null) {
            if (typeof data.data.response === 'string' && data.data.response.trim() !== '') {
                rawApiResponse = data.data.response;
                console.log("Extracted from data.data.response (string).");
            } else if (typeof data.data.message === 'string' && data.data.message.trim() !== '') {
                rawApiResponse = data.data.message;
                console.log("Extracted from data.data.message (string).");
            } else if (typeof data.data.text === 'string' && data.data.text.trim() !== '') {
                rawApiResponse = data.data.text;
                console.log("Extracted from data.data.text (string).");
            } else {
                // Jika data.data adalah objek tapi tidak ada properti teks yang diharapkan
                console.warn("data.data is an object but no expected text properties found:", data.data);
                rawApiResponse = `[API Warning: data.data is an unexpected object. Full content: ${JSON.stringify(data.data)}]`;
            }
        } else if (data && (typeof data.response === 'string' || typeof data.message === 'string' || typeof data.text === 'string')) {
            // Coba properti di level root jika data.data tidak ada atau tidak valid
            rawApiResponse = data.response || data.message || data.text;
            console.log("Extracted from root properties (response/message/text).");
        } else {
            // Fallback jika tidak ada struktur yang diharapkan ditemukan
            console.error("No valid text response found in API data. Full data:", data);
            rawApiResponse = `[API Error: No valid text response found in API. Raw data: ${JSON.stringify(data)}]`;
        }

        // VALIDASI AKHIR & KONVERSI KE STRING
        if (typeof rawApiResponse !== 'string') {
            console.error("Final rawApiResponse is not a string, attempting string conversion:", rawApiResponse);
            try {
                rawApiResponse = String(rawApiResponse); // Konversi paksa ke string
            } catch (e) {
                rawApiResponse = "Maaf, terjadi kesalahan tak terduga. Respons AI tidak dalam format teks yang dapat diproses.";
                console.error("Failed to convert rawApiResponse to string:", e);
            }
        }
        console.log("Final rawApiResponse before Marked.js:", rawApiResponse);

        // Remove typing animation
        if (typingAnimationElement) {
            typingAnimationElement.remove();
            typingAnimationElement = null;
        }

        // Buat elemen chat-text untuk menampung hasil parsing Markdown
        const chatTextDiv = document.createElement('div');
        chatTextDiv.classList.add('chat-text');
        responseContentWrapper.appendChild(chatTextDiv);

        // Panggil typeWriter dengan teks mentah (bukan HTML) untuk efek mengetik
        // Setelah selesai mengetik, baru set innerHTML yang sudah di-parse Marked
        typeWriter(chatTextDiv, rawApiResponse, 0, () => {
            const htmlContent = marked.parse(rawApiResponse); // Parse Markdown ke HTML
            chatTextDiv.innerHTML = htmlContent; // Setel konten HTML akhir setelah mengetik
            highlightCodeBlocks(responseContentWrapper); // Highlight blok kode

            // Add action icons below AI response
            const actionIconsHtml = `
                <div class="chat-action-icons">
                    <span class="material-symbols-rounded" title="Suka">thumb_up</span>
                    <span class="material-symbols-rounded" title="Tidak Suka">thumb_down</span>
                    <span class="material-symbols-rounded" title="Ulangi">refresh</span>
                    <span class="material-symbols-rounded copy-chat-btn" data-copy-target="chat-text" title="Salin teks">content_copy</span>
                </div>`;
            responseContentWrapper.insertAdjacentHTML('beforeend', actionIconsHtml);

            localStorage.setItem('all-chats', chatContainer.innerHTML);
            chatContainer.scrollTo(0, chatContainer.scrollHeight);
        });

    } catch (error) {
        console.error("Fetch or API Processing Error (Catch Block):", error);
        if (typingAnimationElement) {
            typingAnimationElement.remove();
        }
        if (responseContentWrapper.querySelector('.chat-text')) {
            responseContentWrapper.querySelector('.chat-text').remove();
        }

        const errorTextDiv = document.createElement('div');
        errorTextDiv.classList.add('chat-text', 'error');
        errorTextDiv.innerHTML =
            `Oops! Sepertinya ada yang salah saat mengambil respons. Silakan coba lagi nanti. <br>Detail Error: ${error.message}`;
        responseContentWrapper.appendChild(errorTextDiv);

        const actionIconsHtml = `
            <div class="chat-action-icons">
                <span class="material-symbols-rounded" title="Coba lagi">refresh</span>
            </div>`;
        responseContentWrapper.insertAdjacentHTML('beforeend', actionIconsHtml);

        localStorage.setItem('all-chats', chatContainer.innerHTML);
        chatContainer.scrollTo(0, chatContainer.scrollHeight);
    }
};

/** Updates the state of the send button (enabled/disabled, and mic/send icon visibility). */
const updateSendButtonState = () => {
    if (chatInput.value.trim().length > 0) {
        sendButton.classList.remove('disabled');
        inputAreaWrapper.classList.add('has-text');
    } else {
        sendButton.classList.add('disabled');
        inputAreaWrapper.classList.remove('has-text');
    }
};

/** Handles sending the user's message, creating chat bubble and triggering AI response. */
const handleOutgoingChat = () => {
    userText = chatInput.value.trim();
    if (!userText) return;

    // Clear input and reset its height
    chatInput.value = '';
    chatInput.style.height = initialInputHeight + 'px';
    chatInput.rows = 1;
    updateSendButtonState();

    hideWelcomeMessage();

    // Untuk pesan keluar, Marked.js hanya perlu GFM dan breaks, tanpa highlight syntax
    // karena ini teks input user, bukan output kode AI.
    const displayUserHtml = marked.parse(userText); // Gunakan Markdown untuk pesan keluar

    const outgoingChat = createChatElement(`<div class="chat-text">${displayUserHtml}</div>`, 'outgoing');
    chatContainer.appendChild(outgoingChat);

    localStorage.setItem('all-chats', chatContainer.innerHTML);
    chatContainer.scrollTo(0, chatContainer.scrollHeight);

    // Add typing animation for incoming response
    const typingHtml = `
        <div class="typing-animation">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>`;
    const incomingChatElement = createChatElement(typingHtml, 'incoming');
    chatContainer.appendChild(incomingChatElement);
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
    getChatResponse(incomingChatElement);
};

/* ========================================= */
/* === Local Storage & Initial Load === */
/* ========================================= */

/** Loads chat history and theme from local storage on page load. */
const loadDataFromLocalstorage = () => {
    // Load theme preference
    const theme = localStorage.getItem('themeColor');
    document.body.classList.toggle('light-mode', theme === 'light_mode');
    themeToggleButton.querySelector('.material-symbols-rounded').innerText =
        document.body.classList.contains('light-mode') ? 'dark_mode' : 'light_mode';

    // Clear existing chat bubbles (if any, from previous partial loads)
    const existingChatBubbles = chatContainer.querySelectorAll('.chat');
    existingChatBubbles.forEach(bubble => bubble.remove());

    // Load chat history
    const allChatsHTML = localStorage.getItem('all-chats');
    if (allChatsHTML && allChatsHTML.trim() !== '') {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = allChatsHTML;

        Array.from(tempDiv.children).forEach(child => {
            if (child.classList.contains('chat')) {
                chatContainer.appendChild(child);
                // Highlight.js akan bekerja jika elemen <pre><code> ada
                highlightCodeBlocks(child);
            }
        });

        if (chatContainer.querySelector('.chat')) {
            hideWelcomeMessage();
        } else {
            showWelcomeMessage();
        }
    } else {
        showWelcomeMessage();
    }
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
};

/* ========================================= */
/* === Event Listeners === */
/* ========================================= */

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    requestAnimationFrame(() => {
        chatInput.style.height = 'auto';
        initialInputHeight = chatInput.scrollHeight;
        chatInput.style.height = initialInputHeight + 'px';
        loadDataFromLocalstorage();
        updateSendButtonState();
    });
});

// Adjust textarea height and update send button state on input
chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
    updateSendButtonState();
});

// Send message on Enter key press (without Shift)
chatInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !sendButton.classList.contains('disabled')) {
        event.preventDefault();
        handleOutgoingChat();
    }
});

// Send message on button click
sendButton.addEventListener('click', () => {
    if (!sendButton.classList.contains('disabled')) {
        handleOutgoingChat();
    }
});

// --- Sidebar Toggles ---
menuButton.addEventListener('click', () => {
    sidebar.classList.add('open');
    overlay.classList.add('show');
    if (window.innerWidth >= 769) {
        mainContent.classList.add('sidebar-open');
    }
});

const closeSidebar = () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
    if (window.innerWidth >= 769) {
        mainContent.classList.remove('sidebar-open');
    }
};

closeSidebarButton.addEventListener('click', closeSidebar);
overlay.addEventListener('click', closeSidebar);

// --- Sidebar Actions ---
newChatBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Mulai obrolan baru? Riwayat obrolan saat ini akan dihapus.')) {
        localStorage.removeItem('all-chats');
        chatInput.value = '';
        chatInput.rows = 1;
        chatInput.style.height = initialInputHeight + 'px';
        updateSendButtonState();

        const existingChatBubbles = chatContainer.querySelectorAll('.chat');
        existingChatBubbles.forEach(bubble => bubble.remove());

        showWelcomeMessage();
        currentChatTitle.textContent = 'Obrolan Baru';
        closeSidebar();
    }
});

clearChatBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Hapus semua riwayat obrolan? Tindakan ini tidak dapat dibatalkan.')) {
        localStorage.removeItem('all-chats');
        chatInput.value = '';
        chatInput.rows = 1;
        chatInput.style.height = initialInputHeight + 'px';
        updateSendButtonState();

        const existingChatBubbles = chatContainer.querySelectorAll('.chat');
        existingChatBubbles.forEach(bubble => bubble.remove());

        showWelcomeMessage();
        currentChatTitle.textContent = 'Obrolan Baru';
        closeSidebar();
    }
});

themeToggleButton.addEventListener('click', (e) => {
    e.preventDefault();
    document.body.classList.toggle('light-mode');
    localStorage.setItem('themeColor', document.body.classList.contains('light-mode') ? 'light_mode' : 'dark_mode');
    themeToggleButton.querySelector('.material-symbols-rounded').innerText =
        document.body.classList.contains('light-mode') ? 'dark_mode' : 'light_mode';
});

// Event delegation for copy buttons (works for dynamically added elements)
chatContainer.addEventListener('click', (event) => {
    // Handle copy code button
    const codeCopyBtn = event.target.closest('.code-block-copy-btn');
    if (codeCopyBtn) {
        const codeElement = codeCopyBtn.closest('.code-block-container')?.querySelector('code');
        if (codeElement) {
            navigator.clipboard.writeText(codeElement.textContent).then(() => {
                // Ganti ikon menjadi 'check' dan kembali setelah 1 detik
                const copyIcon = codeCopyBtn.querySelector('.material-symbols-rounded');
                const originalText = codeCopyBtn.lastChild.textContent.trim();

                copyIcon.textContent = 'check';
                codeCopyBtn.lastChild.textContent = ' Copied!';

                setTimeout(() => {
                    copyIcon.textContent = 'content_copy';
                    codeCopyBtn.lastChild.textContent = ` ${originalText}`;
                }, 1000); // Durasi lebih pendek untuk feedback copy
            }).catch(err => {
                console.error('Failed to copy code: ', err);
            });
        }
    }

    // Handle copy chat text button
    const chatCopyBtn = event.target.closest('.chat-action-icons .material-symbols-rounded[data-copy-target="chat-text"]');
    if (chatCopyBtn) {
        const chatContentWrapper = chatCopyBtn.closest('.chat-content-wrapper');
        let fullTextToCopy = '';

        // Get all text content parts, including simple text and code blocks
        const textElements = chatContentWrapper.querySelectorAll('.chat-text');
        textElements.forEach(el => {
            // Replace <br> with newlines for copy, then get textContent
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = el.innerHTML.replace(/<br\s*\/?>/gi, '\n');
            fullTextToCopy += tempDiv.textContent.trim() + '\n\n';
        });

        // Get text from code blocks explicitly
        const codeBlocks = chatContentWrapper.querySelectorAll('.code-block code');
        codeBlocks.forEach(codeEl => {
            const langMatch = codeEl.className.match(/language-(\w+)/);
            const lang = langMatch ? langMatch[1] : ''; // Get language if available
            fullTextToCopy += '```' + (lang && lang !== 'plaintext' ? lang : '') + '\n' + codeEl.textContent.trim() + '\n```\n\n';
        });

        fullTextToCopy = fullTextToCopy.trim();

        if (fullTextToCopy.length > 0) {
            navigator.clipboard.writeText(fullTextToCopy).then(() => {
                const originalIcon = chatCopyBtn.innerText;
                chatCopyBtn.innerText = 'check';
                setTimeout(() => {
                    chatCopyBtn.innerText = originalIcon;
                }, 1000);
            }).catch(err => {
                console.error('Failed to copy chat text: ', err);
            });
        }
    }
});

// Placeholder alerts for unimplemented features
micIcon.addEventListener('click', () => {
    alert('Fungsionalitas input suara belum diimplementasikan.');
});

waveformIcon.addEventListener('click', () => {
    alert('Fungsionalitas waveform belum diimplementasikan.');
});

attachmentIcon.addEventListener('click', () => {
    alert('Fungsionalitas lampiran gambar belum diimplementasikan.');
});

tuneIcon.addEventListener('click', () => {
    alert('Fungsionalitas pengaturan belum diimplementasikan.');
});