<?php
  // Enqueue Parent and Child Theme Styles
  function kadence_child_enqueue_styles() {
      wp_enqueue_style( 'kadence-parent-style', get_template_directory_uri() . '/style.css' );
      wp_enqueue_style( 'kadence-child-style', get_stylesheet_uri(), array('kadence-parent-style') );
  }
  add_action( 'wp_enqueue_scripts', 'kadence_child_enqueue_styles' );

  /**
   * 301 redirects for consolidated duplicate content (SEO Phase 2)
   * Redirect secondary/duplicate slugs to the canonical primary slug.
   * These posts had duplicate content due to writer creating new posts
   * instead of updating originals. Content has been merged into the primary.
   */
  function mhm_seo_301_redirects() {
      if ( is_admin() ) return;

      $redirects = array(
          '/sims-4-cc-clothes-packs-2025/' => '/sims-4-cc-clothes-packs/',
          '/sims-4-body-presets-2/'        => '/sims-4-body-presets/',
          '/sims-4-goth-cc-2/'             => '/sims-4-goth-cc/',
          '/sims-4-cc-2/'                  => '/sims-4-cc/',
          '/sims-4-eyelashes-cc-2/'        => '/sims-4-eyelashes-cc/',
          '/15-must-have-sims-4-woohoo-mods-for-2025/' => '/best-woohoo-mods-sims-4-ultimate-guide/',
      );

      $path = $_SERVER['REQUEST_URI'];
      // Normalize: strip query string for matching
      $clean_path = strtok($path, '?');
      // Ensure trailing slash for matching
      if (substr($clean_path, -1) !== '/') {
          $clean_path .= '/';
      }

      if ( isset($redirects[$clean_path]) ) {
          $target = $redirects[$clean_path];
          // If accessed via Vercel rewrite, redirect to apex domain
          if ( function_exists('is_from_apex_rewrite') && is_from_apex_rewrite() ) {
              $target = 'https://musthavemods.com' . $target;
          } else {
              $target = home_url($target);
          }
          header("HTTP/1.1 301 Moved Permanently");
          header("Location: " . $target);
          exit;
      }
  }
  add_action( 'template_redirect', 'mhm_seo_301_redirects', 1 );

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
            'hero_image' => 'https://blog.musthavemods.com/wp-content/uploads/2026/02/Sims-4.jpg',
            'icon'    => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="3"/><circle cx="8" cy="12" r="2"/><line x1="14" y1="10" x2="14" y2="14"/><line x1="12" y1="12" x2="16" y2="12"/><circle cx="19" cy="9" r="0.5" fill="currentColor"/><circle cx="19" cy="15" r="0.5" fill="currentColor"/></svg>',
        ),
        'stardew-valley' => array(
            'title'   => 'Best Stardew Valley Mods &amp; Guides',
            'tagline' => 'Find the best mods, guides, and farm inspiration for Stardew Valley.',
            'accent'  => '#22c55e',
            'badge'   => 'New Game',
            'search'  => 'Search Stardew Valley mods &amp; guides...',
            'hero_image' => 'https://blog.musthavemods.com/wp-content/uploads/2026/02/Stardew-Valley.jpg',
            'icon'    => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v8l-3-3"/><path d="M12 10l3-3"/><path d="M8 22c-1.5-2-3-4-3-7a7 7 0 0114 0c0 3-1.5 5-3 7"/><path d="M9 18c0-1.5 1.5-3 3-3s3 1.5 3 3"/></svg>',
        ),
        'minecraft' => array(
            'title'   => 'Best Minecraft Mods &amp; Builds',
            'tagline' => 'Explore top mods, builds, resource packs, and guides for Minecraft.',
            'accent'  => '#8b5cf6',
            'badge'   => 'New Game',
            'search'  => 'Search Minecraft mods, builds &amp; packs...',
            'hero_image' => 'https://blog.musthavemods.com/wp-content/uploads/2026/02/Minecraft.jpg',
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

        <!-- Game pills and search bar removed -->

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
                    <a href="https://www.patreon.com/cw/MustHaveModsOfficial" class="mhm-gh-cta mhm-gh-patreon-btn" target="_blank" rel="noopener">Join Patreon</a>
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
    /* Header/nav styles are in mhm_header_nav_clean_css() */
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
    body.single .entry-content{max-width:min(1120px,100%)!important;margin:0 auto!important;font-size:1.125rem!important;line-height:1.8!important}
    body.single .entry-header{max-width:min(1120px,100%)!important;margin:0 auto 2rem!important;padding:0 1rem!important}
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
/* Force ALL Kadence inner columns dark on homepage */
.page-id-25 .kt-inside-inner-col {
    background: transparent !important;
}
/* Remove top gap between header and first content row */
.page-id-25 .entry-content-wrap {
    padding-top: 0 !important;
    margin-top: 0 !important;
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

    /* ── Global mobile: prevent horizontal scroll on ALL pages ── */
    /* Note: Kadence/plugins set body { overflow: visible !important } inline via JS,
       so we must rely on html overflow-x:hidden to clip, plus width constraints. */
    @media (max-width: 768px) {
        html {
            overflow-x: hidden !important;
            max-width: 100vw !important;
        }
        body {
            overflow-x: hidden !important;
            max-width: 100vw !important;
            width: 100% !important;
        }
        img {
            max-width: 100% !important;
            height: auto !important;
        }
        .entry-content,
        .entry-content-wrap,
        .site-container,
        .site-inner-wrap,
        .kb-row-layout-wrap,
        .kt-row-column-wrap {
            max-width: 100vw !important;
            overflow-x: hidden !important;
        }
        /* Related posts carousel — .alignwide overflows on mobile */
        .entry-related-inner-content,
        .entry-related-inner-content.alignwide,
        .alignwide,
        .splide,
        .splide__track {
            max-width: 100vw !important;
            overflow: hidden !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
        }
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
 * Replace Kadence logo with MHM Blog logo
 * NOTE: Logo is now handled by mhm_header_nav_clean_css() — this function
 * is intentionally empty to prevent stale CSS from conflicting.
 */
function mhm_replace_logo_css() {
    // Moved to mhm_header_nav_clean_css() for consolidation
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
    echo '<script id="mhm-mediavine-fix">
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
  background: #0B0F19 !important;
}

/* Similar posts section - eliminate side panels */
body.single-post .entry-related.alignfull,
body.single-post .entry-related,
body.single-post .entry-related-inner,
body.single-post .entry-related-inner.content-container.site-container,
body.single-post .entry-related-inner-content.alignwide,
body.single-post .entry-related-inner-content {
  background: #0B0F19 !important;
  background-color: #0B0F19 !important;
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

/* Footer styling moved to mhm_global_footer_css() for consistency across all pages */
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
body.single .entry-content,
body.single-post .entry-header,
body.single .entry-header {
  max-width: min(1120px, 100%) !important;
  width: min(1120px, 100%) !important;
  margin-left: auto !important;
  margin-right: auto !important;
}

@media (max-width: 900px) {
  body.single-post .single-content,
  body.single .single-content,
  body.single-post .entry-content,
  body.single .entry-content,
  body.single-post .entry-header,
  body.single .entry-header {
    max-width: 100% !important;
    width: 100% !important;
  }
}
</style>
CSS;
}
add_action('wp_head', 'mhm_single_post_content_column_wider_css', 100005);


/**
 * ============================================================
 *  HEADER / NAV — Clean build matching reference React app
 *  Glassmorphic floating bar, uppercase menu, glass dropdowns,
 *  glass search pill, solid pink CTA. NO gradients.
 * ============================================================
 */
function mhm_header_nav_clean_css() {
    echo <<<'ENDCSS'
<style id="mhm-header-nav-clean">
/* ── Reset: wipe Kadence header defaults ── */
#masthead,
#masthead *,
#mobile-header,
#mobile-header * {
  box-sizing: border-box !important;
}

/* ── Outer masthead: transparent shell with spacing for float effect ── */
#masthead {
  background: transparent !important;
  border: 0 !important;
  border-bottom: 0 !important;
  box-shadow: none !important;
  padding: 16px 24px 0 24px !important;
  position: sticky !important;
  top: 0 !important;
  z-index: 9999 !important;
}

/* Kill secondary/bottom header rows (NOT upper-wrap — it holds the nav) */
.site-bottom-header-wrap,
.site-above-header-wrap {
  display: none !important;
}

/* Ensure upper-wrap and inner-wrap are visible and transparent */
#masthead .site-header-upper-wrap,
#masthead .site-header-upper-inner-wrap,
#masthead .site-header-inner-wrap,
#masthead .site-header-wrap {
  display: block !important;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  padding: 0 !important;
  margin: 0 !important;
  overflow: visible !important;
}

/* Row container: transparent pass-through */
#masthead .site-header-row-container-inner,
.site-main-header-wrap .site-header-row-container-inner,
.site-top-header-wrap .site-header-row-container-inner {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  max-width: 1800px !important;
  margin: 0 auto !important;
  padding: 0 !important;
}

/* ── The header bar — flat, no glass ── */
#masthead .site-main-header-inner-wrap {
  background: transparent !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
  border: none !important;
  border-radius: 0 !important;
  height: 56px !important;
  min-height: 56px !important;
  max-height: 56px !important;
  padding: 0 24px !important;
  margin: 0 !important;
  box-shadow: none !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  flex-wrap: nowrap !important;
  overflow: visible !important;
}

/* Header row inside the inner-wrap */
#masthead .site-header-row {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  width: 100% !important;
  height: 100% !important;
  flex-wrap: nowrap !important;
}

/* Full-width site container */
#masthead .site-container {
  max-width: 100% !important;
  width: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
}

/* ── Left section: logo ── */
#masthead .site-header-main-section-left {
  display: flex !important;
  align-items: center !important;
  flex-shrink: 0 !important;
  gap: 32px !important;
}

/* Logo — hide busy PNG, show clean text wordmark */
#masthead .site-branding .brand img,
#masthead .custom-logo {
  display: none !important;
}

#masthead .site-branding a.brand {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  text-decoration: none !important;
  white-space: nowrap !important;
}

/* Hide CSS pseudo-elements — JS handles the logo now */
#masthead .site-branding a.brand::before {
  display: none !important;
  content: none !important;
}
#masthead .site-branding a.brand::after {
  display: none !important;
  content: none !important;
}

/* ── Center section: navigation ── */
#masthead .site-header-main-section-center {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex: 1 1 auto !important;
  min-width: 0 !important;
  overflow: visible !important;
}

/* Nav wrapper — stretch to fill center, allow centering */
#masthead .main-navigation,
#masthead .header-navigation,
#masthead .header-menu-container,
#masthead .primary-menu-container {
  overflow: visible !important;
  width: 100% !important;
  flex: 1 1 auto !important;
}
#masthead .header-navigation-layout-stretch-true {
  width: 100% !important;
}
#masthead #site-navigation {
  width: 100% !important;
}

/* Menu list — centered within header */
#masthead #primary-menu {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 28px !important;
  flex-wrap: nowrap !important;
  list-style: none !important;
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
}

/* Hide "ModVault" (6th) only — shifted by 1 because HOME is prepended */
#masthead #primary-menu > li:nth-child(6) {
  display: none !important;
}

/* Menu items */
#masthead #primary-menu > li {
  margin: 0 !important;
  padding: 0 !important;
  position: relative !important;
  overflow: visible !important;
}

#masthead #primary-menu > li > a {
  color: #94a3b8 !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  line-height: 56px !important;
  padding: 0 !important;
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  min-height: auto !important;
  white-space: nowrap !important;
  transition: color 0.2s ease !important;
  text-decoration: none !important;
}

#masthead #primary-menu > li > a:hover {
  color: #ffffff !important;
  background: transparent !important;
}

#masthead #primary-menu > li.current-menu-item > a,
#masthead #primary-menu > li.current_page_item > a {
  color: #ec4899 !important;
}

/* Hide Kadence dropdown toggle arrow button */
#masthead #primary-menu > li > .dropdown-nav-special-toggle,
#masthead #primary-menu > li > a .dropdown-nav-toggle {
  display: none !important;
}

/* Wrap text for the "Games" link — strip "Expand" appended text */
#masthead #primary-menu > li > a .nav-drop-title-wrap {
  display: inline !important;
}

/* ── Dropdown menus ── */
/* Invisible hover bridge */
#masthead #primary-menu > li.menu-item-has-children::after {
  content: "" !important;
  position: absolute !important;
  left: -10px !important;
  right: -10px !important;
  top: 100% !important;
  height: 8px !important;
  background: transparent !important;
}

/* Sub-menu container — use display:none to defeat Kadence animation-none overrides */
#masthead #primary-menu > li.menu-item-has-children > .sub-menu,
.header-navigation-dropdown-animation-none #primary-menu > li > .sub-menu {
  display: none !important;
  position: absolute !important;
  top: calc(100% + 4px) !important;
  left: -12px !important;
  min-width: 200px !important;
  padding: 8px !important;
  border-radius: 12px !important;
  border: 1px solid rgba(255, 255, 255, 0.10) !important;
  background: rgba(15, 20, 35, 0.92) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
  backdrop-filter: blur(24px) saturate(180%) !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
  z-index: 99999 !important;
  list-style: none !important;
  margin: 0 !important;
}

/* Show dropdown on hover */
#masthead #primary-menu > li.menu-item-has-children:hover > .sub-menu {
  display: block !important;
}

/* Dropdown items */
#masthead #primary-menu .sub-menu > li {
  margin: 0 !important;
  padding: 0 !important;
  list-style: none !important;
}

#masthead #primary-menu .sub-menu > li > a {
  display: block !important;
  color: #94a3b8 !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  line-height: 1.3 !important;
  padding: 10px 16px !important;
  border-radius: 8px !important;
  border: 0 !important;
  background: transparent !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  white-space: nowrap !important;
  transition: color 0.15s ease, background 0.15s ease !important;
  text-decoration: none !important;
}

#masthead #primary-menu .sub-menu > li > a:hover {
  color: #ffffff !important;
  background: rgba(236, 72, 153, 0.10) !important;
}

/* ── Right section: search + CTA ── */
#masthead .site-header-main-section-right {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  flex-shrink: 0 !important;
  padding: 0 !important;
}

/* Kill pseudo-elements from old CSS */
#masthead .site-header-main-section-right::before,
#masthead .site-header-main-section-right::after {
  content: none !important;
  display: none !important;
}

/* Ordering: search icon, then CTA button */
#masthead .site-header-item[data-section="kadence_customizer_header_search"] { order: 1 !important; }
#masthead .site-header-item[data-section="kadence_customizer_header_button"] { order: 2 !important; }

/* Gap between right items */
#masthead .site-header-section-right {
  gap: 12px !important;
}

/* ── Search: simple magnifying glass icon ── */
#masthead .site-header-item[data-section="kadence_customizer_header_search"] {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: auto !important;
  height: auto !important;
  border-radius: 0 !important;
  border: none !important;
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  padding: 0 !important;
  margin: 0 !important;
  position: relative !important;
  overflow: visible !important;
  box-shadow: none !important;
  cursor: pointer !important;
}

/* Search toggle container */
#masthead .site-header-item[data-section="kadence_customizer_header_search"] .search-toggle-open-container {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  position: relative !important;
  width: auto !important;
  height: auto !important;
}

/* Search button — show as icon */
#masthead .site-header-item[data-section="kadence_customizer_header_search"] .search-toggle-open {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  position: relative !important;
  width: 40px !important;
  height: 40px !important;
  opacity: 1 !important;
  cursor: pointer !important;
  border: 0 !important;
  background: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
  border-radius: 8px !important;
  transition: background 0.2s ease !important;
}
#masthead .site-header-item[data-section="kadence_customizer_header_search"] .search-toggle-open:hover {
  background: rgba(255,255,255,0.08) !important;
}

/* Show Kadence's native SVG magnifying glass */
#masthead .site-header-item[data-section="kadence_customizer_header_search"] .search-toggle-icon {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
#masthead .site-header-item[data-section="kadence_customizer_header_search"] svg {
  display: block !important;
  width: 18px !important;
  height: 18px !important;
  fill: none !important;
  stroke: #94a3b8 !important;
  stroke-width: 2 !important;
}
#masthead .site-header-item[data-section="kadence_customizer_header_search"] .kadence-svg-iconset {
  display: flex !important;
  line-height: 1 !important;
}

/* Nuke pseudo-elements (no fake search pill) */
#masthead .site-header-item[data-section="kadence_customizer_header_search"]::before,
#masthead .site-header-item[data-section="kadence_customizer_header_search"]::after,
#masthead .site-header-item[data-section="kadence_customizer_header_search"] .search-toggle-open-container::before,
#masthead .site-header-item[data-section="kadence_customizer_header_search"] .search-toggle-open-container::after,
#masthead .site-header-item[data-section="kadence_customizer_header_search"] .search-toggle-open::before,
#masthead .site-header-item[data-section="kadence_customizer_header_search"] .search-toggle-open::after {
  content: none !important;
  display: none !important;
}

/* ── CTA button: solid pink pill ── */
#masthead .header-button,
#masthead .header-button.button-style-filled {
  background: #ec4899 !important;
  border: 0 !important;
  border-radius: 9999px !important;
  padding: 12px 32px !important;
  color: #ffffff !important;
  font-size: 13px !important;
  font-weight: 900 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.1em !important;
  line-height: 1 !important;
  box-shadow: 0 10px 15px -3px rgba(236, 72, 153, 0.4) !important;
  transition: background 0.2s ease, transform 0.15s ease !important;
  white-space: nowrap !important;
  text-decoration: none !important;
}

#masthead .header-button:hover {
  background: #db2777 !important;
  transform: scale(1.05) !important;
}

/* ── Search drawer/modal (popup when clicking search pill) ── */
#search-drawer,
.header-search-modal,
.kadence-search-modal {
  background: rgba(11, 15, 25, 0.97) !important;
  -webkit-backdrop-filter: blur(24px) !important;
  backdrop-filter: blur(24px) !important;
}

#search-drawer .drawer-header {
  background: transparent !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
}

.header-search-modal input[type="search"],
#search-drawer input[type="search"],
.kadence-search-modal input[type="search"] {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 12px !important;
  color: #f1f5f9 !important;
  padding: 16px 24px !important;
  font-size: 16px !important;
}

/* ── Mobile header ── */
#mobile-header {
  background: transparent !important;
  border: 0 !important;
  padding: 12px 16px 0 !important;
}

#mobile-header .site-header-row-container-inner {
  background: transparent !important;
  border: 0 !important;
}

#mobile-header .site-main-header-inner-wrap {
  background: rgba(255, 255, 255, 0.05) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
  backdrop-filter: blur(24px) saturate(180%) !important;
  border: 1px solid rgba(255, 255, 255, 0.10) !important;
  border-radius: 14px !important;
  height: 60px !important;
  min-height: 60px !important;
  padding: 0 16px !important;
}

#mobile-header .header-button {
  background: #ec4899 !important;
  border: 0 !important;
  border-radius: 9999px !important;
  box-shadow: 0 10px 15px -3px rgba(236, 72, 153, 0.4) !important;
  font-weight: 900 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.1em !important;
}

/* Mobile toggle */
.menu-toggle-open,
.mobile-toggle-open {
  color: #94a3b8 !important;
  background: transparent !important;
}

.menu-toggle-open:hover,
.mobile-toggle-open:hover {
  color: #ffffff !important;
}

/* ── Mobile Drawer — Complete Restyle ───────────────────── */

/* Drawer panel background */
.popup-drawer.show-drawer,
.popup-drawer .drawer-inner,
.popup-drawer .drawer-content {
  background: #0B0F19 !important;
}

/* Close button — top-right circle */
.popup-drawer .drawer-header {
  background: transparent !important;
  padding: 16px 16px 8px !important;
  display: flex !important;
  justify-content: flex-end !important;
}
.popup-drawer .menu-toggle-close {
  background: rgba(255,255,255,0.08) !important;
  color: #f1f5f9 !important;
  border: 1px solid rgba(255,255,255,0.1) !important;
  border-radius: 50% !important;
  width: 40px !important;
  height: 40px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  transition: background 0.2s !important;
}
.popup-drawer .menu-toggle-close:hover {
  background: rgba(236,72,153,0.2) !important;
}

/* Navigation list reset */
.popup-drawer .mobile-navigation ul {
  list-style: none !important;
  margin: 0 !important;
  padding: 0 16px !important;
}
.popup-drawer .mobile-navigation ul li {
  border-bottom: 1px solid rgba(255,255,255,0.06) !important;
  position: relative !important;
}
.popup-drawer .mobile-navigation ul li:last-child {
  border-bottom: none !important;
}

/* Top-level menu links */
.popup-drawer .mobile-navigation ul li > a,
.mobile-navigation ul li a {
  color: #f1f5f9 !important;
  background: transparent !important;
  font-family: 'Outfit', 'Inter', sans-serif !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.08em !important;
  padding: 16px 0 !important;
  display: block !important;
  transition: color 0.2s !important;
  text-decoration: none !important;
}
.popup-drawer .mobile-navigation ul li > a:hover,
.mobile-navigation ul li a:hover {
  color: #ec4899 !important;
}

/* Kill the purple Kadence dropdown wrapper background */
.popup-drawer .drawer-nav-drop-wrap {
  background: transparent !important;
}

/* Sub-menu container */
.popup-drawer .mobile-navigation .sub-menu {
  padding: 0 0 8px 0 !important;
  margin: 0 !important;
  background: transparent !important;
}
.popup-drawer .mobile-navigation .sub-menu li {
  border-bottom: none !important;
}
.popup-drawer .mobile-navigation .sub-menu li a {
  color: #94a3b8 !important;
  background: transparent !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  padding: 10px 0 10px 16px !important;
  border-left: 2px solid rgba(255,255,255,0.06) !important;
  margin-left: 4px !important;
  letter-spacing: 0.06em !important;
}
.popup-drawer .mobile-navigation .sub-menu li a:hover {
  color: #ec4899 !important;
  border-left-color: #ec4899 !important;
}

/* Dropdown toggle chevron button */
.popup-drawer .drawer-sub-toggle {
  background: rgba(255,255,255,0.06) !important;
  color: #94a3b8 !important;
  border: none !important;
  border-radius: 8px !important;
  width: 36px !important;
  height: 36px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  position: absolute !important;
  right: 0 !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  transition: background 0.2s, color 0.2s !important;
  padding: 0 !important;
}
.popup-drawer .drawer-sub-toggle:hover {
  background: rgba(236,72,153,0.15) !important;
  color: #ec4899 !important;
}

/* Drawer extra content (CTA banner, search, etc.) */
.popup-drawer .drawer-content .widget-area {
  padding: 0 16px !important;
}
.popup-drawer .drawer-content .widget-area a {
  background: transparent !important;
}

/* "Best Sims 4 Laptops" banner in drawer */
.popup-drawer .mhm-affiliate-banner-top,
.popup-drawer .widget-area .wp-block-button__link {
  background: rgba(236,72,153,0.15) !important;
  color: #ec4899 !important;
  border: 1px solid rgba(236,72,153,0.3) !important;
  border-radius: 9999px !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.06em !important;
  padding: 10px 20px !important;
  display: inline-block !important;
  margin: 8px 16px 12px !important;
}

/* ── Responsive ── */
@media (max-width: 1200px) {
  #masthead .site-header-item[data-section="kadence_customizer_header_search"] {
    width: 200px !important;
  }
  #masthead #primary-menu {
    gap: 20px !important;
  }
}

@media (max-width: 960px) {
  #masthead .site-header-item[data-section="kadence_customizer_header_search"] {
    display: none !important;
  }
}

@media (max-width: 768px) {
  /* ── MOBILE: Hide only the DESKTOP header wrapper ── */
  #masthead > .site-header-wrap,
  #main-header {
    display: none !important;
  }
  /* Ensure Kadence mobile header is visible and dark-styled */
  .site-mobile-header-wrap {
    display: block !important;
    background: #0B0F19 !important;
    padding: 8px 16px !important;
  }
  /* Make sure the mobile header's inner row is visible (was getting hidden by the old broad selector) */
  .site-mobile-header-wrap .site-main-header-wrap {
    display: block !important;
  }
  .site-mobile-header-wrap .site-header-row-container-inner {
    background: #0B0F19 !important;
  }
  /* Mobile header inner — dark pill style */
  .site-mobile-header-wrap .site-header-inner-wrap,
  .site-mobile-header-wrap .site-main-header-inner-wrap {
    background: rgba(255,255,255,0.05) !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    border-radius: 16px !important;
    padding: 8px 16px !important;
  }
  /* Mobile hamburger + toggle button */
  .mobile-toggle-open-container .menu-toggle-btn,
  .mobile-toggle-open .menu-toggle-style-default {
    color: #f1f5f9 !important;
    background: transparent !important;
  }
  /* Mobile branding — dark theme */
  .site-mobile-header-wrap .site-branding {
    background: transparent !important;
  }
  .site-mobile-header-wrap .site-branding a,
  .site-mobile-header-wrap .site-title a {
    color: #f1f5f9 !important;
    font-weight: 900 !important;
  }
  /* Mobile Patreon button — smaller */
  .site-mobile-header-wrap .header-button,
  .site-mobile-header-wrap .mobile-header-button-wrap a {
    background: #ec4899 !important;
    color: #fff !important;
    border: none !important;
    border-radius: 9999px !important;
    padding: 8px 16px !important;
    font-size: 10px !important;
    font-weight: 800 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.08em !important;
  }
  /* (Mobile drawer CSS moved to global scope above for higher specificity) */
}
</style>
ENDCSS;
}
add_action('wp_head', 'mhm_header_nav_clean_css', 99999);


/**
 * Add HOME link as first item in the primary navigation menu.
 * Uses JS to prepend since Kadence header builder bypasses standard wp_nav_menu filters.
 */
function mhm_add_home_menu_item_js() {
    echo '<script id="mhm-home-link">
document.addEventListener("DOMContentLoaded", function() {
    var menu = document.getElementById("primary-menu");
    if (menu && !menu.querySelector(".mhm-home-link")) {
        var li = document.createElement("li");
        li.className = "menu-item mhm-home-link";
        var a = document.createElement("a");
        a.href = "https://musthavemods.com/blog/";
        a.textContent = "HOME";
        li.appendChild(a);
        menu.insertBefore(li, menu.firstChild);
    }
});
</script>';
}
add_action('wp_footer', 'mhm_add_home_menu_item_js');


/**
 * Games dropdown: click fallback for touch devices.
 */
function mhm_games_dropdown_click_js() {
    echo '<script id="mhm-games-dropdown">
document.addEventListener("DOMContentLoaded", function() {
  var items = document.querySelectorAll("#primary-menu > li.menu-item-has-children");
  items.forEach(function(li) {
    var link = li.querySelector(":scope > a");
    if (link && link.getAttribute("href") === "#") {
      link.addEventListener("click", function(e) {
        e.preventDefault();
        li.classList.toggle("menu-item--toggled-on");
      });
    }
    // Close when clicking outside
    document.addEventListener("click", function(e) {
      if (!li.contains(e.target)) {
        li.classList.remove("menu-item--toggled-on");
      }
    });
  });
});
</script>';
}
add_action('wp_footer', 'mhm_games_dropdown_click_js', 100);


/* ========================================================================
 * HOMEPAGE BODY RESTYLE (page-id-25)
 * Matches the newapp reference design: large Outfit typography, glass cards,
 * rounded blog images, category overlays, stats strip, featured CC overlay.
 * ======================================================================== */

/**
 * 1. Load Outfit + Inter fonts (all pages — needed for header wordmark)
 */
function mhm_homepage_fonts() {
    echo '<link rel="preconnect" href="https://fonts.googleapis.com">';
    echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
    echo '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@700;800;900&display=swap" rel="stylesheet">';
}
add_action( 'wp_head', 'mhm_homepage_fonts', 5 );


/**
 * 2. Full body CSS overhaul for homepage
 */
function mhm_homepage_body_css() {
    if ( ! is_page( 25 ) ) return;
    echo <<<'HOMECSS'
<style id="mhm-homepage-body-css">
/* ── Global homepage overrides ───────────────────────────── */
.page-id-25 .entry-content {
    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif !important;
}

/* ── HERO ROW ────────────────────────────────────────────── */
/* Swap column order: text left, image right */
.page-id-25 .kb-row-layout-id25_31c866-74 > .kt-row-column-wrap {
    display: flex !important;
    flex-direction: row-reverse !important;
    align-items: center !important;
    gap: 4rem !important;
    max-width: 1400px !important;
    margin: 0 auto !important;
    padding: 1.5rem 2rem 4rem !important;
}

/* Hero text column */
.page-id-25 .kadence-column25_612d1b-e2 {
    flex: 1.2 !important;
    max-width: none !important;
    padding-left: 0 !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
}

/* Hero image column — slightly bigger than original 500px */
.page-id-25 .kadence-column25_ee1f96-74 {
    flex: 1 !important;
    max-width: none !important;
}

/* ── Hero badge (injected via JS) ────────────────────────── */
.mhm-hero-badge {
    display: inline-flex !important;
    align-items: center !important;
    gap: 0.5rem !important;
    padding: 0.375rem 1rem !important;
    border-radius: 9999px !important;
    background: rgba(236, 72, 153, 0.1) !important;
    border: 1px solid rgba(236, 72, 153, 0.2) !important;
    color: #ec4899 !important;
    font-size: 0.65rem !important;
    font-weight: 900 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.2em !important;
    margin-bottom: 2rem !important;
    font-family: 'Inter', sans-serif !important;
}
.mhm-hero-badge svg {
    width: 14px !important;
    height: 14px !important;
}

/* ── Hero H1 ─────────────────────────────────────────────── */
.page-id-25 .kt-adv-heading25_840e09-39,
.page-id-25 .kt-adv-heading25_840e09-39 h1 {
    font-family: 'Outfit', sans-serif !important;
    font-size: clamp(3rem, 8vw, 8rem) !important;
    font-weight: 900 !important;
    line-height: 0.85 !important;
    letter-spacing: -0.04em !important;
    color: #f1f5f9 !important;
    text-transform: uppercase !important;
    margin-bottom: 2.5rem !important;
    text-align: left !important;
}

/* Pink highlight for "Source" and "for" */
.page-id-25 .kt-adv-heading25_840e09-39 .mhm-pink {
    color: #ec4899 !important;
}

/* ── Hero description ────────────────────────────────────── */
.page-id-25 .kt-adv-heading25_c3b7ea-2e,
.page-id-25 .kt-adv-heading25_c3b7ea-2e p {
    font-family: 'Inter', sans-serif !important;
    font-size: 1.25rem !important;
    color: #94a3b8 !important;
    line-height: 1.75 !important;
    max-width: 540px !important;
    margin-bottom: 3rem !important;
    text-align: left !important;
}

/* ── Hero buttons ────────────────────────────────────────── */
.page-id-25 .kb-row-layout-id25_31c866-74 .wp-block-buttons {
    justify-content: flex-start !important;
    gap: 1.5rem !important;
}

.page-id-25 .kb-row-layout-id25_31c866-74 .wp-block-button__link {
    font-family: 'Outfit', 'Inter', sans-serif !important;
    font-weight: 900 !important;
    font-size: 0.9rem !important;
    text-transform: uppercase !important;
    letter-spacing: 0.15em !important;
    padding: 1rem 2.5rem !important;
    border-radius: 9999px !important;
    background: #ec4899 !important;
    color: #fff !important;
    border: none !important;
    box-shadow: none !important;
    transition: transform 0.2s, box-shadow 0.2s !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    white-space: nowrap !important;
}
.page-id-25 .kb-row-layout-id25_31c866-74 .wp-block-button__link:hover {
    transform: scale(1.03) !important;
    box-shadow: 0 8px 24px -4px rgba(236, 72, 153, 0.4) !important;
}

/* ── Hero image styling ──────────────────────────────────── */
.page-id-25 .kadence-column25_ee1f96-74 .wp-block-gallery {
    position: relative !important;
    aspect-ratio: 1 !important;
    width: 100% !important;
    max-width: 580px !important;
    margin: 0 auto !important;
}

.page-id-25 .kadence-column25_ee1f96-74 .wp-block-image {
    border-radius: 2.5rem !important;
    overflow: hidden !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5) !important;
    width: 100% !important;
    height: 100% !important;
}
.page-id-25 .kadence-column25_ee1f96-74 .wp-block-image img {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
    filter: none !important;
    border-radius: 2.5rem !important;
}

/* Remove the old rounded clip-path */
.page-id-25 .kadence-column25_ee1f96-74 .wp-block-image.is-style-rounded img {
    border-radius: 2.5rem !important;
}

/* Hero image glow — solid pink, NO gradient */
.page-id-25 .kadence-column25_ee1f96-74 .wp-block-gallery::before {
    content: '' !important;
    position: absolute !important;
    inset: -20px !important;
    background: rgba(236, 72, 153, 0.25) !important;
    border-radius: 3rem !important;
    filter: blur(60px) !important;
    z-index: -1 !important;
    animation: mhm-hero-glow 4s ease-in-out infinite alternate !important;
}
@keyframes mhm-hero-glow {
    0% { opacity: 0.5; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1.05); }
}

/* ── SECTION HEADINGS ────────────────────────────────────── */
.page-id-25 [class*="kt-adv-heading25_15271e"],
.page-id-25 [class*="kt-adv-heading25_15271e"] h2,
.page-id-25 [class*="kt-adv-heading25_4db56b"],
.page-id-25 [class*="kt-adv-heading25_4db56b"] h2,
.page-id-25 [class*="kt-adv-heading25_5c0750"],
.page-id-25 [class*="kt-adv-heading25_5c0750"] h2,
.page-id-25 [class*="kt-adv-heading25_23756b"],
.page-id-25 [class*="kt-adv-heading25_23756b"] h2 {
    font-family: 'Outfit', sans-serif !important;
    font-size: 2.5rem !important;
    font-weight: 900 !important;
    text-transform: uppercase !important;
    letter-spacing: -0.02em !important;
    color: #f1f5f9 !important;
    text-align: left !important;
    padding-left: 0 !important;
}

/* ── VIEW ALL BUTTONS ────────────────────────────────────── */
.page-id-25 [class*="kb-btns25_"] .kb-button {
    font-family: 'Inter', sans-serif !important;
    font-weight: 900 !important;
    font-size: 0.75rem !important;
    text-transform: uppercase !important;
    letter-spacing: 0.15em !important;
    color: #ec4899 !important;
    background: transparent !important;
    border: 1px solid rgba(236, 72, 153, 0.3) !important;
    border-radius: 9999px !important;
    padding: 0.75rem 2rem !important;
    transition: background 0.2s, color 0.2s !important;
}
.page-id-25 [class*="kb-btns25_"] .kb-button:hover {
    background: #ec4899 !important;
    color: #fff !important;
}

/* ── BLOG CARDS ──────────────────────────────────────────── */
/* Card grid spacing */
.page-id-25 [class*="kb-posts-id-25_"] .kadence-posts-list {
    gap: 3rem !important;
}

/* Card wrapper */
.page-id-25 [class*="kb-posts-id-25_"] .loop-entry {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    overflow: visible !important;
    cursor: pointer !important;
}

/* Card thumbnail */
.page-id-25 [class*="kb-posts-id-25_"] .post-thumbnail {
    border-radius: 2.5rem !important;
    overflow: hidden !important;
    border: 1px solid rgba(255,255,255,0.05) !important;
    box-shadow: 0 20px 40px -12px rgba(0,0,0,0.3) !important;
    transition: box-shadow 0.5s !important;
    position: relative !important;
    aspect-ratio: 16 / 10 !important;
    margin-bottom: 2rem !important;
}
.page-id-25 [class*="kb-posts-id-25_"] .loop-entry:hover .post-thumbnail {
    box-shadow: 0 20px 40px -12px rgba(236, 72, 153, 0.15) !important;
}

.page-id-25 [class*="kb-posts-id-25_"] .post-thumbnail-inner {
    width: 100% !important;
    height: 100% !important;
    position: absolute !important;
    inset: 0 !important;
}

.page-id-25 [class*="kb-posts-id-25_"] .post-thumbnail-inner img {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
    transition: transform 0.7s ease !important;
}
.page-id-25 [class*="kb-posts-id-25_"] .loop-entry:hover .post-thumbnail-inner img {
    transform: scale(1.1) !important;
}

/* Category badge — overlay on image */
.page-id-25 [class*="kb-posts-id-25_"] .entry-taxonomies {
    position: absolute !important;
    top: 1.5rem !important;
    left: 1.5rem !important;
    z-index: 5 !important;
}
.page-id-25 [class*="kb-posts-id-25_"] .entry-taxonomies .category-links a {
    display: inline-block !important;
    padding: 0.375rem 1rem !important;
    border-radius: 9999px !important;
    background: rgba(255,255,255,0.1) !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
    border: 1px solid rgba(255,255,255,0.15) !important;
    font-family: 'Inter', sans-serif !important;
    font-size: 0.6rem !important;
    font-weight: 900 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.2em !important;
    color: #fff !important;
    text-decoration: none !important;
}

/* Card content area */
.page-id-25 [class*="kb-posts-id-25_"] .entry-content-wrap {
    padding: 0 !important;
}

/* Card title */
.page-id-25 [class*="kb-posts-id-25_"] .entry-title,
.page-id-25 [class*="kb-posts-id-25_"] .entry-title a {
    font-family: 'Outfit', sans-serif !important;
    font-size: 1.5rem !important;
    font-weight: 900 !important;
    line-height: 1.2 !important;
    color: #f1f5f9 !important;
    text-decoration: none !important;
    transition: color 0.3s !important;
}
.page-id-25 [class*="kb-posts-id-25_"] .loop-entry:hover .entry-title a {
    color: #ec4899 !important;
}

/* Card footer (hide empty) */
.page-id-25 [class*="kb-posts-id-25_"] .entry-footer:empty {
    display: none !important;
}

/* ── Section row backgrounds — all match dark bg ────────── */
.page-id-25 .kb-row-layout-id25_8eff1c-68,
.page-id-25 .kb-row-layout-id25_fd05fb-88,
.page-id-25 .has-theme-palette8-background-color,
.page-id-25 div.has-theme-palette8-background-color.kb-row-layout-wrap {
    background: #0B0F19 !important;
    background-color: #0B0F19 !important;
    border: none !important;
    outline: none !important;
}

/* Section content area — collapsed vertical spacing */
.page-id-25 .kb-row-layout-id25_6bd6da-e4 > .kt-row-column-wrap,
.page-id-25 .kb-row-layout-id25_8eff1c-68 > .kt-row-column-wrap,
.page-id-25 .kb-row-layout-id25_4cc8fa-da > .kt-row-column-wrap,
.page-id-25 .kb-row-layout-id25_fd05fb-88 > .kt-row-column-wrap {
    max-width: 1400px !important;
    margin: 0 auto !important;
    padding: 1.5rem 2rem !important;
}

/* ── GLOBAL FOOTER — matches header nav style (all pages) ── */
#colophon {
    background: #0B0F19 !important;
    border-top: 1px solid rgba(255,255,255,0.08) !important;
    padding: 0 !important;
}
#colophon .site-footer-wrap,
#colophon .site-middle-footer-wrap {
    background: #0B0F19 !important;
    padding: 0 !important;
}
#colophon .site-footer-row,
#colophon .site-footer-row-container-inner,
#colophon .site-middle-footer-inner-wrap {
    background: #0B0F19 !important;
    background-color: #0B0F19 !important;
    max-width: 1400px !important;
    margin: 0 auto !important;
    padding: 1.25rem 2rem !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex-wrap: wrap !important;
    gap: 0.75rem 2rem !important;
    border: none !important;
    border-radius: 0 !important;
}
/* Hide back-to-top button */
.kadence-scroll-to-top,
.scroll-up-wrap {
    display: none !important;
}
/* Line 1: nav menu takes full width to force wrap */
#colophon .site-footer-middle-section-1 {
    flex: 1 0 100% !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
}
/* Line 2: social icons + copyright stay together */
#colophon .site-footer-middle-section-2,
#colophon .site-footer-middle-section-3 {
    flex: 0 0 auto !important;
    display: flex !important;
    align-items: center !important;
}
/* Footer navigation links — match header nav font */
#colophon .footer-widget-area .menu,
#colophon .footer-widget-area ul {
    display: flex !important;
    flex-wrap: nowrap !important;
    gap: 2rem !important;
    list-style: none !important;
    margin: 0 !important;
    padding: 0 !important;
}
#colophon .footer-widget-area li {
    margin: 0 !important;
    padding: 0 !important;
}
#colophon a {
    color: #94a3b8 !important;
    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.05em !important;
    text-decoration: none !important;
    white-space: nowrap !important;
    transition: color 0.2s ease !important;
}
#colophon a:hover {
    color: #ffffff !important;
}
/* Copyright text — same font, muted */
#colophon .footer-html {
    color: #64748b !important;
    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.05em !important;
    white-space: nowrap !important;
}
/* Social icons inline */
#colophon .social-button-group {
    display: flex !important;
    gap: 1rem !important;
    align-items: center !important;
}
#colophon .social-button-group a {
    font-size: 0 !important;
}
#colophon .social-button-group svg {
    width: 16px !important;
    height: 16px !important;
    fill: #64748b !important;
}
/* Hide widget titles in footer */
#colophon .widget-title,
#colophon .widgettitle {
    display: none !important;
}

/* ── Featured CC overlay (injected via JS) ───────────────── */
.mhm-featured-overlay {
    position: absolute !important;
    bottom: 1.5rem !important;
    left: 1.5rem !important;
    right: 1.5rem !important;
    z-index: 10 !important;
    background: rgba(255,255,255,0.08) !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
    border: 1px solid rgba(255,255,255,0.15) !important;
    border-radius: 1.5rem !important;
    padding: 1.25rem 1.5rem !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
}
.mhm-featured-label {
    font-family: 'Inter', sans-serif !important;
    font-size: 0.6rem !important;
    font-weight: 900 !important;
    color: #ec4899 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.2em !important;
    margin-bottom: 0.35rem !important;
}
.mhm-featured-title {
    font-family: 'Outfit', sans-serif !important;
    font-size: 1.25rem !important;
    font-weight: 900 !important;
    color: #f1f5f9 !important;
}
.mhm-featured-btn {
    width: 3rem !important;
    height: 3rem !important;
    border-radius: 0.75rem !important;
    background: #ec4899 !important;
    color: #fff !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    border: none !important;
    cursor: pointer !important;
    flex-shrink: 0 !important;
    box-shadow: 0 8px 20px -4px rgba(236, 72, 153, 0.3) !important;
    transition: background 0.2s !important;
}
.mhm-featured-btn:hover {
    background: #db2777 !important;
}
.mhm-featured-btn svg {
    width: 20px !important;
    height: 20px !important;
}

/* ── Responsive ──────────────────────────────────────────── */
@media (max-width: 1024px) {
    .page-id-25 .kb-row-layout-id25_31c866-74 > .kt-row-column-wrap {
        flex-direction: column-reverse !important;
        gap: 2rem !important;
        padding: 2rem 1rem !important;
    }
    .page-id-25 .kadence-column25_ee1f96-74 {
        width: 100% !important;
        max-width: 500px !important;
        margin: 0 auto !important;
    }
}
@media (max-width: 767px) {
    /* ── Prevent ALL horizontal overflow on mobile ── */
    body.page-id-25 {
        overflow-x: hidden !important;
    }
    body.page-id-25 .entry-content,
    body.page-id-25 .entry-content-wrap,
    body.page-id-25 .kb-row-layout-wrap,
    body.page-id-25 .kt-row-column-wrap,
    body.page-id-25 .kadence-column,
    body.page-id-25 .wp-block-kadence-column {
        max-width: 100vw !important;
        overflow-x: hidden !important;
    }
    body.page-id-25 img {
        max-width: 100% !important;
        height: auto !important;
    }
    body.page-id-25 .loop-entry,
    body.page-id-25 .post-thumbnail {
        max-width: 100% !important;
        overflow: hidden !important;
    }
    body.page-id-25 .kadence-posts-list.grid-cols {
        grid-template-columns: 1fr !important;
        max-width: 100% !important;
    }

    .page-id-25 .kt-adv-heading25_840e09-39,
    .page-id-25 .kt-adv-heading25_840e09-39 h1 {
        font-size: clamp(2.5rem, 12vw, 4.5rem) !important;
        text-align: center !important;
    }
    .page-id-25 .kt-adv-heading25_c3b7ea-2e,
    .page-id-25 .kt-adv-heading25_c3b7ea-2e p {
        text-align: center !important;
        max-width: none !important;
    }
    .page-id-25 .kb-row-layout-id25_31c866-74 .wp-block-buttons {
        justify-content: center !important;
    }
    /* Hero button — wider pill, centered on mobile */
    .page-id-25 .kb-row-layout-id25_31c866-74 .wp-block-button.wp-block-button__width-50 {
        width: auto !important;
        display: flex !important;
        justify-content: center !important;
    }
    .page-id-25 .kb-row-layout-id25_31c866-74 .wp-block-button__link {
        padding: 1rem 2.5rem !important;
        letter-spacing: 0.05em !important;
        font-size: 0.85rem !important;
        white-space: nowrap !important;
        min-width: 260px !important;
        justify-content: center !important;
    }
    .page-id-25 .kadence-column25_ee1f96-74 {
        width: 100% !important;
        max-width: 360px !important;
    }
    .page-id-25 [class*="kt-adv-heading25_15271e"] h2,
    .page-id-25 [class*="kt-adv-heading25_4db56b"] h2,
    .page-id-25 [class*="kt-adv-heading25_5c0750"] h2,
    .page-id-25 [class*="kt-adv-heading25_23756b"] h2 {
        font-size: 2rem !important;
        text-align: center !important;
    }
    .page-id-25 [class*="kb-posts-id-25_"] .post-thumbnail {
        border-radius: 1.5rem !important;
    }
    .mhm-featured-title {
        font-size: 1rem !important;
    }
    /* Footer stacks on mobile */
    #colophon .site-middle-footer-inner-wrap {
        flex-direction: column !important;
        text-align: center !important;
        gap: 1rem !important;
    }
    #colophon .footer-widget-area .menu,
    #colophon .footer-widget-area ul {
        flex-wrap: wrap !important;
        justify-content: center !important;
        gap: 1rem !important;
    }
}
</style>
HOMECSS;
}
add_action( 'wp_head', 'mhm_homepage_body_css', 99998 );


/* Stats strip removed */


/**
 * 4. Featured CC overlay on hero image + Hero badge + H1 pink highlight
 */
function mhm_homepage_featured_overlay_js() {
    if ( ! is_page( 25 ) ) return;
    echo '<script id="mhm-featured-overlay">
document.addEventListener("DOMContentLoaded", function() {
    /* ── Replace H1 text + pink highlight ─────────────────── */
    var h1 = document.querySelector("h1.kt-adv-heading25_840e09-39");
    if (h1) {
        h1.innerHTML = \'Your #1 <span class="mhm-pink">Source</span> <span class="mhm-pink">for</span> Sims 4 <span style="white-space:nowrap">Mods&nbsp;&amp;&nbsp;CC</span>\';
    }

    /* ── Swap hero image to hi-res version ────────────────── */
    var heroImg = document.querySelector(".kadence-column25_ee1f96-74 img");
    if (heroImg) {
        heroImg.src = "https://blog.musthavemods.com/wp-content/uploads/2026/02/Must-Have-Mods.png";
        heroImg.srcset = "";
        heroImg.sizes = "";
        heroImg.removeAttribute("srcset");
        heroImg.removeAttribute("sizes");
    }

    /* ── Remove Browse Categories button ──────────────────── */
    var glassBtn = document.querySelector(".kb-row-layout-id25_31c866-74 .mhm-glass-btn-wrap");
    if (glassBtn) glassBtn.remove();

    /* ── Move category badges into thumbnails for overlay effect ── */
    var cards = document.querySelectorAll("[class*=\'kb-posts-id-25_\'] .loop-entry");
    cards.forEach(function(card) {
        var tax = card.querySelector(".entry-taxonomies");
        var thumb = card.querySelector(".post-thumbnail");
        if (tax && thumb) {
            thumb.style.position = "relative";
            thumb.appendChild(tax);
        }
    });
});
</script>';
}
add_action( 'wp_footer', 'mhm_homepage_featured_overlay_js', 10 );


/**
 * Exclude our custom scripts from PerfMatters delay JS
 */
add_filter( 'perfmatters_delay_js_exclusions', function( $exclusions ) {
    $exclusions[] = 'mhmFixDropdowns';
    $exclusions[] = 'mhm-page-title';
    $exclusions[] = 'mhm-featured-overlay';
    $exclusions[] = 'mhm-games-dropdown';
    $exclusions[] = 'mhm-mediavine-fix';
    return $exclusions;
});
// Also try the other possible filter name
add_filter( 'perfmatters_delayed_scripts_exclusions', function( $exclusions ) {
    $exclusions[] = 'mhmFixDropdowns';
    $exclusions[] = 'mhm-page-title';
    $exclusions[] = 'mhm-featured-overlay';
    $exclusions[] = 'mhm-games-dropdown';
    $exclusions[] = 'mhm-mediavine-fix';
    return $exclusions;
});

/**
 * 5. Global header/footer JS — logo replacement + dropdown fix (ALL pages)
 */
function mhm_global_header_footer_js() {
    echo '<script id="mhmFixDropdowns">
function mhmFixDropdowns() {
    document.querySelectorAll("#primary-menu .menu-item--toggled-on").forEach(function(el) {
        el.classList.remove("menu-item--toggled-on");
    });
    document.querySelectorAll("#primary-menu > li.menu-item-has-children > .sub-menu").forEach(function(sm) {
        sm.style.setProperty("display", "none", "important");
    });
}
document.addEventListener("DOMContentLoaded", function() {
    /* ── Fix: force-hide dropdowns — run immediately + delayed to beat Kadence JS ── */
    mhmFixDropdowns();
    setTimeout(mhmFixDropdowns, 100);
    setTimeout(mhmFixDropdowns, 500);

    /* Show/hide dropdown on hover via JS — use !important to beat Kadence */
    document.querySelectorAll("#primary-menu > li.menu-item-has-children").forEach(function(li) {
        var submenu = li.querySelector(".sub-menu");
        var timeout;
        li.addEventListener("mouseenter", function() {
            clearTimeout(timeout);
            submenu.style.setProperty("display", "block", "important");
        });
        li.addEventListener("mouseleave", function() {
            timeout = setTimeout(function() { submenu.style.setProperty("display", "none", "important"); }, 150);
        });
    });

    /* ── Replace header logo with sparkle icon + MUSTHAVEMODS + BLOG ── */
    var sparkleIcon = \'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>\';

    /* Desktop logo */
    var logoLink = document.querySelector("#main-header .site-branding a.brand, #main-header .custom-logo-link");
    if (logoLink) {
        logoLink.innerHTML = \'<div style="display:flex;align-items:center;gap:12px"><div style="position:relative"><div style="position:absolute;inset:0;background:#ec4899;filter:blur(10px);opacity:0.5;border-radius:9999px"></div><div style="position:relative;background:#ec4899;padding:10px;border-radius:14px;box-shadow:0 4px 12px rgba(236,72,153,0.3)">\' + sparkleIcon.replace(\'viewBox\', \'width="20" height="20" viewBox\') + \'</div></div><div style="display:flex;flex-direction:column;line-height:1.1"><span style="font-family:Inter,sans-serif;font-weight:900;font-size:16px;color:#f1f5f9;letter-spacing:0.02em">MUSTHAVEMODS</span><span style="font-family:Inter,sans-serif;font-weight:600;font-size:10px;color:#64748b;letter-spacing:0.15em;text-transform:uppercase">Blog</span></div></div>\';
        logoLink.href = "/homepage/";
        logoLink.style.setProperty("display", "flex", "important");
        logoLink.style.setProperty("align-items", "center", "important");
        logoLink.style.setProperty("text-decoration", "none", "important");
    }

    /* Mobile logo — smaller version */
    var mobileLogo = document.querySelector("#mobile-header .site-branding a.brand, .site-mobile-header-wrap .site-branding a.brand");
    if (mobileLogo) {
        mobileLogo.innerHTML = \'<div style="display:flex;align-items:center;gap:8px"><div style="position:relative;background:#ec4899;padding:7px;border-radius:10px;box-shadow:0 2px 8px rgba(236,72,153,0.3)">\' + sparkleIcon.replace(\'viewBox\', \'width="16" height="16" viewBox\') + \'</div><span style="font-family:Inter,sans-serif;font-weight:900;font-size:13px;color:#f1f5f9;letter-spacing:0.02em">MHM</span></div>\';
        mobileLogo.href = "/homepage/";
        mobileLogo.style.setProperty("display", "flex", "important");
        mobileLogo.style.setProperty("align-items", "center", "important");
        mobileLogo.style.setProperty("text-decoration", "none", "important");
    }

    /* ── Mobile: Force overflow-x hidden via JS (plugins set inline overflow:visible) ── */
    if (window.innerWidth <= 768) {
        document.documentElement.style.setProperty("overflow-x", "hidden", "important");
        document.body.style.setProperty("overflow-x", "hidden", "important");
        /* Re-apply periodically to beat any delayed plugin JS */
        var mhmOverflowInterval = setInterval(function() {
            document.documentElement.style.setProperty("overflow-x", "hidden", "important");
            document.body.style.setProperty("overflow-x", "hidden", "important");
        }, 500);
        setTimeout(function() { clearInterval(mhmOverflowInterval); }, 5000);
    }
});
</script>';
}
add_action( 'wp_footer', 'mhm_global_header_footer_js', 5 );


/**
 * 6. Global footer CSS — consistent two-line footer on ALL pages
 *    Priority 99999 to override Kadence and any page-specific styles
 */
function mhm_global_footer_css() {
    echo '<style id="mhm-global-footer-css">
/* ── GLOBAL FOOTER — matches header nav style (all pages) ── */
#colophon {
    background: #0B0F19 !important;
    border-top: 1px solid rgba(255,255,255,0.08) !important;
    padding: 0 !important;
}
#colophon .site-footer-wrap,
#colophon .site-middle-footer-wrap {
    background: #0B0F19 !important;
    padding: 0 !important;
}
#colophon .site-footer-row,
#colophon .site-footer-row-container-inner,
#colophon .site-middle-footer-inner-wrap {
    background: #0B0F19 !important;
    background-color: #0B0F19 !important;
    max-width: 1400px !important;
    margin: 0 auto !important;
    padding: 1.25rem 2rem !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex-wrap: wrap !important;
    gap: 0.75rem 2rem !important;
    border: none !important;
    border-radius: 0 !important;
}
/* Hide back-to-top button */
.kadence-scroll-to-top,
.scroll-up-wrap {
    display: none !important;
}
/* Line 1: nav menu takes full width to force wrap */
#colophon .site-footer-middle-section-1 {
    flex: 1 0 100% !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
}
/* Line 2: social icons + copyright stay together */
#colophon .site-footer-middle-section-2,
#colophon .site-footer-middle-section-3 {
    flex: 0 0 auto !important;
    display: flex !important;
    align-items: center !important;
}
/* Footer navigation links — match header nav font */
#colophon .footer-widget-area .menu,
#colophon .footer-widget-area ul {
    display: flex !important;
    flex-wrap: nowrap !important;
    gap: 2rem !important;
    list-style: none !important;
    margin: 0 !important;
    padding: 0 !important;
}
#colophon .footer-widget-area li {
    margin: 0 !important;
    padding: 0 !important;
}
#colophon a {
    color: #94a3b8 !important;
    font-family: "Inter", ui-sans-serif, system-ui, sans-serif !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.05em !important;
    text-decoration: none !important;
    white-space: nowrap !important;
    transition: color 0.2s ease !important;
}
#colophon a:hover {
    color: #ffffff !important;
}
/* Copyright text — same font, muted */
#colophon .footer-html {
    color: #64748b !important;
    font-family: "Inter", ui-sans-serif, system-ui, sans-serif !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.05em !important;
    white-space: nowrap !important;
}
/* Social icons inline */
#colophon .social-button-group {
    display: flex !important;
    gap: 1rem !important;
    align-items: center !important;
}
#colophon .social-button-group a {
    font-size: 0 !important;
}
#colophon .social-button-group svg {
    width: 16px !important;
    height: 16px !important;
    fill: #64748b !important;
}
/* Hide widget titles in footer */
#colophon .widget-title,
#colophon .widgettitle {
    display: none !important;
}

/* ── MOBILE FOOTER ── */
@media (max-width: 768px) {
    #colophon .site-footer-row,
    #colophon .site-footer-row-container-inner,
    #colophon .site-middle-footer-inner-wrap {
        padding: 1.5rem 1rem !important;
        gap: 1rem !important;
        flex-direction: column !important;
        align-items: center !important;
    }
    /* Menu links — wrap into centered grid */
    #colophon .footer-widget-area .menu,
    #colophon .footer-widget-area ul {
        flex-wrap: wrap !important;
        justify-content: center !important;
        gap: 0.75rem 1.25rem !important;
    }
    #colophon a {
        font-size: 11px !important;
        white-space: nowrap !important;
    }
    /* Copyright — allow wrapping */
    #colophon .footer-html {
        white-space: normal !important;
        text-align: center !important;
        font-size: 11px !important;
    }
    /* Stack social + copyright vertically */
    #colophon .site-footer-middle-section-2,
    #colophon .site-footer-middle-section-3 {
        justify-content: center !important;
    }
}
</style>';
}
add_action( 'wp_head', 'mhm_global_footer_css', 99999 );


/**
 * 7. Static pages (About, Contact, Privacy, Terms, Disclaimer) — article-like layout
 *    These pages have content-title-style-hide in Kadence, so we inject the title via JS
 *    and apply the same centered, full-width layout as single posts.
 */
function mhm_static_pages_css() {
    // Only run on these specific static pages
    $static_page_ids = array(4655, 27, 1444, 9420, 9458);
    if ( ! is_page( $static_page_ids ) ) return;

    echo '<style id="mhm-static-pages-css">
/* ── Static page layout — match single-post article style ── */

/* Full-width centered layout, hide sidebar */
body.page #secondary,
body.page .sidebar,
body.page aside.widget-area {
    display: none !important;
}
body.page #primary,
body.page .content-container,
body.page .site-main {
    width: 100% !important;
    max-width: 900px !important;
    margin: 0 auto !important;
    float: none !important;
}
body.page .content-wrap {
    display: block !important;
}

/* Content area — article typography */
body.page .entry-content {
    max-width: 800px !important;
    margin: 0 auto !important;
    font-size: 1.125rem !important;
    line-height: 1.8 !important;
    color: #cbd5e1 !important;
    padding: 0 1rem !important;
}

/* Injected page title */
.mhm-page-title-injected {
    max-width: 800px !important;
    margin: 2.5rem auto 1.5rem !important;
    padding: 0 1rem !important;
}
.mhm-page-title-injected h1 {
    font-size: 2.5rem !important;
    font-weight: 800 !important;
    line-height: 1.2 !important;
    color: #f1f5f9 !important;
    margin: 0 !important;
}
.mhm-page-title-injected .mhm-page-divider {
    height: 3px !important;
    width: 60px !important;
    background: #ec4899 !important;
    border: none !important;
    border-radius: 2px !important;
    margin-top: 1rem !important;
}

/* Background consistency */
body.page,
body.page .site,
body.page #wrapper,
body.page #inner-wrap,
body.page #primary,
body.page .content-area,
body.page .content-container,
body.page .site-main,
body.page .content-wrap,
body.page .single-entry,
body.page .entry-content-wrap,
body.page .entry-content {
    background: #0B0F19 !important;
}

/* Content vertical padding — Kadence hides it on these pages */
body.page .entry-content-wrap {
    padding: 2rem 0 3rem !important;
}

/* Headings inside content */
body.page .entry-content h2 {
    font-size: 1.75rem !important;
    font-weight: 700 !important;
    color: #f1f5f9 !important;
    margin-top: 2.5rem !important;
    margin-bottom: 1rem !important;
    padding-bottom: 0.5rem !important;
    border-bottom: 1px solid rgba(255,255,255,0.08) !important;
}
body.page .entry-content h3 {
    font-size: 1.375rem !important;
    font-weight: 700 !important;
    color: #f1f5f9 !important;
    margin-top: 2rem !important;
    margin-bottom: 0.75rem !important;
}
body.page .entry-content h4 {
    font-size: 1.125rem !important;
    font-weight: 700 !important;
    color: #e2e8f0 !important;
    margin-top: 1.5rem !important;
    margin-bottom: 0.5rem !important;
}

/* Paragraphs */
body.page .entry-content p {
    color: #cbd5e1 !important;
    margin-bottom: 1.25rem !important;
}

/* Links — pink accent, not cyan */
body.page .entry-content a {
    color: #ec4899 !important;
    text-decoration: underline !important;
    text-decoration-color: rgba(236,72,153,0.3) !important;
    text-underline-offset: 3px !important;
}
body.page .entry-content a:hover {
    color: #f472b6 !important;
    text-decoration-color: #ec4899 !important;
}

/* Lists */
body.page .entry-content ul,
body.page .entry-content ol {
    color: #cbd5e1 !important;
    padding-left: 1.5rem !important;
    margin-bottom: 1.25rem !important;
}
body.page .entry-content li {
    margin-bottom: 0.5rem !important;
}

/* About page specific — dark-theme all custom sections */
body.page .about-header,
body.page .writer-info,
body.page .trust-signals {
    background: #151B2B !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    border-radius: 1rem !important;
    padding: 2rem !important;
    color: #cbd5e1 !important;
}
body.page .about-header {
    text-align: center !important;
}
body.page .about-container .subtitle {
    color: #94a3b8 !important;
    font-size: 1rem !important;
    text-transform: uppercase !important;
    letter-spacing: 0.1em !important;
}
body.page .writer-info p,
body.page .writer-info span,
body.page .trust-signals p {
    color: #cbd5e1 !important;
}
body.page .writer-info h3,
body.page .writer-info .writer-name {
    color: #f1f5f9 !important;
}
body.page .writer-info .writer-title {
    color: #94a3b8 !important;
}

/* Strong/bold text */
body.page .entry-content strong {
    color: #f1f5f9 !important;
}
</style>';
}
add_action( 'wp_head', 'mhm_static_pages_css', 99999 );


/**
 * 8. Static pages — inject page title via JS (Kadence removes entry-header on these pages)
 */
function mhm_static_pages_title_js() {
    $static_page_ids = array(4655, 27, 1444, 9420, 9458);
    if ( ! is_page( $static_page_ids ) ) return;

    $title = get_the_title();
    $escaped_title = esc_js( $title );

    echo '<script id="mhm-page-title">
document.addEventListener("DOMContentLoaded", function() {
    var contentWrap = document.querySelector(".entry-content-wrap");
    if (contentWrap && !document.querySelector(".mhm-page-title-injected")) {
        var titleDiv = document.createElement("div");
        titleDiv.className = "mhm-page-title-injected";
        titleDiv.innerHTML = \'<h1>' . $escaped_title . '</h1><div class="mhm-page-divider"></div>\';
        contentWrap.insertBefore(titleDiv, contentWrap.firstChild);
    }
});
</script>';
}
add_action( 'wp_footer', 'mhm_static_pages_title_js', 10 );
