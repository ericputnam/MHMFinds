<?php
/**
 * YouTube Data API v3: OAuth and Shorts upload.
 *
 * Scopes: youtube.upload (post) and youtube.readonly (show which channel is connected).
 * A vertical video of 3 minutes or less is a Short; nothing extra is needed in the request.
 * Uploads use the resumable protocol in 8 MiB pieces so a large file never sits in PHP memory.
 */

if (!defined('ABSPATH')) {
    exit;
}

define('MHM_VQ_YT_SCOPES', 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly');
define('MHM_VQ_YT_CHUNK', 8 * 1048576); // must be a multiple of 256 KiB

function mhm_vq_yt_google_error($r) {
    $j = $r['json'] ?? null;
    if (isset($j['error']['message'])) {
        $reason = $j['error']['errors'][0]['reason'] ?? ($j['error']['status'] ?? '');
        return mhm_vq_err_text(($reason ? "$reason: " : '') . $j['error']['message']);
    }
    if (isset($j['error'])) {
        return mhm_vq_err_text($j['error'] . (isset($j['error_description']) ? ': ' . $j['error_description'] : ''));
    }
    return 'HTTP ' . $r['code'];
}

function mhm_vq_yt_auth_url($state, $verifier) {
    $s = mhm_vq_settings();
    return 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query(array(
        'client_id'             => $s['youtube_client_id'],
        'redirect_uri'          => mhm_vq_redirect_uri('youtube'),
        'response_type'         => 'code',
        'scope'                 => MHM_VQ_YT_SCOPES,
        'access_type'           => 'offline',
        'prompt'                => 'consent',
        'include_granted_scopes' => 'false',
        'state'                 => $state,
        'code_challenge'        => rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '='),
        'code_challenge_method' => 'S256',
    ), '', '&', PHP_QUERY_RFC3986);
}

/** Swap the code from the consent screen for tokens. Returns a tokens array or WP_Error. */
function mhm_vq_yt_exchange($code, $verifier) {
    $s = mhm_vq_settings();
    $r = mhm_vq_http('POST', 'https://oauth2.googleapis.com/token', array('body' => array(
        'code'          => $code,
        'client_id'     => $s['youtube_client_id'],
        'client_secret' => mhm_vq_client_secret('youtube'),
        'redirect_uri'  => mhm_vq_redirect_uri('youtube'),
        'grant_type'    => 'authorization_code',
        'code_verifier' => $verifier,
    )));
    if (is_wp_error($r)) {
        return $r;
    }
    if ($r['code'] !== 200 || empty($r['json']['access_token'])) {
        return new WP_Error('mhm_vq_yt_exchange', 'Google refused the login: ' . mhm_vq_yt_google_error($r));
    }
    $j = $r['json'];
    if (empty($j['refresh_token'])) {
        return new WP_Error('mhm_vq_yt_no_refresh', 'Google did not send a refresh token. Remove this app at myaccount.google.com/permissions, then connect again.');
    }
    return array(
        'access_token'  => $j['access_token'],
        'refresh_token' => $j['refresh_token'],
        'expires_at'    => time() + (int) ($j['expires_in'] ?? 3600),
        'scope'         => (string) ($j['scope'] ?? ''),
    );
}

function mhm_vq_yt_refresh($t) {
    $s = mhm_vq_settings();
    $r = mhm_vq_http('POST', 'https://oauth2.googleapis.com/token', array('body' => array(
        'client_id'     => $s['youtube_client_id'],
        'client_secret' => mhm_vq_client_secret('youtube'),
        'refresh_token' => $t['refresh_token'],
        'grant_type'    => 'refresh_token',
    )));
    if (is_wp_error($r)) {
        return $r;
    }
    if ($r['code'] !== 200 || empty($r['json']['access_token'])) {
        $gone = ($r['json']['error'] ?? '') === 'invalid_grant';
        return new WP_Error('mhm_vq_yt_refresh', $gone
            ? 'The YouTube login expired or was revoked. Connect YouTube again in Videos → Posting.'
            : 'Google would not refresh the YouTube login: ' . mhm_vq_yt_google_error($r),
            array('retryable' => !$gone && $r['code'] >= 500));
    }
    return array(
        'access_token' => $r['json']['access_token'],
        'expires_at'   => time() + (int) ($r['json']['expires_in'] ?? 3600),
    );
}

function mhm_vq_yt_revoke($t) {
    if (!empty($t['refresh_token'])) {
        mhm_vq_http('POST', 'https://oauth2.googleapis.com/revoke', array('body' => array('token' => $t['refresh_token']), 'timeout' => 10));
    }
}

/** The connected channel: array(id, title) or WP_Error. */
function mhm_vq_yt_whoami($access_token) {
    $r = mhm_vq_http('GET', 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', array(
        'headers' => array('Authorization' => 'Bearer ' . $access_token),
    ));
    if (is_wp_error($r)) {
        return $r;
    }
    if ($r['code'] !== 200) {
        return new WP_Error('mhm_vq_yt_whoami', 'YouTube: ' . mhm_vq_yt_google_error($r));
    }
    $item = $r['json']['items'][0] ?? null;
    if (!$item) {
        return new WP_Error('mhm_vq_yt_no_channel', 'That Google account has no YouTube channel. Connect again and pick the channel (brand account) on Google\'s screen.');
    }
    return array('id' => (string) $item['id'], 'title' => (string) ($item['snippet']['title'] ?? $item['id']));
}

/**
 * Upload one approved video as a Short. Returns
 *   array('state' => 'posted', 'url', 'remote_id', 'note')  or  WP_Error (data.retryable).
 */
function mhm_vq_yt_post($id) {
    $token = mhm_vq_access_token('youtube');
    if (is_wp_error($token)) {
        return $token;
    }
    $s = mhm_vq_settings();
    $cap = mhm_vq_meta_json($id, '_mhm_captions', array());
    $title = trim((string) ($cap['youtube_title'] ?? ''));
    if ($title === '') {
        return new WP_Error('mhm_vq_yt_title', 'The YouTube title is empty. Add one and approve the video again.', array('retryable' => false));
    }
    $path = trailingslashit(mhm_vq_storage_dir()) . $id . '/video.mp4';
    $size = is_file($path) ? filesize($path) : 0;
    if (!$size) {
        return new WP_Error('mhm_vq_nofile', 'The video file is missing.', array('retryable' => false));
    }
    $privacy = in_array($s['youtube_privacy'], array('public', 'unlisted', 'private'), true) ? $s['youtube_privacy'] : 'private';
    $meta = array(
        'snippet' => array(
            'title'       => $title,
            'description' => (string) ($cap['youtube_description'] ?? ''),
            'categoryId'  => '20', // Gaming
        ),
        'status'  => array(
            'privacyStatus'           => $privacy,
            'selfDeclaredMadeForKids' => false,
        ),
    );

    // 1. Start a resumable session. Nothing exists on YouTube until the last byte arrives.
    $r = mhm_vq_http('POST', 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', array(
        'headers' => array(
            'Authorization'           => 'Bearer ' . $token,
            'Content-Type'            => 'application/json; charset=UTF-8',
            'X-Upload-Content-Type'   => 'video/mp4',
            'X-Upload-Content-Length' => (string) $size,
        ),
        'body'    => wp_json_encode($meta),
    ));
    if (is_wp_error($r)) {
        return $r;
    }
    $session = $r['code'] === 200 ? (string) ($r['headers']['location'] ?? '') : '';
    if ($session === '' || strpos($session, 'https://www.googleapis.com/') !== 0) {
        return new WP_Error('mhm_vq_yt_init', 'YouTube would not start the upload: ' . mhm_vq_yt_google_error($r), array('retryable' => $r['code'] >= 500 || $r['code'] === 429));
    }

    // 2. Send the file in pieces.
    $fh = fopen($path, 'rb');
    if (!$fh) {
        return new WP_Error('mhm_vq_io', 'Could not read the video file.', array('retryable' => false));
    }
    $offset = 0;
    $done = null;
    while ($offset < $size) {
        $len = min(MHM_VQ_YT_CHUNK, $size - $offset);
        $last = ($offset + $len) >= $size;
        fseek($fh, $offset);
        $bytes = fread($fh, $len);
        $r = mhm_vq_http('PUT', $session, array(
            'timeout' => 180,
            'headers' => array(
                'Authorization'  => 'Bearer ' . $token,
                'Content-Type'   => 'video/mp4',
                'Content-Length' => (string) $len,
                'Content-Range'  => 'bytes ' . $offset . '-' . ($offset + $len - 1) . '/' . $size,
            ),
            'body'    => $bytes,
        ));
        if (is_wp_error($r) || !in_array($r['code'], array(200, 201, 308), true)) {
            fclose($fh);
            $why = is_wp_error($r) ? $r->get_error_message() : mhm_vq_yt_google_error($r);
            // If the last piece was sent, YouTube may have the video even though we never got the answer.
            return new WP_Error('mhm_vq_yt_upload', ($last ? 'The upload finished but YouTube\'s answer was lost, so it may have posted. Check the channel before retrying. Details: ' : 'The upload broke off partway: ') . $why,
                array('retryable' => !$last, 'uncertain' => $last));
        }
        if ($r['code'] === 308) {
            $range = (string) ($r['headers']['range'] ?? '');
            $offset = preg_match('/bytes=0-(\d+)/', $range, $m) ? ((int) $m[1] + 1) : ($range === '' ? 0 : $offset + $len);
            continue;
        }
        $done = $r['json'];
        break;
    }
    fclose($fh);
    if (empty($done['id'])) {
        return new WP_Error('mhm_vq_yt_upload', 'YouTube finished the upload but sent no video id. Check the channel before retrying.', array('retryable' => false, 'uncertain' => true));
    }
    $vid = (string) $done['id'];
    $got = (string) ($done['status']['privacyStatus'] ?? $privacy);
    $note = $got !== $privacy
        ? "YouTube set it to $got instead of $privacy (the Google Cloud project hasn't passed YouTube's API audit)."
        : "Posted as $got.";
    return array('state' => 'posted', 'url' => 'https://www.youtube.com/shorts/' . rawurlencode($vid), 'remote_id' => $vid, 'note' => $note);
}
