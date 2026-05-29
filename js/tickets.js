// ==================== GESTION DES TICKETS ====================
const Tickets = {
    sendEmail: async function(tk) {
        if (!CONFIG.emailjs.userId) {
            Utils.toast('⚠️ Configurez EmailJS dans le panneau admin', 'warning');
            logger.addActivity('Email', 'WARNING', 'Système', 'Tentative envoi email', 'EmailJS non configuré', {email: tk.email, ticketId: tk.id});
            return false;
        }
        
        const startTime = Date.now();
        
        return new Promise(resolve => {
            const places = parseInt(tk.places) || 1;
            const qrCodes = [];
            let generated = 0;
            
            for (let i = 1; i <= places; i++) {
                const qrData = `${tk.id}-P${i}|${tk.codeVerification}-${i}`;
                Utils.genQR(qrData, 300, (qrUrl) => {
                    qrCodes.push({index: i, url: qrUrl, data: qrData});
                    generated++;
                    if (generated === places) {
                        this.sendEmailWithQRs(tk, qrCodes, startTime).then(resolve);
                    }
                });
            }
        });
    },

    sendEmailWithQRs: async function(tk, qrCodes, startTime) {
        const places = qrCodes.length;
        const totalPrice = places * CONFIG.PRIX_PAR_PLACE;
        const prixUnitaire = CONFIG.PRIX_PAR_PLACE.toLocaleString('fr-FR');
        
        let qrHtml = '';
        
        if (places === 1) {
            qrHtml = `
            <div style="text-align:center; padding:20px;">
                <div style="display:inline-block; background:#fff; border:3px dashed #f4a261; border-radius:16px; padding:25px; text-align:center;">
                    <div style="background:#1a5f7a; color:#fff; padding:10px 20px; border-radius:10px; margin-bottom:15px; font-weight:bold; font-size:15px;">
                        🎫 Votre billet
                    </div>
                    <img src="${qrCodes[0].url}" alt="QR Code" style="width:220px; height:220px; display:block; margin:0 auto; border:2px solid #eee; border-radius:8px;">
                    <p style="font-size:10px; color:#999; margin-top:10px; word-break:break-all;">ID: ${qrCodes[0].data}</p>
                </div>
            </div>`;
        } else {
            qrHtml = '<div style="text-align:center;">';
            qrCodes.forEach(qr => {
                qrHtml += `
                <div style="display:inline-block; background:#fff; border:3px dashed #f4a261; border-radius:14px; padding:15px; margin:8px; width:180px; vertical-align:top; text-align:center;">
                    <div style="background:#1a5f7a; color:#fff; padding:8px; border-radius:8px; margin-bottom:10px; font-weight:bold; font-size:13px;">
                        🎫 Billet ${qr.index}/${places}
                    </div>
                    <img src="${qr.url}" alt="QR ${qr.index}" style="width:140px; height:140px; display:block; margin:0 auto; border:2px solid #eee; border-radius:6px;">
                    <p style="font-size:8px; color:#999; margin-top:6px; word-break:break-all;">${qr.data}</p>
                </div>`;
            });
            qrHtml += '</div>';
        }
        
        const messageTexte = places === 1 
            ? `🎉 ${tk.nom}, inscription confirmée !\n📅 20 Juin 2026\n📍 Songon Park\n🎫 1 billet - ${prixUnitaire} FCFA\n⚠️ Aucun remboursement.`
            : `🎉 ${tk.nom}, ${places} inscriptions confirmées !\n📅 20 Juin 2026\n📍 Songon Park\n🎫 ${places} billets - ${totalPrice.toLocaleString('fr-FR')} FCFA\n⚠️ Chaque QR code est unique. Aucun remboursement.`;
        
        try {
            await emailjs.send(
                CONFIG.emailjs.serviceId,
                CONFIG.emailjs.templateId,
                {
                    to_name: tk.nom,
                    to_email: tk.email,
                    ticket_id: tk.id,
                    quantity: places.toString(),
                    total_price: totalPrice.toLocaleString('fr-FR') + ' FCFA',
                    prix_unitaire: prixUnitaire + ' FCFA',
                    event_name: 'BEACH UJA 2026',
                    event_date: '20 Juin 2026',
                    event_location: 'Songon Park, Jacqueville',
                    qr_code_url: qrCodes[0].url,
                    qr_codes_html: qrHtml,
                    message: messageTexte,
                    is_multiple: places > 1 ? 'true' : 'false',
                    total_places: places.toString()
                },
                CONFIG.emailjs.userId
            );
            
            const tempsEnvoi = Date.now() - startTime;
            logger.addEmail(tk.email, tk.id, 'Confirmation', 'Succès', `Email envoyé avec ${places} QR code(s)`, `${tempsEnvoi}ms`);
            logger.addActivity('Email', 'SUCCESS', tk.nom, 'Email envoyé', `Email de confirmation envoyé à ${tk.email} (${places} QR)`, {email: tk.email, ticketId: tk.id, places});
            
            return true;
        } catch(e) {
            const tempsEnvoi = Date.now() - startTime;
            logger.addEmail(tk.email, tk.id, 'Confirmation', 'Échec', e.message, `${tempsEnvoi}ms`);
            logger.addActivity('Email', 'ERROR', tk.nom, 'Échec envoi email', `Erreur: ${e.message}`, {email: tk.email, ticketId: tk.id, error: e.message});
            console.error('Erreur EmailJS:', e);
            return false;
        }
    }
};