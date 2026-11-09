<?php
/**
 * Videos → Posting (administrators only): turn each platform on or off, store the app credentials,
 * connect the YouTube channel and the TikTok account, test the connection, disconnect.
 *
 * Connecting uses OAuth. The "state" value is random, single-use, expires in 10 minutes and is tied to
 * the browser that started it by a cookie holding its hash, so a login link can't be replayed or
 * finished in someone else's browser. Tokens are stored sealed (includes/secrets.php) and never printed.
 */

if (!defined('ABSPATH')) {
    exit;
}

define('MHM_VQ_SETTINGS_PAGE', 'mhm-video-settings');
define('MHM_VQ_OAUTH_COOKIE', 'mhm_vq_oauth');

function mhm_vq_settings() {
    $defaults = array(
        'youtube_enabled'   => false,
        'youtube_privacy'   => 'private',
        'youtube_client_id' => '',
        'tiktok_enabled'    => false,
        'tiktok_mode'       => 'inbox',
        'tiktok_client_key' => '',
        'alert_email'       => '',
    );
    $s = get_option('mhm_vq_settings', array());
    return array_merge($defaults, is_array($s) ? $s : array());
}

function mhm_vq_update_settings($s) {
    if (get_option('mhm_vq_settings', null) === null) {
        add_option('mhm_vq_settings', $s, '', false);
    } else {
        update_option('mhm_vq_settings', $s, false);
    }
}

/** Platforms that are switched on. The poster waits (doesn't fail) on one that isn't connected yet. */
function mhm_vq_active_platforms() {
    $s = mhm_vq_settings();
    $out = array();
    foreach (array_keys(mhm_vq_platforms()) as $p) {
        if (!empty($s[$p . '_enabled'])) {
            $out[] = $p;
        }
    }
    return $out;
}

function mhm_vq_settings_url($args = array()) {
    return add_query_arg($args, admin_url('admin.php?page=' . MHM_VQ_SETTINGS_PAGE));
}

/** Redirect to the settings page with a message key and, optionally, detail text for this user. */
function mhm_vq_settings_back($msg, $detail = '', $user_id = 0) {
    $user_id = $user_id ?: get_current_user_id();
    if ($detail !== '' && $user_id) {
        set_transient('mhm_vq_flash_' . $user_id, mhm_vq_err_text($detail, 600), 300);
    }
    wp_safe_redirect(mhm_vq_settings_url(array('mhm_vq_msg' => $msg)));
    exit;
}

add_action('admin_menu', function () {
    add_submenu_page('mhm-video-queue', 'Video posting', 'Posting', 'manage_options', MHM_VQ_SETTINGS_PAGE, 'mhm_vq_render_settings');
}, 20); // after the main file adds the Videos menu

/* ---- saving the form ----------------------------------------------------- */

add_action('admin_post_mhm_vq_settings', function () {
    if (!current_user_can('manage_options')) {
        wp_die('Not allowed.', 403);
    }
    check_admin_referer('mhm_vq_settings');
    $in = wp_unslash($_POST);
    $s = mhm_vq_settings();
    $s['youtube_enabled'] = !empty($in['youtube_enabled']);
    $s['youtube_privacy'] = in_array($in['youtube_privacy'] ?? '', array('private', 'unlisted', 'public'), true) ? $in['youtube_privacy'] : 'private';
    $s['youtube_client_id'] = mhm_vq_clean_text($in['youtube_client_id'] ?? '', 200);
    $s['tiktok_enabled'] = !empty($in['tiktok_enabled']);
    $s['tiktok_mode'] = ($in['tiktok_mode'] ?? '') === 'direct' ? 'direct' : 'inbox';
    $s['tiktok_client_key'] = mhm_vq_clean_text($in['tiktok_client_key'] ?? '', 100);
    $email = sanitize_email($in['alert_email'] ?? '');
    $s['alert_email'] = is_email($email) ? $email : '';
    mhm_vq_update_settings($s);

    $failed = array();
    foreach (array_keys(mhm_vq_platforms()) as $p) {
        if (!empty($in[$p . '_secret_clear'])) {
            mhm_vq_set_client_secret($p, '');
            continue;
        }
        $secret = trim((string) ($in[$p . '_secret'] ?? ''));
        if ($secret !== '' && !mhm_vq_set_client_secret($p, preg_replace('/\s+/', '', $secret))) {
            $failed[] = $p;
        }
    }
    if ($failed) {
        mhm_vq_settings_back('nosodium');
    }
    mhm_vq_settings_back('saved');
});

/* ---- connect / test / disconnect ----------------------------------------- */

function mhm_vq_platform_from_post() {
    $p = isset($_POST['platform']) ? sanitize_key(wp_unslash($_POST['platform'])) : '';
    if (!isset(mhm_vq_platforms()[$p])) {
        wp_die('Unknown platform.', 400);
    }
    return $p;
}

add_action('admin_post_mhm_vq_connect', function () {
    if (!current_user_can('manage_options')) {
        wp_die('Not allowed.', 403);
    }
    $p = mhm_vq_platform_from_post();
    check_admin_referer('mhm_vq_connect_' . $p);
    $s = mhm_vq_settings();
    $id = $p === 'youtube' ? $s['youtube_client_id'] : $s['tiktok_client_key'];
    if ($id === '' || mhm_vq_client_secret($p) === '') {
        mhm_vq_settings_back('needapp');
    }
    $state = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    $verifier = rtrim(strtr(base64_encode(random_bytes(48)), '+/', '-_'), '=');
    $hash = hash('sha256', $state);
    set_transient('mhm_vq_oauth_' . $hash, array(
        'platform' => $p,
        'user_id'  => get_current_user_id(),
        'verifier' => $verifier,
        'mode'     => $s['tiktok_mode'],
    ), 10 * MINUTE_IN_SECONDS);
    setcookie(MHM_VQ_OAUTH_COOKIE, $hash, array(
        'expires'  => time() + 10 * MINUTE_IN_SECONDS,
        'path'     => '/',
        'secure'   => is_ssl(),
        'httponly' => true,
        'samesite' => 'Lax', // the platform sends the browser back with a top-level GET
    ));
    $url = $p === 'youtube' ? mhm_vq_yt_auth_url($state, $verifier) : mhm_vq_tt_auth_url($state, $s['tiktok_mode']);
    wp_redirect($url); // external on purpose: Google's or TikTok's consent screen
    exit;
});

/** Where Google / TikTok send the browser back. Public route; everything is checked against the stored state. */
function mhm_vq_oauth_callback(WP_REST_Request $r) {
    $platform = sanitize_key($r['platform']);
    $state = (string) $r->get_param('state');
    $fail = function ($detail, $uid = 0) {
        setcookie(MHM_VQ_OAUTH_COOKIE, '', array('expires' => time() - 3600, 'path' => '/', 'secure' => is_ssl(), 'httponly' => true, 'samesite' => 'Lax'));
        mhm_vq_settings_back('connectfail', $detail, $uid);
    };
    if ($state === '' || strlen($state) > 200) {
        $fail('The answer from the platform had no login state. Start again with Connect.');
    }
    $hash = hash('sha256', $state);
    $key = 'mhm_vq_oauth_' . $hash;
    // Check the browser first, so a stray request from somewhere else can't use up the real login's state.
    $cookie = isset($_COOKIE[MHM_VQ_OAUTH_COOKIE]) ? (string) $_COOKIE[MHM_VQ_OAUTH_COOKIE] : '';
    if (!hash_equals($hash, $cookie)) {
        mhm_vq_settings_back('connectfail', 'The login finished in a different browser from the one that started it. Start again with Connect in this browser.');
    }
    $pending = get_transient($key);
    delete_transient($key); // single use, whatever happens next
    if (!is_array($pending) || $pending['platform'] !== $platform) {
        $fail('That login link expired or was already used. Start again with Connect.');
    }
    $uid = (int) $pending['user_id'];
    if (!user_can($uid, 'manage_options')) {
        $fail('Only administrators can connect accounts.', $uid);
    }
    $err = (string) $r->get_param('error');
    if ($err !== '') {
        $desc = (string) $r->get_param('error_description');
        $fail($err === 'access_denied' ? 'You cancelled on the consent screen, so nothing was connected.' : "The platform said: $err" . ($desc ? " ($desc)" : ''), $uid);
    }
    $code = (string) $r->get_param('code');
    if ($code === '') {
        $fail('The platform sent no login code. Start again with Connect.', $uid);
    }

    if ($platform === 'youtube') {
        $tokens = mhm_vq_yt_exchange($code, $pending['verifier']);
        if (is_wp_error($tokens)) {
            $fail($tokens->get_error_message(), $uid);
        }
        $who = mhm_vq_yt_whoami($tokens['access_token']);
    } else {
        $tokens = mhm_vq_tt_exchange($code);
        if (is_wp_error($tokens)) {
            $fail($tokens->get_error_message(), $uid);
        }
        if ($pending['mode'] === 'direct' && strpos($tokens['scope'], 'video.publish') === false) {
            $fail('TikTok did not grant the video.publish permission that direct posting needs. Check the app has Content Posting API → Direct Post turned on, then connect again.', $uid);
        }
        $who = mhm_vq_tt_whoami($tokens['access_token']);
    }
    if (is_wp_error($who)) {
        $fail($who->get_error_message(), $uid);
    }
    $user = get_userdata($uid);
    $tokens['account'] = $who['title'];
    $tokens['account_id'] = $who['id'];
    $tokens['connected_at'] = gmdate('c');
    $tokens['connected_by'] = $user ? $user->display_name : '';
    if (!mhm_vq_set_tokens($platform, $tokens)) {
        $fail('Could not save the login (PHP sodium is missing).', $uid);
    }
    delete_transient('mhm_vq_tt_creator');
    setcookie(MHM_VQ_OAUTH_COOKIE, '', array('expires' => time() - 3600, 'path' => '/', 'secure' => is_ssl(), 'httponly' => true, 'samesite' => 'Lax'));
    mhm_vq_settings_back('connected', mhm_vq_platforms()[$platform] . ' is connected as ' . $who['title'] . '.', $uid);
}

add_action('rest_api_init', function () {
    register_rest_route(MHM_VQ_NS, '/oauth/(?P<platform>youtube|tiktok)', array(
        'methods'             => 'GET',
        'permission_callback' => '__return_true', // the browser comes back from Google/TikTok with no WP nonce; the state check above is the guard
        'callback'            => 'mhm_vq_oauth_callback',
    ));
});

add_action('admin_post_mhm_vq_test', function () {
    if (!current_user_can('manage_options')) {
        wp_die('Not allowed.', 403);
    }
    $p = mhm_vq_platform_from_post();
    check_admin_referer('mhm_vq_test_' . $p);
    $token = mhm_vq_access_token($p);
    if (is_wp_error($token)) {
        mhm_vq_settings_back('testfail', $token->get_error_message());
    }
    if ($p === 'youtube') {
        $who = mhm_vq_yt_whoami($token);
        if (is_wp_error($who)) {
            mhm_vq_settings_back('testfail', $who->get_error_message());
        }
        mhm_vq_settings_back('testok', 'YouTube works. Channel: ' . $who['title'] . '.');
    }
    $who = mhm_vq_tt_whoami($token);
    if (is_wp_error($who)) {
        mhm_vq_settings_back('testfail', $who->get_error_message());
    }
    $msg = 'TikTok works. Account: ' . $who['title'] . '.';
    if (mhm_vq_settings()['tiktok_mode'] === 'direct') {
        delete_transient('mhm_vq_tt_creator');
        $ci = mhm_vq_tt_creator_info(true);
        if (is_wp_error($ci)) {
            mhm_vq_settings_back('testfail', $msg . ' But direct posting is not available: ' . $ci->get_error_message());
        }
        $msg .= ' Direct posting allowed as @' . $ci['creator_username'] . ' (privacy options: ' . implode(', ', $ci['privacy_level_options']) . ').';
    }
    mhm_vq_settings_back('testok', $msg);
});

add_action('admin_post_mhm_vq_disconnect', function () {
    if (!current_user_can('manage_options')) {
        wp_die('Not allowed.', 403);
    }
    $p = mhm_vq_platform_from_post();
    check_admin_referer('mhm_vq_disconnect_' . $p);
    $t = mhm_vq_tokens($p);
    if (is_array($t)) {
        if ($p === 'youtube') {
            mhm_vq_yt_revoke($t);
        } else {
            mhm_vq_tt_revoke($t);
        }
    }
    mhm_vq_set_tokens($p, null);
    delete_transient('mhm_vq_tt_creator');
    mhm_vq_settings_back('disconnected', mhm_vq_platforms()[$p] . ' is disconnected.');
});

/* ---- the page ------------------------------------------------------------ */

function mhm_vq_render_settings() {
    if (!current_user_can('manage_options')) {
        wp_die('Not allowed.');
    }
    $s = mhm_vq_settings();
    $msgs = array(
        'saved'        => array('success', 'Settings saved.'),
        'nosodium'     => array('error', 'Settings saved, but the client secret could not be stored: PHP sodium is missing on this server.'),
        'needapp'      => array('error', 'Save the client ID and client secret first, then press Connect.'),
        'connected'    => array('success', ''),
        'connectfail'  => array('error', 'Connecting failed.'),
        'testok'       => array('success', ''),
        'testfail'     => array('error', 'The test failed.'),
        'disconnected' => array('success', ''),
    );
    $k = isset($_GET['mhm_vq_msg']) ? sanitize_key(wp_unslash($_GET['mhm_vq_msg'])) : '';
    $flash = get_transient('mhm_vq_flash_' . get_current_user_id());
    delete_transient('mhm_vq_flash_' . get_current_user_id());

    echo '<div class="wrap mhm-vq-wrap"><h1>Video posting</h1>';
    if (isset($msgs[$k])) {
        $text = trim($msgs[$k][1] . ' ' . (is_string($flash) ? $flash : ''));
        printf('<div class="notice notice-%s is-dismissible"><p>%s</p></div>', esc_attr($msgs[$k][0]), esc_html($text));
    }
    if (!function_exists('sodium_crypto_secretbox')) {
        echo '<div class="notice notice-error"><p>PHP sodium is not available, so credentials can\'t be stored. Posting is off until it is.</p></div>';
    }
    echo '<p>Approved videos are posted by WordPress itself, every 5 minutes, once their slot time has passed. A platform is used only when it is switched on below <em>and</em> connected. Turning a platform off stops new posts to it straight away.</p>';

    $last = get_option('mhm_vq_post_last_run');
    if (is_array($last)) {
        printf('<p class="mhm-vq-meta">Last posting run: %s (%s). %s</p>', esc_html(mhm_vq_fmt_slot($last['at'])), esc_html($last['via'] ?? 'cron'), esc_html($last['summary'] ?? ''));
    }

    // Connection boxes (separate forms: a form can't hold another).
    echo '<h2>Accounts</h2><div class="mhm-vq-accounts">';
    foreach (mhm_vq_platforms() as $p => $label) {
        $t = mhm_vq_tokens($p);
        echo '<div class="mhm-vq-account"><h3>' . esc_html($label) . '</h3>';
        if ($t === false) {
            echo '<p><span class="mhm-vq-badge changes_requested">Can\'t read the saved login</span> The site\'s security keys changed. Connect again.</p>';
        } elseif (is_array($t) && !empty($t['refresh_token'])) {
            printf('<p><span class="mhm-vq-badge approved">Connected</span> as <strong>%s</strong><br><span class="mhm-vq-meta">since %s by %s</span></p>',
                esc_html($t['account'] ?? '?'), esc_html(mhm_vq_fmt_slot($t['connected_at'] ?? '')), esc_html($t['connected_by'] ?? '?'));
            if ($p === 'tiktok' && !empty($t['refresh_expires_at']) && $t['refresh_expires_at'] < time() + 30 * DAY_IN_SECONDS) {
                echo '<p class="mhm-vq-warn">The TikTok login runs out ' . esc_html(mhm_vq_fmt_slot(gmdate('c', (int) $t['refresh_expires_at']))) . '. Press Connect again before then.</p>';
            }
            if ($p === 'tiktok' && $s['tiktok_mode'] === 'direct' && strpos((string) ($t['scope'] ?? ''), 'video.publish') === false) {
                echo '<p class="mhm-vq-warn">Direct posting is selected but this login only allows inbox drafts. Press Connect again.</p>';
            }
        } else {
            echo '<p><span class="mhm-vq-badge">Not connected</span></p>';
        }
        if (!empty($s[$p . '_enabled']) && !mhm_vq_is_connected($p)) {
            echo '<p class="mhm-vq-warn">Switched on but not connected: approved videos will wait.</p>';
        }
        echo '<div class="mhm-vq-actions">';
        foreach (array('connect' => mhm_vq_is_connected($p) ? 'Connect again' : 'Connect', 'test' => 'Test', 'disconnect' => 'Disconnect') as $do => $btn) {
            if ($do !== 'connect' && !is_array($t)) {
                continue;
            }
            printf('<form method="post" action="%s">', esc_url(admin_url('admin-post.php')));
            wp_nonce_field('mhm_vq_' . $do . '_' . $p);
            printf('<input type="hidden" name="action" value="mhm_vq_%s"><input type="hidden" name="platform" value="%s">', esc_attr($do), esc_attr($p));
            printf('<button class="button%s"%s>%s</button></form>',
                $do === 'connect' ? ' button-primary' : '',
                $do === 'disconnect' ? ' onclick="return confirm(\'Disconnect ' . esc_js($label) . '? Approved videos will not post there until you connect again.\')"' : '',
                esc_html($btn));
        }
        echo '</div></div>';
    }
    echo '</div>';

    // Settings form.
    printf('<form method="post" action="%s">', esc_url(admin_url('admin-post.php')));
    wp_nonce_field('mhm_vq_settings');
    echo '<input type="hidden" name="action" value="mhm_vq_settings">';

    echo '<h2>YouTube Shorts</h2><table class="form-table" role="presentation">';
    printf('<tr><th scope="row">Posting</th><td><label><input type="checkbox" name="youtube_enabled" value="1"%s> Post approved videos to YouTube</label></td></tr>', checked($s['youtube_enabled'], true, false));
    echo '<tr><th scope="row"><label for="yt-priv">Visibility</label></th><td><select id="yt-priv" name="youtube_privacy">';
    foreach (array('private' => 'Private (test first)', 'unlisted' => 'Unlisted', 'public' => 'Public') as $v => $l) {
        printf('<option value="%s"%s>%s</option>', esc_attr($v), selected($s['youtube_privacy'], $v, false), esc_html($l));
    }
    echo '</select><p class="description">Until the Google Cloud project passes YouTube\'s API audit, YouTube makes every upload private whatever you pick. The Queue says so when it happens.</p></td></tr>';
    printf('<tr><th scope="row"><label for="yt-cid">OAuth client ID</label></th><td><input type="text" class="regular-text code" id="yt-cid" name="youtube_client_id" value="%s" autocomplete="off"></td></tr>', esc_attr($s['youtube_client_id']));
    mhm_vq_secret_row('youtube', 'OAuth client secret');
    printf('<tr><th scope="row">Redirect URI</th><td><code>%s</code><p class="description">Add this under Authorized redirect URIs on the OAuth client (Google Cloud → APIs &amp; Services → Credentials, type "Web application").</p></td></tr>', esc_html(mhm_vq_redirect_uri('youtube')));
    echo '</table>';

    echo '<h2>TikTok</h2><table class="form-table" role="presentation">';
    printf('<tr><th scope="row">Posting</th><td><label><input type="checkbox" name="tiktok_enabled" value="1"%s> Send approved videos to TikTok</label></td></tr>', checked($s['tiktok_enabled'], true, false));
    echo '<tr><th scope="row">How</th><td><fieldset>';
    printf('<label><input type="radio" name="tiktok_mode" value="inbox"%s> <strong>Draft in the TikTok app</strong>: the video lands in the account\'s TikTok inbox and someone finishes the post in the app (caption, sound, Post). The caption is emailed when it arrives. Works before TikTok\'s audit.</label><br>', checked($s['tiktok_mode'], 'inbox', false));
    printf('<label><input type="radio" name="tiktok_mode" value="direct"%s> <strong>Post directly</strong>: needs the app to pass TikTok\'s Direct Post audit (unaudited apps can only post privately). The reviewer then picks who can see each video when approving it. Changing this needs Connect again.</label>', checked($s['tiktok_mode'], 'direct', false));
    echo '</fieldset></td></tr>';
    printf('<tr><th scope="row"><label for="tt-key">Client key</label></th><td><input type="text" class="regular-text code" id="tt-key" name="tiktok_client_key" value="%s" autocomplete="off"></td></tr>', esc_attr($s['tiktok_client_key']));
    mhm_vq_secret_row('tiktok', 'Client secret');
    printf('<tr><th scope="row">Redirect URI</th><td><code>%s</code><p class="description">Add this under Login Kit → Redirect URI in the TikTok developer app.</p></td></tr>', esc_html(mhm_vq_redirect_uri('tiktok')));
    echo '</table>';

    echo '<h2>Alerts</h2><table class="form-table" role="presentation">';
    printf('<tr><th scope="row"><label for="alert">Email</label></th><td><input type="email" class="regular-text" id="alert" name="alert_email" value="%s" placeholder="%s"><p class="description">Gets an email when a post fails and when a TikTok draft is waiting. Empty means the site admin address.</p></td></tr>',
        esc_attr($s['alert_email']), esc_attr(get_option('admin_email')));
    echo '</table>';
    submit_button('Save settings');
    echo '</form></div>';
}

/** A secret input that never shows the saved value. Blank keeps it. */
function mhm_vq_secret_row($p, $label) {
    $saved = get_option('mhm_vq_client_secret_' . $p, '') !== '';
    $readable = mhm_vq_client_secret($p) !== '';
    printf('<tr><th scope="row"><label for="%1$s-secret">%2$s</label></th><td><input type="password" class="regular-text code" id="%1$s-secret" name="%1$s_secret" value="" autocomplete="new-password" placeholder="%3$s">',
        esc_attr($p), esc_html($label), esc_attr($saved ? ($readable ? 'saved (leave blank to keep)' : 'saved but unreadable: enter it again') : ''));
    if ($saved) {
        printf(' <label><input type="checkbox" name="%s_secret_clear" value="1"> Remove</label>', esc_attr($p));
    }
    echo '</td></tr>';
}

add_action('admin_head', function () {
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || strpos((string) $screen->id, 'mhm-video') === false) {
        return;
    }
    echo '<style>.mhm-vq-accounts{display:flex;flex-wrap:wrap;gap:16px}.mhm-vq-account{background:#fff;border:1px solid #dcdcde;border-radius:6px;padding:12px 16px;min-width:280px;flex:1}.mhm-vq-account h3{margin:4px 0 8px}.mhm-vq-account form{display:inline}.mhm-vq-warn{color:#8a4b00}.mhm-vq-platforms{margin:8px 0;padding:0;list-style:none}.mhm-vq-platforms li{margin:4px 0}.mhm-vq-platforms form{display:inline;margin-left:6px}.mhm-vq-tt{border:1px solid #dcdcde;border-radius:6px;padding:10px 12px;margin-top:12px;background:#f6f7f7}.mhm-vq-tt label,.mhm-vq-card .mhm-vq-tt label{font-weight:400;display:inline;margin:0}.mhm-vq-tt .mhm-vq-tt-row{margin:6px 0}</style>';
});
