# Damage Control — solo recording run sheet

Target: 2 minutes 40–45 seconds. You are the sole builder, demonstrating both creator roles. Use real Twitch chat; keep the demo clearly a solo walkthrough rather than implying a second performer is present.

## Prepare before pressing Record — 5 minutes

1. Keep the version that is working on your recording laptop. Stop UI changes until the video is uploaded.
2. Open one live room with both creator accounts connected. Finish name, moderator and audience checks before recording. Choose: **Your budget airline delivered every passenger to the same person's wedding.**
3. Arrange Twitch chat and the public audience display together. Have creator controls and the moderator inbox ready in separate windows. If OBS is already configured, capture the actual Twitch player/OBS output with the overlay. Avoid spending the hour building a new recording layout.
4. Have this Codex chat ready for the last shot. Show actual build history, not just a slide saying “built with Codex.” This chat's verified session ID is `01a1882c-c255-7a13-97d0-d1a788a4d0e6`.
5. Make a ten-second audio test. Close secrets, private invite URLs and unrelated tabs. Use your own test chat messages and no background music.

Commands from one Twitch account need at least **10 seconds** between them. The timings below already leave enough space. Type these into actual Twitch chat, not the rehearsal contribution form.

```text
!question Does the bride know?
!spin Call it a destination wedding upgrade.
!question You promised everyone a room. Is the honeymoon suite available?
```

## Take — 2:45 maximum

| Time | Screen / action | Spoken words |
| --- | --- | --- |
| 0:00–0:15 | Show the audience display and incident. | “This is Damage Control: My Partner Said What? Two creators defend one terrible explanation while Twitch chat plays the press. I built it solo with Codex, and I’m demonstrating both creator roles.” |
| 0:15–0:30 | Start the opening statement. Say the claim, then pin it from the moderator window. | “Our airline sent every passenger to the same wedding. Our official position: every passenger is guaranteed a room.” |
| 0:30–0:55 | Open the floor. Send the first `!question` in Twitch. Show it arrive in the private inbox; approve it, then show the public question. | “This question comes through real Twitch chat. The moderator reviews it before it goes on the audience display. Does the bride know? She does now. We’ve classified the ceremony as our arrivals lounge.” |
| 0:55–1:15 | Send the `!spin` command. Approve it privately. Pass the mic to Creator 2. | “Viewers can also send terrible PR advice. This stays on the creator’s private page. Switching to the second creator: our passengers weren’t diverted. They were upgraded to someone else’s destination wedding.” |
| 1:15–1:40 | Pin Creator 2’s claim. Send and approve the follow-up question. Show the record alongside the new question. | “The record keeps the creators committed to what they actually said. Now chat can ask a follow-up about that guaranteed room. The honeymoon suite? That is a difficult question.” |
| 1:40–2:00 | Use the one shared correction on the first claim. Replace it with **Every passenger is guaranteed room for improvement.** Show the original and the correction counter. | “We get one official correction between us. We meant room for improvement. The original stays in the record, and our correction is now spent.” |
| 2:00–2:15 | Make the closing statement, then close the conference. | “We got everyone to a wedding. We never said whose. That’s the game: a shared joke that the creators and chat keep building together.” |
| 2:15–2:40 | Show this Codex chat: one concrete user request, the resulting implementation, then the PR/checks. | “I used Codex to build the Flask backend, React interface, Twitch integration and automated tests. I drove the idea and playtesting. Feedback led to separate participant pages, saved setup progress and custom incidents between rounds. The current version has 59 passing backend tests and a passing CI build.” |
| 2:40–2:45 | Return to the public display. | “Damage Control: your partner said it. You have to defend it.” |

## Exact claim text to pin

Only pin these after saying them in the take:

- Creator 1: `Every passenger is guaranteed a room.`
- Creator 2: `They were upgraded to someone else's destination wedding.`
- Correction to Creator 1: `Every passenger is guaranteed room for improvement.`

## Keep the take moving

- Skip login, OAuth and setup clicks in the video; show the connected room immediately.
- Prioritize a real chat → inbox → approved display moment over showing every feature.
- If you stumble, pause and restart that short segment. Remove dead air; do not cut footage to imply a message arrived when it did not.
- If real chat stops arriving, spend no more than five minutes diagnosing it. A rehearsal segment must stay labeled, and a rehearsal-only video does not demonstrate the Twitch path requested by the organizers.
- Upload while filling Devpost. Do not wait for perfect editing, a thumbnail or music.

## Suggested YouTube title and description

**Title:** Damage Control — My Partner Said What? | Codex x TwitchCon Demo

**Description:**

Damage Control is a collaborative improv game for Twitch creators and their communities. Two creators defend a fictional incident while chat supplies journalist questions and terrible PR advice. A moderator controls publication, claims stay on the record, and both creators share one official correction.

Built solo with OpenAI Codex. This recording demonstrates both creator roles in one walkthrough, using connected Twitch chat.

Code: https://github.com/Nuxview/twitch-codex-hackathon/tree/feat/damage-control-mvp

Review the description after recording and remove any sentence that does not match the actual footage. Use **Public** visibility to satisfy the stricter wording of the official rules.
