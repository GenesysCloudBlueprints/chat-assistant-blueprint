/**
 * OAuth pop-out callback page.
 *
 * This page is the redirect target of the pop-out login window. After the user
 * authenticates on the (top-level, non-iframed) Genesys Cloud login page, the
 * browser lands here with an authorization `code` (or an `error`) in the query
 * string. We hand that back to the opener window (the widget iframe running
 * main.js), which performs the PKCE token exchange, then we close ourselves.
 *
 * The authorization code is single-use and, combined with PKCE, is useless
 * without the code_verifier held by the opener, so passing it via postMessage
 * to the known opener origin is safe.
 */

const params = new URLSearchParams(window.location.search);
const message = {
  source: 'genesys-oauth-callback',
  code: params.get('code'),
  state: params.get('state'),
  error: params.get('error'),
  errorDescription: params.get('error_description'),
};

// The opener is served from the same origin as this callback page, so we can
// lock the postMessage target down to our own origin.
const targetOrigin = window.location.origin;

if (window.opener && !window.opener.closed) {
  window.opener.postMessage(message, targetOrigin);
  window.close();
} else {
  // Fallback: opener is gone (e.g. popup was detached). Surface the state so a
  // user isn't left staring at a blank page.
  document.body.innerHTML = message.error
    ? `<p>Sign-in failed: ${message.error}. Please close this window and try again.</p>`
    : '<p>Sign-in complete. You can close this window and return to Genesys Cloud.</p>';
}
