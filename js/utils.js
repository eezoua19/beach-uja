// ==================== UTILITAIRES ====================
const Utils = {
    esc: function(s) {
        if (!s) return '';
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    },

    toast: function(m, t = 'info') {
        const c = document.getElementById('toastContainer');
        const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
        const el = document.createElement('div');
        el.className = `toast toast-${t[0]}`;
        el.innerHTML = `<span>${icons[t] || ''}</span> ${m}`;
        c.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(15px)';
            el.style.transition = 'all .25s';
            setTimeout(() => el.remove(), 250);
        }, 3000);
    },

    confetti: function() {
        const cl = ['#f4a261', '#2ecc71', '#1a5f7a', '#e76f51', '#f39c12', '#3498db'];
        for (let i = 0; i < 60; i++) {
            setTimeout(() => {
                const el = document.createElement('div');
                el.style.cssText = `position:fixed;top:-15px;left:${Math.random()*100}%;width:${Math.random()*10+5}px;height:${Math.random()*10+5}px;background:${cl[Math.floor(Math.random()*cl.length)]};z-index:9999;pointer-events:none;animation:confetti ${Math.random()*2.5+1.5}s linear forwards;border-radius:${Math.random()>.5?'50%':'2px'}`;
                document.body.appendChild(el);
                setTimeout(() => el.remove(), 4000);
            }, i * 12);
        }
    },

    genQR: function(txt, sz, cb) {
        const u = `https://api.qrserver.com/v1/create-qr-code/?size=${sz}x${sz}&data=${encodeURIComponent(txt)}&margin=10&bgcolor=fff&color=1a5f7a`;
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = c.height = sz;
            c.getContext('2d').drawImage(img, 0, 0, sz, sz);
            cb(c.toDataURL());
        };
        img.onerror = () => cb(u);
        img.src = u;
    },

    closeLogDetail: function() {
        document.getElementById('logDetailModal').classList.remove('active');
    },

    showLogDetail: function(logId) {
        const activity = logger.activities.find(a => a.id === logId);
        if (!activity) return;
        
        const content = document.getElementById('logDetailContent');
        content.innerHTML = `
            <p><strong>📅 Date :</strong> ${activity.date} à ${activity.heure}</p>
            <p><strong>📌 Type :</strong> ${this.esc(activity.type)}</p>
            <p><strong>📊 Niveau :</strong> ${activity.level}</p>
            <p><strong>👤 Utilisateur :</strong> ${this.esc(activity.utilisateur)}</p>
            <p><strong>⚡ Action :</strong> ${this.esc(activity.action)}</p>
            <p><strong>📝 Description :</strong> ${this.esc(activity.description)}</p>
            ${activity.email ? `<p><strong>📧 Email :</strong> ${this.esc(activity.email)}</p>` : ''}
            ${activity.ticketId ? `<p><strong>🎫 Ticket :</strong> <code>${this.esc(activity.ticketId)}</code></p>` : ''}
            <h4 style="margin-top:15px;color:var(--p)">Détails techniques :</h4>
            <pre style="background:#f8f9fa;padding:12px;border-radius:8px;font-size:.8rem;max-height:200px;overflow-y:auto;white-space:pre-wrap">${this.esc(activity.details || 'Aucun détail')}</pre>
        `;
        
        document.getElementById('logDetailModal').classList.add('active');
    },

    initParticles: function() {
        const c = document.getElementById('particles');
        if (!c) return;
        for (let i = 0; i < 25; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.cssText = `left:${Math.random()*100}%;width:${Math.random()*6+3}px;height:${Math.random()*6+3}px;animation-duration:${Math.random()*20+12}s;animation-delay:${Math.random()*15}s`;
            c.appendChild(p);
        }
    }
};