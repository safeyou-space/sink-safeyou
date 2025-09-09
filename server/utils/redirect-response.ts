import type { DeviceInfo, SmartLinkOptions } from './device-detection'
import { detectAppFromHost, getEnvironmentBadge } from './apps.config'

const TIMEOUTS = Object.freeze({
  INITIAL_DELAY: 50,
  APP_ATTEMPT: 1500,
  FALLBACK_SHOW: 2000,
  FORCE_REDIRECT: 3000,
  // iOS specific timeouts
  IOS_APP_DETECTION: 2500,
  IOS_QUICK_CHECK: 1000,
} as const)

const HEADERS = Object.freeze({
  CONTENT_TYPE: 'text/html; charset=utf-8',
  SECURITY: 'nosniff',
} as const)

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

function safeJsonStringify(obj: any): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/'/g, '\\u0027')
}

function setSecureHeaders(event: any): void {
  try {
    setHeader(event, 'Content-Type', HEADERS.CONTENT_TYPE)
    setHeader(event, 'X-Content-Type-Options', HEADERS.SECURITY)
    setHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin')
  }
  catch (error) {
    console.warn('Failed to set security headers:', error)
  }
}

function generateAppStyles(config: SmartLinkOptions): string {
  const appName = config.appName || 'safeyou'
  const environment = config.environment || 'production'

  // App-specific color schemes
  const appColors: Record<string, any> = {
    safeyou: {
      production: { primary: '#6b46c1', secondary: '#9333ea', tertiary: '#c026d3' },
      staging: { primary: '#dc2626', secondary: '#ea580c', tertiary: '#f59e0b' },
      development: { primary: '#059669', secondary: '#0d9488', tertiary: '#06b6d4' },
    },
    youtube: {
      production: { primary: '#ff0000', secondary: '#cc0000', tertiary: '#990000' },
    },
    facebook: {
      production: { primary: '#1877f2', secondary: '#166fe5', tertiary: '#1467d8' },
    },
    whatsapp: {
      production: { primary: '#25d366', secondary: '#1faa4f', tertiary: '#198c3f' },
    },
    spotify: {
      production: { primary: '#1db954', secondary: '#1ca64c', tertiary: '#189443' },
    },
  }

  const defaultColors = { primary: '#6b46c1', secondary: '#9333ea', tertiary: '#c026d3' }
  const colors = appColors[appName]?.[environment] || appColors[appName]?.production || defaultColors

  return `<style>
*{margin:0;padding:0;box-sizing:border-box}
body{
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  background:linear-gradient(135deg,${colors.primary} 0%,${colors.secondary} 50%,${colors.tertiary} 100%);
  color:#fff;
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:20px;
  position:relative;
  overflow:hidden;
}
.container{
  max-width:400px;
  text-align:center;
  background:rgba(255,255,255,0.15);
  backdrop-filter:blur(20px);
  border-radius:24px;
  padding:40px 30px;
  border:1px solid rgba(255,255,255,0.2);
  box-shadow:0 20px 40px rgba(0,0,0,0.1);
  position:relative;
  z-index:2;
}
.logo{
  width:80px;
  height:80px;
  background:#fff;
  border-radius:20px;
  margin:0 auto 24px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:bold;
  color:${colors.primary};
  font-size:${config.logo && config.logo.length > 2 ? '24px' : '32px'};
  box-shadow:0 8px 32px rgba(0,0,0,0.1);
  position:relative;
}
h1{font-size:28px;margin-bottom:12px;font-weight:700;text-shadow:0 2px 4px rgba(0,0,0,0.1)}
.status{font-size:16px;opacity:0.9;margin-bottom:32px;font-weight:500}
.spinner{
  width:40px;
  height:40px;
  margin:20px auto;
  border:3px solid rgba(255,255,255,0.3);
  border-top:3px solid #fff;
  border-radius:50%;
  animation:spin 1s linear infinite;
}
@keyframes spin{
  0%{transform:rotate(0deg)}
  100%{transform:rotate(360deg)}
}
.fallback{
  margin-top:40px;
  padding:24px;
  background:rgba(255,255,255,0.1);
  border-radius:16px;
  backdrop-filter:blur(10px);
  display:none;
  border:1px solid rgba(255,255,255,0.15);
}
.fallback h3{
  font-size:18px;
  margin-bottom:16px;
  font-weight:600;
}
.fallback p{
  font-size:14px;
  opacity:0.9;
  margin-bottom:20px;
  line-height:1.5;
}
.fallback a{
  color:#fff;
  text-decoration:none;
  font-weight:600;
  padding:12px 24px;
  background:rgba(255,255,255,0.2);
  border-radius:8px;
  display:inline-block;
  margin:8px 4px;
  transition:all 0.3s ease;
  font-size:14px;
  border:1px solid rgba(255,255,255,0.2);
  min-width:140px;
}
.fallback a:hover{
  background:rgba(255,255,255,0.3);
  transform:translateY(-2px);
  box-shadow:0 8px 20px rgba(0,0,0,0.15);
}
.env-badge{
  position:absolute;
  top:20px;
  right:20px;
  padding:8px 16px;
  background:rgba(255,255,255,0.2);
  border-radius:24px;
  font-size:12px;
  text-transform:uppercase;
  font-weight:700;
  letter-spacing:0.8px;
  backdrop-filter:blur(10px);
  border:1px solid rgba(255,255,255,0.2);
  z-index:3;
}
.background-blur{
  position:absolute;
  top:-50%;
  left:-50%;
  width:200%;
  height:200%;
  background:radial-gradient(circle,rgba(255,255,255,0.1) 0%,transparent 70%);
  animation:float 6s ease-in-out infinite;
  z-index:1;
}
@keyframes float{
  0%,100%{transform:translate(0,0) rotate(0deg)}
  33%{transform:translate(30px,-30px) rotate(120deg)}
  66%{transform:translate(-20px,20px) rotate(240deg)}
}
</style>`
}

export function generateAutoRedirectResponse(event: any, config: SmartLinkOptions, device: DeviceInfo, context?: any): string {
  setSecureHeaders(event)

  const environment = context?.environment || 'production'
  const appName = config.appName || detectAppFromHost(context?.requestHost || '')
  const envBadge = getEnvironmentBadge(context?.host || context?.requestHost || '')

  // Generate app-specific meta tags
  const iosMetaTags = config.iosAppId
    ? `
<meta name="apple-itunes-app" content="app-id=${config.iosAppId}">
<meta property="al:ios:app_store_id" content="${config.iosAppId}">
<meta property="al:ios:app_name" content="${config.name || config.displayName || 'App'}">
<meta property="al:ios:url" content="${config.iosUrlScheme}://open?url=${encodeURIComponent(config.target)}&env=${environment}">
<link rel="alternate" href="ios-app://${config.iosAppId}/${config.iosUrlScheme}/open?url=${encodeURIComponent(config.target)}&env=${environment}">`
    : ''

  const androidMetaTags = config.androidPackageName
    ? `
<meta property="al:android:package" content="${config.androidPackageName}">
<meta property="al:android:app_name" content="${config.androidAppName || config.name || 'App'}">
<meta property="al:android:url" content="${config.androidUrlScheme}://${config.androidHost || 'open'}?url=${encodeURIComponent(config.target)}&env=${environment}">
<link rel="alternate" href="android-app://${config.androidPackageName}/${config.androidUrlScheme}/${config.androidHost || 'open'}?url=${encodeURIComponent(config.target)}&env=${environment}">`
    : ''

  const configWithAppName = { ...config, appName }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no,viewport-fit=cover">
<title>${config.displayName || config.name || 'App'} - Opening App...</title>
<meta name="description" content="Opening ${config.displayName || config.name || 'App'} for ${environment} environment">
<meta name="theme-color" content="${config.themeColor || '#6b46c1'}">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
${iosMetaTags}${androidMetaTags}
${generateAppStyles(configWithAppName)}
</head>
<body>
<div class="background-blur"></div>
<div class="env-badge">${envBadge}</div>
<div class="container">
  <div class="logo">${config.logo || config.displayName?.charAt(0) || 'A'}</div>
  <h1 id="title">Opening ${config.displayName || config.name || 'App'}</h1>
  <div class="spinner" id="spinner"></div>
  <div class="status" id="status">Launching ${config.displayName || config.name || 'App'} for ${environment}</div>

  <div class="fallback" id="fallback">
    <h3>Choose an option</h3>
    <p>Access ${config.displayName || config.name || 'the app'} in your preferred way:</p>
    <div>
      ${config.iosAppId && device.isIOS
        ? `
        <a href="https://apps.apple.com/app/id${config.iosAppId}" id="appstore-link">Download from App Store</a>
      `
        : ''}
      ${config.androidPackageName && device.isAndroid
        ? `
        <a href="https://play.google.com/store/apps/details?id=${config.androidPackageName}" id="playstore-link">Get on Play Store</a>
      `
        : ''}
    </div>
  </div>
</div>

${generateRedirectScript(config, device, context)}
</body>
</html>`
}

export function generateSocialMetaResponse(event: any, config: SmartLinkOptions): string {
  setSecureHeaders(event)

  const escapedTarget = escapeHtml(config.target)
  const environment = config.environment || 'production'
  const appName = config.displayName || config.name || 'App'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${appName} Link</title>
<meta name="description" content="${appName} link for ${environment}">
<meta property="og:title" content="${appName} Link">
<meta property="og:description" content="${appName} link for ${environment}">
<meta property="og:type" content="website">
<meta property="og:url" content="${escapedTarget}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${appName} Link">
<meta name="twitter:description" content="${appName} link for ${environment}">
</head>
<body>
<h1>${appName} Link</h1>
<p>This is a ${appName} link for ${environment} environment.</p>
<a href="${escapedTarget}">Visit Link</a>
</body>
</html>`
}

function generateRedirectScript(config: SmartLinkOptions, device: DeviceInfo, context: any): string {
  const environment = context?.environment || 'production'
  const appName = config.appName || 'safeyou'

  const scriptConfig = {
    target: config.target,
    environment,
    appName,
    device: {
      isIOS: device.isIOS,
      isAndroid: device.isAndroid,
      isMobile: device.isMobile,
      isInAppBrowser: device.isInAppBrowser,
    },
    app: {
      iosScheme: config.iosUrlScheme,
      iosUniversalLink: config.iosUniversalLink,
      iosAppId: config.iosAppId,
      androidScheme: config.androidUrlScheme,
      androidHost: config.androidHost,
      androidPackage: config.androidPackageName,
      webUrl: config.webUrl,
      name: config.name,
      displayName: config.displayName,
    },
    timeouts: TIMEOUTS,
  }

  return `<script>
(function() {
  'use strict';

  const CONFIG = ${safeJsonStringify(scriptConfig)};
  let redirected = false;
  let appLaunchAttempted = false;
  let appOpenDetected = false;
  let isIOS = CONFIG.device.isIOS;
  let isAndroid = CONFIG.device.isAndroid;
  let startTime = Date.now();
  let fallbackTimer = null;
  let appLaunchTimer = null;
  let storeRedirectTimer = null;

  function log(msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[DeepLink-' + CONFIG.appName + '] ' + msg);
    }
  }
  
  function closeWindow() {
    try {
      if (window.opener) {
        window.close();
      }
    } catch (e) {
      log('Cannot close window: ' + e.message);
    }
  }

  function redirectToAppStore() {
    if (redirected) return false;
    
    if (isIOS && CONFIG.app.iosAppId) {
      log('Redirecting to App Store for iOS');
      redirected = true;
      const appStoreUrl = 'https://apps.apple.com/app/id' + CONFIG.app.iosAppId;
      window.location.href = appStoreUrl;
      setTimeout(closeWindow, 1000);
      return true;
    } else if (isAndroid && CONFIG.app.androidPackage) {
      log('Redirecting to Play Store for Android');
      redirected = true;
      const playStoreUrl = 'https://play.google.com/store/apps/details?id=' + CONFIG.app.androidPackage;
      window.location.href = playStoreUrl;
      setTimeout(closeWindow, 1000);
      return true;
    }
    
    log('Cannot redirect to app store - missing required configuration');
    return false;
  }

  function redirect() {
    if (redirected) return;
    redirected = true;
    log('Redirecting to browser: ' + CONFIG.target);
    window.location.href = CONFIG.target;
  }

  function showFallback() {
    if (redirected) return;
    log('Showing fallback options');

    const title = document.getElementById('title');
    const status = document.getElementById('status');
    const spinner = document.getElementById('spinner');
    const fallback = document.getElementById('fallback');

    if (title) title.textContent = 'Choose an Option';
    if (status) status.textContent = 'Select how you\\'d like to access ' + (CONFIG.app.displayName || CONFIG.app.name || 'the app');
    if (spinner) spinner.style.display = 'none';
    if (fallback) fallback.style.display = 'block';
  }

  function clearAllTimers() {
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    if (appLaunchTimer) {
      clearTimeout(appLaunchTimer);
      appLaunchTimer = null;
    }
    if (storeRedirectTimer) {
      clearTimeout(storeRedirectTimer);
      storeRedirectTimer = null;
    }
  }

  function buildIOSSchemeUrl(baseScheme, targetUrl, env) {
    if (!baseScheme) return null;
    const scheme = baseScheme.replace(/:\\/\\/$/, '');
    return scheme + '://open?url=' + encodeURIComponent(targetUrl);
  }

  function setupIOSAppDetection() {
    let detectionActive = true;
    
    const detectAppOpen = (source) => {
      if (detectionActive && !appOpenDetected) {
        appOpenDetected = true;
        detectionActive = false;
        clearAllTimers();
        log('iOS app opened detected via: ' + source);
        setTimeout(closeWindow, 500);
      }
    };

    const visibilityHandler = () => {
      if (document.hidden && detectionActive) {
        detectAppOpen('visibilitychange');
      }
    };

    const blurHandler = () => {
      if (detectionActive) {
        detectAppOpen('blur');
      }
    };

    const focusHandler = () => {
      if (!appOpenDetected && detectionActive) {
        const timeDiff = Date.now() - startTime;
        if (timeDiff < 1000) {
          detectionActive = false;
          setTimeout(() => {
            if (!redirected) {
              redirectToAppStore();
            }
          }, 100);
        }
      }
    };

    const pagehideHandler = () => {
      if (detectionActive) {
        detectAppOpen('pagehide');
      }
    };

    document.addEventListener('visibilitychange', visibilityHandler);
    window.addEventListener('blur', blurHandler);
    window.addEventListener('focus', focusHandler);
    window.addEventListener('pagehide', pagehideHandler);
    
    return () => {
      detectionActive = false;
      document.removeEventListener('visibilitychange', visibilityHandler);
      window.removeEventListener('blur', blurHandler);
      window.removeEventListener('focus', focusHandler);
      window.removeEventListener('pagehide', pagehideHandler);
    };
  }

  function setupAndroidAppDetection() {
    let detectionActive = true;
    let detectionStartTime = Date.now();
    
    const detectAppOpen = (source) => {
      if (detectionActive && !appOpenDetected) {
        appOpenDetected = true;
        detectionActive = false;
        clearAllTimers();
        log('Android app opened detected via: ' + source);
        setTimeout(closeWindow, 500);
      }
    };

    const visibilityHandler = () => {
      if (document.hidden && detectionActive) {
        // Only detect if enough time has passed (app launch takes some time)
        const timeDiff = Date.now() - detectionStartTime;
        if (timeDiff > 300) {
          detectAppOpen('visibilitychange');
        }
      }
    };

    const blurHandler = () => {
      if (detectionActive) {
        const timeDiff = Date.now() - detectionStartTime;
        if (timeDiff > 300) {
          detectAppOpen('blur');
        }
      }
    };

    const focusHandler = () => {
      if (!appOpenDetected && detectionActive) {
        const timeDiff = Date.now() - detectionStartTime;
        // If focus returns quickly, likely the app didn't open
        if (timeDiff < 2000 && timeDiff > 100) {
          log('Focus returned quickly - app likely not installed');
          detectionActive = false;
          setTimeout(() => {
            if (!redirected) {
              redirectToAppStore();
            }
          }, 100);
        }
      }
    };

    const pagehideHandler = () => {
      if (detectionActive) {
        const timeDiff = Date.now() - detectionStartTime;
        if (timeDiff > 300) {
          detectAppOpen('pagehide');
        }
      }
    };

    document.addEventListener('visibilitychange', visibilityHandler);
    window.addEventListener('blur', blurHandler);
    window.addEventListener('focus', focusHandler);
    window.addEventListener('pagehide', pagehideHandler);
    
    setTimeout(() => {
      if (detectionActive && !appOpenDetected && !redirected) {
        detectionActive = false;
        log('Android app detection timeout - redirecting to Play Store');
        redirectToAppStore();
      }
    }, 3000);
    
    return () => {
      detectionActive = false;
      document.removeEventListener('visibilitychange', visibilityHandler);
      window.removeEventListener('blur', blurHandler);
      window.removeEventListener('focus', focusHandler);
      window.removeEventListener('pagehide', pagehideHandler);
    };
  }

  async function tryAppLaunch() {
    if (redirected || appLaunchAttempted) return;
    appLaunchAttempted = true;

    let cleanupDetection = null;
    
    if (isIOS) {
      cleanupDetection = setupIOSAppDetection();
      startTime = Date.now();

      let schemeUrl = null;
      if (CONFIG.appName === 'safeyou' || !CONFIG.appName) {
        schemeUrl = buildIOSSchemeUrl(CONFIG.app.iosScheme, CONFIG.target, CONFIG.environment);
      }

      if (schemeUrl) {
        try {
          window.location.href = schemeUrl;
        } catch (error) {
          if (cleanupDetection) cleanupDetection();
          redirectToAppStore();
          return;
        }

        fallbackTimer = setTimeout(() => {
          if (!appOpenDetected && !redirected) {
            log('iOS app detection timeout - redirecting to App Store');
            if (cleanupDetection) cleanupDetection();
            redirectToAppStore();
          }
        }, CONFIG.timeouts.IOS_APP_DETECTION);

      } else {
        if (cleanupDetection) cleanupDetection();
        redirectToAppStore();
      }

    } else if (isAndroid) {
      cleanupDetection = setupAndroidAppDetection();
      
      let intentUrl = null;

      if ((CONFIG.appName === 'safeyou' || !CONFIG.appName) && CONFIG.app.androidPackage) {
        const androidScheme = CONFIG.app.androidScheme || 'https';
        const androidHost = CONFIG.app.androidHost || 'open';
        
        // Build proper intent URL
        const intentParams = [
          'scheme=' + androidScheme,
          'package=' + CONFIG.app.androidPackage,
          'action=android.intent.action.VIEW'
        ];

        if (androidScheme !== 'https') {
          intentParams.push('category=android.intent.category.BROWSABLE');
        }

        intentUrl = 'intent://' + androidHost + '?url=' + encodeURIComponent(CONFIG.target) + '&env=' + CONFIG.environment + 
                   '#Intent;' + intentParams.join(';') + ';end';
      }

      if (intentUrl) {
        try {
          log('Attempting to launch Android app with intent: ' + intentUrl);
          window.location.href = intentUrl;
        } catch (error) {
          log('Error launching Android app: ' + error.message);
          if (cleanupDetection) cleanupDetection();
          redirectToAppStore();
          return;
        }
      } else {
        if (cleanupDetection) cleanupDetection();
        showFallback();
      }
    } else {
      redirect();
    }
  }

  function init() {
    log('Config: ' + JSON.stringify({
      target: CONFIG.target,
      appName: CONFIG.appName,
      environment: CONFIG.environment,
      iosScheme: CONFIG.app.iosScheme,
      iosAppId: CONFIG.app.iosAppId,
      androidPackage: CONFIG.app.androidPackage,
      device: CONFIG.device
    }));

    if (!CONFIG.target) {
      showFallback();
      return;
    }

    if (!CONFIG.device.isMobile) {
      setTimeout(redirect, CONFIG.timeouts.INITIAL_DELAY);
      return;
    }

    if (CONFIG.device.isInAppBrowser) {
      setTimeout(redirect, CONFIG.timeouts.INITIAL_DELAY);
      return;
    }

    if (isIOS && !CONFIG.app.iosAppId) {
      showFallback();
      return;
    }

    if (isAndroid && !CONFIG.app.androidPackage) {
      showFallback();
      return;
    }

    setTimeout(tryAppLaunch, CONFIG.timeouts.INITIAL_DELAY);

    // Final fallback - force redirect after maximum time
    setTimeout(() => {
      if (!redirected && !appOpenDetected && !window.closed) {
        clearAllTimers();
        log('Force redirect timeout reached');
        
        if ((isIOS && CONFIG.app.iosAppId) || (isAndroid && CONFIG.app.androidPackage)) {
          redirectToAppStore();
        } else {
          redirect();
        }
      }
    }, CONFIG.timeouts.FORCE_REDIRECT);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, CONFIG.timeouts.INITIAL_DELAY);
  }

})();
</script>`
}
