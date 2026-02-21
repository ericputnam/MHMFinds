<?php
  // Enqueue Parent and Child Theme Styles
  function kadence_child_enqueue_styles() {
      wp_enqueue_style( 'kadence-parent-style', get_template_directory_uri() . '/style.css' );
      wp_enqueue_style( 'kadence-child-style', get_stylesheet_uri(), array('kadence-parent-style') );
  }
  add_action( 'wp_enqueue_scripts', 'kadence_child_enqueue_styles' );

  /**
   * Disable Mediavine ads for patrons or admin
   */
  function disable_mediavine_ads_for_patrons() {
      $user = wp_get_current_user();
      $admin_usernames = array('Eric');
      $minimum_pledge_cents = 0;

      if ( is_user_logged_in() ) {
          $patronage = Patreon_Wordpress::getUserPatronage();
          $is_admin_patron = in_array($user->user_login, $admin_usernames) || in_array($user->user_email, $admin_usernames);

          if ( $is_admin_patron || ( $patronage !== false && $patronage >= $minimum_pledge_cents ) ) {
              echo '<div id="mediavine-settings" data-blocklist-leaderboard="1" data-blocklist-sidebar-atf="1" data-blocklist-sidebar-btf="1" data-blocklist-content-desktop="1" data-blocklist-content-mobile="1" data-blocklist-adhesion-mobile="1" data-blocklist-adhesion-tablet="1" data-blocklist-adhesion-desktop="1" data-blocklist-recipe="1" data-blocklist-auto-insert-sticky="1" data-blocklist-in-image="1" data-blocklist-chicory="1" data-blocklist-zergnet="1" data-blocklist-interstitial-mobile="1" data-blocklist-interstitial-desktop="1" data-blocklist-universal-player-desktop="1" data-blocklist-universal-player-mobile="1" data-expires-at="2046-04-17"></div>';
          }
      }
  }
  add_action( 'wp_head', 'disable_mediavine_ads_for_patrons' );

  /**
   * Debug Patreon pledge level
   */
  function debug_patreon_pledge() {
      if ( is_user_logged_in() ) {
          $patronage = Patreon_Wordpress::getUserPatronage();
          echo "<!-- DEBUG Patreon pledge: ";
          var_export($patronage);
          echo " -->";
      } else {
          echo "<!-- DEBUG Not logged in -->";
      }
  }
  add_action( 'wp_footer', 'debug_patreon_pledge' );

   function is_from_apex_rewrite() {
      // Check if request was forwarded from apex domain via Vercel rewrite
      $forwarded_host = isset($_SERVER['HTTP_X_FORWARDED_HOST']) ? $_SERVER['HTTP_X_FORWARDED_HOST'] : '';

      // If forwarded from apex domain, this is a Vercel rewrite
      if ($forwarded_host === 'musthavemods.com' || $forwarded_host === 'www.musthavemods.com') {
          return true;
      }

      // If no forwarded host and accessing blog subdomain directly, not a rewrite
      $current_host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '';
      if ($current_host === 'blog.musthavemods.com' && empty($forwarded_host)) {
          return false;
      }

      return false; // Default to not from rewrite
  }

  // Disable canonical redirects when accessed via apex domain rewrite
  add_filter('redirect_canonical', function($redirect_url, $requested_url) {
      if (is_from_apex_rewrite()) {
          return false; // Disable redirect
      }
      // Prevent redirect for game landing pages (page/category slug conflict)
      $game_slugs = array('/sims-4/', '/stardew-valley/', '/minecraft/');
      $path = parse_url($requested_url, PHP_URL_PATH);
      if (in_array($path, $game_slugs)) {
          return false;
      }
      return $redirect_url; // Allow normal redirect
  }, 10, 2);

  // Disable WordPress from forcing blog subdomain URL
  add_filter('home_url', function($url) {
      if (is_from_apex_rewrite()) {
          return str_replace('blog.musthavemods.com', 'musthavemods.com', $url);
      }
      return $url;
  });

  // REMOVED Feb 2026: noindex on direct blog access was unsafe because BigScoots caching
  // cannot distinguish proxied vs direct requests, causing noindex to leak to musthavemods.com.
  // The canonical URL override (below) is the correct approach for domain consolidation.

  // Force Rank Math robots to index for all pages (override any stale noindex settings)
  // This ensures blog posts are indexable whether accessed directly or via proxy
  add_filter('rank_math/frontend/robots', function($robots) {
      // Only override for posts and pages (not categories/tags which may intentionally be noindex)
      if (is_singular()) {
          $robots['index'] = 'index';
          unset($robots['noindex']);
          unset($robots['nofollow']);
          if (isset($robots['follow'])) {
              // keep follow
          } else {
              $robots['follow'] = 'follow';
          }
      }
      return $robots;
  }, 99);

  add_filter('site_url', function($url) {
      if (is_from_apex_rewrite()) {
          return str_replace('blog.musthavemods.com', 'musthavemods.com', $url);
      }
      return $url;
  });

  add_filter('rank_math/frontend/canonical', function ($canonical) {
    return str_replace(
        'https://blog.musthavemods.com',
        'https://musthavemods.com',
        $canonical
    );
});

add_filter( 'rank_math/sitemap/loc', function( $url ) {
    return str_replace(
        'https://blog.musthavemods.com',
        'https://musthavemods.com',
        $url
    );
});

add_filter('wp_sitemaps_enabled', '__return_false');
/**
 * Custom post header meta line:
 * "Updated on {date} by {name} • Posted on {date} by {author}"
 * Uses ACF user field: updated_by (User field)
 */
add_action( 'kadence_single_before_entry_content', function() {

    if ( get_post_type() !== 'post' ) {
        return;
    }

    $post_id = get_the_ID();
    if ( ! $post_id ) {
        return;
    }

    // Original author
    $author_id   = (int) get_post_field( 'post_author', $post_id );
    $author_name = $author_id ? get_the_author_meta( 'display_name', $author_id ) : '';

    // Original publish date
    $posted_date = get_the_date( 'F j, Y', $post_id );

    // Updated date (WP's modified date)
    $updated_date = get_the_modified_date( 'F j, Y', $post_id );

    // Updated by (ACF user field)
    $updated_by_name = '';

    if ( function_exists( 'get_field' ) ) {
        $updated_by = get_field( 'updated_by', $post_id );

        $updated_by_id = 0;
        if ( is_object( $updated_by ) && ! empty( $updated_by->ID ) ) {
            $updated_by_id = (int) $updated_by->ID;
        } elseif ( is_array( $updated_by ) && ! empty( $updated_by['ID'] ) ) {
            $updated_by_id = (int) $updated_by['ID'];
        }

        if ( $updated_by_id ) {
            $updated_by_name = get_the_author_meta( 'display_name', $updated_by_id );
        }
    }

    // Build meta string
    $parts = [];

    // If we have an updater, show updated info; otherwise you can omit this line entirely if you want.
    if ( $updated_by_name ) {
        $parts[] = 'Updated on ' . esc_html( $updated_date ) . ' by <span class="mhm-meta-strong">' . esc_html( $updated_by_name ) . '</span>';
    } else {
        // If you prefer: comment this out to show nothing when there's no updated_by selected
        $parts[] = 'Updated on ' . esc_html( $updated_date );
    }

    $posted_part = 'Posted on ' . esc_html( $posted_date );
    if ( $author_name ) {
        $posted_part .= ' by <span class="mhm-meta-strong">' . esc_html( $author_name ) . '</span>';
    }
    $parts[] = $posted_part;

    echo '<div class="mhm-custom-meta">' . implode( ' <span class="mhm-meta-sep">•</span> ', $parts ) . '</div>';

}, 12 );


/**
 * MHM Game Filter Pills Shortcode
 */
function mhm_game_pills_shortcode() {
    $games = array(
        array(
            'name' => 'Sims 4',
            'slug' => 'sims-4',
            'icon' => '🎮',
            'color' => '#ec4899',
            'landing' => '/sims-4/',
        ),
        array(
            'name' => 'Stardew Valley',
            'slug' => 'stardew-valley',
            'icon' => '🌾',
            'color' => '#22c55e',
            'landing' => '/stardew-valley/',
        ),
        array(
            'name' => 'Minecraft',
            'slug' => 'minecraft',
            'icon' => '⛏️',
            'color' => '#8b5cf6',
            'landing' => '/minecraft/',
        ),
    );

    // Detect current game context from category ancestry
    $current_game_slug = '';
    if (is_category()) {
        $current_cat = get_queried_object();
        if ($current_cat) {
            foreach ($games as $game) {
                if ($current_cat->slug === $game['slug']) {
                    $current_game_slug = $game['slug'];
                    break;
                }
            }
            if (empty($current_game_slug) && $current_cat->parent) {
                $ancestors = get_ancestors($current_cat->term_id, 'category');
                foreach ($ancestors as $ancestor_id) {
                    $ancestor = get_term($ancestor_id, 'category');
                    if ($ancestor) {
                        foreach ($games as $game) {
                            if ($ancestor->slug === $game['slug']) {
                                $current_game_slug = $game['slug'];
                                break 2;
                            }
                        }
                    }
                }
            }
        }
    }
    if (empty($current_game_slug) && is_page()) {
        $page_slug = get_post_field('post_name', get_queried_object_id());
        foreach ($games as $game) {
            if ($page_slug === $game['slug']) {
                $current_game_slug = $game['slug'];
                break;
            }
        }
    }

    $output = '<div class="mhm-game-pills">';
    foreach ($games as $game) {
        $category = get_category_by_slug($game['slug']);
        $count = 0;
        if ($category) {
            $count = $category->count;
            $children = get_categories(array(
                'parent' => $category->term_id,
                'hide_empty' => false,
            ));
            foreach ($children as $child) {
                $count += $child->count;
            }
        }

        $url = $game['landing'];
        $active = ($current_game_slug === $game['slug']) ? ' is-active' : '';
        $style = $active ? '--pill-active-color:' . esc_attr($game['color']) . ';' : '';

        $output .= sprintf(
            '<a href="%s" class="mhm-game-pill%s" style="%s" data-game-color="%s"><span class="pill-icon">%s</span>%s<span class="mhm-pill-count">%d</span></a>',
            esc_url($url),
            $active,
            $style,
            esc_attr($game['color']),
            $game['icon'],
            esc_html($game['name']),
            $count
        );
    }
    $output .= '</div>';
    return $output;
}
add_shortcode('mhm_game_pills', 'mhm_game_pills_shortcode');

/**
 * MHM Game Hub Shortcode - Full landing page layout
 * Usage: [mhm_game_hub game="sims-4"]
 */
function mhm_game_hub_shortcode($atts) {
    $atts = shortcode_atts(array('game' => 'sims-4'), $atts, 'mhm_game_hub');
    $game_slug = sanitize_title($atts['game']);

    $games = array(
        'sims-4' => array(
            'title'   => 'Best Sims 4 Mods &amp; CC',
            'tagline' => 'Discover the best mods, custom content, cheats, and gameplay guides for The Sims 4.',
            'accent'  => '#ec4899',
            'badge'   => '500+ Mods',
            'search'  => 'Search Sims 4 mods, guides &amp; tutorials...',
            'hero_image' => 'https://blogmusthavemodscom.bigscoots-staging.com/wp-content/uploads/2026/02/Sims-4.jpg',
            'icon'    => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="3"/><circle cx="8" cy="12" r="2"/><line x1="14" y1="10" x2="14" y2="14"/><line x1="12" y1="12" x2="16" y2="12"/><circle cx="19" cy="9" r="0.5" fill="currentColor"/><circle cx="19" cy="15" r="0.5" fill="currentColor"/></svg>',
        ),
        'stardew-valley' => array(
            'title'   => 'Best Stardew Valley Mods &amp; Guides',
            'tagline' => 'Find the best mods, guides, and farm inspiration for Stardew Valley.',
            'accent'  => '#22c55e',
            'badge'   => 'New Game',
            'search'  => 'Search Stardew Valley mods &amp; guides...',
            'hero_image' => 'https://blogmusthavemodscom.bigscoots-staging.com/wp-content/uploads/2026/02/Stardew-Valley.jpg',
            'icon'    => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v8l-3-3"/><path d="M12 10l3-3"/><path d="M8 22c-1.5-2-3-4-3-7a7 7 0 0114 0c0 3-1.5 5-3 7"/><path d="M9 18c0-1.5 1.5-3 3-3s3 1.5 3 3"/></svg>',
        ),
        'minecraft' => array(
            'title'   => 'Best Minecraft Mods &amp; Builds',
            'tagline' => 'Explore top mods, builds, resource packs, and guides for Minecraft.',
            'accent'  => '#8b5cf6',
            'badge'   => 'New Game',
            'search'  => 'Search Minecraft mods, builds &amp; packs...',
            'hero_image' => 'https://blogmusthavemodscom.bigscoots-staging.com/wp-content/uploads/2026/02/Minecraft.jpg',
            'icon'    => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2l5.5 5.5-12 12L2.5 14z"/><path d="M8 14l-2.5 2.5"/><path d="M14.5 2L17 4.5"/><line x1="15" y1="9" x2="9" y2="15"/></svg>',
        ),
    );

    if (!isset($games[$game_slug])) {
        return '<p>Unknown game: ' . esc_html($game_slug) . '</p>';
    }

    $game = $games[$game_slug];
    $accent = $game['accent'];

    // Get parent category
    $parent_cat = get_category_by_slug($game_slug);
    $parent_cat_id = $parent_cat ? $parent_cat->term_id : 0;

    // Count total posts
    $total_posts = 0;
    if ($parent_cat) {
        $total_posts = $parent_cat->count;
        $child_cats = get_categories(array('parent' => $parent_cat_id, 'hide_empty' => false));
        foreach ($child_cats as $cc) {
            $total_posts += $cc->count;
        }
    }
    if ($total_posts > 0 && $game['badge'] !== 'New Game') {
        $game['badge'] = $total_posts . '+ Mods';
    }

    // Query latest posts
    $posts_query = new WP_Query(array(
        'cat'            => $parent_cat_id,
        'posts_per_page' => 8,
        'post_status'    => 'publish',
        'orderby'        => 'date',
        'order'          => 'DESC',
    ));

    // Get child categories for sidebar
    $child_categories = array();
    if ($parent_cat_id) {
        $child_categories = get_categories(array(
            'parent'     => $parent_cat_id,
            'hide_empty' => true,
            'orderby'    => 'count',
            'order'      => 'DESC',
            'number'     => 8,
        ));
    }

    // Other games for cross-promo
    $other_games = array();
    foreach ($games as $slug => $g) {
        if ($slug !== $game_slug) {
            $g['slug'] = $slug;
            $other_games[] = $g;
        }
    }

    // Build HTML
    ob_start();
    ?>
    <div class="mhm-gh-wrapper" data-game="<?php echo esc_attr($game_slug); ?>">

        <!-- HERO SECTION -->
        <div class="mhm-gh-hero">
            <div class="mhm-gh-hero-image<?php echo !empty($game['hero_image']) ? ' has-photo' : ''; ?>">
                <?php if (!empty($game['hero_image'])) : ?>
                    <img class="mhm-gh-hero-photo" src="<?php echo esc_url($game['hero_image']); ?>" alt="<?php echo esc_attr(wp_strip_all_tags($game['title'])); ?>" loading="eager" decoding="async" />
                <?php else : ?>
                    <div class="mhm-gh-hero-icon">
                        <?php echo $game['icon']; ?>
                    </div>
                <?php endif; ?>
            </div>
            <div class="mhm-gh-hero-content">
                <span class="mhm-gh-badge"><?php echo esc_html($game['badge']); ?></span>
                <h1 class="mhm-gh-title"><?php echo $game['title']; ?></h1>
                <p class="mhm-gh-tagline"><?php echo esc_html($game['tagline']); ?></p>
                <div class="mhm-gh-cta-row">
                    <a href="<?php echo esc_url(get_category_link($parent_cat_id)); ?>" class="mhm-gh-cta">Browse Mods</a>
                    <a href="/submit/" class="mhm-gh-cta-secondary">Submit a Mod</a>
                </div>
            </div>
        </div>

        <!-- GAME PILLS BAR -->
        <div class="mhm-gh-pills-bar">
            <?php echo do_shortcode('[mhm_game_pills]'); ?>
        </div>

        <!-- SEARCH BAR -->
        <div class="mhm-gh-search-wrap">
            <form class="mhm-gh-search-form" action="<?php echo esc_url(home_url('/')); ?>" method="get">
                <input type="hidden" name="cat" value="<?php echo esc_attr($parent_cat_id); ?>">
                <div class="mhm-gh-search-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <input type="search" name="s" class="mhm-gh-search-input" placeholder="<?php echo esc_attr(wp_strip_all_tags($game['search'])); ?>" />
                <button type="submit" class="mhm-gh-search-btn">Search</button>
            </form>
        </div>

        <!-- MAIN BODY: POSTS + SIDEBAR -->
        <div class="mhm-gh-body">
            <div class="mhm-gh-main">
                <?php if ($posts_query->have_posts()) : ?>
                <div class="mhm-gh-posts">
                    <?php while ($posts_query->have_posts()) : $posts_query->the_post(); ?>
                    <article class="mhm-gh-post-card">
                        <a href="<?php the_permalink(); ?>" class="mhm-gh-post-image-link">
                            <?php if (has_post_thumbnail()) : ?>
                                <div class="mhm-gh-post-image">
                                    <?php the_post_thumbnail('medium_large'); ?>
                                </div>
                            <?php else : ?>
                                <div class="mhm-gh-post-image mhm-gh-post-image-placeholder">
                                    <?php echo $game['icon']; ?>
                                </div>
                            <?php endif; ?>
                        </a>
                        <div class="mhm-gh-post-body">
                            <?php
                            $cats = get_the_category();
                            if (!empty($cats)) :
                                $cat = $cats[0];
                            ?>
                            <span class="mhm-gh-post-badge"><?php echo esc_html($cat->name); ?></span>
                            <?php endif; ?>
                            <h3 class="mhm-gh-post-title">
                                <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                            </h3>
                            <p class="mhm-gh-post-excerpt"><?php echo wp_trim_words(get_the_excerpt(), 18, '...'); ?></p>
                            <div class="mhm-gh-post-footer">
                                <span class="mhm-gh-post-author"><?php echo get_the_author(); ?></span>
                                <a href="<?php the_permalink(); ?>" class="mhm-gh-post-read">Read &rarr;</a>
                            </div>
                        </div>
                    </article>
                    <?php endwhile; ?>
                </div>
                <?php wp_reset_postdata(); ?>

                <?php if ($parent_cat_id) : ?>
                <div class="mhm-gh-load-more-wrap">
                    <a href="<?php echo esc_url(get_category_link($parent_cat_id)); ?>" class="mhm-gh-cta">View All Posts</a>
                </div>
                <?php endif; ?>

                <?php else : ?>
                <div class="mhm-gh-no-posts">
                    <p>No posts yet for this game. Check back soon!</p>
                </div>
                <?php endif; ?>
            </div>

            <!-- SIDEBAR -->
            <aside class="mhm-gh-sidebar">
                <?php if (!empty($child_categories)) : ?>
                <div class="mhm-gh-sidebar-card">
                    <h3 class="mhm-gh-sidebar-title">Top Categories</h3>
                    <ul class="mhm-gh-cat-list">
                        <?php foreach ($child_categories as $child_cat) : ?>
                        <li>
                            <a href="<?php echo esc_url(get_category_link($child_cat->term_id)); ?>">
                                <span class="mhm-gh-cat-name"><?php echo esc_html($child_cat->name); ?></span>
                                <span class="mhm-gh-cat-count"><?php echo intval($child_cat->count); ?></span>
                            </a>
                        </li>
                        <?php endforeach; ?>
                    </ul>
                </div>
                <?php endif; ?>

                <div class="mhm-gh-sidebar-card mhm-gh-patreon-card">
                    <h3 class="mhm-gh-sidebar-title">Support Us</h3>
                    <p class="mhm-gh-patreon-text">Join our Patreon for exclusive content, early access, and an ad-free experience!</p>
                    <a href="https://www.patreon.com/musthavemods" class="mhm-gh-cta mhm-gh-patreon-btn" target="_blank" rel="noopener">Join Patreon</a>
                </div>
            </aside>
        </div>

        <!-- EXPLORE MORE GAMES -->
        <div class="mhm-gh-explore">
            <h2 class="mhm-gh-explore-title">Explore More Games</h2>
            <div class="mhm-gh-explore-grid">
                <?php foreach ($other_games as $og) : ?>
                <a href="/<?php echo esc_attr($og['slug']); ?>/" class="mhm-gh-explore-card" style="--card-accent:<?php echo esc_attr($og['accent']); ?>">
                    <div class="mhm-gh-explore-icon"><?php echo $og['icon']; ?></div>
                    <div class="mhm-gh-explore-info">
                        <span class="mhm-gh-explore-name"><?php echo wp_kses($og['title'], array('amp' => array())); ?></span>
                        <span class="mhm-gh-explore-tag"><?php echo esc_html($og['tagline']); ?></span>
                    </div>
                </a>
                <?php endforeach; ?>
            </div>
        </div>

    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('mhm_game_hub', 'mhm_game_hub_shortcode');

/**
 * MHM Dark Theme Critical CSS
 */
function mhm_dark_theme_inline_css() {
    echo '<style id="mhm-dark-theme-critical">
    /* Base - Dark background and light text */
    html body.wp-theme-kadence,html body.wp-child-theme-kadence-child,body.home.blog{background:#0B0F19!important;color:#f1f5f9!important}
    html body .site-container,html body .site{background:#0B0F19!important}
    /* Header styling - match Next.js exactly */
    html body #masthead,html body .site-header,html body .site-header-wrap,body #masthead,#masthead{background:#0B0F19!important;border-bottom:1px solid rgba(255,255,255,0.08)!important}
    #masthead .site-header-row-container-inner{background:transparent!important;max-width:1400px!important;margin:0 auto!important}
    html body .site-top-header-wrap .site-header-row-container-inner,html body .site-main-header-wrap .site-header-row-container-inner,html body .site-bottom-header-wrap .site-header-row-container-inner{background:#0B0F19!important}
    html body .site-branding .site-title,html body .site-title a{color:#f1f5f9!important;font-weight:700!important}
    html body .custom-logo{max-height:40px!important}
    /* Remove white bars */
    html body .site-bottom-header-wrap,html body .site-above-header-wrap{display:none!important;height:0!important;min-height:0!important;overflow:hidden!important;padding:0!important;margin:0!important}
    /* Navigation styling */
    html body .main-navigation a,html body #primary-menu > li > a{color:#94a3b8!important;font-weight:500!important;font-size:0.875rem!important;transition:color 0.2s ease!important}
    html body .main-navigation a:hover,html body #primary-menu>li>a:hover{color:#f1f5f9!important}
    html body #primary-menu>li.current-menu-item>a{color:#ec4899!important}
    /* Main content area */
    html body #primary,html body .content-wrap,html body .site-main,html body #inner-wrap{background:#0B0F19!important}
    /* Article cards */
    html body article,html body article.post,html body .entry,html body .loop-entry{background:#151B2B!important;border:1px solid rgba(255,255,255,0.08)!important;border-radius:1rem!important;box-shadow:0 4px 6px -1px rgba(0,0,0,0.4)!important;transition:transform 0.2s ease,border-color 0.2s ease!important}
    html body article:hover{border-color:rgba(236,72,153,0.2)!important;transform:translateY(-2px)!important}
    html body .entry-content-wrap{background:transparent!important;padding:1.25rem!important}
    /* Post titles - WHITE not cyan */
    html body .entry-title,html body .entry-title a,html body article .entry-title a,html body .loop-entry .entry-title a{color:#f1f5f9!important;font-weight:700!important}
    html body .entry-title a:hover{color:#ec4899!important}
    /* Entry meta */
    html body .entry-meta,html body .entry-meta span,html body .entry-meta a{color:#64748b!important;font-size:0.75rem!important}
    /* Category badges */
    html body .cat-links a,html body .entry-taxonomies a{background:rgba(236,72,153,0.15)!important;color:#ec4899!important;padding:0.25rem 0.75rem!important;border-radius:0.375rem!important;font-size:0.75rem!important;font-weight:500!important;border:1px solid rgba(236,72,153,0.3)!important}
    /* Read more links */
    html body .entry-actions a,html body .more-link{color:#ec4899!important;font-size:0.875rem!important;font-weight:500!important}
    html body .entry-actions a:hover,html body .more-link:hover{color:#f472b6!important}
    /* Sidebar - dark background */
    html body #secondary,html body .sidebar{background:transparent!important}
    html body .widget{background:#151B2B!important;border:1px solid rgba(255,255,255,0.08)!important;border-radius:1rem!important;padding:1.5rem!important}
    html body .widget-title{color:#f1f5f9!important;border-bottom:2px solid #ec4899!important;padding-bottom:0.75rem!important}
    html body .widget a,html body .widget li,html body .widget p{color:#94a3b8!important}
    html body .widget a:hover{color:#ec4899!important}
    /* Sidebar search - dark styling */
    html body .wp-block-search{background:transparent!important;border:none!important;padding:0!important}
    html body .wp-block-search__inside-wrapper{background:#151B2B!important;border:1px solid rgba(255,255,255,0.1)!important;border-radius:0.75rem!important;overflow:hidden!important}
    html body .wp-block-search__input,html body .wp-block-search input{background:transparent!important;border:none!important;color:#f1f5f9!important;padding:0.75rem 1rem!important}
    html body .wp-block-search__button{background:#ec4899!important;border:none!important;color:#fff!important;padding:0.75rem 1rem!important}
    /* Social links - no backgrounds */
    html body .wp-block-social-links,html body .wp-social-link{background:transparent!important;padding:0!important}
    html body .wp-block-social-links a{color:#64748b!important}
    html body .wp-block-social-links a:hover{color:#ec4899!important}
    html body .wp-block-social-links svg{fill:currentColor!important}
    /* Footer */
    html body #colophon,html body .site-footer{background:#0B0F19!important;border-top:1px solid rgba(255,255,255,0.08)!important;padding:3rem 0!important;color:#f1f5f9!important}
    html body .site-footer .site-info{color:#64748b!important;font-size:0.875rem!important}
    html body .site-footer a{color:#94a3b8!important}
    html body .site-footer a:hover{color:#ec4899!important}
    /* Buttons - flat dark style */
    html body button,html body .button,html body input[type="submit"],html body .wp-block-button__link{background:#1e293b!important;color:#f1f5f9!important;border:1px solid rgba(236,72,153,0.3)!important;border-radius:0.5rem!important;transition:all 0.2s ease!important}
    html body button:hover,html body .button:hover,html body input[type="submit"]:hover,html body .wp-block-button__link:hover{background:#334155!important;border-color:#ec4899!important;color:#fff!important}
    /* Form inputs */
    html body input[type="text"],html body input[type="email"],html body input[type="search"],html body textarea{background:#1e293b!important;color:#f1f5f9!important;border:1px solid rgba(255,255,255,0.1)!important}
    /* Links */
    html body a{color:#06b6d4!important}
    html body a:hover{color:#ec4899!important}
    /* Images */
    html body article img,html body .wp-post-image{border-radius:0.75rem!important}
    html body .post-thumbnail img{border-radius:0.75rem 0.75rem 0 0!important;object-fit:cover!important}
    /* Pagination */
    html body .pagination a,html body .page-numbers{background:#1e293b!important;color:#f1f5f9!important;border:1px solid rgba(255,255,255,0.1)!important;border-radius:0.5rem!important}
    html body .page-numbers.current,html body .page-numbers:hover{background:#ec4899!important;color:#fff!important}
    /* Section headings WHITE */
    html body h1,html body h2,html body h3,html body h4,html body h5,html body h6{color:#f1f5f9!important}
    html body .kb-adv-heading-wrap,html body .kt-adv-heading,html body [class*="kb-adv-heading"]{color:#f1f5f9!important}
    html body .kb-adv-heading-wrap h1,html body .kb-adv-heading-wrap h2,html body .kb-adv-heading-wrap h3,html body .kb-adv-heading-wrap h4,html body .wp-block-kadence-advancedheading{color:#f1f5f9!important}
    /* Kadence blocks - transparent backgrounds */
    html body .kb-row-layout-wrap,html body .kadence-column,html body .wp-block-kadence-column,html body .kb-row-layout-wrap>.kt-row-column-wrap{background:transparent!important}
    html body .kb-row-layout-wrap.wp-block-kadence-rowlayout,html body .wp-block-kadence-rowlayout>.kt-row-column-wrap{background:#0B0F19!important}
    html body .kadence-column[style*="background"]:not(.has-theme-palette){background:#151B2B!important}
    /* Fix white bar below header */
    html body .site-content,html body .content-bg,html body .entry-hero-container-inner{background:#0B0F19!important}
    html body hr,html body .wp-block-separator{border-color:rgba(255,255,255,0.1)!important;background:transparent!important}
    /* Single post layout - full width */
    body.single #secondary,body.single .sidebar,body.single aside.widget-area{display:none!important}
    body.single #primary,body.single .content-container,body.single .site-main{width:100%!important;max-width:900px!important;margin:0 auto!important;float:none!important}
    body.single .content-wrap{display:block!important}
    body.single .entry-content{max-width:800px!important;margin:0 auto!important;font-size:1.125rem!important;line-height:1.8!important}
    body.single .entry-header{max-width:800px!important;margin:0 auto 2rem!important;padding:0 1rem!important}
    body.single .entry-title{font-size:2.5rem!important;font-weight:800!important;line-height:1.2!important;margin-bottom:1rem!important}
    /* Blog archive grid - 3 columns */
    body.blog .loop-entry.type-post,body.archive .loop-entry.type-post{width:calc(33.333% - 1.5rem)!important;margin:0!important}
    body.blog .content-container>.content-wrap,body.archive .content-container>.content-wrap{display:flex!important;flex-wrap:wrap!important;gap:1.5rem!important;max-width:1400px!important;margin:0 auto!important;padding:2rem!important}
    @media(max-width:1100px){body.blog .loop-entry.type-post,body.archive .loop-entry.type-post{width:calc(50% - 1rem)!important}}
    @media(max-width:768px){body.blog .loop-entry.type-post,body.archive .loop-entry.type-post{width:100%!important}}
    /* Game pills */
    .mhm-game-pills{display:flex;flex-wrap:wrap;gap:0.5rem;justify-content:center;padding:1rem 0}
    .mhm-game-pill{display:inline-flex;align-items:center;gap:0.5rem;background:#1e293b;color:#e2e8f0;padding:0.5rem 1rem;border-radius:9999px;border:1px solid rgba(255,255,255,0.1);font-size:0.875rem;font-weight:500;text-decoration:none;transition:all 0.2s ease}
    .mhm-game-pill:hover{background:#334155;border-color:#ec4899;color:#fff;transform:translateY(-2px)}
    /* Game color variables */
    :root{--game-sims4:#ec4899;--game-stardew:#22c55e;--game-minecraft:#8b5cf6}
    .mhm-game-pill.is-active{background:var(--pill-active-color,#ec4899);border-color:transparent;color:#fff;box-shadow:0 0 15px color-mix(in srgb,var(--pill-active-color,#ec4899) 40%,transparent)}
    .mhm-game-pill:hover{border-color:var(--pill-active-color,#ec4899)}
    .mhm-pill-count{background:rgba(0,0,0,0.3);padding:0.125rem 0.5rem;border-radius:9999px;font-size:0.75rem}

    /* Scrollbar */
    html::-webkit-scrollbar{width:10px}html::-webkit-scrollbar-track{background:#0B0F19}html::-webkit-scrollbar-thumb{background:#ec4899;border-radius:5px}
    /* LAYOUT FIX - Full width grid on blog/archive pages */
body.blog #secondary,body.blog .sidebar,body.blog aside.widget-area,
body.archive #secondary,body.archive .sidebar,body.archive aside.widget-area{display:none!important}
body.blog #primary,body.blog .content-container,
body.archive #primary,body.archive .content-container{width:100%!important;max-width:100%!important;float:none!important}
body.blog .site-container>.site-inner-wrap,body.archive .site-container>.site-inner-wrap{max-width:1400px!important;margin:0 auto!important;padding:0 2rem!important}
/* Card grid - proper widths */
body.blog .loop-entry.type-post,body.archive .loop-entry.type-post{width:calc(25% - 1.5rem)!important;min-width:280px!important;margin:0!important;display:flex!important;flex-direction:column!important}
body.blog .content-wrap,body.archive .content-wrap{display:flex!important;flex-wrap:wrap!important;gap:1.5rem!important;justify-content:center!important}
/* Card content - better proportions */
html body .loop-entry .post-thumbnail,html body .loop-entry .entry-thumbnail{height:180px!important;overflow:hidden!important}
html body .loop-entry .post-thumbnail img{width:100%!important;height:100%!important;object-fit:cover!important}
html body .loop-entry .entry-content-wrap{flex:1!important;display:flex!important;flex-direction:column!important;justify-content:space-between!important}
html body .loop-entry .entry-title{font-size:1rem!important;line-height:1.4!important;margin-bottom:0.5rem!important;display:-webkit-box!important;-webkit-line-clamp:3!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
/* Responsive grid */
@media(max-width:1200px){body.blog .loop-entry.type-post,body.archive .loop-entry.type-post{width:calc(33.333% - 1.5rem)!important}}
@media(max-width:900px){body.blog .loop-entry.type-post,body.archive .loop-entry.type-post{width:calc(50% - 1rem)!important}}
@media(max-width:600px){body.blog .loop-entry.type-post,body.archive .loop-entry.type-post{width:100%!important;min-width:unset!important}}

    /* Override Kadence grid - 4 columns on large screens */
body.blog .kadence-posts-list.grid-cols,body.archive .kadence-posts-list.grid-cols{display:grid!important;grid-template-columns:repeat(4,1fr)!important;gap:1.5rem!important;max-width:1400px!important;margin:0 auto!important;padding:2rem!important}
body.blog .entry-list-item,body.archive .entry-list-item{width:100%!important;margin:0!important}
@media(max-width:1200px){body.blog .kadence-posts-list.grid-cols,body.archive .kadence-posts-list.grid-cols{grid-template-columns:repeat(3,1fr)!important}}
@media(max-width:900px){body.blog .kadence-posts-list.grid-cols,body.archive .kadence-posts-list.grid-cols{grid-template-columns:repeat(2,1fr)!important}}
@media(max-width:600px){body.blog .kadence-posts-list.grid-cols,body.archive .kadence-posts-list.grid-cols{grid-template-columns:1fr!important}}

    /* Fix all form inputs to be dark */
html body input[type="text"],html body input[type="email"],html body input[type="url"],html body input[type="password"],html body input[type="search"],html body input[type="tel"],html body input[type="number"],html body textarea,html body select{background:#1e293b!important;color:#f1f5f9!important;border:1px solid rgba(255,255,255,0.15)!important;border-radius:0.5rem!important}
html body input::placeholder,html body textarea::placeholder{color:#64748b!important}
/* Comment form specific */
html body .comment-form input,html body .comment-form textarea{background:#1e293b!important;color:#f1f5f9!important}
html body #url,html body input#url{background:#1e293b!important;color:#f1f5f9!important}

    /* PAGINATION - Match Next.js style */
html body .pagination,html body .navigation.pagination,html body nav.pagination{display:flex!important;justify-content:center!important;align-items:center!important;gap:0.5rem!important;margin:3rem 0!important;padding:1rem 0!important}
html body .pagination .page-numbers,html body .pagination a,html body .nav-links .page-numbers{background:#1e293b!important;color:#94a3b8!important;border:1px solid rgba(255,255,255,0.1)!important;border-radius:0.5rem!important;padding:0.5rem 1rem!important;font-weight:500!important;font-size:0.875rem!important;text-decoration:none!important;transition:all 0.2s ease!important}
html body .pagination .page-numbers:hover,html body .pagination a:hover{background:#334155!important;color:#f1f5f9!important;border-color:rgba(236,72,153,0.3)!important}
html body .pagination .page-numbers.current,html body .pagination .current{background:#ec4899!important;color:#fff!important;border-color:transparent!important}
html body .pagination .page-numbers.dots{background:transparent!important;border:none!important;color:#64748b!important}
html body .pagination .prev,html body .pagination .next{background:#1e293b!important;color:#ec4899!important;border:1px solid rgba(236,72,153,0.3)!important}
html body .pagination .prev:hover,html body .pagination .next:hover{background:rgba(236,72,153,0.1)!important;border-color:#ec4899!important}
/* CATEGORY/TAG BADGES - Pink accent style */
html body .cat-links,html body .tags-links,html body .entry-taxonomies{display:flex!important;flex-wrap:wrap!important;gap:0.5rem!important;margin-bottom:0.75rem!important}
html body .cat-links a,html body .tags-links a,html body .entry-taxonomies a,html body a[rel="category tag"],html body a[rel="tag"]{background:rgba(236,72,153,0.15)!important;color:#ec4899!important;padding:0.25rem 0.75rem!important;border-radius:9999px!important;font-size:0.75rem!important;font-weight:600!important;text-transform:uppercase!important;letter-spacing:0.025em!important;border:1px solid rgba(236,72,153,0.3)!important;text-decoration:none!important;transition:all 0.2s ease!important;display:inline-block!important}
html body .cat-links a:hover,html body .tags-links a:hover,html body .entry-taxonomies a:hover{background:rgba(236,72,153,0.25)!important;border-color:#ec4899!important;color:#f472b6!important;transform:translateY(-1px)!important}
/* Tag cloud in widgets */
html body .tagcloud a,html body .wp-block-tag-cloud a{background:rgba(236,72,153,0.1)!important;color:#ec4899!important;padding:0.375rem 0.75rem!important;border-radius:9999px!important;font-size:0.75rem!important;border:1px solid rgba(236,72,153,0.2)!important;margin:0.25rem!important;display:inline-block!important}
html body .tagcloud a:hover,html body .wp-block-tag-cloud a:hover{background:rgba(236,72,153,0.2)!important;border-color:#ec4899!important}
/* Single post category badge at top */
html body .entry-header .cat-links{margin-bottom:1rem!important}
html body .entry-header .cat-links a{font-size:0.7rem!important;padding:0.2rem 0.6rem!important}

    /* FIX WHITE SEARCH BAR - Hero section and all search inputs */
html body .wp-block-search__input,
html body input.wp-block-search__input,
html body .wp-block-search input,
html body .wp-block-search input[type="search"],
html body .hero-section input,
html body .kb-row-layout-wrap input,
html body .kadence-column input,
html body input[type="search"],
html body .search-field,
html body .wp-block-search__inside-wrapper,
body .wp-block-search__input,
body input[type="search"],
.wp-block-search__input,
input.search-field,
input[type="search"]{background:#1e293b!important;color:#f1f5f9!important;border:1px solid rgba(255,255,255,0.15)!important;border-radius:0.5rem!important}
/* Target the search wrapper/container */
html body .wp-block-search,
html body form.wp-block-search,
html body .wp-block-search__inside-wrapper{background:transparent!important;border:none!important}
/* Full width search bar in hero */
html body .kb-row-layout-wrap .wp-block-search__input,
html body .entry-hero .wp-block-search__input,
html body .kadence-hero-header .wp-block-search__input{background:#1e293b!important;color:#f1f5f9!important;border:1px solid rgba(255,255,255,0.2)!important;padding:1rem 1.5rem!important;font-size:1rem!important}
/* Force dark on ALL inputs site-wide */
html body input:not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]){background:#1e293b!important;color:#f1f5f9!important;border:1px solid rgba(255,255,255,0.15)!important}

    /* NUCLEAR OPTION - Force dark on absolutely all inputs */
input[type="search"],
input[type="text"],
input.wp-block-search__input,
.wp-block-search__input,
.wp-block-search input,
form input[type="search"],
.search-field,
#s,
input#s,
input[name="s"],
[class*="search"] input,
[class*="Search"] input {
    background: #1e293b !important;
    background-color: #1e293b !important;
    color: #f1f5f9 !important;
    border: 1px solid rgba(255,255,255,0.2) !important;
    border-radius: 0.5rem !important;
}
/* Override any inline styles */
input[style*="background"],
input[style*="Background"] {
    background: #1e293b !important;
    background-color: #1e293b !important;
}
/* Target Kadence specific elements */
.kb-form input,
.kadence-form input,
.kb-row-layout-wrap input[type="search"],
.kb-row-layout-wrap input[type="text"],
.wp-block-kadence-rowlayout input {
    background: #1e293b !important;
    color: #f1f5f9 !important;
    border: 1px solid rgba(255,255,255,0.2) !important;
}
/* Hero section inputs */
.entry-hero-container input,
.hero-section input,
.page-hero-section input,
header + * input[type="search"],
#masthead + * input[type="search"] {
    background: #1e293b !important;
    color: #f1f5f9 !important;
}

    /* FIX KADENCE ROW LAYOUT WHITE BACKGROUND */
.kb-row-layout-wrap,
.kb-row-layout-wrap.aligncenter,
.wp-block-kadence-rowlayout,
div[class*="kb-row-layout-id"],
.kb-row-layout-id25_59cc50-42,
div.kb-row-layout-wrap.kb-row-layout-id25_59cc50-42 {
    background: transparent !important;
    background-color: transparent !important;
}
/* Target all Kadence rows that might have backgrounds */
[class*="kb-row-layout-wrap"][class*="aligncenter"],
.kb-row-layout-wrap.aligncenter.wp-block-kadence-rowlayout {
    background: transparent !important;
    background-color: transparent !important;
}
/* Inner column wraps */
.kt-row-column-wrap,
.kb-row-layout-wrap .kt-row-column-wrap,
.kb-row-layout-wrap > .kt-row-column-wrap {
    background: transparent !important;
}
/* Kadence columns */
.wp-block-kadence-column,
.kadence-column,
.kb-section-dir-vertical {
    background: transparent !important;
}

    /* FORCE DARK - Override inline styles on Kadence rows */
html body .kb-row-layout-wrap[class*="kb-row-layout-id25"],
html body div.kb-row-layout-wrap.kb-row-layout-id25_59cc50-42,
html body .kb-row-layout-id25_59cc50-42.aligncenter,
body .kb-row-layout-wrap.kb-row-layout-id25_59cc50-42.aligncenter.wp-block-kadence-rowlayout,
.kb-row-layout-wrap.kb-row-layout-id25_59cc50-42[style],
div[class*="kb-row-layout-id25_59cc50"] {
    background: #0B0F19 !important;
    background-color: #0B0F19 !important;
    background-image: none !important;
}
/* Target by position - first Kadence row after content starts */
.entry-content .kb-row-layout-wrap:first-child,
.single-content .kb-row-layout-wrap:first-child,
article .kb-row-layout-wrap:first-of-type {
    background: #0B0F19 !important;
    background-color: #0B0F19 !important;
}
/* All Kadence rows with aligncenter */
html body .kb-row-layout-wrap.aligncenter {
    background: #0B0F19 !important;
    background-color: #0B0F19 !important;
}
/* Override any palette backgrounds */
[class*="has-theme-palette"][class*="background"] {
    background: #0B0F19 !important;
}

    /* Override Kadence palette8 (white) background */
.has-theme-palette8-background-color,
.has-theme-palette-8-background-color,
[class*="palette8-background"],
[class*="palette-8-background"],
.kt-row-has-bg.has-theme-palette8-background-color,
.kb-row-layout-wrap.has-theme-palette8-background-color,
html body .has-theme-palette8-background-color {
    background: #0B0F19 !important;
    background-color: #0B0F19 !important;
}
/* Override ALL Kadence light palette backgrounds */
.has-theme-palette7-background-color,
.has-theme-palette9-background-color {
    background: #0B0F19 !important;
    background-color: #0B0F19 !important;
}
/* Force dark on any element with palette background */
[class*="has-theme-palette"][class*="background-color"] {
    background: #0B0F19 !important;
}

    /* BUTTONS - Match Next.js app style */
/* Primary buttons - solid pink */
html body .wp-block-button__link,
html body .wp-block-button .wp-block-button__link,
html body button.wp-block-button__link,
html body a.wp-block-button__link,
html body .button,
html body button,
html body input[type="submit"],
html body input[type="button"],
html body .kb-button,
html body .kt-button,
html body .wp-element-button {
    background: #ec4899 !important;
    background-color: #ec4899 !important;
    color: #fff !important;
    border: none !important;
    border-radius: 9999px !important;
    padding: 0.75rem 1.5rem !important;
    font-size: 0.875rem !important;
    font-weight: 600 !important;
    text-decoration: none !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 0.5rem !important;
    transition: all 0.2s ease !important;
    cursor: pointer !important;
    line-height: 1.5 !important;
}
html body .wp-block-button__link:hover,
html body button:hover,
html body .button:hover,
html body input[type="submit"]:hover {
    background: #db2777 !important;
    color: #fff !important;
    transform: translateY(-1px) !important;
}
/* Secondary/outline buttons */
html body .wp-block-button.is-style-outline .wp-block-button__link,
html body .is-style-outline .wp-block-button__link,
html body .button-secondary,
html body .btn-outline {
    background: #1e293b !important;
    color: #f1f5f9 !important;
    border: 1px solid rgba(255,255,255,0.2) !important;
    border-radius: 9999px !important;
}
html body .wp-block-button.is-style-outline .wp-block-button__link:hover,
html body .is-style-outline .wp-block-button__link:hover {
    background: #334155 !important;
    border-color: rgba(255,255,255,0.3) !important;
}
/* Comment submit button */
html body #submit,
html body .comment-form input[type="submit"] {
    background: #ec4899 !important;
    color: #fff !important;
    border: none !important;
    border-radius: 9999px !important;
    padding: 0.75rem 2rem !important;
}
/* Search button */
html body .wp-block-search__button {
    background: #ec4899 !important;
    color: #fff !important;
    border: none !important;
    border-radius: 0 9999px 9999px 0 !important;
    padding: 0.75rem 1.25rem !important;
}

    /* HEADER SEARCH POPUP/MODAL FIX */
.kadence-search-modal,
.search-toggle-open-container,
.header-search-modal,
#search-drawer,
.kadence-search-modal-inner {
    background: #0B0F19 !important;
}
/* Search form in header popup */
.kadence-search-modal .search-form,
.header-search-modal .search-form,
#search-drawer .search-form,
.kadence-search-modal form,
.search-toggle-open-container form {
    display: flex !important;
    align-items: center !important;
    background: #1e293b !important;
    border: 1px solid rgba(255,255,255,0.15) !important;
    border-radius: 9999px !important;
    overflow: hidden !important;
    max-width: 600px !important;
    margin: 0 auto !important;
}
/* Search input in header popup */
.kadence-search-modal input[type="search"],
.kadence-search-modal .search-field,
.header-search-modal input[type="search"],
#search-drawer input[type="search"],
.search-toggle-open-container input[type="search"],
.kadence-search-modal input.search-field {
    background: transparent !important;
    border: none !important;
    color: #f1f5f9 !important;
    padding: 1rem 1.5rem !important;
    flex: 1 !important;
    font-size: 1rem !important;
    outline: none !important;
    white-space: nowrap !important;
    box-shadow: none !important;
}
.kadence-search-modal input::placeholder {
    color: #64748b !important;
}
/* Search button in header popup */
.kadence-search-modal .search-submit,
.kadence-search-modal button[type="submit"],
.header-search-modal .search-submit,
#search-drawer .search-submit,
.search-toggle-open-container .search-submit {
    background: #ec4899 !important;
    border: none !important;
    border-radius: 9999px !important;
    color: #fff !important;
    padding: 0.875rem 1.5rem !important;
    margin: 0.25rem !important;
    cursor: pointer !important;
    font-weight: 600 !important;
}
.kadence-search-modal .search-submit:hover {
    background: #db2777 !important;
}

    /* HERO IMAGE GLOW EFFECT */
/* Target the hero image container */
.entry-content .wp-block-image,
.entry-content figure.wp-block-image,
.single-content .wp-block-image,
article .wp-block-image:first-of-type,
.kb-row-layout-wrap .wp-block-image {
    position: relative !important;
}
/* Add glow effect to hero images */
.entry-content .wp-block-image img,
.single-content .wp-block-image img,
.kb-row-layout-wrap .wp-block-image img,
article .entry-content > .wp-block-image:first-of-type img {
    position: relative !important;
    z-index: 1 !important;
    filter: drop-shadow(0 0 30px rgba(236, 72, 153, 0.4)) drop-shadow(0 0 60px rgba(139, 92, 246, 0.3)) !important;
}
/* Animated glow background for hero section */
.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type,
.page-id-25 .single-content > .kb-row-layout-wrap:first-of-type {
    position: relative !important;
    overflow: hidden !important;
}
.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type::before {
    content: "" !important;
    position: absolute !important;
    top: 50% !important;
    left: 40% !important;
    transform: translate(-50%, -50%) !important;
    width: 350px !important;
    height: 350px !important;
    background: rgba(236, 72, 153, 0.12) !important;
    border-radius: 50% !important;
    filter: blur(80px) !important;
    z-index: 0 !important;
    animation: pulse-glow 4s ease-in-out infinite !important;
    pointer-events: none !important;
}
/* Secondary glow orb */
.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type::after {
    content: "" !important;
    position: absolute !important;
    top: 60% !important;
    left: 60% !important;
    transform: translate(-50%, -50%) !important;
    width: 250px !important;
    height: 250px !important;
    background: rgba(6, 182, 212, 0.08) !important;
    border-radius: 50% !important;
    filter: blur(70px) !important;
    z-index: 0 !important;
    animation: pulse-glow 5s ease-in-out infinite reverse !important;
    pointer-events: none !important;
}
/* Pulse animation */
@keyframes pulse-glow {
    0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
    50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
}
/* Ensure content stays above glow */
.page-id-25 .kb-row-layout-wrap > * {
    position: relative !important;
    z-index: 1 !important;
}

    /* FIX PANEL SEPARATION AND HOVER EFFECTS */
/* Remove borders and rounded corners from top sections */
.page-id-25 .entry-content,
.page-id-25 .single-content,
.page-id-25 article,
.page-id-25 .entry-content-wrap,
.page-id-25 .kb-row-layout-wrap,
.page-id-25 .kt-row-column-wrap,
.page-id-25 .inner-wrap,
.page-id-25 #inner-wrap,
.page-id-25 .content-wrap,
.page-id-25 .site-main {
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
}
/* Remove any visible separators */
.page-id-25 article.entry,
.page-id-25 article.post,
.page-id-25 .entry {
    border: none !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
}
/* Disable hover transform effects */
.page-id-25 article:hover,
.page-id-25 .entry:hover,
.page-id-25 .inner-wrap:hover,
.page-id-25 #inner-wrap:hover,
.page-id-25 .kb-row-layout-wrap:hover,
.page-id-25 .content-wrap:hover {
    transform: none !important;
    box-shadow: none !important;
    border-color: transparent !important;
}
/* Remove any top/bottom borders */
.page-id-25 .site-main > *,
.page-id-25 .entry-content > * {
    border-top: none !important;
    border-bottom: none !important;
}
/* Fix the line between header and content */
.page-id-25 #masthead,
.page-id-25 .site-header {
    border-bottom: none !important;
}
.page-id-25 .content-area,
.page-id-25 #primary {
    border-top: none !important;
}

    /* GLOBAL FIX - Remove panel borders and hover effects site-wide */
/* Remove borders and rounded corners from all content sections */
html body article.entry,
html body article.post,
html body .entry,
html body .entry-content-wrap,
html body .single-entry,
html body .page .entry,
html body .single .entry {
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    background: transparent !important;
}
/* Disable hover effects on articles for pages (not archive cards) */
body.page article:hover,
body.single article:hover,
body.page .entry:hover,
body.single .entry:hover {
    transform: none !important;
    box-shadow: none !important;
    border: none !important;
}
/* Keep hover effects ONLY on archive/blog card listings */
body.blog article.loop-entry:hover,
body.archive article.loop-entry:hover {
    transform: translateY(-2px) !important;
    border-color: rgba(236,72,153,0.2) !important;
}
/* Remove visible separations between sections */
html body .kb-row-layout-wrap,
html body .kt-row-column-wrap,
html body .kadence-column,
html body .wp-block-kadence-column {
    border: none !important;
}
/* Remove header bottom border line */
html body #masthead {
    border-bottom: 1px solid rgba(255,255,255,0.05) !important;
}
/* Inner wrap - no transforms */
html body .inner-wrap,
html body #inner-wrap,
html body .content-wrap {
    transform: none !important;
}
html body .inner-wrap:hover,
html body #inner-wrap:hover {
    transform: none !important;
}

    /* FIX CALLOUT/PROMO BLOCKS - Make readable */
html body .wp-block-group,
html body .wp-block-cover,
html body .has-background,
html body [class*="has-"][class*="-background-color"],
html body .wp-block-group.has-background,
html body .entry-content .has-background {
    background: #151B2B !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    border-radius: 1rem !important;
}
/* Text inside callout blocks */
html body .wp-block-group p,
html body .wp-block-group h2,
html body .wp-block-group h3,
html body .wp-block-group a,
html body .has-background p,
html body .has-background h2,
html body .has-background h3,
html body .has-background a {
    color: #f1f5f9 !important;
}
html body .has-background a {
    color: #06b6d4 !important;
}
html body .has-background a:hover {
    color: #ec4899 !important;
}
/* Light/pale background blocks - force dark */
html body [class*="has-pale"],
html body [class*="has-light"],
html body [class*="has-white"],
html body .has-pale-cyan-blue-background-color,
html body .has-luminous-vivid-amber-background-color,
html body .has-light-green-cyan-background-color {
    background: #151B2B !important;
}
/* AUTHOR/POST META - Make readable */
html body .entry-meta,
html body .entry-meta span,
html body .entry-meta a,
html body .posted-on,
html body .posted-on a,
html body .byline,
html body .byline a,
html body .author a,
html body .mhm-custom-meta,
html body .mhm-custom-meta a,
html body .mhm-meta-strong {
    color: #94a3b8 !important;
}
html body .entry-meta a:hover,
html body .mhm-custom-meta a:hover {
    color: #ec4899 !important;
}
/* Meta separator */
html body .mhm-meta-sep {
    color: #64748b !important;
    margin: 0 0.5rem !important;
}
/* Author name highlight */
html body .mhm-meta-strong,
html body .byline a,
html body .author.vcard a {
    color: #f1f5f9 !important;
    font-weight: 600 !important;
}
/* Date styling */
html body .posted-on time,
html body .entry-date {
    color: #94a3b8 !important;
}

    /* CALLOUT BLOCK - Make it stand out */
html body .entry-content .wp-block-group.has-background,
html body .entry-content .has-background,
html body .wp-block-group[class*="has-"][class*="-background"] {
    background: #151B2B !important;
    border: 1px solid transparent !important;
    border-radius: 1.5rem !important;
    padding: 2.5rem !important;
    position: relative !important;
    overflow: hidden !important;
}
/* Gradient border effect */
html body .entry-content .wp-block-group.has-background::before,
html body .entry-content .has-background::before {
    content: "" !important;
    position: absolute !important;
    inset: 0 !important;
    border-radius: 1.5rem !important;
    padding: 1px !important;
    background: #ec4899 !important;
    -webkit-mask: none !important;
    mask: none !important;
    -webkit-mask-composite: xor !important;
    mask-composite: exclude !important;
    pointer-events: none !important;
}
/* Subtle glow effect */
html body .entry-content .wp-block-group.has-background::after,
html body .entry-content .has-background::after {
    content: "" !important;
    position: absolute !important;
    top: -50% !important;
    left: -50% !important;
    width: 200% !important;
    height: 200% !important;
    background: transparent !important;
    pointer-events: none !important;
    z-index: 0 !important;
}
/* Content above glow */
html body .entry-content .wp-block-group.has-background > *,
html body .entry-content .has-background > * {
    position: relative !important;
    z-index: 1 !important;
}
/* Callout heading */
html body .wp-block-group.has-background p:first-child,
html body .has-background p:first-child strong {
    font-size: 1.25rem !important;
    font-weight: 700 !important;
    color: #f1f5f9 !important;
}
/* Button inside callout - match site style */
html body .wp-block-group.has-background .wp-block-button__link,
html body .has-background .wp-block-button__link,
html body .wp-block-group .wp-block-button__link {
    background: #ec4899 !important;
    background-image: none !important;
    color: #fff !important;
    border: none !important;
    border-radius: 9999px !important;
    padding: 0.875rem 2rem !important;
    font-size: 0.9rem !important;
    font-weight: 600 !important;
    box-shadow: 0 4px 15px rgba(236,72,153,0.3) !important;
    transition: all 0.2s ease !important;
}
html body .wp-block-group.has-background .wp-block-button__link:hover,
html body .has-background .wp-block-button__link:hover {
    background: #db2777 !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 20px rgba(236,72,153,0.4) !important;
}

    /* CALLOUT BLOCK - Clean style, NO gradients */
html body .entry-content .wp-block-group.has-background::before,
html body .entry-content .has-background::before,
html body .entry-content .wp-block-group.has-background::after,
html body .entry-content .has-background::after {
    display: inline-block !important;
    width: 20px !important;
    height: 20px !important;
    content: none !important;
}

html body .entry-content .wp-block-group.has-background,
html body .entry-content .has-background,
html body .wp-block-group[class*="has-"][class*="-background"] {
    background: #151B2B !important;
    border: 1px solid rgba(236,72,153,0.3) !important;
    border-radius: 1rem !important;
    padding: 2rem !important;
}
/* Button inside callout - solid pink, no gradient */
html body .wp-block-group.has-background .wp-block-button__link,
html body .has-background .wp-block-button__link,
html body .wp-block-group .wp-block-button__link {
    background: #ec4899 !important;
    background-image: none !important;
    color: #fff !important;
    border: none !important;
    border-radius: 9999px !important;
    padding: 0.875rem 2rem !important;
    font-size: 0.9rem !important;
    font-weight: 600 !important;
}
html body .wp-block-group.has-background .wp-block-button__link:hover,
html body .has-background .wp-block-button__link:hover {
    background: #db2777 !important;
}


    /* ===== GAME HUB LANDING PAGE LAYOUT ===== */
    /* Accent color per game */
    .mhm-gh-wrapper[data-game="sims-4"] { --gh-accent: #ec4899; }
    .mhm-gh-wrapper[data-game="stardew-valley"] { --gh-accent: #22c55e; }
    .mhm-gh-wrapper[data-game="minecraft"] { --gh-accent: #8b5cf6; }

    .mhm-gh-wrapper { max-width: 1400px; margin: 0 auto; padding: 0 2rem 3rem; }

    /* HERO */
    .mhm-gh-hero {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 3rem;
        align-items: center;
        padding: 3rem 0;
    }
    .mhm-gh-hero-image {
        background: #151B2B;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 1.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 320px;
        position: relative;
        overflow: hidden;
    }
    .mhm-gh-hero-image::before {
        content: "";
        position: absolute;
        width: 200px;
        height: 200px;
        background: var(--gh-accent);
        opacity: 0.1;
        border-radius: 50%;
        filter: blur(60px);
    }
    .mhm-gh-hero-icon {
        position: relative;
        z-index: 1;
        color: var(--gh-accent);
        opacity: 0.6;
    }
    .mhm-gh-hero-icon svg {
        width: 120px;
        height: 120px;
    }
    .mhm-gh-hero-image.has-photo::before { display: none; }
    .mhm-gh-hero-photo {
        width: 100%;
        height: 100%;
        min-height: 320px;
        object-fit: cover;
        display: block;
    }
    .mhm-gh-hero-content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .mhm-gh-badge {
        display: inline-block;
        width: fit-content;
        background: rgba(255,255,255,0.05);
        color: var(--gh-accent);
        border: 1px solid var(--gh-accent);
        border-radius: 9999px;
        padding: 0.375rem 1rem;
        font-size: 0.8rem;
        font-weight: 600;
        letter-spacing: 0.02em;
    }
    h1.mhm-gh-title {
        font-size: 2.75rem !important;
        font-weight: 800 !important;
        color: #f1f5f9 !important;
        line-height: 1.15 !important;
        margin: 0 !important;
    }
    .mhm-gh-tagline {
        font-size: 1.125rem;
        color: #94a3b8 !important;
        line-height: 1.6;
        margin: 0;
    }
    .mhm-gh-cta-row {
        display: flex;
        gap: 1rem;
        margin-top: 0.5rem;
        flex-wrap: wrap;
    }
    a.mhm-gh-cta {
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        background: var(--gh-accent) !important;
        color: #fff !important;
        padding: 0.75rem 1.75rem !important;
        border-radius: 9999px !important;
        font-size: 0.9rem !important;
        font-weight: 600 !important;
        text-decoration: none !important;
        border: none !important;
        transition: all 0.2s ease !important;
    }
    a.mhm-gh-cta:hover {
        opacity: 0.9 !important;
        transform: translateY(-1px) !important;
    }
    a.mhm-gh-cta-secondary {
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        background: transparent !important;
        color: #f1f5f9 !important;
        padding: 0.75rem 1.75rem !important;
        border-radius: 9999px !important;
        border: 1px solid rgba(255,255,255,0.2) !important;
        font-size: 0.9rem !important;
        font-weight: 600 !important;
        text-decoration: none !important;
        transition: all 0.2s ease !important;
    }
    a.mhm-gh-cta-secondary:hover {
        background: rgba(255,255,255,0.05) !important;
        border-color: rgba(255,255,255,0.3) !important;
    }

    /* GAME PILLS BAR */
    .mhm-gh-pills-bar {
        border-top: 1px solid rgba(255,255,255,0.06);
        border-bottom: 1px solid rgba(255,255,255,0.06);
        padding: 0.5rem 0;
    }

    /* SEARCH BAR */
    .mhm-gh-search-wrap {
        padding: 1.5rem 0;
    }
    .mhm-gh-search-form {
        display: flex !important;
        align-items: center;
        background: #151B2B !important;
        border: 1px solid rgba(255,255,255,0.1) !important;
        border-radius: 9999px !important;
        overflow: hidden;
        transition: border-color 0.2s ease;
    }
    .mhm-gh-search-form:focus-within {
        border-color: var(--gh-accent) !important;
    }
    .mhm-gh-search-icon {
        padding: 0 0 0 1.25rem;
        color: #64748b;
        display: flex;
        align-items: center;
        flex-shrink: 0;
    }
    input.mhm-gh-search-input {
        flex: 1 !important;
        background: transparent !important;
        border: none !important;
        color: #f1f5f9 !important;
        padding: 0.875rem 1rem !important;
        font-size: 0.95rem !important;
        outline: none !important;
    white-space: nowrap !important;
        box-shadow: none !important;
        min-width: 0 !important;
    }
    input.mhm-gh-search-input::placeholder {
        color: #64748b !important;
    }
    button.mhm-gh-search-btn {
        background: var(--gh-accent) !important;
        color: #fff !important;
        border: none !important;
        border-radius: 9999px !important;
        padding: 0.625rem 1.5rem !important;
        margin: 0.3rem !important;
        font-weight: 600 !important;
        font-size: 0.85rem !important;
        cursor: pointer !important;
        white-space: nowrap !important;
        flex-shrink: 0 !important;
    }
    button.mhm-gh-search-btn:hover {
        opacity: 0.9 !important;
    }

    /* BODY: MAIN + SIDEBAR */
    .mhm-gh-body {
        display: grid;
        grid-template-columns: 1fr 320px;
        gap: 2.5rem;
        padding: 2rem 0;
    }

    /* POST GRID */
    .mhm-gh-posts {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
    }
    .mhm-gh-post-card {
        background: #151B2B !important;
        border: 1px solid rgba(255,255,255,0.08) !important;
        border-radius: 1rem !important;
        overflow: hidden;
        transition: border-color 0.2s ease, transform 0.2s ease !important;
        display: flex;
        flex-direction: column;
    }
    .mhm-gh-post-card:hover {
        border-color: rgba(255,255,255,0.15) !important;
        transform: translateY(-2px) !important;
    }
    a.mhm-gh-post-image-link {
        display: block;
        text-decoration: none !important;
    }
    .mhm-gh-post-image {
        width: 100%;
        height: 180px;
        overflow: hidden;
        background: #1e293b;
    }
    .mhm-gh-post-image img {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        border-radius: 0 !important;
    }
    .mhm-gh-post-image-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--gh-accent);
        opacity: 0.3;
    }
    .mhm-gh-post-image-placeholder svg {
        width: 48px;
        height: 48px;
    }
    .mhm-gh-post-body {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        flex: 1;
    }
    .mhm-gh-post-badge {
        display: inline-block;
        width: fit-content;
        background: rgba(255,255,255,0.05);
        color: var(--gh-accent) !important;
        padding: 0.2rem 0.6rem;
        border-radius: 0.375rem;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        margin-bottom: 0.75rem;
        border: 1px solid rgba(255,255,255,0.08);
    }
    h3.mhm-gh-post-title {
        font-size: 1.05rem !important;
        font-weight: 700 !important;
        line-height: 1.4 !important;
        margin: 0 0 0.5rem !important;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    .mhm-gh-post-title a {
        color: #f1f5f9 !important;
        text-decoration: none !important;
    }
    .mhm-gh-post-title a:hover {
        color: var(--gh-accent) !important;
    }
    .mhm-gh-post-excerpt {
        font-size: 0.85rem !important;
        color: #94a3b8 !important;
        line-height: 1.6;
        margin: 0 0 1rem;
        flex: 1;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    .mhm-gh-post-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: 1px solid rgba(255,255,255,0.06);
        padding-top: 0.75rem;
        margin-top: auto;
    }
    .mhm-gh-post-author {
        font-size: 0.8rem;
        color: #64748b !important;
    }
    a.mhm-gh-post-read {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--gh-accent) !important;
        text-decoration: none !important;
    }
    a.mhm-gh-post-read:hover {
        opacity: 0.8;
    }

    /* LOAD MORE / VIEW ALL */
    .mhm-gh-load-more-wrap {
        text-align: center;
        margin-top: 2rem;
    }

    /* NO POSTS */
    .mhm-gh-no-posts {
        text-align: center;
        padding: 3rem 2rem;
        color: #94a3b8;
    }

    /* SIDEBAR */
    .mhm-gh-sidebar {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        position: sticky !important;
        top: 2rem;
        align-self: start;
    }
    .mhm-gh-sidebar-card {
        background: #151B2B !important;
        border: 1px solid rgba(255,255,255,0.08) !important;
        border-radius: 1rem !important;
        padding: 1.5rem !important;
    }
    h3.mhm-gh-sidebar-title {
        font-size: 1rem !important;
        font-weight: 700 !important;
        color: #f1f5f9 !important;
        margin: 0 0 1rem !important;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .mhm-gh-cat-list {
        list-style: none !important;
        padding: 0 !important;
        margin: 0 !important;
    }
    .mhm-gh-cat-list li {
        margin: 0 !important;
        padding: 0 !important;
    }
    .mhm-gh-cat-list li a {
        display: flex !important;
        align-items: center;
        justify-content: space-between;
        padding: 0.6rem 0;
        border-bottom: 1px solid rgba(255,255,255,0.04);
        text-decoration: none !important;
        transition: all 0.15s ease;
        color: #94a3b8 !important;
    }
    .mhm-gh-cat-list li:last-child a {
        border-bottom: none;
    }
    .mhm-gh-cat-list li a:hover {
        color: var(--gh-accent) !important;
    }
    .mhm-gh-cat-name {
        font-size: 0.875rem;
        font-weight: 500;
    }
    .mhm-gh-cat-count {
        font-size: 0.75rem;
        background: rgba(255,255,255,0.05);
        padding: 0.15rem 0.5rem;
        border-radius: 9999px;
        color: #64748b !important;
    }

    /* PATREON CARD */
    .mhm-gh-patreon-card {
        border-color: rgba(236,72,153,0.2) !important;
    }
    .mhm-gh-patreon-text {
        font-size: 0.875rem;
        color: #94a3b8 !important;
        line-height: 1.6;
        margin: 0 0 1rem;
    }
    a.mhm-gh-patreon-btn {
        width: 100%;
        text-align: center;
    }

    /* EXPLORE MORE */
    .mhm-gh-explore {
        padding: 3rem 0 1rem;
        border-top: 1px solid rgba(255,255,255,0.06);
    }
    h2.mhm-gh-explore-title {
        font-size: 1.5rem !important;
        font-weight: 700 !important;
        color: #f1f5f9 !important;
        margin: 0 0 1.5rem !important;
    }
    .mhm-gh-explore-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
    }
    a.mhm-gh-explore-card {
        display: flex !important;
        align-items: center;
        gap: 1.25rem;
        background: #151B2B !important;
        border: 1px solid rgba(255,255,255,0.08) !important;
        border-radius: 1rem !important;
        padding: 1.5rem !important;
        text-decoration: none !important;
        transition: all 0.2s ease !important;
    }
    a.mhm-gh-explore-card:hover {
        border-color: var(--card-accent) !important;
        transform: translateY(-2px) !important;
    }
    .mhm-gh-explore-icon {
        flex-shrink: 0;
        color: var(--card-accent);
    }
    .mhm-gh-explore-icon svg {
        width: 48px;
        height: 48px;
    }
    .mhm-gh-explore-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    .mhm-gh-explore-name {
        font-size: 1.05rem;
        font-weight: 700;
        color: #f1f5f9 !important;
    }
    .mhm-gh-explore-tag {
        font-size: 0.8rem;
        color: #94a3b8 !important;
        line-height: 1.5;
    }

    /* RESPONSIVE */
    @media (max-width: 1024px) {
        .mhm-gh-hero { grid-template-columns: 1fr; gap: 2rem; }
        .mhm-gh-hero-image { min-height: 240px; order: -1; }
        .mhm-gh-body { grid-template-columns: 1fr; }
        .mhm-gh-sidebar { position: static !important; }
    }
    @media (max-width: 768px) {
        .mhm-gh-wrapper { padding: 0 1rem 2rem; }
        h1.mhm-gh-title { font-size: 2rem !important; }
        .mhm-gh-posts { grid-template-columns: 1fr; }
        .mhm-gh-explore-grid { grid-template-columns: 1fr; }
        .mhm-gh-cta-row { flex-direction: column; }
        a.mhm-gh-cta, a.mhm-gh-cta-secondary { width: 100%; text-align: center; }
    }

    /* FIX: Remove borders/hover/transforms for game hub page containers */
    body.page .mhm-gh-wrapper article.mhm-gh-post-card,
    .mhm-gh-post-card {
        background: #151B2B !important;
        box-shadow: none !important;
    }
    </style>';
}
add_action('wp_head', 'mhm_dark_theme_inline_css', 9999);

/**
 * Auto-display game pills on blog home and archive pages
 */
function mhm_auto_game_pills() {
    if (is_home() || is_front_page()) {
        echo "<div class=\"mhm-game-pills-container\" style=\"max-width:1400px;margin:0 auto;padding:1rem 2rem 0;\">";
        echo do_shortcode("[mhm_game_pills]");
        echo "</div>";
    }
}
add_action("kadence_before_main_content", "mhm_auto_game_pills", 5);

/**
 * Header & Search Modal Fixes v3
 */
function mhm_header_fixes_css() {
    echo '<style>
/* HEADER BUTTON - Patreon Membership */
#masthead .header-button,
header .header-button,
.header-button.button-style-filled {
    background: #ec4899 !important;
    border: none !important;
    border-radius: 9999px !important;
    color: #fff !important;
    padding: 0.5rem 1.25rem !important;
    font-weight: 600 !important;
    font-size: 0.875rem !important;
    box-shadow: none !important;
    outline: none !important;
    white-space: nowrap !important;
}
#masthead .header-button:hover,
header .header-button:hover {
    background: #db2777 !important;
}
/* Header search icon button */
#masthead .search-toggle-open,
header .search-toggle-open {
    color: #94a3b8 !important;
    background: transparent !important;
    border: none !important;
}
#masthead .search-toggle-open:hover {
    color: #f1f5f9 !important;
}
/* SEARCH DRAWER - Full screen centered */
#search-drawer.active {
    background: #0B0F19 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
}
#search-drawer .drawer-inner {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    width: 100% !important;
    height: 100% !important;
    padding: 2rem !important;
}
/* Close button - top right */
#search-drawer .drawer-header {
    position: fixed !important;
    top: 1.5rem !important;
    right: 1.5rem !important;
    z-index: 100 !important;
}
#search-drawer .search-toggle-close {
    background: rgba(255,255,255,0.1) !important;
    border: none !important;
    border-radius: 50% !important;
    width: 48px !important;
    height: 48px !important;
    color: #94a3b8 !important;
    cursor: pointer !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
}
#search-drawer .search-toggle-close:hover {
    background: rgba(255,255,255,0.15) !important;
    color: #f1f5f9 !important;
}
/* Content area - center everything */
#search-drawer .drawer-content {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    text-align: center !important;
    width: 100% !important;
    max-width: 600px !important;
    margin: 0 auto !important;
}
/* Title - using ::before on drawer-content */
#search-drawer .drawer-content::before {
    content: "Search the Blog" !important;
    display: block !important;
    font-size: 2rem !important;
    font-weight: 700 !important;
    color: #f1f5f9 !important;
    text-align: center !important;
    margin-bottom: 0.75rem !important;
    width: 100% !important;
}
/* Search form container */
#search-drawer .search-form {
    display: flex !important;
    background: #1e293b !important;
    border: 1px solid rgba(255,255,255,0.15) !important;
    border-radius: 9999px !important;
    overflow: hidden !important;
    width: 100% !important;
    max-width: 500px !important;
    margin: 0 auto !important;
}
#search-drawer .search-field {
    background: transparent !important;
    border: none !important;
    color: #f1f5f9 !important;
    padding: 1rem 1.5rem !important;
    flex: 1 !important;
    font-size: 1rem !important;
    outline: none !important;
    white-space: nowrap !important;
}
#search-drawer .search-field::placeholder {
    color: #64748b !important;
}
#search-drawer .search-submit {
    background: #ec4899 !important;
    border: none !important;
    border-radius: 9999px !important;
    color: #fff !important;
    padding: 0.875rem 1.5rem !important;
    margin: 0.25rem !important;
    cursor: pointer !important;
    font-weight: 600 !important;
    font-size: 0.9rem !important;
}
#search-drawer .search-submit {
    font-size: 0 !important;
    padding: 0.875rem 1rem !important;
}
#search-drawer .search-submit svg,
#search-drawer .search-submit .kadence-svg-iconset {
    display: inline-block !important;
    width: 20px !important;
    height: 20px !important;
}
#search-drawer .search-submit:hover {
    background: #db2777 !important;
}
/* Subtitle after search form */
#search-drawer .drawer-content::after {
    content: "Find mods, guides, and tutorials for Sims 4, Stardew Valley & Minecraft" !important;
    display: block !important;
    font-size: 0.95rem !important;
    color: #94a3b8 !important;
    text-align: center !important;
    margin-top: 1rem !important;
    width: 100% !important;
}
</style>';
}
add_action('wp_head', 'mhm_header_fixes_css', 10000);

/**
 * Replace Kadence logo with MHM Blog logo
 */
function mhm_replace_logo_css() {
    echo '<style>
/* Hide original logo image */
.site-branding a.brand.has-logo-image img.custom-logo {
    opacity: 0 !important;
    width: 0 !important;
    height: 0 !important;
    position: absolute !important;
}
/* Use background image on the link */
.site-branding a.brand.has-logo-image {
    display: block !important;
    width: 220px !important;
    height: 45px !important;
    background-image: url("/wp-content/uploads/2026/02/mhm-blog-logo.svg") !important;
    background-size: contain !important;
    background-repeat: no-repeat !important;
    background-position: left center !important;
}
</style>';
}
add_action('wp_head', 'mhm_replace_logo_css', 10002);

/**
 * Fix consumer privacy pill - disable hover expansion
 */
function mhm_privacy_pill_fix() {
    echo '<style>
/* Consumer privacy pill - dark theme, text always visible */
#consumer-privacy-footer-wrapper {
    z-index: 9999 !important;
}
.consumer-privacy-btn,
.consumer-privacy-tag-btn {
    background: #1e293b !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    color: #94a3b8 !important;
    transition: none !important;
}
.consumer-privacy-btn:hover,
.consumer-privacy-tag-btn:hover {
    background: #334155 !important;
    border-color: rgba(255,255,255,0.2) !important;
    color: #f1f5f9 !important;
    transition: none !important;
}
.consumer-privacy-tag-btn-language {
    width: auto !important;
    max-width: none !important;
    overflow: visible !important;
    opacity: 1 !important;
    color: #94a3b8 !important;
    font-size: 9px !important;
    transition: none !important;
}
</style>';
    // JS to force text visible after Mediavine JS sets width:0
    echo '<script>
    (function(){
      function fixPrivacyPill(){
        var span = document.querySelector(".consumer-privacy-tag-btn-language");
        if(span){
          span.style.setProperty("width","auto","important");
          span.style.setProperty("overflow","visible","important");
          span.style.setProperty("opacity","1","important");
        }
        var btn = document.querySelector(".consumer-privacy-tag-btn");
        if(btn){
          btn.style.setProperty("transition","none","important");
          btn.addEventListener("mouseenter",function(e){e.stopPropagation();},{capture:true});
        }
      }
      // Run after page load and periodically to catch Mediavine late init
      if(document.readyState==="complete"){fixPrivacyPill();}
      window.addEventListener("load",function(){
        fixPrivacyPill();
        setTimeout(fixPrivacyPill,2000);
        setTimeout(fixPrivacyPill,5000);
      });
      // Watch for Mediavine resetting styles
      var observer = new MutationObserver(function(mutations){
        mutations.forEach(function(m){
          if(m.target.classList && m.target.classList.contains("consumer-privacy-tag-btn-language")){
            m.target.style.setProperty("width","auto","important");
            m.target.style.setProperty("overflow","visible","important");
            m.target.style.setProperty("opacity","1","important");
          }
        });
      });
      document.addEventListener("DOMContentLoaded",function(){
        var span = document.querySelector(".consumer-privacy-tag-btn-language");
        if(span){observer.observe(span,{attributes:true,attributeFilter:["style"]});}
        else{setTimeout(function(){
          var s2 = document.querySelector(".consumer-privacy-tag-btn-language");
          if(s2){observer.observe(s2,{attributes:true,attributeFilter:["style"]});fixPrivacyPill();}
        },3000);}
      });
    })();
    </script>';
}
/**
 * Fix: Prioritize game landing pages over category slugs
 * When /sims-4/, /stardew-valley/, /minecraft/ are requested,
 * serve the page instead of the category archive
 */
function mhm_game_page_rewrite_rules() {
    $game_slugs = array('sims-4', 'stardew-valley', 'minecraft');
    foreach ($game_slugs as $slug) {
        $page = get_page_by_path($slug);
        if ($page) {
            add_rewrite_rule(
                '^' . preg_quote($slug, '/') . '/?$',
                'index.php?page_id=' . $page->ID,
                'top'
            );
        }
    }
}
add_action('init', 'mhm_game_page_rewrite_rules');

// Prevent canonical redirect for game landing pages
add_filter('redirect_canonical', function($redirect_url, $requested_url) {
    $game_slugs = array('/sims-4/', '/stardew-valley/', '/minecraft/');
    $path = parse_url($requested_url, PHP_URL_PATH);
    if (in_array($path, $game_slugs)) {
        return false;
    }
    return $redirect_url;
}, 5, 2);

/**
 * Final privacy button normalization with valid CSS (no escaped newline artifacts).
 */
function mhm_privacy_button_final_css() {
    echo '<style id="mhm-privacy-button-final-css">
#consumer-privacy-footer-wrapper {
  z-index: 9999 !important;
}
#consumer-privacy-footer-wrapper .consumer-privacy-btn,
#consumer-privacy-footer-wrapper .consumer-privacy-tag-btn {
  position: fixed !important;
  left: 16px !important;
  right: auto !important;
  bottom: 16px !important;
  top: auto !important;
  width: auto !important;
  min-width: 220px !important;
  height: 40px !important;
  min-height: 40px !important;
  max-height: 40px !important;
  padding: 0 14px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 999px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  line-height: 40px !important;
  transform: none !important;
  transition: none !important;
  animation: none !important;
}
#consumer-privacy-footer-wrapper .consumer-privacy-btn:hover,
#consumer-privacy-footer-wrapper .consumer-privacy-tag-btn:hover,
#consumer-privacy-footer-wrapper .consumer-privacy-btn:focus,
#consumer-privacy-footer-wrapper .consumer-privacy-tag-btn:focus {
  transform: none !important;
  transition: none !important;
  animation: none !important;
}
#consumer-privacy-footer-wrapper .consumer-privacy-tag-btn-language {
  writing-mode: horizontal-tb !important;
  text-orientation: mixed !important;
  display: inline-block !important;
  white-space: nowrap !important;
  width: auto !important;
  height: auto !important;
  max-width: none !important;
  max-height: none !important;
  overflow: visible !important;
  opacity: 1 !important;
  line-height: 40px !important;
  font-size: 12px !important;
}
</style>';
}
add_action('wp_head', 'mhm_privacy_button_final_css', 11000);

/**
 * Mod Finder parity layer for blog homepage.
 * Applied last to avoid conflicts with older theme overrides.
 */
function mhm_modfinder_homepage_parity_css() {
    if (!is_page(25)) {
        return;
    }
    echo '<style id="mhm-modfinder-parity-v1">
/* Tokens */
:root {
  --mhm-bg: #050b1f;
  --mhm-bg-soft: #0d1730;
  --mhm-card: #121d39;
  --mhm-card-hover: #162549;
  --mhm-text: #e8edf8;
  --mhm-muted: #93a0bf;
  --mhm-pink: #ec4899;
  --mhm-pink-hover: #db2777;
  --mhm-line: rgba(255,255,255,0.08);
}

/* Base layout + typography */
body.page-id-25,
body.page-id-25 .site,
body.page-id-25 #inner-wrap,
body.page-id-25 .content-area,
body.page-id-25 .site-main,
body.page-id-25 .content-wrap,
body.page-id-25 .entry-content,
body.page-id-25 .entry-content-wrap {
  background: var(--mhm-bg) !important;
  color: var(--mhm-text) !important;
}

body.page-id-25 {
  font-family: Poppins, "Segoe UI", sans-serif !important;
}

body.page-id-25 .content-container.site-container,
body.page-id-25 #main.site-main {
  max-width: 1320px !important;
  margin: 0 auto !important;
  padding-left: 20px !important;
  padding-right: 20px !important;
}

/* Header cleanup + parity */
body.page-id-25 #masthead {
  background: rgba(5, 11, 31, 0.88) !important;
  border-bottom: 1px solid var(--mhm-line) !important;
  backdrop-filter: blur(12px) !important;
}
body.page-id-25 #masthead .site-header-row-container-inner {
  max-width: 1320px !important;
}
body.page-id-25 .site-branding a.brand.has-logo-image {
  width: 210px !important;
  height: 38px !important;
}
body.page-id-25 #primary-menu,
body.page-id-25 #primary-menu ul,
body.page-id-25 #primary-menu li {
  list-style: none !important;
  margin: 0 !important;
  padding: 0 !important;
}
body.page-id-25 #primary-menu {
  display: flex !important;
  align-items: center !important;
  gap: 26px !important;
}
body.page-id-25 #primary-menu > li {
  position: relative !important;
  display: flex !important;
  align-items: center !important;
}
body.page-id-25 #primary-menu > li > a {
  color: var(--mhm-muted) !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  line-height: 1 !important;
  padding: 0 !important;
  text-decoration: none !important;
}
body.page-id-25 #primary-menu > li > a:hover,
body.page-id-25 #primary-menu > li.current-menu-item > a,
body.page-id-25 #primary-menu > li.current_page_item > a {
  color: #ffffff !important;
}
body.page-id-25 #primary-menu > li > .sub-menu {
  display: block !important;
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
  transform: translateY(8px) !important;
  transition: opacity 0.16s ease, transform 0.16s ease !important;
  background: #121a31 !important;
  border: 1px solid rgba(255,255,255,0.12) !important;
  border-radius: 12px !important;
  min-width: 190px !important;
  margin-top: 14px !important;
  overflow: hidden !important;
}
body.page-id-25 #primary-menu > li:hover > .sub-menu,
body.page-id-25 #primary-menu > li.mhm-open > .sub-menu {
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
  transform: translateY(0) !important;
}
body.page-id-25 #primary-menu > li > .sub-menu > li > a {
  color: var(--mhm-muted) !important;
  font-size: 14px !important;
  padding: 12px 14px !important;
  border-bottom: 1px solid rgba(255,255,255,0.06) !important;
}
body.page-id-25 #primary-menu > li > .sub-menu > li:last-child > a {
  border-bottom: 0 !important;
}
body.page-id-25 #primary-menu > li > .sub-menu > li > a:hover {
  color: #fff !important;
  background: rgba(255,255,255,0.05) !important;
}
body.page-id-25 .header-button,
body.page-id-25 .header-button.button-style-filled {
  background: var(--mhm-pink) !important;
  border: 0 !important;
  border-radius: 999px !important;
  color: #fff !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  padding: 10px 18px !important;
  line-height: 1 !important;
}
body.page-id-25 .header-button:hover {
  background: var(--mhm-pink-hover) !important;
}

/* Hero + search-first parity */
body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type {
  margin-top: 18px !important;
  margin-bottom: 34px !important;
  padding: 8px 0 12px !important;
}
body.page-id-25 .entry-content h1.kt-adv-heading25_840e09-39,
body.page-id-25 .entry-content h1 {
  font-size: clamp(34px, 4.1vw, 54px) !important;
  letter-spacing: -0.02em !important;
  line-height: 1.02 !important;
  margin-bottom: 14px !important;
  max-width: 720px !important;
}
body.page-id-25 .entry-content .kt-adv-heading25_c3b7ea-2e,
body.page-id-25 .entry-content p {
  color: var(--mhm-muted) !important;
  font-size: 15px !important;
  line-height: 1.6 !important;
}
body.page-id-25 .entry-content .wp-block-button__link {
  background: var(--mhm-pink) !important;
  border-radius: 999px !important;
  border: 0 !important;
  color: #fff !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  padding: 11px 22px !important;
}

#mhm-modfinder-search-shell {
  margin: 0 0 16px !important;
  max-width: 760px !important;
}
#mhm-modfinder-search-shell .mhm-search-title {
  color: #f3f6ff !important;
  font-size: clamp(28px, 3.2vw, 42px) !important;
  line-height: 1.05 !important;
  font-weight: 800 !important;
  margin: 0 0 12px !important;
}
#mhm-modfinder-search-shell .mhm-search-bar {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  background: rgba(14, 25, 50, 0.95) !important;
  border: 1px solid rgba(255,255,255,0.12) !important;
  border-radius: 12px !important;
  padding: 8px !important;
}
#mhm-modfinder-search-shell input[type="search"] {
  flex: 1 !important;
  background: transparent !important;
  border: 0 !important;
  color: #fff !important;
  font-size: 14px !important;
  padding: 10px 10px !important;
  box-shadow: none !important;
}
#mhm-modfinder-search-shell button {
  background: var(--mhm-pink) !important;
  border: 0 !important;
  border-radius: 10px !important;
  color: #fff !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  padding: 10px 14px !important;
}
#mhm-modfinder-search-shell .mhm-chip-row {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  margin-top: 10px !important;
}
#mhm-modfinder-search-shell .mhm-chip {
  background: rgba(20, 32, 59, 0.9) !important;
  border: 1px solid rgba(255,255,255,0.12) !important;
  border-radius: 999px !important;
  color: var(--mhm-muted) !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  padding: 7px 11px !important;
  text-decoration: none !important;
}
#mhm-modfinder-search-shell .mhm-chip:hover {
  color: #fff !important;
  border-color: rgba(236,72,153,0.45) !important;
}

/* Left faceted rail */
#mhm-left-filter-rail {
  position: fixed !important;
  top: 120px !important;
  left: 16px !important;
  width: 176px !important;
  background: rgba(14, 24, 47, 0.92) !important;
  border: 1px solid rgba(255,255,255,0.1) !important;
  border-radius: 14px !important;
  padding: 12px !important;
  z-index: 90 !important;
}
#mhm-left-filter-rail .mhm-rail-title {
  color: #f5f8ff !important;
  font-size: 11px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.08em !important;
  font-weight: 700 !important;
  margin: 0 0 10px !important;
}
#mhm-left-filter-rail .mhm-rail-link {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  color: var(--mhm-muted) !important;
  text-decoration: none !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  border-radius: 9px !important;
  padding: 8px 9px !important;
  margin-bottom: 5px !important;
  border: 1px solid transparent !important;
}
#mhm-left-filter-rail .mhm-rail-link:hover {
  color: #fff !important;
  background: rgba(255,255,255,0.04) !important;
  border-color: rgba(255,255,255,0.12) !important;
}
#mhm-left-filter-rail .mhm-dot {
  width: 6px !important;
  height: 6px !important;
  border-radius: 50% !important;
  background: var(--mhm-pink) !important;
  opacity: 0.8 !important;
}

/* Cards + IA */
body.page-id-25 .kb-posts-id-25_fe39da-b0,
body.page-id-25 .kadence-posts-list.grid-cols {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 16px !important;
  margin-top: 18px !important;
}
body.page-id-25 .kb-post-list-item,
body.page-id-25 .loop-entry {
  margin: 0 !important;
}
body.page-id-25 .kadence-posts-list article.loop-entry {
  background: var(--mhm-card) !important;
  border: 1px solid rgba(255,255,255,0.09) !important;
  border-radius: 14px !important;
  overflow: hidden !important;
  box-shadow: 0 8px 22px rgba(0,0,0,0.28) !important;
  transition: border-color .16s ease, transform .16s ease, background .16s ease !important;
}
body.page-id-25 .kadence-posts-list article.loop-entry:hover {
  background: var(--mhm-card-hover) !important;
  border-color: rgba(236,72,153,0.34) !important;
  transform: translateY(-2px) !important;
}
body.page-id-25 .kadence-posts-list .entry-content-wrap {
  padding: 12px !important;
}
body.page-id-25 .kadence-posts-list .entry-title,
body.page-id-25 .kadence-posts-list .entry-title a {
  color: #f3f6ff !important;
  font-size: 14px !important;
  line-height: 1.4 !important;
  font-weight: 700 !important;
}
body.page-id-25 .kadence-posts-list .entry-meta,
body.page-id-25 .kadence-posts-list .entry-meta a {
  color: #7f8bab !important;
  font-size: 11px !important;
}
body.page-id-25 .kadence-posts-list .entry-taxonomies,
body.page-id-25 .kadence-posts-list .entry-taxonomies a {
  color: #f38fc3 !important;
}
body.page-id-25 .kadence-posts-list .entry-taxonomies a {
  background: rgba(236,72,153,0.16) !important;
  border: 1px solid rgba(236,72,153,0.34) !important;
  border-radius: 999px !important;
  padding: 3px 8px !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.02em !important;
}
body.page-id-25 .kadence-posts-list .post-thumbnail {
  border-radius: 14px 14px 0 0 !important;
}
body.page-id-25 .kadence-posts-list .post-thumbnail img {
  border-radius: 14px 14px 0 0 !important;
}

/* Button parity */
body.page-id-25 button,
body.page-id-25 .button,
body.page-id-25 .wp-block-button__link,
body.page-id-25 input[type="submit"],
body.page-id-25 input[type="button"] {
  border-radius: 999px !important;
  min-height: 38px !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  padding: 8px 16px !important;
  transition: transform .14s ease, background .14s ease, border-color .14s ease !important;
}
body.page-id-25 button:hover,
body.page-id-25 .button:hover,
body.page-id-25 .wp-block-button__link:hover,
body.page-id-25 input[type="submit"]:hover {
  transform: translateY(-1px) !important;
}

/* Focus + interaction states */
body.page-id-25 a:focus-visible,
body.page-id-25 button:focus-visible,
body.page-id-25 input:focus-visible {
  outline: 2px solid rgba(236,72,153,0.85) !important;
  outline-offset: 2px !important;
}

/* Footer parity */
body.page-id-25 #colophon,
body.page-id-25 .site-footer,
body.page-id-25 .site-footer-wrap {
  background: #070d1e !important;
  border-top: 1px solid var(--mhm-line) !important;
}
body.page-id-25 #colophon .site-container {
  max-width: 1320px !important;
}
body.page-id-25 #colophon .menu,
body.page-id-25 #colophon .footer-navigation .menu {
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  gap: 6px !important;
}
body.page-id-25 #colophon .footer-navigation a,
body.page-id-25 #colophon a {
  color: #7f8bab !important;
  font-size: 12px !important;
}
body.page-id-25 #colophon a:hover {
  color: #ffffff !important;
}
body.page-id-25 #colophon .site-info {
  color: #667596 !important;
  font-size: 11px !important;
}

/* Mobile parity */
@media (max-width: 1350px) {
  #mhm-left-filter-rail { display: none !important; }
  body.page-id-25 .content-container.site-container,
  body.page-id-25 #main.site-main {
    max-width: 1180px !important;
  }
}
@media (max-width: 1100px) {
  body.page-id-25 .kb-posts-id-25_fe39da-b0,
  body.page-id-25 .kadence-posts-list.grid-cols { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
}
@media (max-width: 860px) {
  body.page-id-25 .kb-posts-id-25_fe39da-b0,
  body.page-id-25 .kadence-posts-list.grid-cols { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  body.page-id-25 #mhm-modfinder-search-shell .mhm-search-title { font-size: 28px !important; }
  body.page-id-25 .entry-content h1.kt-adv-heading25_840e09-39,
  body.page-id-25 .entry-content h1 { font-size: 30px !important; }
}
@media (max-width: 600px) {
  body.page-id-25 .kb-posts-id-25_fe39da-b0,
  body.page-id-25 .kadence-posts-list.grid-cols { grid-template-columns: 1fr !important; }
  #mhm-modfinder-search-shell .mhm-search-bar { flex-direction: row !important; }
  #mhm-modfinder-search-shell button { padding: 10px 12px !important; }
  body.page-id-25 .mobile-navigation ul li a { font-size: 14px !important; color: var(--mhm-text) !important; }
}
</style>';
}
add_action('wp_head', 'mhm_modfinder_homepage_parity_css', 12000);

/**
 * Inject search-first controls and left filter rail.
 */
function mhm_modfinder_homepage_parity_js() {
    if (!is_page(25)) {
        return;
    }
    echo '<script id="mhm-modfinder-parity-js" data-no-optimize="1" data-no-defer="1" data-no-minify="1">
(function(){
  function buildSearchShell(){
    var h1 = document.querySelector(".page-id-25 h1.kt-adv-heading25_840e09-39, .page-id-25 .entry-content h1");
    if(!h1 || document.getElementById("mhm-modfinder-search-shell")) return;

    var shell = document.createElement("div");
    shell.id = "mhm-modfinder-search-shell";
    shell.innerHTML = ""
      + "<h2 class=\"mhm-search-title\">Find Sims 4 CC, Mods & Custom Content</h2>"
      + "<form class=\"mhm-search-bar\" method=\"get\" action=\"/\">"
      + "<input type=\"search\" name=\"s\" placeholder=\"Search mods, creators, gameplay, and custom content...\" aria-label=\"Search blog\"/>"
      + "<button type=\"submit\">Search</button>"
      + "</form>"
      + "<div class=\"mhm-chip-row\">"
      + "<a class=\"mhm-chip\" href=\"/category/sims-4/sims-4-mods/\">Gameplay Mods</a>"
      + "<a class=\"mhm-chip\" href=\"/category/sims-4/sims-4-cc/\">Custom Content</a>"
      + "<a class=\"mhm-chip\" href=\"/category/sims-4/challenges/\">Challenges</a>"
      + "<a class=\"mhm-chip\" href=\"/sims-4/\">Sims 4</a>"
      + "<a class=\"mhm-chip\" href=\"/stardew-valley/\">Stardew Valley</a>"
      + "<a class=\"mhm-chip\" href=\"/minecraft/\">Minecraft</a>"
      + "</div>";

    var parent = h1.parentElement;
    if(parent){
      parent.insertBefore(shell, h1);
    }
  }

  function buildLeftRail(){
    if (window.innerWidth < 1350) return;
    if (document.getElementById("mhm-left-filter-rail")) return;

    var rail = document.createElement("aside");
    rail.id = "mhm-left-filter-rail";
    rail.setAttribute("aria-label", "Homepage filters");
    rail.innerHTML = ""
      + "<div class=\"mhm-rail-title\">Browse</div>"
      + "<a class=\"mhm-rail-link\" href=\"/homepage/\"><span class=\"mhm-dot\"></span>All Posts</a>"
      + "<a class=\"mhm-rail-link\" href=\"/category/sims-4/sims-4-mods/\"><span class=\"mhm-dot\"></span>Gameplay Mods</a>"
      + "<a class=\"mhm-rail-link\" href=\"/category/sims-4/sims-4-cc/\"><span class=\"mhm-dot\"></span>Custom Content</a>"
      + "<a class=\"mhm-rail-link\" href=\"/category/sims-4/challenges/\"><span class=\"mhm-dot\"></span>Challenges</a>"
      + "<a class=\"mhm-rail-link\" href=\"/sims-4/\"><span class=\"mhm-dot\"></span>Sims 4</a>"
      + "<a class=\"mhm-rail-link\" href=\"/stardew-valley/\"><span class=\"mhm-dot\"></span>Stardew Valley</a>"
      + "<a class=\"mhm-rail-link\" href=\"/minecraft/\"><span class=\"mhm-dot\"></span>Minecraft</a>";

    document.body.appendChild(rail);
  }

  function navHoverParity(){
    var items = document.querySelectorAll("#primary-menu > li.menu-item-has-children");
    if(!items.length) return;
    items.forEach(function(item){
      if(item.dataset.mhmBound === "1") return;
      item.dataset.mhmBound = "1";
      var closeTimer;
      item.addEventListener("mouseenter", function(){
        clearTimeout(closeTimer);
        item.classList.add("mhm-open");
      });
      item.addEventListener("mouseleave", function(){
        closeTimer = setTimeout(function(){ item.classList.remove("mhm-open"); }, 140);
      });
    });
  }

  function relabelSections(){
    var labels = {
      "What\'s New": "Trending Now",
      "Mods": "Gameplay Picks",
      "Custom Content": "Custom Content Picks",
      "Challenges": "Challenge Ideas"
    };
    var headings = document.querySelectorAll(".page-id-25 .entry-content h2");
    headings.forEach(function(h){
      var text = (h.textContent || "").trim();
      if(labels[text]) h.textContent = labels[text];
    });
  }

  function apply(){
    buildSearchShell();
    buildLeftRail();
    navHoverParity();
    relabelSections();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
  window.addEventListener("load", function(){
    apply();
    setTimeout(apply, 1200);
    setTimeout(apply, 2800);
  });
})();
</script>';
}
add_action('wp_footer', 'mhm_modfinder_homepage_parity_js', 12000);

/**
 * Server-rendered Mod Finder search shell so it appears even when JS is deferred.
 */
function mhm_modfinder_homepage_search_shell_prepend($content) {
    if (!is_page(25) || !is_main_query() || !in_the_loop()) {
        return $content;
    }

    $search_shell = '<div id="mhm-modfinder-search-shell" class="mhm-modfinder-server-shell">'
        . '<h2 class="mhm-search-title">Search the Blog</h2>'
        . '<form class="mhm-search-bar" method="get" action="/">'
        . '<input type="search" name="s" placeholder="Search mods, creators, gameplay, and custom content..." aria-label="Search blog" />'
        . '<button type="submit">Search</button>'
        . '</form>'
        . '<div class="mhm-chip-row">'
        . '<a class="mhm-chip" href="/category/sims-4/sims-4-mods/">Gameplay Mods</a>'
        . '<a class="mhm-chip" href="/category/sims-4/sims-4-cc/">Custom Content</a>'
        . '<a class="mhm-chip" href="/category/sims-4/challenges/">Challenges</a>'
        . '<a class="mhm-chip" href="/sims-4/">Sims 4</a>'
        . '<a class="mhm-chip" href="/stardew-valley/">Stardew Valley</a>'
        . '<a class="mhm-chip" href="/minecraft/">Minecraft</a>'
        . '</div>'
        . '</div>';

    return $search_shell . $content;
}
add_filter('the_content', 'mhm_modfinder_homepage_search_shell_prepend', 12);

/**
 * Server-rendered left filter rail for homepage parity.
 */
function mhm_modfinder_homepage_left_rail_markup() {
    if (!is_page(25)) {
        return;
    }

    echo '<aside id="mhm-left-filter-rail" aria-label="Homepage filters">'
        . '<div class="mhm-rail-title">Browse</div>'
        . '<a class="mhm-rail-link" href="/homepage/"><span class="mhm-dot"></span>All Posts</a>'
        . '<a class="mhm-rail-link" href="/category/sims-4/sims-4-mods/"><span class="mhm-dot"></span>Gameplay Mods</a>'
        . '<a class="mhm-rail-link" href="/category/sims-4/sims-4-cc/"><span class="mhm-dot"></span>Custom Content</a>'
        . '<a class="mhm-rail-link" href="/category/sims-4/challenges/"><span class="mhm-dot"></span>Challenges</a>'
        . '<a class="mhm-rail-link" href="/sims-4/"><span class="mhm-dot"></span>Sims 4</a>'
        . '<a class="mhm-rail-link" href="/stardew-valley/"><span class="mhm-dot"></span>Stardew Valley</a>'
        . '<a class="mhm-rail-link" href="/minecraft/"><span class="mhm-dot"></span>Minecraft</a>'
        . '</aside>';
}
add_action('wp_body_open', 'mhm_modfinder_homepage_left_rail_markup', 25);

/**
 * Hide the secondary header row on homepage to match Mod Finder (single-row navbar).
 */
function mhm_modfinder_homepage_header_cleanup_css() {
    if (!is_page(25)) {
        return;
    }
    echo '<style id="mhm-modfinder-header-cleanup">
body.page-id-25 .site-header-upper-wrap,
body.page-id-25 .site-header-upper-inner-wrap,
body.page-id-25 .site-header-upper-inner-wrap * {
  display: none !important;
}
body.page-id-25 .site-header-inner-wrap {
  padding-top: 0 !important;
}
</style>';
}
add_action('wp_head', 'mhm_modfinder_homepage_header_cleanup_css', 12010);

/**
 * Parity v2 refinements after visual QA.
 */
function mhm_modfinder_homepage_parity_v2_css() {
    if (!is_page(25)) {
        return;
    }

    echo '<style id="mhm-modfinder-parity-v2">
/* Restore primary header container (previous cleanup was too aggressive) */
body.page-id-25 .site-header-upper-wrap,
body.page-id-25 .site-header-upper-inner-wrap {
  display: block !important;
}

/* Keep navbar to one row and closer to Next.js nav density */
body.page-id-25 .site-main-header-inner-wrap {
  min-height: 78px !important;
}
body.page-id-25 #primary-menu {
  gap: 16px !important;
  flex-wrap: nowrap !important;
  overflow: hidden !important;
  white-space: nowrap !important;
}
body.page-id-25 #primary-menu > li > a {
  font-size: 13px !important;
}
/* Hide long-tail items to match Mod Finder IA */
body.page-id-25 #primary-menu > li:nth-child(6),
body.page-id-25 #primary-menu > li:nth-child(7),
body.page-id-25 #primary-menu > li:nth-child(8) {
  display: none !important;
}

/* Search shell hierarchy cleanup */
body.page-id-25 #mhm-modfinder-search-shell {
  margin: 18px 0 22px !important;
  padding: 14px 14px 12px !important;
  background: rgba(9, 16, 36, 0.82) !important;
  border: 1px solid rgba(255,255,255,0.07) !important;
  border-radius: 14px !important;
}
body.page-id-25 #mhm-modfinder-search-shell .mhm-search-title {
  font-size: 14px !important;
  line-height: 1.3 !important;
  text-transform: uppercase !important;
  letter-spacing: .08em !important;
  color: #a6b5d6 !important;
  margin-bottom: 10px !important;
}

/* Better vertical rhythm between search shell and hero block */
body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type {
  margin-top: 0 !important;
}

/* Left rail less intrusive */
body.page-id-25 #mhm-left-filter-rail {
  top: 164px !important;
  width: 152px !important;
  padding: 10px !important;
  background: rgba(11, 18, 40, 0.88) !important;
}
body.page-id-25 #mhm-left-filter-rail .mhm-rail-link {
  font-size: 11px !important;
  padding: 7px 8px !important;
}

/* Keep primary content clear of left rail on wide desktop */
@media (min-width: 1351px) {
  body.page-id-25 .content-container.site-container,
  body.page-id-25 #main.site-main {
    padding-left: 96px !important;
  }
}

/* Mobile: keep compact nav and search shell */
@media (max-width: 768px) {
  body.page-id-25 #mhm-modfinder-search-shell {
    margin: 10px 0 16px !important;
    padding: 12px !important;
  }
  body.page-id-25 #mhm-modfinder-search-shell .mhm-search-title {
    font-size: 12px !important;
  }
}
</style>';
}
add_action('wp_head', 'mhm_modfinder_homepage_parity_v2_css', 12020);

/**
 * Parity v3 micro-polish fixes.
 */
function mhm_modfinder_homepage_parity_v3_css() {
    if (!is_page(25)) {
        return;
    }
    echo '<style id="mhm-modfinder-parity-v3">
body.page-id-25 #mhm-modfinder-search-shell button {
  min-width: 88px !important;
  white-space: nowrap !important;
  word-break: normal !important;
  overflow-wrap: normal !important;
}
@media (max-width: 460px) {
  body.page-id-25 #mhm-modfinder-search-shell .mhm-search-bar {
    gap: 6px !important;
  }
  body.page-id-25 #mhm-modfinder-search-shell input[type="search"] {
    min-width: 0 !important;
    font-size: 13px !important;
  }
  body.page-id-25 #mhm-modfinder-search-shell button {
    min-width: 84px !important;
    padding: 10px 10px !important;
    font-size: 12px !important;
  }
}
</style>';
}
add_action('wp_head', 'mhm_modfinder_homepage_parity_v3_css', 12030);

/**
 * Custom top nav for homepage parity with Mod Finder.
 */
function mhm_modfinder_homepage_custom_nav_markup() {
    if (!is_page(25)) {
        return;
    }

    echo '<div id="mhm-top-nav">'
        . '<div class="mhm-top-nav-inner">'
        . '<a class="mhm-top-logo" href="/homepage/" aria-label="MustHaveMods Blog">'
        . '<img src="/wp-content/uploads/2026/02/mhm-blog-logo.svg" alt="MustHaveMods" loading="eager" decoding="async" />'
        . '</a>'
        . '<nav class="mhm-top-links" aria-label="Primary">'
        . '<a href="/homepage/">Discover</a>'
        . '<a href="/sims-4/">Games</a>'
        . '<a href="/category/sims-4/sims-4-mods/">Mods</a>'
        . '<a href="/category/sims-4/sims-4-cc/">Custom Content</a>'
        . '<a href="/category/sims-4/challenges/">Challenges</a>'
        . '</nav>'
        . '<div class="mhm-top-actions">'
        . '<a class="mhm-top-patreon" href="https://www.patreon.com/" target="_blank" rel="noopener noreferrer">Patreon Membership</a>'
        . '<button class="mhm-top-menu" type="button" aria-label="Toggle menu" onclick="document.getElementById(\'mhm-top-nav\').classList.toggle(\'mhm-open\')">☰</button>'
        . '</div>'
        . '</div>'
        . '</div>';
}
add_action('wp_body_open', 'mhm_modfinder_homepage_custom_nav_markup', 5);

/**
 * Custom top nav styles and mobile behavior.
 */
function mhm_modfinder_homepage_custom_nav_css_js() {
    if (!is_page(25)) {
        return;
    }

    echo '<style id="mhm-top-nav-parity-css">
body.page-id-25 #masthead { display: none !important; }
body.page-id-25 { padding-top: 84px !important; }
#mhm-top-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9998;
  background: rgba(5, 11, 31, 0.92);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(12px);
}
#mhm-top-nav .mhm-top-nav-inner {
  max-width: 1320px;
  height: 84px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
#mhm-top-nav .mhm-top-logo img {
  width: 175px;
  height: auto;
  display: block;
}
#mhm-top-nav .mhm-top-links {
  display: flex;
  align-items: center;
  gap: 24px;
}
#mhm-top-nav .mhm-top-links a {
  color: #97a3bf;
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
}
#mhm-top-nav .mhm-top-links a:hover {
  color: #ffffff;
}
#mhm-top-nav .mhm-top-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
#mhm-top-nav .mhm-top-patreon {
  background: #ec4899;
  color: #fff;
  text-decoration: none;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  padding: 10px 16px;
}
#mhm-top-nav .mhm-top-patreon:hover {
  background: #db2777;
}
#mhm-top-nav .mhm-top-menu {
  display: none;
  width: 42px;
  height: 42px;
  border-radius: 999px;
  border: 0;
  background: #ec4899;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
}

@media (max-width: 820px) {
  body.page-id-25 { padding-top: 76px !important; }
  #mhm-top-nav .mhm-top-nav-inner {
    height: 76px;
  }
  #mhm-top-nav .mhm-top-logo img {
    width: 148px;
  }
  #mhm-top-nav .mhm-top-patreon {
    display: none;
  }
  #mhm-top-nav .mhm-top-menu {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  #mhm-top-nav .mhm-top-links {
    position: absolute;
    top: 76px;
    left: 12px;
    right: 12px;
    background: #101a33;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 10px;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    display: none;
  }
  #mhm-top-nav.mhm-open .mhm-top-links {
    display: flex;
  }
  #mhm-top-nav .mhm-top-links a {
    width: 100%;
    padding: 8px 8px;
    border-radius: 8px;
  }
  #mhm-top-nav .mhm-top-links a:hover {
    background: rgba(255,255,255,0.05);
  }
}
</style>';

    echo '<script id="mhm-top-nav-parity-js" data-no-optimize="1" data-no-defer="1" data-no-minify="1">(function(){
      var nav = document.getElementById("mhm-top-nav");
      if(!nav) return;
      var btn = nav.querySelector(".mhm-top-menu");
      if(!btn) return;
      btn.addEventListener("click", function(){ nav.classList.toggle("mhm-open"); });
      window.addEventListener("resize", function(){ if(window.innerWidth > 820) nav.classList.remove("mhm-open"); });
    })();</script>';
}
add_action('wp_head', 'mhm_modfinder_homepage_custom_nav_css_js', 12040);

/**
 * Hard reset for failed homepage parity experiments.
 * Restores original header structure and removes injected custom UI layers.
 */
function mhm_homepage_restart_cleanup() {
    if (!is_page(25)) {
        return;
    }

    // Remove experimental injections from this session.
    remove_filter('the_content', 'mhm_modfinder_homepage_search_shell_prepend', 12);
    remove_action('wp_body_open', 'mhm_modfinder_homepage_left_rail_markup', 25);
    remove_action('wp_body_open', 'mhm_modfinder_homepage_custom_nav_markup', 5);

    // Keep old theme header and avoid custom-nav replacement.
    remove_action('wp_head', 'mhm_modfinder_homepage_custom_nav_css_js', 12040);
    remove_action('wp_head', 'mhm_modfinder_homepage_header_cleanup_css', 12010);
}
add_action('wp', 'mhm_homepage_restart_cleanup', 99);

/**
 * Clean homepage restyle v1: unified palette, white nav links, hero-first layout.
 */
function mhm_homepage_restart_style() {
    if (!is_page(25)) {
        return;
    }

    echo '<style id="mhm-homepage-restart-v1">
:root {
  --mhm-bg: #070d1f;
  --mhm-bg-soft: #0e1730;
  --mhm-card: #121d3a;
  --mhm-line: rgba(255,255,255,0.08);
  --mhm-text: #f5f7ff;
  --mhm-muted: #aeb7cd;
  --mhm-pink: #ec4899;
  --mhm-pink-hover: #db2777;
}

/* Unified base */
body.page-id-25,
body.page-id-25 .site,
body.page-id-25 #inner-wrap,
body.page-id-25 .content-area,
body.page-id-25 .site-main,
body.page-id-25 .content-wrap,
body.page-id-25 .entry-content,
body.page-id-25 .entry-content-wrap,
body.page-id-25 #primary {
  background: var(--mhm-bg) !important;
  color: var(--mhm-text) !important;
}

body.page-id-25 {
  font-family: Poppins, "Segoe UI", sans-serif !important;
}

/* Remove all session-added overlays if they exist in DOM */
#mhm-top-nav,
#mhm-left-filter-rail,
#mhm-modfinder-search-shell {
  display: none !important;
}

/* Restore/stabilize original header */
body.page-id-25 #masthead,
body.page-id-25 .site-header,
body.page-id-25 .site-header-wrap {
  display: block !important;
  background: rgba(7,13,31,0.9) !important;
  border-bottom: 1px solid var(--mhm-line) !important;
  backdrop-filter: blur(10px) !important;
}
body.page-id-25 .site-header-row-container-inner {
  max-width: 1320px !important;
  margin: 0 auto !important;
}
body.page-id-25 .site-branding a.brand.has-logo-image {
  width: 215px !important;
  height: 40px !important;
}

/* White nav links as requested */
body.page-id-25 #primary-menu,
body.page-id-25 #primary-menu ul,
body.page-id-25 #primary-menu li {
  list-style: none !important;
}
body.page-id-25 #primary-menu > li > a,
body.page-id-25 .main-navigation a {
  color: #ffffff !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  opacity: 0.92 !important;
}
body.page-id-25 #primary-menu > li > a:hover,
body.page-id-25 .main-navigation a:hover,
body.page-id-25 #primary-menu > li.current-menu-item > a {
  color: #ffffff !important;
  opacity: 1 !important;
}
body.page-id-25 #primary-menu > li > .sub-menu {
  background: #121b35 !important;
  border: 1px solid rgba(255,255,255,0.12) !important;
  border-radius: 12px !important;
  overflow: hidden !important;
}
body.page-id-25 #primary-menu > li > .sub-menu > li > a {
  color: #ffffff !important;
  opacity: 0.9 !important;
  border-bottom: 1px solid rgba(255,255,255,0.06) !important;
}
body.page-id-25 #primary-menu > li > .sub-menu > li > a:hover {
  background: rgba(255,255,255,0.05) !important;
}

/* Single cohesive content width */
body.page-id-25 .content-container.site-container,
body.page-id-25 #main.site-main {
  max-width: 1280px !important;
  margin: 0 auto !important;
  padding-left: 20px !important;
  padding-right: 20px !important;
}

/* Hero should be top and pop */
body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type {
  margin-top: 18px !important;
  margin-bottom: 34px !important;
  padding: 22px 20px !important;
  background: linear-gradient(180deg, rgba(17,29,56,0.65) 0%, rgba(7,13,31,0.15) 100%) !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
  border-radius: 18px !important;
}
body.page-id-25 .entry-content h1.kt-adv-heading25_840e09-39,
body.page-id-25 .entry-content h1 {
  color: var(--mhm-text) !important;
  font-size: clamp(42px, 5vw, 64px) !important;
  line-height: 1.02 !important;
  letter-spacing: -0.02em !important;
  margin-bottom: 14px !important;
}
body.page-id-25 .entry-content .kt-adv-heading25_c3b7ea-2e,
body.page-id-25 .entry-content p {
  color: var(--mhm-muted) !important;
  font-size: 20px !important;
  line-height: 1.5 !important;
}
body.page-id-25 .entry-content .wp-block-gallery .wp-block-image img,
body.page-id-25 .entry-content .wp-block-image img {
  border-radius: 16px !important;
  filter: drop-shadow(0 16px 34px rgba(0,0,0,0.45)) !important;
}

/* Section headings */
body.page-id-25 .entry-content h2 {
  color: var(--mhm-text) !important;
  font-size: clamp(28px, 2.4vw, 38px) !important;
  line-height: 1.1 !important;
  margin-top: 28px !important;
  margin-bottom: 18px !important;
}

/* Cards */
body.page-id-25 .kadence-posts-list.grid-cols {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 18px !important;
}
body.page-id-25 .kadence-posts-list article.loop-entry {
  background: var(--mhm-card) !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
  border-radius: 14px !important;
  box-shadow: 0 10px 24px rgba(0,0,0,0.25) !important;
  transition: transform .16s ease, border-color .16s ease !important;
}
body.page-id-25 .kadence-posts-list article.loop-entry:hover {
  transform: translateY(-2px) !important;
  border-color: rgba(236,72,153,0.35) !important;
}
body.page-id-25 .kadence-posts-list .entry-title,
body.page-id-25 .kadence-posts-list .entry-title a {
  color: var(--mhm-text) !important;
}
body.page-id-25 .kadence-posts-list .entry-meta,
body.page-id-25 .kadence-posts-list .entry-meta a {
  color: var(--mhm-muted) !important;
}

/* Buttons */
body.page-id-25 .wp-block-button__link,
body.page-id-25 .button,
body.page-id-25 button,
body.page-id-25 input[type="submit"] {
  background: var(--mhm-pink) !important;
  color: #fff !important;
  border: 0 !important;
  border-radius: 999px !important;
  min-height: 42px !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  padding: 10px 18px !important;
}
body.page-id-25 .wp-block-button__link:hover,
body.page-id-25 .button:hover,
body.page-id-25 button:hover,
body.page-id-25 input[type="submit"]:hover {
  background: var(--mhm-pink-hover) !important;
}

/* Footer */
body.page-id-25 #colophon,
body.page-id-25 .site-footer,
body.page-id-25 .site-footer-wrap {
  background: #070d1e !important;
  border-top: 1px solid var(--mhm-line) !important;
}
body.page-id-25 #colophon a {
  color: #ffffff !important;
  opacity: 0.82 !important;
}
body.page-id-25 #colophon a:hover {
  opacity: 1 !important;
}

/* Responsive */
@media (max-width: 1100px) {
  body.page-id-25 .kadence-posts-list.grid-cols {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
  body.page-id-25 .entry-content h1.kt-adv-heading25_840e09-39,
  body.page-id-25 .entry-content h1 {
    font-size: 44px !important;
  }
}
@media (max-width: 700px) {
  body.page-id-25 .kadence-posts-list.grid-cols {
    grid-template-columns: 1fr !important;
  }
  body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type {
    padding: 14px 12px !important;
  }
  body.page-id-25 .entry-content h1.kt-adv-heading25_840e09-39,
  body.page-id-25 .entry-content h1 {
    font-size: 34px !important;
    line-height: 1.05 !important;
  }
  body.page-id-25 .entry-content .kt-adv-heading25_c3b7ea-2e,
  body.page-id-25 .entry-content p {
    font-size: 20px !important;
  }
}
</style>';
}
add_action('wp_head', 'mhm_homepage_restart_style', 13000);

/**
 * Restart style v2 mobile fixes: single header + stacked hero.
 */
function mhm_homepage_restart_style_v2_mobile_fix() {
    if (!is_page(25)) {
        return;
    }

    echo '<style id="mhm-homepage-restart-v2-mobile-fix">
/* Force single correct header by breakpoint */
@media (min-width: 1025px) {
  body.page-id-25 #main-header { display: block !important; }
  body.page-id-25 #mobile-header { display: none !important; }
}
@media (max-width: 1024px) {
  body.page-id-25 #main-header { display: none !important; }
  body.page-id-25 #mobile-header { display: block !important; }
}

/* Mobile/tablet hero must stack and stay fully readable */
@media (max-width: 900px) {
  body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type {
    padding: 16px 14px !important;
    border-radius: 14px !important;
    overflow: visible !important;
  }

  body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type .kt-row-column-wrap,
  body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type .kt-has-2-columns {
    grid-template-columns: 1fr !important;
    gap: 14px !important;
  }

  body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type .wp-block-kadence-column {
    width: 100% !important;
    max-width: 100% !important;
  }

  body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type h1,
  body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type .kt-adv-heading25_840e09-39 {
    font-size: clamp(34px, 8vw, 46px) !important;
    line-height: 1.06 !important;
    margin: 0 0 10px !important;
    text-align: left !important;
  }

  body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type .kt-adv-heading25_c3b7ea-2e,
  body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type p {
    font-size: 20px !important;
    line-height: 1.5 !important;
    text-align: left !important;
  }

  body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type .wp-block-gallery,
  body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type .wp-block-image {
    margin: 0 auto 6px !important;
    max-width: 220px !important;
  }
}
</style>';
}
add_action('wp_head', 'mhm_homepage_restart_style_v2_mobile_fix', 13010);

/**
 * Restart style v3: ensure hero image is visible on mobile.
 */
function mhm_homepage_restart_style_v3_mobile_hero_image() {
    if (!is_page(25)) {
        return;
    }
    echo '<style id="mhm-homepage-restart-v3-mobile-hero-image">
@media (max-width: 900px) {
  body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type .kvs-sm-false,
  body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type .kvs-md-false {
    display: block !important;
  }
  body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type .wp-block-gallery,
  body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type .wp-block-image {
    display: block !important;
    opacity: 1 !important;
    visibility: visible !important;
  }
}
</style>';
}
add_action('wp_head', 'mhm_homepage_restart_style_v3_mobile_hero_image', 13020);

/**
 * Homepage visual hotfix pass for remaining UX issues.
 */
function mhm_homepage_hotfix_final_css() {
    if (!is_page(25)) {
        return;
    }

    echo '<style id="mhm-homepage-hotfix-final">
/* 1) Games dropdown reliability (hover + toggled state + touch support) */
body.page-id-25 #primary-menu > li.menu-item-has-children {
  position: relative !important;
}
body.page-id-25 #primary-menu > li.menu-item-has-children > .dropdown-nav-special-toggle {
  pointer-events: auto !important;
  opacity: 1 !important;
}
body.page-id-25 #primary-menu > li.menu-item-has-children > .sub-menu {
  display: block !important;
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
  transform: translateY(8px) !important;
  transition: opacity .14s ease, transform .14s ease !important;
  z-index: 100 !important;
}
body.page-id-25 #primary-menu > li.menu-item-has-children:hover > .sub-menu,
body.page-id-25 #primary-menu > li.menu-item-has-children.menu-item--toggled-on > .sub-menu,
body.page-id-25 #primary-menu > li.menu-item-has-children:focus-within > .sub-menu {
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
  transform: translateY(0) !important;
}

/* 2) Hero box color consistency + remove top tint artifacts */
body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type {
  background: #0f1832 !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
  border-radius: 16px !important;
  margin-top: 16px !important;
  margin-bottom: 14px !important;
  padding: 18px !important;
}
body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type::before,
body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type::after {
  display: none !important;
  content: none !important;
}

/* 3) Tighten gap between hero and Whats New */
body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type + .kb-row-layout-wrap,
body.page-id-25 .entry-content > h2,
body.page-id-25 .entry-content h2 {
  margin-top: 10px !important;
}
body.page-id-25 .entry-content h2 {
  margin-bottom: 12px !important;
}

/* 4) Footer layout repair */
body.page-id-25 #colophon,
body.page-id-25 .site-footer,
body.page-id-25 .site-footer-wrap {
  padding-top: 26px !important;
  padding-bottom: 20px !important;
}
body.page-id-25 #colophon .site-middle-footer-inner-wrap {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) !important;
  gap: 20px !important;
  align-items: start !important;
}
body.page-id-25 #colophon .footer-widget-area,
body.page-id-25 #colophon .site-footer-section {
  width: 100% !important;
  min-width: 0 !important;
}
body.page-id-25 #colophon .footer-navigation .menu {
  display: flex !important;
  flex-direction: column !important;
  gap: 6px !important;
  align-items: flex-start !important;
}
body.page-id-25 #colophon .site-info {
  margin-top: 10px !important;
  padding-top: 8px !important;
  border-top: 1px solid rgba(255,255,255,0.06) !important;
}

/* mobile spacing guard */
@media (max-width: 900px) {
  body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type {
    margin-bottom: 8px !important;
    padding: 14px !important;
  }
  body.page-id-25 .entry-content h2 {
    margin-top: 8px !important;
  }
}
</style>';
}
add_action('wp_head', 'mhm_homepage_hotfix_final_css', 14000);

/**
 * Ensure Games menu opens on click for non-hover/touch contexts.
 */
function mhm_homepage_hotfix_final_js() {
    if (!is_page(25)) {
        return;
    }

    echo '<script id="mhm-homepage-hotfix-final-js" data-no-optimize="1" data-no-defer="1" data-no-minify="1">(function(){
      var li = document.querySelector("#primary-menu > li.menu-item-has-children");
      if(!li) return;
      var trigger = li.querySelector("a, .dropdown-nav-special-toggle");
      if(!trigger) return;

      function toggle(e){
        e.preventDefault();
        li.classList.toggle("menu-item--toggled-on");
      }

      trigger.addEventListener("click", toggle);
      var btn = li.querySelector(".dropdown-nav-special-toggle");
      if(btn && btn !== trigger){ btn.addEventListener("click", toggle); }

      document.addEventListener("click", function(e){
        if(!li.contains(e.target)) li.classList.remove("menu-item--toggled-on");
      });
    })();</script>';
}
add_action('wp_footer', 'mhm_homepage_hotfix_final_js', 14000);

/**
 * Final polish for hero surface and footer structure.
 */
function mhm_homepage_hotfix_polish_css() {
    if (!is_page(25)) {
        return;
    }

    echo '<style id="mhm-homepage-hotfix-polish">
/* Hero: remove nested tint layers so top shade is consistent */
body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type,
body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type .kt-row-column-wrap,
body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type .wp-block-kadence-column,
body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type .kt-inside-inner-col {
  background-color: #0f1832 !important;
  background-image: none !important;
}
body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type {
  margin-bottom: 8px !important;
}
body.page-id-25 .entry-content h2 {
  margin-top: 4px !important;
}

/* Footer: force stable 3-column layout and remove ghost tracks */
body.page-id-25 #colophon .site-middle-footer-inner-wrap {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 24px !important;
}
body.page-id-25 #colophon .site-footer-middle-section-1,
body.page-id-25 #colophon .site-footer-middle-section-2,
body.page-id-25 #colophon .site-footer-middle-section-3 {
  display: flex !important;
}

@media (max-width: 900px) {
  body.page-id-25 #colophon .site-middle-footer-inner-wrap {
    grid-template-columns: 1fr !important;
    gap: 14px !important;
  }
}
</style>';
}
add_action('wp_head', 'mhm_homepage_hotfix_polish_css', 14010);

/**
 * User-requested final polish:
 * - Reliable Games dropdown
 * - Hero section transparent background with outline only
 * - Footer on one line (desktop), white typography
 */
function mhm_homepage_user_polish_css() {
    if (!is_page(25)) {
        return;
    }

    echo '<style id="mhm-homepage-user-polish">
/* Games dropdown reliability */
body.page-id-25 #primary-menu > li.menu-item-has-children { position: relative !important; }
body.page-id-25 #primary-menu > li.menu-item-has-children > a { cursor: pointer !important; }
body.page-id-25 #primary-menu > li.menu-item-has-children > .dropdown-nav-special-toggle {
  pointer-events: auto !important;
  z-index: 3 !important;
}
body.page-id-25 #primary-menu > li.menu-item-has-children > .sub-menu {
  position: absolute !important;
  top: 100% !important;
  left: 0 !important;
  min-width: 210px !important;
  display: block !important;
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
  transform: translateY(8px) !important;
  transition: opacity .14s ease, transform .14s ease, visibility .14s ease !important;
}
body.page-id-25 #primary-menu > li.menu-item-has-children:hover > .sub-menu,
body.page-id-25 #primary-menu > li.menu-item-has-children:focus-within > .sub-menu,
body.page-id-25 #primary-menu > li.menu-item-has-children.menu-item--toggled-on > .sub-menu,
body.page-id-25 #primary-menu > li.menu-item-has-children.mhm-open > .sub-menu {
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
  transform: translateY(0) !important;
}

/* Hero panel: remove fill, keep outline */
body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type,
body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type .kt-row-column-wrap,
body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type .wp-block-kadence-column,
body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type .kt-inside-inner-col {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
}
body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type {
  border: 1px solid rgba(255,255,255,0.15) !important;
  border-radius: 16px !important;
  padding: 20px !important;
}

/* Footer: one-line desktop + white text */
body.page-id-25 #colophon,
body.page-id-25 .site-footer,
body.page-id-25 .site-footer-wrap,
body.page-id-25 .site-middle-footer-wrap,
body.page-id-25 .site-footer-row-container-inner {
  background: #050b1f !important;
  border-top: 1px solid rgba(255,255,255,0.12) !important;
}
body.page-id-25 #colophon .site-middle-footer-inner-wrap {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 24px !important;
}
body.page-id-25 #colophon .site-footer-middle-section-1,
body.page-id-25 #colophon .site-footer-middle-section-2,
body.page-id-25 #colophon .site-footer-middle-section-3 {
  display: flex !important;
  align-items: center !important;
  flex: 0 0 auto !important;
}
body.page-id-25 #colophon .footer-navigation .menu {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  flex-wrap: nowrap !important;
  gap: 16px !important;
  margin: 0 !important;
  padding: 0 !important;
}
body.page-id-25 #colophon .footer-navigation .menu li {
  margin: 0 !important;
}
body.page-id-25 #colophon a,
body.page-id-25 #colophon .site-info,
body.page-id-25 #colophon .site-info a,
body.page-id-25 #colophon p,
body.page-id-25 #colophon span {
  color: #ffffff !important;
  opacity: 0.95 !important;
  text-decoration: none !important;
}
body.page-id-25 #colophon .site-info {
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  white-space: nowrap !important;
  font-size: 14px !important;
}
body.page-id-25 #colophon .footer-social-wrap,
body.page-id-25 #colophon .footer-social-inner-wrap {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
}
body.page-id-25 #colophon .social-button {
  color: #ffffff !important;
  border-color: rgba(255,255,255,0.2) !important;
}

@media (max-width: 980px) {
  body.page-id-25 #colophon .site-middle-footer-inner-wrap {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 10px !important;
  }
  body.page-id-25 #colophon .footer-navigation .menu {
    flex-wrap: wrap !important;
    gap: 10px !important;
  }
}
</style>';
}
add_action('wp_head', 'mhm_homepage_user_polish_css', 15000);

/**
 * Click fallback for Games menu in case theme JS misses toggling.
 */
function mhm_homepage_user_polish_js() {
    if (!is_page(25)) {
        return;
    }

    echo '<script id="mhm-homepage-user-polish-js" data-no-optimize="1" data-no-defer="1" data-no-minify="1">(function(){
      var li = document.querySelector("#primary-menu > li.menu-item-has-children");
      if(!li) return;
      var trigger = li.querySelector("a");
      var toggle = li.querySelector(".dropdown-nav-special-toggle");
      function onToggle(e){
        e.preventDefault();
        li.classList.toggle("mhm-open");
        li.classList.toggle("menu-item--toggled-on");
      }
      if(trigger) trigger.addEventListener("click", onToggle);
      if(toggle) toggle.addEventListener("click", onToggle);
      document.addEventListener("click", function(e){
        if(!li.contains(e.target)) {
          li.classList.remove("mhm-open");
          li.classList.remove("menu-item--toggled-on");
        }
      });
    })();</script>';
}
add_action('wp_footer', 'mhm_homepage_user_polish_js', 15000);

/**
 * Footer final visual pass: white, readable, one-line desktop.
 */
function mhm_homepage_footer_white_final() {
    if (!is_page(25)) {
        return;
    }

    echo '<style id="mhm-homepage-footer-white-final">
body.page-id-25 #colophon .footer-navigation .menu,
body.page-id-25 #colophon .footer-navigation .menu li,
body.page-id-25 #colophon .footer-navigation .menu a,
body.page-id-25 #colophon .site-info,
body.page-id-25 #colophon .site-info a,
body.page-id-25 #colophon .footer-social-wrap a,
body.page-id-25 #colophon .footer-social-inner-wrap a,
body.page-id-25 #colophon .social-button,
body.page-id-25 #colophon .social-button svg,
body.page-id-25 #colophon .footer-widget-area,
body.page-id-25 #colophon .footer-widget-area * {
  color: #ffffff !important;
  fill: #ffffff !important;
  opacity: 1 !important;
}

body.page-id-25 #colophon .footer-navigation .menu a {
  font-size: 13px !important;
  font-weight: 500 !important;
  letter-spacing: .01em !important;
}

body.page-id-25 #colophon .footer-navigation .menu a:hover,
body.page-id-25 #colophon .footer-social-wrap a:hover,
body.page-id-25 #colophon .social-button:hover {
  color: #ffffff !important;
  filter: brightness(1.2) !important;
}

body.page-id-25 #colophon .site-info {
  font-size: 13px !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: .04em !important;
}
</style>';
}
add_action('wp_head', 'mhm_homepage_footer_white_final', 16000);

/**
 * Dropdown visibility hard-fix: prevent clipping and enforce hover reveal.
 */
function mhm_games_dropdown_hardfix_css() {
    if (!is_page(25)) {
        return;
    }

    echo '<style id="mhm-games-dropdown-hardfix">
/* Prevent submenu clipping by parent containers */
body.page-id-25 .main-navigation,
body.page-id-25 .header-navigation,
body.page-id-25 .header-menu-container,
body.page-id-25 #primary-menu,
body.page-id-25 #primary-menu > li {
  overflow: visible !important;
}

/* Dropdown look and behavior */
body.page-id-25 #primary-menu > li.menu-item-has-children {
  position: relative !important;
}
body.page-id-25 #primary-menu > li.menu-item-has-children > .sub-menu {
  position: absolute !important;
  left: 0 !important;
  top: calc(100% + 10px) !important;
  min-width: 210px !important;
  margin: 0 !important;
  padding: 8px !important;
  border-radius: 12px !important;
  border: 1px solid rgba(255,255,255,0.14) !important;
  background: #0f1a35 !important;
  box-shadow: 0 14px 32px rgba(0,0,0,0.45) !important;
  z-index: 99999 !important;
  display: block !important;
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
  transform: translateY(8px) !important;
  transition: opacity .14s ease, transform .14s ease, visibility .14s ease !important;
}
body.page-id-25 #primary-menu > li.menu-item-has-children > .sub-menu > li {
  margin: 0 !important;
}
body.page-id-25 #primary-menu > li.menu-item-has-children > .sub-menu > li > a {
  display: block !important;
  padding: 10px 12px !important;
  border-radius: 8px !important;
  color: #ffffff !important;
  opacity: .96 !important;
  font-size: 13px !important;
  line-height: 1.2 !important;
}
body.page-id-25 #primary-menu > li.menu-item-has-children > .sub-menu > li > a:hover {
  background: rgba(255,255,255,0.08) !important;
}

/* Open states: hover, focus, WordPress toggled, custom class */
body.page-id-25 #primary-menu > li.menu-item-has-children:hover > .sub-menu,
body.page-id-25 #primary-menu > li.menu-item-has-children:focus-within > .sub-menu,
body.page-id-25 #primary-menu > li.menu-item-has-children.menu-item--toggled-on > .sub-menu,
body.page-id-25 #primary-menu > li.menu-item-has-children.mhm-open > .sub-menu {
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
  transform: translateY(0) !important;
}
</style>';
}
add_action('wp_head', 'mhm_games_dropdown_hardfix_css', 17000);

/**
 * Sitewide rollout: Games dropdown + refined footer across blog pages.
 */
function mhm_blog_sitewide_header_footer_rollout_css() {
    if (is_admin()) {
        return;
    }

    echo '<style id="mhm-blog-sitewide-header-footer-rollout">
/* Header dropdown works across all pages */
#primary-menu > li.menu-item-has-children,
.main-navigation .menu > li.menu-item-has-children {
  position: relative !important;
}
#primary-menu > li.menu-item-has-children,
.main-navigation,
.header-navigation,
.header-menu-container,
#primary-menu {
  overflow: visible !important;
}
#primary-menu > li.menu-item-has-children > .dropdown-nav-special-toggle {
  pointer-events: auto !important;
  z-index: 3 !important;
}
#primary-menu > li.menu-item-has-children > .sub-menu {
  position: absolute !important;
  left: 0 !important;
  top: calc(100% + 10px) !important;
  min-width: 210px !important;
  margin: 0 !important;
  padding: 8px !important;
  border-radius: 12px !important;
  border: 1px solid rgba(255,255,255,0.14) !important;
  background: #0f1a35 !important;
  box-shadow: 0 14px 32px rgba(0,0,0,0.45) !important;
  z-index: 99999 !important;
  display: block !important;
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
  transform: translateY(8px) !important;
  transition: opacity .14s ease, transform .14s ease, visibility .14s ease !important;
}
#primary-menu > li.menu-item-has-children > .sub-menu > li > a {
  display: block !important;
  padding: 10px 12px !important;
  border-radius: 8px !important;
  color: #ffffff !important;
  opacity: .96 !important;
  font-size: 13px !important;
  line-height: 1.2 !important;
}
#primary-menu > li.menu-item-has-children > .sub-menu > li > a:hover {
  background: rgba(255,255,255,0.08) !important;
}
#primary-menu > li.menu-item-has-children:hover > .sub-menu,
#primary-menu > li.menu-item-has-children:focus-within > .sub-menu,
#primary-menu > li.menu-item-has-children.menu-item--toggled-on > .sub-menu,
#primary-menu > li.menu-item-has-children.mhm-open > .sub-menu {
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
  transform: translateY(0) !important;
}

/* Footer one-line desktop + white text globally */
#colophon,
.site-footer,
.site-footer-wrap,
.site-middle-footer-wrap,
.site-footer-row-container-inner {
  border-top: 1px solid rgba(255,255,255,0.12) !important;
}
#colophon .site-middle-footer-inner-wrap {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 24px !important;
}
#colophon .site-footer-middle-section-1,
#colophon .site-footer-middle-section-2,
#colophon .site-footer-middle-section-3 {
  display: flex !important;
  align-items: center !important;
  flex: 0 0 auto !important;
}
#colophon .footer-navigation .menu {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  flex-wrap: nowrap !important;
  gap: 16px !important;
  margin: 0 !important;
  padding: 0 !important;
}
#colophon .footer-navigation .menu li { margin: 0 !important; }
#colophon .footer-navigation .menu,
#colophon .footer-navigation .menu li,
#colophon .footer-navigation .menu a,
#colophon .site-info,
#colophon .site-info a,
#colophon .footer-social-wrap a,
#colophon .footer-social-inner-wrap a,
#colophon .social-button,
#colophon .social-button svg,
#colophon .footer-widget-area,
#colophon .footer-widget-area * {
  color: #ffffff !important;
  fill: #ffffff !important;
  opacity: 1 !important;
}
#colophon .footer-navigation .menu a {
  font-size: 13px !important;
  font-weight: 500 !important;
  letter-spacing: .01em !important;
  text-decoration: none !important;
}
#colophon .site-info {
  font-size: 13px !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: .04em !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  white-space: nowrap !important;
}

@media (max-width: 980px) {
  #colophon .site-middle-footer-inner-wrap {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 10px !important;
  }
  #colophon .footer-navigation .menu {
    flex-wrap: wrap !important;
    gap: 10px !important;
  }
}
</style>';
}
add_action('wp_head', 'mhm_blog_sitewide_header_footer_rollout_css', 18000);

/**
 * Sitewide click fallback for Games dropdown.
 */
function mhm_blog_sitewide_dropdown_rollout_js() {
    if (is_admin()) {
        return;
    }

    echo '<script id="mhm-blog-sitewide-dropdown-rollout-js" data-no-optimize="1" data-no-defer="1" data-no-minify="1">(function(){
      function bind(){
        var li = document.querySelector("#primary-menu > li.menu-item-has-children");
        if(!li || li.dataset.mhmBound === "1") return;
        li.dataset.mhmBound = "1";

        var trigger = li.querySelector("a");
        var toggle = li.querySelector(".dropdown-nav-special-toggle");

        function onToggle(e){
          e.preventDefault();
          li.classList.toggle("mhm-open");
          li.classList.toggle("menu-item--toggled-on");
        }
        if(trigger) trigger.addEventListener("click", onToggle);
        if(toggle) toggle.addEventListener("click", onToggle);

        document.addEventListener("click", function(e){
          if(!li.contains(e.target)) {
            li.classList.remove("mhm-open");
            li.classList.remove("menu-item--toggled-on");
          }
        });
      }

      if(document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded", bind);
      } else {
        bind();
      }
      window.addEventListener("load", function(){ setTimeout(bind, 800); });
    })();</script>';
}
add_action('wp_footer', 'mhm_blog_sitewide_dropdown_rollout_js', 18000);

/**
 * Single post cohesion cleanup:
 * - Remove side color bleed around Similar Posts
 * - Normalize footer section backgrounds/line layout
 */
function mhm_single_post_cohesion_cleanup_css() {
    if (!is_single()) {
        return;
    }

    echo '<style id="mhm-single-post-cohesion-cleanup">
/* Global single-post background cohesion */
body.single-post,
body.single-post .site,
body.single-post #wrapper,
body.single-post #inner-wrap,
body.single-post #primary,
body.single-post .content-area,
body.single-post .content-container,
body.single-post .site-main,
body.single-post .content-wrap,
body.single-post .single-entry,
body.single-post .entry-content-wrap,
body.single-post .entry-content {
  background: #050b1f !important;
}

/* Similar posts section - eliminate side panels */
body.single-post .entry-related.alignfull,
body.single-post .entry-related,
body.single-post .entry-related-inner,
body.single-post .entry-related-inner.content-container.site-container,
body.single-post .entry-related-inner-content.alignwide,
body.single-post .entry-related-inner-content {
  background: #050b1f !important;
  background-color: #050b1f !important;
  background-image: none !important;
}
body.single-post .entry-related.alignfull {
  border-top: 1px solid rgba(255,255,255,0.06) !important;
  border-bottom: 1px solid rgba(255,255,255,0.06) !important;
}
body.single-post .entry-related-inner.content-container.site-container {
  max-width: 1320px !important;
  margin: 0 auto !important;
  padding-left: 24px !important;
  padding-right: 24px !important;
}
body.single-post .entry-related-inner-content.alignwide {
  max-width: 1320px !important;
  margin: 0 auto !important;
}

/* Footer - remove side gray blocks and keep one cohesive line */
body.single-post #colophon,
body.single-post .site-footer,
body.single-post .site-footer-wrap,
body.single-post .site-middle-footer-wrap,
body.single-post .site-footer-row-container-inner,
body.single-post .site-middle-footer-inner-wrap,
body.single-post .site-footer-section,
body.single-post .site-footer-middle-section-1,
body.single-post .site-footer-middle-section-2,
body.single-post .site-footer-middle-section-3,
body.single-post .footer-widget-area,
body.single-post .footer-widget-area-inner {
  background: #050b1f !important;
  background-color: #050b1f !important;
  background-image: none !important;
}
body.single-post #colophon .site-middle-footer-inner-wrap {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 22px !important;
}
body.single-post #colophon .site-footer-middle-section-1,
body.single-post #colophon .site-footer-middle-section-2,
body.single-post #colophon .site-footer-middle-section-3 {
  flex: 0 0 auto !important;
  padding: 0 !important;
  margin: 0 !important;
  border: 0 !important;
}
body.single-post #colophon .site-footer-middle-section-3 {
  margin-left: auto !important;
}

@media (max-width: 980px) {
  body.single-post #colophon .site-middle-footer-inner-wrap {
    flex-direction: column !important;
    align-items: flex-start !important;
  }
  body.single-post #colophon .site-footer-middle-section-3 {
    margin-left: 0 !important;
  }
}
</style>';
}
add_action('wp_head', 'mhm_single_post_cohesion_cleanup_css', 19000);

/**
 * Single-post related posts layout stabilization.
 */
function mhm_single_post_related_posts_layout_fix_css() {
    if (!is_single()) {
        return;
    }

    echo '<style id="mhm-single-post-related-posts-layout-fix">
/* Replace unstable carousel geometry with predictable card grid */
body.single-post .entry-related .splide,
body.single-post .entry-related .splide__track,
body.single-post .entry-related .splide__list {
  overflow: visible !important;
}
body.single-post .entry-related .splide__list {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 18px !important;
  transform: none !important;
}
body.single-post .entry-related .splide__slide {
  width: auto !important;
  margin: 0 !important;
  flex: none !important;
  display: block !important;
  transform: none !important;
}
body.single-post .entry-related .kt-post-grid-item,
body.single-post .entry-related article,
body.single-post .entry-related .entry {
  background: #0f1832 !important;
  border: 1px solid rgba(255,255,255,0.1) !important;
  border-radius: 12px !important;
  overflow: hidden !important;
}
body.single-post .entry-related .post-thumbnail,
body.single-post .entry-related .post-thumbnail img {
  display: block !important;
  width: 100% !important;
  height: 180px !important;
  object-fit: cover !important;
}
body.single-post .entry-related .entry-title,
body.single-post .entry-related .entry-title a {
  color: #ffffff !important;
}
body.single-post .entry-related .splide__arrows,
body.single-post .entry-related .splide__pagination,
body.single-post .entry-related .kt-blocks-posts-carousel-arrow {
  display: none !important;
}

@media (max-width: 980px) {
  body.single-post .entry-related .splide__list {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}
@media (max-width: 680px) {
  body.single-post .entry-related .splide__list {
    grid-template-columns: 1fr !important;
  }
}
</style>';
}
add_action('wp_head', 'mhm_single_post_related_posts_layout_fix_css', 19010);

/**
 * Non-homepage dropdown hover bridge fix.
 * Game hub pages were losing hover due to vertical gap between parent item and submenu.
 */
function mhm_non_homepage_dropdown_hover_bridge_fix_css() {
    if (is_admin() || is_page(25)) {
        return;
    }

    echo '<style id="mhm-non-homepage-dropdown-hover-bridge-fix">\
#primary-menu > li.menu-item-has-children {\
  position: relative !important;\
}\
#primary-menu > li.menu-item-has-children::after {\
  content: "";\
  position: absolute;\
  left: 0;\
  right: 0;\
  top: 100%;\
  height: 12px;\
}\
#primary-menu > li.menu-item-has-children > .sub-menu {\
  top: calc(100% + 2px) !important;\
}\
</style>';
}
add_action('wp_head', 'mhm_non_homepage_dropdown_hover_bridge_fix_css', 18100);

/**
 * Force site logo link to /homepage across blog pages.
 */
function mhm_force_logo_link_to_homepage_js() {
    if (is_admin()) {
        return;
    }

    echo '<script id="mhm-force-logo-homepage-link-js" data-no-optimize="1" data-no-defer="1" data-no-minify="1">(function(){
      function setLogoHref(){
        var links = document.querySelectorAll("a.brand.has-logo-image, .site-branding a[href]");
        if(!links || !links.length) return;
        links.forEach(function(link){
          link.setAttribute("href", "https://blogmusthavemodscom.bigscoots-staging.com/homepage");
        });
      }
      if(document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded", setLogoHref);
      } else {
        setLogoHref();
      }
      window.addEventListener("load", setLogoHref);
    })();</script>';
}
add_action('wp_footer', 'mhm_force_logo_link_to_homepage_js', 20000);

/**
 * Match homepage header menu style on all non-homepage pages.
 */
function mhm_non_homepage_match_homepage_header_menu_css() {
    if (is_admin() || is_page(25)) {
        return;
    }

    echo '<style id="mhm-non-homepage-match-homepage-header-menu">\
/* Top-level menu links: match homepage sizing/weight/color */\
#primary-menu > li > a,\
.main-navigation .menu > li > a,\
.main-navigation a {\
  color: #ffffff !important;\
  font-size: 13px !important;\
  font-weight: 600 !important;\
  line-height: 1.2 !important;\
  opacity: 0.92 !important;\
}\
#primary-menu > li > a:hover,\
.main-navigation .menu > li > a:hover,\
.main-navigation a:hover,\
#primary-menu > li.current-menu-item > a {\
  color: #ffffff !important;\
  opacity: 1 !important;\
}\
\
/* Dropdown panel: same look/feel as homepage */\
#primary-menu > li.menu-item-has-children > .sub-menu {\
  position: absolute !important;\
  left: 0 !important;\
  top: 100% !important;\
  min-width: 210px !important;\
  margin: 0 !important;\
  padding: 0 !important;\
  border-radius: 12px !important;\
  border: 1px solid rgba(255,255,255,0.12) !important;\
  background: #121b35 !important;\
  overflow: hidden !important;\
  display: block !important;\
  opacity: 0 !important;\
  visibility: hidden !important;\
  pointer-events: none !important;\
  transform: translateY(4px) !important;\
  transition: opacity .14s ease, transform .14s ease, visibility .14s ease !important;\
  z-index: 99999 !important;\
}\
#primary-menu > li.menu-item-has-children > .sub-menu > li > a {\
  color: #ffffff !important;\
  opacity: 0.9 !important;\
  font-size: 13px !important;\
  line-height: 1.2 !important;\
  display: block !important;\
  padding: 10px 12px !important;\
  border-bottom: 1px solid rgba(255,255,255,0.06) !important;\
}\
#primary-menu > li.menu-item-has-children > .sub-menu > li:last-child > a {\
  border-bottom: 0 !important;\
}\
#primary-menu > li.menu-item-has-children > .sub-menu > li > a:hover {\
  background: rgba(255,255,255,0.05) !important;\
}\
\
/* Open states aligned with homepage behavior */\
#primary-menu > li.menu-item-has-children:hover > .sub-menu,\
#primary-menu > li.menu-item-has-children:focus-within > .sub-menu,\
#primary-menu > li.menu-item-has-children.menu-item--toggled-on > .sub-menu,\
#primary-menu > li.menu-item-has-children.mhm-open > .sub-menu {\
  opacity: 1 !important;\
  visibility: visible !important;\
  pointer-events: auto !important;\
  transform: translateY(0) !important;\
}\
</style>';
}
add_action('wp_head', 'mhm_non_homepage_match_homepage_header_menu_css', 20100);

/**
 * Force logo href in rendered markup (server-side, reliable).
 */
function mhm_force_logo_link_to_homepage_markup($html) {
    if (is_admin()) {
        return $html;
    }
    return preg_replace(
        '/href="[^"]*"/',
        'href="https://blogmusthavemodscom.bigscoots-staging.com/homepage/"',
        $html,
        1
    );
}
add_filter('get_custom_logo', 'mhm_force_logo_link_to_homepage_markup', 200);

/**
 * Exact homepage nav metrics on non-homepage pages.
 */
function mhm_non_homepage_exact_homepage_nav_metrics_css() {
    if (is_admin() || is_page(25)) {
        return;
    }

    echo '<style id="mhm-non-homepage-exact-homepage-nav-metrics">\
#primary-menu > li > a,\
.main-navigation .menu > li > a {\
  font-size: 13px !important;\
  line-height: 13px !important;\
  padding-top: 0 !important;\
  padding-bottom: 0 !important;\
}\
#primary-menu > li.menu-item-has-children > .sub-menu {\
  top: 25px !important;\
  padding: 8px !important;\
}\
#primary-menu > li.menu-item-has-children::after {\
  top: 25px !important;\
  height: 12px !important;\
}\
</style>';
}
add_action('wp_head', 'mhm_non_homepage_exact_homepage_nav_metrics_css', 20200);

/**
 * Hard override: force non-homepage header menu metrics to match homepage.
 */
function mhm_non_homepage_header_menu_hard_parity_css() {
    if (is_admin() || is_page(25)) {
        return;
    }
    echo '<style id="mhm-non-homepage-header-menu-hard-parity">\
body:not(.page-id-25) #masthead #primary-menu > li > a,\
body:not(.page-id-25) #masthead .main-navigation .menu > li > a,\
body:not(.page-id-25) #masthead .main-navigation a {\
  font-size: 13px !important;\
  line-height: 13px !important;\
  font-weight: 600 !important;\
  padding-top: 0 !important;\
  padding-bottom: 0 !important;\
  color: #ffffff !important;\
  opacity: .92 !important;\
}\
body:not(.page-id-25) #masthead #primary-menu > li.menu-item-has-children > .sub-menu {\
  top: 25px !important;\
  padding: 8px !important;\
}\
body:not(.page-id-25) #masthead #primary-menu > li.menu-item-has-children::after {\
  top: 25px !important;\
  height: 12px !important;\
}\
</style>';
}
add_action('wp_footer', 'mhm_non_homepage_header_menu_hard_parity_css', 30000);

/**
 * Click-level fallback: logo always routes to /homepage on staging.
 */
function mhm_logo_click_homepage_fallback_js() {
    if (is_admin()) {
        return;
    }
    echo '<script id="mhm-logo-click-homepage-fallback-js" data-no-optimize="1" data-no-defer="1" data-no-minify="1">(function(){
      function wire(){
        var links = document.querySelectorAll("a.brand.has-logo-image, .site-branding a");
        links.forEach(function(link){
          link.setAttribute("href", "https://blogmusthavemodscom.bigscoots-staging.com/homepage/");
          if(link.dataset.mhmLogoBound === "1") return;
          link.dataset.mhmLogoBound = "1";
          link.addEventListener("click", function(e){
            e.preventDefault();
            window.location.href = "https://blogmusthavemodscom.bigscoots-staging.com/homepage/";
          });
        });
      }
      if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire); else wire();
      window.addEventListener("load", wire);
      setTimeout(wire, 800);
    })();</script>';
}
add_action('wp_footer', 'mhm_logo_click_homepage_fallback_js', 30010);

/**
 * Final non-homepage header parity (valid CSS block, highest priority).
 */
function mhm_non_homepage_header_menu_final_parity_css() {
    if (is_admin() || is_page(25)) {
        return;
    }

    echo '<style id="mhm-non-homepage-header-menu-final-parity">
body:not(.page-id-25) #masthead #primary-menu > li > a,
body:not(.page-id-25) #masthead .main-navigation .menu > li > a,
body:not(.page-id-25) #masthead .main-navigation a {
  font-size: 13px !important;
  line-height: 13px !important;
  font-weight: 600 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  color: #ffffff !important;
  opacity: .92 !important;
}
body:not(.page-id-25) #masthead #primary-menu > li.menu-item-has-children > .sub-menu {
  top: 100% !important;
  padding: 8px !important;
}
body:not(.page-id-25) #masthead #primary-menu > li.menu-item-has-children::after {
  top: 100% !important;
  height: 12px !important;
}
</style>';
}
add_action('wp_head', 'mhm_non_homepage_header_menu_final_parity_css', 50000);

/**
 * Global Games dropdown stability fix:
 * keep submenu open while moving cursor from parent item into dropdown.
 */
function mhm_games_dropdown_stability_global_css() {
    if (is_admin()) {
        return;
    }

    echo '<style id="mhm-games-dropdown-stability-global">\
#primary-menu > li.menu-item-has-children {\
  position: relative !important;\
  padding-bottom: 14px !important;\
  margin-bottom: -14px !important;\
}\
#primary-menu > li.menu-item-has-children::after {\
  content: "";\
  position: absolute;\
  left: 0;\
  right: 0;\
  top: 100%;\
  height: 14px;\
}\
#primary-menu > li.menu-item-has-children > .sub-menu {\
  top: calc(100% - 1px) !important;\
  margin-top: 0 !important;\
  transform: none !important;\
}\
#primary-menu > li.menu-item-has-children:hover > .sub-menu,\
#primary-menu > li.menu-item-has-children:focus-within > .sub-menu,\
#primary-menu > li.menu-item-has-children.menu-item--toggled-on > .sub-menu,\
#primary-menu > li.menu-item-has-children.mhm-open > .sub-menu,\
#primary-menu > li.menu-item-has-children > .sub-menu:hover {\
  opacity: 1 !important;\
  visibility: visible !important;\
  pointer-events: auto !important;\
  transform: none !important;\
}\
</style>';
}
add_action('wp_head', 'mhm_games_dropdown_stability_global_css', 60000);

/**
 * Global dropdown hover-intent controller with close delay.
 * Prevents submenu from collapsing during cursor travel.
 */
function mhm_games_dropdown_hover_intent_js() {
    if (is_admin()) {
        return;
    }

    echo <<<'JS'
<script id="mhm-games-dropdown-hover-intent-js" data-no-optimize="1" data-no-defer="1" data-no-minify="1">(function(){
  function bind(){
    var items = document.querySelectorAll("#primary-menu > li.menu-item-has-children");
    if(!items.length) return;

    items.forEach(function(li){
      if(li.dataset.mhmHoverIntentBound === "1") return;
      li.dataset.mhmHoverIntentBound = "1";

      var sub = li.querySelector(".sub-menu");
      var timer = null;

      function open(){
        if(timer){ clearTimeout(timer); timer = null; }
        li.classList.add("mhm-open");
        li.classList.add("menu-item--toggled-on");
      }

      function closeDelayed(){
        if(timer) clearTimeout(timer);
        timer = setTimeout(function(){
          li.classList.remove("mhm-open");
          li.classList.remove("menu-item--toggled-on");
        }, 1200);
      }

      li.addEventListener("mouseenter", open);
      li.addEventListener("mouseleave", closeDelayed);
      li.addEventListener("focusin", open);
      li.addEventListener("focusout", closeDelayed);

      if(sub){
        sub.addEventListener("mouseenter", open);
        sub.addEventListener("mouseleave", closeDelayed);
      }
    });
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind); else bind();
  window.addEventListener("load", function(){ setTimeout(bind, 500); });
})();</script>
JS;
}
add_action('wp_footer', 'mhm_games_dropdown_hover_intent_js', 61000);

/**
 * Final no-gap dropdown positioning across site.
 */
function mhm_games_dropdown_no_gap_position_css() {
    if (is_admin()) {
        return;
    }

    echo '<style id="mhm-games-dropdown-no-gap-position">\
#primary-menu > li.menu-item-has-children > .sub-menu {\
  top: 100% !important;\
  margin-top: 0 !important;\
  transform: none !important;\
}\
#primary-menu > li.menu-item-has-children::after {\
  top: 100% !important;\
  height: 16px !important;\
}\
</style>';
}
add_action('wp_head', 'mhm_games_dropdown_no_gap_position_css', 65000);

/**
 * Universal no-gap dropdown top alignment (includes homepage).
 */
function mhm_universal_dropdown_no_gap_top_css() {
    if (is_admin()) {
        return;
    }

    echo '<style id="mhm-universal-dropdown-no-gap-top">\
#masthead #primary-menu > li.menu-item-has-children > .sub-menu {\
  top: 100% !important;\
}\
#masthead #primary-menu > li.menu-item-has-children::after {\
  top: 100% !important;\
  height: 16px !important;\
}\
</style>';
}
add_action('wp_head', 'mhm_universal_dropdown_no_gap_top_css', 70000);

/**
 * Homepage explicit dropdown no-gap top override.
 */
function mhm_homepage_dropdown_no_gap_override_css() {
    if (!is_page(25)) {
        return;
    }

    echo '<style id="mhm-homepage-dropdown-no-gap-override">\
body.page-id-25 #primary-menu > li.menu-item-has-children > .sub-menu {\
  top: 100% !important;\
}\
body.page-id-25 #primary-menu > li.menu-item-has-children::after {\
  top: 100% !important;\
  height: 16px !important;\
}\
</style>';
}
add_action('wp_head', 'mhm_homepage_dropdown_no_gap_override_css', 71000);

/**
 * Final clean dropdown CSS (no escaped newlines) to prevent parser quirks.
 */
function mhm_dropdown_final_clean_css() {
    if (is_admin()) {
        return;
    }

    echo <<<'CSS'
<style id="mhm-dropdown-final-clean-css">
#primary-menu > li.menu-item-has-children {
  position: relative !important;
  padding-bottom: 14px !important;
  margin-bottom: -14px !important;
}
#primary-menu > li.menu-item-has-children::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 100% !important;
  height: 16px !important;
}
#primary-menu > li.menu-item-has-children > .sub-menu {
  top: 100% !important;
  margin-top: 0 !important;
  transform: none !important;
}
#primary-menu > li.menu-item-has-children:hover > .sub-menu,
#primary-menu > li.menu-item-has-children:focus-within > .sub-menu,
#primary-menu > li.menu-item-has-children.menu-item--toggled-on > .sub-menu,
#primary-menu > li.menu-item-has-children.mhm-open > .sub-menu,
#primary-menu > li.menu-item-has-children > .sub-menu:hover {
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
  transform: none !important;
}
</style>
CSS;
}
add_action('wp_head', 'mhm_dropdown_final_clean_css', 99999);

/**
 * Final archive/search centering parity for category and search results pages.
 */
function mhm_archive_search_centering_parity_css() {
    if (is_admin()) {
        return;
    }

    if (!(is_search() || is_category())) {
        return;
    }

    echo <<<'CSS'
<style id=mhm-archive-search-centering-parity-css>
body.search .content-container.site-container,
body.category .content-container.site-container {
  width: min(1360px, 100% - 48px) !important;
  max-width: 1360px !important;
  margin-left: auto !important;
  margin-right: auto !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
}

body.search #primary,
body.category #primary {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 auto !important;
  float: none !important;
}

body.search #archive-container,
body.category #archive-container,
body.search .kadence-posts-list,
body.category .kadence-posts-list {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 auto !important;
}

body.search .archive-title,
body.category .archive-title,
body.search .page-title,
body.category .page-title {
  text-align: center !important;
  margin: 0 0 1.75rem !important;
}

body.search #archive-container.kadence-posts-list.grid-cols,
body.category #archive-container.kadence-posts-list.grid-cols {
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 1.5rem !important;
}

@media (max-width: 1200px) {
  body.search #archive-container.kadence-posts-list.grid-cols,
  body.category #archive-container.kadence-posts-list.grid-cols {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }
}

@media (max-width: 900px) {
  body.search .content-container.site-container,
  body.category .content-container.site-container {
    width: min(1360px, 100% - 32px) !important;
  }

  body.search #archive-container.kadence-posts-list.grid-cols,
  body.category #archive-container.kadence-posts-list.grid-cols {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}

@media (max-width: 640px) {
  body.search .content-container.site-container,
  body.category .content-container.site-container {
    width: min(1360px, 100% - 24px) !important;
  }

  body.search #archive-container.kadence-posts-list.grid-cols,
  body.category #archive-container.kadence-posts-list.grid-cols {
    grid-template-columns: 1fr !important;
  }
}
</style>
CSS;
}
add_action('wp_head', 'mhm_archive_search_centering_parity_css', 100000);

/**
 * Remove archive sidebar constraint for category/search parity layout.
 */
function mhm_archive_search_remove_sidebar_constraint_css() {
    if (is_admin()) {
        return;
    }

    if (!(is_search() || is_category())) {
        return;
    }

    echo <<<'CSS'
<style id=mhm-archive-search-remove-sidebar-constraint-css>
body.search #secondary,
body.category #secondary,
body.search .primary-sidebar,
body.category .primary-sidebar,
body.search aside.widget-area,
body.category aside.widget-area {
  display: none !important;
}

body.search .content-container,
body.category .content-container {
  display: block !important;
  grid-template-columns: 1fr !important;
}

body.search #primary,
body.category #primary,
body.search #archive-container,
body.category #archive-container {
  width: 100% !important;
  max-width: 100% !important;
}
</style>
CSS;
}
add_action('wp_head', 'mhm_archive_search_remove_sidebar_constraint_css', 100001);

/**
 * Global blog width parity across listing templates.
 */
function mhm_global_blog_width_parity_css() {
    if (is_admin()) {
        return;
    }

    echo <<<'CSS'
<style id=mhm-global-blog-width-parity-css>
body.blog .content-container.site-container,
body.archive .content-container.site-container,
body.search .content-container.site-container,
body.home.blog .content-container.site-container {
  width: min(1360px, 100% - 48px) !important;
  max-width: 1360px !important;
  margin-left: auto !important;
  margin-right: auto !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
}

body.blog #primary,
body.archive #primary,
body.search #primary,
body.home.blog #primary {
  width: 100% !important;
  max-width: 100% !important;
  float: none !important;
  margin: 0 auto !important;
}

body.blog #secondary,
body.archive #secondary,
body.search #secondary,
body.home.blog #secondary,
body.blog .primary-sidebar,
body.archive .primary-sidebar,
body.search .primary-sidebar,
body.home.blog .primary-sidebar,
body.blog aside.widget-area,
body.archive aside.widget-area,
body.search aside.widget-area,
body.home.blog aside.widget-area {
  display: none !important;
}

body.blog .content-container,
body.archive .content-container,
body.search .content-container,
body.home.blog .content-container {
  display: block !important;
  grid-template-columns: 1fr !important;
}

body.blog #archive-container,
body.archive #archive-container,
body.search #archive-container,
body.home.blog #archive-container,
body.blog .kadence-posts-list,
body.archive .kadence-posts-list,
body.search .kadence-posts-list,
body.home.blog .kadence-posts-list {
  width: 100% !important;
  max-width: 100% !important;
  margin-left: auto !important;
  margin-right: auto !important;
}

@media (max-width: 900px) {
  body.blog .content-container.site-container,
  body.archive .content-container.site-container,
  body.search .content-container.site-container,
  body.home.blog .content-container.site-container {
    width: min(1360px, 100% - 32px) !important;
  }
}

@media (max-width: 640px) {
  body.blog .content-container.site-container,
  body.archive .content-container.site-container,
  body.search .content-container.site-container,
  body.home.blog .content-container.site-container {
    width: min(1360px, 100% - 24px) !important;
  }
}
</style>
CSS;
}
add_action('wp_head', 'mhm_global_blog_width_parity_css', 100002);

/**
 * Hard lock listing pages to homepage content width parity.
 */
function mhm_listing_width_match_homepage_exact_css() {
    if (is_admin()) {
        return;
    }

    if (!(is_home() || is_archive() || is_search() || is_category() || is_tag())) {
        return;
    }

    echo <<<'CSS'
<style id=mhm-listing-width-match-homepage-exact-css>
:root { --mhm-homepage-frame: 1280px; }

body.blog .content-container.site-container,
body.archive .content-container.site-container,
body.search .content-container.site-container,
body.home.blog .content-container.site-container {
  width: min(var(--mhm-homepage-frame), calc(100% - 48px)) !important;
  max-width: var(--mhm-homepage-frame) !important;
  margin-inline: auto !important;
  padding-inline: 0 !important;
}

body.blog #primary,
body.archive #primary,
body.search #primary,
body.home.blog #primary {
  width: 100% !important;
  max-width: 100% !important;
  margin-inline: auto !important;
  float: none !important;
}

body.blog #archive-container,
body.archive #archive-container,
body.search #archive-container,
body.home.blog #archive-container {
  width: 100% !important;
  max-width: 100% !important;
  margin-inline: auto !important;
}

@media (max-width: 900px) {
  body.blog .content-container.site-container,
  body.archive .content-container.site-container,
  body.search .content-container.site-container,
  body.home.blog .content-container.site-container {
    width: min(var(--mhm-homepage-frame), calc(100% - 32px)) !important;
  }
}

@media (max-width: 640px) {
  body.blog .content-container.site-container,
  body.archive .content-container.site-container,
  body.search .content-container.site-container,
  body.home.blog .content-container.site-container {
    width: min(var(--mhm-homepage-frame), calc(100% - 24px)) !important;
  }
}
</style>
CSS;
}
add_action('wp_head', 'mhm_listing_width_match_homepage_exact_css', 100003);

/**
 * Match single blog post layout width to homepage frame.
 */
function mhm_single_post_width_match_homepage_css() {
    if (is_admin()) {
        return;
    }

    if (!is_single()) {
        return;
    }

    echo <<<'CSS'
<style id=mhm-single-post-width-match-homepage-css>
:root { --mhm-homepage-frame: 1280px; }

body.single-post .content-container.site-container,
body.single .content-container.site-container {
  width: min(var(--mhm-homepage-frame), calc(100% - 48px)) !important;
  max-width: var(--mhm-homepage-frame) !important;
  margin-inline: auto !important;
  padding-inline: 0 !important;
}

body.single-post #primary,
body.single #primary,
body.single-post #main,
body.single #main,
body.single-post .site-main,
body.single .site-main,
body.single-post .content-area,
body.single .content-area {
  width: 100% !important;
  max-width: 100% !important;
  margin-inline: auto !important;
  float: none !important;
}

body.single-post #secondary,
body.single #secondary,
body.single-post .primary-sidebar,
body.single .primary-sidebar,
body.single-post aside.widget-area,
body.single aside.widget-area {
  display: none !important;
}

body.single-post article.entry,
body.single article.entry,
body.single-post .single-entry,
body.single .single-entry {
  max-width: 100% !important;
}

@media (max-width: 900px) {
  body.single-post .content-container.site-container,
  body.single .content-container.site-container {
    width: min(var(--mhm-homepage-frame), calc(100% - 32px)) !important;
  }
}

@media (max-width: 640px) {
  body.single-post .content-container.site-container,
  body.single .content-container.site-container {
    width: min(var(--mhm-homepage-frame), calc(100% - 24px)) !important;
  }
}
</style>
CSS;
}
add_action('wp_head', 'mhm_single_post_width_match_homepage_css', 100004);

/**
 * Widen single post reading column by removing Kadence 800px cap.
 */
function mhm_single_post_content_column_wider_css() {
    if (is_admin() || !is_single()) {
        return;
    }

    echo <<<'CSS'
<style id=mhm-single-post-content-column-wider-css>
body.single-post .single-content,
body.single .single-content,
body.single-post .entry-content,
body.single .entry-content {
  max-width: min(1120px, 100%) !important;
  width: min(1120px, 100%) !important;
  margin-left: auto !important;
  margin-right: auto !important;
}

@media (max-width: 900px) {
  body.single-post .single-content,
  body.single .single-content,
  body.single-post .entry-content,
  body.single .entry-content {
    max-width: 100% !important;
    width: 100% !important;
  }
}
</style>
CSS;
}
add_action('wp_head', 'mhm_single_post_content_column_wider_css', 100005);

/**
 * Homepage visual cleanup + hero glow parity with single-post aesthetic.
 */
function mhm_homepage_glow_consistency_css() {
    if (is_admin() || !is_page(25)) {
        return;
    }

    echo <<<'CSS'
<style id=mhm-homepage-glow-consistency-css>
:root {
  --mhm-home-bg: #050b1f;
  --mhm-home-surface: #070f2a;
  --mhm-home-border: rgba(120, 146, 255, 0.22);
  --mhm-home-glow-a: rgba(236, 72, 153, 0.30);
  --mhm-home-glow-b: rgba(124, 58, 237, 0.20);
}

body.page-id-25,
body.page-id-25 .site,
body.page-id-25 #inner-wrap,
body.page-id-25 .site-main,
body.page-id-25 .content-area,
body.page-id-25 .entry-content,
body.page-id-25 .entry-content-wrap {
  background: var(--mhm-home-bg) !important;
}

/* Remove conflicting block backgrounds/pseudo layers that create odd color bands. */
body.page-id-25 .entry-content .has-background,
body.page-id-25 .entry-content .wp-block-group.has-background,
body.page-id-25 .kb-row-layout-wrap.wp-block-kadence-rowlayout,
body.page-id-25 .wp-block-kadence-column,
body.page-id-25 .kadence-column {
  background: transparent !important;
  box-shadow: none !important;
}

body.page-id-25 .entry-content .has-background::before,
body.page-id-25 .entry-content .has-background::after,
body.page-id-25 .entry-content .wp-block-group.has-background::before,
body.page-id-25 .entry-content .wp-block-group.has-background::after {
  content: none !important;
  display: none !important;
}

/* Hero row frame + glow parity */
body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type,
body.page-id-25 .single-content > .kb-row-layout-wrap:first-of-type {
  position: relative !important;
  isolation: isolate !important;
  border: 1px solid var(--mhm-home-border) !important;
  border-radius: 24px !important;
  background: linear-gradient(180deg, rgba(14, 24, 58, 0.52) 0%, rgba(6, 12, 33, 0.25) 100%) !important;
  padding: clamp(20px, 2vw, 28px) !important;
  overflow: visible !important;
}

body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type::before,
body.page-id-25 .single-content > .kb-row-layout-wrap:first-of-type::before {
  content:  !important;
  position: absolute !important;
  inset: -40px !important;
  background:
    radial-gradient(50% 56% at 27% 48%, var(--mhm-home-glow-a) 0%, rgba(236,72,153,0) 100%),
    radial-gradient(40% 50% at 34% 54%, var(--mhm-home-glow-b) 0%, rgba(124,58,237,0) 100%) !important;
  filter: blur(18px) !important;
  z-index: 0 !important;
  pointer-events: none !important;
}

body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type > *,
body.page-id-25 .single-content > .kb-row-layout-wrap:first-of-type > * {
  position: relative !important;
  z-index: 1 !important;
}

body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type img,
body.page-id-25 .single-content > .kb-row-layout-wrap:first-of-type img {
  border-radius: 18px !important;
  box-shadow: 0 20px 60px -28px rgba(124, 58, 237, 0.55) !important;
}
</style>
CSS;
}
add_action('wp_head', 'mhm_homepage_glow_consistency_css', 100010);

/**
 * Final homepage background normalization to match blog page base.
 */
function mhm_homepage_background_match_blog_css() {
    if (is_admin() || !is_page(25)) {
        return;
    }

    echo <<<'CSS'
<style id=mhm-homepage-background-match-blog-css>
:root { --mhm-blog-bg: #0B0F19; }

/* One consistent page background */
body.page-id-25,
body.page-id-25 .site,
body.page-id-25 #wrapper,
body.page-id-25 #inner-wrap,
body.page-id-25 .site-content,
body.page-id-25 .content-area,
body.page-id-25 .site-main,
body.page-id-25 .content-wrap,
body.page-id-25 .entry-content,
body.page-id-25 .entry-content-wrap,
body.page-id-25 .content-container.site-container {
  background: var(--mhm-blog-bg) !important;
  background-image: none !important;
}

/* Remove all odd section/block background layers that create stripes/patches */
body.page-id-25 .kb-row-layout-wrap,
body.page-id-25 .kt-row-column-wrap,
body.page-id-25 .wp-block-kadence-rowlayout,
body.page-id-25 .wp-block-kadence-column,
body.page-id-25 .kadence-column,
body.page-id-25 .wp-block-group,
body.page-id-25 .has-background {
  background: transparent !important;
  background-image: none !important;
}

/* Kill pseudo glows/overlays from older rules */
body.page-id-25 .kb-row-layout-wrap::before,
body.page-id-25 .kb-row-layout-wrap::after,
body.page-id-25 .kt-row-column-wrap::before,
body.page-id-25 .kt-row-column-wrap::after,
body.page-id-25 .wp-block-group::before,
body.page-id-25 .wp-block-group::after,
body.page-id-25 .has-background::before,
body.page-id-25 .has-background::after {
  content: none !important;
  display: none !important;
}

/* Keep hero border but remove extra gray fill */
body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type,
body.page-id-25 .single-content > .kb-row-layout-wrap:first-of-type {
  background: transparent !important;
  border: 1px solid rgba(120, 146, 255, 0.20) !important;
  border-radius: 24px !important;
  box-shadow: none !important;
}
</style>
CSS;
}
add_action('wp_head', 'mhm_homepage_background_match_blog_css', 100020);

/**
 * Homepage full skin parity with game pages (/sims-4 style system).
 */
function mhm_homepage_match_gamepage_skin_css() {
    if (is_admin() || !is_page(25)) {
        return;
    }

    echo <<<'CSS'
<style id=mhm-homepage-match-gamepage-skin-css>
:root {
  --mhm-gh-bg: #050b1f;
  --mhm-gh-panel: #070f2a;
  --mhm-gh-border: rgba(120, 146, 255, 0.18);
  --mhm-gh-text: #eaf0ff;
  --mhm-gh-muted: #aebad6;
  --mhm-gh-glow-a: rgba(236, 72, 153, 0.22);
  --mhm-gh-glow-b: rgba(124, 58, 237, 0.18);
}

body.page-id-25,
body.page-id-25 .site,
body.page-id-25 #wrapper,
body.page-id-25 #inner-wrap,
body.page-id-25 .site-content,
body.page-id-25 .content-area,
body.page-id-25 .site-main,
body.page-id-25 .content-wrap,
body.page-id-25 .entry-content,
body.page-id-25 .entry-content-wrap,
body.page-id-25 .content-container.site-container {
  background: var(--mhm-gh-bg) !important;
  color: var(--mhm-gh-text) !important;
}

body.page-id-25 .content-container.site-container,
body.page-id-25 #main.site-main {
  width: min(1280px, calc(100% - 48px)) !important;
  max-width: 1280px !important;
  margin-inline: auto !important;
  padding-inline: 0 !important;
}

/* Normalize homepage rows to game-page surface language */
body.page-id-25 .entry-content > .kb-row-layout-wrap {
  background: transparent !important;
  margin-bottom: 36px !important;
}

body.page-id-25 .entry-content > .kb-row-layout-wrap > .kt-row-layout-inner-wrap > .kt-row-column-wrap,
body.page-id-25 .entry-content > .kb-row-layout-wrap > .kt-row-column-wrap,
body.page-id-25 .entry-content > .kb-row-layout-wrap .kt-row-column-wrap:first-child {
  background: var(--mhm-gh-panel) !important;
  border: 1px solid var(--mhm-gh-border) !important;
  border-radius: 20px !important;
}

/* Kill conflicting pseudo overlays/section color patches */
body.page-id-25 .entry-content .kb-row-layout-wrap::before,
body.page-id-25 .entry-content .kb-row-layout-wrap::after,
body.page-id-25 .entry-content .kt-row-column-wrap::before,
body.page-id-25 .entry-content .kt-row-column-wrap::after,
body.page-id-25 .entry-content .has-background::before,
body.page-id-25 .entry-content .has-background::after,
body.page-id-25 .entry-content .wp-block-group::before,
body.page-id-25 .entry-content .wp-block-group::after {
  content: none !important;
  display: none !important;
}

body.page-id-25 .entry-content .has-background,
body.page-id-25 .entry-content .wp-block-group.has-background,
body.page-id-25 .entry-content .wp-block-kadence-rowlayout,
body.page-id-25 .entry-content .wp-block-kadence-column,
body.page-id-25 .entry-content .kadence-column {
  background: transparent !important;
  background-image: none !important;
}

/* Hero row glow parity */
body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type {
  position: relative !important;
  isolation: isolate !important;
}
body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type::before {
  content:  !important;
  position: absolute !important;
  inset: -34px !important;
  background:
    radial-gradient(45% 52% at 28% 48%, var(--mhm-gh-glow-a) 0%, rgba(236,72,153,0) 100%),
    radial-gradient(36% 44% at 33% 55%, var(--mhm-gh-glow-b) 0%, rgba(124,58,237,0) 100%) !important;
  filter: blur(18px) !important;
  z-index: 0 !important;
  pointer-events: none !important;
}
body.page-id-25 .entry-content > .kb-row-layout-wrap:first-of-type > * {
  position: relative !important;
  z-index: 1 !important;
}

body.page-id-25 .entry-content h1,
body.page-id-25 .entry-content h2,
body.page-id-25 .entry-content h3 {
  color: var(--mhm-gh-text) !important;
}
body.page-id-25 .entry-content p {
  color: var(--mhm-gh-muted) !important;
}

@media (max-width: 900px) {
  body.page-id-25 .content-container.site-container,
  body.page-id-25 #main.site-main {
    width: min(1280px, calc(100% - 32px)) !important;
  }
}

@media (max-width: 640px) {
  body.page-id-25 .content-container.site-container,
  body.page-id-25 #main.site-main {
    width: min(1280px, calc(100% - 24px)) !important;
  }
}
</style>
CSS;
}
add_action('wp_head', 'mhm_homepage_match_gamepage_skin_css', 100030);
