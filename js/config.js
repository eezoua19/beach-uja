// ==================== CONFIGURATION ====================
const CONFIG = {
    GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxCEY-cz23agaVjbFEfK5wYtG9O4GuKYLYts_IVWTZAMEtCUB3svA6wf8H7PvBe3g2_oQ/exec",
    SECRET_CODE: "BDE2026@@",
    PRIX_PAR_PLACE: 25000,
    
    // Événement
    EVENT_DATE: '2026-06-20T08:00:00', // 20 Juin 2026 à 08:00
    EVENT_LOCATION: 'Songon Park, Jacqueville',
    EVENT_NAME: 'BEACH UJA 2026',

    // Stockage
    LOG_STORAGE_KEY: 'beach_uja_activity_logs',
    SCAN_LOG_KEY: 'beach_uja_scan_logs',
    EMAIL_LOG_KEY: 'beach_uja_email_logs',
    
    // EmailJS par défaut
    emailjs: {
        userId: "",
        serviceId: "",
        templateId: ""
    }
};