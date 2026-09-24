from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SafeSphere AI"

    database_url: str = "sqlite:///./safesphere.db"

    jwt_secret: str
    jwt_expire_minutes: int = 30

    frontend_origins: str = "http://127.0.0.1:5500"

    # Email settings
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = ""

    # Resend Email API settings
    resend_api_key: str = ""
    resend_from_email: str = ""

    # Twilio SMS settings
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()