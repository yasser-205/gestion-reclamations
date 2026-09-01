import logging
import resend
from app.config import settings

resend.api_key = settings.resend_api_key
logger = logging.getLogger(__name__)

def envoyer_email_verification(destinataire: str, code: str):
    try:
        resend.Emails.send({
            "from": settings.resend_from,
            "to": destinataire,
            "subject": "Votre code de vérification — CAT Assurance",
            "html": f"""
                <p>Bonjour,</p>
                <p>Merci de votre inscription. Voici votre code de vérification :</p>
                <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">{code}</p>
                <p>Saisissez ce code sur le site pour finaliser votre inscription. Il est valable 15 minutes.</p>
            """,
        })
    except Exception:
        logger.exception("Échec de l'envoi de l'email de vérification à %s", destinataire)

def envoyer_email_cloture(destinataire: str, numero_reclamation: str):
    try:
        resend.Emails.send({
            "from": settings.resend_from,
            "to": destinataire,
            "subject": f"Réclamation {numero_reclamation} clôturée",
            "html": f"""
                <p>Bonjour,</p>
                <p>Votre réclamation <strong>{numero_reclamation}</strong> a été clôturée.</p>
                <p>Connectez-vous à votre espace pour consulter le détail des échanges.</p>
            """,
        })
    except Exception:
        logger.exception("Échec de l'envoi de l'email de clôture à %s", destinataire)
