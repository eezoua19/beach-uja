// ==================== SYSTEME DE JOURNALISATION ====================
class Logger {
    constructor() {
        this.activities = this.load(CONFIG.LOG_STORAGE_KEY);
        this.scans = this.load(CONFIG.SCAN_LOG_KEY);
        this.emails = this.load(CONFIG.EMAIL_LOG_KEY);
    }

    load(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch(e) { return []; }
    }

    save(key, data) {
        try {
            if (data.length > 500) data = data.slice(-500);
            localStorage.setItem(key, JSON.stringify(data));
        } catch(e) { console.error('Erreur sauvegarde logs:', e); }
    }

    addActivity(type, level, utilisateur, action, description, details = {}) {
        const now = new Date();
        const entry = {
            id: 'LOG-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2,5).toUpperCase(),
            timestamp: now.toISOString(),
            date: now.toLocaleDateString('fr-FR'),
            heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type, level, utilisateur, action, description,
            email: details.email || '',
            ticketId: details.ticketId || '',
            details: JSON.stringify(details, null, 2)
        };
        this.activities.push(entry);
        this.save(CONFIG.LOG_STORAGE_KEY, this.activities);
        return entry;
    }

    addScan(ticketId, nomParticipant, email, typeScan, resultat, message, personnesValidees, placesTotales) {
        const now = new Date();
        const entry = {
            id: 'SCAN-' + Date.now().toString(36),
            timestamp: now.toISOString(),
            date: now.toLocaleDateString('fr-FR'),
            heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            ticketId, nomParticipant, email, typeScan, resultat, message,
            personnesValidees: personnesValidees || 0,
            placesTotales: placesTotales || 0,
            progression: `${personnesValidees || 0}/${placesTotales || 0}`
        };
        this.scans.push(entry);
        this.save(CONFIG.SCAN_LOG_KEY, this.scans);
        return entry;
    }

    addEmail(destinataire, ticketId, type, status, message, tempsEnvoi) {
        const now = new Date();
        const entry = {
            id: 'MAIL-' + Date.now().toString(36),
            timestamp: now.toISOString(),
            date: now.toLocaleDateString('fr-FR'),
            heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            destinataire, ticketId, type, status, message, tempsEnvoi: tempsEnvoi || ''
        };
        this.emails.push(entry);
        this.save(CONFIG.EMAIL_LOG_KEY, this.emails);
        return entry;
    }

    getActivities(filter = {}) {
        let filtered = [...this.activities];
        if (filter.type) filtered = filtered.filter(a => a.type.includes(filter.type));
        if (filter.level) filtered = filtered.filter(a => a.level === filter.level);
        if (filter.search) {
            const s = filter.search.toLowerCase();
            filtered = filtered.filter(a => 
                a.utilisateur.toLowerCase().includes(s) ||
                a.action.toLowerCase().includes(s) ||
                a.description.toLowerCase().includes(s) ||
                a.email.toLowerCase().includes(s) ||
                a.ticketId.toLowerCase().includes(s)
            );
        }
        return filtered.slice(-(filter.limit || 100)).reverse();
    }

    getScans(limit = 50) { return this.scans.slice(-limit).reverse(); }
    getEmails(limit = 50) { return this.emails.slice(-limit).reverse(); }
    getTodayCount() {
        const today = new Date().toLocaleDateString('fr-FR');
        return this.activities.filter(a => a.date === today).length;
    }

    clearAll() {
        this.activities = []; this.scans = []; this.emails = [];
        this.save(CONFIG.LOG_STORAGE_KEY, []); 
        this.save(CONFIG.SCAN_LOG_KEY, []); 
        this.save(CONFIG.EMAIL_LOG_KEY, []);
    }

    exportAll() {
        return JSON.stringify({
            activities: this.activities,
            scans: this.scans,
            emails: this.emails
        }, null, 2);
    }
}

// Instance globale
const logger = new Logger();