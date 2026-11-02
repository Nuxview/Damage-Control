# First playtest and demo

## A 5-minute rehearsal

Use two performers in a call and a moderator with the private moderator invite (from Room setup). Each link opens a dedicated participant page. Creators handle statements, mic handoffs and timers; the moderator publishes contributions and records claims. Creators and moderators have separate credentials and permissions.

1. Create a rehearsal room. Follow setup one step at a time: share each participant link and have each page confirmed. Each creator names themselves in their own page; no manual sharing checkboxes are needed. Use Back/Next to revisit a step. Choose the airline/wedding incident, finish setup, then start the opening statement. For a solo check, open the creator, moderator, and audience links in separate tabs.
2. Creator 1 explains it. Moderator pins one actual claim.
3. Moderator sends the destination-wedding talking point to the private adviser panel.
4. Open the floor. Feature “Does the bride know?” and pass the mic to Creator 2.
5. Pin Creator 2's response. Ask a follow-up that quotes the first claim.
6. Use the shared correction once; verify the original stays visible in the studio.
7. Make the closing statement, finish, and start another round.

Ask: could both creators read the situation? Did the private advice stay private? Was managing controls distracting? Did the second question build on the first? Improve pacing before adding features.

## Before recording a Twitch demo

- In a live room’s first setup step, use Connect Twitch for a consenting real channel, then have the partner authorize their distinct channel from their own creator page. App credentials in `.env` do not authorize either account.
- Send one real `!question` and `!spin` from a viewer account. Confirm source attribution, private review, and explicit publication.
- Test a real Shared Chat session if you intend to demonstrate it; fixtures are not a live test.
- Add the read-only source to actual OBS at 1920 × 1080. Put creator cameras in separate OBS sources.
- Test a network interruption, reconnect, and manual timer resume.
- Record creator permission and don't expose `.env`, OAuth URLs, tokens, invite links, or local storage.

## Suggested video, under 3 minutes

- 0:00–0:15: Explain “Your partner said it. You have to defend it.”
- 0:15–0:45: Show both creators and the incident; one opening claim.
- 0:45–1:30: Show a real Twitch viewer question entering the private inbox, explicit approval, and the partner defending the answer.
- 1:30–1:55: A callback question and the one shared correction.
- 1:55–2:15: Closing statement and record of claims.
- 2:15–2:45: Show actual Codex build history and explain the privacy/correction tests.

Keep rehearsal content labeled. Review the current organizer requirements before submitting the repository, video, description, and verified Codex session ID. The private repository must be accessible to judges according to those requirements.
