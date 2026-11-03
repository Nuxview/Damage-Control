# Sharing the Damage Control experience

Drafts for review. Nothing here has been published. They reflect the experience described in this chat; edit anything that does not sound like you. Add the actual YouTube URL only after the video is ready. Hosting and a reopened submission window are not being announced.

## LinkedIn

I missed the submission deadline for my first solo hackathon on Devpost.

I was building Damage Control: My Partner Said What? Two creators defend a ridiculous explanation while Twitch chat plays journalists and terrible PR advisers. A moderator keeps the questions and claims in order, and the creators share one official correction.

I built it with Codex and spent a lot of time playtesting the flow: joining a room, connecting accounts, separating creator and moderator controls, and keeping custom incidents available between rounds.

The demo video caught me out. I discovered too late that my Twitch livestreams hadn’t been saved, and I kept restarting takes when I made mistakes. I ran out of time before submitting.

Some lessons I’m taking into the next hackathon:

- Record a rough demo as soon as the core interaction works.
- Test the complete recording workflow, including finding and playing the saved file.
- Record short sections and edit the mistakes.
- Give recording, uploading and submission their own time in the plan.
- Decide what is essential for the demo before spending more time on small UI fixes.

I’m continuing with the project: finishing the remaining issues, making the demo, then sharing it for feedback. Hosting will come after that.

For anyone who has done solo hackathons: what do you do early to make the final recording and submission less stressful?

Code: https://github.com/Nuxview/Damage-Control

Before publishing: add the finished video link if available, and update the progress paragraph to match what is actually complete.

## Medium

### Title

Missing the deadline at my first solo Devpost hackathon

### Subtitle

Building Damage Control with Codex, getting caught out by the demo video, and what I’ll change next time.

### Article

My first solo hackathon on Devpost ended before I managed to submit.

I had a working prototype, had tested the Twitch chat connection, and had spent time refining the experience. Then I ran into the part I had left too late: recording the demo.

I discovered that my Twitch livestreams hadn’t been saved. I kept making mistakes in the video and restarting the take. By the time I was trying to get a recording I was happy with, the submission window had closed.

I was disappointed. I also came away with a much clearer idea of what I need to plan for next time.

#### What I was building

Damage Control: My Partner Said What? is a collaborative improv game for Twitch creators and their communities.

Two creators choose a fictional incident and defend the same increasingly questionable explanation. Twitch viewers send journalist questions, suggest terrible PR talking points and pitch incidents. A moderator decides what gets published and pins claims the creators actually make.

The record gives chat something to refer back to. If one creator promises something, their partner has to deal with that promise too. Both creators share one official correction, and using it leaves the original statement in the record.

The idea was to make the collaboration fun to watch and give viewers a role in building the joke.

#### Building with Codex

I built the prototype with OpenAI Codex. The backend uses Flask and SQLite, and the interface uses React and TypeScript. Twitch chat comes through OAuth and EventSub, and the public audience card can be used in OBS.

Codex helped with implementation and tests. I directed the idea, made product decisions and brought back problems from playtesting.

That feedback loop changed the app considerably. Early versions showed too many controls at once. Creator and moderator responsibilities were mixed together. The setup flow could ask people to repeat steps they had already completed. Custom incidents were awkward to use across rounds.

Working through those details helped me see how different an implemented feature can feel when someone is trying to use it. A technically available option is not necessarily easy to find, and a completed step should not keep looking like unfinished work.

During the hackathon, the tested app version reached 59 passing backend tests. Those checks were useful for permissions, private/public information, room state and the shared correction. They did not replace watching the actual flow on the recording laptop.

#### Where the submission went wrong

The demo became the bottleneck.

I had not verified early enough that the footage I expected to use would actually be available. Finding out that the livestreams were not saved removed that option at the wrong time.

I also kept restarting. Each mistake felt like a reason to begin the video again. That approach made the recording take longer and added more pressure as the deadline got closer.

A demo requires several things to work together: the app, the explanation, the screen capture, the microphone, the saved file, the edit, the upload and the submission form. I had put much more attention into the app than into that whole sequence.

#### What I’ll do differently

**Make an early recording part of the build.** As soon as the main interaction works, I want a rough clip showing it. That gives me a usable starting point and exposes recording problems while there is still time.

**Verify a local file.** I’ll make a short recording, stop it, find it on disk and play it back with audio. A stream being live does not tell me that I have a recording ready to edit.

**Break the demo into sections.** The introduction, the core interaction and the build explanation can be separate takes. A stumble in the last section does not need to send me back to the start.

**Set a demo-ready point.** Once the essential flow is working, I need to distinguish a problem that blocks the demonstration from a small improvement that can wait.

**Reserve time for the full delivery process.** Recording is only part of it. Exporting, watching the export, uploading, waiting for processing and checking the final link all need time too.

#### What happens to Damage Control now

I want to finish the remaining issues, record and edit the demo, and share the experience. After that, I plan to host a small feedback build so people can try it.

I’m especially interested in whether creator pairs and viewers find the interaction fun: whether the questions build on earlier claims, whether the moderator can keep up, and whether people want another round.

This was my first solo hackathon on Devpost. Missing the submission was frustrating, but the experience has given me specific things to improve in how I scope, test and present a project.

The code is here: https://github.com/Nuxview/Damage-Control

If you have a recording or submission routine that has helped you in hackathons, I’d like to hear about it.

Before publishing: add an actual demo embed when it exists. Keep hosting in the future tense until a working public build is available.

## Instagram caption

My first solo Devpost hackathon ended with a working prototype and a missed submission deadline.

I built Damage Control with Codex: two creators defend one ridiculous explanation while Twitch chat asks all the wrong questions.

The demo video caught me out. My livestreams hadn’t been saved, and I kept restarting takes when I made mistakes.

What I’m changing next time:

• Make a rough demo early.
• Record locally and play back the saved file.
• Record in short sections.
• Leave time for editing, uploading and submitting.

I’m finishing the project and the video, then I’ll work towards a small hosted playtest.

What’s one hackathon lesson you had to learn the hard way?

#BuildInPublic #Hackathon #SoloDeveloper #Codex #TwitchDev

### Optional six-slide carousel copy

1. **My first solo Devpost hackathon** — I built a prototype and missed the submission deadline.
2. **The project: Damage Control** — Two creators. One terrible explanation. Twitch chat asks the questions.
3. **The recording problem** — My livestreams weren’t saved, and I kept restarting takes.
4. **What building taught me** — Playtest the joining flow. Keep roles clear. Hide tools people don’t need yet.
5. **What I’ll change next time** — Make a rough demo early. Verify a local recording. Use short takes. Leave upload time.
6. **What comes next** — Finish the app, publish the demo and write-up, then host a feedback build.

Use genuine product captures or short excerpts from the finished recording. Do not add a “watch now” or “try it live” link until that destination exists.
