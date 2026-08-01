# NoxVote launch production brief

**Status:** LOCAL LAUNCH PACKAGE COMPLETE — corrected README identity assets, the 60-second story,
ElevenLabs narration and music, final motion, and the validated local MP4 are complete

**Date:** 2026-08-01

**Working branch:** `codex/demo-launch-kit`

**Working tree:** `/Users/abu/dev/hackathon/wtf-demo-launch`

## 1. Objective

Prepare one coherent launch package for the hackathon submission and repository:

1. a 60-second judged product-demo film;
2. a README that explains the product, proof, architecture, and limits honestly;
3. a small ORBIT identity system covering the logo, shallow README banner, clickable demo thumbnail,
   social card, and favicons;
4. deterministic architecture diagrams with editable sources.

The package must be based on the accepted ORBIT product and the current integrated frontend. It must
not change contract behavior, frontend behavior, or accepted trust claims.

## 2. Ecosystem message

> When a DAO needs somewhere for its private decisions to live, that place is Nox.

Product resolution:

> NoxVote brings confidential Nox compute to existing Safe and Governor governance: the DAO stays
> where it is, individual choices and exact totals stay off the public chain, and only the verdict
> needed to execute the pre-committed action returns.

Accepted motto and close:

> Where private DAO lives.

## 3. Audience and desired reaction

### Primary audience

- Hackathon judges evaluating product clarity, Nox use, technical proof, and demo quality.
- DAO operators who already use Safe or an OpenZeppelin-style Governor.

### Desired reaction

The viewer should understand, without needing a cryptography background:

1. why public live tallies and wallet-linked choices distort sensitive votes;
2. what remains public and what remains confidential;
3. how an encrypted ballot becomes a verdict and an exact governance action;
4. that the product has working Safe and Governor/Timelock paths, not only a visual prototype;
5. where the trust boundary and privacy limits are.

## 4. Truth boundary

### Verified and safe to show as proof

- The production Safe/module/core and Governor/core/real-Timelock paths ran on Ethereum Sepolia.
- The completed checkpoint contains `37/37` successful transactions.
- Both paths consumed real released-Nox `Passed` verdicts.
- Each path executed its exact committed target once.
- The post-run Forge suite passed `119/119` tests.
- The app presents proposal, cast, replace, privacy-floor, verdict, execution, receipt, and
  verification surfaces under the accepted ORBIT direction.

### Illustrative product scenario

The current interface uses a **1,000 USDC security-review grant** to explain the product. That is an
illustrative governance proposal, not a claim that the live Sepolia verification transferred 1,000
USDC. Any appearance of this amount in the film or README must be labelled as the demo scenario.

### Claims the launch package must not make

- The choice remains on-device or is encrypted entirely in the browser.
- The iExec Handle Gateway cannot see the choice during encryption.
- Voters are anonymous or participation is hidden.
- Nox provides zero-knowledge proofs, FHE, or MACI-equivalent receipt-freeness.
- A replacement makes coercion impossible; it is only a public coercion-recovery window.
- Handle access can be erased after it has been granted.
- The current single-node Nox KMS has threshold-Keyper compromise resistance.
- Remote CI, large-electorate performance, public deployment, or hackathon submission is complete.

## 5. Film recommendation

### Deliverables

| Deliverable           | Provisional format      | Purpose                                                   |
| --------------------- | ----------------------- | --------------------------------------------------------- |
| Judged master         | 60 seconds, 16:9, 1080p | Complete destination-to-proof product story               |
| README/social cutdown | Derived after master    | Reuse the approved story system if a shorter cut is needed |
| Silent loop           | 10–15 seconds, 16:9     | Optional landing/booth ambience without factual narration |

The 60-second duration follows the accepted `NoxVote in 60 seconds` brand-board treatment and the
user's explicit correction. It is the locked local master duration.

### Visual mix

- **Real product capture:** proposal detail, vote progress, receipt, privacy-floor state, verdict,
  execution, and verification center.
- **Generative ORBIT sequences:** the opening pressure metaphor, causal transitions, and the final
  identity close.
- **Evidence inserts:** restrained Sepolia transaction/proof readouts, never a terminal dump.

The film should feel like one continuous system rather than a stack of unrelated UI cards. One
left-to-right current carries the story from public proposal, through a private orbit, to a single
public verdict. Stillness precedes the verdict reveal.

## 6. Narrative spine

Use the feature-story sequence:

1. **Destination:** sensitive DAO decisions need somewhere private to live; that place is Nox.
2. **Pain:** live tallies and permanent wallet-linked choices create pressure.
3. **Product resolution:** the DAO stays on Safe or Governor while its private choice layer moves
   through Nox.
4. **Mechanism:** public participation enters a confidential Nox tally through an explicit Gateway
   trust boundary.
5. **Safety:** a privacy floor withholds low-participation outcomes; replacements do not inflate
   participation.
6. **Relief:** only `Passed` or `Rejected` becomes public.
7. **Proof:** the verdict can authorize only the pre-committed Safe or Governor action, once.
8. **Evidence:** `37/37` live Sepolia transactions and both exact targets executed once.

The timed version lives in
`.thoughts/launch/2026-08-01-noxvote-demo-script-v0.md`.

## 7. README and asset family

Follow the proven Stellar ZK Wallet README composition without copying its identity:

1. centered mark, product name, and one-line value proposition;
2. compact repository links;
3. a wide hero/banner;
4. a large demo thumbnail that becomes a clickable “Watch the demo” link after upload;
5. problem, product, how it works, proof, architecture, limits, and local run sections.

The README uses the corrected shallow banner and a clickable production thumbnail. Before a public
upload exists, both link directly to the real repository-local MP4 rather than a placeholder.

### Planned files and dimensions

| Asset               | Working path                       | Output                               |
| ------------------- | ---------------------------------- | ------------------------------------ |
| Primary mark        | `assets/brand/noxvote-mark.svg`    | Editable SVG                         |
| Primary mark raster | `assets/brand/noxvote-mark.png`    | 512 × 512 PNG                        |
| README hero         | `assets/launch/readme-hero.png`    | 1920 × 520 PNG, displayed at 960 px  |
| Demo thumbnail      | `assets/launch/demo-thumbnail.jpg` | 1440 × 730 JPEG, displayed at 720 px |
| Social card         | `assets/launch/social-card.png`    | 1280 × 640 PNG                       |

All identity work must use the accepted ORBIT authority: warm putty field, ink typography, ember as
a graphical/accent color rather than body text, Sofia Sans for display, JetBrains Mono for evidence,
and no generic neon-AI network imagery.

## 8. Architecture-image set

The first review set is rendered on this branch. Each architecture image has a Mermaid source beside
the PNG so factual changes remain reviewable before README integration.

| Diagram            | Question it answers                                        | Source and render                                      |
| ------------------ | ---------------------------------------------------------- | ------------------------------------------------------ |
| Product topology   | What is public, confidential, and trusted?                 | `assets/architecture/product-topology.mmd/.png`        |
| Ballot lifecycle   | What happens from cast through verdict?                    | `assets/architecture/ballot-lifecycle.mmd/.png`        |
| Safe execution     | How does a Passed verdict authorize one exact Safe action? | `assets/architecture/safe-execution.mmd/.png`          |
| Governor execution | How does normal queue/delay/execution remain intact?       | `assets/architecture/governor-timelock.mmd/.png`       |
| Trust and evidence | What is proven, disclosed, and explicitly not claimed?     | `assets/architecture/trust-evidence-boundary.mmd/.png` |

## 9. Production toolchain

### Selected skills

- `product-launch-video`: top-level gated production workflow.
- `feature-story-launch`: pain → consequence → proof → relief narrative.
- `motion-doctrine`: continuity, vector ledger, causal seams, and verdict stillness.
- `hyperframes`: final HTML/CSS motion implementation and frame rendering.
- `brandkit`: meaning-first logo and asset family, constrained by ORBIT authority.
- `faceless-explainer`: reference for diagram-led explanatory shots, not the top-level film workflow.
- `media-use`: narration/music/SFX orchestration.
- ElevenLabs `text-to-speech`: approved narration generation.
- ElevenLabs `speech-to-text`: transcript/timing QA after narration.
- ElevenLabs `music` and `sound-effects`: optional custom audio after storyboard approval.
- ElevenLabs `voice-changer` and `voice-isolator`: optional if Abu records a scratch performance.

### Not selected for this production

- `remotion-to-hyperframes`: there is no existing Remotion video to migrate.
- ElevenLabs `agents` and `speech-engine`: designed for live conversational agents, not linear
  narration.
- ElevenLabs `update-skills-from-changelog`: maintenance workflow, not production work.

## 10. Gates and next authorized actions

### Gate A — story, complete

The user corrected the story to a 60-second master and accepted `Where private DAO lives.` as the
exact motto. The locked storyboard and script live under `videos/noxvote-launch`.

### Gate B — identity, first production set complete

The accepted ORBIT mark is formalized as SVG/PNG. The deterministic README hero, demo thumbnail, and
social card are rendered from editable HTML sources. The generative contact sheet remains reference
material only because its small text is not factual production copy.

### Gate C — storyboard, complete

The autonomous six-frame storyboard is locked and production is authorized.

### Gate D — voice and score, complete

The master uses ElevenLabs George with Eleven v3 and a restrained 60-second ElevenLabs Music v2
instrumental. No credential is printed or committed.

### Gate E — local render, complete

The high-quality Hyperframes master is rendered at 1920 × 1080, 30 fps, and exactly 60 seconds. The
H.264 video includes stereo AAC audio and lives at `videos/noxvote-launch/renders/video.mp4`.

### Gate F — publication

The local README integration is authorized and complete on the launch branch. Public video upload,
public demo links, repository publishing, and hackathon submission remain separate explicit actions.
