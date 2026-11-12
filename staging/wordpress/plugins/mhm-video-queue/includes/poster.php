<?php
/**
 * The poster: sends approved videos to YouTube and TikTok once their slot time has passed.
 *
 * Runs from WP-cron every 5 minutes and from the Mac every 15 minutes (POST /post-due), because WP-cron
 * only fires when someone visits the site. A lock option makes sure two runs never overlap.
 *
 * Per video, per platform, the state lives in _mhm_post_state:
 *   queued → posting → posted                              (YouTube)
 *   queued → posting → processing → inbox | posted         (TikTok)
 *   any step can end in retry (one automatic retry for network-type errors) or failed (needs a person).
 * "posting" is written before any network call, so a run that dies mid-upload leaves "posting" behind and
 * the next run marks it failed instead of uploading a second copy. A platform that has posted is never
 * posted again for that video, even if the video is unapproved and approved again.
 */

if (!defined('ABSPATH')) {
    exit;
}

define('MHM_VQ_POST_HOOK', 'mhm_vq_post_due');
define('MHM_VQ_POST_MAX_NEW', 3);          // new uploads per run (status checks don't count)
define('MHM_VQ_POST_STUCK', 30 * 60);      // "posting" older than this = the run died
define('MHM_VQ_POST_PROC_MAX', 2 * 3600);  // TikTok processing longer than this = give up

add_filter('cron_schedules', function ($s) {
    $s['mhm_vq_5min'] = array('interval' => 300, 'display' => 'Every 5 minutes (MHM Video Queue)');
    return $s;
});

add_action('init', function () {
    if (!wp_next_scheduled(MHM_VQ_POST_HOOK)) {
        wp_schedule_event(time() + 60, 'mhm_vq_5min', MHM_VQ_POST_HOOK);
    }
});

add_action(MHM_VQ_POST_HOOK, function () {
    mhm_vq_run_poster('cron');
});

function mhm_vq_post_deactivate() {
    wp_clear_scheduled_hook(MHM_VQ_POST_HOOK);
    delete_option('mhm_vq_post_lock');
}

/* ---- state helpers ------------------------------------------------------ */

function mhm_vq_post_state($id) {
    return mhm_vq_meta_json($id, '_mhm_post_state', array());
}

function mhm_vq_set_platform_state($id, $p, $changes) {
    $all = mhm_vq_post_state($id);
    $all[$p] = array_merge(array('state' => 'queued', 'attempts' => 0), $all[$p] ?? array(), $changes, array('updated_at' => time()));
    mhm_vq_set_meta_json($id, '_mhm_post_state', $all);
    return $all[$p];
}

function mhm_vq_alert_to() {
    $s = mhm_vq_settings();
    return is_email($s['alert_email']) ? $s['alert_email'] : get_option('admin_email');
}

function mhm_vq_alert($subject, $body) {
    $queue = admin_url('admin.php?page=mhm-video-queue');
    wp_mail(mhm_vq_alert_to(), '[MHM videos] ' . $subject, $body . "\n\nQueue: $queue\n");
}

/* ---- the run ------------------------------------------------------------ */

/** Returns a one-line summary of what happened. */
function mhm_vq_run_poster($via = 'cron') {
    if (!function_exists('sodium_crypto_secretbox')) {
        return 'skipped: sodium missing';
    }
    $platforms = mhm_vq_active_platforms();
    if (!$platforms) {
        update_option('mhm_vq_post_last_run', array('at' => gmdate('c'), 'via' => $via, 'summary' => 'No platform is switched on.'), false);
        return 'no platform switched on';
    }
    // Lock: add_option is atomic (unique option_name). A lock older than 15 minutes is from a run that died.
    if (!add_option('mhm_vq_post_lock', time(), '', false)) {
        $held = (int) get_option('mhm_vq_post_lock');
        if ($held && $held > time() - 900) {
            return 'another run is in progress';
        }
        delete_option('mhm_vq_post_lock');
        if (!add_option('mhm_vq_post_lock', time(), '', false)) {
            return 'another run is in progress';
        }
    }
    if (function_exists('set_time_limit')) {
        @set_time_limit(300);
    }
    ignore_user_abort(true);

    $counts = array('posted' => 0, 'inbox' => 0, 'processing' => 0, 'failed' => 0, 'waiting' => 0, 'started' => 0);
    try {
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $ids = get_posts(array(
            'post_type'      => MHM_VQ_CPT_VIDEO,
            'post_status'    => 'any',
            'posts_per_page' => 50,
            'fields'         => 'ids',
            'meta_query'     => array(array('key' => '_mhm_status', 'value' => 'approved')),
        ));
        $due = array();
        foreach ($ids as $id) {
            $slot = (string) get_post_meta($id, '_mhm_slot', true);
            if ($slot !== '' && strcmp($slot, $now) <= 0) {
                $due[$id] = $slot;
            }
        }
        asort($due);
        $budget = MHM_VQ_POST_MAX_NEW;
        foreach (array_keys($due) as $id) {
            mhm_vq_post_video((int) $id, $platforms, $budget, $counts);
        }
    } finally {
        delete_option('mhm_vq_post_lock');
    }

    $bits = array();
    foreach ($counts as $k => $n) {
        if ($n) {
            $bits[] = "$n $k";
        }
    }
    $summary = $bits ? implode(', ', $bits) . '.' : 'Nothing due.';
    update_option('mhm_vq_post_last_run', array('at' => gmdate('c'), 'via' => $via, 'summary' => $summary), false);
    return $summary;
}

function mhm_vq_post_video($id, $platforms, &$budget, &$counts) {
    $labels = mhm_vq_platforms();
    $title = wp_specialchars_decode((string) get_post_field('post_title', $id, 'raw'), ENT_QUOTES); // plain text for email, no "Private:" prefix

    // The file must be exactly the one that was approved.
    $approved = (string) get_post_meta($id, '_mhm_approved_hash', true);
    $path = trailingslashit(mhm_vq_storage_dir()) . $id . '/video.mp4';
    $hash = is_file($path) ? hash_file('sha256', $path) : '';
    if ($approved === '' || !hash_equals($approved, $hash)) {
        delete_post_meta($id, '_mhm_approved_hash');
        update_post_meta($id, '_mhm_status', 'pending_review');
        mhm_vq_log($id, 'unapproved', 'the video file changed after approval, so it was not posted');
        wp_update_post(array('ID' => $id));
        mhm_vq_alert("Not posted: \"$title\" changed after approval", "The video file for \"$title\" is not the one that was approved, so nothing was posted. It is back in the queue for review.");
        $counts['failed']++;
        return;
    }

    foreach ($platforms as $p) {
        // Re-check every time: a reviewer may have unapproved it while the previous platform uploaded.
        wp_cache_delete($id, 'post_meta');
        if (mhm_vq_status($id) !== 'approved') {
            return;
        }
        $st = mhm_vq_post_state($id)[$p] ?? array('state' => 'queued', 'attempts' => 0);
        $state = $st['state'] ?? 'queued';

        if (in_array($state, array('posted', 'inbox', 'failed'), true)) {
            continue;
        }
        if ($state === 'posting') {
            if (time() - (int) ($st['started_at'] ?? 0) > MHM_VQ_POST_STUCK) {
                $msg = 'The upload was interrupted and may or may not have reached ' . $labels[$p] . '. Check ' . $labels[$p] . ', then press Retry here only if it isn\'t there.';
                mhm_vq_set_platform_state($id, $p, array('state' => 'failed', 'error' => $msg, 'note' => null, 'uncertain' => true));
                mhm_vq_log($id, $p . '_failed', $msg);
                mhm_vq_alert("{$labels[$p]} upload interrupted: \"$title\"", $msg);
                $counts['failed']++;
            }
            continue;
        }
        if ($state === 'processing') {
            mhm_vq_post_check_tiktok($id, $st, $title, $counts);
            continue;
        }

        // queued or retry: a new upload.
        if (!mhm_vq_is_connected($p)) {
            $counts['waiting']++;
            if (!get_transient('mhm_vq_alert_nc_' . $p)) {
                set_transient('mhm_vq_alert_nc_' . $p, 1, DAY_IN_SECONDS);
                mhm_vq_alert("{$labels[$p]} is switched on but not connected", "\"$title\" is due but {$labels[$p]} is not connected, so it is waiting. Connect it in Videos → Posting, or switch {$labels[$p]} off there.");
            }
            continue;
        }
        if ($budget <= 0) {
            $counts['waiting']++;
            continue;
        }
        $budget--;
        $counts['started']++;
        $attempts = (int) ($st['attempts'] ?? 0) + 1;
        mhm_vq_set_platform_state($id, $p, array('state' => 'posting', 'attempts' => $attempts, 'started_at' => time(), 'error' => null, 'note' => null));
        $res = $p === 'youtube' ? mhm_vq_yt_post($id) : mhm_vq_tt_post($id);

        if (is_wp_error($res)) {
            $data = $res->get_error_data();
            $retry = is_array($data) && !empty($data['retryable']) && $attempts < 2;
            $msg = $res->get_error_message();
            mhm_vq_set_platform_state($id, $p, array('state' => $retry ? 'retry' : 'failed', 'error' => $msg, 'note' => null, 'uncertain' => is_array($data) && !empty($data['uncertain'])));
            mhm_vq_log($id, $p . ($retry ? '_will_retry' : '_failed'), $msg);
            if (!$retry) {
                mhm_vq_alert("{$labels[$p]} post failed: \"$title\"", "{$labels[$p]} said: $msg\n\nFix the cause, then press Retry on the video in the queue.");
                $counts['failed']++;
            }
            continue;
        }
        mhm_vq_set_platform_state($id, $p, array_merge($res, array('error' => null)));
        mhm_vq_log($id, $p . '_' . $res['state'], $res['note'] ?? '');
        if ($res['state'] === 'posted') {
            $counts['posted']++;
        } else {
            $counts['processing']++;
        }
    }
    mhm_vq_post_finish_if_done($id, $platforms);
}

function mhm_vq_post_check_tiktok($id, $st, $title, &$counts) {
    $res = mhm_vq_tt_poll((string) ($st['publish_id'] ?? ''));
    if (is_wp_error($res)) {
        $msg = $res->get_error_message();
        mhm_vq_set_platform_state($id, 'tiktok', array('state' => 'failed', 'error' => $msg, 'note' => null, 'uncertain' => false));
        mhm_vq_log($id, 'tiktok_failed', $msg);
        mhm_vq_alert("TikTok post failed: \"$title\"", "TikTok said: $msg\n\nFix the cause, then press Retry on the video in the queue.");
        $counts['failed']++;
        return;
    }
    if ($res['state'] === 'processing') {
        if (time() - (int) ($st['started_at'] ?? 0) > MHM_VQ_POST_PROC_MAX) {
            $msg = 'TikTok has been processing it for over 2 hours. Check TikTok before retrying.';
            mhm_vq_set_platform_state($id, 'tiktok', array('state' => 'failed', 'error' => $msg, 'note' => null, 'uncertain' => true));
            mhm_vq_log($id, 'tiktok_failed', $msg);
            mhm_vq_alert("TikTok stuck: \"$title\"", $msg);
            $counts['failed']++;
        } else {
            $counts['processing']++;
        }
        return;
    }
    mhm_vq_set_platform_state($id, 'tiktok', array_merge($res, array('error' => null)));
    mhm_vq_log($id, 'tiktok_' . $res['state'], $res['note'] ?? '');
    $counts[$res['state']]++;
    if ($res['state'] === 'inbox') {
        $cap = mhm_vq_meta_json($id, '_mhm_captions', array());
        mhm_vq_alert("Finish in TikTok: \"$title\"",
            "\"$title\" is in the TikTok app's inbox as a draft. Open TikTok, tap the inbox notification, paste the caption below and post it.\n\n--- caption ---\n" . ($cap['tiktok'] ?? '') . "\n---------------");
    }
}

/** When every switched-on platform is done, mark the video posted and record its links. */
function mhm_vq_post_finish_if_done($id, $platforms) {
    if (!$platforms || mhm_vq_status($id) !== 'approved') {
        return;
    }
    $all = mhm_vq_post_state($id);
    foreach ($platforms as $p) {
        if (!in_array($all[$p]['state'] ?? '', array('posted', 'inbox'), true)) {
            return;
        }
    }
    $urls = mhm_vq_meta_json($id, '_mhm_post_urls', array('youtube' => null, 'tiktok' => null));
    foreach ($platforms as $p) {
        if (!empty($all[$p]['url'])) {
            $urls[$p] = $all[$p]['url'];
        }
    }
    mhm_vq_set_meta_json($id, '_mhm_post_urls', $urls);
    mhm_vq_set_status($id, 'posted', implode(', ', array_map(function ($p) use ($all) {
        return $p . ': ' . $all[$p]['state'];
    }, $platforms)));
}

/**
 * Called on a fresh approval: a platform that failed for a known reason goes back to queued, since the
 * reviewer has looked at it again. One whose upload may have gone through ("uncertain") stays failed until
 * an admin checks the platform and presses Retry. Posted and in-progress platforms are left alone.
 */
function mhm_vq_post_reset_on_approve($id) {
    $all = mhm_vq_post_state($id);
    foreach ($all as $p => $st) {
        if (in_array($st['state'] ?? '', array('failed', 'retry'), true) && empty($st['uncertain'])) {
            mhm_vq_set_platform_state($id, $p, array('state' => 'queued', 'attempts' => 0, 'error' => null, 'publish_id' => null));
        }
    }
}

/* ---- Retry button and the Mac catch-up --------------------------------- */

add_action('admin_post_mhm_vq_retry', function () {
    if (!current_user_can('manage_options')) {
        wp_die('Not allowed.', 403);
    }
    $id = isset($_POST['id']) ? absint($_POST['id']) : 0;
    $p = isset($_POST['platform']) ? sanitize_key(wp_unslash($_POST['platform'])) : '';
    check_admin_referer('mhm_vq_retry_' . $id . '_' . $p);
    if (!mhm_vq_get_video($id) || !isset(mhm_vq_platforms()[$p])) {
        mhm_vq_back(array('mhm_vq_msg' => 'missing'));
    }
    $st = mhm_vq_post_state($id)[$p] ?? array();
    if (($st['state'] ?? '') !== 'failed') {
        mhm_vq_back(array('mhm_vq_msg' => 'stale'));
    }
    mhm_vq_set_platform_state($id, $p, array('state' => 'queued', 'attempts' => 0, 'error' => null, 'publish_id' => null, 'uncertain' => false));
    mhm_vq_log($id, $p . '_retry');
    mhm_vq_back(array('mhm_vq_msg' => 'retry'));
});

add_action('rest_api_init', function () {
    register_rest_route(MHM_VQ_NS, '/post-due', array(
        'methods'             => 'POST',
        'callback'            => function () {
            return rest_ensure_response(array('summary' => mhm_vq_run_poster('mac')));
        },
        'permission_callback' => 'mhm_vq_rest_can',
    ));
});

/* ---- what the Queue card shows ----------------------------------------- */

function mhm_vq_render_platform_status($id, $status) {
    $all = mhm_vq_post_state($id);
    $active = mhm_vq_active_platforms();
    $shown = array_unique(array_merge($active, array_keys($all)));
    if (!$shown || !in_array($status, array('approved', 'posted'), true)) {
        return;
    }
    $words = array(
        'queued'     => 'waiting for the slot',
        'retry'      => 'will try again on the next run',
        'posting'    => 'uploading now',
        'processing' => 'uploaded, TikTok is processing it',
        'inbox'      => 'in the TikTok inbox as a draft — finish it in the app',
        'posted'     => 'posted',
        'failed'     => 'failed',
    );
    $labels = mhm_vq_platforms();
    echo '<ul class="mhm-vq-platforms">';
    foreach ($shown as $p) {
        if (!isset($labels[$p])) {
            continue;
        }
        $st = $all[$p] ?? array('state' => 'queued');
        $state = $st['state'] ?? 'queued';
        if ($status === 'approved' && $state === 'queued' && !mhm_vq_is_connected($p)) {
            $text = 'waiting: not connected';
        } else {
            $text = $words[$state] ?? $state;
        }
        if (!in_array($p, $active, true) && !in_array($state, array('posted', 'inbox'), true)) {
            $text = 'switched off';
        }
        echo '<li><strong>' . esc_html($labels[$p]) . ':</strong> ' . esc_html($text);
        if (!empty($st['url'])) {
            printf(' — <a href="%1$s" target="_blank" rel="noopener">%1$s</a>', esc_url($st['url']));
        }
        if (!empty($st['note']) && in_array($state, array('posted', 'inbox'), true)) {
            echo ' <span class="mhm-vq-meta">(' . esc_html($st['note']) . ')</span>';
        }
        if (!empty($st['error'])) {
            echo '<br><span class="mhm-vq-warn">' . esc_html($st['error']) . '</span>';
        }
        if ($state === 'failed' && current_user_can('manage_options')) {
            echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
            wp_nonce_field('mhm_vq_retry_' . $id . '_' . $p);
            printf('<input type="hidden" name="action" value="mhm_vq_retry"><input type="hidden" name="id" value="%d"><input type="hidden" name="platform" value="%s"><button class="button button-small">Retry</button></form>', $id, esc_attr($p));
        }
        echo '</li>';
    }
    echo '</ul>';
}

/**
 * TikTok's required choices on the Approve form (direct mode only): who it posts as, privacy with no
 * default, interaction switches off by default, commercial-content disclosure, and the consent line.
 */
function mhm_vq_render_tiktok_choices($v) {
    $id = (int) $v['id'];
    $c = mhm_vq_tt_creator_info();
    echo '<fieldset class="mhm-vq-tt"><legend><strong>TikTok</strong></legend>';
    if (is_wp_error($c)) {
        echo '<p class="mhm-vq-warn">' . esc_html($c->get_error_message()) . ' Approving now will fail on TikTok; fix the connection in Videos → Posting first.</p></fieldset>';
        return;
    }
    $o = mhm_vq_tt_opts($id);
    printf('<p class="mhm-vq-tt-row">Posting to <strong>@%s</strong>%s</p>', esc_html($c['creator_username']),
        $c['creator_nickname'] ? ' (' . esc_html($c['creator_nickname']) . ')' : '');
    if ($c['max_video_post_duration_sec'] && (float) $v['duration_s'] > $c['max_video_post_duration_sec']) {
        printf('<p class="mhm-vq-warn">This video is %.1f s; this account can post at most %d s.</p>', (float) $v['duration_s'], $c['max_video_post_duration_sec']);
    }
    printf('<p class="mhm-vq-tt-row"><label for="tt-priv-%d">Who can see it</label> <select id="tt-priv-%1$d" name="tt[privacy_level]"><option value="">Choose…</option>', $id);
    foreach ($c['privacy_level_options'] as $pl) {
        printf('<option value="%s"%s>%s</option>', esc_attr($pl), selected($o['privacy_level'], $pl, false), esc_html(mhm_vq_tt_privacy_label($pl)));
    }
    echo '</select></p><p class="mhm-vq-tt-row">Allow: ';
    foreach (array('comment' => 'Comments', 'duet' => 'Duet', 'stitch' => 'Stitch') as $k => $label) {
        $off = $c[$k . '_disabled'];
        printf('<label><input type="checkbox" name="tt[allow_%s]" value="1"%s%s> %s</label> &nbsp; ', $k,
            checked(!$off && $o['allow_' . $k], true, false), $off ? ' disabled title="Turned off in the account\'s TikTok settings"' : '', esc_html($label));
    }
    echo '</p>';
    printf('<p class="mhm-vq-tt-row"><label><input type="checkbox" name="tt[commercial]" value="1" class="mhm-vq-tt-commercial"%s> This video promotes a brand, product or service</label></p>', checked($o['commercial'], true, false));
    printf('<p class="mhm-vq-tt-row mhm-vq-tt-brand" style="margin-left:22px"><label><input type="checkbox" name="tt[brand_organic]" value="1"%s> Your brand (shows as "Promotional content")</label><br><label><input type="checkbox" name="tt[brand_content]" value="1" class="mhm-vq-tt-pc"%s> Branded content for a third party (shows as "Paid partnership"; can\'t be "Only me")</label></p>',
        checked($o['brand_organic'], true, false), checked($o['brand_content'], true, false));
    echo '<p class="mhm-vq-tt-row mhm-vq-meta">By approving, you agree to TikTok\'s <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noopener">Music Usage Confirmation</a><span class="mhm-vq-tt-bc">'
        . ' and <a href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noopener">Branded Content Policy</a></span>. After approval it can take a few minutes for the post to show on the profile.</p>';
    echo '</fieldset>';
}

add_action('admin_footer', function () {
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || strpos((string) $screen->id, 'mhm-video-queue') === false) {
        return;
    }
    // Brand options and the Branded Content Policy line only show when they apply, as TikTok asks.
    echo "<script>(function(){function u(f){var c=f.querySelector('.mhm-vq-tt-commercial');if(!c)return;var b=f.querySelector('.mhm-vq-tt-brand'),bc=f.querySelector('.mhm-vq-tt-bc'),pc=f.querySelector('.mhm-vq-tt-pc');b.style.display=c.checked?'':'none';bc.style.display=(c.checked&&pc.checked)?'':'none';}document.querySelectorAll('fieldset.mhm-vq-tt').forEach(function(f){u(f);f.addEventListener('change',function(){u(f);});});})();</script>";
});
