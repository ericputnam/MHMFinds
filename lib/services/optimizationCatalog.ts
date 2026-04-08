/**
 * Optimization Catalog
 *
 * Ranked list of all known RPM optimization techniques.
 * Each entry includes expected impact, complexity, status, and prerequisites.
 * The nightly runner uses this to pick the next experiment to run.
 */

// Optimization complexity level
export type ComplexityLevel = 'trivial' | 'low' | 'medium' | 'high';

// Where the optimization is applied
export type OptimizationScope = 'site_wide' | 'next_app' | 'wordpress' | 'page_specific';

// Current status of each optimization
export type OptimizationStatus =
  | 'not_started'
  | 'in_progress'
  | 'tested'
  | 'kept'
  | 'reverted'
  | 'blocked';

// Single optimization technique
export interface OptimizationEntry {
  key: string;
  name: string;
  description: string;
  category: 'ad_settings' | 'content' | 'layout' | 'speed' | 'engagement' | 'seo';
  scope: OptimizationScope;
  complexity: ComplexityLevel;
  expectedRpmImpact: { min: number; max: number }; // Dollar impact on RPM
  expectedRevenueImpact: { min: number; max: number }; // Monthly revenue impact
  confidence: number; // 0-1, how sure we are about the impact estimate
  status: OptimizationStatus;
  prerequisites: string[]; // Keys of optimizations that must be done first
  autoExecutable: boolean; // Can be applied without manual intervention
  reversible: boolean; // Can be rolled back automatically
  implementationNotes: string;
  lastTestedDate?: string; // ISO date
  measuredImpact?: number; // Actual RPM impact if tested
}

/**
 * The master catalog of optimization techniques, ordered by expected impact.
 */
const CATALOG: OptimizationEntry[] = [
  {
    key: 'ad_block_recovery',
    name: 'Ad Block Recovery',
    description: 'Enable Mediavine Ad Block Recovery to show polite whitelist message to ad blocker users. Recovers 2-5% of lost impressions.',
    category: 'ad_settings',
    scope: 'site_wide',
    complexity: 'trivial',
    expectedRpmImpact: { min: 0.50, max: 1.30 },
    expectedRevenueImpact: { min: 100, max: 300 },
    confidence: 0.9,
    status: 'not_started',
    prerequisites: [],
    autoExecutable: false, // Requires Mediavine dashboard
    reversible: true,
    implementationNotes: 'Mediavine Dashboard → Settings → Ad Block Recovery → Enable. Zero code required.',
  },
  {
    key: 'deploy_rpm_optimization_branch',
    name: 'Deploy RPM Optimization Branch',
    description: 'Merge and deploy the rpm-optimization branch with 11 completed optimizations: sidebar sticky, related mods, content sections, trending carousel, JSON-LD schema, creator sections.',
    category: 'layout',
    scope: 'site_wide',
    complexity: 'low',
    expectedRpmImpact: { min: 1.50, max: 3.00 },
    expectedRevenueImpact: { min: 250, max: 600 },
    confidence: 0.7,
    status: 'not_started',
    prerequisites: [],
    autoExecutable: false, // Requires git merge + deploy
    reversible: true,
    implementationNotes: 'Merge rpm-optimization branch to main. Includes sidebar containers, related mods section, trending carousel, JSON-LD, creator sections.',
  },
  {
    key: 'viewability_lazy_loading',
    name: 'Viewability-Optimized Lazy Loading',
    description: 'Ensure ads near the viewport get loading priority. Defer below-fold images to improve above-fold ad render speed.',
    category: 'speed',
    scope: 'site_wide',
    complexity: 'medium',
    expectedRpmImpact: { min: 0.40, max: 1.00 },
    expectedRevenueImpact: { min: 80, max: 200 },
    confidence: 0.65,
    status: 'not_started',
    prerequisites: ['deploy_rpm_optimization_branch'],
    autoExecutable: true,
    reversible: true,
    implementationNotes: 'Add loading="lazy" to below-fold images, ensure Mediavine ad containers have proper dimensions for CLS. Use Intersection Observer for priority loading.',
  },
  {
    key: 'heading_structure_audit',
    name: 'Heading Structure Audit',
    description: 'Ensure proper H2/H3 hierarchy on blog posts for optimal Mediavine ad insertion points. Mediavine inserts ads after H2 tags.',
    category: 'content',
    scope: 'wordpress',
    complexity: 'medium',
    expectedRpmImpact: { min: 0.30, max: 0.80 },
    expectedRevenueImpact: { min: 60, max: 160 },
    confidence: 0.6,
    status: 'not_started',
    prerequisites: [],
    autoExecutable: false, // Requires WordPress content changes
    reversible: true,
    implementationNotes: 'Audit top 50 blog posts by traffic. Ensure each has 3-5 H2 headings for ad insertion. Add H2s where content is >500 words without a heading break.',
  },
  {
    key: 'content_length_expansion',
    name: 'Content Length Expansion',
    description: 'Pages under 700 words get minimal ad units from Mediavine. Expand thin content pages to 700+ words to qualify for more ad slots.',
    category: 'content',
    scope: 'wordpress',
    complexity: 'high',
    expectedRpmImpact: { min: 0.50, max: 1.00 },
    expectedRevenueImpact: { min: 100, max: 200 },
    confidence: 0.55,
    status: 'not_started',
    prerequisites: [],
    autoExecutable: false, // Requires content writing
    reversible: false,
    implementationNotes: 'Identify blog posts under 700 words with decent traffic. Add installation guides, compatibility notes, FAQs, and related mod suggestions.',
  },
  {
    key: 'internal_linking_density',
    name: 'Internal Linking Density',
    description: 'Increase internal links between related posts to boost pages/session. More pageviews = more ad impressions per visit.',
    category: 'engagement',
    scope: 'wordpress',
    complexity: 'medium',
    expectedRpmImpact: { min: 0.20, max: 0.50 },
    expectedRevenueImpact: { min: 40, max: 100 },
    confidence: 0.6,
    status: 'not_started',
    prerequisites: [],
    autoExecutable: true,
    reversible: true,
    implementationNotes: 'Add "Related Posts" links within content body (not just sidebar). Target 3-5 internal links per post. Can be automated with a WordPress shortcode.',
  },
  {
    key: 'pinterest_layout_optimization',
    name: 'Pinterest Layout Optimization',
    description: '~50% of traffic comes from Pinterest. Optimize layouts for visual-first browsing patterns with larger images and grid layouts.',
    category: 'layout',
    scope: 'wordpress',
    complexity: 'medium',
    expectedRpmImpact: { min: 0.20, max: 0.60 },
    expectedRevenueImpact: { min: 40, max: 120 },
    confidence: 0.5,
    status: 'not_started',
    prerequisites: ['deploy_rpm_optimization_branch'],
    autoExecutable: false,
    reversible: true,
    implementationNotes: 'Test larger featured images on blog posts, Pinterest-style grid on category pages, and "Pin It" buttons on images.',
  },
  {
    key: 'interstitial_ads',
    name: 'Interstitial Ads Test',
    description: 'Enable Mediavine interstitial ads. With 94% desktop traffic, less intrusive than mobile. Worth +5-10% RPM.',
    category: 'ad_settings',
    scope: 'site_wide',
    complexity: 'trivial',
    expectedRpmImpact: { min: 0.50, max: 1.30 },
    expectedRevenueImpact: { min: 100, max: 260 },
    confidence: 0.5,
    status: 'not_started',
    prerequisites: [],
    autoExecutable: false, // Requires Mediavine dashboard
    reversible: true,
    implementationNotes: 'Mediavine Dashboard → Settings → Interstitial Ads → Enable. Test for 1 week. Monitor bounce rate for negative UX impact.',
  },
  {
    key: 'page_speed_optimization',
    name: 'Page Speed Optimization',
    description: 'Faster page load = ads render sooner = better viewability. Target LCP under 2.5s and FID under 100ms.',
    category: 'speed',
    scope: 'site_wide',
    complexity: 'high',
    expectedRpmImpact: { min: 0.20, max: 0.50 },
    expectedRevenueImpact: { min: 40, max: 100 },
    confidence: 0.5,
    status: 'not_started',
    prerequisites: [],
    autoExecutable: false,
    reversible: true,
    implementationNotes: 'Audit Core Web Vitals. Optimize images (WebP/AVIF), reduce JS bundle size, add resource hints. Use next/image properly.',
  },
  {
    key: 'scroll_depth_incentives',
    name: 'Scroll Depth Incentives',
    description: 'Add table of contents anchors, expandable sections, and "read more" patterns to incentivize scrolling past ad placements.',
    category: 'engagement',
    scope: 'wordpress',
    complexity: 'medium',
    expectedRpmImpact: { min: 0.15, max: 0.40 },
    expectedRevenueImpact: { min: 30, max: 80 },
    confidence: 0.55,
    status: 'not_started',
    prerequisites: ['heading_structure_audit'],
    autoExecutable: true,
    reversible: true,
    implementationNotes: 'Add auto-generated TOC to posts with 3+ H2 headings. Use smooth scroll anchors. Add "Show More" expandable sections for long mod lists.',
  },
  {
    key: 'blog_font_size_audit',
    name: 'Blog Font Size Audit (18-20px)',
    description: 'Increasing blog body font to 18-20px increases scroll depth by forcing more scrolling per paragraph. More scroll = more ad viewability.',
    category: 'layout',
    scope: 'wordpress',
    complexity: 'trivial',
    expectedRpmImpact: { min: 0.10, max: 0.30 },
    expectedRevenueImpact: { min: 20, max: 60 },
    confidence: 0.45,
    status: 'not_started',
    prerequisites: [],
    autoExecutable: true,
    reversible: true,
    implementationNotes: 'WordPress only (NOT mod finder — 18px was reverted there). Update font-size in kadence-child functions.php CSS injection. Test on blog posts only.',
  },
  {
    key: 'video_ad_units',
    name: 'Video Ad Units Optimization',
    description: 'Ensure Mediavine Universal Player is optimally placed. Video ads have the highest CPM.',
    category: 'ad_settings',
    scope: 'site_wide',
    complexity: 'low',
    expectedRpmImpact: { min: 0.10, max: 0.40 },
    expectedRevenueImpact: { min: 20, max: 80 },
    confidence: 0.4,
    status: 'not_started',
    prerequisites: [],
    autoExecutable: false,
    reversible: true,
    implementationNotes: 'Check Mediavine Universal Player placement. Ensure it appears on all pages with sufficient content. Consider sticky video player.',
  },
];

/**
 * OptimizationCatalog class - manages the ranked list of optimization techniques
 */
export class OptimizationCatalog {
  private catalog: OptimizationEntry[];

  constructor() {
    this.catalog = [...CATALOG];
  }

  /**
   * Get all optimizations sorted by expected impact (high to low)
   */
  getAll(): OptimizationEntry[] {
    return [...this.catalog].sort((a, b) => {
      const midA = (a.expectedRpmImpact.min + a.expectedRpmImpact.max) / 2;
      const midB = (b.expectedRpmImpact.min + b.expectedRpmImpact.max) / 2;
      return midB * b.confidence - midA * a.confidence;
    });
  }

  /**
   * Get the next untested optimization to experiment with.
   * Considers prerequisites and current status.
   */
  getNextCandidate(): OptimizationEntry | null {
    const sorted = this.getAll();

    for (const entry of sorted) {
      // Skip if already tested/in-progress/blocked
      if (entry.status !== 'not_started') continue;

      // Check prerequisites are met
      const prereqsMet = entry.prerequisites.every(prereqKey => {
        const prereq = this.catalog.find(c => c.key === prereqKey);
        return prereq && (prereq.status === 'kept' || prereq.status === 'tested');
      });

      if (!prereqsMet) continue;

      // Must be auto-executable for the nightly runner
      // Non-auto ones are flagged for manual action
      return entry;
    }

    return null;
  }

  /**
   * Get all candidates ready for testing (prerequisites met, not started)
   */
  getReadyCandidates(): OptimizationEntry[] {
    return this.getAll().filter(entry => {
      if (entry.status !== 'not_started') return false;

      return entry.prerequisites.every(prereqKey => {
        const prereq = this.catalog.find(c => c.key === prereqKey);
        return prereq && (prereq.status === 'kept' || prereq.status === 'tested');
      });
    });
  }

  /**
   * Get optimization by key
   */
  getByKey(key: string): OptimizationEntry | undefined {
    return this.catalog.find(c => c.key === key);
  }

  /**
   * Update the status of an optimization
   */
  updateStatus(key: string, status: OptimizationStatus, measuredImpact?: number): void {
    const entry = this.catalog.find(c => c.key === key);
    if (entry) {
      entry.status = status;
      entry.lastTestedDate = new Date().toISOString().split('T')[0];
      if (measuredImpact !== undefined) {
        entry.measuredImpact = measuredImpact;
      }
    }
  }

  /**
   * Get optimizations by category
   */
  getByCategory(category: OptimizationEntry['category']): OptimizationEntry[] {
    return this.catalog.filter(c => c.category === category);
  }

  /**
   * Get optimizations by scope
   */
  getByScope(scope: OptimizationScope): OptimizationEntry[] {
    return this.catalog.filter(c => c.scope === scope);
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    total: number;
    byStatus: Record<OptimizationStatus, number>;
    totalExpectedRpmImpact: { min: number; max: number };
    totalExpectedRevenueImpact: { min: number; max: number };
  } {
    const byStatus: Record<OptimizationStatus, number> = {
      not_started: 0,
      in_progress: 0,
      tested: 0,
      kept: 0,
      reverted: 0,
      blocked: 0,
    };

    let totalRpmMin = 0, totalRpmMax = 0;
    let totalRevMin = 0, totalRevMax = 0;

    for (const entry of this.catalog) {
      byStatus[entry.status]++;
      totalRpmMin += entry.expectedRpmImpact.min;
      totalRpmMax += entry.expectedRpmImpact.max;
      totalRevMin += entry.expectedRevenueImpact.min;
      totalRevMax += entry.expectedRevenueImpact.max;
    }

    return {
      total: this.catalog.length,
      byStatus,
      totalExpectedRpmImpact: { min: totalRpmMin, max: totalRpmMax },
      totalExpectedRevenueImpact: { min: totalRevMin, max: totalRevMax },
    };
  }

  /**
   * Export catalog state as JSON (for persistence in rpm-audit-log.json)
   */
  toJSON(): Record<string, { status: OptimizationStatus; lastTestedDate?: string; measuredImpact?: number }> {
    const result: Record<string, { status: OptimizationStatus; lastTestedDate?: string; measuredImpact?: number }> = {};
    for (const entry of this.catalog) {
      result[entry.key] = {
        status: entry.status,
        lastTestedDate: entry.lastTestedDate,
        measuredImpact: entry.measuredImpact,
      };
    }
    return result;
  }

  /**
   * Load catalog state from JSON (from rpm-audit-log.json)
   */
  loadState(state: Record<string, { status: OptimizationStatus; lastTestedDate?: string; measuredImpact?: number }>): void {
    for (const [key, data] of Object.entries(state)) {
      const entry = this.catalog.find(c => c.key === key);
      if (entry) {
        entry.status = data.status;
        entry.lastTestedDate = data.lastTestedDate;
        entry.measuredImpact = data.measuredImpact;
      }
    }
  }
}

// Export singleton instance
export const optimizationCatalog = new OptimizationCatalog();
