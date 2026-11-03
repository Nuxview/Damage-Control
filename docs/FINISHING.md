# Finishing Damage Control

The hackathon deadline was missed. The project is continuing as a working prototype, demo and learning project. A possible submission reopening is unconfirmed; continue without assuming eligibility has changed.

The canonical repository is https://github.com/Nuxview/Damage-Control. PR #1 is merged into `main`.

## 1. Finish the app

- Collect the remaining issues from the latest playtest before changing behavior. Fix problems that interrupt joining, real chat, moderation, the public display or a complete round first.
- Recheck two rounds: first choose a custom incident, then edit or reuse it in the next round. Both creator pages should follow the same room state without repeating onboarding.
- Check a real `!question` and `!spin`, publication to the correct views, the mic handoff, claim attribution and the single shared correction.
- Keep rehearsal clearly labeled. Live chat has been reported working; broader broadcast/recovery checks remain separate.
- Freeze one working demo build after this pass. Cosmetic ideas and larger features can wait for feedback.

Current checks: 65 backend tests, Ruff and TypeScript pass. A browser rehearsal verified setup without a viewer page, a paused-timer mic handoff restarting at 30 seconds, and the same overlay URL showing a new custom incident in round two after a delayed public update. Native OBS and real Twitch were not rechecked in this pass.

Ready to move on when: the remaining demo-blocking issues are resolved and one full round works predictably on the recording laptop.

## 2. Record locally and verify the file

Use [DEMO.md](DEMO.md) for the story and shot sequence. Capture the screen in small sections, then record voice-over separately. Completing a short, usable segment matters more than getting one perfect uninterrupted take.

Before the real take:

1. Choose a local recording folder and confirm there is enough space.
2. Start **local recording** in OBS or your recorder. Streaming alone is not a local recording, and Twitch saving a VOD must not be assumed.
3. Record 20 seconds containing test microphone sound, a page switch and a real chat message reaching the app.
4. Stop recording. Find the saved file and play it back from disk. Check picture, microphone and app text readability.
5. Only then record the real segments. Keep the raw recordings and a backup before editing. Real narration is recorded in a separate pass.

Suggested segments: hook; incident/opening claim; Twitch question and moderation; PR advice/mic handoff; correction/closing; Codex build process. A stumble only requires another take of that segment.

Ready to move on when: the actual files exist and each required moment has a usable take.

## 3. Edit and publish the video

- Keep a roughly 2:45 version ready for a possible hackathon submission. A longer walkthrough can be a separate video later.
- Trim false starts and dead air. Preserve the real order of messages, moderation and results; cuts must not imply functionality that did not work.
- Add a short note that one person is demonstrating both creator roles. Keep real Twitch chat and rehearsal footage distinguishable.
- Show the actual Codex build process as well as the product.
- Export, then watch the entire exported file with audio before uploading.
- Upload and let processing finish. Review the title, description and visibility before making it public. Check the final watch link in a signed-out/private window.

Ready to move on when: a reviewed, playable public YouTube link exists. No video has been recorded, edited or uploaded as part of these documents.

## 4. Share the experience

Drafts are in [SOCIAL-DRAFTS.md](SOCIAL-DRAFTS.md). The shared account is straightforward: first solo Devpost hackathon, a working prototype, a missed deadline, a recording workflow that was checked too late, and concrete changes for next time.

- Review the Medium article first as the full account.
- Use the shorter LinkedIn post for the main lessons and project link.
- Use the Instagram caption/carousel copy with actual product captures and short demo excerpts.
- Add the real YouTube URL after the video is published. Do not announce a hosted playtest or a reopened submission window unless either is confirmed.
- Review the final copy and media before publishing. These are drafts, not posts that have been sent.

Ready to move on when: the video and the chosen posts are published with accurate, working links.

## 5. Host a small feedback build — last

Hosting comes after the demo and posts, as requested. Existing Docker/Render files are deployment drafts and have not been included in this documentation work or deployed.

Before a public try-it link, review the hosting configuration, cost and the prototype's constraints: one backend process, SQLite persistence, in-memory Twitch connections, a 100-room database cap and no room expiration or per-person accounts. Start with an invited feedback group that fits those limits.

Verify HTTPS, persistent room state, real OAuth callbacks, both creator accounts, the public display and reconnect behavior on the hosted instance. Local room URLs and tokens do not transfer automatically.

Ask testers:

1. What did you think you were supposed to do?
2. Where did you get stuck or need an explanation?
3. Did a chat question create a callback to something already said?
4. Was the moderator able to keep up?
5. Would you play another round with a collaborator? What would make that easier?

Ready to move on when: a small group can play a complete hosted round and you have actionable feedback.
