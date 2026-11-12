<?php
/**
 * TikTok Content Posting API (v2).
 *
 * Two modes (Videos → Posting):
 *   inbox  - /v2/post/publish/inbox/video/init/ : the video arrives as a draft in the account's TikTok inbox
 *            and a person finishes the post in the app. Needs scope video.upload. Works before the audit.
 *   direct - /v2/post/publish/video/init/ : posts straight to the profile with the privacy and interaction
 *            settings the reviewer picked when approving. Needs scope video.publish and, to post publicly,
 *            TikTok's Direct Post audit. creator_info is queried right before every direct post, as TikTok requires.
 */

if (!defined('ABSPATH')) {
    exit;
}

define('MHM_VQ_TT_API', 'https://open.tiktokapis.com');

function mhm_vq_tt_error($r) {
    $j = $r['json'] ?? null;
    if (isset($j['error']['code']) && $j['error']['code'] !== 'ok') {
        return mhm_vq_err_text($j['error']['code'] . (empty($j['error']['message']) ? '' : ': ' . $j['error']['message']));
    }
    if (isset($j['error']) && is_string($j['error'])) {
        return mhm_vq_err_text($j['error'] . (empty($j['error_description']) ? '' : ': ' . $j['error_description']));
    }
    return 'HTTP ' . $r['code'];
}

function mhm_vq_tt_ok($r) {
    return $r['code'] === 200 && is_array($r['json']) && (($r['json']['error']['code'] ?? 'ok') === 'ok');
}

function mhm_vq_tt_auth_url($state, $mode) {
    $s = mhm_vq_settings();
    $scopes = array('user.info.basic', 'video.upload');
    if ($mode === 'direct') {
        $scopes[] = 'video.publish';
    }
    return 'https://www.tiktok.com/v2/auth/authorize/?' . http_build_query(array(
        'client_key'    => $s['tiktok_client_key'],
        'scope'         => implode(',', $scopes),
        'response_type' => 'code',
        'redirect_uri'  => mhm_vq_redirect_uri('tiktok'),
        'state'         => $state,
    ), '', '&', PHP_QUERY_RFC3986);
}

function mhm_vq_tt_token_response($r, $what) {
    if (is_wp_error($r)) {
        return $r;
    }
    $j = $r['json'];
    if ($r['code'] !== 200 || empty($j['access_token'])) {
        $gone = in_array($j['error'] ?? '', array('invalid_grant', 'invalid_request'), true) && $what === 'refresh';
        return new WP_Error('mhm_vq_tt_token', $gone
            ? 'The TikTok login expired or was revoked. Connect TikTok again in Videos → Posting.'
            : "TikTok refused the $what: " . mhm_vq_tt_error($r),
            array('retryable' => !$gone && $r['code'] >= 500));
    }
    $out = array(
        'access_token'       => $j['access_token'],
        'expires_at'         => time() + (int) ($j['expires_in'] ?? 86400),
        'refresh_token'      => (string) ($j['refresh_token'] ?? ''),
        'refresh_expires_at' => time() + (int) ($j['refresh_expires_in'] ?? 31536000),
        'scope'              => (string) ($j['scope'] ?? ''),
        'open_id'            => (string) ($j['open_id'] ?? ''),
    );
    if ($out['refresh_token'] === '') {
        unset($out['refresh_token'], $out['refresh_expires_at']); // keep the stored one
    }
    return $out;
}

function mhm_vq_tt_exchange($code) {
    $s = mhm_vq_settings();
    $t = mhm_vq_tt_token_response(mhm_vq_http('POST', MHM_VQ_TT_API . '/v2/oauth/token/', array('body' => array(
        'client_key'    => $s['tiktok_client_key'],
        'client_secret' => mhm_vq_client_secret('tiktok'),
        'code'          => $code,
        'grant_type'    => 'authorization_code',
        'redirect_uri'  => mhm_vq_redirect_uri('tiktok'),
    ))), 'login');
    if (!is_wp_error($t) && empty($t['refresh_token'])) {
        return new WP_Error('mhm_vq_tt_no_refresh', 'TikTok sent no refresh token. Connect again.');
    }
    return $t;
}

/** TikTok rotates the refresh token on every refresh; the caller stores whatever comes back. */
function mhm_vq_tt_refresh($t) {
    $s = mhm_vq_settings();
    return mhm_vq_tt_token_response(mhm_vq_http('POST', MHM_VQ_TT_API . '/v2/oauth/token/', array('body' => array(
        'client_key'    => $s['tiktok_client_key'],
        'client_secret' => mhm_vq_client_secret('tiktok'),
        'grant_type'    => 'refresh_token',
        'refresh_token' => $t['refresh_token'],
    ))), 'refresh');
}

function mhm_vq_tt_revoke($t) {
    if (empty($t['access_token'])) {
        return;
    }
    $s = mhm_vq_settings();
    mhm_vq_http('POST', MHM_VQ_TT_API . '/v2/oauth/revoke/', array('timeout' => 10, 'body' => array(
        'client_key'    => $s['tiktok_client_key'],
        'client_secret' => mhm_vq_client_secret('tiktok'),
        'token'         => $t['access_token'],
    )));
}

function mhm_vq_tt_api($method, $path, $token, $body = null) {
    $args = array('headers' => array('Authorization' => 'Bearer ' . $token));
    if ($body !== null) {
        $args['headers']['Content-Type'] = 'application/json; charset=UTF-8';
        $args['body'] = wp_json_encode($body);
    }
    return mhm_vq_http($method, MHM_VQ_TT_API . $path, $args);
}

/** The connected account: array(id, title) or WP_Error. */
function mhm_vq_tt_whoami($token) {
    $r = mhm_vq_tt_api('GET', '/v2/user/info/?fields=open_id,display_name', $token);
    if (is_wp_error($r)) {
        return $r;
    }
    if (!mhm_vq_tt_ok($r) || empty($r['json']['data']['user'])) {
        return new WP_Error('mhm_vq_tt_whoami', 'TikTok: ' . mhm_vq_tt_error($r));
    }
    $u = $r['json']['data']['user'];
    return array('id' => (string) ($u['open_id'] ?? ''), 'title' => (string) ($u['display_name'] ?? 'TikTok account'));
}

/**
 * What the account may post right now (privacy options, interaction switches, max length).
 * Cached for 10 minutes for the Approve form; $fresh = true always asks TikTok (used before posting).
 */
function mhm_vq_tt_creator_info($fresh = false) {
    if (!$fresh) {
        $c = get_transient('mhm_vq_tt_creator');
        if (is_array($c)) {
            return $c;
        }
    }
    $token = mhm_vq_access_token('tiktok');
    if (is_wp_error($token)) {
        return $token;
    }
    $r = mhm_vq_tt_api('POST', '/v2/post/publish/creator_info/query/', $token, (object) array());
    if (is_wp_error($r)) {
        return $r;
    }
    if (!mhm_vq_tt_ok($r) || empty($r['json']['data'])) {
        // spam_risk_too_many_posts / reached_active_user_cap etc. mean "can't post right now".
        return new WP_Error('mhm_vq_tt_creator', 'TikTok won\'t take a post from this account right now: ' . mhm_vq_tt_error($r), array('retryable' => false));
    }
    $d = $r['json']['data'];
    $c = array(
        'creator_username'            => (string) ($d['creator_username'] ?? ''),
        'creator_nickname'            => (string) ($d['creator_nickname'] ?? ''),
        'privacy_level_options'       => array_values(array_map('strval', (array) ($d['privacy_level_options'] ?? array()))),
        'comment_disabled'            => !empty($d['comment_disabled']),
        'duet_disabled'               => !empty($d['duet_disabled']),
        'stitch_disabled'             => !empty($d['stitch_disabled']),
        'max_video_post_duration_sec' => (int) ($d['max_video_post_duration_sec'] ?? 0),
    );
    set_transient('mhm_vq_tt_creator', $c, 10 * MINUTE_IN_SECONDS);
    return $c;
}

function mhm_vq_tt_privacy_label($v) {
    $l = array(
        'PUBLIC_TO_EVERYONE'    => 'Everyone',
        'MUTUAL_FOLLOW_FRIENDS' => 'Friends',
        'FOLLOWER_OF_CREATOR'   => 'Followers',
        'SELF_ONLY'             => 'Only me',
    );
    return $l[$v] ?? $v;
}

/** Defaults for a video's TikTok direct-post choices. Nothing is pre-selected, as TikTok requires. */
function mhm_vq_tt_opts($id) {
    return array_merge(array(
        'privacy_level'   => '',
        'allow_comment'   => false,
        'allow_duet'      => false,
        'allow_stitch'    => false,
        'commercial'      => false,
        'brand_organic'   => false,
        'brand_content'   => false,
    ), mhm_vq_meta_json($id, '_mhm_tiktok_opts', array()));
}

/** Read and check the TikTok choices from the Approve form. Returns the opts array or a message key. */
function mhm_vq_tt_opts_from_post($post) {
    $tt = isset($post['tt']) && is_array($post['tt']) ? $post['tt'] : array();
    $o = array(
        'privacy_level' => sanitize_text_field((string) ($tt['privacy_level'] ?? '')),
        'allow_comment' => !empty($tt['allow_comment']),
        'allow_duet'    => !empty($tt['allow_duet']),
        'allow_stitch'  => !empty($tt['allow_stitch']),
        'commercial'    => !empty($tt['commercial']),
        'brand_organic' => !empty($tt['brand_organic']),
        'brand_content' => !empty($tt['brand_content']),
    );
    if (!$o['commercial']) {
        $o['brand_organic'] = $o['brand_content'] = false;
    }
    $known = array('PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY');
    $c = get_transient('mhm_vq_tt_creator');
    $allowed = is_array($c) && $c['privacy_level_options'] ? $c['privacy_level_options'] : $known;
    if (!in_array($o['privacy_level'], $allowed, true)) {
        return 'ttprivacy';
    }
    if ($o['commercial'] && !$o['brand_organic'] && !$o['brand_content']) {
        return 'ttcommercial';
    }
    if ($o['brand_content'] && $o['privacy_level'] === 'SELF_ONLY') {
        return 'ttbranded';
    }
    return $o;
}

/**
 * Start a TikTok post and upload the file. Returns
 *   array('state' => 'processing', 'publish_id', 'note')  or  WP_Error (data.retryable).
 * The result is read later with mhm_vq_tt_poll().
 */
function mhm_vq_tt_post($id) {
    $token = mhm_vq_access_token('tiktok');
    if (is_wp_error($token)) {
        return $token;
    }
    $s = mhm_vq_settings();
    $path = trailingslashit(mhm_vq_storage_dir()) . $id . '/video.mp4';
    $size = is_file($path) ? filesize($path) : 0;
    if (!$size) {
        return new WP_Error('mhm_vq_nofile', 'The video file is missing.', array('retryable' => false));
    }
    // One piece up to 64 MB; above that 10 MB pieces with the remainder added to the last one.
    if ($size <= 64 * 1048576) {
        $chunk = $size;
        $count = 1;
    } else {
        $chunk = 10 * 1048576;
        $count = (int) floor($size / $chunk);
    }
    $source = array('source' => 'FILE_UPLOAD', 'video_size' => $size, 'chunk_size' => $chunk, 'total_chunk_count' => $count);

    if ($s['tiktok_mode'] === 'direct') {
        $o = mhm_vq_tt_opts($id);
        if ($o['privacy_level'] === '') {
            return new WP_Error('mhm_vq_tt_opts', 'No TikTok privacy was chosen when this video was approved. Unapprove it and approve it again.', array('retryable' => false));
        }
        $c = mhm_vq_tt_creator_info(true);
        if (is_wp_error($c)) {
            return $c;
        }
        if (!in_array($o['privacy_level'], $c['privacy_level_options'], true)) {
            return new WP_Error('mhm_vq_tt_opts', 'TikTok no longer allows "' . mhm_vq_tt_privacy_label($o['privacy_level']) . '" for this account. Unapprove the video and pick again.', array('retryable' => false));
        }
        $dur = (float) get_post_meta($id, '_mhm_duration_s', true);
        if ($c['max_video_post_duration_sec'] && $dur > $c['max_video_post_duration_sec']) {
            return new WP_Error('mhm_vq_tt_long', "The video is {$dur}s; this account can post at most {$c['max_video_post_duration_sec']}s.", array('retryable' => false));
        }
        $cap = mhm_vq_meta_json($id, '_mhm_captions', array());
        $info = array(
            'title'                => (string) ($cap['tiktok'] ?? ''),
            'privacy_level'        => $o['privacy_level'],
            'disable_comment'      => $c['comment_disabled'] || !$o['allow_comment'],
            'disable_duet'         => $c['duet_disabled'] || !$o['allow_duet'],
            'disable_stitch'       => $c['stitch_disabled'] || !$o['allow_stitch'],
            'brand_content_toggle' => (bool) $o['brand_content'],
            'brand_organic_toggle' => (bool) $o['brand_organic'],
        );
        $r = mhm_vq_tt_api('POST', '/v2/post/publish/video/init/', $token, array('post_info' => $info, 'source_info' => $source));
    } else {
        $r = mhm_vq_tt_api('POST', '/v2/post/publish/inbox/video/init/', $token, array('source_info' => $source));
    }
    if (is_wp_error($r)) {
        return $r;
    }
    $publish_id = (string) ($r['json']['data']['publish_id'] ?? '');
    $upload_url = (string) ($r['json']['data']['upload_url'] ?? '');
    if (!mhm_vq_tt_ok($r) || $publish_id === '' || strpos($upload_url, 'https://') !== 0) {
        return new WP_Error('mhm_vq_tt_init', 'TikTok would not start the upload: ' . mhm_vq_tt_error($r), array('retryable' => $r['code'] >= 500 || $r['code'] === 429));
    }

    $fh = fopen($path, 'rb');
    if (!$fh) {
        return new WP_Error('mhm_vq_io', 'Could not read the video file.', array('retryable' => false));
    }
    for ($i = 0; $i < $count; $i++) {
        $first = $i * $chunk;
        $last_piece = ($i === $count - 1);
        $len = $last_piece ? $size - $first : $chunk;
        fseek($fh, $first);
        $bytes = fread($fh, $len);
        $up = mhm_vq_http('PUT', $upload_url, array(
            'timeout' => 180,
            'headers' => array(
                'Content-Type'   => 'video/mp4',
                'Content-Length' => (string) $len,
                'Content-Range'  => 'bytes ' . $first . '-' . ($first + $len - 1) . '/' . $size,
            ),
            'body'    => $bytes,
        ));
        if (is_wp_error($up) || !in_array($up['code'], array(200, 201, 206), true)) {
            fclose($fh);
            $why = is_wp_error($up) ? $up->get_error_message() : 'HTTP ' . $up['code'];
            return new WP_Error('mhm_vq_tt_upload', ($last_piece ? 'The last piece was sent but TikTok\'s answer was lost, so it may still go through. Check TikTok before retrying. Details: ' : 'The upload to TikTok broke off: ') . $why,
                array('retryable' => !$last_piece, 'uncertain' => $last_piece));
        }
    }
    fclose($fh);
    return array('state' => 'processing', 'publish_id' => $publish_id, 'note' => 'Uploaded; TikTok is processing it.');
}

/**
 * Check a TikTok post started earlier. Returns
 *   array('state' => 'processing'|'inbox'|'posted', 'url'?, 'remote_id'?, 'note')  or  WP_Error.
 */
function mhm_vq_tt_poll($publish_id) {
    $token = mhm_vq_access_token('tiktok');
    if (is_wp_error($token)) {
        return $token;
    }
    $r = mhm_vq_tt_api('POST', '/v2/post/publish/status/fetch/', $token, array('publish_id' => $publish_id));
    if (is_wp_error($r)) {
        return array('state' => 'processing', 'note' => 'Could not reach TikTok to check; will try again.');
    }
    if (!mhm_vq_tt_ok($r)) {
        return array('state' => 'processing', 'note' => 'TikTok status check failed (' . mhm_vq_tt_error($r) . '); will try again.');
    }
    $d = $r['json']['data'] ?? array();
    $status = (string) ($d['status'] ?? '');
    switch ($status) {
        case 'SEND_TO_USER_INBOX':
            return array('state' => 'inbox', 'note' => 'Waiting as a draft in the TikTok inbox. Open TikTok to finish the post.');
        case 'PUBLISH_COMPLETE':
            $ids = (array) ($d['publicaly_available_post_id'] ?? $d['publicly_available_post_id'] ?? array());
            $vid = $ids ? (string) reset($ids) : '';
            $c = get_transient('mhm_vq_tt_creator');
            $user = is_array($c) ? $c['creator_username'] : '';
            $url = ($vid !== '' && $user !== '') ? 'https://www.tiktok.com/@' . rawurlencode($user) . '/video/' . rawurlencode($vid)
                : ($user !== '' ? 'https://www.tiktok.com/@' . rawurlencode($user) : null);
            return array('state' => 'posted', 'url' => $url, 'remote_id' => $vid, 'note' => $vid === '' ? 'Posted (not public, so TikTok gives no link).' : 'Posted.');
        case 'FAILED':
            return new WP_Error('mhm_vq_tt_failed', 'TikTok rejected the video: ' . mhm_vq_err_text((string) ($d['fail_reason'] ?? 'no reason given')), array('retryable' => false));
        default: // PROCESSING_UPLOAD, PROCESSING_DOWNLOAD
            return array('state' => 'processing', 'note' => 'TikTok is still processing it.');
    }
}
