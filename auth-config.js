/*
 * Public browser configuration for Supabase Auth.
 *
 * The publishable/anon key is designed to be exposed in a browser. Never put a
 * service_role key, GitHub client secret, or any other private credential here.
 * Copy the values from your Supabase project's Connect dialog after following
 * AUTH_SETUP.md. Leaving either value blank keeps the site in local guest mode.
 */
window.IMAGE_LAB_AUTH_CONFIG = {
  supabaseUrl: '',
  supabasePublishableKey: '',
  cloudBackupEnabled: false
};
