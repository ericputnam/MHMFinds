/**
 * The email a creator gets when an admin approves their submission
 * (2026-11-22). Until now approval was silent: the reject route mailed the
 * submitter, the approve route did not.
 *
 * Pure builder — no server import — so the copy is unit-testable. The send
 * lives in app/api/admin/submissions/[id]/approve/route.ts.
 *
 * The sender is fixed here, not read from EMAIL_FROM: creator mail comes from
 * a person's mailbox so a reply reaches someone, whatever the newsletter
 * sender is set to.
 */
import { claimSignInHref } from './creatorClaim';
import { escapeHtml } from './escapeHtml';

export const APPROVAL_EMAIL_FROM = 'olivia@musthavemods.com';
export const APPROVAL_EMAIL_FROM_NAME = 'Olivia at MustHaveMods';

/** Audience line for the upcoming feature section (operator's wording, 2026-11-22). */
export const FEATURE_SECTION_AUDIENCE = 'millions of visitors';

/** Signed-in creator dashboard and its submit form (app/creators/). */
const DASHBOARD_PATH = '/creators/';
const SUBMIT_PATH = '/creators/submit/';

export interface ApprovalEmailInput {
  /** Absolute origin, no trailing slash. */
  siteUrl: string;
  modName: string;
  modId: string;
  /** Free-text author from the submission; used only for the greeting. */
  author: string | null;
  /** True when the approval updated an existing mod. */
  isEdit: boolean;
  /** True when the submitter's account already holds a CreatorProfile (existing or just created). */
  hasProfile: boolean;
  /** Creator-page slug to claim when there is no profile yet; null when none is valid. */
  claimSlug: string | null;
  /**
   * Further mods approved in the same batch (the scripted path approves
   * several per creator). One email lists them all instead of one email each.
   */
  moreMods?: ReadonlyArray<{ id: string; name: string }>;
}

export interface ApprovalEmail {
  subject: string;
  html: string;
  from: string;
  fromName: string;
  replyTo: string;
}

function profileSteps(input: ApprovalEmailInput): string[] {
  const site = input.siteUrl.replace(/\/+$/, '');
  const link = (path: string, label: string) => `<a href="${escapeHtml(site + path)}">${label}</a>`;

  if (input.hasProfile) {
    return [
      `${link(DASHBOARD_PATH, 'Open your creator dashboard')} and sign in with the account you submitted from.`,
      `${link(SUBMIT_PATH, 'Add your other mods')}. Each one we approve joins your profile.`,
      'We confirm it is you, and your creator page gets a verified badge.',
    ];
  }

  const signIn = input.claimSlug
    ? claimSignInHref(input.claimSlug)
    : `/sign-in/?redirect=${encodeURIComponent(SUBMIT_PATH)}`;
  return [
    `${link(signIn, 'Create a free account or sign in')}.`,
    'Submit your next mod with the form that opens. That links your account to your creator profile.',
    'We confirm it is you, and your creator page gets a verified badge.',
  ];
}

export function buildApprovalEmail(input: ApprovalEmailInput): ApprovalEmail {
  const site = input.siteUrl.replace(/\/+$/, '');
  const modUrl = `${site}/mods/${encodeURIComponent(input.modId)}/`;
  const name = input.author?.trim();
  const modName = escapeHtml(input.modName);
  const steps = profileSteps(input);
  const more = input.moreMods ?? [];
  const andMore = more.length ? ` and ${more.length} more ${more.length === 1 ? 'mod' : 'mods'}` : '';
  const verb = more.length ? 'are' : 'is';
  const moreList = more.length
    ? `
    <p>Also live:</p>
    <ul>
      ${more
        .map((m) => `<li><a href="${escapeHtml(`${site}/mods/${encodeURIComponent(m.id)}/`)}">${escapeHtml(m.name)}</a></li>`)
        .join('\n      ')}
    </ul>`
    : '';

  const html = `
    <p>Hi${name ? ` ${escapeHtml(name)}` : ''},</p>
    <p>${
      input.isEdit
        ? `Your update to <strong>${modName}</strong> is approved and live on MustHaveMods.`
        : `Good news: <strong>${modName}</strong>${andMore} ${verb} approved and live on MustHaveMods.`
    }</p>
    <p><a href="${escapeHtml(modUrl)}">See your mod page</a></p>${moreList}

    <p><strong>${input.hasProfile ? 'Finish your creator profile' : 'Set up your creator profile'} (3 steps)</strong></p>
    <ol>
      ${steps.map((s) => `<li>${s}</li>`).join('\n      ')}
    </ol>

    <p><strong>Why list your mods with us</strong></p>
    <ul>
      <li>It is free, and you keep full credit for your work.</li>
      <li>Players find your mods through our search, category pages and guides.</li>
      <li>One creator page gathers all of your mods in one place.</li>
      <li>Your dashboard shows how many downloads each mod gets.</li>
    </ul>

    <p><strong>Coming soon</strong></p>
    <p>We are building a mod feature section that will highlight creators' mods to the ${FEATURE_SECTION_AUDIENCE} who use MustHaveMods. Mods listed with us will be first in line.</p>

    <p>Questions? Just reply to this email.</p>
    <p>Olivia<br>MustHaveMods</p>
  `;

  return {
    subject: input.isEdit
      ? `Your update to ${input.modName} is live on MustHaveMods`
      : `${input.modName}${andMore} ${verb} live on MustHaveMods`,
    html,
    from: APPROVAL_EMAIL_FROM,
    fromName: APPROVAL_EMAIL_FROM_NAME,
    replyTo: APPROVAL_EMAIL_FROM,
  };
}
