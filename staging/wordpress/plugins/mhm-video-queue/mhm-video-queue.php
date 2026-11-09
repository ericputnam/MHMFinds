<?php
/**
 * Plugin Name: MHM Video Queue
 * Description: Review queue for MustHaveMods short videos (made on the operator's Mac) and an ideas box for the writer. Private: nothing here is public, in the media library, the sitemap or search.
 * Version: 1.1.0
 * Author: MustHaveMods
 * Requires at least: 6.2
 * Requires PHP: 7.4
 *
 * Contract: docs/VIDEO_QUEUE.md in the MHMFinds repo. Deployed by scripts/staging/push-video-queue-plugin.sh.
 * This plugin never touches the theme or functions.php.
 */

if (!defined('ABSPATH')) {
    exit;
}

define('MHM_VQ_VERSION', '1.1.0');
define('MHM_VQ_CAP_REVIEW', 'mhm_review_videos');
define('MHM_VQ_CAP_BOT', 'mhm_manage_video_queue');
define('MHM_VQ_CPT_VIDEO', 'mhm_video');
define('MHM_VQ_CPT_IDEA', 'mhm_video_idea');
define('MHM_VQ_NS', 'mhm-video-queue/v1');
define('MHM_VQ_MAX_CHUNK', 1048576);          // 1 MiB per upload chunk
define('MHM_VQ_MAX_VIDEO', 200 * 1048576);    // 200 MiB
define('MHM_VQ_MAX_COVER', 8 * 1048576);      // 8 MiB

// Phase 2: posting to YouTube and TikTok (Videos → Posting). Nothing posts until a platform is switched on and connected.
require_once __DIR__ . '/includes/secrets.php';
require_once __DIR__ . '/includes/http.php';
require_once __DIR__ . '/includes/settings.php';
require_once __DIR__ . '/includes/youtube.php';
require_once __DIR__ . '/includes/tiktok.php';
require_once __DIR__ . '/includes/poster.php';
register_deactivation_hook(__FILE__, 'mhm_vq_post_deactivate');

function mhm_vq_statuses() {
    return array(
        'uploading'         => 'Uploading',
        'pending_review'    => 'Waiting for review',
        'changes_requested' => 'Changes requested',
        'approved'          => 'Approved — ready to post',
        'rejected'          => 'Rejected',
        'posted'            => 'Posted',
    );
}

function mhm_vq_idea_statuses() {
    return array('new' => 'New', 'used' => 'Used', 'declined' => 'Not used');
}

/* -------------------------------------------------------------------------
 * Roles, capabilities, activation
 * ---------------------------------------------------------------------- */

register_activation_hook(__FILE__, 'mhm_vq_activate');
function mhm_vq_activate() {
    mhm_vq_register_types();
    mhm_vq_ensure_roles();
    mhm_vq_storage_dir(); // create it now so the admin screen can warn early
}

function mhm_vq_ensure_roles() {
    if (!get_role('mhm_video_reviewer')) {
        add_role('mhm_video_reviewer', 'Video Reviewer', array('read' => true, MHM_VQ_CAP_REVIEW => true));
    }
    if (!get_role('mhm_video_bot')) {
        // No 'read': the bot never uses the dashboard, only REST with an Application Password.
        add_role('mhm_video_bot', 'Video Bot', array(MHM_VQ_CAP_BOT => true));
    }
    $admin = get_role('administrator');
    if ($admin) {
        $admin->add_cap(MHM_VQ_CAP_REVIEW);
        $admin->add_cap(MHM_VQ_CAP_BOT);
    }
    update_option('mhm_vq_roles_version', MHM_VQ_VERSION, false);
}

add_action('init', function () {
    if (get_option('mhm_vq_roles_version') !== MHM_VQ_VERSION) {
        mhm_vq_ensure_roles();
    }
});

function mhm_vq_is_only_reviewer($user = null) {
    $user = $user ?: wp_get_current_user();
    return $user && $user->exists() && user_can($user, MHM_VQ_CAP_REVIEW) && !user_can($user, 'edit_posts');
}

function mhm_vq_is_bot_user($user) {
    return $user instanceof WP_User && in_array('mhm_video_bot', (array) $user->roles, true) && !user_can($user, 'edit_posts');
}

// The bot account can't sign in to the dashboard with a password. Application Passwords
// (REST) don't go through this filter, so the jobs keep working.
add_filter('wp_authenticate_user', function ($user) {
    if (mhm_vq_is_bot_user($user)) {
        return new WP_Error('mhm_vq_bot_login', 'This account is for the video jobs only and cannot sign in here.');
    }
    return $user;
}, 20);

// Application Passwords are normally only offered over HTTPS; allow them on a local test site.
add_filter('wp_is_application_passwords_available', function ($available) {
    if (function_exists('wp_get_environment_type') && wp_get_environment_type() === 'local') {
        return true;
    }
    return $available;
});

// Reviewers land on the queue and see only the video screens.
add_filter('login_redirect', function ($redirect, $requested, $user) {
    if ($user instanceof WP_User && mhm_vq_is_only_reviewer($user)) {
        return admin_url('admin.php?page=mhm-video-queue');
    }
    return $redirect;
}, 10, 3);

add_action('admin_menu', function () {
    if (!mhm_vq_is_only_reviewer()) {
        return;
    }
    remove_menu_page('index.php');
    remove_menu_page('edit-comments.php');
    remove_menu_page('tools.php');
}, 999);

// Core's menu check denies other admin pages before admin_init runs; send reviewers back to the queue.
add_action('admin_page_access_denied', function () {
    if (mhm_vq_is_only_reviewer()) {
        wp_safe_redirect(admin_url('admin.php?page=mhm-video-queue'));
        exit;
    }
});

add_action('admin_init', function () {
    if (wp_doing_ajax() || !mhm_vq_is_only_reviewer()) {
        return;
    }
    global $pagenow;
    // Core update nags mean nothing to a reviewer and they can't act on them.
    remove_action('admin_notices', 'update_nag', 3);
    remove_action('network_admin_notices', 'update_nag', 3);
    $allowed = array('admin.php', 'admin-post.php', 'profile.php', 'admin-ajax.php');
    $page = isset($_GET['page']) ? sanitize_key(wp_unslash($_GET['page'])) : '';
    if (!in_array($pagenow, $allowed, true) || ($pagenow === 'admin.php' && strpos($page, 'mhm-video') !== 0)) {
        wp_safe_redirect(admin_url('admin.php?page=mhm-video-queue'));
        exit;
    }
});

add_filter('show_admin_bar', function ($show) {
    return mhm_vq_is_only_reviewer() ? false : $show;
});

/* -------------------------------------------------------------------------
 * Post types (private storage only)
 * ---------------------------------------------------------------------- */

add_action('init', 'mhm_vq_register_types');
function mhm_vq_register_types() {
    $common = array(
        'public'              => false,
        'publicly_queryable'  => false,
        'exclude_from_search' => true,
        'show_ui'             => false,
        'show_in_rest'        => false,
        'show_in_nav_menus'   => false,
        'has_archive'         => false,
        'rewrite'             => false,
        'query_var'           => false,
        'supports'            => array('title', 'author'),
    );
    register_post_type(MHM_VQ_CPT_VIDEO, array_merge($common, array('label' => 'Videos')));
    register_post_type(MHM_VQ_CPT_IDEA, array_merge($common, array('label' => 'Video ideas')));
}

/* -------------------------------------------------------------------------
 * Storage (outside the web root)
 * ---------------------------------------------------------------------- */

function mhm_vq_storage_dir() {
    $saved = get_option('mhm_vq_storage_dir');
    if ($saved && is_dir($saved) && wp_is_writable($saved)) {
        return apply_filters('mhm_vq_storage_dir', $saved);
    }
    $preferred = apply_filters('mhm_vq_preferred_storage_dir', dirname(untrailingslashit(ABSPATH)) . '/mhm-video-queue');
    if (wp_mkdir_p($preferred) && wp_is_writable($preferred)) {
        update_option('mhm_vq_storage_dir', $preferred, false);
        update_option('mhm_vq_storage_in_webroot', 0, false);
        return apply_filters('mhm_vq_storage_dir', $preferred);
    }
    // Fallback: an unguessable folder in uploads. nginx ignores .htaccess, so the screen warns.
    $uploads = wp_upload_dir(null, false);
    $fallback = trailingslashit($uploads['basedir']) . 'mhm-video-queue-' . wp_generate_password(20, false, false);
    wp_mkdir_p($fallback);
    @file_put_contents($fallback . '/index.php', "<?php\n// Silence.\n");
    @file_put_contents($fallback . '/.htaccess', "Require all denied\nDeny from all\n");
    update_option('mhm_vq_storage_dir', $fallback, false);
    update_option('mhm_vq_storage_in_webroot', 1, false);
    return apply_filters('mhm_vq_storage_dir', $fallback);
}

function mhm_vq_video_dir($id) {
    $dir = trailingslashit(mhm_vq_storage_dir()) . absint($id);
    wp_mkdir_p($dir);
    return $dir;
}

function mhm_vq_kind_file($kind) {
    return $kind === 'cover' ? 'cover.jpg' : 'video.mp4';
}

function mhm_vq_file_path($id, $kind) {
    return mhm_vq_video_dir($id) . '/' . mhm_vq_kind_file($kind);
}

/* -------------------------------------------------------------------------
 * Video model
 * ---------------------------------------------------------------------- */

function mhm_vq_meta_json($id, $key, $default) {
    $raw = get_post_meta($id, $key, true);
    if ($raw === '' || $raw === null) {
        return $default;
    }
    $val = json_decode($raw, true);
    return is_array($val) ? $val : $default;
}

function mhm_vq_set_meta_json($id, $key, $value) {
    // wp_slash because update_post_meta unslashes.
    update_post_meta($id, $key, wp_slash(wp_json_encode($value)));
}

function mhm_vq_get_video($id) {
    $post = get_post($id);
    if (!$post || $post->post_type !== MHM_VQ_CPT_VIDEO) {
        return null;
    }
    return $post;
}

function mhm_vq_status($id) {
    $s = get_post_meta($id, '_mhm_status', true);
    return $s ?: 'uploading';
}

function mhm_vq_log($id, $action, $note = '') {
    $log = mhm_vq_meta_json($id, '_mhm_review_log', array());
    $user = wp_get_current_user();
    $log[] = array(
        'at'     => gmdate('c'),
        'user'   => $user && $user->exists() ? $user->display_name : 'system',
        'action' => $action,
        'note'   => $note,
    );
    mhm_vq_set_meta_json($id, '_mhm_review_log', array_slice($log, -50));
}

function mhm_vq_set_status($id, $status, $note = '') {
    update_post_meta($id, '_mhm_status', $status);
    mhm_vq_log($id, $status, $note);
    wp_update_post(array('ID' => $id)); // bump post_modified
}

/** MySQL GMT datetime -> "2026-11-07T15:00:00Z" (null when unset). */
function mhm_vq_utc($gmt) {
    if (!$gmt || strpos($gmt, '0000-00-00') === 0) {
        return null;
    }
    return gmdate('Y-m-d\\TH:i:s\\Z', strtotime($gmt . ' UTC'));
}

function mhm_vq_serialize_video($post) {
    $id = $post->ID;
    $dir = trailingslashit(mhm_vq_storage_dir()) . $id;
    return array(
        'id'          => $id,
        'title'       => $post->post_title,
        'status'      => mhm_vq_status($id),
        'revision'    => (int) get_post_meta($id, '_mhm_revision', true),
        'hook'        => (string) get_post_meta($id, '_mhm_hook', true),
        'scenes'      => mhm_vq_meta_json($id, '_mhm_scenes', array()),
        'target_url'  => (string) get_post_meta($id, '_mhm_target_url', true),
        'slot'        => (string) get_post_meta($id, '_mhm_slot', true) ?: null,
        'captions'    => mhm_vq_meta_json($id, '_mhm_captions', (object) array()),
        'credits'     => mhm_vq_meta_json($id, '_mhm_credits', array()),
        'idea_id'     => ($idea = (int) get_post_meta($id, '_mhm_idea_id', true)) ? $idea : null,
        'draft_ref'   => (string) get_post_meta($id, '_mhm_draft_ref', true),
        'duration_s'  => ($d = get_post_meta($id, '_mhm_duration_s', true)) !== '' ? (float) $d : null,
        'change_note' => (string) get_post_meta($id, '_mhm_change_note', true),
        'review_log'  => mhm_vq_meta_json($id, '_mhm_review_log', array()),
        'post_urls'   => mhm_vq_meta_json($id, '_mhm_post_urls', array('youtube' => null, 'tiktok' => null)),
        'files'       => array('video' => file_exists("$dir/video.mp4"), 'cover' => file_exists("$dir/cover.jpg")),
        'created_at'  => mhm_vq_utc($post->post_date_gmt),
        'updated_at'  => mhm_vq_utc($post->post_modified_gmt),
    );
}

function mhm_vq_clean_text($v, $max = 300) {
    $v = sanitize_text_field((string) $v);
    return function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max);
}

function mhm_vq_clean_multiline($v, $max = 5000) {
    $v = sanitize_textarea_field((string) $v);
    return function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max);
}

function mhm_vq_clean_captions($c) {
    $c = is_array($c) ? $c : array();
    return array(
        'youtube_title'       => mhm_vq_clean_text($c['youtube_title'] ?? '', 100),
        'youtube_description' => mhm_vq_clean_multiline($c['youtube_description'] ?? '', 5000),
        'tiktok'              => mhm_vq_clean_multiline($c['tiktok'] ?? '', 2200),
    );
}

/** Slot must be an ISO-8601 UTC time. Returns normalized string or WP_Error. */
function mhm_vq_clean_slot($slot, $exclude_id = 0) {
    if ($slot === null || $slot === '') {
        return '';
    }
    $ts = strtotime((string) $slot);
    if (!$ts) {
        return new WP_Error('mhm_vq_bad_slot', 'slot must be an ISO-8601 time', array('status' => 400));
    }
    $norm = gmdate('Y-m-d\TH:i:s\Z', $ts);
    $taken = get_posts(array(
        'post_type'      => MHM_VQ_CPT_VIDEO,
        'post_status'    => 'any',
        'posts_per_page' => 5,
        'fields'         => 'ids',
        'post__not_in'   => $exclude_id ? array($exclude_id) : array(),
        'meta_query'     => array(array('key' => '_mhm_slot', 'value' => $norm)),
    ));
    foreach ($taken as $tid) {
        if (mhm_vq_status($tid) !== 'rejected') {
            return new WP_Error('mhm_vq_slot_taken', "slot $norm is already held by video $tid", array('status' => 409));
        }
    }
    return $norm;
}

/** Apply VideoInput fields. Returns true or WP_Error. */
function mhm_vq_apply_input($id, $in) {
    if (isset($in['slot'])) {
        $slot = mhm_vq_clean_slot($in['slot'], $id);
        if (is_wp_error($slot)) {
            return $slot;
        }
        update_post_meta($id, '_mhm_slot', $slot);
    }
    if (isset($in['title'])) {
        wp_update_post(array('ID' => $id, 'post_title' => mhm_vq_clean_text($in['title'], 200)));
    }
    if (isset($in['hook'])) {
        update_post_meta($id, '_mhm_hook', wp_slash(mhm_vq_clean_text($in['hook'], 200)));
    }
    if (isset($in['target_url'])) {
        update_post_meta($id, '_mhm_target_url', esc_url_raw((string) $in['target_url'], array('https', 'http')));
    }
    if (isset($in['scenes']) && is_array($in['scenes'])) {
        $scenes = array();
        foreach (array_slice($in['scenes'], 0, 12) as $s) {
            if (!is_array($s)) {
                continue;
            }
            $scenes[] = array(
                'mod'     => mhm_vq_clean_text($s['mod'] ?? '', 200),
                'creator' => mhm_vq_clean_text($s['creator'] ?? '', 120),
                'text'    => mhm_vq_clean_text($s['text'] ?? '', 200),
                'mod_url' => esc_url_raw((string) ($s['mod_url'] ?? ''), array('https', 'http')),
            );
        }
        mhm_vq_set_meta_json($id, '_mhm_scenes', $scenes);
    }
    if (isset($in['captions'])) {
        mhm_vq_set_meta_json($id, '_mhm_captions', mhm_vq_clean_captions($in['captions']));
    }
    if (isset($in['credits']) && is_array($in['credits'])) {
        $credits = array();
        foreach (array_slice($in['credits'], 0, 12) as $c) {
            if (!is_array($c)) {
                continue;
            }
            $credits[] = array(
                'creator' => mhm_vq_clean_text($c['creator'] ?? '', 120),
                'tiktok'  => isset($c['tiktok']) && $c['tiktok'] ? mhm_vq_clean_text($c['tiktok'], 60) : null,
                'youtube' => isset($c['youtube']) && $c['youtube'] ? mhm_vq_clean_text($c['youtube'], 60) : null,
            );
        }
        mhm_vq_set_meta_json($id, '_mhm_credits', $credits);
    }
    if (array_key_exists('idea_id', $in)) {
        update_post_meta($id, '_mhm_idea_id', absint($in['idea_id']));
    }
    if (isset($in['draft_ref'])) {
        update_post_meta($id, '_mhm_draft_ref', mhm_vq_clean_text($in['draft_ref'], 300));
    }
    if (isset($in['duration_s']) && is_numeric($in['duration_s'])) {
        update_post_meta($id, '_mhm_duration_s', (string) round((float) $in['duration_s'], 2));
    }
    if (isset($in['post_urls']) && is_array($in['post_urls'])) {
        $cur = mhm_vq_meta_json($id, '_mhm_post_urls', array('youtube' => null, 'tiktok' => null));
        foreach ($in['post_urls'] as $k => $u) {
            $k = sanitize_key($k);
            if ($k === '') {
                continue;
            }
            $cur[$k] = $u ? esc_url_raw((string) $u, array('https')) : null;
        }
        mhm_vq_set_meta_json($id, '_mhm_post_urls', $cur);
    }
    return true;
}

/* -------------------------------------------------------------------------
 * Ideas model
 * ---------------------------------------------------------------------- */

function mhm_vq_serialize_idea($post) {
    $id = $post->ID;
    $author = get_userdata($post->post_author);
    $used_in = (int) get_post_meta($id, '_mhm_used_in', true);
    return array(
        'id'         => $id,
        'theme'      => $post->post_title,
        'links'      => mhm_vq_meta_json($id, '_mhm_links', array()),
        'notes'      => (string) get_post_meta($id, '_mhm_notes', true),
        'status'     => get_post_meta($id, '_mhm_status', true) ?: 'new',
        'used_in'    => $used_in ?: null,
        'bot_note'   => (string) get_post_meta($id, '_mhm_bot_note', true),
        'author'     => $author ? $author->display_name : '',
        'created_at' => mhm_vq_utc($post->post_date_gmt),
    );
}

function mhm_vq_parse_links($raw) {
    $out = array();
    foreach (preg_split('/[\s,]+/', (string) $raw) as $l) {
        $l = trim($l);
        if ($l === '') {
            continue;
        }
        $u = esc_url_raw($l, array('https', 'http'));
        if ($u && wp_http_validate_url($u)) {
            $out[] = $u;
        }
        if (count($out) >= 10) {
            break;
        }
    }
    return array_values(array_unique($out));
}

/* -------------------------------------------------------------------------
 * REST API for the Mac jobs
 * ---------------------------------------------------------------------- */

function mhm_vq_rest_can() {
    return current_user_can(MHM_VQ_CAP_BOT);
}

add_action('rest_api_init', function () {
    $id_arg = array('id' => array('validate_callback' => function ($v) { return is_numeric($v); }));

    register_rest_route(MHM_VQ_NS, '/ideas', array(
        'methods' => 'GET', 'permission_callback' => 'mhm_vq_rest_can', 'callback' => 'mhm_vq_rest_list_ideas',
    ));
    register_rest_route(MHM_VQ_NS, '/ideas/(?P<id>\d+)', array(
        'methods' => 'POST', 'permission_callback' => 'mhm_vq_rest_can', 'callback' => 'mhm_vq_rest_update_idea', 'args' => $id_arg,
    ));
    register_rest_route(MHM_VQ_NS, '/videos', array(
        array('methods' => 'GET', 'permission_callback' => 'mhm_vq_rest_can', 'callback' => 'mhm_vq_rest_list_videos'),
        array('methods' => 'POST', 'permission_callback' => 'mhm_vq_rest_can', 'callback' => 'mhm_vq_rest_create_video'),
    ));
    register_rest_route(MHM_VQ_NS, '/videos/(?P<id>\d+)', array(
        array('methods' => 'GET', 'permission_callback' => 'mhm_vq_rest_can', 'callback' => 'mhm_vq_rest_get_video', 'args' => $id_arg),
        array('methods' => 'POST', 'permission_callback' => 'mhm_vq_rest_can', 'callback' => 'mhm_vq_rest_update_video', 'args' => $id_arg),
    ));
    register_rest_route(MHM_VQ_NS, '/videos/(?P<id>\d+)/file', array(
        'methods' => 'POST', 'permission_callback' => 'mhm_vq_rest_can', 'callback' => 'mhm_vq_rest_upload_chunk', 'args' => $id_arg,
    ));
    register_rest_route(MHM_VQ_NS, '/videos/(?P<id>\d+)/finalize', array(
        'methods' => 'POST', 'permission_callback' => 'mhm_vq_rest_can', 'callback' => 'mhm_vq_rest_finalize', 'args' => $id_arg,
    ));
    register_rest_route(MHM_VQ_NS, '/notify', array(
        'methods' => 'POST', 'permission_callback' => 'mhm_vq_rest_can', 'callback' => 'mhm_vq_rest_notify',
    ));
});

function mhm_vq_rest_list_ideas(WP_REST_Request $r) {
    $args = array('post_type' => MHM_VQ_CPT_IDEA, 'post_status' => 'any', 'posts_per_page' => 100, 'orderby' => 'date', 'order' => 'ASC');
    $status = sanitize_key((string) $r->get_param('status'));
    if ($status) {
        $args['meta_query'] = array(array('key' => '_mhm_status', 'value' => $status));
    }
    return array('ideas' => array_map('mhm_vq_serialize_idea', get_posts($args)));
}

function mhm_vq_rest_update_idea(WP_REST_Request $r) {
    $post = get_post((int) $r['id']);
    if (!$post || $post->post_type !== MHM_VQ_CPT_IDEA) {
        return new WP_Error('mhm_vq_not_found', 'idea not found', array('status' => 404));
    }
    $b = (array) $r->get_json_params();
    if (isset($b['status'])) {
        if (!array_key_exists($b['status'], mhm_vq_idea_statuses())) {
            return new WP_Error('mhm_vq_bad_status', 'status must be new, used or declined', array('status' => 400));
        }
        update_post_meta($post->ID, '_mhm_status', $b['status']);
    }
    if (array_key_exists('used_in', $b)) {
        update_post_meta($post->ID, '_mhm_used_in', absint($b['used_in']));
    }
    if (isset($b['bot_note'])) {
        update_post_meta($post->ID, '_mhm_bot_note', wp_slash(mhm_vq_clean_multiline($b['bot_note'], 1000)));
    }
    return array('idea' => mhm_vq_serialize_idea(get_post($post->ID)));
}

function mhm_vq_rest_list_videos(WP_REST_Request $r) {
    $args = array('post_type' => MHM_VQ_CPT_VIDEO, 'post_status' => 'any', 'posts_per_page' => 200, 'orderby' => 'date', 'order' => 'DESC');
    $want = array_filter(array_map('sanitize_key', explode(',', (string) $r->get_param('status'))));
    if ($want) {
        $args['meta_query'] = array(array('key' => '_mhm_status', 'value' => $want, 'compare' => 'IN'));
    }
    return array('videos' => array_map('mhm_vq_serialize_video', get_posts($args)));
}

function mhm_vq_rest_get_video(WP_REST_Request $r) {
    $post = mhm_vq_get_video((int) $r['id']);
    if (!$post) {
        return new WP_Error('mhm_vq_not_found', 'video not found', array('status' => 404));
    }
    return array('video' => mhm_vq_serialize_video($post));
}

function mhm_vq_rest_create_video(WP_REST_Request $r) {
    $b = (array) $r->get_json_params();
    if (empty($b['title']) || empty($b['hook'])) {
        return new WP_Error('mhm_vq_missing', 'title and hook are required', array('status' => 400));
    }
    if (!empty($b['slot'])) {
        $slot = mhm_vq_clean_slot($b['slot']);
        if (is_wp_error($slot)) {
            return $slot;
        }
    }
    $id = wp_insert_post(array(
        'post_type'   => MHM_VQ_CPT_VIDEO,
        'post_status' => 'private',
        'post_title'  => mhm_vq_clean_text($b['title'], 200),
        'post_author' => get_current_user_id(),
    ), true);
    if (is_wp_error($id)) {
        return $id;
    }
    update_post_meta($id, '_mhm_status', 'uploading');
    update_post_meta($id, '_mhm_revision', 0);
    $ok = mhm_vq_apply_input($id, $b);
    if (is_wp_error($ok)) {
        wp_delete_post($id, true);
        return $ok;
    }
    mhm_vq_log($id, 'created');
    return new WP_REST_Response(array('video' => mhm_vq_serialize_video(get_post($id))), 201);
}

function mhm_vq_rest_update_video(WP_REST_Request $r) {
    $post = mhm_vq_get_video((int) $r['id']);
    if (!$post) {
        return new WP_Error('mhm_vq_not_found', 'video not found', array('status' => 404));
    }
    $id = $post->ID;
    $b = (array) $r->get_json_params();
    $cur = mhm_vq_status($id);
    $to = isset($b['status']) ? sanitize_key($b['status']) : null;

    // The bot may move: changes_requested|pending_review -> uploading (re-make), approved -> posted.
    $bot_moves = array('changes_requested' => array('uploading'), 'pending_review' => array('uploading'), 'approved' => array('posted'));
    if ($to !== null && $to !== $cur) {
        if (!isset($bot_moves[$cur]) || !in_array($to, $bot_moves[$cur], true)) {
            return new WP_Error('mhm_vq_bad_transition', "the bot can't move a video from $cur to $to", array('status' => 409));
        }
    }
    $effective = $to ?: $cur;
    $content_keys = array('title', 'hook', 'scenes', 'target_url', 'slot', 'captions', 'credits', 'idea_id', 'draft_ref', 'duration_s');
    $content = array_intersect_key($b, array_flip($content_keys));
    if ($content && $effective !== 'uploading') {
        // Approved or in-review content can't change behind the reviewer's back.
        return new WP_Error('mhm_vq_locked', "content can only change while the video is uploading (it is $effective)", array('status' => 409));
    }
    if (isset($b['post_urls']) && !in_array($effective, array('approved', 'posted'), true)) {
        return new WP_Error('mhm_vq_not_approved', 'post_urls can only be set on approved videos', array('status' => 409));
    }
    $ok = mhm_vq_apply_input($id, $b);
    if (is_wp_error($ok)) {
        return $ok;
    }
    if ($to !== null && $to !== $cur) {
        mhm_vq_set_status($id, $to, isset($b['bot_note']) ? mhm_vq_clean_text($b['bot_note'], 500) : '');
    }
    return array('video' => mhm_vq_serialize_video(get_post($id)));
}

function mhm_vq_rest_upload_chunk(WP_REST_Request $r) {
    $post = mhm_vq_get_video((int) $r['id']);
    if (!$post) {
        return new WP_Error('mhm_vq_not_found', 'video not found', array('status' => 404));
    }
    if (mhm_vq_status($post->ID) !== 'uploading') {
        return new WP_Error('mhm_vq_not_uploading', 'set the video to uploading first', array('status' => 409));
    }
    $kind = $r->get_param('kind') === 'cover' ? 'cover' : ($r->get_param('kind') === 'video' ? 'video' : null);
    if (!$kind) {
        return new WP_Error('mhm_vq_bad_kind', 'kind must be video or cover', array('status' => 400));
    }
    $offset = $r->get_param('offset');
    if (!is_numeric($offset) || (int) $offset < 0) {
        return new WP_Error('mhm_vq_bad_offset', 'offset is required', array('status' => 400));
    }
    $offset = (int) $offset;
    $body = $r->get_body();
    $len = strlen($body);
    if ($len === 0 || $len > MHM_VQ_MAX_CHUNK) {
        return new WP_Error('mhm_vq_bad_chunk', 'chunk must be 1 byte to 1 MiB', array('status' => 413));
    }
    $max = $kind === 'cover' ? MHM_VQ_MAX_COVER : MHM_VQ_MAX_VIDEO;
    if ($offset + $len > $max) {
        return new WP_Error('mhm_vq_too_big', 'file is too large', array('status' => 413));
    }
    $part = mhm_vq_video_dir($post->ID) . '/upload-' . $kind . '.part';
    clearstatcache(true, $part);
    $have = file_exists($part) ? filesize($part) : 0;
    if ($offset === 0) {
        $have = 0;
        $fh = fopen($part, 'wb');
    } elseif ($offset < $have) {
        // A retried chunk we already have.
        return array('kind' => $kind, 'received' => $have);
    } elseif ($offset > $have) {
        return new WP_Error('mhm_vq_gap', "offset $offset is ahead of the $have bytes received", array('status' => 409, 'received' => $have));
    } else {
        $fh = fopen($part, 'ab');
    }
    if (!$fh) {
        return new WP_Error('mhm_vq_io', 'could not write the upload', array('status' => 500));
    }
    fwrite($fh, $body);
    fclose($fh);
    clearstatcache(true, $part);
    return array('kind' => $kind, 'received' => filesize($part));
}

function mhm_vq_rest_finalize(WP_REST_Request $r) {
    $post = mhm_vq_get_video((int) $r['id']);
    if (!$post) {
        return new WP_Error('mhm_vq_not_found', 'video not found', array('status' => 404));
    }
    $id = $post->ID;
    if (mhm_vq_status($id) !== 'uploading') {
        return new WP_Error('mhm_vq_not_uploading', 'nothing is uploading', array('status' => 409));
    }
    $b = (array) $r->get_json_params();
    $dir = mhm_vq_video_dir($id);
    $checks = array(
        'video' => array('sha' => strtolower((string) ($b['video_sha256'] ?? '')), 'magic' => function ($h) { return substr($h, 4, 4) === 'ftyp'; }),
        'cover' => array('sha' => strtolower((string) ($b['cover_sha256'] ?? '')), 'magic' => function ($h) { return substr($h, 0, 3) === "\xFF\xD8\xFF"; }),
    );
    foreach ($checks as $kind => $c) {
        $part = "$dir/upload-$kind.part";
        if (!file_exists($part)) {
            return new WP_Error('mhm_vq_missing_file', "no $kind upload", array('status' => 400));
        }
        if (!preg_match('/^[a-f0-9]{64}$/', $c['sha']) || !hash_equals($c['sha'], hash_file('sha256', $part))) {
            return new WP_Error('mhm_vq_checksum', "$kind checksum does not match; upload it again", array('status' => 422));
        }
        $head = (string) file_get_contents($part, false, null, 0, 16);
        if (!$c['magic']($head)) {
            return new WP_Error('mhm_vq_bad_type', "$kind is not the expected file type", array('status' => 422));
        }
    }
    $rev = (int) get_post_meta($id, '_mhm_revision', true);
    foreach (array('video', 'cover') as $kind) {
        $final = "$dir/" . mhm_vq_kind_file($kind);
        if (file_exists($final)) {
            @rename($final, $final . '.r' . $rev);
        }
        rename("$dir/upload-$kind.part", $final);
    }
    update_post_meta($id, '_mhm_revision', $rev + 1);
    delete_post_meta($id, '_mhm_approved_hash');
    mhm_vq_set_status($id, 'pending_review', $rev > 0 ? 'revision ' . ($rev + 1) . ' uploaded' : 'uploaded');
    return array('video' => mhm_vq_serialize_video(get_post($id)));
}

function mhm_vq_reviewer_emails() {
    $users = get_users(array('role' => 'mhm_video_reviewer', 'fields' => array('user_email')));
    return array_values(array_filter(wp_list_pluck($users, 'user_email'), 'is_email'));
}

function mhm_vq_rest_notify(WP_REST_Request $r) {
    $b = (array) $r->get_json_params();
    if (get_transient('mhm_vq_notified')) {
        return array('sent' => 0, 'reason' => 'already notified in the last 6 hours');
    }
    $waiting = count(get_posts(array(
        'post_type' => MHM_VQ_CPT_VIDEO, 'post_status' => 'any', 'posts_per_page' => 50, 'fields' => 'ids',
        'meta_query' => array(array('key' => '_mhm_status', 'value' => 'pending_review')),
    )));
    if ($waiting === 0) {
        return array('sent' => 0, 'reason' => 'nothing is waiting for review');
    }
    $msg = mhm_vq_clean_multiline($b['message'] ?? '', 500);
    $to = mhm_vq_reviewer_emails();
    if (!$to) {
        return array('sent' => 0, 'reason' => 'no Video Reviewer accounts');
    }
    $subject = sprintf('%d video%s waiting for review', $waiting, $waiting === 1 ? '' : 's');
    $body = ($msg ? $msg . "\n\n" : '') . "Review them here: " . admin_url('admin.php?page=mhm-video-queue') . "\n";
    $sent = 0;
    foreach ($to as $email) {
        if (wp_mail($email, $subject, $body)) {
            $sent++;
        }
    }
    if ($sent === 0) {
        // Don't arm the 6-hour lock when nothing went out, or one mail failure silences the next run too.
        return array('sent' => 0, 'reason' => 'wp_mail failed for every reviewer (check the site\'s mail setup)');
    }
    set_transient('mhm_vq_notified', 1, 6 * HOUR_IN_SECONDS);
    return array('sent' => $sent);
}

/* -------------------------------------------------------------------------
 * File streaming for reviewers (login + capability, Range support)
 * ---------------------------------------------------------------------- */

add_action('admin_post_mhm_vq_file', 'mhm_vq_stream_file');
function mhm_vq_stream_file() {
    if (!current_user_can(MHM_VQ_CAP_REVIEW)) {
        wp_die('Not allowed.', 403);
    }
    $id = isset($_GET['id']) ? absint($_GET['id']) : 0;
    $kind = (isset($_GET['kind']) && $_GET['kind'] === 'cover') ? 'cover' : 'video';
    if (!mhm_vq_get_video($id)) {
        wp_die('Not found.', 404);
    }
    $path = trailingslashit(mhm_vq_storage_dir()) . $id . '/' . mhm_vq_kind_file($kind);
    if (!is_file($path)) {
        wp_die('Not found.', 404);
    }
    $size = filesize($path);
    $start = 0;
    $end = $size - 1;
    $status = 200;
    if (!empty($_SERVER['HTTP_RANGE']) && preg_match('/bytes=(\d*)-(\d*)/', (string) $_SERVER['HTTP_RANGE'], $m)) {
        if ($m[1] === '' && $m[2] !== '') {
            $start = max(0, $size - (int) $m[2]);
        } else {
            $start = (int) $m[1];
            if ($m[2] !== '') {
                $end = min((int) $m[2], $size - 1);
            }
        }
        if ($start > $end || $start >= $size) {
            header('Content-Range: bytes */' . $size);
            status_header(416);
            exit;
        }
        $status = 206;
    }
    while (ob_get_level()) {
        ob_end_clean();
    }
    status_header($status);
    header('Content-Type: ' . ($kind === 'cover' ? 'image/jpeg' : 'video/mp4'));
    header('Accept-Ranges: bytes');
    header('Content-Length: ' . ($end - $start + 1));
    header('Cache-Control: private, max-age=300');
    header('X-Content-Type-Options: nosniff');
    header('X-Robots-Tag: noindex, nofollow');
    if ($status === 206) {
        header("Content-Range: bytes $start-$end/$size");
    }
    $fh = fopen($path, 'rb');
    fseek($fh, $start);
    $left = $end - $start + 1;
    while ($left > 0 && !feof($fh)) {
        $chunk = fread($fh, min(262144, $left));
        echo $chunk;
        $left -= strlen($chunk);
        flush();
    }
    fclose($fh);
    exit;
}

/* -------------------------------------------------------------------------
 * Reviewer actions (admin-post, nonce'd)
 * ---------------------------------------------------------------------- */

function mhm_vq_back($args = array()) {
    $url = add_query_arg($args, admin_url('admin.php?page=mhm-video-queue'));
    wp_safe_redirect($url);
    exit;
}

add_action('admin_post_mhm_vq_review', 'mhm_vq_handle_review');
function mhm_vq_handle_review() {
    if (!current_user_can(MHM_VQ_CAP_REVIEW)) {
        wp_die('Not allowed.', 403);
    }
    $id = isset($_POST['id']) ? absint($_POST['id']) : 0;
    check_admin_referer('mhm_vq_review_' . $id);
    $post = mhm_vq_get_video($id);
    if (!$post) {
        mhm_vq_back(array('mhm_vq_msg' => 'missing'));
    }
    $do = isset($_POST['do']) ? sanitize_key(wp_unslash($_POST['do'])) : '';
    $cur = mhm_vq_status($id);
    $note = isset($_POST['note']) ? mhm_vq_clean_multiline(wp_unslash($_POST['note']), 1000) : '';

    // Caption edits ride along with every action (and with "Save captions").
    if (isset($_POST['captions']) && is_array($_POST['captions']) && in_array($cur, array('pending_review', 'approved', 'changes_requested'), true)) {
        $new = mhm_vq_clean_captions(wp_unslash($_POST['captions']));
        $old = mhm_vq_meta_json($id, '_mhm_captions', array());
        if ($new != array_intersect_key((array) $old, $new)) {
            if ($cur === 'approved') {
                // Approval covers the exact captions; editing them sends it back for a fresh approve.
                update_post_meta($id, '_mhm_status', 'pending_review');
                mhm_vq_log($id, 'unapproved', 'captions edited after approval');
                $cur = 'pending_review';
            }
            mhm_vq_set_meta_json($id, '_mhm_captions', $new);
            mhm_vq_log($id, 'captions_edited');
        }
    }

    switch ($do) {
        case 'approve':
            if ($cur !== 'pending_review') {
                mhm_vq_back(array('mhm_vq_msg' => 'stale'));
            }
            $dir = trailingslashit(mhm_vq_storage_dir()) . $id;
            if (!file_exists("$dir/video.mp4")) {
                mhm_vq_back(array('mhm_vq_msg' => 'nofile'));
            }
            if (mhm_vq_tiktok_direct()) {
                $tt = mhm_vq_tt_opts_from_post(wp_unslash($_POST));
                if (!is_array($tt)) {
                    mhm_vq_back(array('mhm_vq_msg' => $tt) + array('mhm_vq_open' => $id));
                }
                mhm_vq_set_meta_json($id, '_mhm_tiktok_opts', $tt);
            }
            update_post_meta($id, '_mhm_approved_hash', hash_file('sha256', "$dir/video.mp4"));
            mhm_vq_post_reset_on_approve($id);
            update_post_meta($id, '_mhm_approved_by', get_current_user_id());
            mhm_vq_set_status($id, 'approved', $note);
            mhm_vq_back(array('mhm_vq_msg' => 'approved'));
            break;
        case 'changes':
            if (!in_array($cur, array('pending_review', 'approved'), true)) {
                mhm_vq_back(array('mhm_vq_msg' => 'stale'));
            }
            if ($note === '') {
                mhm_vq_back(array('mhm_vq_msg' => 'neednote', 'mhm_vq_open' => $id));
            }
            update_post_meta($id, '_mhm_change_note', wp_slash($note));
            delete_post_meta($id, '_mhm_approved_hash');
            mhm_vq_set_status($id, 'changes_requested', $note);
            mhm_vq_back(array('mhm_vq_msg' => 'changes'));
            break;
        case 'reject':
            if (!in_array($cur, array('pending_review', 'approved', 'changes_requested'), true)) {
                mhm_vq_back(array('mhm_vq_msg' => 'stale'));
            }
            delete_post_meta($id, '_mhm_approved_hash');
            mhm_vq_set_status($id, 'rejected', $note);
            mhm_vq_back(array('mhm_vq_msg' => 'rejected'));
            break;
        case 'unapprove':
            if ($cur !== 'approved') {
                mhm_vq_back(array('mhm_vq_msg' => 'stale'));
            }
            delete_post_meta($id, '_mhm_approved_hash');
            update_post_meta($id, '_mhm_status', 'pending_review');
            mhm_vq_log($id, 'unapproved');
            wp_update_post(array('ID' => $id));
            mhm_vq_back(array('mhm_vq_msg' => 'unapproved'));
            break;
        case 'save':
        default:
            mhm_vq_back(array('mhm_vq_msg' => 'saved'));
    }
}

add_action('admin_post_mhm_vq_idea', 'mhm_vq_handle_idea');
function mhm_vq_handle_idea() {
    if (!current_user_can(MHM_VQ_CAP_REVIEW)) {
        wp_die('Not allowed.', 403);
    }
    check_admin_referer('mhm_vq_idea');
    $back = admin_url('admin.php?page=mhm-video-ideas');
    $do = isset($_POST['do']) ? sanitize_key(wp_unslash($_POST['do'])) : 'add';

    if ($do === 'withdraw') {
        $id = isset($_POST['id']) ? absint($_POST['id']) : 0;
        $p = get_post($id);
        if ($p && $p->post_type === MHM_VQ_CPT_IDEA && (get_post_meta($id, '_mhm_status', true) ?: 'new') === 'new'
            && ((int) $p->post_author === get_current_user_id() || current_user_can('manage_options'))) {
            wp_delete_post($id, true);
            wp_safe_redirect(add_query_arg('mhm_vq_msg', 'withdrawn', $back));
            exit;
        }
        wp_safe_redirect(add_query_arg('mhm_vq_msg', 'stale', $back));
        exit;
    }

    $theme = isset($_POST['theme']) ? mhm_vq_clean_text(wp_unslash($_POST['theme']), 120) : '';
    if ($theme === '') {
        wp_safe_redirect(add_query_arg('mhm_vq_msg', 'needtheme', $back));
        exit;
    }
    $links = mhm_vq_parse_links(isset($_POST['links']) ? wp_unslash($_POST['links']) : '');
    $notes = isset($_POST['notes']) ? mhm_vq_clean_multiline(wp_unslash($_POST['notes']), 1000) : '';
    $id = wp_insert_post(array(
        'post_type'   => MHM_VQ_CPT_IDEA,
        'post_status' => 'private',
        'post_title'  => $theme,
        'post_author' => get_current_user_id(),
    ));
    if ($id && !is_wp_error($id)) {
        mhm_vq_set_meta_json($id, '_mhm_links', $links);
        update_post_meta($id, '_mhm_notes', wp_slash($notes));
        update_post_meta($id, '_mhm_status', 'new');
    }
    wp_safe_redirect(add_query_arg('mhm_vq_msg', 'added', $back));
    exit;
}

/* -------------------------------------------------------------------------
 * Admin screens
 * ---------------------------------------------------------------------- */

add_action('admin_menu', function () {
    add_menu_page('Videos', 'Videos', MHM_VQ_CAP_REVIEW, 'mhm-video-queue', 'mhm_vq_render_queue', 'dashicons-video-alt3', 3);
    add_submenu_page('mhm-video-queue', 'Video queue', 'Queue', MHM_VQ_CAP_REVIEW, 'mhm-video-queue', 'mhm_vq_render_queue');
    add_submenu_page('mhm-video-queue', 'Video ideas', 'Ideas', MHM_VQ_CAP_REVIEW, 'mhm-video-ideas', 'mhm_vq_render_ideas');
});

add_action('admin_head', function () {
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || strpos((string) $screen->id, 'mhm-video') === false) {
        return;
    }
    ?>
    <style>
        .mhm-vq-wrap { max-width: 1100px; }
        .mhm-vq-card { background: #fff; border: 1px solid #dcdcde; border-radius: 6px; padding: 16px; margin: 16px 0; display: grid; grid-template-columns: 270px 1fr; gap: 20px; }
        .mhm-vq-card video, .mhm-vq-card img.mhm-vq-cover { width: 270px; aspect-ratio: 9 / 16; background: #0B0F19; border-radius: 4px; display: block; object-fit: cover; }
        .mhm-vq-card h2 { margin: 0 0 4px; font-size: 18px; }
        .mhm-vq-meta { color: #50575e; margin: 0 0 12px; }
        .mhm-vq-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; background: #f0f0f1; color: #1d2327; }
        .mhm-vq-badge.pending_review { background: #fcf0e3; color: #8a4b00; }
        .mhm-vq-badge.approved { background: #e6f4ea; color: #1e6b33; }
        .mhm-vq-badge.changes_requested { background: #fbeaea; color: #8a1f1f; }
        .mhm-vq-badge.posted { background: #e7eefb; color: #1b3f8f; }
        .mhm-vq-scenes { margin: 0 0 12px 18px; }
        .mhm-vq-card label { font-weight: 600; display: block; margin: 10px 0 4px; }
        .mhm-vq-card textarea, .mhm-vq-card input[type=text] { width: 100%; }
        .mhm-vq-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; margin-top: 14px; }
        .mhm-vq-note { margin-top: 10px; }
        .mhm-vq-log { color: #646970; font-size: 12px; margin-top: 12px; }
        .mhm-vq-log li { margin: 0; }
        .mhm-vq-section-title { margin-top: 28px; }
        .mhm-vq-idea-form { background: #fff; border: 1px solid #dcdcde; border-radius: 6px; padding: 16px; max-width: 700px; }
        .mhm-vq-idea-form input[type=text], .mhm-vq-idea-form textarea { width: 100%; }
        @media (max-width: 782px) { .mhm-vq-card { grid-template-columns: 1fr; } .mhm-vq-card video, .mhm-vq-card img.mhm-vq-cover { width: 100%; max-width: 320px; } }
    </style>
    <?php
});

function mhm_vq_file_url($id, $kind, $rev) {
    return add_query_arg(array('action' => 'mhm_vq_file', 'id' => $id, 'kind' => $kind, 'v' => $rev), admin_url('admin-post.php'));
}

function mhm_vq_fmt_slot($slot) {
    if (!$slot) {
        return 'no slot';
    }
    try {
        $dt = new DateTime($slot);
        $dt->setTimezone(new DateTimeZone('America/New_York'));
        return $dt->format('D M j, g:i a') . ' ET';
    } catch (Exception $e) {
        return $slot;
    }
}

function mhm_vq_notice() {
    $msgs = array(
        'approved'   => array('success', 'Approved. It will go out at its slot.'),
        'changes'    => array('success', 'Sent back with your note. The new version usually shows up within a day.'),
        'rejected'   => array('success', 'Rejected. It will not be posted.'),
        'unapproved' => array('success', 'Unapproved. It is waiting for review again.'),
        'saved'      => array('success', 'Captions saved.'),
        'neednote'   => array('error', 'Write a note saying what to change, then press Request changes.'),
        'stale'      => array('warning', 'That video changed since you opened the page. Check it again.'),
        'nofile'     => array('error', 'The video file is missing, so it cannot be approved.'),
        'missing'    => array('error', 'That video no longer exists.'),
        'added'      => array('success', 'Idea added. The next weekly run will read it.'),
        'withdrawn'  => array('success', 'Idea removed.'),
        'needtheme'  => array('error', 'Add a theme for the idea.'),
        'retry'      => array('success', 'It will be tried again on the next posting run (within 5 minutes).'),
        'ttprivacy'  => array('error', 'Pick who can see it on TikTok, then approve again.'),
        'ttcommercial' => array('error', 'You ticked that the video promotes something. Pick "Your brand", "Branded content" or both, then approve again.'),
        'ttbranded'  => array('error', 'Branded content can\'t be posted as "Only me" on TikTok. Pick another privacy setting.'),
    );
    $k = isset($_GET['mhm_vq_msg']) ? sanitize_key(wp_unslash($_GET['mhm_vq_msg'])) : '';
    if (isset($msgs[$k])) {
        printf('<div class="notice notice-%s is-dismissible"><p>%s</p></div>', esc_attr($msgs[$k][0]), esc_html($msgs[$k][1]));
    }
    if (current_user_can('manage_options') && get_option('mhm_vq_storage_in_webroot')) {
        echo '<div class="notice notice-warning"><p>Video files are stored inside the web root (the folder outside it was not writable). The folder name is random, but nginx ignores .htaccess. Make <code>'
            . esc_html(dirname(untrailingslashit(ABSPATH)) . '/mhm-video-queue')
            . '</code> writable by PHP and delete the <code>mhm_vq_storage_dir</code> option to move them.</p></div>';
    }
}

function mhm_vq_render_queue() {
    if (!current_user_can(MHM_VQ_CAP_REVIEW)) {
        wp_die('Not allowed.');
    }
    $posts = get_posts(array('post_type' => MHM_VQ_CPT_VIDEO, 'post_status' => 'any', 'posts_per_page' => 100, 'orderby' => 'date', 'order' => 'DESC'));
    $groups = array('pending_review' => array(), 'changes_requested' => array(), 'approved' => array(), 'posted' => array(), 'rejected' => array());
    foreach ($posts as $p) {
        $s = mhm_vq_status($p->ID);
        if (isset($groups[$s])) {
            $groups[$s][] = mhm_vq_serialize_video($p);
        }
    }
    foreach ($groups as &$g) {
        usort($g, function ($a, $b) { return strcmp((string) $a['slot'], (string) $b['slot']); });
    }
    unset($g);
    $labels = mhm_vq_statuses();
    $open = isset($_GET['mhm_vq_open']) ? absint($_GET['mhm_vq_open']) : 0;

    echo '<div class="wrap mhm-vq-wrap"><h1>Video queue</h1>';
    mhm_vq_notice();
    echo '<p>Watch each video, check the captions and credits, then approve it, send it back with a note, or reject it. Approved videos go out on YouTube and TikTok at their slot. Nothing is posted until you approve it.</p>';

    $sections = array(
        'pending_review'    => 'Waiting for your review',
        'changes_requested' => 'Being re-made',
        'approved'          => 'Approved — not posted yet',
        'posted'            => 'Posted',
        'rejected'          => 'Rejected',
    );
    foreach ($sections as $status => $title) {
        $items = $groups[$status];
        if ($status !== 'pending_review' && !$items) {
            continue;
        }
        $collapsed = in_array($status, array('posted', 'rejected'), true);
        echo '<h2 class="mhm-vq-section-title">' . esc_html($title) . ' (' . count($items) . ')</h2>';
        if (!$items) {
            echo '<p>Nothing is waiting. New videos arrive on Sundays.</p>';
            continue;
        }
        if ($collapsed) {
            echo '<details><summary>Show</summary>';
        }
        foreach ($items as $v) {
            mhm_vq_render_card($v, $labels, $open);
        }
        if ($collapsed) {
            echo '</details>';
        }
    }
    echo '</div>';
}

/** TikTok is on, in direct mode, and connected: the Approve form must collect TikTok's required choices. */
function mhm_vq_tiktok_direct() {
    $s = mhm_vq_settings();
    return !empty($s['tiktok_enabled']) && $s['tiktok_mode'] === 'direct' && mhm_vq_is_connected('tiktok');
}

function mhm_vq_render_card($v, $labels, $open) {
    $id = (int) $v['id'];
    $s = $v['status'];
    $editable = in_array($s, array('pending_review', 'approved'), true);
    $cap = (array) $v['captions'];
    echo '<div class="mhm-vq-card" id="video-' . $id . '"><div>';
    if ($v['files']['video']) {
        printf('<video controls preload="metadata" playsinline poster="%s" src="%s"></video>',
            esc_url($v['files']['cover'] ? mhm_vq_file_url($id, 'cover', $v['revision']) : ''),
            esc_url(mhm_vq_file_url($id, 'video', $v['revision'])));
    } elseif ($v['files']['cover']) {
        printf('<img class="mhm-vq-cover" alt="" src="%s">', esc_url(mhm_vq_file_url($id, 'cover', $v['revision'])));
    }
    echo '</div><div>';
    // The hook marks the pink word as *word*; show it the way the video does.
    $hook = esc_html($v['hook'] ?: $v['title']);
    $hook = preg_replace('/\*([^*]+)\*/', '<span style="color:#EC4899">$1</span>', $hook);
    printf('<h2>%s</h2>', $hook);
    $badge = $labels[$s] ?? $s;
    $badge_class = $s;
    if ($s === 'approved') {
        $states = wp_list_pluck(mhm_vq_post_state($id), 'state');
        if (in_array('failed', $states, true)) {
            $badge = 'Approved — needs attention';
            $badge_class = 'changes_requested';
        } elseif (array_intersect($states, array('posted', 'inbox'))) {
            $badge = 'Approved — partly posted';
        } elseif (array_intersect($states, array('posting', 'processing'))) {
            $badge = 'Approved — posting now';
        }
    }
    printf('<p class="mhm-vq-meta"><span class="mhm-vq-badge %s">%s</span> &middot; %s &middot; version %d%s</p>',
        esc_attr($badge_class), esc_html($badge), esc_html(mhm_vq_fmt_slot($v['slot'])), (int) $v['revision'],
        $v['duration_s'] ? ' &middot; ' . esc_html(number_format((float) $v['duration_s'], 1)) . ' s' : '');
    if ($v['target_url']) {
        printf('<p>Sends viewers to <a href="%1$s" target="_blank" rel="noopener">%1$s</a></p>', esc_url($v['target_url']));
    }
    if ($v['scenes']) {
        echo '<ol class="mhm-vq-scenes">';
        foreach ($v['scenes'] as $sc) {
            $mod = esc_html($sc['mod']);
            if (!empty($sc['mod_url'])) {
                $mod = '<a href="' . esc_url($sc['mod_url']) . '" target="_blank" rel="noopener">' . $mod . '</a>';
            }
            printf('<li>%s by %s — “%s”</li>', $mod, esc_html($sc['creator']), esc_html($sc['text']));
        }
        echo '</ol>';
    }
    if ($v['credits']) {
        $tags = array();
        foreach ($v['credits'] as $c) {
            $tags[] = esc_html($c['creator']) . ($c['tiktok'] ? ' (TikTok ' . esc_html($c['tiktok']) . ')' : '');
        }
        echo '<p><strong>Credited:</strong> ' . implode(', ', $tags) . '</p>';
    }
    if ($s === 'changes_requested' && $v['change_note']) {
        echo '<p><strong>Your note:</strong> ' . esc_html($v['change_note']) . '</p>';
    }
    $has_state = (bool) mhm_vq_post_state($id);
    if ($s === 'approved' || ($s === 'posted' && $has_state)) {
        mhm_vq_render_platform_status($id, $s);
    } elseif ($s === 'posted') {
        foreach ((array) $v['post_urls'] as $plat => $u) {
            if ($u) {
                printf('<p>%s: <a href="%2$s" target="_blank" rel="noopener">%2$s</a></p>', esc_html(ucfirst($plat)), esc_url($u));
            }
        }
    }

    echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
    wp_nonce_field('mhm_vq_review_' . $id);
    echo '<input type="hidden" name="action" value="mhm_vq_review"><input type="hidden" name="id" value="' . $id . '">';
    $ro = $editable ? '' : ' readonly';
    printf('<label for="yt-title-%1$d">YouTube title</label><input type="text" id="yt-title-%1$d" name="captions[youtube_title]" maxlength="100" value="%2$s"%3$s>',
        $id, esc_attr($cap['youtube_title'] ?? ''), $ro);
    printf('<label for="yt-desc-%1$d">YouTube description</label><textarea id="yt-desc-%1$d" name="captions[youtube_description]" rows="8"%3$s>%2$s</textarea>',
        $id, esc_textarea($cap['youtube_description'] ?? ''), $ro);
    printf('<label for="tt-%1$d">TikTok caption</label><textarea id="tt-%1$d" name="captions[tiktok]" rows="6"%3$s>%2$s</textarea>',
        $id, esc_textarea($cap['tiktok'] ?? ''), $ro);

    if ($s === 'pending_review' && mhm_vq_tiktok_direct()) {
        mhm_vq_render_tiktok_choices($v);
    } elseif ($s === 'approved' && mhm_vq_tiktok_direct()) {
        $o = mhm_vq_tt_opts($id);
        if ($o['privacy_level'] !== '') {
            $allow = array();
            foreach (array('comment' => 'comments', 'duet' => 'duet', 'stitch' => 'stitch') as $k => $w) {
                if ($o['allow_' . $k]) {
                    $allow[] = $w;
                }
            }
            $brand = array_filter(array($o['brand_organic'] ? 'your brand' : '', $o['brand_content'] ? 'branded content' : ''));
            printf('<p class="mhm-vq-meta">TikTok: %s; allows %s%s.</p>', esc_html(mhm_vq_tt_privacy_label($o['privacy_level'])),
                esc_html($allow ? implode(', ', $allow) : 'nothing'), $brand ? '; discloses ' . esc_html(implode(' and ', $brand)) : '');
        }
    }

    if ($s === 'pending_review') {
        $note_open = $open === $id ? ' open' : '';
        echo '<div class="mhm-vq-actions">';
        echo '<button class="button button-primary" name="do" value="approve">Approve</button>';
        echo '<button class="button" name="do" value="save">Save captions</button>';
        echo '<button class="button" name="do" value="reject" onclick="return confirm(\'Reject this video? It will not be posted.\')">Reject</button>';
        echo '</div>';
        printf('<details class="mhm-vq-note"%s><summary>Request changes</summary><label for="note-%d">What should change?</label><textarea id="note-%d" name="note" rows="3" placeholder="e.g. swap the second mod for something less dark, and make the hook about fall"></textarea><p><button class="button" name="do" value="changes">Request changes</button></p></details>',
            $note_open, $id, $id);
    } elseif ($s === 'approved') {
        echo '<div class="mhm-vq-actions">';
        echo '<button class="button" name="do" value="save">Save captions (needs approving again)</button>';
        echo '<button class="button" name="do" value="unapprove">Unapprove</button>';
        echo '<button class="button" name="do" value="reject" onclick="return confirm(\'Reject this video? It will not be posted.\')">Reject</button>';
        echo '</div>';
    }
    echo '</form>';

    if ($v['review_log']) {
        echo '<ul class="mhm-vq-log">';
        foreach (array_slice(array_reverse($v['review_log']), 0, 5) as $l) {
            printf('<li>%s — %s %s%s</li>', esc_html(mhm_vq_fmt_slot($l['at'])), esc_html($l['user']), esc_html(str_replace('_', ' ', $l['action'])),
                $l['note'] ? ': ' . esc_html($l['note']) : '');
        }
        echo '</ul>';
    }
    echo '</div></div>';
}

function mhm_vq_render_ideas() {
    if (!current_user_can(MHM_VQ_CAP_REVIEW)) {
        wp_die('Not allowed.');
    }
    $ideas = array_map('mhm_vq_serialize_idea', get_posts(array(
        'post_type' => MHM_VQ_CPT_IDEA, 'post_status' => 'any', 'posts_per_page' => 100, 'orderby' => 'date', 'order' => 'DESC',
    )));
    $labels = mhm_vq_idea_statuses();
    echo '<div class="wrap mhm-vq-wrap"><h1>Video ideas</h1>';
    mhm_vq_notice();
    echo '<p>Suggest a theme for an upcoming video. Add links to mods or pages on musthavemods.com you want in it, if you have them. Every Sunday the weekly run reads new ideas first, then fills the rest of the week from the most-visited pages. Links to other sites are skipped.</p>';
    echo '<form class="mhm-vq-idea-form" method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
    wp_nonce_field('mhm_vq_idea');
    echo '<input type="hidden" name="action" value="mhm_vq_idea"><input type="hidden" name="do" value="add">';
    echo '<p><label for="mhm-vq-theme"><strong>Theme</strong></label><input type="text" id="mhm-vq-theme" name="theme" maxlength="120" required placeholder="e.g. cozy fall kitchen cc"></p>';
    echo '<p><label for="mhm-vq-links"><strong>Links</strong> (optional, one per line)</label><textarea id="mhm-vq-links" name="links" rows="4" placeholder="https://musthavemods.com/mods/..."></textarea></p>';
    echo '<p><label for="mhm-vq-notes"><strong>Notes</strong> (optional)</label><textarea id="mhm-vq-notes" name="notes" rows="3" maxlength="1000" placeholder="e.g. free mods only, maxis-match"></textarea></p>';
    echo '<p><button class="button button-primary">Add idea</button></p></form>';

    echo '<h2 class="mhm-vq-section-title">Your ideas</h2>';
    if (!$ideas) {
        echo '<p>No ideas yet.</p></div>';
        return;
    }
    echo '<table class="widefat striped"><thead><tr><th>Theme</th><th>Links</th><th>Notes</th><th>Status</th><th></th></tr></thead><tbody>';
    foreach ($ideas as $i) {
        $links = array();
        foreach ($i['links'] as $l) {
            $links[] = '<a href="' . esc_url($l) . '" target="_blank" rel="noopener">' . esc_html(preg_replace('#^https?://(www\.)?#', '', $l)) . '</a>';
        }
        $status = esc_html($labels[$i['status']] ?? $i['status']);
        if ($i['used_in']) {
            $status .= ' — <a href="' . esc_url(admin_url('admin.php?page=mhm-video-queue#video-' . (int) $i['used_in'])) . '">see video</a>';
        }
        if ($i['bot_note']) {
            $status .= '<br><small>' . esc_html($i['bot_note']) . '</small>';
        }
        echo '<tr><td>' . esc_html($i['theme']) . '<br><small>' . esc_html($i['author']) . ', ' . esc_html(mhm_vq_fmt_slot($i['created_at'])) . '</small></td>';
        echo '<td>' . implode('<br>', $links) . '</td><td>' . nl2br(esc_html($i['notes'])) . '</td><td>' . $status . '</td><td>';
        if ($i['status'] === 'new') {
            echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
            wp_nonce_field('mhm_vq_idea');
            echo '<input type="hidden" name="action" value="mhm_vq_idea"><input type="hidden" name="do" value="withdraw"><input type="hidden" name="id" value="' . (int) $i['id'] . '">';
            echo '<button class="button-link" onclick="return confirm(\'Remove this idea?\')">Remove</button></form>';
        }
        echo '</td></tr>';
    }
    echo '</tbody></table></div>';
}
