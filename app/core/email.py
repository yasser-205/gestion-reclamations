import resend 
from app.config import settings

resend.api_key = settings.resend_api_key

def envoyer_email_verification(destinataire: str, lien_verification: str):
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

def envoyer_email_cloture(destinataire: str, numero_reclamation: str):
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