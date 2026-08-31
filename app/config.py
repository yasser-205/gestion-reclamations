from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    mongo_uri : str
    db_name : str
    jwt_secret : str
    jwt_algorithm : str = "HS256"
    access_token_expire_minutes : int = 60

    resend_api_key : str
    resend_from : str = "onboarding@resend.dev"
    frontend_url : str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()