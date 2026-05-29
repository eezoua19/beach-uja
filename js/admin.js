// ==================== MODULE ADMINISTRATION ====================
const AdminModule = {
    isAdmin: false,
    refreshInt: null,
    tickets: [],
    chart: null,

    openAdminModal: function() {
        document.getElementById('adminModal').classList.add('active');
        document.getElementById('adminLoginPanel').style.display = 'block';
        document.getElementById('adminDashboard').style.display = 'none';
        document.getElementById('adminCode').value = '';
        document.getElementById('loginError').innerHTML = '';
        document.getElementById('googleScriptUrl').value = CONFIG.GOOGLE_SCRIPT_URL;
    },

    closeAdminModal: function() {
        document.getElementById('adminModal').classList.remove('active');
        if (this.refreshInt) clearInterval(this.refreshInt);
        ScannerModule.stopScanner();
    },

    checkAdminLogin: async function() {
        const code = document.getElementById('adminCode').value.trim();
        if (code === CONFIG.SECRET_CODE) {
            this.isAdmin = true;
            document.getElementById('adminLoginPanel').style.display = 'none';
            document.getElementById('adminDashboard').style.display = 'block';
            document.getElementById('sessionBadge').style.display = 'block';
            document.getElementById('loginError').innerHTML = '';
            document.getElementById('googleScriptUrl').value = CONFIG.GOOGLE_SCRIPT_URL;
            await this.loadEmailJSConfig();
            await this.refreshData();
            if (this.refreshInt) clearInterval(this.refreshInt);
            this.refreshInt = setInterval(() => this.refreshData(), 4000);
            this.switchTab('tickets');
            logger.addActivity('Connexion', 'SUCCESS', 'Admin', 'Connexion admin', 'Administrateur connecté avec succès');
            Utils.toast('✅ Admin connecté !', 'success');
        } else {
            document.getElementById('loginError').innerHTML = '❌ Code incorrect. Réessayez.';
            document.getElementById('adminCode').value = '';
            document.getElementById('adminCode').focus();
            logger.addActivity('Connexion', 'ERROR', 'Inconnu', 'Échec connexion', 'Tentative de connexion avec code incorrect');
            Utils.toast('❌ Code administrateur incorrect', 'error');
        }
    },

    logoutAdmin: function() {
        logger.addActivity('Connexion', 'INFO', 'Admin', 'Déconnexion', 'Administrateur déconnecté');
        this.isAdmin = false;
        this.closeAdminModal();
        document.getElementById('sessionBadge').style.display = 'none';
        Utils.toast('👋 Déconnecté', 'info');
    },

    switchTab: function(n) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        const tabBtn = document.querySelector(`.tab-btn[onclick*="${n}"]`);
        if (tabBtn) tabBtn.classList.add('active');
        const tabPanel = document.getElementById(`tab-${n}`);
        if (tabPanel) tabPanel.classList.add('active');
        if (n !== 'scanner') ScannerModule.stopScanner();
        if (n === 'stats') this.updateChart();
        if (n === 'journal') this.renderJournal();
    },

    saveGoogleScriptUrl: function() {
        const u = document.getElementById('googleScriptUrl').value.trim();
        if (!u) { Utils.toast('URL requise', 'error'); return; }
        CONFIG.GOOGLE_SCRIPT_URL = u;
        localStorage.setItem('beach_uja_url', u);
        document.getElementById('connectionStatus').innerHTML = '<div class="alert alert-ok">✅ URL sauvegardée</div>';
        Utils.toast('✅ URL sauvegardée', 'success');
        setTimeout(() => document.getElementById('connectionStatus').innerHTML = '', 3000);
    },

    testConnection: async function() {
        const u = document.getElementById('googleScriptUrl').value.trim() || CONFIG.GOOGLE_SCRIPT_URL;
        const d = document.getElementById('connectionStatus');
        d.innerHTML = '<div class="alert alert-info"><span class="spinner spinner-d"></span> Test...</div>';
        try {
            const r = await fetch(`${u}?action=testConnection&code=${CONFIG.SECRET_CODE}`);
            const j = await r.json();
            d.innerHTML = j.success ? '<div class="alert alert-ok">Connecté !</div>' : '<div class="alert alert-err">❌ Échec</div>';
        } catch(e) { d.innerHTML = '<div class="alert alert-err">❌ Erreur réseau</div>'; }
        setTimeout(() => d.innerHTML = '', 4000);
    },

    saveEmailJSConfig: async function() {
        const uid = document.getElementById('emailjsUserId').value.trim();
        const sid = document.getElementById('emailjsServiceId').value.trim();
        const tid = document.getElementById('emailjsTemplateId').value.trim();
        if (!uid || !sid || !tid) { Utils.toast('Tous les champs requis', 'error'); return; }
        const d = document.getElementById('emailjsConfigStatus');
        d.innerHTML = '<span class="spinner spinner-d"></span>';
        try {
            const url = document.getElementById('googleScriptUrl').value.trim() || CONFIG.GOOGLE_SCRIPT_URL;
            await fetch(`${url}?action=saveEmailJSConfig&code=${CONFIG.SECRET_CODE}&userId=${encodeURIComponent(uid)}&serviceId=${encodeURIComponent(sid)}&templateId=${encodeURIComponent(tid)}`);
            CONFIG.emailjs = { userId: uid, serviceId: sid, templateId: tid };
            if (uid) emailjs.init(uid);
            d.innerHTML = '<span style="color:var(--s)">✅ Sauvegardé !</span>';
            logger.addActivity('Configuration', 'SUCCESS', 'Admin', 'Configuration EmailJS', 'EmailJS configuré avec succès');
            Utils.toast('✅ EmailJS OK', 'success');
        } catch(e) { d.innerHTML = '<span style="color:var(--d)">❌ Erreur</span>'; }
        setTimeout(() => d.innerHTML = '', 3000);
    },

    loadEmailJSConfig: async function() {
        try {
            const url = document.getElementById('googleScriptUrl').value.trim() || CONFIG.GOOGLE_SCRIPT_URL;
            const r = await fetch(`${url}?action=getEmailJSConfig&code=${CONFIG.SECRET_CODE}`);
            const j = await r.json();
            if (j.success && j.config) {
                CONFIG.emailjs = j.config;
                document.getElementById('emailjsUserId').value = CONFIG.emailjs.userId || '';
                document.getElementById('emailjsServiceId').value = CONFIG.emailjs.serviceId || '';
                document.getElementById('emailjsTemplateId').value = CONFIG.emailjs.templateId || '';
                if (CONFIG.emailjs.userId) emailjs.init(CONFIG.emailjs.userId);
            }
        } catch(e) {}
    },

    refreshData: async function() {
        if (!this.isAdmin) return;
        try {
            const url = document.getElementById('googleScriptUrl').value.trim() || CONFIG.GOOGLE_SCRIPT_URL;
            const r = await fetch(`${url}?action=getAllTickets&code=${CONFIG.SECRET_CODE}`);
            const j = await r.json();
            if (j.success && j.tickets) {
                this.tickets = j.tickets;
                this.renderTickets(this.tickets);
                this.updateStats();
                this.updateChart();
            }
        } catch(e) {
            console.error('Erreur refresh:', e);
        }
    },

    filterTickets: function() {
        const s = document.getElementById('searchInput').value.toLowerCase().trim();
        this.renderTickets(s ? this.tickets.filter(t => t.nom.toLowerCase().includes(s) || t.email.toLowerCase().includes(s) || t.id.toLowerCase().includes(s)) : this.tickets);
    },

    renderTickets: function(arr) {
        const c = document.getElementById('ticketsList');
        if (!arr.length) { c.innerHTML = '<p style="text-align:center;padding:20px;color:#999">Aucun ticket</p>'; return; }
        c.innerHTML = arr.map(t => {
            const s = t.statut === 'En attente' ? ['t-pending', '⏳ En attente', 's-pending'] : 
                      t.statut === 'Email envoyé' ? ['t-half', '📧 Confirmé', 's-half'] : 
                      ['t-full', '✅ Validé', 's-full'];
            return `<div class="ticket-item ${s[0]}"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px"><div><strong>${Utils.esc(t.nom)}</strong><br><small>🎫 ${t.id} | 👥 ${t.places} pl. | 📧 ${Utils.esc(t.email)}</small><br><small style="color:#666">${t.statutValidation||''}</small></div><div style="text-align:right"><span class="status-badge ${s[2]}">${s[1]}</span>${t.statut==='En attente'?`<button class="btn btn-sm btn-full" style="background:var(--s);color:#fff;margin-top:4px" onclick="AdminModule.confirmTicket('${t.id}','${Utils.esc(t.nom)}','${Utils.esc(t.email)}',${t.places},'${t.codeVerification}',this)"><i class="fas fa-envelope"></i></button>`:''}${t.statut!=='Entrée validée'?`<button class="btn btn-sm btn-full" style="background:var(--p);color:#fff;margin-top:4px" onclick="AdminModule.validateDirect('${t.id}',this)"><i class="fas fa-check"></i></button>`:''}</div></div></div>`;
        }).join('');
    },

    confirmTicket: async function(id, nom, email, pl, code, el) {
        if (!confirm(`📧 Envoyer ${pl} QR à ${nom} ?`)) return;
        el.disabled = true; el.innerHTML = '<span class="spinner"></span>';
        try {
            const url = document.getElementById('googleScriptUrl').value.trim() || CONFIG.GOOGLE_SCRIPT_URL;
            const r = await fetch(`${url}?action=confirmTicket&ticketId=${encodeURIComponent(id)}&code=${CONFIG.SECRET_CODE}`);
            const j = await r.json();
            if (j.success) {
                const s = await Tickets.sendEmail({id: j.ticket.id, nom: j.ticket.nom, email: j.ticket.email, places: j.ticket.places, codeVerification: j.ticket.codeVerification});
                Utils.toast(s ? `✅ ${pl} QR envoyé(s)` : '⚠️ Email non envoyé', s ? 'success' : 'warning');
                this.refreshData();
            } else Utils.toast('❌ ' + j.message, 'error');
        } catch(e) { Utils.toast('❌ Erreur', 'error'); }
        el.disabled = false; el.innerHTML = '<i class="fas fa-envelope"></i>';
    },

    validateDirect: async function(id, el) {
        if (!confirm(`Valider entrée pour ${id} ?`)) return;
        el.disabled = true; el.innerHTML = '<span class="spinner"></span>';
        try {
            const url = document.getElementById('googleScriptUrl').value.trim() || CONFIG.GOOGLE_SCRIPT_URL;
            const r = await fetch(`${url}?action=validateEntry&qrData=${encodeURIComponent(id)}&code=${CONFIG.SECRET_CODE}`);
            const j = await r.json();
            if (j.success) { Utils.toast('✅ Validé !', 'success'); Utils.confetti(); this.refreshData(); }
            else Utils.toast('❌ ' + j.message, 'error');
        } catch(e) { Utils.toast('❌ Erreur', 'error'); }
        el.disabled = false; el.innerHTML = '<i class="fas fa-check"></i>';
    },

    updateStats: function() {
        const t = this.tickets.length;
        const p = this.tickets.filter(x => x.statut === 'En attente').length;
        const h = this.tickets.filter(x => x.statut === 'Email envoyé').length;
        const f = this.tickets.filter(x => x.statut === 'Entrée validée').length;
        document.getElementById('statTotal').innerText = t;
        document.getElementById('statPending').innerText = p;
        document.getElementById('statHalf').innerText = h;
        document.getElementById('statFull').innerText = f;
        const pl = this.tickets.reduce((s, x) => s + parseInt(x.places || 1), 0);
        document.getElementById('statsSummary').innerHTML = `<p>👥 Places : <strong>${pl}</strong></p><p>💰 Revenu : <strong>${(pl*CONFIG.PRIX_PAR_PLACE).toLocaleString('fr-FR')} FCFA</strong></p><p>📝 Activités aujourd'hui : <strong>${logger.getTodayCount()}</strong></p>`;
    },

    updateChart: function() {
        const c = document.getElementById('statsChart');
        if (!c) return;
        if (this.chart) this.chart.destroy();
        const p = this.tickets.filter(x => x.statut === 'En attente').length;
        const h = this.tickets.filter(x => x.statut === 'Email envoyé').length;
        const f = this.tickets.filter(x => x.statut === 'Entrée validée').length;
        this.chart = new Chart(c, {
            type: 'doughnut',
            data: {
                labels: ['En attente', 'Confirmés', 'Validés'],
                datasets: [{data: [p, h, f], backgroundColor: ['#f39c12', '#2ecc71', '#1a5f7a'], borderWidth: 2, borderColor: '#fff'}]
            },
            options: {responsive: true, plugins: {legend: {position: 'bottom', labels: {padding: 15, font: {size: 12}}}}}
        });
    },

    exportCSV: function() {
        if (!this.tickets.length) { Utils.toast('Aucune donnée', 'warning'); return; }
        let c = '\uFEFFID,Nom,Email,Téléphone,Places,Remarques,Statut,Date\n';
        this.tickets.forEach(t => c += `"${t.id}","${t.nom}","${t.email}","${t.phone||''}","${t.places}","${t.remarques||''}","${t.statut}","${t.dateInscription||''}"\n`);
        const b = new Blob([c], {type: 'text/csv;charset=utf-8;'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = `BEACH_UJA_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        logger.addActivity('Export', 'INFO', 'Admin', 'Export CSV', `${this.tickets.length} tickets exportés`);
        Utils.toast('📥 Exporté !', 'success');
    },

    // Journal
    renderJournal: function() {
        const filter = {
            type: document.getElementById('logFilterType')?.value || '',
            level: document.getElementById('logFilterLevel')?.value || '',
            search: document.getElementById('logFilterSearch')?.value || '',
            limit: 100
        };
        
        const activities = logger.getActivities(filter);
        const container = document.getElementById('journalList');
        document.getElementById('journalCount').textContent = `${activities.length} entrée(s)`;
        
        if (activities.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#999;padding:20px">Aucune activité trouvée</p>';
            return;
        }
        
        container.innerHTML = activities.map(a => {
            let levelClass = 'l-info';
            let levelBadge = '<span class="status-badge s-info">ℹ️ Info</span>';
            if (a.level === 'SUCCESS') { levelClass = 'l-success'; levelBadge = '<span class="status-badge s-half">✅ Succès</span>'; }
            else if (a.level === 'ERROR') { levelClass = 'l-error'; levelBadge = '<span class="status-badge s-error">❌ Erreur</span>'; }
            else if (a.level === 'WARNING') { levelClass = 'l-warning'; levelBadge = '<span class="status-badge s-pending">⚠️ Attention</span>'; }
            
            return `
            <div class="log-entry ${levelClass}" onclick="Utils.showLogDetail('${a.id}')">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
                    <div>
                        <strong>${Utils.esc(a.type)}</strong> - ${Utils.esc(a.action)}
                        <div style="font-size:.85rem;color:#555;margin-top:2px">${Utils.esc(a.description)}</div>
                    </div>
                    <div style="text-align:right">
                        ${levelBadge}
                    </div>
                </div>
                <div class="log-meta">
                    <span><i class="far fa-calendar"></i> ${a.date} ${a.heure}</span>
                    <span><i class="far fa-user"></i> ${Utils.esc(a.utilisateur)}</span>
                    ${a.email ? `<span><i class="far fa-envelope"></i> ${Utils.esc(a.email)}</span>` : ''}
                    ${a.ticketId ? `<span><i class="fas fa-ticket-alt"></i> ${Utils.esc(a.ticketId)}</span>` : ''}
                </div>
            </div>`;
        }).join('');
    },

    showScanJournal: function() {
        const scans = logger.getScans(30);
        const container = document.getElementById('subJournalContent');
        
        if (scans.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#999;padding:15px">Aucun scan enregistré</p>';
            return;
        }
        
        container.innerHTML = `
        <div style="max-height:350px;overflow-y:auto">
            <table style="width:100%;font-size:.8rem;border-collapse:collapse">
                <thead><tr style="background:#f0f0f0">
                    <th style="padding:8px;text-align:left">Date</th>
                    <th style="padding:8px;text-align:left">Participant</th>
                    <th style="padding:8px;text-align:left">Résultat</th>
                    <th style="padding:8px;text-align:left">Message</th>
                    <th style="padding:8px;text-align:left">Progression</th>
                 </tr></thead>
                <tbody>
                    ${scans.map(s => `
                    <tr style="border-bottom:1px solid #eee">
                        <td style="padding:8px"><small>${s.date} ${s.heure}</small></td>
                        <td style="padding:8px"><strong>${Utils.esc(s.nomParticipant)}</strong></td>
                        <td style="padding:8px">${s.resultat === 'SUCCES' ? '✅' : '❌'}</td>
                        <td style="padding:8px"><small>${Utils.esc(s.message)}</small></td>
                        <td style="padding:8px"><strong>${s.progression}</strong></td>
                     </tr>`).join('')}
                </tbody>
             </table>
        </div>`;
    },

    showEmailJournal: function() {
        const emails = logger.getEmails(30);
        const container = document.getElementById('subJournalContent');
        
        if (emails.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#999;padding:15px">Aucun email enregistré</p>';
            return;
        }
        
        container.innerHTML = `
        <div style="max-height:350px;overflow-y:auto">
            <table style="width:100%;font-size:.8rem;border-collapse:collapse">
                <thead><tr style="background:#f0f0f0">
                    <th style="padding:8px;text-align:left">Date</th>
                    <th style="padding:8px;text-align:left">Destinataire</th>
                    <th style="padding:8px;text-align:left">Statut</th>
                    <th style="padding:8px;text-align:left">Message</th>
                    <th style="padding:8px;text-align:left">Temps</th>
                 </tr></thead>
                <tbody>
                    ${emails.map(em => `
                    <tr style="border-bottom:1px solid #eee">
                        <td style="padding:8px"><small>${em.date} ${em.heure}</small></td>
                        <td style="padding:8px"><strong>${Utils.esc(em.destinataire)}</strong></td>
                        <td style="padding:8px">${em.status === 'Succès' ? '✅' : '❌'}</td>
                        <td style="padding:8px"><small>${Utils.esc(em.message)}</small></td>
                        <td style="padding:8px"><small>${em.tempsEnvoi}</small></td>
                     </tr>`).join('')}
                </tbody>
             </table>
        </div>`;
    },

    refreshJournal: function() {
        this.renderJournal();
        Utils.toast('🔄 Journal rafraîchi', 'info');
    },

    exportJournal: function() {
        const data = logger.exportAll();
        const blob = new Blob([data], { type: 'application/json;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `BEACH_UJA_LOGS_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        logger.addActivity('Export', 'INFO', 'Admin', 'Export journal', 'Journal exporté en JSON');
        Utils.toast('📥 Journal exporté !', 'success');
    },

    clearJournal: function() {
        if (!confirm('⚠️ Supprimer TOUS les journaux ? Cette action est irréversible.')) return;
        logger.clearAll();
        logger.addActivity('Suppression', 'WARNING', 'Admin', 'Nettoyage journal', 'Tous les journaux ont été supprimés');
        this.renderJournal();
        document.getElementById('subJournalContent').innerHTML = '';
        Utils.toast('🗑️ Journaux supprimés', 'info');
    }
};