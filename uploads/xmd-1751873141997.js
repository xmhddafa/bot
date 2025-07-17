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
let isTyping = false; // Flag untuk melacak apakah AI sedang mengetik

/* ========================================= */
/* === Marked.js Configuration & Renderer === */
/* ========================================= */
// Konfigurasi Marked.js untuk parsing Markdown ke HTML
marked.setOptions({
    gfm: true,     // Aktifkan GitHub Flavored Markdown
    breaks: true   // Konversi baris baru menjadi tag <br> dalam paragraf
});

// Custom renderer untuk Marked.js agar mendukung highlight kode dan tombol salin
const customMarkedRenderer = new marked.Renderer();

// Override renderer untuk blok kode (```code```)
customMarkedRenderer.code = (code, lang) => {
    const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
    // Highlight kode segera setelah di-render oleh Marked.js
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
};

// Override renderer untuk paragraf untuk memastikan baris baru tetap dipertahankan
customMarkedRenderer.paragraph = (text) => `<p>${text}</p>\n`;

// Override renderer untuk break line
customMarkedRenderer.br = () => '<br>';

// Terapkan custom renderer ke Marked.js
marked.use({ renderer: customMarkedRenderer });


/* ========================================= */
/* === Utility Functions === */
/* ========================================= */

/**
 * Membuat elemen gelembung obrolan dengan konten dan tipe tertentu.
 * @param {string} contentHtml - Konten HTML untuk gelembung obrolan.
 * @param {string} type - Tipe obrolan ('incoming' atau 'outgoing').
 * @returns {HTMLElement} Elemen obrolan yang dibuat.
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
 * Mensimulasikan efek mengetik karakter per karakter untuk konten teks.
 * Setelah selesai, konten elemen akan diganti dengan HTML yang sudah di-parse.
 * @param {HTMLElement} element - Elemen DOM tempat teks akan diketik.
 * @param {string} rawTextContent - Konten teks mentah yang akan diketik.
 * @param {string} finalHtmlContent - Konten HTML akhir setelah parsing Markdown.
 * @param {function} callback - Fungsi yang akan dipanggil setelah pengetikan selesai.
 * @param {number} charIndex - Indeks karakter saat ini.
 * @param {number} delay - Penundaan antara setiap karakter dalam milidetik.
 */
const typeWriter = (element, rawTextContent, finalHtmlContent, callback, charIndex = 0, delay = 3) => {
    if (charIndex < rawTextContent.length) {
        element.textContent += rawTextContent.charAt(charIndex); // Tambahkan karakter mentah
        chatContainer.scrollTo(0, chatContainer.scrollHeight); // Gulir ke bawah

        setTimeout(() => {
            typeWriter(element, rawTextContent, finalHtmlContent, callback, charIndex + 1, delay);
        }, delay);
    } else {
        // Setelah semua karakter mentah diketik, ganti dengan HTML yang sudah di-parse Marked.js
        element.innerHTML = finalHtmlContent;
        callback(); // Panggil callback setelah selesai
    }
};

/**
 * Menampilkan pesan selamat datang.
 */
const showWelcomeMessage = () => {
    if (!chatContainer.contains(welcomeMessage)) {
        chatContainer.insertBefore(welcomeMessage, chatContainer.firstChild);
    }
    if (welcomeMessage.classList.contains('hidden')) {
        welcomeMessage.classList.remove('hidden');
    }
};

/**
 * Menyembunyikan pesan selamat datang.
 */
const hideWelcomeMessage = () => {
    if (welcomeMessage && !welcomeMessage.classList.contains('hidden')) {
        welcomeMessage.classList.add('hidden');
    }
};

/* ========================================= */
/* === Chat Logic Functions === */
/* ========================================= */

/**
 * Mengambil respons AI, menangani tampilan dengan animasi mengetik,
 * parsing Markdown, dan highlighting kode.
 * @param {HTMLElement} incomingChatElement - Elemen chat untuk respons AI.
 */
const getChatResponse = async (incomingChatElement) => {
    const responseContentWrapper = incomingChatElement.querySelector('.chat-content-wrapper');
    let typingAnimationElement = incomingChatElement.querySelector('.typing-animation');
    let rawApiResponse = '';
    isTyping = true; // Set flag AI sedang mengetik

    try {
        hideWelcomeMessage();

        const response = await fetch("https://api.siputzx.my.id/api/ai/bard", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ "query": userText })
        });

        if (!response.ok) {
            const errorBodyText = await response.text();
            console.error("API Error Response (HTTP non-OK):", errorBodyText);
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}. Response: ${errorBodyText.substring(0, 200)}...`);
        }

        const data = await response.json();
        console.log("Raw API Response Data:", data);

        // Ekstraksi respons AI yang lebih cerdas
        if (data && typeof data.data === 'string' && data.data.trim() !== '') {
            rawApiResponse = data.data;
        } else if (data && typeof data.data === 'object' && data.data !== null) {
            rawApiResponse = data.data.response || data.data.message || data.data.text || JSON.stringify(data.data);
        } else if (data && (typeof data.response === 'string' || typeof data.message === 'string' || typeof data.text === 'string')) {
            rawApiResponse = data.response || data.message || data.text;
        } else {
            console.warn("No valid text response found in API data. Full data:", data);
            rawApiResponse = `[API Error: No valid text response found. Raw data: ${JSON.stringify(data)}]`;
        }

        // Pastikan rawApiResponse adalah string
        rawApiResponse = String(rawApiResponse);
        console.log("Final rawApiResponse before Marked.js processing:", rawApiResponse);

        // Hapus animasi mengetik setelah mendapatkan respons
        if (typingAnimationElement) {
            typingAnimationElement.remove();
            typingAnimationElement = null;
        }

        // Buat elemen untuk menampung teks respons (sebelum parsing final)
        const chatTextDiv = document.createElement('div');
        chatTextDiv.classList.add('chat-text');
        responseContentWrapper.appendChild(chatTextDiv);

        // Parsing Marked.js untuk mendapatkan HTML akhir
        const finalHtmlContent = marked.parse(rawApiResponse);

        // Panggil typeWriter untuk efek mengetik dan setel konten akhir
        typeWriter(chatTextDiv, rawApiResponse, finalHtmlContent, () => {
            // Setelah pengetikan dan rendering HTML selesai, tambahkan ikon aksi
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
            isTyping = false; // AI selesai mengetik
        });

    } catch (error) {
        console.error("Error fetching or processing AI response:", error);
        if (typingAnimationElement) {
            typingAnimationElement.remove();
        }
        // Hapus elemen chat-text yang mungkin sudah dibuat tapi kosong/error
        if (responseContentWrapper.querySelector('.chat-text')) {
            responseContentWrapper.querySelector('.chat-text').remove();
        }

        const errorTextDiv = document.createElement('div');
        errorTextDiv.classList.add('chat-text', 'error');
        errorTextDiv.innerHTML = `Oops! Terjadi kesalahan saat mengambil respons. Silakan coba lagi. <br>Detail: ${error.message}`;
        responseContentWrapper.appendChild(errorTextDiv);

        const actionIconsHtml = `
            <div class="chat-action-icons">
                <span class="material-symbols-rounded" title="Coba lagi">refresh</span>
            </div>`;
        responseContentWrapper.insertAdjacentHTML('beforeend', actionIconsHtml);

        localStorage.setItem('all-chats', chatContainer.innerHTML);
        chatContainer.scrollTo(0, chatContainer.scrollHeight);
        isTyping = false; // AI selesai (dengan error)
    }
};

/**
 * Memperbarui status tombol kirim (enabled/disabled) dan visibilitas ikon.
 */
const updateSendButtonState = () => {
    if (chatInput.value.trim().length > 0) {
        sendButton.classList.remove('disabled');
        inputAreaWrapper.classList.add('has-text');
    } else {
        sendButton.classList.add('disabled');
        inputAreaWrapper.classList.remove('has-text');
    }
};

/**
 * Menangani pengiriman pesan pengguna, membuat gelembung obrolan,
 * dan memicu respons AI.
 */
const handleOutgoingChat = () => {
    userText = chatInput.value.trim();
    if (!userText || isTyping) return; // Jangan kirim jika kosong atau AI sedang mengetik

    // Bersihkan input dan reset tingginya
    chatInput.value = '';
    chatInput.style.height = initialInputHeight + 'px';
    chatInput.rows = 1;
    updateSendButtonState();

    hideWelcomeMessage();

    // Parse Markdown untuk pesan keluar juga (jika pengguna mengetik Markdown)
    const displayUserHtml = marked.parse(userText);
    const outgoingChat = createChatElement(`<div class="chat-text">${displayUserHtml}</div>`, 'outgoing');
    chatContainer.appendChild(outgoingChat);

    localStorage.setItem('all-chats', chatContainer.innerHTML);
    chatContainer.scrollTo(0, chatContainer.scrollHeight);

    // Tambahkan animasi mengetik untuk respons AI
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

/**
 * Memuat riwayat obrolan dan tema dari local storage saat halaman dimuat.
 */
const loadDataFromLocalstorage = () => {
    // Muat preferensi tema
    const theme = localStorage.getItem('themeColor');
    document.body.classList.toggle('light-mode', theme === 'light_mode');
    themeToggleButton.querySelector('.material-symbols-rounded').innerText =
        document.body.classList.contains('light-mode') ? 'dark_mode' : 'light_mode';

    // Bersihkan gelembung obrolan yang ada sebelum memuat dari local storage
    chatContainer.innerHTML = ''; // Pastikan container kosong sebelum mengisi

    // Muat riwayat obrolan
    const allChatsHTML = localStorage.getItem('all-chats');
    if (allChatsHTML && allChatsHTML.trim() !== '') {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = allChatsHTML;

        Array.from(tempDiv.children).forEach(child => {
            if (child.classList.contains('chat')) {
                chatContainer.appendChild(child);
                // Penting: re-parse HTML dengan marked.parse
                // Ini akan memastikan highlight.js dan struktur kode dipertahankan
                const chatTextElement = child.querySelector('.chat-text');
                if (chatTextElement) {
                    // Dapatkan teks mentah dari chatTextElement atau asumsikan sudah di-parse dengan benar
                    // Untuk kasus loading, kita asumsikan HTML sudah benar,
                    // jadi kita hanya perlu memicu Highlight.js untuk blok kode.
                    // Marked.js tidak perlu dijalankan lagi di sini karena HTML sudah ada.
                }
                // Highlight blok kode setelah elemen ditambahkan ke DOM
                const codeBlocks = child.querySelectorAll('pre code');
                codeBlocks.forEach(block => hljs.highlightElement(block));
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

// Inisialisasi saat DOM selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
    // Gunakan requestAnimationFrame untuk memastikan pengukuran tinggi yang akurat
    requestAnimationFrame(() => {
        chatInput.style.height = 'auto'; // Reset tinggi untuk mendapatkan scrollHeight yang benar
        initialInputHeight = chatInput.scrollHeight;
        chatInput.style.height = initialInputHeight + 'px'; // Atur tinggi awal
        loadDataFromLocalstorage(); // Muat data dari local storage
        updateSendButtonState(); // Perbarui status tombol kirim
    });
});

// Sesuaikan tinggi textarea dan perbarui status tombol kirim saat input
chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto'; // Reset tinggi
    chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px'; // Sesuaikan tinggi, maksimal 150px
    updateSendButtonState();
});

// Kirim pesan saat menekan Enter (tanpa Shift)
chatInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !sendButton.classList.contains('disabled') && !isTyping) {
        event.preventDefault(); // Mencegah baris baru default
        handleOutgoingChat();
    }
});

// Kirim pesan saat tombol diklik
sendButton.addEventListener('click', () => {
    if (!sendButton.classList.contains('disabled') && !isTyping) {
        handleOutgoingChat();
    }
});

// --- Sidebar Toggles ---
menuButton.addEventListener('click', () => {
    sidebar.classList.add('open');
    overlay.classList.add('show');
    if (window.innerWidth >= 769) { // Hanya terapkan margin pada desktop
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
        chatContainer.innerHTML = ''; // Hapus semua gelembung chat dari DOM
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
        chatContainer.innerHTML = ''; // Hapus semua gelembung chat dari DOM
        showWelcomeMessage();
        currentChatTitle.textContent = 'Obrolan Baru';
        closeSidebar();
    }
});

themeToggleButton.addEventListener('click', (e) => {
    e.preventDefault();
    document.body.classList.toggle('light-mode');
    const newTheme = document.body.classList.contains('light-mode') ? 'light_mode' : 'dark_mode';
    localStorage.setItem('themeColor', newTheme);
    themeToggleButton.querySelector('.material-symbols-rounded').innerText = newTheme;
});

// Delegasi event untuk tombol salin (berfungsi untuk elemen yang ditambahkan secara dinamis)
chatContainer.addEventListener('click', (event) => {
    // Tangani tombol salin kode
    const codeCopyBtn = event.target.closest('.code-block-copy-btn');
    if (codeCopyBtn) {
        const codeElement = codeCopyBtn.closest('.code-block-container')?.querySelector('code');
        if (codeElement) {
            navigator.clipboard.writeText(codeElement.textContent).then(() => {
                const copyIcon = codeCopyBtn.querySelector('.material-symbols-rounded');
                const originalText = codeCopyBtn.lastChild.textContent.trim();

                copyIcon.textContent = 'check';
                codeCopyBtn.lastChild.textContent = ' Copied!';

                setTimeout(() => {
                    copyIcon.textContent = 'content_copy';
                    codeCopyBtn.lastChild.textContent = ` ${originalText}`;
                }, 1000);
            }).catch(err => {
                console.error('Gagal menyalin kode:', err);
            });
        }
    }

    // Tangani tombol salin teks chat
    const chatCopyBtn = event.target.closest('.chat-action-icons .material-symbols-rounded[data-copy-target="chat-text"]');
    if (chatCopyBtn) {
        const chatContentWrapper = chatCopyBtn.closest('.chat-content-wrapper');
        let fullTextToCopy = '';

        // Dapatkan semua bagian konten teks, termasuk teks sederhana dan blok kode
        chatContentWrapper.querySelectorAll('.chat-text, .code-block code').forEach(el => {
            if (el.classList.contains('chat-text')) {
                // Untuk teks biasa, ganti <br> dengan newline
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = el.innerHTML.replace(/<br\s*\/?>/gi, '\n');
                fullTextToCopy += tempDiv.textContent.trim() + '\n\n';
            } else if (el.tagName === 'CODE') {
                // Untuk blok kode, tambahkan format Markdown code block
                const parentContainer = el.closest('.code-block-container');
                const langSpan = parentContainer ? parentContainer.querySelector('.code-block-lang') : null;
                const lang = langSpan ? langSpan.textContent.toLowerCase() : '';
                fullTextToCopy += '```' + (lang && lang !== 'plaintext' ? lang : '') + '\n' + el.textContent.trim() + '\n```\n\n';
            }
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
                console.error('Gagal menyalin teks chat:', err);
            });
        }
    }
});

// Pemberitahuan placeholder untuk fitur yang belum diimplementasikan
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
