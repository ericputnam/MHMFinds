SELECT '=== per-post tag=musthavemod08-20 count ===' AS marker;
SELECT ID, post_type, post_status, post_name,
  (LENGTH(post_content) - LENGTH(REPLACE(post_content, 'tag=musthavemod08-20', ''))) DIV LENGTH('tag=musthavemod08-20') AS occ_08_20
FROM wp_posts
WHERE post_content LIKE '%tag=musthavemod08-20%'
ORDER BY ID;

SELECT '=== per-post tag=musthavemod04-20 count (already correct) ===' AS marker;
SELECT ID, post_type, post_status, post_name,
  (LENGTH(post_content) - LENGTH(REPLACE(post_content, 'tag=musthavemod04-20', ''))) DIV LENGTH('tag=musthavemod04-20') AS occ_04_20
FROM wp_posts
WHERE post_content LIKE '%tag=musthavemod04-20%'
ORDER BY ID;

SELECT '=== any tag=musthavemod NOT 04-20 and NOT 08-20 ===' AS marker;
SELECT ID, post_name FROM wp_posts
WHERE post_content LIKE '%tag=musthavemod%'
  AND post_content NOT LIKE '%tag=musthavemod04-20%'
  AND post_content NOT LIKE '%tag=musthavemod08-20%';

SELECT '=== any OTHER amazon affiliate tag param entirely (not musthavemod prefix) ===' AS marker;
SELECT ID, post_name FROM wp_posts
WHERE (post_content LIKE '%amazon.%tag=%' OR post_content LIKE '%amzn.to%tag=%')
  AND post_content NOT LIKE '%tag=musthavemod%';

SELECT '=== pages/posts with amazon.com or amzn.to link but NO tag param at all ===' AS marker;
SELECT ID, post_type, post_name FROM wp_posts
WHERE (post_content LIKE '%//www.amazon.%' OR post_content LIKE '%//amazon.%')
  AND post_content NOT LIKE '%tag=%';

SELECT '=== ta_link custom post type rows (ThirstyAffiliates) ===' AS marker;
SELECT COUNT(*) AS ta_link_count, post_status FROM wp_posts WHERE post_type='ta_link' GROUP BY post_status;

SELECT '=== postmeta: tag=musthavemod anywhere ===' AS marker;
SELECT post_id, meta_key, LEFT(meta_value,200) AS sample FROM wp_postmeta WHERE meta_value LIKE '%tag=musthavemod%';

SELECT '=== options: tag=musthavemod anywhere ===' AS marker;
SELECT option_name, LEFT(option_value,200) AS sample FROM wp_options WHERE option_value LIKE '%tag=musthavemod%';
