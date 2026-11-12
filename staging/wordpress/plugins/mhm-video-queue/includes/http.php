<?php
/**
 * Small HTTP helper and access-token handling shared by the YouTube and TikTok clients.
 * Error text never includes a token or secret: only the platform's own error code and message.
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Make a request. Returns array(code, headers, body, json) or WP_Error (network failure).
 * Redirects are never followed: YouTube answers resumable chunks with 308, which isn't a redirect.
 */
function mhm_vq_http($method, $url, $args = array()) {
    $args = array_merge(array(
        'method'      => $method,
        'timeout'     => 30,
        'redirection' => 0,
        'headers'     => array(),
        'user-agent'  => 'MHM-Video-Queue/' . MHM_VQ_VERSION . '; ' . home_url('/'),
    ), $args);
    $res = wp_remote_request($url, $args);
    if (is_wp_error($res)) {
        return new WP_Error('mhm_vq_network', 'could not reach ' . wp_parse_url($url, PHP_URL_HOST) . ': ' . $res->get_error_message(), array('retryable' => true));
    }
    $body = (string) wp_remote_retrieve_body($res);
    $json = json_decode($body, true, 512, JSON_BIGINT_AS_STRING);
    return array(
        'code'    => (int) wp_remote_retrieve_response_code($res),
        'headers' => wp_remote_retrieve_headers($res),
        'body'    => $body,
        'json'    => is_array($json) ? $json : null,
    );
}

/** Shorten and strip a platform error message before it is stored or shown. */
function mhm_vq_err_text($text, $max = 300) {
    $text = trim(preg_replace('/\s+/', ' ', wp_strip_all_tags((string) $text)));
    return function_exists('mb_substr') ? mb_substr($text, 0, $max) : substr($text, 0, $max);
}

/**
 * A fresh access token for a connected platform, refreshing it when it is about to expire.
 * Returns the token string or WP_Error.
 */
function mhm_vq_access_token($platform) {
    $labels = mhm_vq_platforms();
    $t = mhm_vq_tokens($platform);
    if ($t === false) {
        return new WP_Error('mhm_vq_unreadable', "The saved {$labels[$platform]} login can't be read (the site's security keys changed). Connect {$labels[$platform]} again in Videos → Posting.", array('retryable' => false));
    }
    if (!$t || empty($t['refresh_token'])) {
        return new WP_Error('mhm_vq_not_connected', "{$labels[$platform]} is not connected.", array('retryable' => false));
    }
    if (!empty($t['access_token']) && (int) ($t['expires_at'] ?? 0) > time() + 120) {
        return $t['access_token'];
    }
    $new = $platform === 'youtube' ? mhm_vq_yt_refresh($t) : mhm_vq_tt_refresh($t);
    if (is_wp_error($new)) {
        return $new;
    }
    $t = array_merge($t, $new);
    mhm_vq_set_tokens($platform, $t);
    return $t['access_token'];
}

/** Where each platform sends the browser back after the consent screen. Must match the app setup exactly. */
function mhm_vq_redirect_uri($platform) {
    return apply_filters('mhm_vq_redirect_uri', rest_url(MHM_VQ_NS . '/oauth/' . $platform), $platform);
}
