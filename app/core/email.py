import logging
import resend
from app.config import settings

resend.api_key = settings.resend_api_key
logger = logging.getLogger(__name__)

def envoyer_email_verification(destinataire: str, lien_verification: str):
    try:
        resend.Emails.send({
            "from": settings.resend_from,
            "to": destinataire,
            "subject": "Vérifiez votre adresse email — CAT Assurance",
            "html": f"""
                <p>Bonjour,</p>
                <p>Merci de votre inscription. Cliquez sur le lien ci-dessous pour vérifier votre adresse email :</p>
                <p><a href="{lien_verification}">Vérifier mon email</a></p>
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
