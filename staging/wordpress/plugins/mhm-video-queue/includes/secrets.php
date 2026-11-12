<?php
/**
 * Encrypted storage for the posting credentials (OAuth client secrets and tokens).
 *
 * Values are sealed with libsodium secretbox (WordPress bundles sodium_compat, so this works even
 * without the PHP extension). The key comes from the MHM_VQ_KEY constant when wp-config.php defines
 * one, otherwise from the site's SECURE_AUTH salt. If the salts are ever rotated the stored values
 * can't be opened any more: the Settings screen then says so and the platforms need connecting again.
 *
 * Nothing in here is ever printed into a page.
 */

if (!defined('ABSPATH')) {
    exit;
}

function mhm_vq_secret_key() {
    $material = defined('MHM_VQ_KEY') && MHM_VQ_KEY ? (string) MHM_VQ_KEY : wp_salt('secure_auth');
    return hash_hmac('sha256', 'mhm-video-queue/secrets/v1', $material, true);
}

/** Encrypt a string. Returns "v1:<base64>" or '' when sodium is unavailable. */
function mhm_vq_seal($plain) {
    if (!function_exists('sodium_crypto_secretbox')) {
        return '';
    }
    $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
    $box = sodium_crypto_secretbox((string) $plain, $nonce, mhm_vq_secret_key());
    return 'v1:' . base64_encode($nonce . $box);
}

/** Decrypt a value from mhm_vq_seal(). Returns null when it can't be opened. */
function mhm_vq_open($sealed) {
    if (!is_string($sealed) || strpos($sealed, 'v1:') !== 0 || !function_exists('sodium_crypto_secretbox_open')) {
        return null;
    }
    $raw = base64_decode(substr($sealed, 3), true);
    if ($raw === false || strlen($raw) <= SODIUM_CRYPTO_SECRETBOX_NONCEBYTES) {
        return null;
    }
    $nonce = substr($raw, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
    $plain = sodium_crypto_secretbox_open(substr($raw, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES), $nonce, mhm_vq_secret_key());
    return $plain === false ? null : $plain;
}

/** Store an array (or delete it with null) under an option, sealed. Never autoloaded. */
function mhm_vq_put_sealed($option, $value) {
    if ($value === null) {
        delete_option($option);
        return true;
    }
    $sealed = mhm_vq_seal(wp_json_encode($value));
    if ($sealed === '') {
        return false;
    }
    if (get_option($option, null) === null) {
        return add_option($option, $sealed, '', false);
    }
    return update_option($option, $sealed, false);
}

/**
 * Read a sealed array. Returns the array, null when nothing is stored, or false when something is
 * stored but can't be opened (salts changed).
 */
function mhm_vq_get_sealed($option) {
    $sealed = get_option($option, null);
    if ($sealed === null || $sealed === '') {
        return null;
    }
    $plain = mhm_vq_open($sealed);
    if ($plain === null) {
        return false;
    }
    $val = json_decode($plain, true);
    return is_array($val) ? $val : false;
}

/* ---- the two kinds of secret ------------------------------------------- */

function mhm_vq_platforms() {
    return array('youtube' => 'YouTube', 'tiktok' => 'TikTok');
}

/** OAuth client secret for a platform ('' when unset or unreadable). */
function mhm_vq_client_secret($platform) {
    $v = mhm_vq_get_sealed('mhm_vq_client_secret_' . $platform);
    return is_array($v) && isset($v['secret']) ? (string) $v['secret'] : '';
}

function mhm_vq_set_client_secret($platform, $secret) {
    return mhm_vq_put_sealed('mhm_vq_client_secret_' . $platform, $secret === '' ? null : array('secret' => (string) $secret));
}

/**
 * Tokens for a connected account:
 *   { access_token, refresh_token, expires_at, refresh_expires_at?, scope, account, account_id, connected_at, connected_by }
 */
function mhm_vq_tokens($platform) {
    return mhm_vq_get_sealed('mhm_vq_tokens_' . $platform);
}

function mhm_vq_set_tokens($platform, $tokens) {
    return mhm_vq_put_sealed('mhm_vq_tokens_' . $platform, $tokens);
}

function mhm_vq_is_connected($platform) {
    $t = mhm_vq_tokens($platform);
    return is_array($t) && !empty($t['refresh_token']);
}
