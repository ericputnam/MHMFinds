<?php
/**
 * Plugin Name: MHM Video Queue — fake YouTube/TikTok (LOCAL TEST ONLY)
 * Description: Answers the plugin's calls to Google and TikTok with canned responses so posting can be tested
 *              without real accounts. Mounted only by scripts/staging/video-queue-local/docker-compose.yml.
 *              Never deploy this anywhere.
 *
 * Failure switches (wp option mhm_vq_mock, JSON object), e.g.
 *   wp option update mhm_vq_mock '{"yt_init":500}' --format=json
 *   yt_init: HTTP code for the resumable-session start        yt_privacy: privacy YouTube "forces" (e.g. "private")
 *   yt_chunk_fail: "first" | "last"   (network error on that chunk)
 *   tt_init: HTTP code for TikTok init                          tt_status: final TikTok status (default by mode)
 *   tt_fail_reason: text for FAILED                             tt_refresh_fail: true (refresh says invalid_grant)
 * Every request is appended to option mhm_vq_mock_log (method, url, code) and every wp_mail to mhm_vq_mock_mail.
 */

if (!defined('ABSPATH')) {
    exit;
}
if (!in_array(wp_get_environment_type(), array('local', 'development'), true)) {
    return; // belt and braces: do nothing outside a local site
}

function mhm_vq_mock_cfg($k, $d = null) {
    $c = get_option('mhm_vq_mock', array());
    return is_array($c) && array_key_exists($k, $c) ? $c[$k] : $d;
}

function mhm_vq_mock_res($code, $json = null, $headers = array()) {
    return array(
        'headers'  => new \WpOrg\Requests\Utility\CaseInsensitiveDictionary($headers),
        'body'     => $json === null ? '' : wp_json_encode($json),
        'response' => array('code' => $code, 'message' => ''),
        'cookies'  => array(),
        'filename' => null,
    );
}

function mhm_vq_mock_note($method, $url, $code, $extra = '') {
    $log = get_option('mhm_vq_mock_log', array());
    $log[] = array('t' => time(), 'm' => $method, 'u' => preg_replace('/([?&](code|token|refresh_token|client_secret)=)[^&]+/', '$1…', $url), 'c' => $code, 'x' => $extra);
    update_option('mhm_vq_mock_log', array_slice($log, -200), false);
}

add_filter('pre_wp_mail', function ($null, $atts) {
    $m = get_option('mhm_vq_mock_mail', array());
    $m[] = array('to' => $atts['to'], 'subject' => $atts['subject'], 'message' => $atts['message']);
    update_option('mhm_vq_mock_mail', array_slice($m, -50), false);
    return true;
}, 10, 2);

add_filter('pre_http_request', function ($pre, $args, $url) {
    $host = wp_parse_url($url, PHP_URL_HOST);
    $path = (string) wp_parse_url($url, PHP_URL_PATH);
    $m = strtoupper($args['method'] ?? 'GET');
    $body = $args['body'] ?? '';
    $form = is_array($body) ? $body : array();
    $json = is_string($body) ? json_decode($body, true) : null;
    $r = null;

    // ---- Google ----
    if ($host === 'oauth2.googleapis.com' && $path === '/token') {
        if (($form['grant_type'] ?? '') === 'authorization_code') {
            $r = mhm_vq_mock_res(200, array('access_token' => 'yt-at-' . wp_generate_password(8, false), 'refresh_token' => 'yt-rt-fake', 'expires_in' => 3599, 'scope' => 'youtube.upload youtube.readonly'));
        } else {
            $r = mhm_vq_mock_res(200, array('access_token' => 'yt-at-' . wp_generate_password(8, false), 'expires_in' => 3599));
        }
    } elseif ($host === 'oauth2.googleapis.com' && $path === '/revoke') {
        $r = mhm_vq_mock_res(200, array());
    } elseif ($host === 'www.googleapis.com' && $path === '/youtube/v3/channels') {
        $r = mhm_vq_mock_res(200, array('items' => array(array('id' => 'UCfake', 'snippet' => array('title' => 'MustHaveMods (fake)')))));
    } elseif ($host === 'www.googleapis.com' && $path === '/upload/youtube/v3/videos' && $m === 'POST') {
        $code = (int) mhm_vq_mock_cfg('yt_init', 200);
        if ($code !== 200) {
            $r = mhm_vq_mock_res($code, array('error' => array('code' => $code, 'message' => 'fake init failure', 'errors' => array(array('reason' => 'backendError')))));
        } else {
            $sid = wp_generate_password(10, false);
            update_option('mhm_vq_mock_yt_' . $sid, array('meta' => $json, 'got' => 0), false);
            $r = mhm_vq_mock_res(200, null, array('Location' => 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&upload_id=' . $sid));
        }
    } elseif ($host === 'www.googleapis.com' && $path === '/upload/youtube/v3/videos' && $m === 'PUT') {
        parse_str((string) wp_parse_url($url, PHP_URL_QUERY), $q);
        $sid = $q['upload_id'] ?? '';
        $sess = get_option('mhm_vq_mock_yt_' . $sid);
        $range = $args['headers']['Content-Range'] ?? '';
        preg_match('#bytes (\d+)-(\d+)/(\d+)#', $range, $mm);
        $end = (int) ($mm[2] ?? 0);
        $total = (int) ($mm[3] ?? 0);
        $last = $end + 1 >= $total;
        $fail = mhm_vq_mock_cfg('yt_chunk_fail');
        if (!$sess) {
            $r = mhm_vq_mock_res(404, array('error' => array('code' => 404, 'message' => 'no such upload')));
        } elseif (($fail === 'first' && (int) $mm[1] === 0) || ($fail === 'last' && $last)) {
            mhm_vq_mock_note($m, $url, 'network-error');
            return new WP_Error('http_request_failed', 'cURL error 28: fake timeout');
        } elseif (strlen((string) $body) !== $end - (int) $mm[1] + 1) {
            $r = mhm_vq_mock_res(400, array('error' => array('code' => 400, 'message' => 'body length does not match Content-Range')));
        } elseif (!$last) {
            $r = mhm_vq_mock_res(308, null, array('Range' => 'bytes=0-' . $end));
        } else {
            $want = $sess['meta']['status']['privacyStatus'] ?? 'private';
            $r = mhm_vq_mock_res(200, array('id' => 'fakeYT' . substr($sid, 0, 5), 'status' => array('privacyStatus' => mhm_vq_mock_cfg('yt_privacy', $want))));
            delete_option('mhm_vq_mock_yt_' . $sid);
        }
    }

    // ---- TikTok ----
    elseif ($host === 'open.tiktokapis.com') {
        if ($path === '/v2/oauth/token/') {
            if (($form['grant_type'] ?? '') === 'refresh_token' && mhm_vq_mock_cfg('tt_refresh_fail')) {
                $r = mhm_vq_mock_res(400, array('error' => 'invalid_grant', 'error_description' => 'refresh token expired'));
            } else {
                $r = mhm_vq_mock_res(200, array('access_token' => 'act.' . wp_generate_password(8, false), 'expires_in' => 86400, 'refresh_token' => 'rft.' . wp_generate_password(8, false),
                    'refresh_expires_in' => 31536000, 'open_id' => 'fake-open-id', 'scope' => mhm_vq_mock_cfg('tt_scope', 'user.info.basic,video.upload,video.publish'), 'token_type' => 'Bearer'));
            }
        } elseif ($path === '/v2/oauth/revoke/') {
            $r = mhm_vq_mock_res(200, array());
        } elseif ($path === '/v2/user/info/') {
            $r = mhm_vq_mock_res(200, array('data' => array('user' => array('open_id' => 'fake-open-id', 'display_name' => 'MustHaveMods (fake)')), 'error' => array('code' => 'ok', 'message' => '')));
        } elseif ($path === '/v2/post/publish/creator_info/query/') {
            $r = mhm_vq_mock_res(200, array('data' => array(
                'creator_username' => 'musthavemods_fake', 'creator_nickname' => 'MustHaveMods', 'creator_avatar_url' => '',
                'privacy_level_options' => array('PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'),
                'comment_disabled' => false, 'duet_disabled' => true, 'stitch_disabled' => false, 'max_video_post_duration_sec' => 600,
            ), 'error' => array('code' => 'ok', 'message' => '')));
        } elseif ($path === '/v2/post/publish/video/init/' || $path === '/v2/post/publish/inbox/video/init/') {
            $code = (int) mhm_vq_mock_cfg('tt_init', 200);
            if ($code !== 200) {
                $r = mhm_vq_mock_res($code, array('error' => array('code' => 'internal_error', 'message' => 'fake init failure', 'log_id' => 'x')));
            } else {
                $pid = 'v_pub_file~' . wp_generate_password(8, false);
                update_option('mhm_vq_mock_tt_' . md5($pid), array('direct' => strpos($path, 'inbox') === false, 'info' => $json, 'polls' => 0), false);
                $r = mhm_vq_mock_res(200, array('data' => array('publish_id' => $pid, 'upload_url' => 'https://open-upload.tiktokapis.com/upload/?upload_id=' . md5($pid)), 'error' => array('code' => 'ok', 'message' => '')));
            }
        } elseif ($path === '/v2/post/publish/status/fetch/') {
            $key = 'mhm_vq_mock_tt_' . md5((string) ($json['publish_id'] ?? ''));
            $st = get_option($key);
            if (!$st) {
                $r = mhm_vq_mock_res(200, array('data' => array(), 'error' => array('code' => 'invalid_publish_id', 'message' => 'unknown')));
            } else {
                $st['polls']++;
                update_option($key, $st, false);
                if ($st['polls'] < 2) {
                    $status = 'PROCESSING_UPLOAD';
                } else {
                    $status = mhm_vq_mock_cfg('tt_status', $st['direct'] ? 'PUBLISH_COMPLETE' : 'SEND_TO_USER_INBOX');
                }
                $data = array('status' => $status);
                if ($status === 'FAILED') {
                    $data['fail_reason'] = mhm_vq_mock_cfg('tt_fail_reason', 'file_format_check_failed');
                }
                if ($status === 'PUBLISH_COMPLETE' && ($st['info']['post_info']['privacy_level'] ?? '') === 'PUBLIC_TO_EVERYONE') {
                    $data['publicaly_available_post_id'] = array(7300000000000000001);
                }
                $r = mhm_vq_mock_res(200, array('data' => $data, 'error' => array('code' => 'ok', 'message' => '')));
            }
        }
    } elseif ($host === 'open-upload.tiktokapis.com') {
        $range = $args['headers']['Content-Range'] ?? '';
        preg_match('#bytes (\d+)-(\d+)/(\d+)#', $range, $mm);
        $ok = strlen((string) $body) === (int) $mm[2] - (int) $mm[1] + 1;
        $r = mhm_vq_mock_res($ok ? ((int) $mm[2] + 1 >= (int) $mm[3] ? 201 : 206) : 400);
    }

    if ($r === null) {
        return $pre;
    }
    mhm_vq_mock_note($m, $url, $r['response']['code']);
    return $r;
}, 10, 3);
