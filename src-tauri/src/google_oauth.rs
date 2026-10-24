use tokio::net::TcpListener;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tauri::State;
use sqlx::SqlitePool;

#[derive(serde::Serialize, serde::Deserialize)]
pub struct GoogleOAuthConfig {
    pub client_id: Option<String>,
    pub client_secret: Option<String>,
    pub access_token: Option<String>,
    pub refresh_token: Option<String>,
    pub user_email: Option<String>,
    pub user_name: Option<String>,
    pub is_connected: bool,
}

#[tauri::command]
pub async fn get_google_oauth_config(db: State<'_, SqlitePool>) -> Result<GoogleOAuthConfig, String> {
    let client_id: Option<(String,)> = sqlx::query_as("SELECT value FROM system_config WHERE key = 'google_oauth_client_id'")
        .fetch_optional(&*db).await.unwrap_or(None);
    let client_secret: Option<(String,)> = sqlx::query_as("SELECT value FROM system_config WHERE key = 'google_oauth_client_secret'")
        .fetch_optional(&*db).await.unwrap_or(None);
    let access_token: Option<(String,)> = sqlx::query_as("SELECT value FROM system_config WHERE key = 'google_oauth_access_token'")
        .fetch_optional(&*db).await.unwrap_or(None);
    let refresh_token: Option<(String,)> = sqlx::query_as("SELECT value FROM system_config WHERE key = 'google_oauth_refresh_token'")
        .fetch_optional(&*db).await.unwrap_or(None);
    let user_email: Option<(String,)> = sqlx::query_as("SELECT value FROM system_config WHERE key = 'google_oauth_user_email'")
        .fetch_optional(&*db).await.unwrap_or(None);
    let user_name: Option<(String,)> = sqlx::query_as("SELECT value FROM system_config WHERE key = 'google_oauth_user_name'")
        .fetch_optional(&*db).await.unwrap_or(None);

    let is_connected = refresh_token.is_some() || access_token.is_some();

    Ok(GoogleOAuthConfig {
        client_id: client_id.map(|(v,)| v),
        client_secret: client_secret.map(|(v,)| v),
        access_token: access_token.map(|(v,)| v),
        refresh_token: refresh_token.map(|(v,)| v),
        user_email: user_email.map(|(v,)| v),
        user_name: user_name.map(|(v,)| v),
        is_connected,
    })
}

#[tauri::command]
pub async fn save_google_oauth_tokens(
    access_token: String,
    refresh_token: Option<String>,
    user_email: Option<String>,
    user_name: Option<String>,
    db: State<'_, SqlitePool>,
) -> Result<(), String> {
    sqlx::query("INSERT INTO system_config (key, value) VALUES ('google_oauth_access_token', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(&access_token).execute(&*db).await.map_err(|e| e.to_string())?;

    if let Some(rt) = refresh_token {
        sqlx::query("INSERT INTO system_config (key, value) VALUES ('google_oauth_refresh_token', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
            .bind(rt).execute(&*db).await.map_err(|e| e.to_string())?;
    }

    if let Some(em) = user_email {
        sqlx::query("INSERT INTO system_config (key, value) VALUES ('google_oauth_user_email', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
            .bind(em).execute(&*db).await.map_err(|e| e.to_string())?;
    }

    if let Some(nm) = user_name {
        sqlx::query("INSERT INTO system_config (key, value) VALUES ('google_oauth_user_name', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
            .bind(nm).execute(&*db).await.map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn disconnect_google_oauth(db: State<'_, SqlitePool>) -> Result<(), String> {
    let _ = sqlx::query("DELETE FROM system_config WHERE key IN ('google_oauth_access_token', 'google_oauth_refresh_token', 'google_oauth_user_email', 'google_oauth_user_name')")
        .execute(&*db).await;
    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct OAuthCallbackResult {
    pub redirect_uri: String,
    pub code: String,
}

#[tauri::command]
pub async fn start_google_oauth_flow(
    client_id: String,
    client_secret: String,
    db: State<'_, SqlitePool>,
) -> Result<OAuthCallbackResult, String> {
    // 1. Bind local loopback listener on port 0
    let listener = TcpListener::bind("127.0.0.1:0").await.map_err(|e| format!("Failed to start local listener: {}", e))?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let redirect_uri = format!("http://127.0.0.1:{}", port);

    // 2. Persist Client ID & Secret
    sqlx::query("INSERT INTO system_config (key, value) VALUES ('google_oauth_client_id', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(&client_id).execute(&*db).await.map_err(|e| e.to_string())?;
    sqlx::query("INSERT INTO system_config (key, value) VALUES ('google_oauth_client_secret', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(&client_secret).execute(&*db).await.map_err(|e| e.to_string())?;

    // 3. Construct OAuth URL
    let scope = urlencoding_simple("https://www.googleapis.com/auth/drive.file email profile");
    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope={}&access_type=offline&prompt=consent",
        client_id, redirect_uri, scope
    );

    // 4. Open in default browser using Windows cmd
    let _ = std::process::Command::new("cmd")
        .args(["/C", "start", "", &auth_url])
        .spawn();

    // 5. Wait for the browser callback (timeout 120s)
    let (mut socket, _) = tokio::time::timeout(
        std::time::Duration::from_secs(120),
        listener.accept()
    ).await.map_err(|_| "Sign-in timed out. Please try again.".to_string())?
    .map_err(|e| e.to_string())?;

    let mut buf = [0u8; 8192];
    let n = socket.read(&mut buf).await.map_err(|e| e.to_string())?;
    let req = String::from_utf8_lossy(&buf[..n]);

    // Parse code
    let code = if let Some(idx) = req.find("code=") {
        let rest = &req[idx + 5..];
        let end_idx = rest.find('&').or_else(|| rest.find(' ')).unwrap_or(rest.len());
        url_decode_simple(&rest[..end_idx])
    } else if let Some(err_idx) = req.find("error=") {
        let rest = &req[err_idx + 6..];
        let end_idx = rest.find('&').or_else(|| rest.find(' ')).unwrap_or(rest.len());
        return Err(format!("Google sign-in rejected: {}", &rest[..end_idx]));
    } else {
        return Err("No authorization code received from Google.".into());
    };

    // Send pretty HTML success page
    let html = r#"<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Connected - Zawar Traders ERP</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#f0fdf4;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="background:white;padding:40px;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.08);text-align:center;max-width:440px;">
    <div style="font-size:48px;margin-bottom:12px;">✅</div>
    <h2 style="color:#15803d;margin:0 0 8px;">Google Account Connected!</h2>
    <p style="color:#475569;font-size:14px;line-height:1.5;">گوگل اکاؤنٹ کامیابی سے منسلک ہو گیا ہے۔ اب آپ کلاؤڈ بیک اپ بنا سکتے ہیں۔</p>
    <p style="color:#94a3b8;font-size:12px;margin-top:16px;">You can safely close this browser window and return to Zawar Traders ERP.</p>
  </div>
</body>
</html>"#;

    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        html.len(),
        html
    );

    let _ = socket.write_all(response.as_bytes()).await;
    let _ = socket.flush().await;

    Ok(OAuthCallbackResult {
        redirect_uri,
        code,
    })
}

fn urlencoding_simple(s: &str) -> String {
    s.replace(' ', "%20")
     .replace(':', "%3A")
     .replace('/', "%2F")
}

fn url_decode_simple(s: &str) -> String {
    let mut res = String::new();
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '%' {
            let h1 = chars.next().unwrap_or('0');
            let h2 = chars.next().unwrap_or('0');
            let hex_str = format!("{}{}", h1, h2);
            if let Ok(byte) = u8::from_str_radix(&hex_str, 16) {
                res.push(byte as char);
            }
        } else if c == '+' {
            res.push(' ');
        } else {
            res.push(c);
        }
    }
    res
}
