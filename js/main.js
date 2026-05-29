// ==================== APPLICATION PRINCIPALE ====================
const App = {
    
    // ==================== COMPTE À REBOURS ====================
    countdownInterval: null,
    eventDate: new Date(CONFIG.EVENT_DATE),
    
    initCountdown: function() {
        const daysEl = document.getElementById('countdown-days');
        if (!daysEl) {
            console.warn('Elements compte a rebours non trouves');
            return;
        }
        this.updateCountdown();
        this.countdownInterval = setInterval(() => this.updateCountdown(), 1000);
        console.log('Compte a rebours initialise');
    },
    
    updateCountdown: function() {
        const now = new Date().getTime();
        const eventTime = this.eventDate.getTime();
        const distance = eventTime - now;
        
        const daysEl = document.getElementById('countdown-days');
        const hoursEl = document.getElementById('countdown-hours');
        const minutesEl = document.getElementById('countdown-minutes');
        const secondsEl = document.getElementById('countdown-seconds');
        const daysRemainingEl = document.getElementById('daysRemaining');
        const countdownGrid = document.getElementById('countdown');
        const countdownHeader = document.querySelector('.countdown-header h2');
        
        if (!daysEl || !hoursEl || !minutesEl || !secondsEl) {
            this.stopCountdown();
            return;
        }
        
        if (distance < 0) {
            this.stopCountdown();
            daysEl.textContent = '00';
            hoursEl.textContent = '00';
            minutesEl.textContent = '00';
            secondsEl.textContent = '00';
            if (daysRemainingEl) daysRemainingEl.textContent = '0';
            if (countdownGrid) countdownGrid.classList.add('countdown-finished');
            if (countdownHeader) {
                countdownHeader.innerHTML = "🎉 <span>C'EST MAINTENANT !</span> 🎉";
                countdownHeader.style.animation = 'pulse 1s infinite';
            }
            return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        const oldSeconds = secondsEl.textContent;
        const newSeconds = String(seconds).padStart(2, '0');
        
        daysEl.textContent = String(days).padStart(2, '0');
        hoursEl.textContent = String(hours).padStart(2, '0');
        minutesEl.textContent = String(minutes).padStart(2, '0');
        secondsEl.textContent = newSeconds;
        
        if (oldSeconds !== newSeconds) {
            secondsEl.classList.remove('animate');
            void secondsEl.offsetWidth;
            secondsEl.classList.add('animate');
        }
        
        if (daysRemainingEl) daysRemainingEl.textContent = days;
        if (days === 0 && countdownHeader) {
            countdownHeader.innerHTML = "🔥 <span>C'EST AUJOURD'HUI !</span> 🔥";
        }
        if (days > 0 && days <= 7 && countdownHeader) {
            countdownHeader.innerHTML = '⏰ Plus que <span>' + days + '</span> jour' + (days > 1 ? 's' : '') + ' !';
        }
    },
    
    stopCountdown: function() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    },

    // ==================== MISE A JOUR DU PRIX ====================
    updatePrice: function() {
        const qty = parseInt(document.getElementById('quantity').value) || 1;
        const refundDiv = document.getElementById('refundMsg');
        if (!refundDiv) return;
        if (qty === 1) {
            refundDiv.innerHTML = '<strong>⚠️ Important</strong><br>Aucun remboursement. <strong>Vous allez recevoir un QR code</strong> par email apres validation de votre achat.';
        } else {
            refundDiv.innerHTML = '<strong>⚠️ Important</strong><br>Aucun remboursement. <strong>' + qty + ' QR codes distincts</strong> seront envoyes par email apres validation de votre achat.';
        }
    },

    // ==================== CONFIRMATION ====================
    confirmationData: null,
    redirectInterval: null,
    redirectSeconds: 5,

    openConfirmation: function() {
        if (!this.confirmationData) return;
        const data = this.confirmationData;
        const modal = document.getElementById('confirmationModal');
        if (!modal) {
            Utils.toast(data.places + ' place(s) reservee(s) ! Redirection...', 'success');
            setTimeout(() => window.open('https://app.fineopay.com/bde_cerap/pierreyvann/checkout', '_blank'), 1500);
            return;
        }
        
        const summary = document.getElementById('confirmationSummary');
        if (summary) {
            summary.innerHTML =
                '<h3><i class="fas fa-receipt"></i> Resume de votre commande</h3>' +
                '<div class="summary-row"><span class="label"><i class="fas fa-user"></i> Nom</span><span class="value">' + Utils.esc(data.nom) + '</span></div>' +
                '<div class="summary-row"><span class="label"><i class="fas fa-envelope"></i> Email</span><span class="value">' + Utils.esc(data.email) + '</span></div>' +
                '<div class="summary-row"><span class="label"><i class="fas fa-phone"></i> Telephone</span><span class="value">' + Utils.esc(data.phone) + '</span></div>' +
                '<div class="summary-row"><span class="label"><i class="fas fa-users"></i> Places</span><span class="value">' + data.places + ' personne(s)</span></div>' +
                '<div class="summary-row"><span class="label"><i class="fas fa-calendar"></i> Date</span><span class="value">' + data.dateInscription + '</span></div>' +
                '<div class="summary-total"><span class="label">💰 Total a payer</span><span class="value">' + data.total.toLocaleString('fr-FR') + ' FCFA</span></div>';
        }
        
        const delayEl = document.getElementById('confirmationDelay');
        if (delayEl) {
            const places = parseInt(data.places);
            let delaiTexte = '10 à 20 minutes ';
            if (places >= 5) delaiTexte = '20 à 30 minutes (traitement groupe)';
            delayEl.innerHTML = '<i class="fas fa-clock"></i><span>Delai estime de reception des QR codes : <strong>' + delaiTexte + '</strong> apres validation du paiement</span>';
        }
        
        this.resetPaymentSteps(1);
        modal.classList.add('active');
        this.startRedirectCountdown();
        logger.addActivity('Systeme', 'INFO', data.nom, 'Modale confirmation', 'Modale de confirmation affichee');
        setTimeout(() => Utils.confetti(), 500);
    },

    closeConfirmation: function() {
        const modal = document.getElementById('confirmationModal');
        if (modal) modal.classList.remove('active');
        this.stopRedirectCountdown();
    },

    redirectToPayment: function() {
        this.updatePaymentStep(2, 'completed');
        this.stopRedirectCountdown();
        if (this.confirmationData) {
            logger.addActivity('Paiement', 'INFO', this.confirmationData.nom, 'Redirection paiement', 'Redirection vers Fineopay');
        }
        setTimeout(() => window.open('https://app.fineopay.com/bde_cerap/pierreyvann/checkout', '_blank'), 300);
    },

    startRedirectCountdown: function() {
        this.stopRedirectCountdown();
        this.redirectSeconds = 5;
        const countdownEl = document.getElementById('redirectCountdown');
        const timerDiv = document.getElementById('redirectTimer');
        if (timerDiv) timerDiv.style.display = 'block';
        if (countdownEl) countdownEl.textContent = this.redirectSeconds;
        this.redirectInterval = setInterval(() => {
            this.redirectSeconds--;
            if (countdownEl) {
                countdownEl.textContent = this.redirectSeconds;
                if (this.redirectSeconds <= 3) countdownEl.style.color = '#e76f51';
            }
            if (this.redirectSeconds <= 0) this.redirectToPayment();
        }, 1000);
    },

    stopRedirectCountdown: function() {
        if (this.redirectInterval) {
            clearInterval(this.redirectInterval);
            this.redirectInterval = null;
        }
    },

    updatePaymentStep: function(step, status) {
        document.querySelectorAll('.payment-step').forEach(el => {
            const stepNum = parseInt(el.getAttribute('data-step'));
            el.classList.remove('active', 'completed');
            if (stepNum < step) el.classList.add('completed');
            else if (stepNum === step) el.classList.add(status);
        });
        document.querySelectorAll('.payment-step-line').forEach((el, index) => {
            if (index + 1 < step) el.classList.add('completed');
            else el.classList.remove('completed');
        });
    },

    resetPaymentSteps: function(activeStep) {
        activeStep = activeStep || 1;
        document.querySelectorAll('.payment-step').forEach(el => {
            const stepNum = parseInt(el.getAttribute('data-step'));
            el.classList.remove('active', 'completed');
            if (stepNum === activeStep) el.classList.add('active');
        });
        document.querySelectorAll('.payment-step-line').forEach(el => el.classList.remove('completed'));
    },

    // ==================== GESTION DU PROFIL UTILISATEUR ====================
    currentProfileId: null,
    profileRefreshInterval: null,

    loadProfile: function() {
        const savedProfileId = localStorage.getItem('beach_uja_profile_id');
        if (savedProfileId) {
            this.currentProfileId = savedProfileId;
            this.showProfileSection();
            this.refreshProfile();
            this.startProfileAutoRefresh();
        }
    },

    showProfileSection: function() {
        const profileSection = document.getElementById('profileSection');
        const profileEmpty = document.getElementById('profileEmpty');
        const profileContent = document.getElementById('profileContent');
        if (profileSection) profileSection.style.display = 'block';
        if (profileEmpty) profileEmpty.style.display = 'none';
        if (profileContent) profileContent.style.display = 'block';
    },

    refreshProfile: async function() {
        if (!this.currentProfileId) {
            this.loadProfile();
            return;
        }
        const profileContent = document.getElementById('profileContent');
        if (profileContent) profileContent.style.opacity = '0.6';
        
        try {
            const url = document.getElementById('googleScriptUrl')?.value?.trim() || CONFIG.GOOGLE_SCRIPT_URL;
            const response = await fetch(url + '?action=getAllTickets&code=' + CONFIG.SECRET_CODE);
            if (!response.ok) throw new Error('Erreur serveur');
            const result = await response.json();
            
            if (result.success && result.tickets) {
                const ticket = result.tickets.find(t => t.id === this.currentProfileId);
                if (ticket) {
                    this.renderProfile(ticket);
                } else {
                    this.clearProfile();
                    Utils.toast('⚠️ Profil introuvable. Veuillez vous reinscrire.', 'warning');
                }
            }
        } catch(e) {
            console.error('Erreur rafraichissement profil:', e);
        } finally {
            if (profileContent) profileContent.style.opacity = '1';
        }
    },

    renderProfile: function(ticket) {
        const initials = ticket.nom.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();
        const initialsEl = document.getElementById('profileInitials');
        if (initialsEl) initialsEl.textContent = initials;
        
        const nameEl = document.getElementById('profileName');
        const ticketIdEl = document.getElementById('profileTicketId');
        const emailEl = document.getElementById('profileEmail');
        const phoneEl = document.getElementById('profilePhone');
        const placesEl = document.getElementById('profilePlaces');
        const totalEl = document.getElementById('profileTotal');
        const dateEl = document.getElementById('profileDate');
        
        if (nameEl) nameEl.textContent = ticket.nom;
        if (ticketIdEl) ticketIdEl.textContent = 'ID: ' + ticket.id;
        if (emailEl) emailEl.textContent = ticket.email;
        if (phoneEl) phoneEl.textContent = ticket.phone || '--';
        if (placesEl) placesEl.textContent = (ticket.places || 1) + ' personne(s)';
        if (totalEl) {
            const total = (ticket.places || 1) * CONFIG.PRIX_PAR_PLACE;
            totalEl.textContent = total.toLocaleString('fr-FR') + ' FCFA';
        }
        if (dateEl) dateEl.textContent = ticket.dateInscription || '--';
        
        this.updateProfileStatus(ticket.statut);
        this.updateProfileProgress(ticket.statut);
        
        if (ticket.statut === 'Email envoye' || ticket.statut === 'Entree validee') {
            this.showProfileQR(ticket);
        } else {
            const qrSection = document.getElementById('profileQR');
            if (qrSection) qrSection.style.display = 'none';
        }
        
        const payBtn = document.getElementById('profilePayBtn');
        if (payBtn) payBtn.style.display = ticket.statut === 'En attente' ? 'inline-flex' : 'none';
        
        localStorage.setItem('beach_uja_profile_id', ticket.id);
        this.currentProfileId = ticket.id;
        
        const updateEl = document.getElementById('profileLastUpdate');
        if (updateEl) {
            const now = new Date();
            updateEl.innerHTML = '<i class="fas fa-clock"></i> Derniere mise a jour : ' + now.toLocaleTimeString('fr-FR');
        }
        
        this.showProfileSection();
    },

    updateProfileStatus: function(statut) {
        const badge = document.getElementById('profileStatusBadge');
        const statusText = document.getElementById('profileStatus');
        if (!badge || !statusText) return;
        
        badge.classList.remove('profile-status-pending', 'profile-status-confirmed', 'profile-status-validated', 'profile-status-error');
        
        switch(statut) {
            case 'En attente':
                badge.classList.add('profile-status-pending');
                statusText.textContent = '⏳ En attente';
                break;
            case 'Email envoye':
                badge.classList.add('profile-status-confirmed');
                statusText.textContent = '✅ Confirme';
                break;
            case 'Entree validee':
                badge.classList.add('profile-status-validated');
                statusText.textContent = '🎟️ Entree validee';
                break;
            default:
                badge.classList.add('profile-status-error');
                statusText.textContent = '❌ Inconnu';
        }
    },

    updateProfileProgress: function(statut) {
        const steps = document.querySelectorAll('.progress-step');
        if (!steps.length) return;
        
        let completedSteps = 0;
        switch(statut) {
            case 'En attente': completedSteps = 1; break;
            case 'Email envoye': completedSteps = 3; break;
            case 'Entree validee': completedSteps = 4; break;
            default: completedSteps = 1;
        }
        
        steps.forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index < completedSteps - 1) step.classList.add('completed');
            else if (index === completedSteps - 1) step.classList.add('active');
        });
    },

    showProfileQR: function(ticket) {
        const qrSection = document.getElementById('profileQR');
        const qrList = document.getElementById('qrList');
        if (!qrSection || !qrList) return;
        
        qrSection.style.display = 'block';
        qrList.innerHTML = '<span class="spinner spinner-d"></span> Generation des QR codes...';
        
        const places = parseInt(ticket.places) || 1;
        const qrCodes = [];
        let generated = 0;
        
        for (let i = 1; i <= places; i++) {
            const qrData = ticket.id + '-P' + i + '|' + ticket.codeVerification + '-' + i;
            Utils.genQR(qrData, 150, (function(index, qrUrl) {
                qrCodes.push({index: index, url: qrUrl});
                generated++;
                if (generated === places) {
                    qrCodes.sort((a, b) => a.index - b.index);
                    qrList.innerHTML = qrCodes.map(qr =>
                        '<div class="qr-item"><img src="' + qr.url + '" alt="QR Code ' + qr.index + '" loading="lazy"><small>Billet ' + qr.index + '/' + places + '</small></div>'
                    ).join('');
                }
            }).bind(null, i));
        }
    },

    startProfileAutoRefresh: function() {
        this.stopProfileAutoRefresh();
        this.profileRefreshInterval = setInterval(() => {
            if (this.currentProfileId) this.refreshProfile();
        }, 10000);
    },

    stopProfileAutoRefresh: function() {
        if (this.profileRefreshInterval) {
            clearInterval(this.profileRefreshInterval);
            this.profileRefreshInterval = null;
        }
    },

    clearProfile: function() {
        localStorage.removeItem('beach_uja_profile_id');
        this.currentProfileId = null;
        this.stopProfileAutoRefresh();
        
        const profileSection = document.getElementById('profileSection');
        const profileEmpty = document.getElementById('profileEmpty');
        const profileContent = document.getElementById('profileContent');
        
        if (profileSection) profileSection.style.display = 'none';
        if (profileEmpty) profileEmpty.style.display = 'block';
        if (profileContent) profileContent.style.display = 'none';
        
        Utils.toast('👋 Profil deconnecte', 'info');
    },

    fetchLastTicketForProfile: async function(email) {
        try {
            const url = document.getElementById('googleScriptUrl')?.value?.trim() || CONFIG.GOOGLE_SCRIPT_URL;
            const response = await fetch(url + '?action=getAllTickets&code=' + CONFIG.SECRET_CODE);
            const result = await response.json();
            if (result.success && result.tickets) {
                const userTickets = result.tickets
                    .filter(t => t.email === email)
                    .sort((a, b) => new Date(b.dateInscription || 0) - new Date(a.dateInscription || 0));
                if (userTickets.length > 0) {
                    const lastTicket = userTickets[0];
                    localStorage.setItem('beach_uja_profile_id', lastTicket.id);
                    this.currentProfileId = lastTicket.id;
                    this.startProfileAutoRefresh();
                }
            }
        } catch(e) {
            console.warn('Impossible de recuperer le dernier ticket:', e);
        }
    },

    // ==================== SOUMISSION D'INSCRIPTION ====================
    submitInscription: async function() {
        const n = document.getElementById('fullname')?.value?.trim();
        const e = document.getElementById('email')?.value?.trim();
        const p = document.getElementById('phone')?.value?.trim();
        const q = document.getElementById('quantity')?.value;
        const r = document.getElementById('remarks')?.value?.trim();
        
        if (!n || !e || !p) { Utils.toast('Veuillez remplir tous les champs obligatoires', 'error'); return; }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(e)) { Utils.toast('Veuillez entrer une adresse email valide', 'error'); return; }
        
        const total = parseInt(q) * CONFIG.PRIX_PAR_PLACE;
        
        if (!confirm(
            '⚠️ Confirmation d achat\n\n' +
            '👤 Nom : ' + n + '\n' +
            '👥 Places : ' + q + ' personne(s)\n' +
            '💰 Total : ' + total.toLocaleString('fr-FR') + ' FCFA\n\n' +
            '⚠️ AUCUN REMBOURSEMENT ne sera effectue apres achat.\n' +
            (q > 1 ? q + ' QR codes distincts' : 'Un QR code') + ' sera envoye par email.\n\n' +
            'Confirmer l inscription ?'
        )) return;
        
        const btn = document.getElementById('submitBtn');
        if (!btn) return;
        
        btn.disabled = true;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner"></span> Traitement...';
        
        try {
            const url = document.getElementById('googleScriptUrl')?.value?.trim() || CONFIG.GOOGLE_SCRIPT_URL;
            await fetch(url, {
                method: 'POST',
                mode: 'no-cors',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({fullname: n, email: e, phone: p, quantity: q, remarks: r, action: 'register'})
            });
            
            this.confirmationData = {
                nom: n, email: e, phone: p, places: q, total: total,
                dateInscription: new Date().toLocaleDateString('fr-FR', {day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'})
            };
            
            // Sauvegarder l'email pour retrouver le ticket
            localStorage.setItem('beach_uja_user_email', e);
            
            logger.addActivity('Inscription', 'SUCCESS', n, 'Nouvelle inscription', n + ' s est inscrit avec ' + q + ' place(s)', {email: e, phone: p, quantity: q, total: total});
            
            ['fullname', 'email', 'phone', 'remarks'].forEach(x => { const el = document.getElementById(x); if (el) el.value = ''; });
            const quantityEl = document.getElementById('quantity');
            if (quantityEl) quantityEl.value = '1';
            this.updatePrice();
            
            // Chercher le ticket pour le profil
            setTimeout(() => this.fetchLastTicketForProfile(e), 2000);
            
            this.openConfirmation();
            
            if (typeof AdminModule !== 'undefined' && AdminModule.isAdmin) AdminModule.refreshData();
            
        } catch(x) {
            console.error('Erreur inscription:', x);
            logger.addActivity('Inscription', 'ERROR', n, 'Echec inscription', 'Erreur lors de l inscription', {error: x.message});
            Utils.toast('❌ Une erreur est survenue. Veuillez reessayer.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    },

    // ==================== VERIFICATION DE TICKET ====================
    checkMyTicket: async function() {
        const id = document.getElementById('checkTicketId')?.value?.trim();
        if (!id) { Utils.toast('Veuillez entrer un ID de ticket', 'warning'); return; }
        
        const d = document.getElementById('ticketVerificationResult');
        if (!d) return;
        
        d.innerHTML = '<div style="text-align:center;padding:15px"><span class="spinner spinner-d"></span> <span style="margin-left:8px">Recherche de votre ticket...</span></div>';
        
        try {
            const url = document.getElementById('googleScriptUrl')?.value?.trim() || CONFIG.GOOGLE_SCRIPT_URL;
            const response = await fetch(url + '?action=getAllTickets&code=' + CONFIG.SECRET_CODE);
            if (!response.ok) throw new Error('Erreur de reponse du serveur');
            const result = await response.json();
            
            if (result.success && result.tickets) {
                const ticket = result.tickets.find(t => t.id === id);
                
                if (ticket) {
                    const statusConfig = {
                        'En attente': { icon: '⏳', color: '#f39c12', bg: '#fff8e1', label: 'En attente de validation', description: 'Votre inscription est enregistree mais n a pas encore ete confirmee.' },
                        'Email envoye': { icon: '📧', color: '#2ecc71', bg: '#e8f5e9', label: '✅ Confirme - Entree autorisee', description: 'Votre inscription est confirmee. Presentez votre QR code a l entree.' },
                        'Entree validee': { icon: '✅', color: '#1a5f7a', bg: '#e3f2fd', label: '🎟️ Deja utilise - Entree validee', description: 'Ce ticket a deja ete utilise pour l entree.' }
                    };
                    const config = statusConfig[ticket.statut] || statusConfig['En attente'];
                    const personnesValidees = ticket.personnesValidees || 0;
                    const placesTotales = ticket.places || 1;
                    
                    d.innerHTML =
                        '<div style="background:' + config.bg + ';border-left:4px solid ' + config.color + ';padding:20px;border-radius:14px;animation:scaleIn .3s ease">' +
                        '<div style="font-size:2.5rem;text-align:center">' + config.icon + '</div>' +
                        '<h3 style="color:' + config.color + ';text-align:center;margin:10px 0">' + config.label + '</h3>' +
                        '<p style="text-align:center;color:#666;font-size:.85rem;margin-bottom:15px">' + config.description + '</p>' +
                        '<div style="background:white;padding:15px;border-radius:10px;margin-top:10px">' +
                        '<p><strong>👤 Nom :</strong> ' + Utils.esc(ticket.nom) + '</p>' +
                        '<p><strong>🎫 ID Ticket :</strong> <code>' + Utils.esc(ticket.id) + '</code></p>' +
                        '<p><strong>👥 Nombre de places :</strong> ' + placesTotales + ' personne(s)</p>' +
                        (placesTotales > 1 ? '<p><strong>✅ Personnes validees :</strong> ' + personnesValidees + '/' + placesTotales + '</p>' : '') +
                        '<p><strong>📧 Email :</strong> ' + Utils.esc(ticket.email) + '</p>' +
                        (ticket.phone ? '<p><strong>📱 Telephone :</strong> ' + Utils.esc(ticket.phone) + '</p>' : '') +
                        '<hr style="margin:10px 0">' +
                        '<p><strong>📅 Date de l evenement :</strong> 20 Juin 2026</p>' +
                        '<p><strong>📍 Lieu :</strong> Songon Park, Jacqueville</p>' +
                        '<p style="color:#e74c3c;font-size:.8rem;margin-top:10px"><i class="fas fa-exclamation-triangle"></i> ⚠️ Aucun remboursement possible</p>' +
                        '</div></div>';
                    
                    logger.addActivity('Recherche', 'SUCCESS', 'Public', 'Verification ticket', 'Ticket ' + id + ' trouve', {ticketId: id, statut: ticket.statut, nom: ticket.nom});
                    Utils.toast('✅ Ticket trouve !', 'success');
                } else {
                    d.innerHTML = '<div style="background:#f8d7da;padding:20px;border-radius:14px;text-align:center"><i class="fas fa-search" style="font-size:2rem;color:#721c24;margin-bottom:10px"></i><p style="color:#721c24;font-weight:bold">❌ Aucun ticket trouve avec cet ID</p><p style="color:#721c24;font-size:.85rem;margin-top:5px">Verifiez l ID sur votre QR code ou contactez l organisateur.</p></div>';
                    logger.addActivity('Recherche', 'WARNING', 'Public', 'Verification ticket echouee', 'Ticket ' + id + ' non trouve', {ticketId: id});
                    Utils.toast('❌ Ticket non trouve', 'error');
                }
            } else {
                d.innerHTML = '<div style="background:#f8d7da;padding:20px;border-radius:14px;text-align:center"><i class="fas fa-server" style="font-size:2rem;color:#721c24;margin-bottom:10px"></i><p style="color:#721c24;font-weight:bold">❌ Impossible de verifier le ticket pour le moment</p><p style="color:#721c24;font-size:.85rem">Veuillez reessayer plus tard.</p></div>';
                Utils.toast('⚠️ Erreur de connexion', 'error');
            }
        } catch(e) {
            console.error('Erreur verification:', e);
            d.innerHTML = '<div style="background:#f8d7da;padding:20px;border-radius:14px;text-align:center"><i class="fas fa-wifi" style="font-size:2rem;color:#721c24"></i><p style="color:#721c24;margin-top:10px;font-weight:bold">❌ Erreur de connexion au serveur</p><p style="color:#721c24;font-size:.85rem">Verifiez votre connexion internet.</p></div>';
            logger.addActivity('Recherche', 'ERROR', 'Public', 'Erreur verification ticket', 'Erreur: ' + e.message, {ticketId: id, error: e.message});
            Utils.toast('❌ Erreur reseau', 'error');
        }
    }
};

// ==================== INITIALISATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏖️ BEACH UJA - Initialisation...');
    
    Utils.initParticles();
    App.updatePrice();
    App.initCountdown();
    App.loadProfile();
    
    const savedUrl = localStorage.getItem('beach_uja_url');
    const urlInput = document.getElementById('googleScriptUrl');
    if (urlInput) urlInput.value = savedUrl || CONFIG.GOOGLE_SCRIPT_URL;
    
    // Event listeners
    document.getElementById('startScannerBtn')?.addEventListener('click', () => ScannerModule.startScanner());
    document.getElementById('stopScannerBtn')?.addEventListener('click', () => ScannerModule.stopScanner());
    
    document.getElementById('manualTicketId')?.addEventListener('keypress', e => { if (e.key === 'Enter') ScannerModule.validateManualEntry(); });
    document.getElementById('checkTicketId')?.addEventListener('keypress', e => { if (e.key === 'Enter') App.checkMyTicket(); });
    document.getElementById('adminCode')?.addEventListener('keypress', e => { if (e.key === 'Enter') AdminModule.checkAdminLogin(); });
    
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            AdminModule.closeAdminModal();
            Utils.closeLogDetail();
            App.closeConfirmation();
        }
    });
    
    document.getElementById('adminModal')?.addEventListener('click', function(e) { if (e.target === this) AdminModule.closeAdminModal(); });
    document.getElementById('logDetailModal')?.addEventListener('click', function(e) { if (e.target === this) Utils.closeLogDetail(); });
    document.getElementById('confirmationModal')?.addEventListener('click', function(e) { if (e.target === this) App.closeConfirmation(); });
    
    window.addEventListener('beforeunload', () => {
        App.stopCountdown();
        App.stopRedirectCountdown();
        App.stopProfileAutoRefresh();
        if (typeof ScannerModule !== 'undefined') ScannerModule.stopScanner();
    });
    
    logger.addActivity('Systeme', 'INFO', 'Systeme', 'Demarrage', 'Plateforme BEACH UJA demarree avec profil utilisateur');
    console.log('✅ BEACH UJA Ready - Version 2.3');
    console.log('🔑 Code admin :', CONFIG.SECRET_CODE);
    console.log('👤 Profil utilisateur active');
});
