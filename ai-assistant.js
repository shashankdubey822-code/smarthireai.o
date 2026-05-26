/**
 * AI Chat Assistant Logic
 * Provides intelligent dashboard Q&A powered by SmartHire AI.
 */

class AIChat {
    constructor() {
        this.config = {
            chatEndpoint: "/api/chat",
            typingSpeed: 30,
        };

        // Generate a unique session ID for chat memory continuity
        this.sessionId = this.getOrCreateSessionId();

        this.elements = {
            widget: document.getElementById("aiChatWidget"),
            toggle: document.getElementById("aiChatToggle"),
            panel: document.getElementById("aiChatPanel"),
            close: document.getElementById("closeChat"),
            messages: document.getElementById("chatMessages"),
            input: document.getElementById("chatInput"),
            form: document.getElementById("chatInputForm"),
        };

        this.isOpen = false;
        this.isTyping = false;
        this.init();
    }

    getOrCreateSessionId() {
        let id = sessionStorage.getItem("aiChatSessionId");
        if (!id) {
            id = "session_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
            sessionStorage.setItem("aiChatSessionId", id);
        }
        return id;
    }

    init() {
        if (!this.elements.toggle) return;

        this.elements.toggle.addEventListener("click", () => this.toggleChat());
        this.elements.close.addEventListener("click", () => this.toggleChat(false));
        this.elements.form.addEventListener("submit", (e) => {
            e.preventDefault();
            this.handleUserSubmit();
        });

        // Close on Escape
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.isOpen) this.toggleChat(false);
        });
    }

    toggleChat(force) {
        this.isOpen = force !== undefined ? force : !this.isOpen;
        this.elements.panel.classList.toggle("hidden", !this.isOpen);
        if (this.isOpen) {
            this.elements.input.focus();
            this.elements.toggle.querySelector(".material-symbols-rounded").textContent = "chat_bubble";
        } else {
            this.elements.toggle.querySelector(".material-symbols-rounded").textContent = "smart_toy";
        }
    }

    async handleUserSubmit() {
        const text = this.elements.input.value.trim();
        if (!text || this.isTyping) return;

        this.addMessage(text, "user");
        this.elements.input.value = "";

        await this.getAIResponse(text);
    }

    addMessage(text, sender) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message ${sender}`;
        msgDiv.innerHTML = `<p>${this.formatText(text)}</p>`;
        this.elements.messages.appendChild(msgDiv);
        this.scrollToBottom();
        return msgDiv;
    }

    showTypingIndicator() {
        const indicator = document.createElement("div");
        indicator.className = "typing-indicator message ai";
        indicator.id = "typingIndicator";
        indicator.innerHTML = `<span></span><span></span><span></span>`;
        this.elements.messages.appendChild(indicator);
        this.scrollToBottom();
        return indicator;
    }

    hideTypingIndicator() {
        const indicator = document.getElementById("typingIndicator");
        if (indicator) indicator.remove();
    }

    scrollToBottom() {
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    }

    formatText(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
            .replace(/\n/g, '<br>');
    }

    getDashboardSummary() {
        if (typeof SHEET_DATA === 'undefined' || !SHEET_DATA.length) return "Dashboard is currently empty.";

        const totalApps = SHEET_DATA.length;
        const companies = [...new Set(SHEET_DATA.map(d => d.company))].length;
        const topRole = this.getTopMetric("role");
        const topLocation = this.getTopMetric("location");

        return `Dashboard Status: ${totalApps} applications total from ${companies} unique companies. Top role is ${topRole.name} (${topRole.count} apps). Top location is ${topLocation.name} (${topLocation.count} apps).`;
    }

    getTopMetric(key) {
        const map = {};
        SHEET_DATA.forEach(d => {
            const val = d[key] || "Unknown";
            map[val] = (map[val] || 0) + 1;
        });
        const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
        return sorted.length ? { name: sorted[0][0], count: sorted[0][1] } : { name: "N/A", count: 0 };
    }

    /**
     * Deep extract AI text from any n8n response format.
     * n8n can return: { output: "..." }, [{ output: "..." }],
     * [{ json: { output: "..." } }], { text: "..." }, etc.
     */
    extractAIText(data) {
        if (!data) return "";
        if (typeof data === "string") return data;

        // Common field names used by n8n AI Agent and Respond to Webhook
        const fields = ["output", "text", "message", "response", "chatOutput", "content", "result", "answer"];

        // If it's an array, try the first element
        if (Array.isArray(data)) {
            if (data.length === 0) return "";
            const first = data[0];
            // n8n often wraps items in { json: { ... } }
            if (first && first.json) return this.extractAIText(first.json);
            return this.extractAIText(first);
        }

        // If it's an object, check known fields
        if (typeof data === "object") {
            // Check if there's a "json" wrapper (n8n item format)
            if (data.json) return this.extractAIText(data.json);

            // Try each known field
            for (const field of fields) {
                if (data[field] && typeof data[field] === "string" && data[field].trim()) {
                    return data[field];
                }
            }

            // Last resort: find any string value in the object
            for (const val of Object.values(data)) {
                if (typeof val === "string" && val.trim().length > 10) {
                    return val;
                }
            }
        }

        return "";
    }

    async getAIResponse(userQuery) {
        this.isTyping = true;
        this.showTypingIndicator();

        try {
            const dashboardContext = this.getDashboardSummary();

            const response = await fetch(this.config.chatEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chatInput: userQuery,
                    dashboardContext,
                    sessionId: this.sessionId,
                    action: "sendMessage"
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Request failed (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            const aiText = data.output || data.text || data.message || data.response
                || (typeof data === "string" ? data : "I couldn't process your request. Please try again.");

            this.hideTypingIndicator();
            this.addMessage(aiText, "ai");

        } catch (error) {
            console.error("AI Assistant Error:", error);
            this.hideTypingIndicator();

            let errorMsg = "Sorry, I'm having trouble responding right now. ";
            if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
                errorMsg += "Please make sure the backend server is running.";
            } else {
                errorMsg += error.message;
            }
            this.addMessage(errorMsg, "ai");
        } finally {
            this.isTyping = false;
        }
    }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    window.aiAssistant = new AIChat();
});
