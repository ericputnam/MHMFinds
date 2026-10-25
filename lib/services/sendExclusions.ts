/**
 * Code-only send exclusion list (Cass, E54/E68, 2026-09-20).
 *
 * Why this exists: the re-permission day-1 batch (2026-09-16, 100 accounts)
 * produced hard bounces, and there is nowhere in the schema to record a bounce
 * (no `bouncedAt` on `users` or `waitlist`; adding one is Tier 2). Until then,
 * every later `--offset` would re-attempt the same dead addresses and every
 * later batch would be judged on them. Re-sending to a `5.1.1` address buys
 * nothing and costs sender reputation on the one mailbox we send from.
 *
 * The list holds SHA-256 hashes of the normalized address (trimmed, lower-cased),
 * never an address. The hashes are produced by
 * `scripts/agents/mailbox-dsn-count.py --hashes`, which reads the DSNs in the
 * sending mailbox read-only and prints counts + hashes only.
 *
 * Bounces (and, since E270, scripted-shaped sign-ups — `SCRIPTED_SIGNUP_HASHES`) are
 * keyed here in the module, not the caller, so every send path that uses
 * `partitionExcluded` inherits the exclusion.
 */
import { createHash } from 'crypto';

import { isScriptedUsername } from '../funnel/signupQuality';

/** Same normalization as `normalizeRecipients` in bulkMailer and the DSN counter. */
export function hashRecipient(email: string): string {
  return createHash('sha256').update(String(email ?? '').trim().toLowerCase(), 'utf8').digest('hex');
}

/**
 * Hard-bounced recipients. One line per address, with the batch and the DSN class
 * that put it here (counts only — never the address, never a domain).
 *
 * 2026-09-16 re-permission day-1 (`--offset 0`, 100 attempted), read 2026-09-20 10:54Z
 * (≥20 h): 7 distinct hard-bounced recipients = 5× `5.1.1` no such user, 2× `5.2.2`
 * mailbox full (permanent after retries). 3 soft `4.2.2` notices are NOT listed —
 * a soft bounce is not evidence the address is dead.
 */
export const EXCLUDED_RECIPIENT_HASHES: readonly string[] = [
  '88ad67328c57ede044c3d750b736aa2e76ceba23e87d6942313de3ebc3d31c80', // day-1, 5.x.x
  '80f8505232c3a758d0b2de9aff1e787d5841fc7aacf778d4a1bd054f83799318', // day-1, 5.x.x
  'a1a6a3b2e2bad4972e4a857637d1ad048aa851a710537d7899ebe512257be62e', // day-1, 5.x.x
  '0e6eb869ae12b364efb6c33237602a67026e1b6b1bd1377601d32024c108f310', // day-1, 5.x.x
  '18bb02f6f7a5e5870b437b515c3e7cce10b8fdae6ad0d0a2291ad6b932b1eb35', // day-1, 5.x.x
  'e9aad8397f610054a476e079b23fbe3713dbdd57130307761324cd1e7c42812e', // day-1, 5.x.x
  '84be038d2138135f11ab2c600efa0b84061853a937ac1cef8e110db164ac5ce4', // day-1, 5.x.x
  // 2026-09-21 re-permission day-2 (`--offset 100`, 100 attempted), read 2026-09-24 13:45Z
  // (`--since 2026-09-21`, ≥72 h): 5 distinct hard-bounced recipients = 3× `5.1.1`,
  // 1× `5.2.2`, 1× `5.5.0`; 0 soft, 0 complaints. Cross-check `--since 2026-09-16`:
  // 12 distinct hard all-time = the 7 above + these 5, disjoint, none left over.
  '7b8599a5d2e849b96648c2fb59401ca996a4a9db11582e37a04b9b05dd35453f', // day-2, 5.x.x
  '75d6576befbf6c90997da29b3ff8d667681251ad482aacc0431ac6493106c71d', // day-2, 5.x.x
  '428b8c3f5bd010ab44b4f87f0f6da8571cd1c6139971b502dd559e88764bb58a', // day-2, 5.x.x
  '734622e399efe5fdf59fc0f375cf48616a7ad90831e8eba4b095d844dc5b1bf4', // day-2, 5.x.x
  'c7bf3d6ec4f2681a1efe3a749837ebb52cb3c0dae60eb76a81b19bb51541f641', // day-2, 5.x.x
  // 2026-10-15 weekly issue 06 run 1 (100 attempted, 99 sent): 1 synchronous reject,
  // hash taken from `rejects[]` in reports/funnel/newsletter-sends.jsonl (E205), SMTP
  // code not parsed (null). Matches exactly 1 waitlist row, subscribed before issue 05
  // (10-11), whose single `failed: 1` was a 550 — i.e. rejected on two consecutive
  // issues, not a one-off transient. Added before issue 07 (Cass, E226, 2026-10-17).
  '00e8bfa8afd6244ae1bcc3d3c206cfd7b50a93087b916fd9f5d5d419875af046', // weekly-06, reject
  // 2026-10-19 weekly issues 05 + 06 (runs 1 and 2), read with `mailbox-dsn-count.py --since
  // 2026-10-11 --campaign all --hashes` (Cass, E240): 13 hard DSNs (3x 5.7.1, 3x 5.1.1,
  // 3x 5.5.0, 2x 5.1.3, 2x 5.1.0), 10 distinct recipients, 0 soft, 0 complaints. Every hash
  // matches a live waitlist row; 3 of them bounced on both issue 05 and issue-06 run 1, and
  // 7 are issue-06 run 2 subscribers (7/53 = 13.2% of that cohort vs 3/96 = 3.1% of issue 05's).
  // Until 10-19 the counter attributed these to "other" (encoded-word subject), so none was listed.
  '1a4c3aa328048eed368dd38b825da182cc44bc54ab18a160645d0c4ea8635541', // weekly-05/06, 5.x.x DSN
  'ce172e84804f7c9547db4348d6632028b3f65779f6489c552ba6cba5553aa1ae', // weekly-05/06, 5.x.x DSN
  'b0d1f576b8dfafb4ee4e3919afd1cf0d1d4cff67ca89729845bb306b019c4217', // weekly-05/06, 5.x.x DSN
  'd8dcfc02becc3abafcf5bc3823fe08cf6bb812b9695bd987306162d1d1dc353c', // weekly-05/06, 5.x.x DSN
  '62f84f30ed1d63c9bf4afef6064df90ad35a48f2b5bbc119c50a7b360eeba156', // weekly-05/06, 5.x.x DSN
  '8de0468ede621befbc8ab2d75913dcec68ece579c3809e7a7b92d2b893e56942', // weekly-05/06, 5.x.x DSN
  'bfa0edb38089de509290da6d9c8b2230a31c651c369ec8781d3a9a06badf7f61', // weekly-05/06, 5.x.x DSN
  '53400f9602335d90f14b52df81926a224edc57913c310e7b57339680051fd112', // weekly-05/06, 5.x.x DSN
  'a09bf8178846bbb1d46278ff188f214424a8061f1fd85577cc89d36dbb83aac0', // weekly-05/06, 5.x.x DSN
  '5c4992b0a05759717b456266ead65f14d79065ace2ee9cfa052556c36e5c8f3a', // weekly-05/06, 5.x.x DSN
];

/**
 * Scripted-shaped sign-up subscribers (Cass, E270, 2026-10-25). Not bounces: these are
 * `signup-optin` rows created by the form-posting script Nova identified (E260, Q33) —
 * credentials-form accounts whose username is letters-only with >=6 case flips
 * (`isScriptedUsername`, lib/funnel/signupQuality.ts). Mailing them costs sender
 * reputation (they are throwaway or harvested inboxes) and grades every send on a
 * population that is not human. Same storage rule as the bounce list: sha256 only.
 *
 * Produced by `npx tsx scripts/agents/scripted-signup-hashes.ts`, which applies
 * `scriptedSubscriberHashes` below to the whole `waitlist` and prints counts + hashes,
 * never an address. Classified by rule, not hand-picked. The snapshot is not the only
 * defence: `scriptedSubscriberHashes` is re-run by the weekly send script before every
 * run, which refuses a LIVE send while any scripted-shaped subscriber is missing from
 * this list (the sign-up route is not gated — Q33, Tier 2 — so the set keeps growing).
 */
export const SCRIPTED_SIGNUP_HASHES: readonly string[] = [
  // 2026-10-25 snapshot (E270): 107 scripted-shaped signup-optin subscribers of 262 waitlist
  // rows; 6 of them already sit on the bounce list above, so 101 are listed here.
  '00317900be457002eac888077e34a0c2d5cdc90b6df6ba5edcad4a9a80e98b77', // E270 scripted-shaped signup-optin
  '02d6120334e71a0b18e14b2ce68f5b1d60a11b034d67953dc4729c0ececac526', // E270 scripted-shaped signup-optin
  '04f321e394404b33e74293bca57820d62065a9d8ae694f08bf124ef9bc4e3f58', // E270 scripted-shaped signup-optin
  '0ad91e30fec9ed4f48cce1f552215e2cb5579f37ae4d469b6ffab218a04f1dc8', // E270 scripted-shaped signup-optin
  '0ccca1ea3d4b5f51e9b410bf19f4645cd8a1ecc0c8cff150b3c3f13a9dad1c43', // E270 scripted-shaped signup-optin
  '0db6c31a4c3c6167d098223973e3e112040c5e8d2d9209437ca0a7d86456eedb', // E270 scripted-shaped signup-optin
  '0ea307afdf71e938fbcb7ca04a243165f2a4b7d610d074998fc13951b35579e9', // E270 scripted-shaped signup-optin
  '0ef5f33664162d217c093bb00b9a795910ae71882372a5febe68d54aa0a8a5c1', // E270 scripted-shaped signup-optin
  '116aef83a4de8e379ed073cf0b288daa374a16c04351a1f810bf7ead0fc3bca8', // E270 scripted-shaped signup-optin
  '160af63e79b2cf2b112aa42d403cc9472dd4da6639748665b3bb059ed4ddf1f8', // E270 scripted-shaped signup-optin
  '17104567b181977713d68d7b7f58c4f36c2161e73f9a84db6baaf3a51f8a9481', // E270 scripted-shaped signup-optin
  '1c82a4f9e0af224a713d1ff1c7324f6353e218fe765ea25f39a2a07438f0f91d', // E270 scripted-shaped signup-optin
  '1c9f7d6bcd9d022a3efc2381f07b552dc2d1f5e779efb74686d7b48bad8f248c', // E270 scripted-shaped signup-optin
  '1ef987fb239bcbe049ab0619af63450698e83ebba58bfbdee840f42f1f073c27', // E270 scripted-shaped signup-optin
  '1f88b3fba7bf528ef03c06a6d05d22d3e3688a7d2b8c0ed3b40b8afbbd2e17cf', // E270 scripted-shaped signup-optin
  '200d854b5842dd726e34b3fff0c1d5779964f1fb8f8f281bbc79d96d97bdae39', // E270 scripted-shaped signup-optin
  '23602bd2f77b20ed81ed585bf112b841df952b4a2a4a56ac19786e6a770b2798', // E270 scripted-shaped signup-optin
  '267cf543d8057d85fb05386ba73f7033d5ac92cae30f1acb40ca1b87628307eb', // E270 scripted-shaped signup-optin
  '294ae2c3ab396d764e3279002614ed467557ad8cdc249b95702c51ceeb10860f', // E270 scripted-shaped signup-optin
  '2b9ef2f304a6e75b7f03e36760b5c73a99ff2e529bbbb655cd96a174180b860f', // E270 scripted-shaped signup-optin
  '2d9a7e6dc75b9fbeeea8d3262921989a62f32316c940da091829835b2ffd778a', // E270 scripted-shaped signup-optin
  '2ec2c6490fb8862f1335ecfe07da20e85b7bbecd951845f3ba687d2c8c239e80', // E270 scripted-shaped signup-optin
  '34355dd4c09587f32b9ff0af5344ae20cb31ab79b79be6319b319ba2de1062a6', // E270 scripted-shaped signup-optin
  '3613f3940f5f53cdb0a6fa263efc77e8495f0a55e96997864eb62842b68a08e8', // E270 scripted-shaped signup-optin
  '363426ec585058620a971ad2237cf1e373a50eebdb9bc2a49928d7baad3e4ea2', // E270 scripted-shaped signup-optin
  '375aaad152cc9800f9e42001f7f9705620027ea5ca131c22d292bcb5c57d1f24', // E270 scripted-shaped signup-optin
  '44d2706da3e08ae177545a85be1310c5ba6ca01014c7b857eb30d42a9f0d6853', // E270 scripted-shaped signup-optin
  '46050153ae2d100c0d04eb4ccbd42900827f214e9de3b53a4b336e1f4971a48e', // E270 scripted-shaped signup-optin
  '4616b38182d0e2a90f4171822c48bea1eb25199d97347f9b1df1ef31cf256b91', // E270 scripted-shaped signup-optin
  '4666d510b7592329bf8ec5ba1d34ea81953b139247d0e5e0a34725ed99e351b5', // E270 scripted-shaped signup-optin
  '49738c22b956dd271e31b3556c2257f16c65c37dda24488fcca3a7cd72e44eaf', // E270 scripted-shaped signup-optin
  '4f1ebe30614d36e61b76eb6418bdf54d3ad030467772081d9cb09ff60b698e83', // E270 scripted-shaped signup-optin
  '4fd44f407b35cf7c4b6e1e768c4313ddc66bdb289d652b2224a191b585142493', // E270 scripted-shaped signup-optin
  '536aa8986e82cc167d4704c28cec07810ae6c247f5f65982f044cc6b1d4c7ece', // E270 scripted-shaped signup-optin
  '5371e72e46587a9e632566b9da6c951b0558d0c59c127b84fa76bc36882cf1e9', // E270 scripted-shaped signup-optin
  '545e8816f858f46f9cfdd7a3bc33b8fadbbf5eeb43e4deabf359c6e61f13b278', // E270 scripted-shaped signup-optin
  '55be53e66dc40a69853d1b5bc8ddb32f5411302f55ce840e386b65675f63d170', // E270 scripted-shaped signup-optin
  '57880e83fb942f8c691d9984aed964202405324f96054c1500075471e6b1a965', // E270 scripted-shaped signup-optin
  '5e373fa83c191026eaa29f5e06d936e3cd37a549b8e963b179212515aaf599e8', // E270 scripted-shaped signup-optin
  '5f4c65a6e98badf1ba37c3f6e9bae1fff2f14248bf2477952b3bc3ba4459f6ed', // E270 scripted-shaped signup-optin
  '6282f69551d0bdec3e18e44669da2af4bef7c21e31c9a608396bac76cab8f242', // E270 scripted-shaped signup-optin
  '65efe1b77fa2164f7099d6ca38b6b4b2314a1c560b5ddb890065531e6aed1ee5', // E270 scripted-shaped signup-optin
  '6c546e1eb516300ca76c8b5977f76f8e6701c76f48c6732a8d802314350156a2', // E270 scripted-shaped signup-optin
  '6d96c73298b94fb7f5d62b141eab9478026806807a86cfb5886ec78f2c62ef98', // E270 scripted-shaped signup-optin
  '6da482581c44732141506f9ca326fe00841aca632613692975146ef315afc24d', // E270 scripted-shaped signup-optin
  '6e518724cd3c30686124f9efa5958c544da4dc39881f6e96ff416e2da42d5eff', // E270 scripted-shaped signup-optin
  '6ed778dd077542ce1041038c3ec6c15f1faef4fbcbe7227dd86169984fab5e22', // E270 scripted-shaped signup-optin
  '6fbb0fe437310f09a86a83b6a037fb6e83e63f1f8a1e0a2f38b878b62d897045', // E270 scripted-shaped signup-optin
  '758ab0fac6477e72b10f077dc18fbf1615e470af11c40b7470d7ff4419b78424', // E270 scripted-shaped signup-optin
  '76c9459774319a41e31324657b9d80554e5c42b7487b2053148a8537bd8cf946', // E270 scripted-shaped signup-optin
  '7bf30b17096a705fbe510f24a83660acb3d37cc93a0e6bd3eac8a4f0fbf2e63e', // E270 scripted-shaped signup-optin
  '7c8b1dd8388f88c1bc1f8811e3ca4127e6c3f003bace1670df591daa148d1691', // E270 scripted-shaped signup-optin
  '7c9d0c5115f37cca26f31543bbeca79cc3def4a3b76f33d550d17f2bcf0519c3', // E270 scripted-shaped signup-optin
  '82968142afbe73599057090e56732f8dd8bb53e975672d1ed42b6212433de7d7', // E270 scripted-shaped signup-optin
  '86c1ae4893281ca554b8c86da4e00dbd55380896150805ff83d71f43da09daf4', // E270 scripted-shaped signup-optin
  '89b1e795473d4d8570b0dbaf31ebf66d694f8f9db08a45db8f9b47ef78d77a0b', // E270 scripted-shaped signup-optin
  '89f8db389aea48a1812f899018badacdbc0ba2835e903b9715a7c77413a4acbf', // E270 scripted-shaped signup-optin
  '8bff1a8d07f1a0ade8ccbd818a1e13733032154d48165065cf7d1e23005c4eca', // E270 scripted-shaped signup-optin
  '940aa030ec5a81d7c3b64d28461a23cf4e5a717fc5fc10ee91f778dd48442daa', // E270 scripted-shaped signup-optin
  '99d8fdf9bbac8bb2c1c788ac0f6772c477c85387074b5856ca32d618878bc18a', // E270 scripted-shaped signup-optin
  '9ab1bb861959259e994312df63412b8efdf31881440cf91cfdf26abdf599ef8c', // E270 scripted-shaped signup-optin
  '9c9fbeb014f2b697fb8b30700a39ee7cf4991cdf9aecace99ee625a8ff815381', // E270 scripted-shaped signup-optin
  'a3bbad8f970cbaf1bc39734a6cc8a9fe7e47c06d4a6e358d21efd8cbf9d9af0e', // E270 scripted-shaped signup-optin
  'aca33e2d95ac0965655eb662d3fa1488d78c076a84079c0e9f94599c03816f56', // E270 scripted-shaped signup-optin
  'b9299d91306656f2ea58be1d884c72048a000a7239d011d4759de591aa8dd4c9', // E270 scripted-shaped signup-optin
  'b9326b312928a055b7c31c6ad573caa88a500254d37c0e718857cca02dfa80e6', // E270 scripted-shaped signup-optin
  'b9f6800a7466b958ee9a67f744f74277da977698da9842fc8942e333adb1af7a', // E270 scripted-shaped signup-optin
  'ba63b7ac7771523e74dfc9c26b4db5df6123bc3e1c9dba298dbb258e6586328a', // E270 scripted-shaped signup-optin
  'bae9e536cce2e348d9ea6d75916a46c83433677d92d00a0ca8e542cdd368eff5', // E270 scripted-shaped signup-optin
  'bb8c1f2eda301e79bd81e9de25aad5b6602a5b214171090d27c321654b34fe28', // E270 scripted-shaped signup-optin
  'bcbf0714f25f1c831d83ab250e68bcd56ec9c72f4c8029a7e15a1788b7ab136f', // E270 scripted-shaped signup-optin
  'be7419dc2778303cd31255f1e4287ca5266a44068070534416e9ff0bcf078ff6', // E270 scripted-shaped signup-optin
  'c3c6ee012981b01d9821047402e21b82600cc1747c055989a82eece8e7f45d93', // E270 scripted-shaped signup-optin
  'c48d8d30eb39468ba50234e85712af646513588e4ab3c6f41f408c1a2dce8434', // E270 scripted-shaped signup-optin
  'c83cbc7b072b9e5ab2db6c348c1aad1db77fdbc69cc2927148763cd25bc6a856', // E270 scripted-shaped signup-optin
  'c83ee32cfc3d3f2bd53b639f5ba487abfc44cb3fda19184427aac4414f76716c', // E270 scripted-shaped signup-optin
  'c9b27bf3a4cf2aea9fd61444b5d32080d578405cf40c7a529de02dd9c2f9fc47', // E270 scripted-shaped signup-optin
  'cab0b2d6b8281e3fa9ea71983ccb3c675762de1c9153e68295969be551caa8da', // E270 scripted-shaped signup-optin
  'd0541b6e858066005f8cc858ec7e13994ea3fbe8776eb193dd6aff1c6eea38ad', // E270 scripted-shaped signup-optin
  'd183cabb1e67c2ad283a768f8c17f8461e563b255dac41388a737fddca31abc9', // E270 scripted-shaped signup-optin
  'd284be7b00c8dd4d1abfb130d27439a128609a078e614a3d6c4aa3f1dc62c281', // E270 scripted-shaped signup-optin
  'd2c08a14edab2b9af85d53a7d7f98ebe1e9660796e122b00b1fd29d5df0be10c', // E270 scripted-shaped signup-optin
  'd64a636b5b0c58c32e81ffc2fa987bdf4e6b80400786394ad1c0054cf259ad4d', // E270 scripted-shaped signup-optin
  'd68684a8f8e6e5fdbf0c2a0bd43ff6af1f2f0f6aab04d8b280b76ac0e1447293', // E270 scripted-shaped signup-optin
  'da6288f080904ece3aac0085bb8edad44247798defd9e5b9c895fa06deb7b3d3', // E270 scripted-shaped signup-optin
  'dcb58e3f73f6a7dc1f76ff0d47c42e64f5c6eb62e838c40c322afce9be2cab67', // E270 scripted-shaped signup-optin
  'dd6051f9cc0175ce916d65940c051398e4d4b5faba6af3ae086e35d1aec7a4b3', // E270 scripted-shaped signup-optin
  'df213976a5cf4a4081cffc992985f12fd3c79eccc9877ff385381224a11265d2', // E270 scripted-shaped signup-optin
  'e0f4f9c6c46d4e6e5052d7b41383ab5608f1521d5574f26422f967aa1d06d25c', // E270 scripted-shaped signup-optin
  'e11153dbe362c8126e11eb27e93c2098805aa5bb2dad9c416259d7aabf5b3c90', // E270 scripted-shaped signup-optin
  'e614ed01b5c81b9fa5db047e081b4673f79508301dc04609408c86be6efa6b93', // E270 scripted-shaped signup-optin
  'e6d53b37d3928043f04ca1c8e60048863ee60d21f2c146174a188d3d6fc5b0e6', // E270 scripted-shaped signup-optin
  'e8cfe26b4e476f3ed2031092e5881c4a8393205cac44f17088571d7a3e90010e', // E270 scripted-shaped signup-optin
  'ee6a3fdc9ae21cd4eea203df60426539da11779aadae3e5edffcc7b09814d90f', // E270 scripted-shaped signup-optin
  'ef4dc756da74d0a8de26a4479090fa70383b343975fb7334d0c22669b979978a', // E270 scripted-shaped signup-optin
  'f29e0ca864e5eccbb7098feeac355aa12ac9c002e186c148c5de35cd752c5203', // E270 scripted-shaped signup-optin
  'f2d8abd5a29ab1eef5dd160a639449b618eaaf36d3b82a230702043891126cf5', // E270 scripted-shaped signup-optin
  'f6669707d19b1bb95947e4f799201b5c8136cd81343310226b06d5d8afa2c84e', // E270 scripted-shaped signup-optin
  'f9a67b03eaf4bd053bc6edda8c56524d63801a564aa238fcea7c0893f5e31661', // E270 scripted-shaped signup-optin
  'fbf63e4dcb9832e6f266066a13223f32c8495fda689ab22af5d4e5f1224784bc', // E270 scripted-shaped signup-optin
  'fe2f842d38ba57425b8ad2be45c055f61662d79fadd5eb2f8b126955c6f70b0f', // E270 scripted-shaped signup-optin
];

/** One subscriber row joined to its account, as the classifier needs it. No address leaves this module. */
export interface SubscriberAccountRow {
  email: string;
  /** `waitlist.source` — only `signup-optin` rows are considered. */
  source: string;
  /** The account's username, or null when no account shares the address. */
  username: string | null;
  /** The account has a `credentials` provider row (the sign-up form), vs OAuth only. */
  isForm: boolean;
}

/** The E260 rule applied to subscribers: sign-up opt-in, form account, scripted-shaped username. */
export function isScriptedSubscriber(r: SubscriberAccountRow): boolean {
  return r.source === 'signup-optin' && r.isForm && isScriptedUsername(r.username);
}

/** Sorted, de-duplicated hashes of the scripted-shaped subscribers in `rows`. */
export function scriptedSubscriberHashes(rows: readonly SubscriberAccountRow[]): string[] {
  return Array.from(new Set(rows.filter(isScriptedSubscriber).map((r) => hashRecipient(r.email)))).sort();
}

const SCRIPTED = new Set(SCRIPTED_SIGNUP_HASHES);

/** Hashes in `current` (a fresh classifier read) that the shipped snapshot does not carry. */
export function unlistedScriptedHashes(current: readonly string[]): string[] {
  return current.filter((h) => !SCRIPTED.has(h) && !EXCLUDED_BOUNCES.has(h));
}

export function isScriptedRecipient(email: string): boolean {
  return SCRIPTED.has(hashRecipient(email));
}

const EXCLUDED_BOUNCES = new Set(EXCLUDED_RECIPIENT_HASHES);
const EXCLUDED = new Set([...EXCLUDED_RECIPIENT_HASHES, ...SCRIPTED_SIGNUP_HASHES]);

export function isExcludedRecipient(email: string): boolean {
  return EXCLUDED.has(hashRecipient(email));
}

/** Split a recipient list into the ones we may send to and the ones on the list. Order preserved. */
export function partitionExcluded(recipients: readonly string[]): { kept: string[]; excluded: string[] } {
  const kept: string[] = [];
  const excluded: string[] = [];
  for (const r of recipients) (isExcludedRecipient(r) ? excluded : kept).push(r);
  return { kept, excluded };
}
