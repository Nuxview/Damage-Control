# Damage Control — fresh capture and separate voice-over

Use a fresh recording. Capture the app in short sections first, then record narration separately. The finished edit can be about 2:45, with a longer walkthrough kept for later if useful.

## Verify local recording before the real footage

1. Pick a recording folder. Start local recording in OBS or your screen recorder; streaming alone does not create the local file you need.
2. Record 20 seconds with a page change, app interaction and microphone sound.
3. Stop, find the saved file on disk and play it back. Confirm picture, sound and readable text.
4. Back up the real footage before editing. Keep usable takes; repeat only the affected section.

Twitch VOD availability is not the recording plan. Do not rely on it as your only copy.

## Prepare the app

- Use the reviewed working build and a live room with both accounts authorized. Set creator names and confirm the moderator. Viewers watch the livestream; a separate viewer page is optional and is not a setup requirement.
- Choose the fictional airline incident: **Your budget airline delivered every passenger to the same person's wedding.**
- Arrange actual Twitch chat and the public/OBS display together for the interaction shot. Keep creator and moderator windows ready separately.
- Hide secrets, private invite fragments and unrelated private messages. Use your own test chat messages.
- Keep this Codex chat ready for the build-process section. Session ID: `01a1882c-c255-7a13-97d0-d1a788a4d0e6`.

The following example claims are walkthrough data. The narration should say so; do not imply that two real performers were captured having a conversation. During actual play, the moderator records claims the creators really say.

## Pass 1 — capture the screen, without performing narration

| Clip | Capture |
| --- | --- |
| 01 — introduction | The audience card, fictional incident and two creator names. |
| 02 — opening | Start the opening statement. Pin the example claim `Every passenger is guaranteed a room.` from the moderator window. |
| 03 — real chat | Open the floor. In Twitch send `!question Does the bride know?`. Show it arrive privately, approve it, then show the question on the public display. |
| 04 — advice and mic | Send `!spin Call it a destination wedding upgrade.`. Approve the advice privately. Pass the mic and capture the new active creator and automatically restarted timer. |
| 05 — follow-up | Pin a second example claim: `They were upgraded to someone else's destination wedding.` Send and approve `!question You promised everyone a room. Is the honeymoon suite available?`. Show how the record gives the question context. |
| 06 — correction | Use the shared correction on the first claim: `Every passenger is guaranteed room for improvement.` Show the retained original and the spent correction counter. |
| 07 — next round | Close the conference and start another round. Show the custom incident editor in the creator page; choose a new incident and capture the OBS display updating. |
| 08 — Codex | Capture the actual Codex build conversation, a concrete playtesting request and its resulting change, then code/tests or CI. |
| 09 — ending | A clean audience-card shot for the final line. |

Allow at least **10 seconds between commands from the same Twitch account**. Capture each real result before moving on. Editing can remove waits, but must not imply a chat message arrived or a feature worked when it did not. Leave rehearsal content labeled if any appears.

## Pass 2 — record the voice-over

Record each paragraph as its own audio take. You do not need to click through the app or perform two character voices while speaking.

**0:00–0:15 — Hook**

“This is Damage Control: My Partner Said What? Two creators defend one terrible explanation while Twitch chat plays the press. I built it solo with Codex. This is a walkthrough of both creator roles.”

**0:15–0:30 — Opening and record**

“The incident is an airline sending every passenger to the same wedding. During play, the moderator records what the creators actually say. For this walkthrough, I’m using the example claim: every passenger is guaranteed a room.”

**0:30–0:55 — Twitch question**

“A viewer asks a question in real Twitch chat. It enters the private moderation inbox first. Approval publishes it on the audience display, giving the creators something to answer together.”

**0:55–1:15 — Private advice and handoff**

“Chat can also suggest terrible PR advice. Approved talking points stay private. Passing the mic changes the active creator and starts their next thirty-second cue automatically.”

**1:15–1:35 — Callback**

“The pinned record gives chat material for follow-up questions. Here, the promise of a room comes back as a question about the honeymoon suite. Each creator has to work with what their partner has already committed to.”

**1:35–1:55 — Correction**

“The creators share one official correction. In this example, the guarantee becomes room for improvement. The original stays in the record, and the correction is spent for both creators.”

**1:55–2:10 — Another round**

“After closing, the next custom incident is chosen directly in the creator page. The public overlay follows the new room state. The creators do not need to repeat onboarding.”

**2:10–2:35 — Codex process**

“I used Codex for the Flask backend, React interface, Twitch integration and automated checks. I directed the idea and playtesting. Feedback shaped separate participant pages, saved setup progress and custom incidents between rounds. This footage shows that build process.”

**2:35–2:45 — Closing**

“Damage Control: your partner said it. You have to defend it.”

Use your natural pace. Shorten a line or extend a visual hold to match the real edit; the timings are a guide, not a requirement for one uninterrupted take.

## Pass 3 — edit and review

1. Assemble the usable screen clips in order, then place the narration over them.
2. Cut false starts and dead air. Keep the real sequence of actions and results.
3. Keep the opening/correction/callback moments readable; avoid speeding through the text.
4. Add a simple “Solo walkthrough — example claims” label where appropriate.
5. Export, then watch the entire file from disk with audio. Check the end is not cut off.
6. Upload for review, check the processed version, then make it Public once the final video/title/description are approved.

## YouTube draft

**Title:** Damage Control — My Partner Said What? | Solo Build and Demo

**Description:**

Damage Control is a collaborative improv game for Twitch creators and their communities. Two creators defend a fictional incident while chat supplies journalist questions and terrible PR advice. A moderator controls publication, claims stay on the record, and both creators share one official correction.

Built solo with OpenAI Codex. This narrated walkthrough demonstrates both creator roles with example claims and real Twitch chat interactions.

Code: https://github.com/Nuxview/Damage-Control

This was built for my first solo Devpost hackathon. I missed the submission deadline while struggling with the demo recording. I’m finishing the project and sharing what I learnt from the experience.

Review every claim against the actual export before publishing. Do not announce a hosted version, a submitted entry or a reopened window before those exist.
