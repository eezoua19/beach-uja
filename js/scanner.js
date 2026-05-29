// ==================== MODULE SCANNER ====================
const ScannerModule = {
    scanner: null,
    scanning: false,

    testCameraPermission: async function() {
        const d = document.getElementById('scanResult');
        d.innerHTML = '<div class="alert alert-info"><span class="spinner spinner-d"></span> Test de la caméra en cours...</div>';
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "environment" } 
            });
            
            const video = document.createElement('video');
            video.srcObject = stream;
            video.autoplay = true;
            video.playsInline = true;
            video.style.width = '100%';
            video.style.maxWidth = '300px';
            video.style.borderRadius = '12px';
            video.style.marginTop = '10px';
            
            setTimeout(() => {
                stream.getTracks().forEach(track => track.stop());
                d.innerHTML = '<div class="alert alert-ok">✅ Caméra fonctionne parfaitement ! Vous pouvez scanner.</div>';
                setTimeout(() => d.innerHTML = '', 4000);
            }, 3000);
            
            d.innerHTML = '';
            d.appendChild(video);
            
            Utils.toast('✅ Caméra OK !', 'success');
            logger.addActivity('Système', 'INFO', 'Admin', 'Test caméra', 'Test caméra réussi');
            
        } catch(e) {
            console.error('Erreur test caméra:', e);
            let errorMsg = '❌ ';
            
            if (e.name === 'NotAllowedError') {
                errorMsg += 'Permission refusée. Cliquez sur le cadenas 🔒 dans la barre d\'adresse et autorisez la caméra.';
            } else if (e.name === 'NotFoundError') {
                errorMsg += 'Aucune caméra détectée.';
            } else if (e.name === 'NotReadableError') {
                errorMsg += 'Caméra déjà utilisée. Fermez les autres applications.';
            } else {
                errorMsg += `Erreur: ${e.message}`;
            }
            
            d.innerHTML = `<div class="alert alert-err">${errorMsg}</div>`;
            Utils.toast('❌ Échec test caméra', 'error');
            logger.addActivity('Système', 'ERROR', 'Admin', 'Test caméra échoué', errorMsg, {error: e.message});
        }
    },

    startScanner: async function() {
        if (this.scanning) {
            Utils.toast('⚠️ Scanner déjà actif', 'warning');
            return;
        }
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "environment" } 
            });
            stream.getTracks().forEach(track => track.stop());
        } catch (permError) {
            console.error('Erreur permission caméra:', permError);
            let errorMsg = '❌ ';
            if (permError.name === 'NotAllowedError') {
                errorMsg += 'Accès caméra refusé. Autorisez la caméra dans les paramètres du navigateur.';
            } else if (permError.name === 'NotFoundError') {
                errorMsg += 'Aucune caméra trouvée.';
            } else if (permError.name === 'NotReadableError') {
                errorMsg += 'Caméra déjà utilisée. Fermez les autres applications.';
            } else {
                errorMsg += 'Erreur caméra: ' + permError.message;
            }
            Utils.toast(errorMsg, 'error');
            logger.addActivity('Système', 'ERROR', 'Admin', 'Erreur scanner', errorMsg, {error: permError.message});
            return;
        }
        
        const qrReaderDiv = document.getElementById('qr-reader');
        qrReaderDiv.style.display = 'block';
        qrReaderDiv.innerHTML = '';
        
        try {
            this.scanner = new Html5Qrcode('qr-reader');
            
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };
            
            await this.scanner.start(
                { facingMode: "environment" },
                config,
                async (decodedText) => {
                    await this.stopScanner();
                    const d = document.getElementById('scanResult');
                    d.innerHTML = '<div style="background:var(--w);color:#fff;padding:12px;border-radius:12px"><span class="spinner"></span> Validation...</div>';
                    
                    try {
                        const url = document.getElementById('googleScriptUrl').value.trim() || CONFIG.GOOGLE_SCRIPT_URL;
                        const r = await fetch(`${url}?action=validateEntry&qrData=${encodeURIComponent(decodedText)}&code=${CONFIG.SECRET_CODE}`);
                        const j = await r.json();
                        
                        if(j.success){
                            d.innerHTML = `<div style="background:var(--s);color:#fff;padding:16px;border-radius:12px;text-align:center">
                                <div style="font-size:2rem;">✅</div>
                                <strong>${j.message}</strong><br>
                                <span style="font-size:.9rem;opacity:.9">${Utils.esc(j.nom)}</span>
                                ${j.personnesValidees !== undefined ? `<br><small>${j.personnesValidees}/${j.places} personnes validées</small>` : ''}
                            </div>`;
                            logger.addScan(decodedText, j.nom || '', '', 'ENTREE', 'SUCCES', j.message, j.personnesValidees, j.places);
                            logger.addActivity('Scan', 'SUCCESS', j.nom || 'Inconnu', 'Scan QR réussi', `Entrée validée (${j.personnesValidees || 1}/${j.places || 1})`, {ticketId: decodedText, nom: j.nom});
                            Utils.confetti();
                            if (typeof AdminModule !== 'undefined' && AdminModule.refreshData) {
                                AdminModule.refreshData();
                            }
                        } else {
                            d.innerHTML = `<div style="background:var(--d);color:#fff;padding:16px;border-radius:12px;text-align:center">
                                <div style="font-size:2rem;">❌</div>
                                <strong>${j.message}</strong>
                            </div>`;
                            logger.addScan(decodedText, '', '', 'ENTREE', 'ECHEC', j.message, 0, 0);
                            logger.addActivity('Scan', 'WARNING', 'Système', 'Scan QR échoué', j.message, {ticketId: decodedText});
                        }
                    } catch(e) {
                        d.innerHTML = '<div style="background:var(--d);color:#fff;padding:12px;border-radius:12px">❌ Erreur de connexion</div>';
                        logger.addActivity('Scan', 'ERROR', 'Système', 'Erreur scan', 'Erreur de connexion au serveur', {error: e.message});
                    }
                    setTimeout(() => d.innerHTML = '', 6000);
                },
                (errorMessage) => {
                    console.log('Scan en cours...');
                }
            );
            
            this.scanning = true;
            logger.addActivity('Système', 'INFO', 'Admin', 'Scanner activé', 'Scanner QR code démarré');
            Utils.toast('📷 Scanner activé - Scannez un QR code', 'info');
            
        } catch(e) {
            console.error('Erreur démarrage scanner:', e);
            Utils.toast('❌ Impossible de démarrer le scanner: ' + e.message, 'error');
            qrReaderDiv.style.display = 'none';
            logger.addActivity('Système', 'ERROR', 'Admin', 'Erreur scanner', 'Erreur démarrage: ' + e.message, {error: e.message});
        }
    },

    stopScanner: async function() {
        if (this.scanner && this.scanning) {
            try {
                await this.scanner.stop();
                await this.scanner.clear();
            } catch(e) {
                console.error('Erreur arrêt scanner:', e);
            }
            this.scanning = false;
            document.getElementById('qr-reader').style.display = 'none';
            logger.addActivity('Système', 'INFO', 'Admin', 'Scanner arrêté', 'Scanner QR code arrêté');
            Utils.toast('📷 Scanner arrêté', 'info');
        }
    },

    validateManualEntry: async function() {
        const id = document.getElementById('manualTicketId').value.trim();
        if (!id) { Utils.toast('ID requis', 'error'); return; }
        const d = document.getElementById('manualResult');
        d.innerHTML = '<span class="spinner spinner-d"></span> Validation...';
        try {
            const url = document.getElementById('googleScriptUrl').value.trim() || CONFIG.GOOGLE_SCRIPT_URL;
            const r = await fetch(`${url}?action=validateEntry&qrData=${encodeURIComponent(id)}&code=${CONFIG.SECRET_CODE}`);
            const j = await r.json();
            
            if (j.success) {
                d.innerHTML = `<div class="alert alert-ok">
                    ✅ ${j.message} - <strong>${Utils.esc(j.nom)}</strong>
                    ${j.personnesValidees !== undefined ? ` (${j.personnesValidees}/${j.places})` : ''}
                </div>`;
                document.getElementById('manualTicketId').value = '';
                logger.addScan(id, j.nom || '', '', 'MANUEL', 'SUCCES', j.message, j.personnesValidees, j.places);
                logger.addActivity('Scan', 'SUCCESS', 'Admin', 'Validation manuelle', `Ticket validé manuellement: ${Utils.esc(j.nom)}`, {ticketId: id, nom: j.nom});
                Utils.confetti();
                if (typeof AdminModule !== 'undefined' && AdminModule.refreshData) {
                    AdminModule.refreshData();
                }
            } else {
                d.innerHTML = `<div class="alert alert-err">❌ ${j.message}</div>`;
                logger.addActivity('Scan', 'WARNING', 'Admin', 'Validation manuelle échouée', j.message, {ticketId: id});
            }
        } catch(e) {
            d.innerHTML = '<div class="alert alert-err">❌ Erreur de connexion</div>';
        }
        setTimeout(() => d.innerHTML = '', 5000);
    }
};