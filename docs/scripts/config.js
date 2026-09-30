export default {
  // OAuth client configured as "Code Authorization" grant type with PKCE enabled.
  // NOTE: This is a public client. Do NOT configure or use a client secret in the browser.
  clientID: "code-auth-client-id",

  genesysCloud: {
    // Genesys Cloud region
    // eg. 'mypurecloud.ie', 'euw2.pure.cloud', etc...
    region: "mypurecloud.com",
  },

  /**
   * The OAuth redirect URI is derived at runtime from the current origin so the
   * same code works on localhost and on the hosted (GitHub Pages) deployment.
   * This must exactly match one of the "Authorized redirect URIs" registered on
   * the OAuth client in Genesys Cloud.
   *
   * The pop-out login window lands on this callback page, which hands the
   * authorization code back to the opener (the widget iframe) via postMessage.
   */
  get redirectUri() {
    return `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, "")}oauth/callback.html`;
  },
};
